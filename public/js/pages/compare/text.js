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
	return createPatch("text", normalizedLeft, normalizedRight, "", "", {
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

const configElement = document.querySelector("[data-text-compare-config]");

if (configElement) {
	const output = document.querySelector("#text-output");
	const ignoreTrailingSpaceInput = document.querySelector("#ignore-trailing-space");
	const loadSampleButton = document.querySelector("#load-sample");
	const clearButton = document.querySelector("#clear-input");
	const copyButton = document.querySelector("#copy-output");
	const sampleLeft = decodeURIComponent(configElement.getAttribute("data-sample-left") ?? "");
	const sampleRight = decodeURIComponent(configElement.getAttribute("data-sample-right") ?? "");
	let diffEditor;
	let originalModel;
	let modifiedModel;

	async function ensureEditor() {
		const monaco = await loadMonaco();
		if (!diffEditor) {
			diffEditor = monaco.editor.createDiffEditor(output, {
				automaticLayout: true,
				readOnly: false,
				originalEditable: true,
				renderSideBySide: true,
				minimap: { enabled: false },
				scrollBeyondLastLine: false,
				ignoreTrimWhitespace: ignoreTrailingSpaceInput.checked,
				theme: "vs-dark",
			});

			originalModel = monaco.editor.createModel(sampleLeft, "plaintext");
			modifiedModel = monaco.editor.createModel(sampleRight, "plaintext");
			diffEditor.setModel({
				original: originalModel,
				modified: modifiedModel,
			});

			const updateStatus = () => {
				const lineChanges = diffEditor.getLineChanges() ?? [];
				notify(`Live diff ready. ${lineChanges.length} changed block(s).`, "success");
			};

			originalModel.onDidChangeContent(updateStatus);
			modifiedModel.onDidChangeContent(updateStatus);
			updateStatus();
		}

		return { monaco, diffEditor };
	}

	loadSampleButton?.addEventListener("click", async () => {
		await ensureEditor();
		originalModel.setValue(sampleLeft);
		modifiedModel.setValue(sampleRight);
		notify("Sample text loaded into Monaco.", "success");
	});

	clearButton?.addEventListener("click", async () => {
		await ensureEditor();
		originalModel.setValue("");
		modifiedModel.setValue("");
		notify("Both Monaco editors cleared.", "neutral");
	});

	copyButton?.addEventListener("click", async () => {
		await ensureEditor();
		const ok = await copyText(buildDiffString(originalModel.getValue(), modifiedModel.getValue(), ignoreTrailingSpaceInput.checked));
		notify(ok ? "Unified diff copied to clipboard." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});

	ignoreTrailingSpaceInput?.addEventListener("change", async () => {
		const editorState = await ensureEditor();
		editorState.diffEditor.updateOptions({
			ignoreTrimWhitespace: ignoreTrailingSpaceInput.checked,
		});
		notify("Whitespace diff option updated.", "success");
	});

	ensureEditor().catch((error) => {
		output.textContent = "Monaco editor failed to load.";
		notify(error instanceof Error ? error.message : "Monaco editor failed to load.", "error");
	});
}
