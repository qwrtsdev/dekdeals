// Fills `image:` (the official page's og:image) and `icon:` (its best site icon)
// in deal files that don't have them yet. Existing values are never overwritten.
// Run `npm run og`, then review the diff before committing.
import { readdir, readFile, writeFile } from "node:fs/promises";

const dir = new URL("../src/content/offers/", import.meta.url);
const headers = { "user-agent": "Mozilla/5.0 (compatible; dekdeals-og)" };

const attr = (tag, name) =>
	tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1]?.replaceAll("&amp;", "&");

function findImage(html) {
	const tag = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]*>/i)?.[0];
	return tag && attr(tag, "content");
}

// Icon URLs to try, best first: a linked apple-touch-icon (big, square), the conventional
// /apple-touch-icon.png, an svg or the largest rel="icon", then /favicon.ico.
// mask-icon is skipped (single-color).
function iconCandidates(html) {
	let best;
	for (const tag of html.match(/<link[^>]+>/gi) ?? []) {
		const rel = attr(tag, "rel")?.toLowerCase() ?? "";
		const href = attr(tag, "href");
		if (!href || !rel.includes("icon") || rel.includes("mask-icon")) continue;
		const size = Number(attr(tag, "sizes")?.split("x")[0]) || 16;
		const svg = /\.svg(\?|$)/i.test(href) || attr(tag, "type") === "image/svg+xml";
		const score = rel.includes("apple-touch-icon") ? 2000 + size : svg ? 1000 : size;
		if (!best || score > best.score) best = { href, score };
	}
	const touch = best?.score >= 2000;
	return [touch && best.href, "/apple-touch-icon.png", !touch && best?.href, "/favicon.ico"].filter(Boolean);
}

async function exists(url) {
	try {
		const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
		return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
	} catch {
		return false;
	}
}

for (const file of await readdir(dir)) {
	if (!file.endsWith(".md")) continue;
	const path = new URL(file, dir);
	let text = await readFile(path, "utf8");
	const needImage = !/^image:/m.test(text);
	const needIcon = !/^icon:/m.test(text);
	const url = text.match(/^officialUrl:\s*(\S+)/m)?.[1];
	if (!url || (!needImage && !needIcon)) continue;

	try {
		const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
		const html = await res.text();
		const found = [];

		if (needImage) {
			const image = findImage(html);
			if (image) found.push(`image: ${new URL(image, res.url).href}`);
			else console.log(`- ${file}: no og:image`);
		}
		if (needIcon) {
			let icon;
			for (const href of iconCandidates(html)) {
				const candidate = new URL(href, res.url).href;
				if (await exists(candidate)) {
					icon = candidate;
					break;
				}
			}
			if (icon) found.push(`icon: ${icon}`);
			else console.log(`- ${file}: no icon`);
		}

		if (found.length) {
			text = text.replace(/^(officialUrl:.*)$/m, `$1\n${found.join("\n")}`);
			await writeFile(path, text);
			for (const line of found) console.log(`+ ${file}: ${line}`);
		}
	} catch (error) {
		console.log(`! ${file}: ${error.message}`);
	}
}
