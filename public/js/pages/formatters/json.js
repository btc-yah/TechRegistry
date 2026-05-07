function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); }
async function copyText(text) { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } return false; }
function sortDeep(value) {
	if (Array.isArray(value)) return value.map(sortDeep);
	if (value && typeof value === "object") {
		return Object.keys(value).sort().reduce((acc, key) => {
			acc[key] = sortDeep(value[key]);
			return acc;
		}, {});
	}
	return value;
}

const config = document.querySelector("[data-json-formatter-config]");
if (config) {
	const input = document.querySelector("#formatter-input");
	const output = document.querySelector("#formatter-output");
	const indentStyle = document.querySelector("#indent-style");
	const sortKeys = document.querySelector("#sort-keys");
	const sampleInput = decodeURIComponent(config.getAttribute("data-sample-input") ?? "");
	const sampleOutput = decodeURIComponent(config.getAttribute("data-sample-output") ?? "");

	function render(value) { output.textContent = value; }
	function formatJson(minify = false, showToast = true) {
		try {
			let value = JSON.parse(input.value);
			if (sortKeys.checked) value = sortDeep(value);
			const indent = minify ? 0 : (indentStyle.value === "tab" ? "\t" : Number(indentStyle.value));
			render(JSON.stringify(value, null, indent));
			if (showToast) notify(minify ? "JSON minified." : "JSON formatted.", "success");
		} catch (error) {
			render("// Unable to format JSON.");
			if (showToast) notify(error instanceof Error ? error.message : "Formatting failed.", "error");
		}
	}

	document.querySelector("#load-sample")?.addEventListener("click", () => { input.value = sampleInput; formatJson(false, false); notify("Sample loaded.", "neutral"); });
	document.querySelector("#clear-input")?.addEventListener("click", () => { input.value = ""; render("// Formatted JSON appears here."); notify("Editor cleared.", "neutral"); });
	document.querySelector("#format-json")?.addEventListener("click", () => formatJson(false));
	document.querySelector("#minify-json")?.addEventListener("click", () => formatJson(true));
	document.querySelector("#copy-output")?.addEventListener("click", async () => {
		const ok = await copyText(output.textContent);
		notify(ok ? "Output copied." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});
	input.value = sampleInput;
	formatJson(false, false);
}
