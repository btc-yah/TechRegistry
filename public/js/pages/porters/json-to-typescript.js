function notify(message, kind = "neutral") {
	globalThis.appToast?.(message, kind);
}

function safeJsonParse(text) {
	try {
		return { ok: true, data: JSON.parse(text) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON." };
	}
}

function isPlainObject(value) {
	return Object.prototype.toString.call(value) === "[object Object]";
}

function toPascalCase(value) {
	return String(value)
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[^a-zA-Z0-9]+/g, " ")
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("") || "Value";
}

function toSingular(value) {
	const text = String(value);
	if (text.endsWith("ies")) return `${text.slice(0, -3)}y`;
	if (text.endsWith("ses")) return text.slice(0, -2);
	if (text.endsWith("s") && text.length > 1) return text.slice(0, -1);
	return text;
}

function uniqueName(name, usedNames) {
	let candidate = name;
	let index = 2;
	while (usedNames.has(candidate)) {
		candidate = `${name}${index}`;
		index += 1;
	}
	usedNames.add(candidate);
	return candidate;
}

function buildTypescriptFromJson(data, options) {
	const declarations = [];
	const usedNames = new Set();
	const exportKeyword = options.useExport ? "export " : "";
	const rootName = uniqueName(toPascalCase(options.rootName || "RootObject"), usedNames);

	function inferType(value, propertyName) {
		if (value === null) return "null";

		if (Array.isArray(value)) {
			const sample = value.find((item) => item !== null && item !== undefined);
			if (sample === undefined) return "unknown[]";
			return `${inferType(sample, toSingular(propertyName))}[]`;
		}

		if (isPlainObject(value)) {
			const interfaceName = uniqueName(toPascalCase(propertyName), usedNames);
			buildInterface(interfaceName, value);
			return interfaceName;
		}

		if (typeof value === "string") return "string";
		if (typeof value === "number") return "number";
		if (typeof value === "boolean") return "boolean";
		return "unknown";
	}

	function buildInterface(name, obj) {
		const lines = Object.entries(obj).map(([key, value]) => `  ${key}: ${inferType(value, key)};`);
		declarations.push(`${exportKeyword}interface ${name} {\n${lines.join("\n")}\n}`);
	}

	if (Array.isArray(data) && options.preferTypeAlias) {
		const sample = data.find((item) => item !== null && item !== undefined);
		const itemType = sample === undefined ? "unknown" : inferType(sample, toSingular(rootName));
		return `${declarations.join("\n\n")}${declarations.length ? "\n\n" : ""}${exportKeyword}type ${rootName} = ${itemType}[];`.trim();
	}

	const rootObject = isPlainObject(data) ? data : { items: data };
	buildInterface(rootName, rootObject);
	return declarations.join("\n\n").trim();
}

async function copyText(text) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return true;
	}
	return false;
}

const configElement = document.querySelector("[data-json-to-typescript-config]");

if (configElement) {
	const jsonInput = document.querySelector("#json-input");
	const output = document.querySelector("#typescript-output");
	const rootNameInput = document.querySelector("#root-name");
	const useExportKeywordInput = document.querySelector("#use-export-keyword");
	const preferTypeAliasInput = document.querySelector("#prefer-type-alias");
	const generateButton = document.querySelector("#generate-typescript");
	const loadSampleButton = document.querySelector("#load-sample");
	const clearButton = document.querySelector("#clear-input");
	const copyButton = document.querySelector("#copy-output");
	const sampleJson = decodeURIComponent(configElement.getAttribute("data-sample-json") ?? "");
	const sampleTypescript = decodeURIComponent(configElement.getAttribute("data-sample-typescript") ?? "");

	function renderOutput(result) {
		output.textContent = result;
	}

	function generate() {
		if (!jsonInput.value.trim()) {
			renderOutput("// Paste JSON to generate TypeScript.");
			notify("Paste a JSON object or array to generate TypeScript.", "error");
			return;
		}

		const parsed = safeJsonParse(jsonInput.value);
		if (!parsed.ok) {
			renderOutput("// Fix the JSON input and try again.");
			notify(parsed.error, "error");
			return;
		}

		const generated = buildTypescriptFromJson(parsed.data, {
			rootName: rootNameInput.value || "RootObject",
			useExport: useExportKeywordInput.checked,
			preferTypeAlias: preferTypeAliasInput.checked,
		});

		renderOutput(generated);
		notify("TypeScript definitions generated successfully.", "success");
	}

	loadSampleButton?.addEventListener("click", () => {
		jsonInput.value = sampleJson;
		generate();
		notify("Sample JSON loaded.", "neutral");
	});

	clearButton?.addEventListener("click", () => {
		jsonInput.value = "";
		renderOutput("// Your generated TypeScript definitions will appear here.");
		notify("Editor cleared.", "neutral");
	});

	copyButton?.addEventListener("click", async () => {
		const ok = await copyText(output.textContent);
		notify(ok ? "Generated TypeScript copied to clipboard." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});

	generateButton?.addEventListener("click", generate);
	rootNameInput?.addEventListener("change", generate);
	useExportKeywordInput?.addEventListener("change", generate);
	preferTypeAliasInput?.addEventListener("change", generate);

	jsonInput.value = sampleJson;
	generate();
}
