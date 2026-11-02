export const thaiDate = (date: Date) =>
	date.toLocaleDateString("th-TH", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

export const jsonScript = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
