import {
	indentBlock,
	isPlainObject,
	safeJsonParse,
	toDotNetNamespace,
	toPascalCase,
	toSingular,
	uniqueName,
} from "../../tools/tool-utils.js";

export function buildCSharpFromJson(data, options) {
	const usedNames = new Set();
	const classes = [];
	const namespaceName = options.namespaceName.trim();
	const rootClassName = uniqueName(toPascalCase(options.rootClassName), usedNames);
	const requires = {
		system: false,
		collections: false,
		jsonAttributes: options.useJsonPropertyName,
	};

	function inferValueType(value, propertyName) {
		if (value === null) {
			return { typeName: "object?", classes: [] };
		}

		if (Array.isArray(value)) {
			requires.collections = true;
			const firstMeaningful = value.find((item) => item !== null && item !== undefined);
			if (firstMeaningful === undefined) {
				return { typeName: "List<object>", classes: [] };
			}

			const itemType = inferValueType(firstMeaningful, toSingular(propertyName));
			return {
				typeName: `List<${itemType.typeName}>`,
				classes: itemType.classes,
			};
		}

		if (isPlainObject(value)) {
			const className = uniqueName(toPascalCase(propertyName), usedNames);
			const nestedClasses = buildClassDefinition(className, value);
			return { typeName: className, classes: nestedClasses };
		}

		switch (typeof value) {
			case "string":
				if (looksLikeDateTime(value)) {
					requires.system = true;
					return { typeName: "DateTime", classes: [] };
				}
				return { typeName: "string", classes: [] };
			case "number":
				return { typeName: Number.isInteger(value) ? "int" : "double", classes: [] };
			case "boolean":
				return { typeName: "bool", classes: [] };
			default:
				return { typeName: "object", classes: [] };
		}
	}

	function buildClassDefinition(className, value) {
		const properties = Object.entries(value).map(([key, itemValue]) => {
			const inferred = inferValueType(itemValue, key);
			const propertyType = makeNullableIfNeeded(inferred.typeName, itemValue, options.useNullableReferences);
			const propertyName = toPascalCase(key);
			const lines = [];

			if (options.useJsonPropertyName) {
				lines.push(`[JsonPropertyName("${key}")]`);
			}

			lines.push(`public ${propertyType} ${propertyName} { get; set; }${getInitializer(propertyType, itemValue, options.useNullableReferences)}`);
			return {
				lines,
				nestedClasses: inferred.classes,
			};
		});

		const bodyLines = properties.flatMap((property) => property.lines.map((line) => indentBlock(line)));
		const classBlock = [
			`public class ${className}`,
			"{",
			bodyLines.join("\n\n"),
			"}",
		].join("\n");

		const nestedClasses = properties.flatMap((property) => property.nestedClasses);
		return [...nestedClasses, classBlock];
	}

	const rootObject = isPlainObject(data) ? data : { value: data };
	const rootClasses = buildClassDefinition(rootClassName, rootObject);
	classes.push(...rootClasses);

	const usingLines = [];
	if (requires.system) usingLines.push("using System;");
	if (requires.collections) usingLines.push("using System.Collections.Generic;");
	if (requires.jsonAttributes) usingLines.push("using System.Text.Json.Serialization;");

	const classContent = classes.join("\n\n");
	const wrappedClasses = namespaceName
		? `namespace ${toDotNetNamespace(namespaceName)};\n\n${classContent}`
		: classContent;

	return `${usingLines.join("\n")}${usingLines.length ? "\n\n" : ""}${wrappedClasses}`.trim();
}

function looksLikeDateTime(value) {
	return /^\d{4}-\d{2}-\d{2}(T|\s)?/.test(value);
}

function makeNullableIfNeeded(typeName, value, useNullableReferences) {
	if (value !== null) return typeName;
	if (!useNullableReferences) return typeName.replace(/\?$/, "");
	if (typeName.endsWith("?")) return typeName;
	if (["int", "double", "bool", "DateTime", "long", "decimal", "float"].includes(typeName)) {
		return `${typeName}?`;
	}
	return `${typeName}?`;
}

