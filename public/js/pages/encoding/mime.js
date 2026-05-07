import { initInteractiveToolPage } from "../../tools/tool-suite.js";

const extensionOptions = [
	["txt", "txt - plain text"],
	["html", "html - HTML document"],
	["css", "css - stylesheet"],
	["js", "js - JavaScript"],
	["json", "json - JSON data"],
	["xml", "xml - XML document"],
	["csv", "csv - CSV spreadsheet"],
	["pdf", "pdf - PDF document"],
	["png", "png - PNG image"],
	["jpg", "jpg - JPEG image"],
	["jpeg", "jpeg - JPEG image"],
	["gif", "gif - GIF image"],
	["svg", "svg - SVG image"],
	["webp", "webp - WebP image"],
	["mp3", "mp3 - MP3 audio"],
	["mp4", "mp4 - MP4 video"],
	["zip", "zip - ZIP archive"],
];

const mimeOptions = [
	["text/plain", "text/plain"],
	["text/html", "text/html"],
	["text/css", "text/css"],
	["application/javascript", "application/javascript"],
	["application/json", "application/json"],
	["application/xml", "application/xml"],
	["text/csv", "text/csv"],
	["application/pdf", "application/pdf"],
	["image/png", "image/png"],
	["image/jpeg", "image/jpeg"],
	["image/gif", "image/gif"],
	["image/svg+xml", "image/svg+xml"],
	["image/webp", "image/webp"],
	["audio/mpeg", "audio/mpeg"],
	["video/mp4", "video/mp4"],
	["application/zip", "application/zip"],
];

const modeSelect = document.getElementById("mime-mode");
const valueSelect = document.getElementById("tool-input");
const runButton = document.getElementById("tool-run");

function renderValueOptions() {
	const options = modeSelect?.value === "mime-to-extension" ? mimeOptions : extensionOptions;
	if (!valueSelect) return;
	const current = valueSelect.value;
	valueSelect.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
	valueSelect.value = options.some(([value]) => value === current) ? current : options[0]?.[0] || "";
}

renderValueOptions();

initInteractiveToolPage({
	toolId: "mime",
	sampleInput: "json",
	fields: [{ id: "mode", value: "extension-to-mime" }],
});

modeSelect?.addEventListener("change", () => {
	renderValueOptions();
	runButton?.click();
});

valueSelect?.addEventListener("change", () => runButton?.click());

document.getElementById("tool-load-sample")?.addEventListener("click", () => {
	setTimeout(() => {
		renderValueOptions();
		runButton?.click();
	}, 0);
});
