const DEFAULT_TOKENS = ["(", "[A-Z]", ")", "\\w", "+"];
const SAMPLE_TEXT = "The quick brown fox jumps over 13 lazy dogs. Regex is powerful! Error at line 404. Find the values: 100, 200, 300.";

const TOKEN_LABELS = {
	".": "Any",
	"\\d": "Digit",
	"\\D": "Non-Digit",
	"\\w": "Word",
	"\\s": "Space",
	"(": "(",
	")": ")",
	"|": "OR",
	"[a-z]": "a-z",
	"[A-Z]": "A-Z",
	"[0-9]": "0-9",
	"+": "+",
	"*": "*",
	"?": "?",
	"^": "Start",
	"$": "End",
	"\\b": "Boundary",
};

const TOKEN_DESCRIPTIONS = {
	".": "Matches any character except a newline.",
	"\\d": "Matches one digit from 0 to 9.",
	"\\D": "Matches one non-digit character.",
	"\\w": "Matches a letter, number, or underscore.",
	"\\s": "Matches whitespace such as spaces, tabs, or line breaks.",
	"(": "Starts a capture group.",
	")": "Ends a capture group.",
	"|": "Alternation, meaning OR.",
	"[a-z]": "Matches one lowercase letter.",
	"[A-Z]": "Matches one uppercase letter.",
	"[0-9]": "Matches one digit from 0 to 9.",
	"+": "Repeats the previous token one or more times.",
	"*": "Repeats the previous token zero or more times.",
	"?": "Makes the previous token optional.",
	"^": "Matches the start of the input or line with the m flag.",
	"$": "Matches the end of the input or line with the m flag.",
	"\\b": "Matches a word boundary.",
};

const expressionList = document.getElementById("expression-builder-list");
const libraryList = document.getElementById("expression-library-list");
const testInput = document.getElementById("tool-input");
const patternOutput = document.getElementById("tool-output");
const hiddenExpression = document.getElementById("hidden-expression");
const detailOutput = document.getElementById("tool-detail-output");
const statusEl = document.getElementById("tool-status");
const clearButton = document.getElementById("tool-clear");
const sampleButton = document.getElementById("tool-load-sample");
const flagInputs = Array.from(document.querySelectorAll(".regex-flag-check"));

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function setStatus(message, type = "") {
	if (!statusEl) return;
	statusEl.textContent = message;
	statusEl.className = `tool-status mt-3${type ? ` ${type}` : ""}`;
}

function getFlags() {
	return flagInputs
		.filter((input) => input.checked)
		.map((input) => input.id.replace(/^flag/, "").toLowerCase())
		.join("");
}

function createToken(value, removable = true) {
	const tag = document.createElement("div");
	tag.className = "regex-tag";
	tag.dataset.value = value;
	tag.innerHTML = `${escapeHtml(TOKEN_LABELS[value] || value)}<span class="tag-label">${escapeHtml(value)}</span>`;

	if (removable) {
		const remove = document.createElement("i");
		remove.className = "fas fa-trash-alt btn-remove";
		remove.title = "Remove";
		tag.appendChild(remove);
	}

	return tag;
}

function getPattern() {
	return Array.from(expressionList?.querySelectorAll(".regex-tag") || [])
		.map((tag) => tag.dataset.value || "")
		.join("");
}

function explainPattern(pattern, flags) {
	if (!pattern) return "Add tokens to build a regular expression.";

	const tokenLines = Array.from(expressionList?.querySelectorAll(".regex-tag") || [])
		.map((tag, index) => {
			const value = tag.dataset.value || "";
			return `${index + 1}. ${value}: ${TOKEN_DESCRIPTIONS[value] || "Literal or custom regex token."}`;
		});

	const flagLines = [
		flags.includes("g") ? "g: find all matches instead of stopping at the first one." : "",
		flags.includes("i") ? "i: ignore uppercase and lowercase differences." : "",
		flags.includes("m") ? "m: make ^ and $ work per line." : "",
	].filter(Boolean);

	return [`Pattern: /${pattern}/${flags}`, "", "Tokens:", ...tokenLines, "", "Flags:", ...(flagLines.length ? flagLines : ["No flags selected."])].join("\n");
}

