import { diffLines } from "https://esm.sh/diff@8.0.3";
import { XMLBuilder, XMLParser, XMLValidator } from "https://esm.sh/fast-xml-parser@5.5.5";
import he from "https://esm.sh/he@1.2.0";
import { jwtDecode } from "https://esm.sh/jwt-decode@4.0.0";
import { create as createJsonDiffPatch } from "https://esm.sh/jsondiffpatch@0.7.3";
import yaml from "https://esm.sh/js-yaml@4.1.1";
import { marked } from "https://esm.sh/marked@17.0.4";
import Papa from "https://esm.sh/papaparse@5.5.3";
import punycode from "https://esm.sh/punycode@2.3.1";
import * as prettier from "https://esm.sh/prettier@3.8.1/standalone";
import * as prettierPluginBabel from "https://esm.sh/prettier@3.8.1/plugins/babel";
import * as prettierPluginEstree from "https://esm.sh/prettier@3.8.1/plugins/estree";
import * as prettierPluginHtml from "https://esm.sh/prettier@3.8.1/plugins/html";
import * as prettierPluginPostcss from "https://esm.sh/prettier@3.8.1/plugins/postcss";
import regexpTree from "https://esm.sh/regexp-tree@0.1.27";
import regexgen from "https://esm.sh/regexgen@1.3.0";
import { format as formatSqlLib } from "https://esm.sh/sql-formatter@15.7.2";
import TurndownService from "https://esm.sh/turndown@7.2.2";
import { v1 as uuidv1, v4 as uuidv4 } from "https://esm.sh/uuid@13.0.0";
import { ulid as createUlid } from "https://esm.sh/ulid@3.0.2";
import {
	isPlainObject,
	safeJsonParse,
	toPascalCase,
	toSingular,
	uniqueName,
} from "./tool-utils.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const turndownService = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
const { parse: parseRegexTree } = regexpTree;
const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	parseTagValue: true,
	parseAttributeValue: true,
	trimValues: true,
});
const xmlBuilder = new XMLBuilder({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	format: true,
	indentBy: "  ",
});
const jsonDiff = createJsonDiffPatch({
	arrays: { detectMove: false, includeValueOnMove: false },
	objectHash: (item) => JSON.stringify(item),
});
const prettierPlugins = [
	prettierPluginBabel,
	prettierPluginEstree,
	prettierPluginHtml,
	prettierPluginPostcss,
];
const MORSE_CODE_MAP = {
	A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
	K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
	U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
	0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
	".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", ":": "---...", ";": "-.-.-.", "'": ".----.", "\"": ".-..-.",
	"(": "-.--.", ")": "-.--.-", "&": ".-...", "/": "-..-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
	"@": ".--.-.", "$": "...-..-", " ": "/",
};
const REVERSE_MORSE_CODE_MAP = Object.fromEntries(Object.entries(MORSE_CODE_MAP).map(([key, value]) => [value, key]));
const MIME_EXTENSION_TO_TYPE = {
	txt: "text/plain",
	html: "text/html",
	css: "text/css",
	js: "application/javascript",
	json: "application/json",
	xml: "application/xml",
	csv: "text/csv",
	pdf: "application/pdf",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	svg: "image/svg+xml",
	webp: "image/webp",
	mp3: "audio/mpeg",
	mp4: "video/mp4",
	zip: "application/zip",
};
const MIME_TYPE_TO_EXTENSION = Object.fromEntries(Object.entries(MIME_EXTENSION_TO_TYPE).map(([key, value]) => [value, key]));

function bytesToHex(buffer) {
	return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function base64Encode(text) {
	return btoa(String.fromCharCode(...encoder.encode(text)));
}

function base64Decode(text) {
	const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
	const bytes = Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
	return decoder.decode(bytes);
}

function encodeAscii(text) {
	return Array.from(String(text), (char) => char.codePointAt(0)).join(" ");
}

function decodeAscii(text) {
	const values = String(text).trim().split(/[\s,]+/).filter(Boolean);
	if (!values.length) return "";
	return values.map((value) => {
		const code = Number.parseInt(value, 10);
		if (!Number.isInteger(code) || code < 0 || code > 127) throw new Error("Enter ASCII codes between 0 and 127.");
		return String.fromCharCode(code);
	}).join("");
}

function resolveMime(value, mode) {
	const normalized = String(value).trim().toLowerCase().replace(/^\./, "");
	if (!normalized) return "";
	if (mode === "mime-to-extension") {
		const extension = MIME_TYPE_TO_EXTENSION[normalized];
		if (!extension) throw new Error("Unknown MIME type. Try values like application/json or image/png.");
		return extension;
	}
	const mime = MIME_EXTENSION_TO_TYPE[normalized];
	if (!mime) throw new Error("Unknown file extension. Try values like json, png, html, or pdf.");
	return mime;
}

function resolveMimeBatch(value, mode) {
	const inputs = String(value).split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
	if (!inputs.length) return "";
	if (inputs.length === 1) return resolveMime(inputs[0], mode);
	return inputs.map((item) => `${item} => ${resolveMime(item, mode)}`).join("\n");
}

function encodeMorse(text) {
	return Array.from(String(text).toUpperCase(), (char) => {
		const encoded = MORSE_CODE_MAP[char];
		if (!encoded) throw new Error(`Unsupported Morse character: ${char}`);
		return encoded;
	}).join(" ");
}

function decodeMorse(text) {
	return String(text).trim().split(/\s+/).filter(Boolean).map((token) => {
		const decoded = REVERSE_MORSE_CODE_MAP[token];
		if (!decoded) throw new Error(`Unsupported Morse token: ${token}`);
		return decoded;
	}).join("");
}

function encodeQuotedPrintable(text) {
	return Array.from(encoder.encode(String(text)), (byte) => {
		if (byte === 9 || byte === 32 || (byte >= 33 && byte <= 60) || (byte >= 62 && byte <= 126)) {
			return String.fromCharCode(byte);
		}
		return `=${byte.toString(16).toUpperCase().padStart(2, "0")}`;
	}).join("");
}

function decodeQuotedPrintable(text) {
	const normalized = String(text).replace(/=\r?\n/g, "");
	const bytes = [];
	for (let index = 0; index < normalized.length; index += 1) {
		if (normalized[index] === "=") {
			const value = normalized.slice(index + 1, index + 3);
			if (!/^[\da-fA-F]{2}$/.test(value)) throw new Error("Invalid quoted-printable escape sequence.");
			bytes.push(Number.parseInt(value, 16));
			index += 2;
			continue;
		}
		bytes.push(normalized.charCodeAt(index));
	}
	return decoder.decode(new Uint8Array(bytes));
}

function applyRot13(text) {
	return String(text).replace(/[a-z]/gi, (char) => {
		const start = char <= "Z" ? 65 : 97;
		return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start);
	});
}

