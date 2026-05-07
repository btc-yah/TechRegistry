import { initInteractiveToolPage } from "../../tools/tool-suite.js";

initInteractiveToolPage({
	toolId: "color-code",
	fields: [
		{ id: "format", value: "hex" },
		{ id: "count", value: "5" },
	],
});
