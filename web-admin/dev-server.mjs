import { createServer } from "http";
import { readFile } from "fs/promises";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";

const PORT = 3000;
const root = process.cwd();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function safePath(urlPath) {
  const sanitized = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(sanitized).replace(/^([.][.][/\\])+/, "");
  return path.join(root, normalized);
}

const server = createServer(async (req, res) => {
  try {
    const targetPath = safePath(req.url === "/" ? "/index.html" : req.url || "/index.html");

    if (!targetPath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let filePath = targetPath;
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`Web admin running at http://localhost:${PORT}`);
});