function encodeUnicode(text) {
	return Array.from(String(text), (char) => `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`).join(" ");
}

function decodeUnicode(text) {
	const values = String(text).trim().split(/[\s,]+/).filter(Boolean);
	if (!values.length) return "";
	return values.map((value) => {
		const normalized = value.replace(/^U\+/i, "").replace(/^0x/i, "");
		const codePoint = Number.parseInt(normalized, 16);
		if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) throw new Error("Enter Unicode values like U+0041 or 1F680.");
		return String.fromCodePoint(codePoint);
	}).join("");
}

function unescapeHtml(value) {
	return he.decode(String(value));
}

function parseScalar(text) {
	if (text === "true") return true;
	if (text === "false") return false;
	if (text === "null") return null;
	if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
	if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
		return text.slice(1, -1);
	}
	return text;
}

function safeJsonOrThrow(text) {
	const parsed = safeJsonParse(text);
	if (!parsed.ok) throw new Error(parsed.error);
	return parsed.data;
}

function setStatus(root, message, type = "") {
	const $status = $(root).find("#tool-status");
	if (!$status.length) return;
	$status.text(message);
	$status.attr("class", "tool-status");
	if (type) $status.addClass(type);
}

function setOutput(root, value) {
	const $output = $(root).find("#tool-output");
	if ($output.length) {
		if ($output.is("input, textarea")) $output.val(value);
		else $output.text(value);
	}
}

function setDetail(root, value, mode = "text") {
	const $detail = $(root).find("#tool-detail-output");
	const $panel = $(root).find("#tool-detail-panel");
	if (!$detail.length || !$panel.length) return;
	$panel.prop("hidden", !value);
	if (mode === "html") $detail.html(value);
	else $detail.text(value);
}

function getFieldValues(root) {
	return Object.fromEntries(
		Array.from(root.querySelectorAll("[data-tool-field]")).map((field) => [
			field.getAttribute("data-tool-field"),
			field instanceof HTMLInputElement && field.type === "checkbox" ? field.checked : field.value,
		]),
	);
}

function loadDefaults(root, config) {
	const $input = $(root).find("#tool-input");
	const $left = $(root).find("#tool-left-input");
	const $right = $(root).find("#tool-right-input");
	if ($input.length && "sampleInput" in config) $input.val(config.sampleInput ?? "");
	if ($left.length && "sampleInput" in config) $left.val(config.sampleInput ?? "");
	if ($right.length && "sampleSecondaryInput" in config) $right.val(config.sampleSecondaryInput ?? "");
	for (const field of config.fields ?? []) {
		const $element = $(root).find(`[data-tool-field="${field.id}"]`);
		if (!$element.length) continue;
		if ($element.is(":checkbox")) $element.prop("checked", Boolean(field.value));
		else $element.val(field.value ?? "");
	}
}

function clearTool(root) { // Keep native DOM for querySelectorAll
	$(root).find("#tool-input, #tool-left-input, #tool-right-input").val("");
	$(root).find("[data-tool-field]").each(function() {
		const $this = $(this);
		if ($this.is(":checkbox")) $this.prop("checked", false);
		else $this.val("");
	});
	setOutput(root, "");
	setDetail(root, "");
	setStatus(root, "Cleared. Load a sample or enter your own content.");
}

function yamlStringify(value, indent = 0) {
	return yaml.dump(value, { indent: 2, noRefs: true, lineWidth: 120 }).trim();
}

function yamlParse(text) {
	return yaml.load(text);
}

function xmlToJson(text) {
	const validation = XMLValidator.validate(text);
	if (validation !== true) {
		throw new Error(validation.err?.msg || "Invalid XML input.");
	}
	return xmlParser.parse(text);
}

function jsonToXml(value, rootName = "root") {
	return xmlBuilder.build({ [rootName]: value });
}