function getInitializer(typeName, value, useNullableReferences) {
	if (value === null) return "";
	if (typeName === "string") return useNullableReferences ? " = string.Empty;" : "";
	if (typeName.startsWith("List<")) return " = new();";
	if (/^[A-Z]/.test(typeName) && !typeName.endsWith("?")) return " = new();";
	return "";
}

function notify(message, kind = "neutral") {
	globalThis.appToast?.(message, kind);
}

async function copyText(text) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return true;
	}
	return false;
}

function validateOptions({ jsonText, namespaceName, rootClassName }) {
	if (!jsonText.trim()) {
		return "Paste a JSON object or array to generate C# classes.";
	}

	if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(namespaceName.trim())) {
		return "Namespace must use letters, numbers, underscores, and dots only.";
	}

	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(rootClassName.trim())) {
		return "Root class must start with a letter and contain only letters, numbers, or underscores.";
	}

	return null;
}

export function initJsonToCSharpTool({ sampleJson, sampleCSharp }) {
	const jsonInput = document.querySelector("#json-input");
	const output = document.querySelector("#csharp-output");
	const namespaceInput = document.querySelector("#namespace");
	const rootClassInput = document.querySelector("#root-class");
	const nullableInput = document.querySelector("#nullable-types");
	const jsonPropertyInput = document.querySelector("#json-property-name");
	const generateButton = document.querySelector("#generate-csharp");
	const loadSampleButton = document.querySelector("#load-sample");
	const clearButton = document.querySelector("#clear-input");
	const copyButton = document.querySelector("#copy-output");
	if (
		!jsonInput ||
		!output ||
		!namespaceInput ||
		!rootClassInput ||
		!nullableInput ||
		!jsonPropertyInput ||
		!generateButton ||
		!loadSampleButton ||
		!clearButton ||
		!copyButton
	) {
		return;
	}

	function renderOutput(result) {
		output.textContent = result;
	}

	function generate() {
		const optionError = validateOptions({
			jsonText: jsonInput.value,
			namespaceName: namespaceInput.value || "TechRegistry.Models",
			rootClassName: rootClassInput.value || "RootObject",
		});

		if (optionError) {
			notify(optionError, "error");
			renderOutput("// Update the form values to generate valid C# classes.");
			return;
		}

		const parsed = safeJsonParse(jsonInput.value);
		if (!parsed.ok) {
			notify(parsed.error, "error");
			renderOutput("// Fix the JSON input to generate C# classes.");
			return;
		}

		const generated = buildCSharpFromJson(parsed.data, {
			namespaceName: namespaceInput.value || "TechRegistry.Models",
			rootClassName: rootClassInput.value || "RootObject",
			useNullableReferences: nullableInput.checked,
			useJsonPropertyName: jsonPropertyInput.checked,
		});

		renderOutput(generated);
		notify("C# classes generated successfully.", "success");
	}

	loadSampleButton.addEventListener("click", () => {
		jsonInput.value = sampleJson;
		generate();
		notify("Sample JSON loaded.", "neutral");
	});

	clearButton.addEventListener("click", () => {
		jsonInput.value = "";
		renderOutput("// Your generated C# classes will appear here.");
		notify("Editor cleared.", "neutral");
	});

	copyButton.addEventListener("click", async () => {
		const ok = await copyText(output.textContent);
		notify(ok ? "Generated C# copied to clipboard." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});

	generateButton.addEventListener("click", generate);
	nullableInput.addEventListener("change", generate);
	jsonPropertyInput.addEventListener("change", generate);
	namespaceInput.addEventListener("change", generate);
	rootClassInput.addEventListener("change", generate);

	jsonInput.value = sampleJson;
	generate();
}

const configElement = document.querySelector("[data-json-to-csharp-config]");

if (configElement) {
	const sampleJson = decodeURIComponent(configElement.getAttribute("data-sample-json") ?? "");
	const sampleCSharp = decodeURIComponent(configElement.getAttribute("data-sample-csharp") ?? "");

	initJsonToCSharpTool({ sampleJson, sampleCSharp });
}
