export interface Filters {
	q: string;
	category: string;
	method: string;
}

export function readFilters(params: URLSearchParams): Filters {
	return {
		q: params.get("q") ?? "",
		category: params.get("category") ?? "",
		method: params.get("method") ?? "",
	};
}

export function writeFilters(url: URL, filters: Filters): URL {
	for (const [key, value] of Object.entries(filters)) {
		if (value) url.searchParams.set(key, value);
		else url.searchParams.delete(key);
	}
	return url;
}

export function matchesFilters(
	deal: { category?: string; method?: string },
	{ category, method }: Filters,
): boolean {
	return (
		(!category || deal.category === category) &&
		(!method || deal.method === method)
	);
}
