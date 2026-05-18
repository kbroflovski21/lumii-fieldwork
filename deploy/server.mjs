import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { siteOperationsApiFixture } from "./site-operations-api-fixture.mjs";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3004);
const staticRoot = resolve(process.env.FIELDWORK_STATIC_ROOT ?? join(process.cwd(), "deploy/current"));
const pidFile = process.env.PID_FILE ?? "/tmp/lumii-fieldwork/fieldwork-app.pid";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(body);
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": contentTypes[".json"],
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function resolveAssetPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const cleanPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const candidate = resolve(staticRoot, `.${cleanPath}`);

  if (!candidate.startsWith(staticRoot)) {
    return null;
  }

  return candidate;
}

async function serveIndex(response) {
  const indexPath = join(staticRoot, "index.html");
  try {
    const body = await readFile(indexPath);
    response.writeHead(200, {
      "content-type": contentTypes[".html"],
      "cache-control": "no-store"
    });
    response.end(body);
  } catch {
    sendText(response, 500, "index.html is missing");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    const apiBody = siteOperationsApiFixture[url.pathname];
    if (apiBody) {
      sendJson(response, 200, apiBody);
      return;
    }

    sendText(response, 404, "API 示例路由未在 staging 服务中定义");
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "method not allowed");
    return;
  }

  const assetPath = resolveAssetPath(url.pathname);
  if (!assetPath) {
    sendText(response, 403, "forbidden");
    return;
  }

  if (url.pathname.includes(".") && existsSync(assetPath)) {
    const extension = extname(assetPath);
    response.writeHead(200, {
      "content-type": contentTypes[extension] ?? "application/octet-stream",
      "cache-control": extension === ".html" ? "no-store" : "public, max-age=31536000, immutable"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(assetPath).pipe(response);
    return;
  }

  await serveIndex(response);
});

server.listen(port, host, async () => {
  await writeFile(pidFile, `${process.pid}\n`);
  console.log(`lumii-fieldwork staging server listening on http://${host}:${port}`);
  console.log(`static root: ${staticRoot}`);
});
