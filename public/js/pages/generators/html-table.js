import { initInteractiveToolPage } from "../../tools/tool-suite.js";

initInteractiveToolPage({
	toolId: "html-table",
	fields: [
		{ id: "rows", value: "3" },
		{ id: "columns", value: "4" },
		{ id: "header", value: true },
	],
});
