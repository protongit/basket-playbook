import fs from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function serveStatic(req, res, pathname) {
  let relative;
  try {
    relative = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  } catch {
    relative = "/index.html";
  }
  if (relative.includes("..") || relative.includes("\0")) {
    res.writeHead(403);
    res.end("Forbidden");
    return true;
  }
  const filePath = path.join(config.publicDir, relative);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (relative.startsWith("/api/")) return false;
    const fallback = path.join(config.publicDir, "index.html");
    if (!fs.existsSync(fallback)) {
      res.writeHead(404);
      res.end("Not found");
      return true;
    }
    return streamFile(req, res, fallback);
  }
  return streamFile(req, res, filePath);
}

function streamFile(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = contentTypes[ext] || "application/octet-stream";
  const isCode = [".html", ".css", ".js", ".mjs"].includes(ext);
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stat.size,
    "Cache-Control": isCode ? "no-cache" : "public, max-age=604800, immutable",
  });
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  fs.createReadStream(filePath).pipe(res);
  return true;
}
