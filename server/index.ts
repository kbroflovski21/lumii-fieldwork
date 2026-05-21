import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { prisma } from "./db/prisma";
import { ChatDb } from "./db/chat";
import { AgentConnectionPool } from "./ws/pool";
import { homeRoutes } from "./routes/home";
import { socialWorkersRoutes } from "./routes/socialWorkers";
import { smartBadgesRoutes } from "./routes/smartBadges";
import { serviceObjectsRoutes } from "./routes/serviceObjects";
import { serviceSchedulesRoutes } from "./routes/serviceSchedules";
import { serviceRecordsRoutes } from "./routes/serviceRecords";
import { personaRoutes } from "./routes/persona";
import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";
import { siteRoutes } from "./routes/sites";
import { requireAuth } from "./middleware/requireAuth";
import { optionalAuth } from "./middleware/optionalAuth";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const STATIC_ROOT = process.env.FIELDWORK_STATIC_ROOT ?? join(__dirname, "../dist");

app.use(cors());
app.use(express.json());

// Initialize chat persistence
const chatDb = new ChatDb();

// Initialize WebSocket connection pool
const pool = new AgentConnectionPool({
  chatDb,
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-prod",
  wsToken: process.env.WS_TOKEN ?? "dev-ws-token-change-in-prod",
  agentId: process.env.AGENT_ID ?? "lumii-goldenyears",
});

// Auth routes (no auth required for login)
const jwtSecret = process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-prod";
app.use("/api", authRoutes(jwtSecret));

// Admin routes (requires auth — admin routes have their own role checks)
const gyTokenSecret = process.env.GY_TOKEN_SECRET;
const authMw = requireAuth(jwtSecret, gyTokenSecret);
app.use("/api/admin", authMw);
app.use("/api", adminRoutes());

// Business routes — optional auth (attaches user if token present)
const optAuth = optionalAuth(jwtSecret, gyTokenSecret);
app.use("/api", optAuth, siteRoutes());
app.use("/api", optAuth, homeRoutes());
app.use("/api", optAuth, socialWorkersRoutes());
app.use("/api", optAuth, smartBadgesRoutes());
app.use("/api", optAuth, serviceObjectsRoutes());
app.use("/api", optAuth, serviceSchedulesRoutes());
app.use("/api", optAuth, serviceRecordsRoutes());
app.use("/api", personaRoutes(
  process.env.WS_TOKEN ?? "dev-ws-token-change-in-prod",
  process.env.AGENT_ID ?? "lumii-goldenyears",
));

// Health check (public, no auth)
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Static file serving (production/staging)
if (existsSync(STATIC_ROOT)) {
  app.use(express.static(STATIC_ROOT));
  app.use((_req, res) => {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.sendFile(join(STATIC_ROOT, "index.html"));
  });
}

// Create HTTP server with WebSocket upgrade handling
const httpServer = createServer(app);

httpServer.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url!, `http://localhost`);
  if (url.pathname === "/api/ws/agent") {
    pool.handleAgentUpgrade(req, socket, head);
  } else if (url.pathname === "/api/ws/chat") {
    pool.handleUserUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] Lumii Fieldwork API running on http://0.0.0.0:${PORT}`);
  console.log(`[server] WebSocket endpoints: /api/ws/chat (users) + /api/ws/agent (lak)`);
  if (existsSync(STATIC_ROOT)) {
    console.log(`[server] Serving static files from ${STATIC_ROOT}`);
  }
});

process.on("SIGINT", async () => { pool.shutdown(); await prisma.$disconnect(); process.exit(0); });
process.on("SIGTERM", async () => { pool.shutdown(); await prisma.$disconnect(); process.exit(0); });
