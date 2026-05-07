import beautify from "https://esm.sh/js-beautify@1.15.4";

function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); }
async function copyText(text) { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } return false; }

const config = document.querySelector("[data-css-formatter-config]");
if (config) {
	const input = document.querySelector("#formatter-input");
	const output = document.querySelector("#formatter-output");
	const indentSize = document.querySelector("#indent-size");
	const newlineBetweenRules = document.querySelector("#newline-between-rules");
	const sampleInput = decodeURIComponent(config.getAttribute("data-sample-input") ?? "");
	const sampleOutput = decodeURIComponent(config.getAttribute("data-sample-output") ?? "");

	function render(value) { output.textContent = value; }
	function formatCss(showToast = true) {
		try {
			let value = beautify.css(input.value, {
				indent_size: Number(indentSize.value),
				end_with_newline: false,
			});
			if (!newlineBetweenRules.checked) value = value.replace(/\n{2,}(?=[^}]*\{)/g, "\n");
			render(value);
			if (showToast) notify("CSS formatted.", "success");
		} catch (error) {
			render("/* Unable to format CSS. */");
			if (showToast) notify(error instanceof Error ? error.message : "Formatting failed.", "error");
		}
	}

	document.querySelector("#load-sample")?.addEventListener("click", () => { input.value = sampleInput; formatCss(false); notify("Sample loaded.", "neutral"); });
	document.querySelector("#clear-input")?.addEventListener("click", () => { input.value = ""; render("/* Formatted CSS appears here. */"); notify("Editor cleared.", "neutral"); });
	document.querySelector("#format-css")?.addEventListener("click", formatCss);
	document.querySelector("#copy-output")?.addEventListener("click", async () => {
		const ok = await copyText(output.textContent);
		notify(ok ? "Output copied." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});
	input.value = sampleInput;
	formatCss(false);
}
