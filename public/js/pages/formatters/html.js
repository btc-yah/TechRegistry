import beautify from "https://esm.sh/js-beautify@1.15.4";

function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); }
async function copyText(text) { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } return false; }

const config = document.querySelector("[data-html-formatter-config]");
if (config) {
	const input = document.querySelector("#formatter-input");
	const output = document.querySelector("#formatter-output");
	const indentSize = document.querySelector("#indent-size");
	const wrapAttributes = document.querySelector("#wrap-attributes");
	const sampleInput = decodeURIComponent(config.getAttribute("data-sample-input") ?? "");
	const sampleOutput = decodeURIComponent(config.getAttribute("data-sample-output") ?? "");

	function render(value) { output.textContent = value; }
	function formatHtml(showToast = true) {
		try {
			render(beautify.html(input.value, {
				indent_size: Number(indentSize.value),
				wrap_attributes: wrapAttributes.checked ? "force-expand-multiline" : "auto",
				preserve_newlines: true,
				end_with_newline: false,
			}));
			if (showToast) notify("HTML formatted.", "success");
		} catch (error) {
			render("<!-- Unable to format HTML. -->");
			if (showToast) notify(error instanceof Error ? error.message : "Formatting failed.", "error");
		}
	}

	document.querySelector("#load-sample")?.addEventListener("click", () => { input.value = sampleInput; formatHtml(false); notify("Sample loaded.", "neutral"); });
	document.querySelector("#clear-input")?.addEventListener("click", () => { input.value = ""; render("<!-- Formatted HTML appears here. -->"); notify("Editor cleared.", "neutral"); });
	document.querySelector("#format-html")?.addEventListener("click", formatHtml);
	document.querySelector("#copy-output")?.addEventListener("click", async () => {
		const ok = await copyText(output.textContent);
		notify(ok ? "Output copied." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});
	input.value = sampleInput;
	formatHtml(false);
}
