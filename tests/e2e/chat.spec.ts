import { test, expect } from "@playwright/test";
import { WebSocket as WsClient } from "ws";
import jwt from "jsonwebtoken";

const BASE = process.env.E2E_BASE_URL ?? "http://124.221.48.52:3004";
const WS_BASE = BASE.replace(/^http/, "ws");
const JWT_SECRET = process.env.E2E_JWT_SECRET ?? "staging-jwt-secret";
const WS_TOKEN = process.env.E2E_WS_TOKEN ?? "staging-ws-token";
const IS_LOCAL = process.env.E2E_MODE === "local";

function signTestJwt(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

// Helper: connect a mock agent to simulate lak
async function connectMockAgent(): Promise<WsClient> {
  return new Promise((resolve, reject) => {
    const ws = new WsClient(`${WS_BASE}/api/ws/agent`);
    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "register",
          platform: "dashboard",
          capabilities: ["attachments"],
          metadata: { agent_id: "lumii-goldenyears", token: WS_TOKEN },
        })
      );
    });
    ws.on("message", (data) => {
      const frame = JSON.parse(data.toString());
      if (frame.type === "register_ack" && frame.ok) resolve(ws);
      else if (frame.type === "register_ack") reject(new Error(frame.error));
    });
    ws.on("error", reject);
    setTimeout(() => reject(new Error("Mock agent connection timeout")), 10000);
  });
}

// Helper: wait for agent to receive a specific message type
function waitForAgentMessage(ws: WsClient, type?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Agent message timeout")), 10000);
    const handler = (data: any) => {
      const frame = JSON.parse(data.toString());
      if (!type || frame.type === type) {
        clearTimeout(timeout);
        ws.removeListener("message", handler);
        resolve(frame);
      }
    };
    ws.on("message", handler);
  });
}

// Helper: set up authenticated page with unique user per test
async function setupAuthenticatedPage(page: any, userId?: string) {
  const uid = userId ?? `e2e-user-${Date.now()}`;
  const chatToken = signTestJwt({ userId: uid, name: "E2E Tester" });
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { username: "operator", password: "oper123" },
  });
  let authToken = chatToken;
  if (res.ok()) {
    const data = await res.json();
    authToken = data.token;
  }
  await page.goto(`${BASE}/site-operations`);
  await page.evaluate(({ auth, chat }: { auth: string; chat: string }) => {
    localStorage.setItem("gy_auth_token", auth);
    localStorage.setItem("gy_chat_token", chat);
  }, { auth: authToken, chat: chatToken });
  await page.reload();
}

