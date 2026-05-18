/**
 * Mock Agent - Simulates lak + CC session for local testing.
 * Connects to the server's /api/ws/agent endpoint and responds to user messages
 * by calling the REST API and formatting results.
 */
import { WebSocket } from "ws";

const SERVER_PORT = process.env.PORT ?? "3001";
const WS_TOKEN = process.env.WS_TOKEN ?? "dev-ws-token-change-in-prod";
const AGENT_ID = process.env.AGENT_ID ?? "lumii-goldenyears";
const API_BASE = `http://localhost:${SERVER_PORT}/api`;

let ws: WebSocket;
let registered = false;

function connect() {
  ws = new WebSocket(`ws://localhost:${SERVER_PORT}/api/ws/agent`);

  ws.on("open", () => {
    console.log("[mock-agent] Connected, registering...");
    ws.send(JSON.stringify({
      type: "register",
      platform: "dashboard",
      capabilities: ["attachments"],
      metadata: { agent_id: AGENT_ID, token: WS_TOKEN },
    }));
  });

  ws.on("message", async (raw) => {
    const frame = JSON.parse(raw.toString());

    if (frame.type === "register_ack") {
      if (frame.ok) {
        registered = true;
        console.log("[mock-agent] Registered successfully. Ready for messages.");
      } else {
        console.error("[mock-agent] Registration failed:", frame.error);
      }
      return;
    }

    if (frame.type === "message" && registered) {
      console.log(`[mock-agent] Received: "${frame.content}" (session: ${frame.session_key})`);
      await handleUserMessage(frame);
    }

    if (frame.type === "preview_ack") {
      // Ignore acks
    }
  });

  ws.on("close", () => {
    console.log("[mock-agent] Disconnected. Reconnecting in 3s...");
    registered = false;
    setTimeout(connect, 3000);
  });

  ws.on("error", (err) => {
    console.error("[mock-agent] Error:", err.message);
  });
}

async function handleUserMessage(frame: { content: string; session_key: string; reply_ctx: string }) {
  const { content, session_key } = frame;
  const scope = session_key.split(":").pop() ?? "home";

  try {
    const response = await routeIntent(content, scope);
    // Send reply
    ws.send(JSON.stringify({
      type: "reply",
      content: response,
      reply_ctx: session_key,
      session_key,
    }));
  } catch (err: any) {
    ws.send(JSON.stringify({
      type: "reply",
      content: `操作失败: ${err.message}`,
      reply_ctx: session_key,
      session_key,
    }));
  }
}

async function routeIntent(content: string, scope: string): Promise<string> {
  const lower = content.toLowerCase();

  // --- 查询类 ---
  if (lower.includes("查") && (lower.includes("人员") || lower.includes("王丽") || lower.includes("张"))) {
    return await queryWorkers(content);
  }
  if (lower.includes("查") && (lower.includes("设备") || lower.includes("工牌") || lower.includes("fw"))) {
    return await queryBadges(content);
  }
  if (lower.includes("查") && (lower.includes("服务对象") || lower.includes("老人") || lower.includes("阿姨"))) {
    return await queryServiceObjects(content);
  }
  if (lower.includes("查") && (lower.includes("排期") || lower.includes("日程") || lower.includes("今天"))) {
    return await querySchedules(content);
  }
  if (lower.includes("查") && (lower.includes("记录") || lower.includes("复核"))) {
    return await queryRecords(content);
  }
  if (lower.includes("待复核") || lower.includes("需要复核")) {
    return await queryRecords("待复核");
  }

  // --- 新增类 ---
  if (lower.includes("新增") && lower.includes("人员") || lower.includes("添加") && lower.includes("人员")) {
    return await createWorker(content);
  }
  if (lower.includes("激活") && lower.includes("工牌")) {
    return await activateBadge(content);
  }
  if (lower.includes("新增") && lower.includes("服务对象") || lower.includes("添加") && lower.includes("对象")) {
    return await createServiceObject(content);
  }
  if (lower.includes("安排") || lower.includes("创建排期") || lower.includes("新增排期")) {
    return await createSchedule(content);
  }

  // --- 更新类 ---
  if (lower.includes("归档") && lower.includes("人员")) {
    return await archiveWorker(content);
  }
  if (lower.includes("停用") && (lower.includes("设备") || lower.includes("工牌"))) {
    return await disableBadge(content);
  }
  if (lower.includes("复核通过") || lower.includes("确认复核")) {
    return await reviewRecord(content);
  }

  // --- scope-based default queries ---
  if (scope === "social_workers") return await queryWorkers("");
  if (scope === "smart_badges") return await queryBadges("");
  if (scope === "service_objects") return await queryServiceObjects("");
  if (scope === "service_schedules") return await querySchedules("");
  if (scope === "service_records") return await queryRecords("");

  // General greeting / help
  return `你好！我是 GoldenYears 站点运营助手。我可以帮你：
- 查询/新增/修改 服务人员、设备、服务对象、排期、记录
- 复核服务记录
- 安排服务

请告诉我你想做什么？`;
}

