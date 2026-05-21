import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

// Same PrismaClient setup as server/db/prisma.ts
function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    connectionLimit: parseInt(parsed.searchParams.get("connection_limit") ?? "10", 10),
  };
}

function createPrismaClient(): PrismaClient {
  const config = parseDatabaseUrl(process.env.DATABASE_URL!);
  const adapter = new PrismaMariaDb(config);
  return new PrismaClient({ adapter }) as unknown as PrismaClient;
}

const prisma = createPrismaClient();

// ── Helper: build service items for a given SOP project ──

const sopTranscripts: Record<string, Record<string, string>> = {
  "助餐": {
    "问候老人确认身份": "阿姨您好，我是服务人员，今天来给您送餐。",
    "询问当日身体状况": "阿姨今天身体怎么样？精神好不好？昨晚睡得好吗？",
    "检查居住环境安全隐患": "家里地面很干净，没有障碍物，灯光也够亮。",
    "确认服务对象用药情况": "阿姨，今天早上的药按时吃了吗？",
    "准备餐食材料": "今天准备了清蒸鱼和青菜豆腐汤，食材新鲜。",
    "烹饪餐食": "鱼蒸了15分钟，汤也煮好了，味道不错。",
    "摆放餐具和餐食": "碗筷摆好了，汤放这边，鱼放中间。",
    "协助老人就座用餐": "阿姨慢慢坐，我扶您，椅子稳着呢。",
    "观察老人进食情况": "阿姨今天胃口不错，吃了大半碗饭，鱼也吃了不少。",
    "提醒老人服药": "阿姨，吃完饭了，把药吃了吧。",
    "收拾餐具和厨房": "碗筷洗好了，灶台也擦干净了。",
    "检查冰箱食材存量": "冰箱里还有鸡蛋和牛奶，蔬菜需要补充。",
    "询问老人对餐食满意度": "阿姨觉得今天的菜怎么样？",
    "记录老人情绪状态": "阿姨今天心情挺好的，聊了聊家常。",
    "检查室内温度和通风": "窗户开了一会儿通风，温度适宜。",
    "协助老人活动或康复训练": "阿姨我们走两圈吧，活动活动腿脚。",
    "检查老人皮肤状况": "手臂和腿部皮肤正常，没有红肿。",
    "记录老人行动能力变化": "阿姨今天走路比上次稳一些了。",
    "告知老人下次服务时间": "阿姨，后天周三我再来，还是上午。",
    "与老人道别": "阿姨再见，您注意休息，有事打电话。",
    "锁好门窗": "门锁好了，窗户也关上了。",
    "填写服务小结": "记录完毕，今日服务正常完成。",
    "上传服务证据": "证据已上传，等待系统处理。",
    "结束服务并签退": "服务结束，签退完成。",
  },
  "助浴": {
    "确认老人身体状况适合助浴": "爷爷今天血压正常，身体状况适合洗澡。",
    "检查浴室环境安全": "浴室防滑垫已铺好，扶手牢固，排水畅通。",
    "调节水温至适宜温度": "水温调到38度，先试了手感，温度合适。",
    "协助老人脱衣": "爷爷慢慢来，不着急，我帮您。",
    "协助老人进入浴室": "扶好扶手，脚踩防滑垫，慢慢进来。",
    "协助清洗头发": "洗发水抹好了，我轻轻揉一下，水温还行吧？",
    "协助清洗身体": "背部我帮您搓一下，力度可以吧？",
    "检查皮肤状况": "皮肤状况良好，没有红肿和破损。",
    "协助冲洗干净": "泡沫冲干净了，再检查一下后背。",
    "协助擦干身体": "毛巾先擦头发，再擦身体，不要着凉。",
    "协助穿衣": "先穿内衣，再穿外套，扣子我帮您。",
    "协助老人离开浴室": "地面有点滑，扶好我的手，慢慢走。",
    "检查老人洗浴后状态": "爷爷洗完精神不错，没有头晕。",
    "清理浴室": "浴室地面擦干了，毛巾挂好了。",
    "记录服务情况": "助浴服务完成，老人状态良好。",
  },
  "探访关爱": {
    "问候老人确认身份": "奶奶您好，我是李芳，今天来看您了。",
    "询问老人近期身体状况": "奶奶最近身体怎么样？有没有哪里不舒服？",
    "检查居住环境": "家里很整洁，卫生间地面干燥，没有隐患。",
    "了解老人情绪和心理状态": "奶奶今天心情挺好的，说孙女昨天给她打电话了。",
    "检查老人用药情况": "奶奶的降压药和钙片都按时吃了。",
    "检查老人饮食情况": "奶奶说昨天吃了面条和水果，胃口还行。",
    "协助老人简单活动": "奶奶我们在客厅走两圈，活动活动。",
    "检查老人行动能力": "奶奶今天走路比较稳，精神也好。",
    "记录老人身体变化": "与上次相比没有明显变化，整体状况稳定。",
    "与老人交流关爱": "奶奶跟我聊了聊孙女的事，很开心。",
    "检查家中安全隐患": "检查了厨房和卫生间，没有安全隐患。",
    "告知下次服务时间": "奶奶，下周我再来看您，有事随时打电话。",
  },
};

function sopBusinessItems(prefix: string, project: string) {
  const titles = Object.keys(sopTranscripts[project] ?? sopTranscripts["助餐"]);
  const transcripts = sopTranscripts[project] ?? sopTranscripts["助餐"];
  let clock = 0;
  return titles.map((title, i) => {
    const dur = 5 + Math.floor(Math.random() * 30);
    const startMin = clock;
    clock += dur;
    const endMin = clock;
    const fmtTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    return { id: `${prefix}-b${i + 1}`, seq: i + 1, category: "business", title, status: "completed", startTime: fmtTime(startMin), endTime: fmtTime(endMin), audioDurationSeconds: dur, transcript: transcripts[title] };
  });
}

function sopProcessItems(prefix: string, workerName: string, objectName: string, statuses: string[] = ["completed", "completed", "completed"]) {
  return [
    { id: `${prefix}-p1`, seq: 1, category: "process", title: "入门自我介绍", status: statuses[0], startTime: "00:00", endTime: "00:10", audioDurationSeconds: 10, transcript: `${objectName}您好，我是红培社区站的服务人员${workerName}，今天由我为您提供服务。` },
    { id: `${prefix}-p2`, seq: 2, category: "process", title: "服务结束总结", status: statuses[1], startTime: "00:10", endTime: "00:22", audioDurationSeconds: 12, transcript: `${objectName}，今天的服务已经完成了，下次服务时间我会提前通知您。` },
    { id: `${prefix}-p3`, seq: 3, category: "process", title: "服务期间行为规范", status: statuses[2], startTime: "00:22", endTime: "01:12", audioDurationSeconds: 50 },
  ];
}

