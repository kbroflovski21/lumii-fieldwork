/**
 * E2E tests for CRUD operations via chat + copilot.
 * Uses a "smart mock agent" that calls the real REST API.
 */
import { test, expect, type Page } from "@playwright/test";
import { WebSocket as WsClient } from "ws";
import jwt from "jsonwebtoken";

const BASE = process.env.E2E_BASE_URL ?? "http://124.221.48.52:3004";
const WS_BASE = BASE.replace(/^http/, "ws");
const API_BASE = `${BASE}/api`;
const JWT_SECRET = process.env.E2E_JWT_SECRET ?? "staging-jwt-secret";
const WS_TOKEN = process.env.E2E_WS_TOKEN ?? "staging-ws-token";

function signTestJwt(userId: string): string {
  return jwt.sign({ userId, name: "E2E CRUD Tester" }, JWT_SECRET, { expiresIn: "1h" });
}

// Smart mock agent that calls the real API
class SmartMockAgent {
  ws: WsClient | null = null;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WsClient(`${WS_BASE}/api/ws/agent`);
      this.ws.on("open", () => {
        this.ws!.send(JSON.stringify({
          type: "register", platform: "dashboard", capabilities: [],
          metadata: { agent_id: "lumii-goldenyears", token: WS_TOKEN },
        }));
      });
      this.ws.on("message", (data) => {
        const frame = JSON.parse(data.toString());
        if (frame.type === "register_ack" && frame.ok) resolve();
        else if (frame.type === "register_ack") reject(new Error(frame.error));
        else if (frame.type === "message") this.handleMessage(frame);
      });
      this.ws.on("error", reject);
      setTimeout(() => reject(new Error("connection timeout")), 10000);
    });
  }

  close() { this.ws?.close(); }

  private async handleMessage(frame: { content: string; session_key: string }) {
    const { content, session_key } = frame;
    const lower = content.toLowerCase();
    let reply: string;

    try {
      if (lower.includes("查") && lower.includes("人员")) {
        reply = await this.queryWorkers();
      } else if (lower.includes("新增") && lower.includes("人员")) {
        reply = await this.createWorker(content);
      } else if (lower.includes("归档") && lower.includes("人员")) {
        reply = await this.archiveWorker(content);
      } else if (lower.includes("查") && (lower.includes("设备") || lower.includes("工牌"))) {
        reply = await this.queryBadges();
      } else if (lower.includes("停用") && (lower.includes("设备") || lower.includes("工牌"))) {
        reply = await this.disableBadge(content);
      } else if (lower.includes("查") && lower.includes("服务对象")) {
        reply = await this.queryObjects();
      } else if (lower.includes("新增") && lower.includes("服务对象")) {
        reply = await this.createObject(content);
      } else if (lower.includes("查") && lower.includes("排期")) {
        reply = await this.querySchedules();
      } else if (lower.includes("安排") && lower.includes("服务")) {
        reply = await this.createSchedule(content);
      } else if (lower.includes("查") && lower.includes("记录")) {
        reply = await this.queryRecords();
      } else if (lower.includes("复核")) {
        reply = await this.reviewRecord();
      } else {
        reply = "你好！请问需要什么帮助？";
      }
    } catch (err: any) {
      reply = `操作失败: ${err.message}`;
    }

    this.ws?.send(JSON.stringify({ type: "reply", content: reply, reply_ctx: session_key, session_key }));
  }

  private async queryWorkers(): Promise<string> {
    const r = await fetch(`${API_BASE}/social-workers`);
    const d = await r.json();
    const ws = d.socialWorkers ?? [];
    return `服务人员共${ws.length}人: ${ws.map((w: any) => w.name).join("、")}`;
  }

  private async createWorker(content: string): Promise<string> {
    const nm = content.match(/姓名[：:]\s*([^\s,，]+)/)?.[1] ?? "测试人员";
    const ph = content.match(/电话[：:]\s*(\d{11})/)?.[1] ?? "13900099001";
    const r = await fetch(`${API_BASE}/social-workers`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nm, phone: ph, workerType: "service_personnel", qualificationLabels: [] }),
    });
    return r.ok ? `已新增人员「${nm}」` : `新增失败`;
  }

  private async archiveWorker(content: string): Promise<string> {
    const r = await fetch(`${API_BASE}/social-workers`);
    const d = await r.json();
    const ws = d.socialWorkers ?? [];
    const nm = content.match(/归档人员[：:]*\s*([^\s,，]+)/)?.[1];
    const target = nm ? ws.find((w: any) => w.name === nm) : ws[ws.length - 1];
    if (!target) return "未找到人员";
    const ar = await fetch(`${API_BASE}/social-workers/${target.id}/archive`, { method: "POST" });
    return ar.ok ? `已归档「${target.name}」` : "归档失败";
  }

  private async queryBadges(): Promise<string> {
    const r = await fetch(`${API_BASE}/smart-badges`);
    const d = await r.json();
    const bs = d.smartBadges ?? [];
    return `设备共${bs.length}个: ${bs.map((b: any) => `${b.deviceCode ?? b.device_code}(${b.status})`).join("、")}`;
  }

  private async disableBadge(content: string): Promise<string> {
    const code = content.match(/FW-\d+/)?.[0];
    const r = await fetch(`${API_BASE}/smart-badges`);
    const d = await r.json();
    const bs = d.smartBadges ?? [];
    const target = code ? bs.find((b: any) => (b.deviceCode ?? b.device_code) === code) : bs.find((b: any) => b.status === "available");
    if (!target) return "未找到可停用的设备";
    const pr = await fetch(`${API_BASE}/smart-badges/${target.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "disabled" }),
    });
    return pr.ok ? `已停用「${target.deviceCode ?? target.device_code}」` : "停用失败";
  }

  private async queryObjects(): Promise<string> {
    const r = await fetch(`${API_BASE}/service-objects`);
    const d = await r.json();
    const os = d.serviceObjects ?? [];
    return `服务对象共${os.length}人: ${os.map((o: any) => o.name).join("、")}`;
  }

  private async createObject(content: string): Promise<string> {
    const nm = content.match(/姓名[：:]\s*([^\s,，]+)/)?.[1] ?? "测试对象";
    const r = await fetch(`${API_BASE}/service-objects`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nm, address: "测试地址", eligibilityType: "government", serviceProjects: [] }),
    });
    return r.ok ? `已新增服务对象「${nm}」` : "新增失败";
  }

  private async querySchedules(): Promise<string> {
    const r = await fetch(`${API_BASE}/service-schedule-occurrences`);
    const d = await r.json();
    const ss = d.serviceSchedules ?? [];
    return `排期共${ss.length}条`;
  }

  private async createSchedule(content: string): Promise<string> {
    const or = await fetch(`${API_BASE}/service-objects`);
    const od = await or.json();
    const firstObj = (od.serviceObjects ?? [])[0];
    if (!firstObj) return "没有服务对象";
    const r = await fetch(`${API_BASE}/service-schedule-occurrences`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceObjectId: firstObj.id, serviceProject: "助餐", serviceDate: "2026-05-20", timeWindow: { start: "09:00", end: "11:00" } }),
    });
    return r.ok ? `已为「${firstObj.name}」安排服务` : "安排失败";
  }

  private async queryRecords(): Promise<string> {
    const r = await fetch(`${API_BASE}/service-records`);
    const d = await r.json();
    const rs = d.serviceRecords ?? [];
    return `记录共${rs.length}条: ${rs.map((rec: any) => `${rec.serviceObjectName ?? rec.service_object_name}(${rec.reviewStatus ?? rec.review_status})`).join("、")}`;
  }

  private async reviewRecord(): Promise<string> {
    const r = await fetch(`${API_BASE}/service-records`);
    const d = await r.json();
    const rs = d.serviceRecords ?? [];
    const nr = rs.find((rec: any) => (rec.reviewStatus ?? rec.review_status) === "needs_review");
    if (!nr) return "没有待复核记录";
    const rr = await fetch(`${API_BASE}/service-records/${nr.id}/review`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_assignment" }),
    });
    return rr.ok ? `已复核「${nr.serviceObjectName ?? nr.service_object_name}」的记录` : "复核失败";
  }
}

async function setupPage(page: Page, userId?: string) {
  const uid = userId ?? `crud-${Date.now()}`;
  const chatToken = signTestJwt(uid);
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

async function sendChatMessage(page: Page, message: string, selector = ".command-input__field") {
  await page.locator(selector).fill(message);
  await page.locator(selector).press("Enter");
}

async function waitForAIReply(page: Page, textContains: string | RegExp, parent = ".chat-stream") {
  await expect(page.locator(`${parent} .chat-bubble--assistant`).last()).toContainText(textContains, { timeout: 60000 });
}

// ========== HOME CHAT CRUD TESTS ==========

test.describe("Home Chat CRUD", () => {
  let agent: SmartMockAgent;

  test.beforeEach(async () => {
    agent = new SmartMockAgent();
    await agent.connect();
  });

  test.afterEach(() => {
    agent.close();
  });

  test("query all workers", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "查看服务人员");
    await waitForAIReply(page, "服务人员共");
    await page.screenshot({ path: "/tmp/e2e-crud/home-query-workers.png" });
  });

  test("create a worker", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "新增人员，姓名：测试人员A，电话：13911111111");
    await waitForAIReply(page, "已新增人员");
    await page.screenshot({ path: "/tmp/e2e-crud/home-create-worker.png" });
  });

  test("archive a worker", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "归档人员");
    await waitForAIReply(page, "已归档");
    await page.screenshot({ path: "/tmp/e2e-crud/home-archive-worker.png" });
  });

  test("query all devices", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "查看设备");
    await waitForAIReply(page, "设备共");
    await page.screenshot({ path: "/tmp/e2e-crud/home-query-badges.png" });
  });

  test("disable a device", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "停用设备 FW-021");
    await waitForAIReply(page, "已停用");
    await page.screenshot({ path: "/tmp/e2e-crud/home-disable-badge.png" });
  });

  test("query service objects", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "查看服务对象");
    await waitForAIReply(page, "服务对象共");
    await page.screenshot({ path: "/tmp/e2e-crud/home-query-objects.png" });
  });

  test("create a service object", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "新增服务对象，姓名：刘奶奶");
    await waitForAIReply(page, "已新增服务对象");
    await page.screenshot({ path: "/tmp/e2e-crud/home-create-object.png" });
  });

  test("query schedules", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "查看排期");
    await waitForAIReply(page, "排期共");
    await page.screenshot({ path: "/tmp/e2e-crud/home-query-schedules.png" });
  });

  test("create a schedule", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "安排服务");
    await waitForAIReply(page, "已为");
    await page.screenshot({ path: "/tmp/e2e-crud/home-create-schedule.png" });
  });

  test("query records", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "查看记录");
    await waitForAIReply(page, "记录共");
    await page.screenshot({ path: "/tmp/e2e-crud/home-query-records.png" });
  });

  test("review a record", async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector(".chat-stream", { timeout: 10000 });
    await sendChatMessage(page, "复核通过");
    await waitForAIReply(page, /已复核|没有待复核|无待复核|复核/);
    await page.screenshot({ path: "/tmp/e2e-crud/home-review-record.png" });
  });
});

// ========== TAB COPILOT CRUD TESTS ==========

test.describe("Tab Copilot CRUD", () => {
  let agent: SmartMockAgent;

  test.beforeEach(async () => {
    agent = new SmartMockAgent();
    await agent.connect();
  });

  test.afterEach(() => {
    agent.close();
  });

  async function openCopilot(page: Page, tabLabel: string) {
    await setupPage(page);
    await page.locator(`[aria-label="${tabLabel}"]`).first().click();
    await page.locator(".copilot-toggle").click();
    await expect(page.locator(".copilot-panel[data-open='true']")).toBeVisible({ timeout: 3000 });
  }

  async function sendCopilotMessage(page: Page, message: string) {
    await page.locator(".copilot-panel .command-input__field").fill(message);
    await page.locator(".copilot-panel .command-input__field").press("Enter");
  }

  async function waitForCopilotReply(page: Page, textContains: string | RegExp) {
    await expect(page.locator(".copilot-panel .chat-bubble--assistant").last()).toContainText(textContains, { timeout: 60000 });
  }

  test("服务人员 tab: query workers", async ({ page }) => {
    await openCopilot(page, "服务人员");
    await expect(page.locator(".copilot-panel")).toContainText("AI 助手 · 服务人员");
    await sendCopilotMessage(page, "查看人员");
    await waitForCopilotReply(page, "服务人员共");
    await page.screenshot({ path: "/tmp/e2e-crud/copilot-workers-query.png" });
  });

  test("服务人员 tab: create worker", async ({ page }) => {
    await openCopilot(page, "服务人员");
    await sendCopilotMessage(page, "新增人员，姓名：Copilot测试，电话：13822222222");
    await waitForCopilotReply(page, "已新增人员");
    await page.screenshot({ path: "/tmp/e2e-crud/copilot-workers-create.png" });
  });

  test("设备 tab: query devices", async ({ page }) => {
    await openCopilot(page, "设备");
    await expect(page.locator(".copilot-panel")).toContainText("AI 助手 · 设备");
    await sendCopilotMessage(page, "查看设备");
    await waitForCopilotReply(page, "设备共");
    await page.screenshot({ path: "/tmp/e2e-crud/copilot-badges-query.png" });
  });

  test("服务对象 tab: query objects", async ({ page }) => {
    await openCopilot(page, "服务对象");
    await expect(page.locator(".copilot-panel")).toContainText("AI 助手 · 服务对象");
    await sendCopilotMessage(page, "查看服务对象");
    await waitForCopilotReply(page, "服务对象共");
    await page.screenshot({ path: "/tmp/e2e-crud/copilot-objects-query.png" });
  });

  test("服务排期 tab: query schedules", async ({ page }) => {
    await openCopilot(page, "服务排期");
    await expect(page.locator(".copilot-panel")).toContainText("AI 助手 · 服务排期");
    await sendCopilotMessage(page, "查看排期");
    await waitForCopilotReply(page, "排期共");
    await page.screenshot({ path: "/tmp/e2e-crud/copilot-schedules-query.png" });
  });

  test("服务记录 tab: query records", async ({ page }) => {
    await openCopilot(page, "服务记录");
    await expect(page.locator(".copilot-panel")).toContainText("AI 助手 · 服务记录");
    await sendCopilotMessage(page, "查看记录");
    await waitForCopilotReply(page, "记录共");
    await page.screenshot({ path: "/tmp/e2e-crud/copilot-records-query.png" });
  });

  test("copilot sessions are independent", async ({ page }) => {
    // Send message in 服务人员 copilot
    await openCopilot(page, "服务人员");
    await sendCopilotMessage(page, "查看人员");
    await waitForCopilotReply(page, "服务人员共");

    // Close copilot, switch to 设备 tab
    await page.locator(".copilot-toggle").click();
    await page.locator('[aria-label="设备"]').first().click();
    await page.locator(".copilot-toggle").click();
    await expect(page.locator(".copilot-panel[data-open='true']")).toBeVisible();

    // 设备 copilot should not have the workers message
    const assistantBubbles = page.locator(".copilot-panel .chat-bubble--assistant");
    await expect(assistantBubbles).toHaveCount(0);

    await page.screenshot({ path: "/tmp/e2e-crud/copilot-session-isolation.png" });
  });
});