function csvToJson(text) {
	const result = Papa.parse(text, {
		header: true,
		skipEmptyLines: true,
		transform: (value) => parseScalar(String(value).trim()),
	});
	if (result.errors.length) {
		throw new Error(result.errors[0]?.message || "Invalid CSV input.");
	}
	return result.data;
}

function jsonToCsv(items) {
	return Papa.unparse(Array.isArray(items) ? items : [items]);
}

function parseProperties(text) {
	return Object.fromEntries(
		text
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("#"))
			.map((line) => {
				const separator = line.indexOf("=");
				return separator >= 0 ? [line.slice(0, separator).trim(), parseScalar(line.slice(separator + 1).trim())] : [line, ""];
			}),
	);
}

function flattenObject(value, prefix = "", result = {}) {
	for (const [key, item] of Object.entries(value ?? {})) {
		const nextKey = prefix ? `${prefix}.${key}` : key;
		if (isPlainObject(item)) flattenObject(item, nextKey, result);
		else result[nextKey] = item;
	}
	return result;
}

function expandPropertiesToObject(properties) {
	const root = {};
	for (const [key, value] of Object.entries(properties)) {
		const parts = key.split(".");
		let cursor = root;
		for (let i = 0; i < parts.length - 1; i += 1) {
			cursor[parts[i]] ??= {};
			cursor = cursor[parts[i]];
		}
		cursor[parts.at(-1)] = value;
	}
	return root;
}

function markdownToHtml(text) {
	return marked.parse(String(text), { async: false });
}

function htmlToMarkdown(text) {
	return turndownService.turndown(String(text));
}