async function main() {
  // Check if already seeded
  const swCount = await prisma.socialWorker.count();
  if (swCount > 0) {
    // Check if data has startTime in service items (new format)
    const record = await prisma.serviceRecord.findFirst({ select: { serviceItems: true } });
    if (record?.serviceItems) {
      const items = record.serviceItems as any[];
      if (items.length > 0 && items[0].startTime) {
        console.log("[seed] Already seeded with new format, skipping.");
        return;
      }
    }
    // Old format — clear and re-seed
    console.log("[seed] Detected old data format, re-seeding...");
    await prisma.homeSummary.deleteMany();
    await prisma.transcript.deleteMany();
    await prisma.audioAsset.deleteMany();
    await prisma.serviceRecord.deleteMany();
    await prisma.serviceSchedule.deleteMany();
    await prisma.servicePlanException.deleteMany();
    await prisma.servicePlan.deleteMany();
    await prisma.familyContact.deleteMany();
    await prisma.serviceObject.deleteMany();
    await prisma.smartBadge.deleteMany();
    await prisma.socialWorker.deleteMany();
  }

  // ── Social Workers ──
  await prisma.socialWorker.createMany({
    data: [
      { id: "worker-001", userId: "user-001", name: "王丽", phone: "13800000001", siteId: "site-001", workerType: "service_personnel", qualificationLabels: ["助餐", "陪诊"], status: "active", preferredBadgeId: "badge-021", preferredBadgeDeviceCode: "FW-021", preferredBadgeStatus: "available", preferredBadgeLastSyncAt: "2026-05-13T08:50:00+08:00", praiseCount: 42, latestPraiseAt: "2026-05-12T16:30:00+08:00", latestPraiseExcerpt: "服务细心周到，阿姨很满意" },
      { id: "worker-002", userId: "user-002", name: "张敏", phone: "13800000002", siteId: "site-001", workerType: "service_personnel", qualificationLabels: ["助洁"], status: "active", praiseCount: 17, latestPraiseAt: "2026-05-10T11:00:00+08:00" },
      { id: "worker-003", userId: "user-003", name: "李芳", phone: "13900000003", siteId: "site-001", workerType: "service_personnel", qualificationLabels: ["助餐"], status: "incomplete_profile", preferredBadgeId: "badge-030", preferredBadgeDeviceCode: "FW-030", preferredBadgeStatus: "pending_activation", praiseCount: 3 },
      { id: "worker-004", userId: "user-004", name: "周建国", phone: "13700000004", siteId: "site-001", workerType: "service_personnel", qualificationLabels: [], status: "disabled", praiseCount: 0 },
    ],
  });

  // ── Smart Badges ──
  await prisma.smartBadge.createMany({
    data: [
      { id: "badge-021", deviceCode: "FW-021", orgId: "org-001", siteId: "site-001", siteName: "红培社区站", status: "available", batteryPercent: 83, activatedAt: "2026-05-01T09:00:00+08:00", lastSyncAt: "2026-05-13T08:50:00+08:00", lastRecordingAt: "2026-05-12T10:22:00+08:00", preferredWorkerId: "worker-001", preferredWorkerName: "王丽", recentServiceRecordIds: ["record-001"] },
      { id: "badge-026", deviceCode: "FW-026", orgId: "org-001", siteId: "site-001", siteName: "红培社区站", status: "sync_delayed", batteryPercent: 92, activatedAt: "2026-05-03T09:00:00+08:00", lastSyncAt: "2026-05-12T18:43:00+08:00", recentServiceRecordIds: [] },
      { id: "badge-030", deviceCode: "FW-030", orgId: "org-001", siteId: "site-001", siteName: "红培社区站", status: "pending_activation", recentServiceRecordIds: [] },
      { id: "badge-031", deviceCode: "FW-031", orgId: "org-001", siteId: "site-001", siteName: "红培社区站", status: "in_use", batteryPercent: 67, activatedAt: "2026-05-02T10:00:00+08:00", lastSyncAt: "2026-05-14T09:30:00+08:00", lastRecordingAt: "2026-05-14T09:35:00+08:00", preferredWorkerId: "worker-002", preferredWorkerName: "张敏", recentServiceRecordIds: ["record-001"] },
      { id: "badge-032", deviceCode: "FW-032", orgId: "org-001", siteId: "site-001", siteName: "红培社区站", status: "offline", batteryPercent: 45, activatedAt: "2026-04-20T09:00:00+08:00", lastSyncAt: "2026-05-11T14:20:00+08:00", recentServiceRecordIds: [] },
      { id: "badge-033", deviceCode: "FW-033", orgId: "org-001", siteId: "site-001", siteName: "红培社区站", status: "low_battery", batteryPercent: 8, activatedAt: "2026-04-15T09:00:00+08:00", lastSyncAt: "2026-05-14T07:10:00+08:00", preferredWorkerId: "worker-003", preferredWorkerName: "李芳", recentServiceRecordIds: [] },
      { id: "badge-034", deviceCode: "FW-034", orgId: "org-001", siteId: "site-001", siteName: "红培社区站", status: "disabled", batteryPercent: 55, activatedAt: "2026-03-01T09:00:00+08:00", lastSyncAt: "2026-04-30T16:00:00+08:00", recentServiceRecordIds: [] },
      { id: "badge-035", deviceCode: "FW-035", orgId: "org-001", siteId: "site-001", siteName: "红培社区站", status: "lost", batteryPercent: 30, activatedAt: "2026-03-10T09:00:00+08:00", lastSyncAt: "2026-05-05T11:00:00+08:00", recentServiceRecordIds: [] },
    ],
  });

  // ── Service Objects ──
  await prisma.serviceObject.createMany({
    data: [
      { id: "object-001", name: "陈阿姨", phone: "13800001234", age: 82, gender: "female", address: "上海市杨浦区控江路 1200 号", mapDisplayPoint: { latitude: 31.292, longitude: 121.515, label: "控江路 1200 号" }, eligibilityType: "government", serviceFrequency: "每周三次", serviceProjects: ["助餐", "陪诊"], riskTags: ["独居", "跌倒风险"], careNotes: ["午餐后需确认服药"], familySubscriptionSummary: "weekly", latestInsightSummary: "最近三次助餐完成稳定，需关注用药提醒。", insightSummaries: [{ id: "insight-001", title: "状态稳定", description: "最近三次服务均按时完成。", severity: "info" }, { id: "insight-002", title: "用药提醒", description: "午餐后需确认服药。", severity: "warning" }], state: "plan_exception_active" },
      { id: "object-002", name: "李爷爷", phone: "13900005678", age: 78, gender: "male", address: "上海市杨浦区长阳路 800 号", mapDisplayPoint: { latitude: 31.288, longitude: 121.525, label: "长阳路 800 号" }, eligibilityType: "insurance", serviceFrequency: "每周两次", serviceProjects: ["助浴"], riskTags: ["认知障碍"], careNotes: ["需要家属陪同助浴", "对水温敏感"], familySubscriptionSummary: "none", latestInsightSummary: null, insightSummaries: [], state: "plan_paused" },
      { id: "object-003", name: "王奶奶", phone: "13700009999", age: 88, gender: "female", address: "上海市杨浦区国顺路 500 号", eligibilityType: "self_paid", serviceFrequency: "每周一次", serviceProjects: ["探访关爱"], riskTags: [], careNotes: [], familySubscriptionSummary: "monthly", latestInsightSummary: null, insightSummaries: [], state: "normal" },
    ],
  });

  // ── Family Contacts ──
  await prisma.familyContact.createMany({
    data: [
      { id: "family-001", serviceObjectId: "object-001", name: "陈女士", relation: "女儿", phone: "13900000001", subscriptionStatus: "weekly", lastPushedAt: "2026-05-12T18:00:00+08:00" },
      { id: "family-002", serviceObjectId: "object-002", name: "李先生", relation: "儿子", phone: "13800002222", subscriptionStatus: "exception_only", lastPushedAt: "2026-05-10T10:00:00+08:00" },
      { id: "family-003", serviceObjectId: "object-003", name: "王女士", relation: "孙女", phone: "13700003333", subscriptionStatus: "monthly" },
    ],
  });

  // ── Service Plans ──
  await prisma.servicePlan.createMany({
    data: [
      { id: "plan-001", serviceObjectId: "object-001", serviceProject: "助餐", cadenceRule: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR", cadenceLabel: "每周一三五", preferredTimeWindow: { start: "09:00", end: "10:30", label: "上午" }, startDate: "2026-05-01", primarySocialWorkerId: "worker-001", primarySocialWorkerName: "王丽", status: "active", nextScheduleAt: "2026-05-14T14:00:00+08:00" },
      { id: "plan-002", serviceObjectId: "object-002", serviceProject: "助浴", cadenceRule: "RRULE:FREQ=WEEKLY;BYDAY=TU,TH", cadenceLabel: "每周二四", preferredTimeWindow: { start: "14:00", end: "15:30", label: "下午" }, startDate: "2026-05-01", primarySocialWorkerId: "worker-002", primarySocialWorkerName: "张敏", status: "paused" },
    ],
  });

  // ── Service Plan Exceptions ──
  await prisma.servicePlanException.createMany({
    data: [
      { id: "exception-pause", servicePlanId: "plan-001", kind: "pause", effectiveFrom: "2026-05-20", effectiveTo: "2026-05-22", note: "住院暂停" },
      { id: "exception-time", servicePlanId: "plan-001", kind: "time_change", effectiveFrom: "2026-05-14", timeWindow: { start: "14:00", end: "15:00", label: "下午临时调整" } },
      { id: "exception-worker", servicePlanId: "plan-001", kind: "worker_change", effectiveFrom: "2026-05-15", replacementSocialWorkerId: "worker-002" },
      { id: "exception-skip", servicePlanId: "plan-001", kind: "skip", effectiveFrom: "2026-05-17", note: "家属临时陪护" },
    ],
  });

  // ── Service Schedules ──
  const today = new Date().toISOString().slice(0, 10);
  await prisma.serviceSchedule.createMany({
    data: [
      { id: "schedule-001", source: "service_plan", servicePlanId: "plan-001", serviceObjectId: "object-001", serviceObjectName: "陈阿姨", serviceProject: "助餐", addressSnapshot: "上海市杨浦区控江路 1200 号", address: "上海市杨浦区控江路 1200 号", mapDisplayPoint: { latitude: 31.292, longitude: 121.515, label: "控江路 1200 号" }, serviceDate: today, startTime: "09:00", endTime: "10:30", timeWindow: { start: "09:00", end: "10:30", label: "上午" }, assignedSocialWorkerId: "sw-001", assignedSocialWorkerName: "王建国", status: "scheduled", riskTags: ["独居"] },
      { id: "schedule-002", source: "one_time", serviceObjectId: "object-003", serviceObjectName: "王奶奶", serviceProject: "探访关爱", addressSnapshot: "上海市杨浦区国顺路 500 号", address: "上海市杨浦区国顺路 500 号", serviceDate: today, startTime: "14:00", endTime: "15:00", timeWindow: { start: "14:00", end: "15:00", label: "下午" }, assignedSocialWorkerId: "sw-001", assignedSocialWorkerName: "王建国", status: "scheduled", riskTags: [] },
      { id: "schedule-003", source: "service_plan", servicePlanId: "plan-001", serviceObjectId: "object-001", serviceObjectName: "陈阿姨", serviceProject: "助餐", addressSnapshot: "上海市杨浦区控江路 1200 号", address: "上海市杨浦区控江路 1200 号", serviceDate: "2026-05-12", startTime: "09:30", endTime: "10:30", timeWindow: { start: "09:30", end: "10:30" }, assignedSocialWorkerId: "sw-001", assignedSocialWorkerName: "王建国", status: "completed", serviceRecordId: "record-001", riskTags: [] },
      { id: "schedule-004", source: "service_plan", servicePlanId: "plan-002", serviceObjectId: "object-002", serviceObjectName: "李爷爷", serviceProject: "助浴", addressSnapshot: "上海市杨浦区长阳路 800 号", address: "上海市杨浦区长阳路 800 号", mapDisplayPoint: { latitude: 31.288, longitude: 121.525, label: "长阳路 800 号" }, serviceDate: today, startTime: "14:00", endTime: "15:30", timeWindow: { start: "14:00", end: "15:30", label: "下午" }, assignedSocialWorkerId: "sw-002", assignedSocialWorkerName: "张敏", status: "scheduled", riskTags: ["认知障碍"] },
      { id: "schedule-005", source: "one_time", serviceObjectId: "object-003", serviceObjectName: "王奶奶", serviceProject: "探访关爱", addressSnapshot: "上海市杨浦区国顺路 500 号", address: "上海市杨浦区国顺路 500 号", serviceDate: "2026-05-16", startTime: "09:00", endTime: "10:00", timeWindow: { start: "09:00", end: "10:00", label: "上午" }, assignedSocialWorkerId: "sw-001", assignedSocialWorkerName: "王建国", status: "scheduled", riskTags: [] },
      { id: "schedule-006", source: "service_plan", servicePlanId: "plan-001", serviceObjectId: "object-001", serviceObjectName: "陈阿姨", serviceProject: "助餐", addressSnapshot: "上海市杨浦区控江路 1200 号", address: "上海市杨浦区控江路 1200 号", serviceDate: "2026-05-17", startTime: "09:00", endTime: "10:30", timeWindow: { start: "09:00", end: "10:30", label: "上午" }, status: "cancelled", notes: "家属临时取消", riskTags: [] },
    ],
  });

  // ── SOPs ──
  await prisma.sop.createMany({
    data: [
      {
        id: "sop-general-001", name: "上门服务通用规范", type: "general", description: "所有上门服务必须遵守的通用规范", keywords: [], version: 1, orgId: "org-001",
        sopContent: "1. 上门服务人员必须在开始服务时自报家门（姓名、所属机构），并确认被服务人员身份\n2. 服务过程中不得向被服务人员推销任何商业产品、保健品、保险或理财\n3. 不得私下收取费用或接受好处\n4. 不得拍摄或传播被服务人员的照片、视频或个人信息\n5. 服务结束前必须明确复述本次完成的服务内容，要求被服务人员确认，并询问满意度\n6. 服务全程需保持录音，录音自动存档",
        sopSource: "manual", sopVersion: 3,
        sopHistory: [{ version: 1, date: "2026-04-01", summary: "初始版本" }, { version: 2, date: "2026-04-20", summary: "增加满意度询问要求" }, { version: 3, date: "2026-05-14", summary: "更新违规行为条款" }],
        supervisionContent: "1. 开场 1 分钟内未做自报家门和身份确认 → 语音提示一次\n2. 出现服务结束迹象但未复述服务内容和询问满意度 → 语音提示一次\n3. 检测到推销商品、私下收费等违规行为 → 具体描述违规并提示",
        supervisionSource: "ai_generated", supervisionVersion: 2,
        supervisionHistory: [{ version: 1, date: "2026-04-01", summary: "AI 初始生成" }, { version: 2, date: "2026-05-14", summary: "AI 基于 SOP v3 重新推理" }],
        reportContent: "1. 是否做了开场确认，如有则记录信息，如无则提示缺失\n2. 是否询问了身体情况并总结结果\n3. 是否做了结束确认、复述服务内容和询问满意度\n4. 检查是否有推销或违规行为，如有则标注",
        reportSource: "ai_generated", reportVersion: 2,
        reportHistory: [{ version: 1, date: "2026-04-01", summary: "AI 初始生成" }, { version: 2, date: "2026-05-14", summary: "AI 基于 SOP v3 重新推理" }],
      },
      {
        id: "sop-service-001", name: "助餐服务SOP", type: "service", description: "上门助餐服务标准流程", keywords: ["助餐", "做饭", "食材", "吃饭", "午餐", "晚餐", "早餐", "饮食"], version: 1, orgId: "org-001",
        sopContent: null, supervisionContent: null, reportContent: null,
        sopSource: "manual", sopVersion: 1, sopHistory: [{ version: 1, date: "2026-05-20", summary: "初始版本" }],
        supervisionSource: "ai_generated", supervisionVersion: 0, supervisionHistory: [],
        reportSource: "ai_generated", reportVersion: 0, reportHistory: [],
      },
      {
        id: "sop-service-002", name: "助浴服务SOP", type: "service", description: "上门助浴服务标准流程", keywords: ["助浴", "洗澡", "水温", "沐浴", "浴室"], version: 1, orgId: "org-001",
        sopContent: null, supervisionContent: null, reportContent: null,
        sopSource: "manual", sopVersion: 1, sopHistory: [{ version: 1, date: "2026-05-20", summary: "初始版本" }],
        supervisionSource: "ai_generated", supervisionVersion: 0, supervisionHistory: [],
        reportSource: "ai_generated", reportVersion: 0, reportHistory: [],
      },
      {
        id: "sop-service-003", name: "探访关爱SOP", type: "service", description: "上门探访关爱服务标准流程", keywords: ["探访", "关爱", "看望", "慰问", "探望"], version: 1, orgId: "org-001",
        sopContent: null, supervisionContent: null, reportContent: null,
        sopSource: "manual", sopVersion: 1, sopHistory: [{ version: 1, date: "2026-05-20", summary: "初始版本" }],
        supervisionSource: "ai_generated", supervisionVersion: 0, supervisionHistory: [],
        reportSource: "ai_generated", reportVersion: 0, reportHistory: [],
      },
      {
        id: "sop-service-004", name: "健康监测SOP", type: "service", description: "健康监测服务标准流程", keywords: ["健康", "监测", "血压", "血糖", "体温", "心率", "体检"], version: 1, orgId: "org-001",
        sopContent: null, supervisionContent: null, reportContent: null,
        sopSource: "manual", sopVersion: 1, sopHistory: [{ version: 1, date: "2026-05-20", summary: "初始版本" }],
        supervisionSource: "ai_generated", supervisionVersion: 0, supervisionHistory: [],
        reportSource: "ai_generated", reportVersion: 0, reportHistory: [],
      },
      {
        id: "sop-service-005", name: "助洁服务SOP", type: "service", description: "上门助洁服务标准流程", keywords: ["助洁", "清洁", "打扫", "卫生", "整理"], version: 1, orgId: "org-001",
        sopContent: null, supervisionContent: null, reportContent: null,
        sopSource: "manual", sopVersion: 1, sopHistory: [{ version: 1, date: "2026-05-20", summary: "初始版本" }],
        supervisionSource: "ai_generated", supervisionVersion: 0, supervisionHistory: [],
        reportSource: "ai_generated", reportVersion: 0, reportHistory: [],
      },
      {
        id: "sop-service-006", name: "康复训练SOP", type: "service", description: "康复训练服务标准流程", keywords: ["康复", "训练", "锻炼", "运动", "理疗"], version: 1, orgId: "org-001",
        sopContent: null, supervisionContent: null, reportContent: null,
        sopSource: "manual", sopVersion: 1, sopHistory: [{ version: 1, date: "2026-05-20", summary: "初始版本" }],
        supervisionSource: "ai_generated", supervisionVersion: 0, supervisionHistory: [],
        reportSource: "ai_generated", reportVersion: 0, reportHistory: [],
      },
    ],
  });

  await prisma.sopStep.createMany({
    data: [
      // General SOP steps
      { id: "step-g-001", sopId: "sop-general-001", sortOrder: 1, name: "问候确认身份", description: "到达后先自报姓名和机构，确认服务对象身份，出示工牌", required: true },
      { id: "step-g-002", sopId: "sop-general-001", sortOrder: 2, name: "询问身体状况", description: "询问血压、疼痛、睡眠等基本身体状况", required: true },
      { id: "step-g-003", sopId: "sop-general-001", sortOrder: 3, name: "确认用药情况", description: "了解是否按时服药，有无漏服或不良反应", required: true },
      { id: "step-g-004", sopId: "sop-general-001", sortOrder: 4, name: "评估生活状态", description: "了解饮食、活动、自理能力等日常生活状态", required: true },
      { id: "step-g-005", sopId: "sop-general-001", sortOrder: 5, name: "安全检查", description: "检查居家环境安全，评估跌倒风险等", required: true },
      { id: "step-g-006", sopId: "sop-general-001", sortOrder: 6, name: "心理关怀", description: "关注情绪状态，耐心倾听，提供心理支持", required: true },
      { id: "step-g-007", sopId: "sop-general-001", sortOrder: 7, name: "服务总结和告别", description: "总结本次服务内容，确认下次服务时间，礼貌告别", required: true },

      // 助餐 steps
      { id: "step-s1-001", sopId: "sop-service-001", sortOrder: 1, name: "到达确认", description: "确认身份，了解今日饮食需求和禁忌，检查厨房卫生", required: true },
      { id: "step-s1-002", sopId: "sop-service-001", sortOrder: 2, name: "食材检查", description: "检查食材新鲜度和保质期，确认无过敏食材，按低盐低糖低油标准准备", required: true },
      { id: "step-s1-003", sopId: "sop-service-001", sortOrder: 3, name: "烹饪加热", description: "按服务对象口味烹饪，注意食物软硬度适合咀嚼，确保温度适宜", required: true },
      { id: "step-s1-004", sopId: "sop-service-001", sortOrder: 4, name: "摆餐与陪餐", description: "摆放餐具，协助就座，陪同用餐，观察进食量和咀嚼吞咽情况", required: true },
      { id: "step-s1-005", sopId: "sop-service-001", sortOrder: 5, name: "餐后清理", description: "收拾餐桌，清洗餐具，整理厨房，确认服务对象餐后状态", required: true },
      { id: "step-s1-006", sopId: "sop-service-001", sortOrder: 6, name: "记录", description: "记录进食量、食欲情况、特殊观察，提醒餐后服药", required: true },

      // 助浴 steps
      { id: "step-s2-001", sopId: "sop-service-002", sortOrder: 1, name: "安全评估", description: "评估当日身体状况是否适合洗浴，检查浴室防滑设施和扶手", required: true },
      { id: "step-s2-002", sopId: "sop-service-002", sortOrder: 2, name: "水温确认", description: "调节水温至38-40℃，请服务对象确认温度舒适，准备好干净衣物", required: true },
      { id: "step-s2-003", sopId: "sop-service-002", sortOrder: 3, name: "协助沐浴", description: "全程陪护防止滑倒，保护隐私和尊严，根据需要协助清洗", required: true },
      { id: "step-s2-004", sopId: "sop-service-002", sortOrder: 4, name: "皮肤检查", description: "观察皮肤状况，注意红肿、破损、压疮等异常", required: true },
      { id: "step-s2-005", sopId: "sop-service-002", sortOrder: 5, name: "记录", description: "记录洗浴时长、皮肤状况、服务对象反馈，整理浴室", required: true },

      // 探访关爱 steps
      { id: "step-s3-001", sopId: "sop-service-003", sortOrder: 1, name: "确认身份", description: "到达后先自报姓名和机构，确认服务对象身份，出示工牌", required: true },
      { id: "step-s3-002", sopId: "sop-service-003", sortOrder: 2, name: "健康状况询问", description: "询问近期身体状况：睡眠、食欲、疼痛、服药情况", required: true },
      { id: "step-s3-003", sopId: "sop-service-003", sortOrder: 3, name: "生活照料检查", description: "检查居家环境安全，食物是否充足，水电煤气是否正常", required: true },
      { id: "step-s3-004", sopId: "sop-service-003", sortOrder: 4, name: "心理关怀", description: "关注情绪状态，耐心倾听，注意孤独、焦虑、抑郁等情绪", required: true },
      { id: "step-s3-005", sopId: "sop-service-003", sortOrder: 5, name: "服务记录填写", description: "总结服务发现，记录健康观察和注意事项，确认下次服务时间", required: true },

      // 健康监测 steps
      { id: "step-s4-001", sopId: "sop-service-004", sortOrder: 1, name: "问候与身份确认", description: "到达后问候并确认身份，说明本次监测内容", required: true },
      { id: "step-s4-002", sopId: "sop-service-004", sortOrder: 2, name: "健康状况询问", description: "询问近期身体感受、睡眠、饮食、排便等情况", required: true },
      { id: "step-s4-003", sopId: "sop-service-004", sortOrder: 3, name: "生命体征检查", description: "测量血压、心率、血糖等指标，如有异常及时记录", required: true },
      { id: "step-s4-004", sopId: "sop-service-004", sortOrder: 4, name: "服务总结", description: "汇总监测结果，给出简单建议，询问服务满意度", required: true },

      // 助洁 steps
      { id: "step-s5-001", sopId: "sop-service-005", sortOrder: 1, name: "到达确认", description: "确认清洁区域和重点需求，了解物品摆放习惯", required: true },
      { id: "step-s5-002", sopId: "sop-service-005", sortOrder: 2, name: "清洁区域确认", description: "与服务对象确认需要清洁的房间和区域，注意贵重物品", required: true },
      { id: "step-s5-003", sopId: "sop-service-005", sortOrder: 3, name: "清洁执行", description: "按先卧室后客厅、先高后低的顺序清洁", required: true },
      { id: "step-s5-004", sopId: "sop-service-005", sortOrder: 4, name: "物品归位", description: "清洁后物品放回原位，垃圾分类处理", required: true },
      { id: "step-s5-005", sopId: "sop-service-005", sortOrder: 5, name: "服务总结", description: "请服务对象检查清洁效果，记录服务内容", required: true },

      // 康复训练 steps
      { id: "step-s6-001", sopId: "sop-service-006", sortOrder: 1, name: "评估", description: "评估当日身体状况和疼痛等级，确认是否适合训练", required: true },
      { id: "step-s6-002", sopId: "sop-service-006", sortOrder: 2, name: "热身", description: "指导5-10分钟轻度活动，活动关节，预防运动损伤", required: true },
      { id: "step-s6-003", sopId: "sop-service-006", sortOrder: 3, name: "训练执行", description: "按康复计划执行训练项目，注意动作规范，关注疼痛反馈", required: true },
      { id: "step-s6-004", sopId: "sop-service-006", sortOrder: 4, name: "放松", description: "训练后拉伸和放松，按摩疲劳部位，确认无不适", required: true },
      { id: "step-s6-005", sopId: "sop-service-006", sortOrder: 5, name: "记录", description: "记录训练内容、完成情况、疼痛等级变化和反馈", required: true },
    ],
  });

  console.log("[seed] Seeded 7 SOPs with steps");

  // ── Service Records (with computed service items) ──
  const record1Items = sopBusinessItems("r1", "助餐");
  record1Items[3].status = "abnormal";
  record1Items[3].transcript = "阿姨说今天早上忘记吃降压药了。";
  (record1Items[3] as any).abnormalReason = "AI 检测到服务对象未按时服药，属于用药风险。根据 SOP 要求，应提醒服务对象立即补服并记录。";
  record1Items[14].status = "skipped";
  (record1Items[14] as any).abnormalReason = "录音中未检测到通风检查相关对话。";
  const record1Process = sopProcessItems("r1", "王丽", "阿姨", ["completed", "completed", "abnormal"]);
  (record1Process[2] as any).abnormalReason = "AI 检测到服务人员在服务期间接听私人电话。";

  const record3Items = sopBusinessItems("r3", "探访关爱");
  record3Items[5].status = "abnormal";
  (record3Items[5] as any).abnormalReason = "AI 检测到服务对象饮食异常。";
  record3Items[5].transcript = "奶奶说昨天没怎么吃东西。";
  record3Items[10].status = "skipped";
  (record3Items[10] as any).abnormalReason = "录音中未检测到安全检查相关内容。";
  const record3Process = sopProcessItems("r3", "李芳", "奶奶", ["abnormal", "completed", "completed"]);

  await prisma.serviceRecord.createMany({
    data: [
      {
        id: "record-001", serviceDate: "2026-05-12", startTime: "09:31", endTime: "10:22", durationMinutes: 51,
        socialWorkerId: "sw-001", socialWorkerName: "王建国", serviceObjectId: "object-001", serviceObjectName: "陈阿姨",
        familyContactIds: ["family-001"], badgeId: "badge-021", smartBadgeId: "badge-021", serviceProject: "助餐",
        assignmentConfidence: 0.72, reviewStatus: "needs_review", exportStatus: "exportable",
        locationEvidence: { startPoint: { latitude: 31.292, longitude: 121.515, capturedAt: "2026-05-12T09:31:00+08:00", accuracyMeters: 18 }, endPoint: { latitude: 31.292, longitude: 121.515, capturedAt: "2026-05-12T10:22:00+08:00", accuracyMeters: 16 }, addressMatched: true },
        serviceExceptions: [{ id: "service-exception-001", type: "service_incomplete", title: "服务项待补充", description: "结算字段缺失，导出前需补齐。", status: "open" }],
        serviceItems: [...record1Items, ...record1Process],
        exceptionTags: ["信息不完整"], missingFields: ["结算字段"],
        audioAssetId: "audio-001", transcriptId: "transcript-001",
        structuredSummary: "完成助餐服务，服务对象状态稳定。", generatedSummary: "完成助餐服务，服务对象状态稳定。",
        exportHistory: [{ id: "export-001", exportedAt: "2026-05-13T17:10:00+08:00", operatorName: "站点管理员", fileVersion: "v1", filterSummary: "助餐记录", exceptionFlags: ["信息不完整"], unresolvedItems: ["结算字段"] }],
      },
      {
        id: "record-002", serviceDate: "2026-05-13", startTime: "14:10", endTime: "15:05", durationMinutes: 55,
        socialWorkerId: "sw-002", socialWorkerName: "张敏", serviceObjectId: "object-002", serviceObjectName: "李爷爷",
        familyContactIds: [], badgeId: "badge-031", smartBadgeId: "badge-031", serviceProject: "助浴",
        assignmentConfidence: 0.95, reviewStatus: "confirmed", exportStatus: "exported",
        locationEvidence: { startPoint: { latitude: 31.288, longitude: 121.525, capturedAt: "2026-05-13T14:10:00+08:00", accuracyMeters: 12 }, endPoint: { latitude: 31.288, longitude: 121.525, capturedAt: "2026-05-13T15:05:00+08:00", accuracyMeters: 10 }, addressMatched: true },
        serviceExceptions: [],
        serviceItems: [...sopBusinessItems("r2", "助浴"), ...sopProcessItems("r2", "张敏", "爷爷")],
        exceptionTags: [], missingFields: [],
        audioAssetId: "audio-002", transcriptId: "transcript-002",
        structuredSummary: "完成助浴服务，老人状态良好。",
        exportHistory: [{ id: "export-002", exportedAt: "2026-05-14T09:00:00+08:00", operatorName: "站点管理员", fileVersion: "v1", filterSummary: "助浴记录" }],
      },
      {
        id: "record-003", serviceDate: "2026-05-14", startTime: "09:00", endTime: "09:45", durationMinutes: 45,
        socialWorkerId: "sw-001", socialWorkerName: "王建国", serviceObjectId: "object-003", serviceObjectName: "王奶奶",
        familyContactIds: ["family-003"], badgeId: "badge-021", smartBadgeId: "badge-021", serviceProject: "探访关爱",
        assignmentConfidence: 0.55, reviewStatus: "info_incomplete", exportStatus: "not_ready",
        locationEvidence: { startPoint: { latitude: 31.295, longitude: 121.510, capturedAt: "2026-05-14T09:00:00+08:00", accuracyMeters: 25 }, endPoint: { latitude: 31.295, longitude: 121.510, capturedAt: "2026-05-14T09:45:00+08:00", accuracyMeters: 20 }, addressMatched: false },
        serviceExceptions: [{ id: "exception-003", type: "late_arrival", title: "迟到", description: "到达时间比预约晚15分钟", status: "resolved", resolvedAt: "2026-05-14T10:00:00+08:00" }],
        serviceItems: [...record3Items, ...record3Process],
        exceptionTags: ["迟到"], missingFields: ["服务项目确认", "结算字段"],
        audioAssetId: "audio-003", transcriptId: "transcript-003",
        structuredSummary: "完成探访关爱服务。",
        exportHistory: [],
      },
    ],
  });

  // ── Audio Assets ──
  await prisma.audioAsset.createMany({
    data: [
      { id: "audio-001", recordId: "record-001", playbackUrl: "/mock-audio.wav", durationSeconds: 3060, capturedByBadgeId: "badge-021", uploadedAt: "2026-05-12T10:30:00+08:00", retentionLabel: "内部证据保留 180 天" },
      { id: "audio-002", recordId: "record-002", playbackUrl: "/mock-audio.wav", durationSeconds: 3300, capturedByBadgeId: "badge-031", uploadedAt: "2026-05-13T15:10:00+08:00", retentionLabel: "内部证据保留 180 天" },
      { id: "audio-003", recordId: "record-003", playbackUrl: "/mock-audio.wav", durationSeconds: 2700, capturedByBadgeId: "badge-021", uploadedAt: "2026-05-14T09:50:00+08:00", retentionLabel: "内部证据保留 180 天" },
    ],
  });

  // ── Transcripts ──
  await prisma.transcript.createMany({
    data: [
      {
        id: "transcript-001", recordId: "record-001", language: "zh-CN",
        text: "服务人员完成助餐服务，并确认下次服务时间。", confidence: 0.91,
        segments: [
          { startSecond: 0, endSecond: 8, speaker: "social_worker", text: "阿姨您好，我是红培社区站的服务人员王丽，今天由我为您提供助餐服务。" },
          { startSecond: 9, endSecond: 14, speaker: "service_object", text: "小王啊，快进来坐，今天又麻烦你了。" },
          { startSecond: 15, endSecond: 22, speaker: "social_worker", text: "不麻烦的阿姨。今天身体怎么样？精神好不好？" },
          { startSecond: 23, endSecond: 30, speaker: "service_object", text: "今天还行，就是昨晚没睡好，有点累。" },
          { startSecond: 39, endSecond: 48, speaker: "social_worker", text: "阿姨，今天早上的药按时吃了吗？" },
          { startSecond: 49, endSecond: 55, speaker: "service_object", text: "哎呀，今天早上忘记吃降压药了，你提醒得好。" },
          { startSecond: 56, endSecond: 65, speaker: "social_worker", text: "没关系阿姨，现在补吃也来得及。我帮您把药拿过来。" },
          { startSecond: 120, endSecond: 130, speaker: "social_worker", text: "阿姨，今天给您准备了清蒸鱼和青菜豆腐汤，都是清淡的。" },
          { startSecond: 131, endSecond: 138, speaker: "service_object", text: "看着就不错，闻着也香。你做饭越来越好了。" },
          { startSecond: 300, endSecond: 310, speaker: "social_worker", text: "阿姨今天吃了大半碗饭，胃口不错啊。" },
          { startSecond: 311, endSecond: 318, speaker: "service_object", text: "今天的鱼做得好吃，比上次那个红烧的好。" },
          { startSecond: 319, endSecond: 328, speaker: "social_worker", text: "那下次我还给您做清蒸的。阿姨，现在我们活动活动吧？" },
          { startSecond: 400, endSecond: 410, speaker: "social_worker", text: "阿姨今天走路比上次稳一些了，恢复得不错。" },
          { startSecond: 600, endSecond: 612, speaker: "social_worker", text: "阿姨，今天的服务就到这里了。后天周三我再来，还是上午这个时间。" },
          { startSecond: 613, endSecond: 620, speaker: "service_object", text: "好的好的，辛苦你了小王。路上注意安全。" },
          { startSecond: 621, endSecond: 625, speaker: "social_worker", text: "阿姨再见，您注意休息。门窗我帮您锁好了。" },
        ],
      },
      {
        id: "transcript-002", recordId: "record-002", language: "zh-CN",
        text: "完成助浴服务，老人状态良好。", confidence: 0.93,
        segments: [
          { startSecond: 0, endSecond: 8, speaker: "social_worker", text: "李爷爷您好，我是张敏，今天来给您助浴。" },
          { startSecond: 9, endSecond: 15, speaker: "service_object", text: "小张来了啊，今天天气不错，正好洗个澡。" },
          { startSecond: 16, endSecond: 24, speaker: "social_worker", text: "是啊爷爷。我先量一下血压，看看适不适合洗澡。" },
          { startSecond: 25, endSecond: 32, speaker: "social_worker", text: "血压120/80，正常，可以洗。我去检查一下浴室。" },
          { startSecond: 60, endSecond: 68, speaker: "social_worker", text: "防滑垫铺好了，扶手很牢固。水温调到38度了，您试试。" },
          { startSecond: 69, endSecond: 74, speaker: "service_object", text: "嗯，温度刚好，不烫。" },
          { startSecond: 120, endSecond: 128, speaker: "social_worker", text: "爷爷我帮您搓一下后背，力度可以吧？" },
          { startSecond: 129, endSecond: 133, speaker: "service_object", text: "可以，再重一点也行。" },
          { startSecond: 200, endSecond: 208, speaker: "social_worker", text: "好了爷爷，冲干净了。我帮您擦干，先穿衣服别着凉。" },
          { startSecond: 209, endSecond: 215, speaker: "service_object", text: "洗完舒服多了，谢谢你小张。" },
          { startSecond: 300, endSecond: 310, speaker: "social_worker", text: "爷爷洗完精神不错，没有头晕。浴室我收拾好了。" },
          { startSecond: 311, endSecond: 318, speaker: "service_object", text: "不晕，就是有点饿了。" },
          { startSecond: 319, endSecond: 328, speaker: "social_worker", text: "那您赶紧吃点东西。今天的助浴服务结束了，您状态很好。下次我周四再来。" },
          { startSecond: 329, endSecond: 334, speaker: "service_object", text: "好的，辛苦你了小张。" },
        ],
      },
      {
        id: "transcript-003", recordId: "record-003", language: "zh-CN",
        text: "完成探访关爱服务。", confidence: 0.85,
        segments: [
          { startSecond: 0, endSecond: 6, speaker: "social_worker", text: "王奶奶您好，我是李芳，今天来看您了。" },
          { startSecond: 7, endSecond: 14, speaker: "service_object", text: "李芳来了啊，快进来坐，好久没来了。" },
          { startSecond: 15, endSecond: 22, speaker: "social_worker", text: "奶奶最近身体怎么样？有没有哪里不舒服？" },
          { startSecond: 23, endSecond: 32, speaker: "service_object", text: "还行吧，就是最近胃口不太好，吃不下东西。" },
          { startSecond: 33, endSecond: 40, speaker: "social_worker", text: "从什么时候开始的？有没有去医院看看？" },
          { startSecond: 41, endSecond: 50, speaker: "service_object", text: "有两三天了吧，没去医院，觉得没什么大事。" },
          { startSecond: 51, endSecond: 60, speaker: "social_worker", text: "奶奶，连续几天吃不下东西还是要注意的。我帮您跟家属说一下，建议去医院检查一下。" },
          { startSecond: 61, endSecond: 68, speaker: "service_object", text: "那你帮我跟我孙女说一声吧，她比较操心。" },
          { startSecond: 69, endSecond: 76, speaker: "social_worker", text: "好的奶奶，我一会儿就通知她。药按时吃了吗？" },
          { startSecond: 77, endSecond: 82, speaker: "service_object", text: "降压药和钙片都吃了，这个没忘。" },
          { startSecond: 120, endSecond: 128, speaker: "social_worker", text: "奶奶我们在客厅走两圈，活动活动腿脚。" },
          { startSecond: 129, endSecond: 135, speaker: "service_object", text: "好，走走也好。" },
          { startSecond: 200, endSecond: 210, speaker: "social_worker", text: "奶奶今天走路挺稳的。您孙女最近有没有来看您？" },
          { startSecond: 211, endSecond: 220, speaker: "service_object", text: "昨天给我打电话了，说周末来看我。孙女还是很孝顺的。" },
          { startSecond: 221, endSecond: 230, speaker: "social_worker", text: "那太好了。奶奶，今天的探访就到这里了。您注意休息，饮食方面实在吃不下就去医院看看。" },
          { startSecond: 231, endSecond: 238, speaker: "service_object", text: "好的好的，谢谢你啊小李。下次再来看我。" },
          { startSecond: 239, endSecond: 244, speaker: "social_worker", text: "奶奶再见，有什么事随时打电话。" },
        ],
      },
    ],
  });

  // ── Home Summary ──
  await prisma.homeSummary.create({
    data: {
      id: "current",
      summaryDate: "2026-05-14",
      totalScheduledServices: 18,
      unassignedServices: 2,
      activeSocialWorkers: 7,
      onlineBadges: 6,
      recordsNeedReview: 3,
      exportableServiceRecords: 12,
      highlights: [
        { id: "h1", type: "schedule_gap", title: "今日还有 2 个服务对象未排期", description: "请进入服务排期补齐服务人员和时间窗。", severity: "warning", relatedEntityType: "service_schedule", relatedEntityId: "schedule-002" },
        { id: "h2", type: "badge_issue", title: "1 个智能工牌同步延迟", description: "FW-026 最近同步超过 12 小时。", severity: "warning", relatedEntityType: "badge", relatedEntityId: "badge-026" },
        { id: "h3", type: "export_ready", title: "12 条服务记录可导出", description: "包含 1 条带异常标记记录。", severity: "info", relatedEntityType: "service_record", relatedEntityId: "record-001" },
        { id: "h4", type: "record_review", title: "3 条服务记录待复核", description: "优先处理助餐和陪诊记录。", severity: "warning", relatedEntityType: "service_record", relatedEntityId: "record-001" },
      ],
      activities: [
        { id: "a1", occurredAt: "2026-05-13T09:10:00+08:00", title: "今日还有 6 个服务对象未排期。", relatedEntityType: "service_schedule", relatedEntityId: "schedule-002" },
        { id: "a2", occurredAt: "2026-05-13T09:12:00+08:00", title: "智能工牌 FW-021 已接入站点，今日可用。", relatedEntityType: "badge", relatedEntityId: "badge-021" },
        { id: "a3", occurredAt: "2026-05-13T09:14:00+08:00", title: "4 条服务记录信息不完整，已放入服务记录。", relatedEntityType: "service_record", relatedEntityId: "record-001" },
        { id: "a4", occurredAt: "2026-05-13T09:15:00+08:00", title: "查一下今天谁还没排期。", description: "助手已把排期缺口整理为推荐动作。", relatedEntityType: "service_schedule", relatedEntityId: "schedule-002" },
        { id: "a5", occurredAt: "2026-05-13T09:17:00+08:00", title: "陈阿姨近期需要用药提醒。", description: "服务对象风险已进入首页重点关注。", relatedEntityType: "service_object", relatedEntityId: "object-001" },
      ],
      recommendedActions: [
        { id: "ra1", label: "去补排今日缺口", targetWorkspace: "service_schedules", relatedEntityId: "schedule-002" },
        { id: "ra2", label: "复核服务记录", targetWorkspace: "service_records", relatedEntityId: "record-001" },
        { id: "ra3", label: "查看设备同步", targetWorkspace: "smart_badges", relatedEntityId: "badge-026" },
      ],
      permissionState: "full",
    },
  });

  console.log("[seed] Demo data seeded successfully.");

  // ── Default Users ──
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const hash = (pw: string) => bcrypt.hashSync(pw, 10);
    await prisma.user.createMany({
      data: [
        { id: "user-admin-001", username: "admin", passwordHash: hash("admin123"), name: "系统管理员", role: "org_admin", orgId: "org-001", siteIds: ["site-001"], phone: "13800000000" },
        { id: "user-op-001", username: "operator", passwordHash: hash("oper123"), name: "站点运营员", role: "site_operator", orgId: "org-001", siteIds: ["site-001"], phone: "13800000001" },
        { id: "user-sup-001", username: "supervisor", passwordHash: hash("super123"), name: "服务主管", role: "org_admin", orgId: "org-001", siteIds: ["site-001"], phone: "13800000002" },
      ],
    });
    console.log("[seed] Seeded 3 default users");
  }

  // ── Default Sites ──
  const siteCount = await prisma.site.count();
  if (siteCount === 0) {
    await prisma.site.createMany({
      data: [
        { id: "site-001", name: "翠苑站", address: "杭州市西湖区翠苑街道翠苑一区", contactName: "张站长", contactPhone: "13900001001", orgId: "org-001" },
        { id: "site-002", name: "三墩站", address: "杭州市西湖区三墩镇振华路", contactName: "李站长", contactPhone: "13900001002", orgId: "org-001" },
        { id: "site-003", name: "古荡站", address: "杭州市西湖区古荡街道古荡新村", contactName: "王站长", contactPhone: "13900001003", orgId: "org-001" },
        { id: "site-004", name: "文新站", address: "杭州市西湖区文新街道文鼎苑", contactName: "赵站长", contactPhone: "13900001004", orgId: "org-001" },
      ],
    });
    // Assign operator to site-001
    await prisma.siteUser.create({ data: { siteId: "site-001", userId: "user-op-001" } });
    console.log("[seed] Seeded 4 sites + 1 site-user assignment");
  }
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
