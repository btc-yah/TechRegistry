import { initInteractiveToolPage } from "../../tools/tool-suite.js";

const root = document.querySelector("#tool-page-root");

if (root) {
	const config = JSON.parse(root.getAttribute("data-tool-config") ?? "{}");
	initInteractiveToolPage(config);
}