function formatReadme(text) {
	return text
		.split(/\r?\n/)
		.map((line) => {
			if (/^#+\S/.test(line)) return line.replace(/^(#+)/, "$1 ").replace(/\s+/g, " ").trim();
			if (/^-\S/.test(line)) return line.replace(/^-/, "- ").replace(/\s+/g, " ").trim();
			return line.trimEnd();
		})
		.join("\n")
		.replace(/\n{3,}/g, "\n\n");
}

async function formatHtml(text) {
	return prettier.format(String(text), {
		parser: "html",
		plugins: prettierPlugins,
	});
}

async function formatCss(text) {
	return prettier.format(String(text), {
		parser: "css",
		plugins: prettierPlugins,
	});
}

async function minifyCss(text) {
	return prettier.format(String(text), {
		parser: "css",
		plugins: prettierPlugins,
		printWidth: Number.MAX_SAFE_INTEGER,
		tabWidth: 0,
		useTabs: false,
	});
}

function formatSql(text) {
	return formatSqlLib(String(text), { language: "sql", keywordCase: "upper" });
}

function compareTextBlocks(left, right) {
	const changes = diffLines(String(left), String(right));
	const diff = [];
	let changed = 0;
	let added = 0;
	let removed = 0;

	for (const change of changes) {
		const lines = change.value.split(/\r?\n/).filter(Boolean);
		if (change.added) {
			added += lines.length;
			diff.push(...lines.map((line) => `+ ${line}`));
		} else if (change.removed) {
			removed += lines.length;
			diff.push(...lines.map((line) => `- ${line}`));
		} else if (lines.length) {
			changed += 0;
		}
	}

	return {
		summary: `Changed: ${changed}\nAdded: ${added}\nRemoved: ${removed}`,
		diff: diff.length ? diff.join("\n") : "No differences found.",
	};
}

function compareJsonValues(left, right) {
	const delta = jsonDiff.diff(left, right);
	if (!delta) return [];
	return formatJsonDelta(delta);
}

function formatJsonDelta(delta, path = "$", lines = []) {
	for (const [key, value] of Object.entries(delta ?? {})) {
		if (key === "_t") continue;
		const nextPath = Array.isArray(delta) ? `${path}[${key}]` : `${path}.${key}`;
		if (Array.isArray(value)) {
			if (value.length === 1) lines.push(`${nextPath}: added ${JSON.stringify(value[0])}`);
			else if (value.length === 2) lines.push(`${nextPath}: ${JSON.stringify(value[0])} -> ${JSON.stringify(value[1])}`);
			else if (value.length === 3 && value[1] === 0 && value[2] === 0) lines.push(`${nextPath}: removed ${JSON.stringify(value[0])}`);
			else lines.push(`${nextPath}: changed`);
			continue;
		}
		if (value && typeof value === "object") {
			formatJsonDelta(value, nextPath, lines);
			continue;
		}
		lines.push(`${nextPath}: changed`);
	}
	return lines;
}

function explainRegex(pattern) {
	try {
		const ast = parseRegexTree(`/${pattern || ""}/`);
		const lines = [];
		walkRegexNode(ast.body, lines, 0);
		return lines.join("\n") || "No pattern provided.";
	} catch {
		return "Pattern could not be parsed.";
	}
}

function walkRegexNode(node, lines, depth) {
	if (!node) return;
	const prefix = "  ".repeat(depth);
	switch (node.type) {
		case "Alternative":
			lines.push(`${prefix}Sequence`);
			node.expressions?.forEach((child) => walkRegexNode(child, lines, depth + 1));
			break;
		case "Assertion":
			lines.push(`${prefix}Assertion: ${node.kind}`);
			break;
		case "Character":
			lines.push(`${prefix}Character: ${String.fromCodePoint(node.value)}`);
			break;
		case "CharacterClass":
			lines.push(`${prefix}Character class${node.negative ? " (negated)" : ""}`);
			node.expressions?.forEach((child) => walkRegexNode(child, lines, depth + 1));
			break;
		case "ClassRange":
			lines.push(`${prefix}Range: ${String.fromCodePoint(node.from.value)}-${String.fromCodePoint(node.to.value)}`);
			break;
		case "Disjunction":
			lines.push(`${prefix}Either`);
			walkRegexNode(node.left, lines, depth + 1);
			walkRegexNode(node.right, lines, depth + 1);
			break;
		case "Group":
			lines.push(`${prefix}${node.capturing ? "Capturing" : "Non-capturing"} group`);
			walkRegexNode(node.expression, lines, depth + 1);
			break;
		case "Repetition":
			lines.push(`${prefix}Repeat ${node.quantifier.kind}`);
			walkRegexNode(node.expression, lines, depth + 1);
			break;
		case "Set":
			lines.push(`${prefix}Set: ${node.kind}`);
			break;
		default:
			lines.push(`${prefix}${node.type}`);
			if (node.expression) walkRegexNode(node.expression, lines, depth + 1);
			if (node.expressions) node.expressions.forEach((child) => walkRegexNode(child, lines, depth + 1));
			break;
	}
}

function hexToRgb(value) {
	const match = String(value).trim().match(/^#?([a-f\d]{6}|[a-f\d]{3})$/i);
	if (!match) throw new Error("Enter a valid HEX color like #ff8800.");
	let hex = match[1];
	if (hex.length === 3) hex = hex.split("").map((char) => char + char).join("");
	const number = Number.parseInt(hex, 16);
	return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}

function rgbToHex(value) {
	const parts = String(value).match(/\d+/g)?.map((part) => Number.parseInt(part, 10));
	if (!parts || parts.length < 3) throw new Error("Enter RGB values like 255, 136, 0.");
	return `#${parts.slice(0, 3).map((part) => Math.max(0, Math.min(255, part)).toString(16).padStart(2, "0")).join("")}`;
}

function generateColorCode(format) {
	const value = globalThis.crypto.getRandomValues(new Uint8Array(3));
	const [r, g, b] = value;
	const hex = `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
	if (format === "rgb") return `rgb(${r}, ${g}, ${b})`;
	if (format === "hsl") {
		const red = r / 255;
		const green = g / 255;
		const blue = b / 255;
		const max = Math.max(red, green, blue);
		const min = Math.min(red, green, blue);
		let hue = 0;
		let saturation = 0;
		const lightness = (max + min) / 2;
		if (max !== min) {
			const delta = max - min;
			saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
			if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
			else if (max === green) hue = (blue - red) / delta + 2;
			else hue = (red - green) / delta + 4;
			hue /= 6;
		}
		return `hsl(${Math.round(hue * 360)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
	}
	return hex;
}

function generateCssGradient(fields) {
	const start = String(fields.start || "#0d6efd").trim();
	const end = String(fields.end || "#20c997").trim();
	const angle = Number(fields.angle) || 135;
	hexToRgb(start);
	hexToRgb(end);
	return `background: linear-gradient(${angle}deg, ${start}, ${end});`;
}

function generateHtmlTable(fields) {
	const rows = Math.max(1, Math.min(20, Number(fields.rows) || 3));
	const columns = Math.max(1, Math.min(10, Number(fields.columns) || 3));
	const includeHeader = fields.header !== false;
	const headers = Array.from({ length: columns }, (_, index) => `Column ${index + 1}`);
	const bodyRows = Array.from({ length: rows }, (_, rowIndex) =>
		`  <tr>\n${Array.from({ length: columns }, (_, columnIndex) => `    <td>Row ${rowIndex + 1} Cell ${columnIndex + 1}</td>`).join("\n")}\n  </tr>`
	).join("\n");
	const head = includeHeader
		? `  <thead>\n    <tr>\n${headers.map((header) => `      <th>${header}</th>`).join("\n")}\n    </tr>\n  </thead>\n`
		: "";
	return `<table>\n${head}  <tbody>\n${bodyRows}\n  </tbody>\n</table>`;
}

function inferJavaType(value, nestedName, classes, usedNames, useJackson) {
	if (value === null) return "Object";
	if (Array.isArray(value)) {
		const first = value.find((item) => item !== null && item !== undefined);
		const itemType = first === undefined ? "Object" : inferJavaType(first, toPascalCase(toSingular(nestedName)), classes, usedNames, useJackson);
		return `List<${itemType}>`;
	}
	if (isPlainObject(value)) {
		const className = uniqueName(toPascalCase(nestedName), usedNames);
		classes.push(buildJavaClass(className, value, classes, usedNames, useJackson));
		return className;
	}
	if (typeof value === "string") return "String";
	if (typeof value === "boolean") return "boolean";
	if (Number.isInteger(value)) return "int";
	if (typeof value === "number") return "double";
	return "Object";
}

function toJavaFieldName(value) {
	const pascal = toPascalCase(value);
	return pascal ? `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}` : "value";
}

function buildJavaClass(className, value, classes, usedNames, useJackson) {
	const fields = Object.entries(value).map(([key, item]) => {
		const type = inferJavaType(item, key, classes, usedNames, useJackson);
		const fieldName = toJavaFieldName(key);
		const annotation = useJackson && fieldName !== key ? `    @JsonProperty("${key}")\n` : "";
		return `${annotation}    private ${type} ${fieldName};`;
	});
	return `public class ${className}\n{\n${fields.join("\n")}\n}`;
}

export function buildJavaFromJson(jsonText, options = {}) {
	const parsed = typeof jsonText === "string" ? safeJsonParse(jsonText) : { ok: true, data: jsonText };
	if (!parsed.ok) throw new Error(parsed.error);
	if (!isPlainObject(parsed.data)) throw new Error("JSON root must be an object.");
	const classes = [];
	const usedNames = new Set();
	const rootName = uniqueName(toPascalCase(options.rootClassName || "RootObject"), usedNames);
	const packageName = options.packageName ? `package ${options.packageName};\n\n` : "";
	const imports = options.useJackson ? 'import com.fasterxml.jackson.annotation.JsonProperty;\nimport java.util.List;\n\n' : "import java.util.List;\n\n";
	classes.push(buildJavaClass(rootName, parsed.data, classes, usedNames, options.useJackson));
	return `${packageName}${imports}${classes.join("\n\n")}`;
}

function inferTypeScriptType(value, nestedName, interfaces, usedNames) {
	if (value === null) return "unknown";
	if (Array.isArray(value)) {
		const first = value.find((item) => item !== null && item !== undefined);
		const itemType = first === undefined ? "unknown" : inferTypeScriptType(first, toPascalCase(toSingular(nestedName)), interfaces, usedNames);
		return `${itemType}[]`;
	}
	if (isPlainObject(value)) {
		const name = uniqueName(toPascalCase(nestedName), usedNames);
		interfaces.push(buildTypeScriptInterface(name, value, interfaces, usedNames));
		return name;
	}
	if (typeof value === "string") return "string";
	if (typeof value === "boolean") return "boolean";
	if (typeof value === "number") return "number";
	return "unknown";
}

function buildTypeScriptInterface(name, value, interfaces, usedNames) {
	const lines = Object.entries(value).map(([key, item]) => `  ${key}: ${inferTypeScriptType(item, key, interfaces, usedNames)};`);
	return `interface ${name} {\n${lines.join("\n")}\n}`;
}

export function buildTypeScriptFromJson(jsonText, options = {}) {
	const parsed = typeof jsonText === "string" ? safeJsonParse(jsonText) : { ok: true, data: jsonText };
	if (!parsed.ok) throw new Error(parsed.error);
	if (!isPlainObject(parsed.data)) throw new Error("JSON root must be an object.");
	const interfaces = [];
	const usedNames = new Set();
	const rootName = uniqueName(toPascalCase(options.rootName || "RootObject"), usedNames);
	interfaces.push(buildTypeScriptInterface(rootName, parsed.data, interfaces, usedNames));
	return interfaces.map((block) => (options.exportInterfaces ? `export ${block}` : block)).join("\n\n");
}

function inferGoType(value, nestedName, structs, usedNames) {
	if (value === null) return "interface{}";
	if (Array.isArray(value)) {
		const first = value.find((item) => item !== null && item !== undefined);
		return `[]${first === undefined ? "interface{}" : inferGoType(first, toPascalCase(toSingular(nestedName)), structs, usedNames)}`;
	}
	if (isPlainObject(value)) {
		const name = uniqueName(toPascalCase(nestedName), usedNames);
		structs.push(buildGoStruct(name, value, structs, usedNames));
		return name;
	}
	if (typeof value === "string") return "string";
	if (typeof value === "boolean") return "bool";
	if (Number.isInteger(value)) return "int";
	if (typeof value === "number") return "float64";
	return "interface{}";
}

function buildGoStruct(name, value, structs, usedNames) {
	const lines = Object.entries(value).map(([key, item]) => `    ${toPascalCase(key)} ${inferGoType(item, key, structs, usedNames)} \`json:"${key}"\``);
	return `type ${name} struct {\n${lines.join("\n")}\n}`;
}

export function buildGoFromJson(jsonText, options = {}) {
	const parsed = typeof jsonText === "string" ? safeJsonParse(jsonText) : { ok: true, data: jsonText };
	if (!parsed.ok) throw new Error(parsed.error);
	if (!isPlainObject(parsed.data)) throw new Error("JSON root must be an object.");
	const structs = [];
	const usedNames = new Set();
	const rootName = uniqueName(toPascalCase(options.rootName || "RootObject"), usedNames);
	structs.push(buildGoStruct(rootName, parsed.data, structs, usedNames));
	return structs.join("\n\n");
}

function sqlValue(value) {
	if (value === null || value === undefined) return "NULL";
	if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
	if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
	return String(value);
}

export function buildSqlInsertFromJson(jsonText, options = {}) {
	const parsed = typeof jsonText === "string" ? safeJsonParse(jsonText) : { ok: true, data: jsonText };
	if (!parsed.ok) throw new Error(parsed.error);
	const rows = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
	if (!rows.every((row) => isPlainObject(row))) throw new Error("JSON must be an object or an array of objects.");
	const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
	return rows.map((row) => `INSERT INTO ${options.tableName || "records"} (${columns.join(", ")}) VALUES (${columns.map((column) => sqlValue(row[column])).join(", ")});`).join("\n");
}

async function digestText(algorithm, text) {
	const hash = await globalThis.crypto.subtle.digest(algorithm, encoder.encode(text));
	return bytesToHex(hash);
}

async function signText(algorithm, secret, text) {
	const key = await globalThis.crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: algorithm }, false, ["sign"]);
	const signature = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(text));
	return bytesToHex(signature);
}

