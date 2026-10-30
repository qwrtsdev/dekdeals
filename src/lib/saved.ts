// Favorites and "done" (redeemed) deals, kept in this browser only.
// Each list is an array of deal slugs, newest first.

export type SavedKind = "favorites" | "done";

const key = (kind: SavedKind) => `dekdeals:${kind}`;
const CHANGE = "saved-change";

export function getSaved(kind: SavedKind): string[] {
	try {
		const list = JSON.parse(localStorage.getItem(key(kind)) ?? "[]");
		return Array.isArray(list) ? list : [];
	} catch {
		return [];
	}
}

export function toggleSaved(kind: SavedKind, id: string) {
	const list = getSaved(kind);
	const index = list.indexOf(id);
	if (index === -1) list.unshift(id);
	else list.splice(index, 1);
	try {
		localStorage.setItem(key(kind), JSON.stringify(list));
	} catch {}
	window.dispatchEvent(new Event(CHANGE));
}

// Runs on changes from this tab and from other open tabs.
export function onSavedChange(callback: () => void) {
	window.addEventListener(CHANGE, callback);
	window.addEventListener("storage", callback);
}
