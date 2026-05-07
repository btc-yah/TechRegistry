import { createPatch } from "https://esm.sh/diff@8.0.3";
import loader from "https://esm.sh/@monaco-editor/loader@1.5.0";

function notify(message, kind = "neutral") {
	globalThis.appToast?.(message, kind);
}

function normalizeLine(value, ignoreTrailingWhitespace) {
	return ignoreTrailingWhitespace ? value.replace(/\s+$/g, "") : value;
}

function buildDiffString(leftText, rightText, ignoreTrailingWhitespace) {
	const normalizedLeft = leftText
		.split(/\r?\n/)
		.map((line) => normalizeLine(line, ignoreTrailingWhitespace))
		.join("\n");
	const normalizedRight = rightText
		.split(/\r?\n/)
		.map((line) => normalizeLine(line, ignoreTrailingWhitespace))
		.join("\n");
	return createPatch("code", normalizedLeft, normalizedRight, "", "", {
		context: 2,
	});
}

let monacoPromise;

function loadMonaco() {
	if (monacoPromise) return monacoPromise;
	loader.config({
		paths: {
			vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs",
		},
	});
	monacoPromise = loader.init();
	return monacoPromise;
}

async function copyText(text) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return true;
	}
	return false;
}

const configElement = document.querySelector("[data-code-compare-config]");

$(function() {
if ($(configElement).length) {
	const $output = $("#code-output");
	const $ignoreTrailingSpaceInput = $("#ignore-trailing-space");
	const $loadSampleButton = $("#load-sample");
	const $clearButton = $("#clear-input");
	const $copyButton = $("#copy-output");
	const sampleLeft = decodeURIComponent(configElement.getAttribute("data-sample-left") ?? "");
	const sampleRight = decodeURIComponent(configElement.getAttribute("data-sample-right") ?? "");
	let diffEditor;
	let originalModel;
	let modifiedModel;

	async function ensureEditor() {
		const monaco = await loadMonaco();
		if (!diffEditor) {
			diffEditor = monaco.editor.createDiffEditor($output[0], {
				automaticLayout: true,
				readOnly: false, // Keep as is
				originalEditable: true,
				renderSideBySide: true,
				minimap: { enabled: false },
				scrollBeyondLastLine: false,
				ignoreTrimWhitespace: $ignoreTrailingSpaceInput.prop("checked"),
				theme: "vs-dark",
			});

			originalModel = monaco.editor.createModel(sampleLeft, "javascript");
			modifiedModel = monaco.editor.createModel(sampleRight, "javascript");
			diffEditor.setModel({
				original: originalModel,
				modified: modifiedModel,
			});

			const updateStatus = () => { // Keep as is
				const lineChanges = diffEditor.getLineChanges() ?? [];
				notify(`Live code diff ready. ${lineChanges.length} changed block(s).`, "success");
			};

			originalModel.onDidChangeContent(updateStatus); // Keep as is
			modifiedModel.onDidChangeContent(updateStatus); // Keep as is
			updateStatus();
		}

		return { monaco, diffEditor };
	}

	$loadSampleButton.on("click", async () => {
		await ensureEditor();
		originalModel.setValue(sampleLeft);
		modifiedModel.setValue(sampleRight);
		notify("Sample code loaded into Monaco.", "success");
	});

	$clearButton.on("click", async () => {
		await ensureEditor();
		originalModel.setValue("");
		modifiedModel.setValue("");
		notify("Both Monaco editors cleared.", "neutral");
	});

	$copyButton.on("click", async () => {
		await ensureEditor(); // Keep as is
		const ok = await copyText(buildDiffString(originalModel.getValue(), modifiedModel.getValue(), $ignoreTrailingSpaceInput.prop("checked")));
		notify(ok ? "Unified diff copied to clipboard." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});

	$ignoreTrailingSpaceInput.on("change", async () => {
		const editorState = await ensureEditor();
		editorState.diffEditor.updateOptions({
			ignoreTrimWhitespace: $ignoreTrailingSpaceInput.prop("checked"),
		});
		notify("Whitespace diff option updated.", "success");
	});

	ensureEditor().catch((error) => {
		$output.text("Monaco editor failed to load.");
		notify(error instanceof Error ? error.message : "Monaco editor failed to load.", "error");
	});
}
});