// --- Query functions ---

async function queryWorkers(query: string): Promise<string> {
  const res = await fetch(`${API_BASE}/social-workers`);
  const data = await res.json();
  const workers = data.socialWorkers ?? [];
  if (workers.length === 0) return "暂无服务人员数据。";
  let result = `**服务人员列表**（共${workers.length}人）\n\n`;
  result += "| 姓名 | 电话 | 状态 | 资质 |\n|------|------|------|------|\n";
  for (const w of workers) {
    const quals = (w.qualificationLabels ?? w.qualification_labels ?? []).join("、");
    result += `| ${w.name} | ${w.phone} | ${w.status === "active" ? "在职" : w.status} | ${quals} |\n`;
  }
  return result;
}

async function queryBadges(query: string): Promise<string> {
  const res = await fetch(`${API_BASE}/smart-badges`);
  const data = await res.json();
  const badges = data.smartBadges ?? [];
  if (badges.length === 0) return "暂无设备数据。";
  let result = `**智能工牌列表**（共${badges.length}个）\n\n`;
  result += "| 设备码 | 状态 | 电量 | 站点 |\n|--------|------|------|------|\n";
  for (const b of badges) {
    const statusMap: Record<string, string> = { available: "可用", in_use: "使用中", offline: "离线", low_battery: "低电量", pending_activation: "待激活", disabled: "已停用", lost: "丢失", sync_delayed: "同步延迟" };
    result += `| ${b.deviceCode ?? b.device_code} | ${statusMap[b.status] ?? b.status} | ${b.batteryPercent ?? b.battery_percent ?? "-"}% | ${b.siteName ?? b.site_name ?? "-"} |\n`;
  }
  return result;
}

async function queryServiceObjects(query: string): Promise<string> {
  const res = await fetch(`${API_BASE}/service-objects`);
  const data = await res.json();
  const objects = data.serviceObjects ?? [];
  if (objects.length === 0) return "暂无服务对象数据。";
  let result = `**服务对象列表**（共${objects.length}人）\n\n`;
  result += "| 姓名 | 地址 | 服务资格 | 风险标签 |\n|------|------|---------|----------|\n";
  for (const o of objects) {
    const et = o.eligibilityType ?? o.eligibility_type;
    const etMap: Record<string, string> = { insurance: "养护险", government: "政府购买", institution: "机构服务", self_paid: "自费" };
    const risks = (o.riskTags ?? o.risk_tags ?? []).join("、");
    result += `| ${o.name} | ${o.address} | ${etMap[et] ?? et} | ${risks || "无"} |\n`;
  }
  return result;
}

async function querySchedules(query: string): Promise<string> {
  const res = await fetch(`${API_BASE}/service-schedule-occurrences`);
  const data = await res.json();
  const schedules = data.serviceSchedules ?? [];
  if (schedules.length === 0) return "暂无排期数据。";
  let result = `**服务排期列表**（共${schedules.length}条）\n\n`;
  result += "| 日期 | 对象 | 项目 | 状态 | 人员 |\n|------|------|------|------|------|\n";
  for (const s of schedules) {
    const statusMap: Record<string, string> = { scheduled: "待执行", assigned: "已分配", completed: "已完成", cancelled: "已取消", adjusted: "已调整", in_progress: "进行中" };
    result += `| ${s.serviceDate ?? s.service_date} | ${s.serviceObjectName ?? s.service_object_name} | ${s.serviceProject ?? s.service_project} | ${statusMap[s.status] ?? s.status} | ${s.assignedSocialWorkerName ?? s.assigned_social_worker_name ?? "未分配"} |\n`;
  }
  return result;
}

async function queryRecords(query: string): Promise<string> {
  let url = `${API_BASE}/service-records`;
  if (query.includes("待复核")) url += "?reviewStatus=needs_review";
  const res = await fetch(url);
  const data = await res.json();
  const records = data.serviceRecords ?? [];
  if (records.length === 0) return "暂无符合条件的服务记录。";
  let result = `**服务记录**（共${records.length}条）\n\n`;
  result += "| 日期 | 对象 | 项目 | 人员 | 复核状态 |\n|------|------|------|------|----------|\n";
  for (const r of records) {
    const statusMap: Record<string, string> = { confirmed: "已确认", needs_review: "待复核", info_incomplete: "信息不完整", exception_open: "异常未闭环" };
    const rs = r.reviewStatus ?? r.review_status;
    result += `| ${r.serviceDate ?? r.service_date} | ${r.serviceObjectName ?? r.service_object_name} | ${r.serviceProject ?? r.service_project} | ${r.socialWorkerName ?? r.social_worker_name ?? "-"} | ${statusMap[rs] ?? rs} |\n`;
  }
  return result;
}

