export function safeJsonParse(input) {
	try {
		return { ok: true, data: JSON.parse(input) };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Invalid JSON input.",
		};
	}
}

export function isPlainObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function toPascalCase(value) {
	const parts = String(value ?? "")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean);

	if (parts.length === 0) return "Model";

	const joined = parts
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");

	return /^\d/.test(joined) ? `Model${joined}` : joined;
}

export function toDotNetNamespace(value) {
	return String(value ?? "")
		.split(".")
		.map((part) => toPascalCase(part))
		.filter(Boolean)
		.join(".");
}

export function toSingular(value) {
	const text = String(value ?? "");
	if (text.endsWith("ies")) return `${text.slice(0, -3)}y`;
	if (text.endsWith("ses")) return text.slice(0, -2);
	if (text.endsWith("s") && !text.endsWith("ss")) return text.slice(0, -1);
	return text;
}

export function uniqueName(baseName, usedNames) {
	let name = baseName || "Model";
	let index = 2;

	while (usedNames.has(name)) {
		name = `${baseName}${index}`;
		index += 1;
	}

	usedNames.add(name);
	return name;
}

export function indentBlock(text, level = 1, indent = "    ") {
	return String(text)
		.split("\n")
		.map((line) => `${indent.repeat(level)}${line}`)
		.join("\n");
}
