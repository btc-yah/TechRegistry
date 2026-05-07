import { XMLBuilder, XMLParser } from "https://esm.sh/fast-xml-parser@5.5.5";

function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); }
async function copyText(text) { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } return false; }

const config = document.querySelector("[data-json-xml-config]");
if (config) {
	const input = document.querySelector("#converter-input");
	const output = document.querySelector("#converter-output");
	const direction = document.querySelector("#conversion-direction");
	const rootNode = document.querySelector("#root-node");
	const loadSample = document.querySelector("#load-sample");
	const clearButton = document.querySelector("#clear-input");
	const convertButton = document.querySelector("#convert-json-xml");
	const swapButton = document.querySelector("#swap-direction");
	const copyButton = document.querySelector("#copy-output");
	const sampleJson = decodeURIComponent(config.getAttribute("data-sample-json") ?? "");
	const sampleXml = decodeURIComponent(config.getAttribute("data-sample-xml") ?? "");
	const parser = new XMLParser({ ignoreAttributes: false, format: true });
	const builder = new XMLBuilder({ ignoreAttributes: false, format: true, suppressEmptyNode: true });

	function render(value) { output.textContent = value; }
	function convert(showToast = true) {
		try {
			if (direction.value === "json-to-xml") {
				const parsed = JSON.parse(input.value);
				const wrapped = Array.isArray(parsed) ? { [rootNode.value || "root"]: parsed } : parsed;
				render(builder.build(wrapped));
			} else {
				render(JSON.stringify(parser.parse(input.value), null, 2));
			}
			if (showToast) notify("Conversion complete.", "success");
		} catch (error) {
			render("<!-- Unable to convert input. -->");
			if (showToast) notify(error instanceof Error ? error.message : "Conversion failed.", "error");
		}
	}
	loadSample.addEventListener("click", () => { input.value = direction.value === "json-to-xml" ? sampleJson : sampleXml; convert(false); notify("Sample loaded.", "neutral"); });
	clearButton.addEventListener("click", () => { input.value = ""; render("<!-- Converted output appears here. -->"); notify("Editor cleared.", "neutral"); });
	convertButton.addEventListener("click", convert);
	swapButton.addEventListener("click", () => {
		const currentInput = input.value;
		const currentOutput = output.textContent;
		direction.value = direction.value === "json-to-xml" ? "xml-to-json" : "json-to-xml";
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
	input.value = sampleJson;
	convert(false);
}
