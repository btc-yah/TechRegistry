import Papa from "https://esm.sh/papaparse@5.5.3";

function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); }
async function copyText(text) { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } return false; }

const config = document.querySelector("[data-csv-json-config]");
if (config) {
	const input = document.querySelector("#converter-input");
	const output = document.querySelector("#converter-output");
	const direction = document.querySelector("#conversion-direction");
	const loadSample = document.querySelector("#load-sample");
	const clearButton = document.querySelector("#clear-input");
	const convertButton = document.querySelector("#convert-csv-json");
	const swapButton = document.querySelector("#swap-direction");
	const copyButton = document.querySelector("#copy-output");
	const sampleCsv = decodeURIComponent(config.getAttribute("data-sample-csv") ?? "");
	const sampleJson = decodeURIComponent(config.getAttribute("data-sample-json") ?? "");

	function render(value) { output.textContent = value; }
	function convert(showToast = true) {
		try {
			if (direction.value === "csv-to-json") {
				const parsed = Papa.parse(input.value.trim(), { header: true, skipEmptyLines: true });
				if (parsed.errors.length) throw new Error(parsed.errors[0].message);
				render(JSON.stringify(parsed.data, null, 2));
			} else {
				const parsed = JSON.parse(input.value);
				render(Papa.unparse(Array.isArray(parsed) ? parsed : [parsed]));
			}
			if (showToast) notify("Conversion complete.", "success");
		} catch (error) {
			render("// Unable to convert input.");
			if (showToast) notify(error instanceof Error ? error.message : "Conversion failed.", "error");
		}
	}
	loadSample.addEventListener("click", () => { input.value = direction.value === "csv-to-json" ? sampleCsv : sampleJson; convert(false); notify("Sample loaded.", "neutral"); });
	clearButton.addEventListener("click", () => { input.value = ""; render("// Converted output appears here."); notify("Editor cleared.", "neutral"); });
	convertButton.addEventListener("click", convert);
	swapButton.addEventListener("click", () => {
		const currentInput = input.value;
		const currentOutput = output.textContent;
		direction.value = direction.value === "csv-to-json" ? "json-to-csv" : "csv-to-json";
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
	input.value = sampleCsv;
	convert(false);
}
