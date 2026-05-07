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

function inferPrimitiveType(value) {
	if (typeof value === "string") return "string";
	if (typeof value === "boolean") return "bool";
	if (typeof value === "number") return Number.isInteger(value) ? "int" : "float64";
	return "interface{}";
}

function buildGoFromJson(data, options) {
	const usedNames = new Set();
	const structs = [];
	const packageName = (options.packageName || "models").trim().replace(/[^a-z0-9_]/gi, "").toLowerCase() || "models";

	function inferType(value, propertyName) {
		if (value === null) {
			return options.usePointerFields ? "*interface{}" : "interface{}";
		}

		if (Array.isArray(value)) {
			const sample = value.find((item) => item !== null && item !== undefined);
			if (sample === undefined) return "[]interface{}";
			return `[]${inferType(sample, toSingular(propertyName))}`;
		}

		if (isPlainObject(value)) {
			const structName = uniqueName(toPascalCase(propertyName), usedNames);
			buildStruct(structName, value);
			return structName;
		}

		return inferPrimitiveType(value);
	}

	function applyNullability(typeName, value) {
		if (value !== null || !options.usePointerFields) return typeName;
		if (typeName.startsWith("*")) return typeName;
		if (typeName.startsWith("[]")) return typeName;
		if (["int", "float64", "bool", "string"].includes(typeName)) {
			return `*${typeName}`;
		}
		return `*${typeName}`;
	}

	function buildStruct(structName, obj) {
		const lines = Object.entries(obj).map(([key, value]) => {
			const baseType = inferType(value, key);
			const fieldType = applyNullability(baseType, value);
			const fieldName = toPascalCase(key);
			const tag = options.includeJsonTags ? ` \`json:"${key}"\`` : "";
			return `    ${fieldName} ${fieldType}${tag}`;
		});

		structs.push(`type ${structName} struct {\n${lines.join("\n")}\n}`);
	}

	const rootName = uniqueName(toPascalCase(options.rootName || "RootObject"), usedNames);
	const rootObject = isPlainObject(data) ? data : { items: data };
	buildStruct(rootName, rootObject);

	return `package ${packageName}\n\n${structs.join("\n\n")}`.trim();
}

async function copyText(text) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return true;
	}
	return false;
}

const configElement = document.querySelector("[data-json-to-go-config]");

if (configElement) {
	const jsonInput = document.querySelector("#json-input");
	const output = document.querySelector("#go-output");
	const structNameInput = document.querySelector("#struct-name");
	const packageNameInput = document.querySelector("#package-name");
	const includeJsonTagsInput = document.querySelector("#include-json-tags");
	const usePointerFieldsInput = document.querySelector("#use-pointer-fields");
	const generateButton = document.querySelector("#generate-go");
	const loadSampleButton = document.querySelector("#load-sample");
	const clearButton = document.querySelector("#clear-input");
	const copyButton = document.querySelector("#copy-output");
	const sampleJson = decodeURIComponent(configElement.getAttribute("data-sample-json") ?? "");
	const sampleGo = decodeURIComponent(configElement.getAttribute("data-sample-go") ?? "");

	function renderOutput(result) {
		output.textContent = result;
	}

	function generate() {
		if (!jsonInput.value.trim()) {
			renderOutput("// Paste JSON to generate Go structs.");
			notify("Paste a JSON object or array to generate Go structs.", "error");
			return;
		}

		const parsed = safeJsonParse(jsonInput.value);
		if (!parsed.ok) {
			renderOutput("// Fix the JSON input and try again.");
			notify(parsed.error, "error");
			return;
		}

		const generated = buildGoFromJson(parsed.data, {
			rootName: structNameInput.value || "RootObject",
			packageName: packageNameInput.value || "models",
			includeJsonTags: includeJsonTagsInput.checked,
			usePointerFields: usePointerFieldsInput.checked,
		});

		renderOutput(generated);
		notify("Go structs generated successfully.", "success");
	}

	loadSampleButton?.addEventListener("click", () => {
		jsonInput.value = sampleJson;
		generate();
		notify("Sample JSON loaded.", "neutral");
	});

	clearButton?.addEventListener("click", () => {
		jsonInput.value = "";
		renderOutput("// Your generated Go structs will appear here.");
		notify("Editor cleared.", "neutral");
	});

	copyButton?.addEventListener("click", async () => {
		const ok = await copyText(output.textContent);
		notify(ok ? "Generated Go copied to clipboard." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});

	generateButton?.addEventListener("click", generate);
	structNameInput?.addEventListener("change", generate);
	packageNameInput?.addEventListener("change", generate);
	includeJsonTagsInput?.addEventListener("change", generate);
	usePointerFieldsInput?.addEventListener("change", generate);

	jsonInput.value = sampleJson;
	generate();
}