function generateUuidV1Like() {
	return uuidv1();
}

function randomChoice(pool) {
	const bytes = crypto.getRandomValues(new Uint32Array(1));
	return pool[bytes[0] % pool.length];
}

function generatePassword(options) {
	let pool = "";
	if (options.uppercase) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	if (options.lowercase) pool += "abcdefghijklmnopqrstuvwxyz";
	if (options.numbers) pool += "0123456789";
	if (options.symbols) pool += "!@#$%^&*()_+-=[]{}<>?";
	if (!pool) throw new Error("Select at least one character set.");
	return Array.from({ length: Number(options.length) || 16 }, () => randomChoice(pool)).join("");
}

function generateUlid() {
	return createUlid();
}

function loremIpsum(mode, count) {
	const words = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(" ");
	const makeSentence = () => {
		const length = 8 + Math.floor(Math.random() * 8);
		const sentence = Array.from({ length }, (_, index) => words[(index + Math.floor(Math.random() * words.length)) % words.length]).join(" ");
		return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
	};
	if (mode === "words") return Array.from({ length: count }, (_, index) => words[index % words.length]).join(" ");
	if (mode === "sentences") return Array.from({ length: count }, () => makeSentence()).join(" ");
	return Array.from({ length: count }, () => `${makeSentence()} ${makeSentence()} ${makeSentence()}`).join("\n\n");
}

