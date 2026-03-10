const fs = require("fs");

let api = String(process.env.API_BASE_URL || "").trim();
if (api && !/^https?:\/\//i.test(api)) {
  api = `https://${api}`;
}
if (api.endsWith("/")) {
  api = api.slice(0, -1);
}
if (api && !api.endsWith("/api")) {
  api += "/api";
}

const content = `window.RUNTIME_CONFIG = { API_BASE_URL: "${api}" };\n`;
fs.writeFileSync("runtime-config.js", content, "utf8");
console.log("runtime-config.js generated with API_BASE_URL:", api || "<empty>");
