import TurndownService from "https://esm.sh/turndown@7.2.0";

function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); }
async function copyText(text) { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } return false; }

const config = document.querySelector("[data-html-markdown-config]");
if (config) {
	const input = document.querySelector("#docs-input");
	const output = document.querySelector("#docs-output");
	const headingStyle = document.querySelector("#heading-style");
	const bulletMarker = document.querySelector("#bullet-marker");
	const sampleInput = decodeURIComponent(config.getAttribute("data-sample-input") ?? "");
	const sampleOutput = decodeURIComponent(config.getAttribute("data-sample-output") ?? "");

	function render(value) { output.textContent = value; }
	function convert(showToast = true) {
		try {
			const service = new TurndownService({
				headingStyle: headingStyle.value,
				bulletListMarker: bulletMarker.value,
				codeBlockStyle: "fenced",
			});
			render(service.turndown(input.value).trim());
			if (showToast) notify("Markdown generated.", "success");
		} catch (error) {
			render("<!-- Unable to convert HTML to markdown. -->");
			if (showToast) notify(error instanceof Error ? error.message : "Conversion failed.", "error");
		}
	}

	document.querySelector("#load-sample")?.addEventListener("click", () => { input.value = sampleInput; convert(false); notify("Sample loaded.", "neutral"); });
	document.querySelector("#clear-input")?.addEventListener("click", () => { input.value = ""; render("<!-- Markdown output appears here. -->"); notify("Editor cleared.", "neutral"); });
	document.querySelector("#convert-markdown")?.addEventListener("click", convert);
	document.querySelector("#copy-output")?.addEventListener("click", async () => {
		const ok = await copyText(output.textContent);
		notify(ok ? "Output copied." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});
	input.value = sampleInput;
	convert(false);
}
