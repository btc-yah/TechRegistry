import { createPatch } from "https://esm.sh/diff@8.0.3";
import loader from "https://esm.sh/@monaco-editor/loader@1.5.0";

function notify(message, kind = "neutral") {
	globalThis.appToast?.(message, kind);
}

function safeJsonParse(text) {
	try {
		return { ok: true, data: JSON.parse(text) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON." };
	}
}

function buildDiffString(leftText, rightText) {
	return createPatch("json", leftText, rightText, "", "", {
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

const configElement = document.querySelector("[data-json-compare-config]");

if (configElement) {
	const output = document.querySelector("#json-output");
	const loadSampleButton = document.querySelector("#load-sample");
	const clearButton = document.querySelector("#clear-input");
	const formatButton = document.querySelector("#format-json");
	const copyButton = document.querySelector("#copy-output");
	const sampleLeft = decodeURIComponent(configElement.getAttribute("data-sample-left") ?? "");
	const sampleRight = decodeURIComponent(configElement.getAttribute("data-sample-right") ?? "");
	let diffEditor;
	let originalModel;
	let modifiedModel;

	function validateJson() {
		const leftParsed = safeJsonParse(originalModel.getValue());
		const rightParsed = safeJsonParse(modifiedModel.getValue());

		if (!leftParsed.ok) {
			notify(`Left JSON: ${leftParsed.error}`, "error");
			return;
		}

		if (!rightParsed.ok) {
			notify(`Right JSON: ${rightParsed.error}`, "error");
			return;
		}

		const lineChanges = diffEditor.getLineChanges() ?? [];
		notify(`Live JSON diff ready. ${lineChanges.length} changed block(s).`, "success");
	}

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
				theme: "vs-dark",
			});

			originalModel = monaco.editor.createModel(sampleLeft, "json");
			modifiedModel = monaco.editor.createModel(sampleRight, "json");
			diffEditor.setModel({
				original: originalModel,
				modified: modifiedModel,
			});

			originalModel.onDidChangeContent(validateJson);
			modifiedModel.onDidChangeContent(validateJson);
			validateJson();
		}

		return { monaco, diffEditor };
	}

	loadSampleButton?.addEventListener("click", async () => {
		await ensureEditor();
		originalModel.setValue(sampleLeft);
		modifiedModel.setValue(sampleRight);
		notify("Sample JSON loaded into Monaco.", "success");
	});

	clearButton?.addEventListener("click", async () => {
		await ensureEditor();
		originalModel.setValue("");
		modifiedModel.setValue("");
		notify("Both Monaco editors cleared.", "neutral");
	});

	formatButton?.addEventListener("click", async () => {
		await ensureEditor();
		const leftParsed = safeJsonParse(originalModel.getValue());
		const rightParsed = safeJsonParse(modifiedModel.getValue());

		if (!leftParsed.ok) {
			notify(`Left JSON: ${leftParsed.error}`, "error");
			return;
		}

		if (!rightParsed.ok) {
			notify(`Right JSON: ${rightParsed.error}`, "error");
			return;
		}

		originalModel.setValue(JSON.stringify(leftParsed.data, null, 2));
		modifiedModel.setValue(JSON.stringify(rightParsed.data, null, 2));
		notify("Both JSON documents formatted.", "success");
	});

	copyButton?.addEventListener("click", async () => {
		await ensureEditor();
		const ok = await copyText(buildDiffString(originalModel.getValue(), modifiedModel.getValue()));
		notify(ok ? "Unified diff copied to clipboard." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});

	ensureEditor().catch((error) => {
		output.textContent = "Monaco editor failed to load.";
		notify(error instanceof Error ? error.message : "Monaco editor failed to load.", "error");
	});
}
