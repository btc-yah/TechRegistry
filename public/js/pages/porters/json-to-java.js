import { initInteractiveToolPage } from "../../tools/tool-suite.js";
initInteractiveToolPage({ toolId: "json-to-java", sampleInput: `{"id":101,"name":"TechRegistry","owner":{"firstName":"Thila"}}`, fields: [{ id: "rootClassName", value: "RootObject" }, { id: "packageName", value: "com.techregistry.models" }, { id: "useJackson", value: true }] });