test.describe("Home Chat E2E", () => {
  test("health check", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test("full chat round-trip: user sends message, agent receives and replies, user sees reply", async ({
    page,
  }) => {
    test.skip(!IS_LOCAL, "mock agent conflicts with real lak on staging");
    // Connect mock agent first
    const agent = await connectMockAgent();

    try {
      await setupAuthenticatedPage(page);

      // Wait for the chat stream to appear (home area has inline chat)
      await page.waitForSelector(".chat-stream", { timeout: 10000 });

      // Wait for input to be enabled (agent is connected)
      await expect(page.locator(".command-input__field")).toBeEnabled({ timeout: 5000 });

      // Set up listener BEFORE clicking (avoid race condition)
      const msgPromise = waitForAgentMessage(agent, "message");

      // Type and send message
      const input = page.locator(".command-input__field");
      await input.fill("查看今天的服务排期");
      await page.locator(".command-input__send").click();

      // Verify optimistic bubble appears
      await expect(page.locator(".chat-bubble--user").last()).toContainText(
        "查看今天的服务排期"
      );

      // Agent receives the bridged message
      const bridgeMsg = await msgPromise;
      expect(bridgeMsg.type).toBe("message");
      expect(bridgeMsg.content).toBe("查看今天的服务排期");
      expect(bridgeMsg.session_key).toContain("e2e-user");
      expect(bridgeMsg.session_key).toContain("home");

      // Agent replies
      agent.send(
        JSON.stringify({
          type: "reply",
          content: "今天共有6条服务排期，其中3条待执行。",
          reply_ctx: bridgeMsg.session_key,
          session_key: bridgeMsg.session_key,
        })
      );

      // User sees AI reply
      await expect(page.locator(".chat-bubble--assistant").last()).toContainText(
        "今天共有6条服务排期",
        { timeout: 5000 }
      );
    } finally {
      agent.close();
    }
  });

  test("streaming response renders progressively", async ({ page }) => {
    test.skip(!IS_LOCAL, "mock agent conflicts with real lak on staging");
    const agent = await connectMockAgent();

    try {
      await setupAuthenticatedPage(page);
      await page.waitForSelector(".chat-stream", { timeout: 10000 });
      await expect(page.locator(".command-input__field")).toBeEnabled({ timeout: 5000 });

      // Set up listener BEFORE clicking
      const msgPromise = waitForAgentMessage(agent, "message");

      // Send message
      await page.locator(".command-input__field").fill("列出服务人员");
      await page.locator(".command-input__send").click();
      const bridgeMsg = await msgPromise;

      // Set up preview_ack listener BEFORE sending preview_start
      const ackPromise = waitForAgentMessage(agent, "preview_ack");

      // Agent starts streaming with preview_start
      agent.send(
        JSON.stringify({
          type: "preview_start",
          ref_id: "r1",
          session_key: bridgeMsg.session_key,
          reply_ctx: bridgeMsg.session_key,
          content: "正在查询",
        })
      );

      // Wait for stream_start to render
      await expect(page.locator(".chat-bubble--assistant").last()).toContainText(
        "正在查询",
        { timeout: 5000 }
      );

      // Get preview_ack from server
      const ack = await ackPromise;
      expect(ack.type).toBe("preview_ack");
      const ph = ack.preview_handle;
      expect(ph).toBeTruthy();

      // Stream more content
      agent.send(
        JSON.stringify({
          type: "reply_stream",
          session_key: bridgeMsg.session_key,
          preview_handle: ph,
          content: "正在查询服务人员...\n\n| 姓名 | 电话 |",
        })
      );
      await expect(page.locator(".chat-bubble--assistant").last()).toContainText(
        "姓名",
        { timeout: 5000 }
      );

      // Finalize with update_message
      agent.send(
        JSON.stringify({
          type: "update_message",
          session_key: bridgeMsg.session_key,
          preview_handle: ph,
          content:
            "服务人员共4人：\n1. 王丽 13800000001\n2. 张明 13800000002",
        })
      );
      await expect(page.locator(".chat-bubble--assistant").last()).toContainText(
        "王丽",
        { timeout: 5000 }
      );
    } finally {
      agent.close();
    }
  });

  test("WIP indicator shows while agent is processing", async ({ page }) => {
    test.skip(!IS_LOCAL, "mock agent conflicts with real lak on staging");
    const agent = await connectMockAgent();

    try {
      await setupAuthenticatedPage(page);
      await page.waitForSelector(".chat-stream", { timeout: 10000 });
      await expect(page.locator(".command-input__field")).toBeEnabled({ timeout: 5000 });

      // Set up listener BEFORE clicking
      const msgPromise = waitForAgentMessage(agent, "message");

      // Send message -> WIP shows (hook sets wip=true locally on send)
      await page.locator(".command-input__field").fill("test wip");
      await page.locator(".command-input__send").click();

      // The hook sets wip=true immediately on send, rendering the typing indicator.
      // Check for it - look for "正在思考..." text which is the typing indicator content
      await expect(page.getByText("正在思考...")).toBeVisible({
        timeout: 3000,
      });

      // Agent replies -> WIP clears
      const bridgeMsg = await msgPromise;
      agent.send(
        JSON.stringify({
          type: "reply",
          content: "done",
          reply_ctx: bridgeMsg.session_key,
          session_key: bridgeMsg.session_key,
        })
      );

      // Typing indicator should disappear
      await expect(page.getByText("正在思考...")).not.toBeVisible({
        timeout: 5000,
      });
    } finally {
      agent.close();
    }
  });

  test("messages persist across page reload", async ({ page }) => {
    test.skip(!IS_LOCAL, "mock agent conflicts with real lak on staging");
    const agent = await connectMockAgent();
    const persistUserId = `persist-user-${Date.now()}`;

    try {
      await setupAuthenticatedPage(page, persistUserId);
      await page.waitForSelector(".chat-stream", { timeout: 10000 });
      await expect(page.locator(".command-input__field")).toBeEnabled({ timeout: 5000 });

      // Set up listener BEFORE clicking
      const msgPromise = waitForAgentMessage(agent, "message");

      // Send and receive a message
      await page.locator(".command-input__field").fill("持久化测试");
      await page.locator(".command-input__send").click();
      const bridgeMsg = await msgPromise;
      agent.send(
        JSON.stringify({
          type: "reply",
          content: "已收到持久化测试消息",
          reply_ctx: bridgeMsg.session_key,
          session_key: bridgeMsg.session_key,
        })
      );
      await expect(page.locator(".chat-bubble--assistant").last()).toContainText(
        "已收到持久化测试消息",
        { timeout: 5000 }
      );

      // Reload page
      await page.reload();
      await page.waitForSelector(".chat-stream", { timeout: 10000 });

      // Messages should still be there from DB (loaded in init frame)
      await expect(page.locator(".chat-bubble--user").last()).toContainText(
        "持久化测试"
      );
      await expect(page.locator(".chat-bubble--assistant").last()).toContainText(
        "已收到持久化测试消息"
      );
    } finally {
      agent.close();
    }
  });
});

test.describe("Tab Copilot E2E", () => {
  test("opens copilot panel and sends message from a non-home tab", async ({
    page,
  }) => {
    test.skip(!IS_LOCAL, "mock agent conflicts with real lak on staging");
    const agent = await connectMockAgent();

    try {
      await setupAuthenticatedPage(page);

      // Navigate to 服务记录 tab via nav rail
      await page
        .locator('[aria-label="服务记录"]')
        .first()
        .click();
      await page.waitForSelector('[aria-label="服务记录"]', { timeout: 5000 });

      // Click toggle to open copilot panel (in shell header)
      await page.locator(".copilot-toggle").click();
      await expect(page.locator(".copilot-panel[data-open='true']")).toBeVisible();
      await expect(page.locator(".copilot-panel")).toContainText(
        "AI 助手 · 服务记录"
      );

      // Wait for copilot input to be enabled
      await expect(page.locator(".copilot-panel .command-input__field")).toBeEnabled({ timeout: 5000 });

      // Set up listener BEFORE clicking
      const msgPromise = waitForAgentMessage(agent, "message");

      // Send message in copilot
      await page
        .locator(".copilot-panel .command-input__field")
        .fill("哪些记录待复核");
      await page.locator(".copilot-panel .command-input__send").click();

      // Agent receives with correct session_key (service_records scope)
      const bridgeMsg = await msgPromise;
      expect(bridgeMsg.content).toBe("哪些记录待复核");
      expect(bridgeMsg.session_key).toContain("service_records");

      // Agent replies
      agent.send(
        JSON.stringify({
          type: "reply",
          content: "有3条待复核",
          reply_ctx: bridgeMsg.session_key,
          session_key: bridgeMsg.session_key,
        })
      );
      await expect(
        page.locator(".copilot-panel .chat-bubble--assistant").first()
      ).toContainText("有3条待复核", { timeout: 5000 });

      // Close panel
      await page.locator(".copilot-toggle").click();
      await expect(page.locator(".copilot-panel[data-open='true']")).not.toBeVisible();
    } finally {
      agent.close();
    }
  });

  test("copilot sessions are isolated per tab", async ({ page }) => {
    test.skip(!IS_LOCAL, "mock agent conflicts with real lak on staging");
    const agent = await connectMockAgent();

    try {
      await setupAuthenticatedPage(page);

      // Navigate to 服务人员 and send message
      await page
        .locator('[aria-label="服务人员"]')
        .first()
        .click();
      await page.locator(".copilot-toggle").click();
      await expect(page.locator(".copilot-panel[data-open='true']")).toBeVisible();
      await expect(page.locator(".copilot-panel .command-input__field")).toBeEnabled({ timeout: 5000 });

      // Set up listener BEFORE clicking
      const msg1Promise = waitForAgentMessage(agent, "message");

      await page
        .locator(".copilot-panel .command-input__field")
        .fill("人员消息");
      await page.locator(".copilot-panel .command-input__send").click();
      const msg1 = await msg1Promise;
      expect(msg1.session_key).toContain("social_workers");

      agent.send(
        JSON.stringify({
          type: "reply",
          content: "reply1",
          reply_ctx: msg1.session_key,
          session_key: msg1.session_key,
        })
      );
      await expect(
        page.locator(".copilot-panel .chat-bubble--assistant").last()
      ).toContainText("reply1", { timeout: 5000 });

      // Close and switch to 设备 tab
      await page.locator(".copilot-toggle").click();
      await page
        .locator('[aria-label="设备"]')
        .first()
        .click();
      await page.locator(".copilot-toggle").click();
      await expect(page.locator(".copilot-panel[data-open='true']")).toBeVisible();

      // 设备 tab's copilot should be empty (different session)
      const assistantBubbles = page.locator(
        ".copilot-panel .chat-bubble--assistant"
      );
      await expect(assistantBubbles).toHaveCount(0);

      // Wait for copilot input to be enabled
      await expect(page.locator(".copilot-panel .command-input__field")).toBeEnabled({ timeout: 5000 });

      // Set up listener BEFORE clicking
      const msg2Promise = waitForAgentMessage(agent, "message");

      // Send message — should have smart_badges session key
      await page
        .locator(".copilot-panel .command-input__field")
        .fill("设备消息");
      await page.locator(".copilot-panel .command-input__send").click();
      const msg2 = await msg2Promise;
      expect(msg2.session_key).toContain("smart_badges");
    } finally {
      agent.close();
    }
  });
});

test.describe("Error handling E2E", () => {
  test("shows offline status when no agent connected", async ({ page }) => {
    test.skip(!IS_LOCAL, "real lak is always connected on staging");
    // Don't connect agent — server has no agent WS connection
    await setupAuthenticatedPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });

    // The chat stream should show offline indicator since init.connected=false
    await expect(page.locator(".chat-stream__status")).toContainText("离线", {
      timeout: 5000,
    });
  });

  test("input is disabled when agent is offline", async ({ page }) => {
    test.skip(!IS_LOCAL, "real lak is always connected on staging");
    await setupAuthenticatedPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });

    // Without agent connected, input should be disabled
    const input = page.locator(".command-input__field");
    await expect(input).toBeDisabled();
  });

  test("status updates when agent connects after page load", async ({
    page,
  }) => {
    test.skip(!IS_LOCAL, "mock agent conflicts with real lak on staging");
    await setupAuthenticatedPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });

    // Initially offline
    await expect(page.locator(".chat-stream__status")).toContainText("离线", {
      timeout: 5000,
    });

    // Now connect an agent
    const agent = await connectMockAgent();
    try {
      // Status should update to connected (offline indicator disappears)
      await expect(page.locator(".chat-stream__status")).not.toBeVisible({
        timeout: 5000,
      });

      // Input should become enabled
      await expect(page.locator(".command-input__field")).toBeEnabled();
    } finally {
      agent.close();
    }
  });
});

