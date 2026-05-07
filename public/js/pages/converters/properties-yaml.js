import yaml from "https://esm.sh/js-yaml@4.1.1";

function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); }
async function copyText(text) { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } return false; }

function propertiesToObject(text) {
	const result = {};
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const index = trimmed.indexOf("=");
		const key = index >= 0 ? trimmed.slice(0, index).trim() : trimmed;
		const value = index >= 0 ? trimmed.slice(index + 1).trim() : "";
		const parts = key.split(".");
		let current = result;
		for (let i = 0; i < parts.length - 1; i += 1) {
			current[parts[i]] ??= {};
			current = current[parts[i]];
		}
		current[parts[parts.length - 1]] = value;
	}
	return result;
}

function objectToProperties(value, prefix = "") {
	return Object.entries(value).flatMap(([key, item]) => {
		const nextKey = prefix ? `${prefix}.${key}` : key;
		if (item && typeof item === "object" && !Array.isArray(item)) return objectToProperties(item, nextKey);
		return [`${nextKey}=${item}`];
	}).join("\n");
}

const config = document.querySelector("[data-properties-yaml-config]");
if (config) {
	const input = document.querySelector("#converter-input");
	const output = document.querySelector("#converter-output");
	const direction = document.querySelector("#conversion-direction");
	const loadSample = document.querySelector("#load-sample");
	const clearButton = document.querySelector("#clear-input");
	const convertButton = document.querySelector("#convert-properties-yaml");
	const swapButton = document.querySelector("#swap-direction");
	const copyButton = document.querySelector("#copy-output");
	const sampleProperties = decodeURIComponent(config.getAttribute("data-sample-properties") ?? "");
	const sampleYaml = decodeURIComponent(config.getAttribute("data-sample-yaml") ?? "");

	function render(value) { output.textContent = value; }
	function convert(showToast = true) {
		try {
			if (direction.value === "properties-to-yaml") {
				render(yaml.dump(propertiesToObject(input.value), { noRefs: true }));
			} else {
				render(objectToProperties(yaml.load(input.value)));
			}
			if (showToast) notify("Conversion complete.", "success");
		} catch (error) {
			render("# Unable to convert input.");
			if (showToast) notify(error instanceof Error ? error.message : "Conversion failed.", "error");
		}
	}
	loadSample.addEventListener("click", () => { input.value = direction.value === "properties-to-yaml" ? sampleProperties : sampleYaml; convert(false); notify("Sample loaded.", "neutral"); });
	clearButton.addEventListener("click", () => { input.value = ""; render("# Converted output appears here."); notify("Editor cleared.", "neutral"); });
	convertButton.addEventListener("click", convert);
	swapButton.addEventListener("click", () => {
		const currentInput = input.value;
		const currentOutput = output.textContent;
		direction.value = direction.value === "properties-to-yaml" ? "yaml-to-properties" : "properties-to-yaml";
		input.value = currentOutput;
		render(currentInput);
		notify("Direction swapped.", "neutral");
	});
	direction.addEventListener("change", () => {
		const currentInput = input.value;
		const currentOutput = output.textContent;
		input.value = currentOutput;
		render(currentInput);
		notify("Direction changed and content swapped.", "neutral");
	});
	copyButton.addEventListener("click", async () => {
		const ok = await copyText(output.textContent);
		notify(ok ? "Output copied." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});
	input.value = sampleProperties;
	convert(false);
}