function buildPreviewCard({ title, description, url, image, siteName }) {
	return `
		<div class="tool-share-card">
			<div class="tool-share-card-image">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />` : "<span>No image</span>"}</div>
			<div class="tool-share-card-body">
				<div class="tool-share-card-site">${escapeHtml(siteName || "")}</div>
				<strong>${escapeHtml(title || "Untitled page")}</strong>
				<p>${escapeHtml(description || "Add a description to improve social previews.")}</p>
				<span>${escapeHtml(url || "")}</span>
			</div>
		</div>
	`;
}

const USER_AGENT_PRESETS = {
	chrome: {
		windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
		macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
		linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
		android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
	},
	firefox: {
		windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
		macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.3; rv:124.0) Gecko/20100101 Firefox/124.0",
		linux: "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0",
		android: "Mozilla/5.0 (Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0",
	},
	safari: {
		windows: "Safari is not available for Windows in current releases.",
		macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
		linux: "Safari is not available for Linux in current releases.",
		android: "Safari is not available for Android in current releases.",
	},
	edge: {
		windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
		macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
		linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
		android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36 EdgA/123.0.0.0",
	},
};

async function runTool(config, root) {
	const fields = getFieldValues(root);
	const input = fields.input ?? fields.source ?? $(root).find("#tool-input").val() ?? "";
	const left = fields.left ?? fields.leftInput ?? $(root).find("#tool-left-input").val() ?? "";
	const right = fields.right ?? fields.rightInput ?? $(root).find("#tool-right-input").val() ?? "";

	switch (config.toolId) {
		case "json-to-java":
			return { output: buildJavaFromJson(input, fields), status: "Java classes generated.", type: "is-success" };
		case "json-to-typescript":
			return { output: buildTypeScriptFromJson(input, fields), status: "TypeScript interfaces generated.", type: "is-success" };
		case "json-to-go":
			return { output: buildGoFromJson(input, fields), status: "Go structs generated.", type: "is-success" };
		case "json-to-sql":
			return { output: buildSqlInsertFromJson(input, fields), status: "SQL statements generated.", type: "is-success" };
		case "json-yaml":
			return fields.direction === "yaml-to-json"
				? { output: JSON.stringify(yamlParse(input), null, 2), status: "Converted YAML to JSON.", type: "is-success" }
				: { output: yamlStringify(safeJsonOrThrow(input)), status: "Converted JSON to YAML.", type: "is-success" };
		case "json-xml":
			return fields.direction === "xml-to-json"
				? { output: JSON.stringify(xmlToJson(input), null, 2), status: "Converted XML to JSON.", type: "is-success" }
				: { output: jsonToXml(safeJsonOrThrow(input), fields.rootName || "root"), status: "Converted JSON to XML.", type: "is-success" };
		case "csv-json":
			return fields.direction === "json-to-csv"
				? { output: jsonToCsv(safeJsonOrThrow(input)), status: "Converted JSON to CSV.", type: "is-success" }
				: { output: JSON.stringify(csvToJson(input), null, 2), status: "Converted CSV to JSON.", type: "is-success" };
		case "properties-yaml":
			return fields.direction === "yaml-to-properties"
				? { output: Object.entries(flattenObject(yamlParse(input))).map(([key, value]) => `${key}=${value}`).join("\n"), status: "Converted YAML to properties.", type: "is-success" }
				: { output: yamlStringify(expandPropertiesToObject(parseProperties(input))), status: "Converted properties to YAML.", type: "is-success" };
		case "markdown-to-html":
			return { output: markdownToHtml(input), status: "Markdown rendered as HTML.", type: "is-success" };
		case "html-to-markdown":
			return { output: htmlToMarkdown(input), status: "HTML converted to Markdown.", type: "is-success" };
		case "readme-formatter":
			return { output: formatReadme(input), status: "README content normalized.", type: "is-success" };
		case "base64":
			return fields.mode === "decode"
				? { output: base64Decode(input), status: "Decoded Base64 successfully.", type: "is-success" }
				: { output: base64Encode(input), status: "Encoded text as Base64.", type: "is-success" };
		case "ascii":
			return fields.mode === "decode"
				? { output: decodeAscii(input), status: "Decoded ASCII values.", type: "is-success" }
				: { output: encodeAscii(input), status: "Encoded text as ASCII codes.", type: "is-success" };
		case "url":
			return fields.mode === "decode"
				? { output: decodeURIComponent(input), status: "Decoded URL content.", type: "is-success" }
				: { output: encodeURIComponent(input), status: "Encoded URL content.", type: "is-success" };
		case "html-entities":
			return fields.mode === "unescape"
				? { output: unescapeHtml(input), status: "Unescaped HTML entities.", type: "is-success" }
				: { output: he.encode(String(input), { useNamedReferences: true }), status: "Escaped HTML entities.", type: "is-success" };
		case "binary-hex-octal": {
			const decimal = Number.parseInt(String(fields.value).trim(), Number(fields.inputBase));
			if (Number.isNaN(decimal)) throw new Error("Enter a valid number for the selected base.");
			return { output: `Decimal: ${decimal}\nBinary: ${decimal.toString(2)}\nOctal: ${decimal.toString(8)}\nHex: ${decimal.toString(16).toUpperCase()}`, status: "Converted number across bases.", type: "is-success" };
		}
		case "mime":
			return fields.mode === "mime-to-extension"
				? { output: resolveMimeBatch(input, "mime-to-extension"), status: "Resolved MIME type inputs to file extensions.", type: "is-success" }
				: { output: resolveMimeBatch(input, "extension-to-mime"), status: "Resolved file extension inputs to MIME types.", type: "is-success" };
		case "morse-code":
			return fields.mode === "decode"
				? { output: decodeMorse(input), status: "Decoded Morse code.", type: "is-success" }
				: { output: encodeMorse(input), status: "Encoded text as Morse code.", type: "is-success" };
		case "punycode":
			return fields.mode === "decode"
				? { output: punycode.toUnicode(String(input).trim()), status: "Decoded punycode domain.", type: "is-success" }
				: { output: punycode.toASCII(String(input).trim()), status: "Encoded Unicode domain as punycode.", type: "is-success" };
		case "quoted-printable":
			return fields.mode === "decode"
				? { output: decodeQuotedPrintable(input), status: "Decoded quoted-printable text.", type: "is-success" }
				: { output: encodeQuotedPrintable(input), status: "Encoded text as quoted-printable.", type: "is-success" };
		case "rot13":
			return { output: applyRot13(input), status: "Applied ROT13 transformation.", type: "is-success" };
		case "unicode":
			return fields.mode === "decode"
				? { output: decodeUnicode(input), status: "Decoded Unicode code points.", type: "is-success" }
				: { output: encodeUnicode(input), status: "Encoded text as Unicode code points.", type: "is-success" };
		case "jwt-decoder": {
			const parts = input.trim().split(".");
			if (parts.length < 2) throw new Error("Enter a valid JWT with header and payload segments.");
			const decoded = jwtDecode(input);
			const header = jwtDecode(input, { header: true });
			const payload = decoded;
			return {
				output: `Header:\n${JSON.stringify(header, null, 2)}\n\nPayload:\n${JSON.stringify(payload, null, 2)}`,
				detail: `Header keys: ${Object.keys(header).join(", ") || "none"}\nPayload keys: ${Object.keys(payload).join(", ") || "none"}\nHas signature: ${parts.length > 2 ? "yes" : "no"}`,
				status: "Decoded JWT header and payload.",
				type: "is-success",
			};
		}
		case "uuid-guid":
			return { 
				output: Array.from({ length: Number(fields.count) || 1 }, () => (fields.version === "v1" ? generateUuidV1Like() : uuidv4())).join("\n"), 
				status: "Generated UUID values.", 
				type: "is-success" 
			};
		case "hash":
			return { output: await digestText(fields.algorithm || "SHA-256", input), status: "Hash computed.", type: "is-success" };
		case "hmac":
			return { output: await signText(fields.algorithm || "SHA-256", fields.secret || "", input), status: "HMAC signature computed.", type: "is-success" };
		case "color-code": {
			const count = Math.max(1, Number(fields.count) || 1);
			const list = Array.from({ length: count }, () => generateColorCode(fields.format)).join("\n");
			return { output: list, status: "Color codes generated.", type: "is-success" };
		}
		case "css-gradient":
			return { output: generateCssGradient(fields), status: "CSS gradient generated.", type: "is-success" };
		case "html-table":
			return { output: generateHtmlTable(fields), status: "HTML table generated.", type: "is-success" };
		case "lorem-ipsum":
			return { output: loremIpsum(fields.mode, Number(fields.count) || 3), status: "Lorem ipsum generated.", type: "is-success" };
		case "password": {
			const count = Math.max(1, Number(fields.count) || 1);
			const length = Math.max(1, Number(fields.length) || 16);
			const options = { uppercase: Boolean(fields.uppercase), lowercase: Boolean(fields.lowercase), numbers: Boolean(fields.numbers), symbols: Boolean(fields.symbols), length };
			const list = Array.from({ length: count }, () => generatePassword(options)).join("\n");
			return { output: list, status: "Passwords generated.", type: "is-success" };
		}
		case "ulid": {
			const count = Math.max(1, Number(fields.count) || 1);
			const list = Array.from({ length: count }, () => generateUlid()).join("\n");
			return { output: list, status: "ULIDs generated.", type: "is-success" };
		}
		case "user-agent": {
			const browser = String(fields.browser || "").toLowerCase();
			const platform = String(fields.platform || "windows").toLowerCase();
			const value = (USER_AGENT_PRESETS[browser] && USER_AGENT_PRESETS[browser][platform]) || USER_AGENT_PRESETS[browser]?.windows || "Unknown user-agent preset.";
			return { output: value, status: "User agent resolved.", type: "is-success" };
		}
		case "unit-converter": {
			const mode = fields.mode || "px-rem";
			const val = String(input).trim();
			const base = Number(fields.base) || 16;
			if (mode === "px-rem") {
				const px = Number(val);
				if (Number.isNaN(px)) throw new Error("Enter a numeric px value.");
				return { output: `${px / base}rem`, detail: `Base: ${base}`, status: "Converted px to rem.", type: "is-success" };
			}
			if (mode === "rem-px") {
				const rem = Number(val);
				if (Number.isNaN(rem)) throw new Error("Enter a numeric rem value.");
				return { output: `${rem * base}px`, detail: `Base: ${base}`, status: "Converted rem to px.", type: "is-success" };
			}
			if (mode === "hex-rgb") {
				const hex = val.replace(/^#/, "");
				if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) throw new Error("Enter a valid HEX value like #ff8800.");
				let r, g, b;
				if (hex.length === 3) {
					r = parseInt(hex[0] + hex[0], 16);
					g = parseInt(hex[1] + hex[1], 16);
					b = parseInt(hex[2] + hex[2], 16);
				} else {
					r = parseInt(hex.slice(0, 2), 16);
					g = parseInt(hex.slice(2, 4), 16);
					b = parseInt(hex.slice(4, 6), 16);
				}
				return { output: `rgb(${r}, ${g}, ${b})`, status: "Converted HEX to RGB.", type: "is-success" };
			}
			if (mode === "rgb-hex") {
				const parts = val.match(/\d+/g);
				if (!parts || parts.length < 3) throw new Error("Enter RGB as 'r,g,b' or 'rgb(r,g,b)'.");
				const [r, g, b] = parts.map((n) => Math.max(0, Math.min(255, Number(n))));
				const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
				return { output: hex, status: "Converted RGB to HEX.", type: "is-success" };
			}
			throw new Error("Unsupported unit conversion mode.");
		}
		case "open-graph-preview":
			return { output: buildPreviewCard({ title: fields.title, description: fields.description, url: fields.url, image: fields.image, siteName: fields.siteName }), status: "Preview generated.", type: "is-success", detailMode: "html" };
		case "meta-tag-generator": {
			const tags = [
				`<meta property="og:title" content="${escapeHtml(fields.title || "")}" />`,
				`<meta property="og:description" content="${escapeHtml(fields.description || "")}" />`,
				`<meta property="og:url" content="${escapeHtml(fields.url || "")}" />`,
				`<meta property="og:image" content="${escapeHtml(fields.image || "")}" />`,
				`<meta name="twitter:card" content="summary_large_image" />`,
			].join("\n");
			return { output: tags, status: "Meta tags generated.", type: "is-success", detailMode: "html" };
		}
		case "json-validator": {
			const parsed = safeJsonParse(input);
			if (!parsed.ok) throw new Error(parsed.error);
			return { output: JSON.stringify(parsed.data, null, 2), status: "JSON is valid.", type: "is-success" };
		}
		case "xml-validator": {
			const validation = XMLValidator.validate(input);
			if (validation !== true) throw new Error(validation.err?.msg || "Invalid XML input.");
			return { output: JSON.stringify(xmlToJson(input), null, 2), status: "XML is valid.", type: "is-success" };
		}
		default:
			return { output: "", status: "Tool not implemented.", type: "is-error" };
	}
}

export function initInteractiveToolPage(config = {}) {
	const root = document.getElementById("tool-page-root") || document;
	const runButton = root.querySelector("#tool-run");
	const clearButton = root.querySelector("#tool-clear");
	const loadSampleButton = root.querySelector("#tool-load-sample");

	const execute = async () => {
		try {
			setStatus(root, "Running...");
			const result = await runTool(config, root);
			setOutput(root, result.output ?? "");
			setDetail(root, result.detail ?? "", config.detailMode || result.detailMode || "text");
			setStatus(root, result.status || "Done.", result.type || "is-success");
		} catch (error) {
			setOutput(root, "");
			setDetail(root, "");
			setStatus(root, error instanceof Error ? error.message : "Unable to run tool.", "is-error");
		}
	};

	loadSampleButton?.addEventListener("click", () => {
		loadDefaults(root, config);
		setStatus(root, "Sample loaded.");
	});

	clearButton?.addEventListener("click", () => clearTool(root));
	runButton?.addEventListener("click", execute);

	root.querySelectorAll("[data-tool-field]").forEach((field) => {
		field.addEventListener("change", execute);
	});

	loadDefaults(root, config);
	execute();
}