test.describe("WebSocket protocol E2E", () => {
  test("agent registration with invalid token is rejected", async () => {
    const result = await new Promise<{ ok: boolean; error?: string }>(
      (resolve, reject) => {
        const ws = new WsClient(`${WS_BASE}/api/ws/agent`);
        ws.on("open", () => {
          ws.send(
            JSON.stringify({
              type: "register",
              platform: "dashboard",
              capabilities: [],
              metadata: { agent_id: "test", token: "wrong-token" },
            })
          );
        });
        ws.on("message", (data) => {
          const frame = JSON.parse(data.toString());
          if (frame.type === "register_ack") {
            resolve(frame);
            ws.close();
          }
        });
        ws.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      }
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("auth");
  });

  test("user WebSocket with invalid JWT is rejected", async () => {
    const result = await new Promise<string>((resolve, reject) => {
      const ws = new WsClient(
        `${WS_BASE}/api/ws/chat?token=invalid-jwt&sessionId=home`
      );
      ws.on("message", (data) => {
        const frame = JSON.parse(data.toString());
        if (frame.type === "error") resolve(frame.error);
      });
      ws.on("close", (code) => {
        if (code === 4001) resolve("unauthorized");
      });
      ws.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    expect(result).toContain("auth");
  });

  test("user receives init frame with correct structure on connect", async () => {
    test.skip(!IS_LOCAL, "mock agent conflicts with real lak on staging");
    const agent = await connectMockAgent();

    try {
      const token = signTestJwt({ userId: "e2e-init-test", name: "Init" });
      const initFrame = await new Promise<any>((resolve, reject) => {
        const ws = new WsClient(
          `${WS_BASE}/api/ws/chat?token=${token}&sessionId=home`
        );
        ws.on("message", (data) => {
          const frame = JSON.parse(data.toString());
          if (frame.type === "init") {
            resolve(frame);
            ws.close();
          }
        });
        ws.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      expect(initFrame.type).toBe("init");
      expect(initFrame.connected).toBe(true);
      expect(Array.isArray(initFrame.messages)).toBe(true);
      expect(typeof initFrame.wip).toBe("boolean");
      expect(Array.isArray(initFrame.in_flight)).toBe(true);
      expect(Array.isArray(initFrame.capabilities)).toBe(true);
    } finally {
      agent.close();
    }
  });
});