// --- Mutation functions ---

async function createWorker(content: string): Promise<string> {
  // Extract name and phone from natural language
  const nameMatch = content.match(/(?:叫|名字|姓名)[：:]*\s*([^\s,，、]+)/);
  const phoneMatch = content.match(/(?:电话|手机|号码)[：:]*\s*(\d{11})/);
  const name = nameMatch?.[1] ?? "新人员";
  const phone = phoneMatch?.[1] ?? "13900000000";

  const res = await fetch(`${API_BASE}/social-workers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, workerType: "service_personnel", qualificationLabels: [] }),
  });
  const data = await res.json();
  if (res.ok) {
    return `已新增服务人员「${name}」，电话: ${phone}。`;
  }
  return `新增失败: ${JSON.stringify(data)}`;
}

async function activateBadge(content: string): Promise<string> {
  const codeMatch = content.match(/FW-(\d+)/i);
  const deviceCode = codeMatch ? `FW-${codeMatch[1]}` : "FW-099";

  const res = await fetch(`${API_BASE}/smart-badges/activations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceCode, siteId: "site-001" }),
  });
  const data = await res.json();
  if (res.ok) return `已激活工牌「${deviceCode}」。`;
  return `激活失败: ${data.message ?? JSON.stringify(data)}`;
}

async function createServiceObject(content: string): Promise<string> {
  const nameMatch = content.match(/(?:叫|名字|姓名)[：:]*\s*([^\s,，、]+)/);
  const name = nameMatch?.[1] ?? "新服务对象";

  const res = await fetch(`${API_BASE}/service-objects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, address: "待补充", eligibilityType: "government", serviceProjects: [] }),
  });
  const data = await res.json();
  if (res.ok) return `已新增服务对象「${name}」。`;
  return `新增失败: ${JSON.stringify(data)}`;
}

async function createSchedule(content: string): Promise<string> {
  // Get first service object
  const objRes = await fetch(`${API_BASE}/service-objects`);
  const objData = await objRes.json();
  const firstObj = (objData.serviceObjects ?? [])[0];
  if (!firstObj) return "没有服务对象，无法安排服务。";

  const res = await fetch(`${API_BASE}/service-schedule-occurrences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceObjectId: firstObj.id,
      serviceProject: "助餐",
      serviceDate: new Date().toISOString().split("T")[0],
      timeWindow: { start: "09:00", end: "11:00" },
    }),
  });
  const data = await res.json();
  if (res.ok) return `已为「${firstObj.name}」安排今天上午的助餐服务。`;
  return `安排失败: ${JSON.stringify(data)}`;
}

async function archiveWorker(content: string): Promise<string> {
  // Get workers, archive the last one
  const res = await fetch(`${API_BASE}/social-workers`);
  const data = await res.json();
  const workers = data.socialWorkers ?? [];
  const target = workers.find((w: any) => content.includes(w.name)) ?? workers[workers.length - 1];
  if (!target) return "没有找到要归档的人员。";

  const archRes = await fetch(`${API_BASE}/social-workers/${target.id}/archive`, { method: "POST" });
  if (archRes.ok) return `已归档服务人员「${target.name}」。`;
  return `归档失败。`;
}

async function disableBadge(content: string): Promise<string> {
  const res = await fetch(`${API_BASE}/smart-badges`);
  const data = await res.json();
  const badges = data.smartBadges ?? [];
  const codeMatch = content.match(/FW-(\d+)/i);
  const target = codeMatch
    ? badges.find((b: any) => (b.deviceCode ?? b.device_code) === `FW-${codeMatch[1]}`)
    : badges.find((b: any) => b.status === "available");
  if (!target) return "没有找到可停用的设备。";

  const patchRes = await fetch(`${API_BASE}/smart-badges/${target.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "disabled" }),
  });
  if (patchRes.ok) return `已停用设备「${target.deviceCode ?? target.device_code}」。`;
  return `停用失败。`;
}

async function reviewRecord(content: string): Promise<string> {
  const res = await fetch(`${API_BASE}/service-records`);
  const data = await res.json();
  const records = data.serviceRecords ?? [];
  const needsReview = records.find((r: any) => (r.reviewStatus ?? r.review_status) === "needs_review");
  if (!needsReview) return "没有待复核的服务记录。";

  const reviewRes = await fetch(`${API_BASE}/service-records/${needsReview.id}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "confirm_assignment" }),
  });
  if (reviewRes.ok) return `已复核通过记录（${needsReview.serviceDate ?? needsReview.service_date} · ${needsReview.serviceObjectName ?? needsReview.service_object_name}）。`;
  return `复核失败。`;
}

// Start
console.log("[mock-agent] Starting mock agent for local testing...");
connect();
