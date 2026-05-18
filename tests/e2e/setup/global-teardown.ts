import { readFileSync, existsSync } from "fs";

export default async function globalTeardown() {
  const pidFile = "/tmp/lak-fieldwork-test/server.pid";
  if (existsSync(pidFile)) {
    const pid = parseInt(readFileSync(pidFile, "utf-8"), 10);
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Process may already be dead
    }
  }
}
