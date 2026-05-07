import { format as formatSql } from "https://esm.sh/sql-formatter@15.6.10";

function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); }
async function copyText(text) { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } return false; }

const config = document.querySelector("[data-sql-formatter-config]");
if (config) {
	const input = document.querySelector("#formatter-input");
	const output = document.querySelector("#formatter-output");
	const sqlDialect = document.querySelector("#sql-dialect");
	const uppercaseKeywords = document.querySelector("#uppercase-keywords");
	const sampleInput = decodeURIComponent(config.getAttribute("data-sample-input") ?? "");
	const sampleOutput = decodeURIComponent(config.getAttribute("data-sample-output") ?? "");

	function render(value) { output.textContent = value; }
	function formatQuery(showToast = true) {
		try {
			render(formatSql(input.value, {
				language: sqlDialect.value,
				tabWidth: 2,
				keywordCase: uppercaseKeywords.checked ? "upper" : "preserve",
			}));
			if (showToast) notify("SQL formatted.", "success");
		} catch (error) {
			render("-- Unable to format SQL.");
			if (showToast) notify(error instanceof Error ? error.message : "Formatting failed.", "error");
		}
	}

	document.querySelector("#load-sample")?.addEventListener("click", () => { input.value = sampleInput; formatQuery(false); notify("Sample loaded.", "neutral"); });
	document.querySelector("#clear-input")?.addEventListener("click", () => { input.value = ""; render("-- Formatted SQL appears here."); notify("Editor cleared.", "neutral"); });
	document.querySelector("#format-sql")?.addEventListener("click", formatQuery);
	document.querySelector("#copy-output")?.addEventListener("click", async () => {
		const ok = await copyText(output.textContent);
		notify(ok ? "Output copied." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});
	input.value = sampleInput;
	formatQuery(false);
}
