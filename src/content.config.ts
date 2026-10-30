import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { categoryKeys, methodKeys } from "./lib/labels";

// Each file in src/content/offers/ is one offer; the file name is its slug.
const offers = defineCollection({
	loader: glob({ pattern: "*.md", base: "./src/content/offers" }),
	schema: z.object({
		name: z.string(),
		provider: z.string(),
		category: z.enum(categoryKeys),
		officialUrl: z.url(),
		// og:image of officialUrl, filled by `npm run og`
		image: z.url().optional(),
		// site icon of officialUrl, filled by `npm run og`; replaces the letter icon
		icon: z.url().optional(),
		summary: z.object({ th: z.string(), en: z.string() }),
		eligibility: z.object({
			method: z.enum(methodKeys),
			availableInThailand: z.boolean(),
			notes: z.string().optional(),
		}),
		priceNote: z.string().optional(),
		tags: z.array(z.string()).default([]),
		// slugs of other deals (packs) that also give you this one; a wrong slug fails the build
		includedIn: z.array(reference("offers")).default([]),
		featured: z.boolean().default(false),
		lastVerified: z.coerce.date(),
	}),
});

export const collections = { offers };
