import { spawn, type ChildProcess } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const SERVER_PORT = 3098;
const PROJECT_ROOT = "/home/ubuntu/lumii-fieldwork";
let serverProc: ChildProcess | null = null;

function waitForPort(port: number, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      fetch(`http://localhost:${port}/api/health`)
        .then((r) => {
          if (r.ok) resolve();
          else if (Date.now() - start > timeoutMs) reject(new Error(`Port ${port} timeout`));
          else setTimeout(check, 300);
        })
        .catch(() => {
          if (Date.now() - start > timeoutMs) reject(new Error(`Port ${port} timeout`));
          else setTimeout(check, 300);
        });
    };
    check();
  });
}

export default async function globalSetup() {
  mkdirSync("/tmp/lak-fieldwork-test", { recursive: true });

  // Check if port is already in use (e.g., from a previous run)
  try {
    const res = await fetch(`http://localhost:${SERVER_PORT}/api/health`);
    if (res.ok) {
      console.log(`[global-setup] Port ${SERVER_PORT} already in use and healthy, skipping server start`);
      return;
    }
  } catch { /* port free, continue */ }

  // Build frontend so static files are served by Express
  if (!existsSync(`${PROJECT_ROOT}/dist/index.html`)) {
    const { execSync } = await import("child_process");
    execSync("npx vite build", { cwd: PROJECT_ROOT, stdio: "pipe" });
  }

  serverProc = spawn("npx", ["tsx", "server/index.ts"], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      PORT: String(SERVER_PORT),
      JWT_SECRET: "e2e-test-secret",
      WS_TOKEN: "e2e-ws-token",
      AGENT_ID: "lumii-goldenyears",
    },
    stdio: "pipe",
  });

  serverProc.stderr?.on("data", (d) => process.stderr.write(`[server] ${d}`));
  serverProc.stdout?.on("data", (d) => process.stderr.write(`[server] ${d}`));

  await waitForPort(SERVER_PORT);

  writeFileSync("/tmp/lak-fieldwork-test/server.pid", String(serverProc.pid));
}
