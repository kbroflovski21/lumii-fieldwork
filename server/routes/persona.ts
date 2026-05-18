import { Router } from "express";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export function personaRoutes(wsToken: string, agentId: string) {
  const r = Router();

  r.get("/agents/:id/persona", (req, res) => {
    const { id } = req.params;

    // Auth: lak sends Authorization: Bearer <ws_token>
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token || token !== wsToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (id !== agentId) {
      res.status(403).json({ error: "Invalid agent" });
      return;
    }

    // Read persona from the agent's CLAUDE.md + orchestrator skill prompt
    // In production, this could come from a database
    const personaParts: string[] = [];

    // 1. CLAUDE.md (base persona)
    const claudeMdPaths = [
      join(process.cwd(), "persona", "base.md"),
      "/home/ubuntu/lumii-goldenyears-agent/CLAUDE.md",
    ];
    for (const p of claudeMdPaths) {
      if (existsSync(p)) {
        personaParts.push(readFileSync(p, "utf-8").trim());
        break;
      }
    }

    // 2. Orchestrator skill prompt (product knowledge)
    const skillPromptPaths = [
      "/home/ubuntu/lumii-goldenyears-agent/skills/goldenyears-orchestrator/prompt.md",
    ];
    for (const p of skillPromptPaths) {
      if (existsSync(p)) {
        personaParts.push(readFileSync(p, "utf-8").trim());
        break;
      }
    }

    if (personaParts.length === 0) {
      res.json({ prompt: "", source: "none" });
      return;
    }

    res.json({
      prompt: personaParts.join("\n\n---\n\n"),
      source: personaParts.length > 1 ? "custom" : "default",
    });
  });

  return r;
}