function highlightMatches(pattern, flags) {
	if (!detailOutput || !testInput) return;
	const source = testInput.value || "";
	if (!pattern) {
		detailOutput.textContent = source;
		setStatus("Add tokens to build your regex.");
		return;
	}

	let regex;
	try {
		regex = new RegExp(pattern, flags || undefined);
	} catch (error) {
		detailOutput.innerHTML = `<div class="text-danger">${escapeHtml(error.message)}</div>`;
		setStatus(error.message, "is-error");
		return;
	}

	const matches = [];
	const safeFlags = flags.includes("g") ? flags : `${flags}g`;
	const previewRegex = new RegExp(pattern, safeFlags);
	let html = "";
	let lastIndex = 0;
	let match;

	while ((match = previewRegex.exec(source)) !== null) {
		const value = match[0];
		const start = match.index;
		const end = start + value.length;
		matches.push({ value, start, end });
		html += escapeHtml(source.slice(lastIndex, start));
		html += `<mark class="regex-match">${escapeHtml(value || "(empty)")}</mark>`;
		lastIndex = end;
		if (value.length === 0) previewRegex.lastIndex += 1;
	}

	html += escapeHtml(source.slice(lastIndex));
	detailOutput.innerHTML = html || '<span class="text-body-secondary">No test text yet.</span>';

	const explanation = explainPattern(pattern, flags);
	const matchSummary = matches.length
		? `${matches.length} match${matches.length === 1 ? "" : "es"} found.`
		: "No matches found.";
	setStatus(`${matchSummary}\n${explanation}`, matches.length ? "is-success" : "");

	// Validate non-global mode too so invalid flags/pattern combinations surface consistently.
	regex.test(source);
}

function updateBuilder() {
	const pattern = getPattern();
	const flags = getFlags();
	if (patternOutput) patternOutput.value = pattern;
	if (hiddenExpression) hiddenExpression.value = pattern;
	highlightMatches(pattern, flags);
}

function resetBuilder(tokens = DEFAULT_TOKENS) {
	if (!expressionList) return;
	expressionList.innerHTML = "";
	tokens.forEach((token) => expressionList.appendChild(createToken(token)));
	updateBuilder();
}

function prepareLibrary() {
	if (!libraryList) return;
	Array.from(libraryList.querySelectorAll(".regex-tag")).forEach((tag) => {
		const value = tag.dataset.value || "";
		tag.title = TOKEN_DESCRIPTIONS[value] || "";
	});
}

function initDragDrop() {
	if (!expressionList || !libraryList || typeof Sortable === "undefined") return;

	new Sortable(libraryList, {
		group: { name: "regex-builder", pull: "clone", put: false },
		sort: false,
		animation: 150,
	});

	new Sortable(expressionList, {
		group: "regex-builder",
		animation: 150,
		onAdd(event) {
			const value = event.item.dataset.value;
			event.item.replaceWith(createToken(value));
			updateBuilder();
		},
		onUpdate: updateBuilder,
		onRemove: updateBuilder,
	});
}

expressionList?.addEventListener("click", (event) => {
	const removeButton = event.target.closest(".btn-remove");
	if (!removeButton) return;
	removeButton.closest(".regex-tag")?.remove();
	updateBuilder();
});

expressionList?.addEventListener("dblclick", (event) => {
	const token = event.target.closest(".regex-tag");
	if (!token) return;
	token.remove();
	updateBuilder();
});

libraryList?.addEventListener("click", (event) => {
	const token = event.target.closest(".regex-tag");
	if (!token || !expressionList) return;
	expressionList.appendChild(createToken(token.dataset.value || ""));
	updateBuilder();
});

patternOutput?.addEventListener("input", () => {
	if (!hiddenExpression) return;
	hiddenExpression.value = patternOutput.value;
	highlightMatches(patternOutput.value, getFlags());
});

testInput?.addEventListener("input", updateBuilder);
flagInputs.forEach((input) => input.addEventListener("change", updateBuilder));
clearButton?.addEventListener("click", () => resetBuilder([]));
sampleButton?.addEventListener("click", () => {
	if (testInput) testInput.value = SAMPLE_TEXT;
	resetBuilder(DEFAULT_TOKENS);
});

prepareLibrary();
initDragDrop();
if (testInput && !testInput.value) testInput.value = SAMPLE_TEXT;
resetBuilder(DEFAULT_TOKENS);
