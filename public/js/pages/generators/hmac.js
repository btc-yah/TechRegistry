import { initInteractiveToolPage } from "../../tools/tool-suite.js";
initInteractiveToolPage({ toolId: "hmac", fields: [{ id: "algorithm", value: "SHA-256" }, { id: "secret", value: "techregistry-secret" }, { id: "source", value: "signed payload" }] });
