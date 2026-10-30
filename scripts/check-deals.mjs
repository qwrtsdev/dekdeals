// Weekly deal health check, run by .github/workflows/deal-health.yml (or locally:
// `node scripts/check-deals.mjs`). It only looks at HTTP status codes and dates, never page content.
//
// - officialUrl 404/410 two runs in a row (at least 6 days apart): sets `archived: true` in the
//   deal file; the workflow turns that edit into a pull request for the owner to review.
// - officialUrl 403/429/5xx/timeout: listed as "check by hand" (often bot blocking, not a dead deal).
// - image/icon 404/410: the line is removed so the workflow's `npm run og` step fetches a new one;
//   other errors are only listed.
// - lastVerified older than STALE_DAYS: listed for a re-check.
//
// Usage: node scripts/check-deals.mjs [previous-issue-body.md] [report.md]
// The first-seen dates of dead links live in a hidden comment in the health issue body.

import { appendFile, readdir, readFile, writeFile } from "node:fs/promises";

const STALE_DAYS = 90;
const ARCHIVE_AFTER_DAYS = 6;
const DAY = 24 * 60 * 60 * 1000;
const STATE = /<!-- deal-health-state (\{.*?\}) -->/;

const [previousFile, reportFile = "report.md"] = process.argv.slice(2);
const dir = new URL("../src/content/offers/", import.meta.url);
const today = new Date().toISOString().slice(0, 10);

const previousBody = previousFile ? await readFile(previousFile, "utf8").catch(() => "") : "";
const firstSeen = JSON.parse(previousBody.match(STATE)?.[1] ?? "{}");

async function status(url) {
	try {
		const res = await fetch(url, {
			headers: { "user-agent": "Mozilla/5.0 (compatible; dekdeals-link-check)" },
			signal: AbortSignal.timeout(20_000),
		});
		await res.body?.cancel();
		if (res.ok) return { kind: "ok", code: res.status };
		if (res.status === 404 || res.status === 410) return { kind: "gone", code: res.status };
		return { kind: "unknown", code: res.status };
	} catch (error) {
		return { kind: "unknown", code: error.name === "TimeoutError" ? "timeout" : "error" };
	}
}

const field = (text, name) => text.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1].trim();

const deals = [];
for (const file of (await readdir(dir)).filter((f) => f.endsWith(".md"))) {
	const path = new URL(file, dir);
	const text = await readFile(path, "utf8");
	if (field(text, "archived") === "true") continue;
	deals.push({
		slug: file.replace(/\.md$/, ""),
		path,
		text,
		url: field(text, "officialUrl"),
		image: field(text, "image"),
		icon: field(text, "icon"),
		lastVerified: field(text, "lastVerified"),
	});
}

await Promise.all(
	deals.map(async (deal) => {
		[deal.urlStatus, deal.imageStatus, deal.iconStatus] = await Promise.all([
			status(deal.url),
			deal.image ? status(deal.image) : null,
			deal.icon ? status(deal.icon) : null,
		]);
	}),
);

const nextSeen = {};
const gone = [];
const archived = [];
const unknown = [];
const brokenMedia = [];
const refreshed = [];
const stale = [];

for (const deal of deals) {
	let text = deal.text;

	if (deal.urlStatus.kind === "gone") {
		const since = firstSeen[deal.slug] ?? today;
		nextSeen[deal.slug] = since;
		if (Date.parse(today) - Date.parse(since) >= ARCHIVE_AFTER_DAYS * DAY) {
			text = /^archived:/m.test(text)
				? text.replace(/^archived:.*$/m, "archived: true")
				: text.replace(/^lastVerified:/m, "archived: true\nlastVerified:");
			archived.push(deal.slug);
		}
		gone.push({ ...deal, since });
	} else if (deal.urlStatus.kind === "unknown") {
		unknown.push(deal);
	}

	for (const [name, result] of [["image", deal.imageStatus], ["icon", deal.iconStatus]]) {
		if (!result || result.kind === "ok") continue;
		brokenMedia.push({ deal, name, result });
		if (result.kind === "gone") {
			text = text.replace(new RegExp(`^${name}:.*\\n`, "m"), "");
			refreshed.push(`${deal.slug}/${name}`);
		}
	}

	if (text !== deal.text) await writeFile(deal.path, text);

	if (deal.lastVerified && Date.parse(today) - Date.parse(deal.lastVerified) > STALE_DAYS * DAY) {
		stale.push(deal);
	}
}

const lines = [`<!-- deal-health-state ${JSON.stringify(nextSeen)} -->`, `## 🩺 เช็คสถานะข้อมูล · ${today}`, ""];
const section = (title, items) => {
	if (items.length) lines.push(`### ${title}`, ...items, "");
};

section(
	"🚫 ลิงก์หลักไม่สามารถใช้งานได้ (404/410)",
	gone.map(({ slug, url, urlStatus, since }) =>
		archived.includes(slug)
			? `- \`${slug}\` ${urlStatus.code} since ${since}: **archive PR opened**. If the page only moved, fix \`officialUrl\` instead of merging. ${url}`
			: `- \`${slug}\` ${urlStatus.code} since ${since}: will be archived next week if it still fails. ${url}`,
	),
);
section(
	"⚠️ เช็กอัตโนมัติไม่ได้ (403/429/5xx/timeout) กรุณาลองเปิดดูด้วยตัวเองในเบราว์เซอร์",
	unknown.map(({ slug, url, urlStatus }) => `- \`${slug}\` ${urlStatus.code}: ${url}`),
);
section(
	"⚠️ รูปพื้นหลัง/ไอคอนเสีย",
	brokenMedia.map(({ deal, name, result }) =>
		refreshed.includes(`${deal.slug}/${name}`)
			? `- \`${deal.slug}\` ${name} ${result.code}: **refreshed in the bot PR**. ${deal[name]}`
			: `- \`${deal.slug}\` ${name} ${result.code}: ลบบรรทัดนั้นแล้วรัน \`npm run og\` ถ้ายังเสีย. ${deal[name]}`,
	),
);
section(
	`⚠️ ไม่ได้ตรวจสอบนานกว่า ${STALE_DAYS} วัน เช็กหน้าทางการแล้วอัปเดตข้อมูล \`lastVerified\``,
	stale.map(({ slug, lastVerified }) => `- \`${slug}\` (lastVerified ${lastVerified})`),
);

const problems = gone.length + unknown.length + brokenMedia.length + stale.length > 0;
await writeFile(reportFile, lines.join("\n"));

const outputs = `problems=${problems}\narchived=${archived.join(" ")}\nrefreshed=${refreshed.join(" ")}\n`;
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, outputs);
else console.log(lines.join("\n") + "\n---\n" + outputs);
