import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const publicDir = join(root, "apps/web/public");
const port = Number(process.env.VFIRM_WEB_PORT ?? 3090);
const apiBase = process.env.VFIRM_API_BASE ?? "http://127.0.0.1:3091";

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  res.end(body);
}

async function proxyApi(req, res, url) {
  const target = new URL(url.pathname.replace(/^\/api/, "") + url.search, apiBase);
  const headers = { ...req.headers };
  delete headers.host;
  try {
    const response = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
      duplex: req.method === "GET" || req.method === "HEAD" ? undefined : "half"
    });
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, {
      "content-type": response.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ ok: false, error: { code: "API_PROXY_ERROR", message: error instanceof Error ? error.message : String(error), api_base: apiBase } }, null, 2));
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname.startsWith("/api/")) return proxyApi(req, res, url);
    if (url.pathname === "/favicon.ico") return send(res, 204, "");
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const target = normalize(join(publicDir, pathname));
    if (!target.startsWith(publicDir)) return send(res, 403, "Forbidden");
    const file = await readFile(target);
    send(res, 200, file, contentTypes.get(extname(target)) ?? "application/octet-stream");
  } catch (error) {
    if (error?.code === "ENOENT") return send(res, 404, "Not found");
    send(res, 500, error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, () => console.log(`vFirm Web listening on http://127.0.0.1:${port}`));


