import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");
const host = "127.0.0.1";
const preferredPort = Number(process.env.PORT || 5173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const requestedPath = path.normalize(path.join(distDir, urlPath));

  if (!requestedPath.startsWith(distDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  const filePath = fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()
    ? requestedPath
    : path.join(distDir, "index.html");

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Build output not found. Run npm run build first.");
    return;
  }

  sendFile(res, filePath);
});

function startServer(port) {
  server.listen(port, host, () => {
    console.log(`Local server running at http://${host}:${port}`);
  });
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && !process.env.PORT) {
    const fallbackPort = preferredPort + 1;
    console.log(`Port ${preferredPort} is busy. Trying http://${host}:${fallbackPort} instead.`);
    server.listen(fallbackPort, host, () => {
      console.log(`Local server running at http://${host}:${fallbackPort}`);
    });
    return;
  }

  throw error;
});

startServer(preferredPort);
