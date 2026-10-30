// categories and conditionals (verification methods).
// content.config.ts builds its schema from these
// it fails to build if put unknown labels to items.

export const categories = {
	software: "ซอฟต์แวร์",
	entertainment: "ความบันเทิง",
	productivity: "การทำงาน",
} as const;

export const conditionals = {
	"email": "ยืนยันอีเมล์",
	sheerid: "ยืนยันผ่าน SheerID",
	"student-id": "ยืนยันผ่านบัตรนักศึกษา",
	other: "ยืนยันสถานะนักศึกษา",
} as const;

type Category = keyof typeof categories;
type Method = keyof typeof conditionals;

// z.enum() needs a non-empty tuple
export const categoryKeys = Object.keys(categories) as [Category, ...Category[]];
export const methodKeys = Object.keys(conditionals) as [Method, ...Method[]];
