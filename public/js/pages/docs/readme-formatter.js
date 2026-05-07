import { marked } from "https://esm.sh/marked@15.0.0";

function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); }
async function copyText(text) { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } return false; }

function normalizeReadme(value, { normalizeHeadings, normalizeLists }) {
	let result = value.replace(/\r\n/g, "\n");
	result = result.split("\n").map((line) => line.replace(/[ \t]+$/g, "")).join("\n");

	if (normalizeHeadings) {
		result = result.replace(/^(#{1,6})\s*(.+)$/gm, (_, hashes, text) => `${hashes} ${text.trim().replace(/\s+/g, " ")}`);
		result = result.replace(/^(#{2,6})([A-Za-z0-9])/gm, "$1 $2");
	}

	if (normalizeLists) {
		result = result.replace(/^\s*[-*]\s*/gm, "- ");
		result = result.replace(/^\s*(\d+)\.\s*/gm, (_, n) => `${n}. `);
	}

	result = result.replace(/\n{3,}/g, "\n\n");
	result = result.replace(/^([^\n#-].*?)\n(#{2,6}\s)/gm, "$1\n\n$2");
	return result.trim();
}

const config = document.querySelector("[data-readme-formatter-config]");
if (config) {
	const input = document.querySelector("#docs-input");
	const output = document.querySelector("#docs-output");
	const normalizeHeadings = document.querySelector("#normalize-headings");
	const normalizeLists = document.querySelector("#normalize-lists");
	const sampleInput = decodeURIComponent(config.getAttribute("data-sample-input") ?? "");
	const sampleOutput = decodeURIComponent(config.getAttribute("data-sample-output") ?? "");

	function render(value) { output.innerHTML = marked.parse(value); }
	function formatReadme(showToast = true) {
		try {
			const result = normalizeReadme(input.value, {
				normalizeHeadings: normalizeHeadings.checked,
				normalizeLists: normalizeLists.checked,
			});
			input.value = result;
			render(result);
			if (showToast) notify("README formatted.", "success");
		} catch (error) {
			render("<!-- Unable to format README. -->");
			if (showToast) notify(error instanceof Error ? error.message : "Formatting failed.", "error");
		}
	}

	document.querySelector("#load-sample")?.addEventListener("click", () => { input.value = sampleInput; formatReadme(false); notify("Sample loaded.", "neutral"); });
	document.querySelector("#clear-input")?.addEventListener("click", () => { input.value = ""; render("<!-- Formatted README appears here. -->"); notify("Editor cleared.", "neutral"); });
	document.querySelector("#format-readme")?.addEventListener("click", formatReadme);
	document.querySelector("#copy-output")?.addEventListener("click", async () => {
		const ok = await copyText(input.value);
		notify(ok ? "Output copied." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});
	input.value = sampleInput;
	formatReadme(false);
}
