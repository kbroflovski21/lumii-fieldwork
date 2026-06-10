import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./careworker.css";
import { useBadge as useBadgeHook, hashNameToColor } from "./useBadge";
import type { BadgeInfo, ServicePhase as BadgeServicePhase } from "./useBadge";
import {
  CalendarToggle,
  DayView,
  MonthView,
  getQuickLabel,
  getHeaderTitle,
  navigateCalendar,
} from "./CalendarViews";
import type { CalendarViewMode } from "./CalendarViews";
import { HardwareSimulator } from "./HardwareSimulator";

/* ─── Types ─── */

type TaskStatus = "completed" | "abnormal" | "pending" | "in_progress";
type Tab = "schedule" | "service" | "history" | "learn";
type BadgeState = "disconnected" | "connected_idle" | "connected_recording";

interface SopCheck {
  step: string;
  passed: boolean;
}

interface ServiceReport {
  summary: string;
  sopCheck: SopCheck[];
  concerns: string[];
  mood: string;
  healthObservations: string[];
  satisfaction: string;
}

export interface ServiceTask {
  id: string;
  serviceType: string;
  recipientName: string;
  workerName: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  locationShort: string;
  status: TaskStatus;
  source: string;
  notes: string;
  serviceContext?: ServiceContext;
  report?: ServiceReport;
  serviceObjectId?: string;
  serviceObjectContext?: any;
  sopLinks?: Array<{ sopId: string; sopName: string }>;
  /* New fields for schedule-driven flow */
  plannedItems?: PlannedServiceItem[];
  categoryName?: string;
  estimatedMinutes?: number;
}

interface ServiceContext {
  dietary?: string;
  lastNote?: string;
  familyConcern?: string;
}

interface PlannedServiceItem {
  standardItemId: string;
  name: string;
  categoryName: string;
  referenceMinutes: number;
  checked: boolean;
}

interface SopFolder {
  id: string;
  name: string;
  type: "general" | "service";
  version: number;
  updatedAt: string;
  content: string;
}

interface DemoWorker {
  id: string;
  name: string;
  phone: string;
  site: string;
}

interface BadgeEvent {
  type: "badge_state" | "badge_heartbeat" | "badge_button_press";
  state: BadgeState;
  timestamp: number;
  recordingStartTime?: number;
}

/* ─── Mock Data ─── */

const SITE_NAME_MAP: Record<string, string> = {
  "site-001": "翠苑站",
  "site-002": "三墩站",
  "site-003": "古荡站",
  "site-004": "文新站",
};

const DEMO_WORKERS: DemoWorker[] = [
  { id: "w1", name: "王建国", phone: "138****1234", site: "红培社区站" },
  { id: "w2", name: "张敏", phone: "138****5678", site: "红培社区站" },
];

const TODAY_STR = new Date().toISOString().slice(0, 10);

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
function dayOfWeek(dateStr: string): string {
  return DAY_NAMES[new Date(dateStr).getDay()];
}

/* ─── Mock Schedule Data for 今日排班 ─── */

const MOCK_SCHEDULE_ITEMS: Record<string, PlannedServiceItem[]> = {
  "王淑珍": [
    { standardItemId: "si-1", name: "整理床单位", categoryName: "生活照料", referenceMinutes: 5, checked: true },
    { standardItemId: "si-2", name: "面部清洁", categoryName: "生活照料", referenceMinutes: 5, checked: true },
    { standardItemId: "si-3", name: "协助进食/水", categoryName: "生活照料", referenceMinutes: 20, checked: true },
  ],
  "陈国强": [
    { standardItemId: "si-4", name: "肢体被动运动", categoryName: "康复训练", referenceMinutes: 30, checked: true },
    { standardItemId: "si-5", name: "站立平衡训练", categoryName: "康复训练", referenceMinutes: 30, checked: true },
  ],
  "李德明": [
    { standardItemId: "si-6", name: "整理床单位", categoryName: "生活照料", referenceMinutes: 5, checked: true },
    { standardItemId: "si-7", name: "面部清洁", categoryName: "生活照料", referenceMinutes: 5, checked: true },
    { standardItemId: "si-8", name: "口腔清洁/护理", categoryName: "生活照料", referenceMinutes: 15, checked: true },
    { standardItemId: "si-9", name: "协助进食/水", categoryName: "生活照料", referenceMinutes: 20, checked: true },
  ],
};

/* Extra items available in service plan but not pre-selected */
const EXTRA_PLAN_ITEMS: PlannedServiceItem[] = [
  { standardItemId: "si-10", name: "协助更衣", categoryName: "生活照料", referenceMinutes: 10, checked: false },
  { standardItemId: "si-11", name: "温水擦浴", categoryName: "生活照料", referenceMinutes: 15, checked: false },
  { standardItemId: "si-12", name: "排泄护理", categoryName: "生活照料", referenceMinutes: 15, checked: false },
  { standardItemId: "si-13", name: "生命体征监测", categoryName: "医疗护理", referenceMinutes: 10, checked: false },
];

/* Schedule-based tasks for today (mock) */
function buildTodaySchedules(workerName: string): ServiceTask[] {
  return [
    {
      id: "sched-1",
      serviceType: "生活照料",
      recipientName: "王淑珍",
      workerName,
      date: TODAY_STR,
      dayOfWeek: dayOfWeek(TODAY_STR),
      startTime: "09:00",
      endTime: "10:30",
      location: "杭州市余杭区阳光路120号3幢201",
      locationShort: "阳光路120号",
      status: "pending",
      source: "周期计划",
      notes: "",
      plannedItems: MOCK_SCHEDULE_ITEMS["王淑珍"],
      categoryName: "生活照料",
      estimatedMinutes: 90,
      serviceContext: { dietary: "低盐低糖", lastNote: "食欲正常", familyConcern: "请留意是否按时吃药" },
    },
    {
      id: "sched-2",
      serviceType: "康复训练",
      recipientName: "陈国强",
      workerName,
      date: TODAY_STR,
      dayOfWeek: dayOfWeek(TODAY_STR),
      startTime: "11:00",
      endTime: "12:00",
      location: "杭州市余杭区阳光路200号5幢102",
      locationShort: "阳光路200号",
      status: "pending",
      source: "周期计划",
      notes: "",
      plannedItems: MOCK_SCHEDULE_ITEMS["陈国强"],
      categoryName: "康复训练",
      estimatedMinutes: 60,
      serviceContext: { lastNote: "左膝关节有轻微疼痛", familyConcern: "注意运动强度" },
    },
    {
      id: "sched-3",
      serviceType: "生活照料",
      recipientName: "李德明",
      workerName,
      date: TODAY_STR,
      dayOfWeek: dayOfWeek(TODAY_STR),
      startTime: "14:00",
      endTime: "15:30",
      location: "杭州市余杭区阳光路88号2幢501",
      locationShort: "阳光路88号",
      status: "pending",
      source: "周期计划",
      notes: "",
      plannedItems: MOCK_SCHEDULE_ITEMS["李德明"],
      categoryName: "生活照料",
      estimatedMinutes: 90,
      serviceContext: { lastNote: "血压偏高(152/95)，睡眠质量下降", familyConcern: "注意血压变化" },
    },
  ];
}

/* Schedule data for the week (dots for other days) */
function buildWeekScheduleDates(): Set<string> {
  const s = new Set<string>();
  s.add(TODAY_STR);
  // Mon/Wed/Fri typically have schedules
  const today = new Date();
  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dow = d.getDay();
    if (dow === 1 || dow === 3 || dow === 5) {
      s.add(d.toISOString().slice(0, 10));
    }
  }
  return s;
}

/* ─── Mock completed history ─── */
interface HistoryRecord {
  id: string;
  elderName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  itemsCount: number;
  evidenceScore: number;
  status: "completed" | "abnormal";
  serviceType: string;
}

function buildHistoryRecords(): HistoryRecord[] {
  return [
    { id: "h1", elderName: "王淑珍", date: dateOffset(-1), startTime: "09:05", endTime: "10:25", durationMinutes: 80, itemsCount: 3, evidenceScore: 6, status: "completed", serviceType: "生活照料" },
    { id: "h2", elderName: "陈国强", date: dateOffset(-1), startTime: "11:10", endTime: "12:05", durationMinutes: 55, itemsCount: 2, evidenceScore: 5, status: "completed", serviceType: "康复训练" },
    { id: "h3", elderName: "李德明", date: dateOffset(-1), startTime: "14:05", endTime: "15:30", durationMinutes: 85, itemsCount: 4, evidenceScore: 6, status: "completed", serviceType: "生活照料" },
    { id: "h4", elderName: "王淑珍", date: dateOffset(-3), startTime: "09:00", endTime: "10:20", durationMinutes: 80, itemsCount: 3, evidenceScore: 6, status: "completed", serviceType: "生活照料" },
    { id: "h5", elderName: "陈国强", date: dateOffset(-3), startTime: "11:00", endTime: "11:50", durationMinutes: 50, itemsCount: 2, evidenceScore: 4, status: "abnormal", serviceType: "康复训练" },
    { id: "h6", elderName: "李德明", date: dateOffset(-5), startTime: "14:00", endTime: "15:25", durationMinutes: 85, itemsCount: 4, evidenceScore: 6, status: "completed", serviceType: "生活照料" },
    { id: "h7", elderName: "王淑珍", date: dateOffset(-5), startTime: "09:10", endTime: "10:30", durationMinutes: 80, itemsCount: 3, evidenceScore: 5, status: "completed", serviceType: "生活照料" },
  ];
}

const MOCK_SOPS: SopFolder[] = [
  {
    id: "sop1", name: "上门服务通用规范", type: "general", version: 2, updatedAt: "2026-05-10",
    content: `# 上门服务通用规范

## 一、服务前准备

1. **出发前检查**：确认服务工具包完整（工牌、手套、鞋套、消毒用品、服务记录表）。
2. **确认信息**：核对长者姓名、地址、联系方式、特殊注意事项。
3. **着装要求**：统一工装，佩戴工牌，保持整洁得体。

## 二、到达与开场

1. **准时到达**：提前5分钟到达服务地点。
2. **敲门/按铃**：轻敲三下或按铃一次，等待开门，不可大声喊叫。
3. **自我介绍**：出示工牌，确认长者身份。
4. **穿戴用品**：进门换鞋套，必要时戴手套。

## 三、服务过程

1. **沟通态度**：语速适中，音量适当，使用尊称。
2. **隐私保护**：不窥探长者隐私，不拍照录像（除工作需要）。
3. **安全意识**：注意地面湿滑、电器安全、老人跌倒风险。
4. **服务记录**：如实记录服务内容、时间、长者状态。

## 四、服务结束

1. **服务复述**：向长者复述本次完成的服务内容。
2. **满意度询问**：询问服务满意度和改进建议。
3. **物品归位**：确认所有物品归位，垃圾带走。

## 五、禁止行为

- 向长者推销任何商品。
- 私下收取费用或接受贵重礼物。
- 在服务期间使用手机（紧急情况除外）。
- 与长者发生争执。`,
  },
  {
    id: "sop2", name: "安全与应急处理规范", type: "general", version: 1, updatedAt: "2026-05-08",
    content: `# 安全与应急处理规范

## 一、常见应急情况

### 1. 长者跌倒
- 不要急于搬动，先评估意识和伤情。
- 如无明显骨折，协助缓慢起身。
- 如有骨折嫌疑或意识不清，立即拨打120并通知主管。

### 2. 长者突发疾病
- 保持冷静，记录症状（胸痛、呼吸困难、头晕等）。
- 拨打120，同时通知家属和主管。
- 协助长者保持舒适体位。

### 3. 长者情绪激动
- 保持冷静和耐心，不与其争辩。
- 用温和语气安抚。
- 如无法控制，退至安全距离并通知主管。

## 二、安全注意事项

1. **防滑**：注意地面积水，协助老人使用扶手。
2. **防烫**：提供热饮/热食时确认温度适宜。
3. **防电**：不擅自操作不熟悉的电器。
4. **防走失**：服务期间注意门窗状态，认知障碍老人需特别关注。

## 三、报告流程

所有异常情况必须在事发后30分钟内通过系统上报。`,
  },
  {
    id: "sop3", name: "助餐服务 SOP", type: "service", version: 3, updatedAt: "2026-05-12",
    content: `# 助餐服务 SOP

## 服务流程

### 步骤一：到达确认
- 确认长者身份和当日用餐需求。
- 了解饮食禁忌和过敏信息。

### 步骤二：食材检查
- 检查食材新鲜度和保质期。
- 如由平台配送，核对配送清单。

### 步骤三：烹饪/加热
- 按长者口味偏好烹饪。
- 注意食物软硬度（适合老人咀嚼）。
- 控制油盐用量（参考健康档案）。

### 步骤四：摆餐与陪餐
- 餐具消毒，摆放整齐。
- 协助行动不便的老人就座。
- 陪伴用餐，观察进食情况。

### 步骤五：餐后清理
- 收拾餐具，清洗归位。
- 清理餐桌和厨房台面。
- 处理厨余垃圾。

### 步骤六：记录
- 记录用餐量、食欲状况、特殊情况。`,
  },
  {
    id: "sop4", name: "助浴服务 SOP", type: "service", version: 2, updatedAt: "2026-05-11",
    content: `# 助浴服务 SOP

## 服务前评估

1. **身体状况评估**：确认长者当日身体状况适合洗浴。
2. **环境检查**：检查浴室防滑垫、扶手、水温控制设备。
3. **禁忌确认**：饭后1小时内、血压异常、皮肤破损等情况暂缓服务。

## 服务流程

### 步骤一：准备
- 调节室温（24-26度）和水温（38-40度）。
- 准备换洗衣物、毛巾、沐浴用品。
- 确认浴室防滑设施到位。

### 步骤二：协助入浴
- 全程搀扶，确保安全。
- 注意观察皮肤状况（红肿、破损、褥疮）。

### 步骤三：清洗
- 动作轻柔，避免搓伤皮肤。
- 重点清洁皱褶部位。
- 洗浴时间控制在15-20分钟。

### 步骤四：离浴与穿衣
- 协助擦干身体，注意保暖。
- 必要时涂抹护肤品。
- 协助穿衣。

### 步骤五：记录
- 记录洗浴情况、皮肤状况、异常发现。`,
  },
  {
    id: "sop5", name: "常规探访 SOP", type: "service", version: 2, updatedAt: "2026-05-09",
    content: `# 常规探访 SOP

## 探访目的

定期了解长者生活状况、健康变化、心理状态，及时发现风险。

## 服务流程

### 步骤一：问候与身份确认
- 自我介绍，确认长者身份。
- 观察长者精神状态。

### 步骤二：健康状况询问
- 近期饮食、睡眠情况。
- 用药情况（是否按时、有无不适）。
- 身体不适症状。

### 步骤三：生活环境检查
- 居家安全隐患排查（电线、地面、通风）。
- 食品保质期检查。
- 生活用品是否充足。

### 步骤四：心理关怀
- 倾听长者心声。
- 了解社交和活动情况。
- 发现孤独、抑郁倾向及时记录。

### 步骤五：需求收集
- 询问是否有新的服务需求。
- 记录待跟进事项。

### 步骤六：服务总结
- 复述本次探访发现。
- 询问满意度。`,
  },
  {
    id: "sop6", name: "康复训练 SOP", type: "service", version: 1, updatedAt: "2026-05-06",
    content: `# 康复训练 SOP

## 适用对象

术后恢复、中风后遗症、骨关节疾病、长期卧床等需要功能训练的长者。

## 服务流程

### 步骤一：评估
- 确认长者当日身体状况。
- 查看康复计划和上次训练记录。
- 评估疼痛等级（0-10分）。

### 步骤二：热身
- 5分钟轻度关节活动。
- 从远端向近端逐步活动。

### 步骤三：训练执行
- 按康复计划执行训练项目。
- 每个动作示范后再协助完成。
- 训练强度循序渐进，不可过度。
- 全程观察长者面色和反应。

### 步骤四：放松
- 5分钟拉伸放松。
- 必要时冷敷或热敷。

### 步骤五：记录
- 记录训练内容、完成度、疼痛反馈。
- 记录需要调整的训练项目。
- 与长者沟通下次训练安排。`,
  },
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  completed: "已完成",
  abnormal: "异常",
  pending: "待服务",
  in_progress: "进行中",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  completed: "#10B981",
  abnormal: "#EF4444",
  pending: "#F59E0B",
  in_progress: "#3B82F6",
};

/* ─── AI Assistant Mock Data ─── */

interface AiMessage {
  id: number;
  role: "user" | "ai";
  text: string;
}

const AI_KEYWORD_RESPONSES: { keywords: string[]; response: string }[] = [
  { keywords: ["任务", "今天", "安排", "计划"], response: "今天您还有待完成的任务，请注意按时到达长者家中，出发前确认好服务工具包。" },
  { keywords: ["助浴", "洗浴", "水温"], response: "助浴服务的水温建议控制在38-40度，室温24-26度，洗浴时间不超过20分钟。服务前需确认长者当日身体状况适合洗浴。" },
  { keywords: ["紧急", "应急", "跌倒", "突发"], response: "如遇长者突发身体不适，请先保持冷静，评估意识和伤情，必要时拨打120并通知主管。所有异常情况须在30分钟内通过系统上报。" },
  { keywords: ["助餐", "饮食", "做饭", "禁忌"], response: "根据SOP规范，助餐服务需要先确认长者的饮食禁忌和过敏信息，控制油盐用量，观察进食情况并记录用餐量。" },
  { keywords: ["血压", "健康", "监测", "体征"], response: "陈阿姨的上次健康监测记录显示各项指标正常；李大爷血压偏高（152/95mmHg），建议持续关注并提醒按时服药。" },
  { keywords: ["SOP", "规范", "流程", "标准"], response: "所有上门服务需遵循通用规范：出发前检查工具包、着装佩戴工牌、准时到达、保护隐私、如实记录。具体服务项目请参考对应的SOP文档。" },
  { keywords: ["记录", "报告", "反馈", "提交"], response: "好的，我已记录您的反馈，会同步给主管。服务结束后请及时在系统中填写服务报告。" },
];

const AI_DEFAULT_RESPONSE = "您好！我是金色年华AI助手。您可以问我关于今天的任务安排、SOP规范、服务注意事项等问题。";

function getAiResponse(userText: string): string {
  const lower = userText.toLowerCase();
  for (const entry of AI_KEYWORD_RESPONSES) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.response;
    }
  }
  return AI_DEFAULT_RESPONSE;
}

/* ─── Current Service Banner Data ─── */

type ServicePhase = "idle" | "pre" | "active" | "post";

const PRE_SERVICE_MINUTES = 15;
const POST_SERVICE_WINDOW_MS = 30 * 60 * 1000;

const MOCK_CONTEXT: Record<string, { dietary?: string; lastNote?: string; familyConcern?: string }> = {
  "陈阿姨": { dietary: "低盐低糖", lastNote: "上次食欲下降，进食量约六成", familyConcern: "请留意是否按时吃药" },
  "李大爷": { dietary: "低脂", lastNote: "血压偏高(152/95)，睡眠质量下降", familyConcern: "注意血压变化" },
  "张奶奶": { lastNote: "行动较为缓慢，左膝关节有轻微疼痛", familyConcern: "注意防跌倒" },
  "赵叔叔": { lastNote: "轻微孤独感，精神状态一般", familyConcern: "多陪他聊聊天" },
  "刘阿姨": { lastNote: "上次因身体不适中止了助浴服务", familyConcern: "确认身体状况再开始服务" },
  "王奶奶": { lastNote: "皮肤状况良好，喜欢聊天", familyConcern: "注意保暖" },
  "王淑珍": { dietary: "低盐低糖", lastNote: "食欲正常", familyConcern: "请留意是否按时吃药" },
  "陈国强": { lastNote: "左膝关节有轻微疼痛", familyConcern: "注意运动强度" },
  "李德明": { lastNote: "血压偏高(152/95)，睡眠质量下降", familyConcern: "注意血压变化" },
};

const SOP_BRIEF: Record<string, string[]> = {
  "助餐": ["确认禁忌", "食材检查", "备餐", "陪餐", "餐后清理", "记录"],
  "助浴": ["身体评估", "环境检查", "调温", "协助入浴", "清洗", "离浴穿衣", "记录"],
  "常规探访": ["问候确认", "健康询问", "环境检查", "心理关怀", "需求收集", "服务总结"],
  "探访关爱": ["确认身份", "健康询问", "生活照料", "心理关怀", "记录"],
  "康复训练": ["评估", "热身", "训练执行", "放松", "记录"],
  "健康监测": ["问候确认", "健康询问", "体征检查", "总结与满意度"],
  "助洁": ["到达确认", "清洁区域确认", "清洁执行", "物品归位", "服务总结"],
  "生活照料": ["到达确认", "身份确认", "照料服务", "环境整理", "记录"],
};

/* ─── Map Action Sheet Data ─── */

interface MapOption {
  name: string;
  icon: string;
  getUrl: (address: string) => string;
}

const MAP_OPTIONS: MapOption[] = [
  {
    name: "百度地图",
    icon: "BD",
    getUrl: (addr) => `https://api.map.baidu.com/geocoder?address=${encodeURIComponent(addr)}&output=html`,
  },
  {
    name: "高德地图",
    icon: "GD",
    getUrl: (addr) => `https://uri.amap.com/search?keyword=${encodeURIComponent(addr)}`,
  },
  {
    name: "腾讯地图",
    icon: "TX",
    getUrl: (addr) => `https://apis.map.qq.com/uri/v1/search?keyword=${encodeURIComponent(addr)}`,
  },
];

/* ─── Helpers ─── */

function formatDateTitle(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${DAY_NAMES[d.getDay()]}`;
}

function getWeekDates(baseDate: Date): string[] {
  const start = new Date(baseDate);
  const dow = start.getDay();
  // Start from Monday
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  start.setDate(start.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

/* ─── SVG Icons (inline, no deps) ─── */

function IconCalendar({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconBook({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconWrench({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function IconClipboard({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconChevronRightSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

/* ─── Sub-components ─── */

/** Badge status chip in header */
function BadgeChip({ badge }: { badge: BadgeInfo }) {
  const [elapsed, setElapsed] = useState(0);
  const { badgeState, servicePhase, recordingStartTime, recordingEndTime } = badge;

  useEffect(() => {
    if (badgeState !== "connected_recording" || !recordingStartTime) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Date.now() - recordingStartTime);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [badgeState, recordingStartTime]);

  const [postRemaining, setPostRemaining] = useState("");
  useEffect(() => {
    if (servicePhase !== "post_service" || !recordingEndTime) return;
    const tick = () => {
      const left = 30 * 60 * 1000 - (Date.now() - recordingEndTime);
      if (left <= 0) { setPostRemaining(""); return; }
      setPostRemaining(`${Math.ceil(left / 60000)}分`);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [servicePhase, recordingEndTime]);

  let variant: string;
  let label: string;

  if (servicePhase === "pre_service") {
    variant = "pre-service";
    label = "即将服务";
  } else if (servicePhase === "active_service" || badgeState === "connected_recording") {
    variant = "recording";
    label = `录音中 ${formatElapsed(elapsed)}`;
  } else if (servicePhase === "post_service") {
    variant = "post-service";
    label = postRemaining ? `服务后 ${postRemaining}` : "服务后";
  } else if (badgeState === "connected_idle") {
    variant = "idle";
    label = "工牌在线";
  } else {
    variant = "disconnected";
    label = "工牌离线";
  }

  return (
    <span className={`cw-badge-chip cw-badge-chip--${variant}`}>
      <span className="cw-badge-chip__dot" />
      {variant === "recording" ? <span className="cw-timer">{label}</span> : label}
    </span>
  );
}

/** Week calendar strip for schedule tab (Mon-Sun) */
function ScheduleWeekStrip({
  weekDates, selectedDate, todayStr, scheduledDates, onSelect,
}: {
  weekDates: string[];
  selectedDate: string;
  todayStr: string;
  scheduledDates: Set<string>;
  onSelect: (d: string) => void;
}) {
  const SHORT_DAY = ["日", "一", "二", "三", "四", "五", "六"];
  return (
    <div className="cw-sched-week">
      {weekDates.map((dateStr) => {
        const d = new Date(dateStr);
        const isSelected = dateStr === selectedDate;
        const isToday = dateStr === todayStr;
        const hasSchedule = scheduledDates.has(dateStr);
        let cls = "cw-sched-week__day";
        if (isSelected) cls += " cw-sched-week__day--selected";
        if (isToday && !isSelected) cls += " cw-sched-week__day--today";
        return (
          <button key={dateStr} className={cls} onClick={() => onSelect(dateStr)}>
            <span className="cw-sched-week__label">{SHORT_DAY[d.getDay()]}</span>
            <span className="cw-sched-week__num">{d.getDate()}</span>
            {hasSchedule && <span className="cw-sched-week__dot" />}
          </button>
        );
      })}
    </div>
  );
}

/** Schedule card for the schedule tab */
function ScheduleCard({
  task, onStart,
}: {
  task: ServiceTask;
  onStart: () => void;
}) {
  const itemCount = task.plannedItems?.length ?? 0;
  const totalMinutes = task.plannedItems?.reduce((s, i) => s + i.referenceMinutes, 0) ?? task.estimatedMinutes ?? 0;
  const statusLabel = STATUS_LABELS[task.status];
  const statusColor = STATUS_COLORS[task.status];

  return (
    <div className="cw-sched-card">
      <div className="cw-sched-card__time">{task.startTime}-{task.endTime}</div>
      <div className="cw-sched-card__info">
        <div className="cw-sched-card__elder">{task.recipientName} <span className="cw-sched-card__addr">{task.locationShort}</span></div>
        <div className="cw-sched-card__items">
          {task.categoryName ?? task.serviceType}({itemCount}项) {totalMinutes}分钟
        </div>
      </div>
      <div className="cw-sched-card__actions">
        <span className="cw-sched-card__status" style={{ color: statusColor }}>{statusLabel}</span>
        {task.status === "pending" && (
          <button className="cw-sched-card__start" onClick={onStart}>
            开始服务 <IconArrowRight />
          </button>
        )}
        {task.status === "in_progress" && (
          <button className="cw-sched-card__start cw-sched-card__start--active" onClick={onStart}>
            继续服务 <IconArrowRight />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Service Flow Steps ─── */

type ServiceFlowStep = "estimation" | "verification" | "active" | "end_confirm";

/** Step 1: Task Estimation - service item checklist */
function ServiceEstimation({
  task,
  selectedItems,
  onToggleItem,
  onProceed,
  onBack,
}: {
  task: ServiceTask;
  selectedItems: PlannedServiceItem[];
  onToggleItem: (id: string) => void;
  onProceed: () => void;
  onBack: () => void;
}) {
  const totalMinutes = selectedItems.filter(i => i.checked).reduce((s, i) => s + i.referenceMinutes, 0);
  return (
    <div className="cw-flow">
      <div className="cw-flow__header">
        <button className="cw-flow__back" onClick={onBack}><IconChevronLeft /></button>
        <span className="cw-flow__title">服务预估（结束时可调整）</span>
      </div>
      <div className="cw-flow__body">
        {/* Elder info */}
        <div className="cw-flow__elder-info">
          <div className="cw-flow__elder-name">{task.recipientName}</div>
          <div className="cw-flow__elder-addr">{task.location}</div>
          {task.serviceContext?.dietary && (
            <div className="cw-flow__elder-note">饮食禁忌：{task.serviceContext.dietary}</div>
          )}
          {task.serviceContext?.lastNote && (
            <div className="cw-flow__elder-note">上次情况：{task.serviceContext.lastNote}</div>
          )}
        </div>

        {/* Service items checklist */}
        <div className="cw-flow__section-title">服务项目</div>
        <div className="cw-flow__items">
          {selectedItems.map((item) => (
            <div key={item.standardItemId} className="cw-flow__item" onClick={() => onToggleItem(item.standardItemId)}>
              <div className={`cw-flow__item-check ${item.checked ? "cw-flow__item-check--on" : ""}`}>
                {item.checked && <IconCheck />}
              </div>
              <div className="cw-flow__item-info">
                <span className="cw-flow__item-name">{item.name}</span>
                <span className="cw-flow__item-cat">{item.categoryName}</span>
              </div>
              <span className="cw-flow__item-min">{item.referenceMinutes}分钟</span>
            </div>
          ))}
        </div>

        <div className="cw-flow__summary">
          参考工时合计：<strong>{totalMinutes}分钟</strong>
        </div>

        <button className="cw-flow__proceed" onClick={onProceed}>
          下一步：到达验证
        </button>
      </div>
    </div>
  );
}

/** Step 2: Verification (GPS + Beacon) */
function ServiceVerification({
  task,
  onProceed,
  onBack,
}: {
  task: ServiceTask;
  onProceed: () => void;
  onBack: () => void;
}) {
  const [gpsStatus, setGpsStatus] = useState<"checking" | "pass" | "fail">("checking");
  const [beaconStatus, setBeaconStatus] = useState<"checking" | "pass" | "fail">("checking");
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    // Simulate GPS check
    const t1 = setTimeout(() => setGpsStatus("pass"), 1500);
    const t2 = setTimeout(() => setBeaconStatus("pass"), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const allPass = gpsStatus === "pass" && beaconStatus === "pass";

  return (
    <div className="cw-flow">
      <div className="cw-flow__header">
        <button className="cw-flow__back" onClick={onBack}><IconChevronLeft /></button>
        <span className="cw-flow__title">到达验证</span>
      </div>
      <div className="cw-flow__body">
        <div className="cw-flow__elder-info" style={{ marginBottom: 20 }}>
          <div className="cw-flow__elder-name">{task.recipientName}</div>
          <div className="cw-flow__elder-addr">{task.location}</div>
        </div>

        <div className="cw-verify-list">
          <div className={`cw-verify-item ${gpsStatus === "pass" ? "cw-verify-item--pass" : gpsStatus === "fail" ? "cw-verify-item--fail" : ""}`}>
            <div className="cw-verify-item__icon">
              {gpsStatus === "checking" && <span className="cw-verify-spinner" />}
              {gpsStatus === "pass" && <span className="cw-verify-pass-icon">&#10003;</span>}
              {gpsStatus === "fail" && <span className="cw-verify-fail-icon">&#10007;</span>}
            </div>
            <div className="cw-verify-item__text">
              <div className="cw-verify-item__label">GPS 定位</div>
              <div className="cw-verify-item__status">
                {gpsStatus === "checking" ? "检测中..." : gpsStatus === "pass" ? "位置匹配" : "位置不匹配"}
              </div>
            </div>
          </div>
          <div className={`cw-verify-item ${beaconStatus === "pass" ? "cw-verify-item--pass" : beaconStatus === "fail" ? "cw-verify-item--fail" : ""}`}>
            <div className="cw-verify-item__icon">
              {beaconStatus === "checking" && <span className="cw-verify-spinner" />}
              {beaconStatus === "pass" && <span className="cw-verify-pass-icon">&#10003;</span>}
              {beaconStatus === "fail" && <span className="cw-verify-fail-icon">&#10007;</span>}
            </div>
            <div className="cw-verify-item__text">
              <div className="cw-verify-item__label">蓝牙信标</div>
              <div className="cw-verify-item__status">
                {beaconStatus === "checking" ? "搜索中..." : beaconStatus === "pass" ? "已连接" : "未发现"}
              </div>
            </div>
          </div>
        </div>

        {allPass && (
          <button className="cw-flow__proceed" onClick={onProceed}>
            验证通过 - 开始服务
          </button>
        )}

        {!allPass && !skipped && (gpsStatus !== "checking" || beaconStatus !== "checking") && (
          <button
            className="cw-flow__proceed cw-flow__proceed--skip"
            onClick={() => { setSkipped(true); onProceed(); }}
          >
            跳过验证（将标记异常）
          </button>
        )}
      </div>
    </div>
  );
}

/** Step 3: Active Service Mode */
function ServiceActiveMode({
  task,
  startTime,
  onEndService,
}: {
  task: ServiceTask;
  startTime: number;
  onEndService: () => void;
}) {
  const [elapsed, setElapsed] = useState("00:00");
  const sopSteps = SOP_BRIEF[task.serviceType] ?? SOP_BRIEF[task.categoryName ?? ""] ?? [];

  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      setElapsed(`${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className="cw-flow">
      <div className="cw-flow__header cw-flow__header--active">
        <span className="cw-flow__title" style={{ color: "#fff" }}>服务进行中</span>
      </div>
      <div className="cw-flow__body cw-flow__body--active">
        {/* Timer */}
        <div className="cw-active-timer">
          <div className="cw-active-timer__dot" />
          <div className="cw-active-timer__time">{elapsed}</div>
          <div className="cw-active-timer__label">服务时长</div>
        </div>

        {/* Elder info */}
        <div className="cw-active-info">
          <div className="cw-active-info__name">{task.recipientName}</div>
          <div className="cw-active-info__type">{task.serviceType} - {task.locationShort}</div>
        </div>

        {/* Recording status */}
        <div className="cw-active-recording">
          <span className="cw-active-recording__dot" />
          <span>录音中 - AI实时指导已开启</span>
        </div>

        {/* SOP steps */}
        {sopSteps.length > 0 && (
          <div className="cw-active-sop">
            <div className="cw-active-sop__title">SOP 要点</div>
            <div className="cw-active-sop__steps">
              {sopSteps.map((step, i) => (
                <span key={i} className="cw-active-sop__step">{step}</span>
              ))}
            </div>
          </div>
        )}

        {/* End button */}
        <button className="cw-flow__proceed cw-flow__proceed--end" onClick={onEndService}>
          结束服务
        </button>
      </div>
    </div>
  );
}

/** Step 4: End Confirmation - service items re-confirmation */
function ServiceEndConfirm({
  task,
  startTime,
  endTime,
  confirmedItems,
  onToggleItem,
  onAddExtraItem,
  extraItems,
  photos,
  onAddPhoto,
  onSubmit,
  onBack,
}: {
  task: ServiceTask;
  startTime: number;
  endTime: number;
  confirmedItems: PlannedServiceItem[];
  onToggleItem: (id: string) => void;
  onAddExtraItem: (item: PlannedServiceItem) => void;
  extraItems: PlannedServiceItem[];
  photos: string[];
  onAddPhoto: () => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const actualMinutes = Math.round((endTime - startTime) / 60000);
  const referenceMinutes = confirmedItems.filter(i => i.checked).reduce((s, i) => s + i.referenceMinutes, 0);
  const diffPercent = referenceMinutes > 0 ? Math.abs(actualMinutes - referenceMinutes) / referenceMinutes : 0;
  const showWarning = diffPercent > 0.3;

  return (
    <div className="cw-flow">
      <div className="cw-flow__header">
        <button className="cw-flow__back" onClick={onBack}><IconChevronLeft /></button>
        <span className="cw-flow__title">确认服务完成</span>
      </div>
      <div className="cw-flow__body">
        {/* Actual duration */}
        <div className="cw-endconf__duration">
          <div className="cw-endconf__duration-label">实际工时</div>
          <div className="cw-endconf__duration-value">{formatDuration(actualMinutes)}</div>
        </div>

        {/* Service items re-confirmation */}
        <div className="cw-flow__section-title">确认完成的服务项目</div>
        <div className="cw-flow__items">
          {confirmedItems.map((item) => (
            <div key={item.standardItemId} className="cw-flow__item" onClick={() => onToggleItem(item.standardItemId)}>
              <div className={`cw-flow__item-check ${item.checked ? "cw-flow__item-check--on" : ""}`}>
                {item.checked && <IconCheck />}
              </div>
              <div className="cw-flow__item-info">
                <span className="cw-flow__item-name">{item.name}</span>
                <span className="cw-flow__item-cat">{item.categoryName}</span>
              </div>
              <span className="cw-flow__item-min">{item.referenceMinutes}分钟</span>
            </div>
          ))}
        </div>

        {/* Add item button */}
        <button className="cw-endconf__add-btn" onClick={() => setShowAddPanel(!showAddPanel)}>
          <IconPlus /> 添加项目
        </button>

        {/* Extra items panel */}
        {showAddPanel && (
          <div className="cw-endconf__extra-panel">
            <div className="cw-endconf__extra-title">可添加的服务项目</div>
            {extraItems.length === 0 ? (
              <div className="cw-endconf__extra-empty">暂无更多可添加项目</div>
            ) : (
              extraItems.map(item => (
                <div key={item.standardItemId} className="cw-endconf__extra-item" onClick={() => { onAddExtraItem(item); setShowAddPanel(false); }}>
                  <span>{item.name}</span>
                  <span className="cw-endconf__extra-min">{item.referenceMinutes}分钟</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Duration comparison */}
        <div className="cw-endconf__compare">
          <div className="cw-endconf__compare-row">
            <span>参考工时合计</span>
            <span>{referenceMinutes}分钟</span>
          </div>
          <div className="cw-endconf__compare-row">
            <span>实际工时</span>
            <span>{actualMinutes}分钟</span>
          </div>
        </div>

        {showWarning && (
          <div className="cw-endconf__warning">
            实际工时与参考工时偏差较大，请确认
          </div>
        )}

        {/* Photo upload */}
        <div className="cw-endconf__photos">
          <div className="cw-flow__section-title">现场照片</div>
          <div className="cw-endconf__photo-grid">
            {photos.map((p, i) => (
              <div key={i} className="cw-endconf__photo-thumb">
                <div className="cw-endconf__photo-placeholder" />
              </div>
            ))}
            <button className="cw-endconf__photo-add" onClick={onAddPhoto}>
              <IconCamera />
              <span>拍照</span>
            </button>
          </div>
        </div>

        {/* Submit */}
        <button className="cw-flow__proceed" onClick={onSubmit}>
          提交
        </button>
      </div>
    </div>
  );
}

/* ─── Training Learn Tab ─── */

interface TrainingServiceItem {
  id: string;
  name: string;
  categoryName: string;
  referenceMinutes: number;
}

type TrainingMode = "guidance" | "supervision" | "exam";

const TRAINING_CATEGORIES: Array<{
  name: string;
  items: TrainingServiceItem[];
}> = [
  {
    name: "清洁卫生类",
    items: [
      { id: "hz-item-01", name: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 10 },
      { id: "hz-item-02", name: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10 },
      { id: "hz-item-06", name: "口腔清洁", categoryName: "清洁卫生类", referenceMinutes: 10 },
      { id: "hz-item-07", name: "协助沐浴/擦浴", categoryName: "清洁卫生类", referenceMinutes: 30 },
      { id: "hz-item-09", name: "协助更衣", categoryName: "清洁卫生类", referenceMinutes: 15 },
    ],
  },
  {
    name: "营养摄取类",
    items: [
      { id: "hz-item-16", name: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20 },
    ],
  },
  {
    name: "移动舒适和安全护理类",
    items: [
      { id: "hz-item-27", name: "协助翻身与体位转换", categoryName: "移动舒适和安全护理类", referenceMinutes: 10 },
      { id: "hz-item-29", name: "协助行走", categoryName: "移动舒适和安全护理类", referenceMinutes: 15 },
      { id: "hz-item-32", name: "生活自理能力训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20 },
      { id: "hz-item-33", name: "肢体活动训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20 },
      { id: "hz-item-35", name: "情绪安抚与心理疏导", categoryName: "移动舒适和安全护理类", referenceMinutes: 20 },
    ],
  },
  {
    name: "生命体征观察与护理类",
    items: [
      { id: "hz-item-38", name: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15 },
    ],
  },
];

function TrainingLearnTab({ onSelectSop }: { onSelectSop: (sop: SopFolder) => void }) {
  const [selectedItem, setSelectedItem] = useState<TrainingServiceItem | null>(null);
  const [activeMode, setActiveMode] = useState<TrainingMode | null>(null);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [toast, setToast] = useState(false);

  const handleComplete = () => {
    const token = localStorage.getItem("gy_auth_token");
    fetch("/api/training-records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        workerId: "sw1",
        workerName: "刘秀英",
        serviceItemId: selectedItem?.id,
        serviceItemName: selectedItem?.name,
        mode: activeMode,
        status: "completed",
        score: activeMode === "exam" ? Math.floor(Math.random() * 40) + 60 : undefined,
        siteId: "site1",
        siteName: "阳光社区服务站",
      }),
    }).catch(() => {});
    setToast(true);
    setTimeout(() => {
      setToast(false);
      setActiveMode(null);
      setSelectedItem(null);
      setTrainingComplete(false);
    }, 1500);
  };

  // Training session screen
  if (activeMode && selectedItem) {
    const modeLabels: Record<TrainingMode, string> = { guidance: "培训引导", supervision: "培训督导", exam: "培训考核" };
    const modeColors: Record<TrainingMode, string> = { guidance: "#2563EB", supervision: "#EA580C", exam: "#9333EA" };

    return (
      <div className="cw-learn">
        {toast && (
          <div className="cw-training-toast">培训记录已提交</div>
        )}
        <div className="cw-training-session">
          <div className="cw-training-session__header" style={{ borderColor: modeColors[activeMode] }}>
            <button className="cw-training-session__back" onClick={() => { setActiveMode(null); setTrainingComplete(false); }}>
              &larr;
            </button>
            <span style={{ color: modeColors[activeMode], fontWeight: 700 }}>
              {modeLabels[activeMode]}: {selectedItem.name}
            </span>
          </div>

          <div className="cw-training-session__body">
            {activeMode === "guidance" && (
              <div className="cw-training-guidance">
                <div className="cw-training-guidance__title">步骤引导</div>
                <div className="cw-training-guidance__steps">
                  {[
                    `第1步：准备所需物品和工具`,
                    `第2步：向老人说明即将进行的${selectedItem.name}操作`,
                    `第3步：按照标准流程执行${selectedItem.name}`,
                    `第4步：观察老人反应，确保舒适安全`,
                    `第5步：完成后整理并记录操作情况`,
                  ].map((step, i) => (
                    <div key={i} className="cw-training-guidance__step" data-done={i < 3 ? "true" : "false"}>
                      <div className="cw-training-guidance__step-num">{i + 1}</div>
                      <div className="cw-training-guidance__step-text">{step}</div>
                    </div>
                  ))}
                </div>
                <div className="cw-training-guidance__progress">
                  <div className="cw-training-guidance__progress-bar">
                    <div className="cw-training-guidance__progress-fill" style={{ width: "60%" }} />
                  </div>
                  <span className="cw-training-guidance__progress-label">进度 3/5</span>
                </div>
              </div>
            )}

            {activeMode === "supervision" && (
              <div className="cw-training-supervision">
                <div className="cw-training-supervision__prompt">
                  请开始操作并说明步骤...
                </div>
                <div className="cw-training-supervision__feedback">
                  <div className="cw-training-supervision__feedback-title">AI 实时反馈</div>
                  <div className="cw-training-supervision__feedback-item" data-type="ok">
                    操作手法规范，继续保持
                  </div>
                  <div className="cw-training-supervision__feedback-item" data-type="warn">
                    注意：操作前应先向老人说明
                  </div>
                  <div className="cw-training-supervision__feedback-item" data-type="ok">
                    沟通方式清晰，老人反应良好
                  </div>
                </div>
              </div>
            )}

            {activeMode === "exam" && (
              <div className="cw-training-exam">
                <div className="cw-training-exam__prompt">
                  请口述完整操作流程...
                </div>
                <div className="cw-training-exam__recording">
                  <div className="cw-training-exam__recording-dot" />
                  <span>录音中...</span>
                </div>
                <div className="cw-training-exam__hint">
                  请完整描述{selectedItem.name}的操作步骤、注意事项和安全防护措施
                </div>
              </div>
            )}
          </div>

          <div className="cw-training-session__footer">
            <button className="cw-training-session__complete" style={{ background: modeColors[activeMode] }} onClick={handleComplete}>
              完成培训
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Item detail with training mode buttons
  if (selectedItem) {
    return (
      <div className="cw-learn">
        <div className="cw-training-detail">
          <div className="cw-training-detail__header">
            <button className="cw-training-detail__back" onClick={() => setSelectedItem(null)}>&larr; 返回</button>
            <h3 className="cw-training-detail__title">{selectedItem.name}</h3>
            <div className="cw-training-detail__meta">
              <span>{selectedItem.categoryName}</span>
              <span>参考时间: {selectedItem.referenceMinutes}分钟</span>
            </div>
          </div>

          <div className="cw-training-detail__sop">
            <div className="cw-training-detail__sop-title">SOP 标准流程</div>
            <div className="cw-training-detail__sop-content">
              <p>1. 准备所需物品和工具</p>
              <p>2. 向老人说明即将进行的操作</p>
              <p>3. 按照标准流程执行{selectedItem.name}</p>
              <p>4. 观察老人反应，确保舒适安全</p>
              <p>5. 完成后整理并记录操作情况</p>
            </div>
          </div>

          <div className="cw-training-detail__modes">
            <div className="cw-training-detail__modes-title">选择培训模式</div>
            <button className="cw-training-mode-btn cw-training-mode-btn--guidance" onClick={() => setActiveMode("guidance")}>
              培训引导
            </button>
            <button className="cw-training-mode-btn cw-training-mode-btn--supervision" onClick={() => setActiveMode("supervision")}>
              培训督导
            </button>
            <button className="cw-training-mode-btn cw-training-mode-btn--exam" onClick={() => setActiveMode("exam")}>
              培训考核
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Item list grouped by category
  return (
    <div className="cw-learn">
      <div className="cw-learn__title">学习中心</div>

      <div className="cw-training-items">
        {TRAINING_CATEGORIES.map((cat) => (
          <div key={cat.name} className="cw-training-category">
            <div className="cw-training-category__name">{cat.name}</div>
            <div className="cw-training-category__list">
              {cat.items.map((item) => (
                <button key={item.id} className="cw-training-item" onClick={() => setSelectedItem(item)}>
                  <span className="cw-training-item__name">{item.name}</span>
                  <span className="cw-training-item__time">{item.referenceMinutes}分钟</span>
                  <span className="cw-training-item__arrow">&rsaquo;</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Keep the SOP reference list below */}
      <ReferenceList onSelectSop={onSelectSop} />
    </div>
  );
}

/** SOP reference list */
function ReferenceList({ onSelectSop }: { onSelectSop: (sop: SopFolder) => void }) {
  const [sops, setSops] = useState<SopFolder[]>([]);
  useEffect(() => {
    const token = localStorage.getItem("gy_auth_token");
    fetch("/api/sops", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(data => {
        const list = (data.sops ?? []).filter((s: any) => s.published && s.sopContent).map((s: any) => ({
          id: s.id,
          name: s.name,
          type: s.type as "general" | "service",
          version: s.sopVersion ?? 1,
          updatedAt: s.updatedAt ? new Date(s.updatedAt).toLocaleDateString("zh-CN") : "",
          content: s.sopContent ?? "",
        }));
        setSops(list);
      })
      .catch(() => {});
  }, []);
  const general = sops.filter(s => s.type === "general");
  const service = sops.filter(s => s.type === "service");

  return (
    <div className="cw-ref-list">
      <div className="cw-ref-group__title">通用规范</div>
      {general.map(sop => (
        <div key={sop.id} className="cw-ref-item" onClick={() => onSelectSop(sop)}>
          <div className="cw-ref-item__icon"><IconFileText /></div>
          <div className="cw-ref-item__body">
            <div className="cw-ref-item__name">{sop.name}</div>
            <div className="cw-ref-item__meta">v{sop.version} - 更新于 {sop.updatedAt}</div>
          </div>
          <span className="cw-ref-item__chevron"><IconChevronRightSmall /></span>
        </div>
      ))}
      <div className="cw-ref-group__title" style={{ marginTop: 16 }}>服务项目规范</div>
      {service.map(sop => (
        <div key={sop.id} className="cw-ref-item" onClick={() => onSelectSop(sop)}>
          <div className="cw-ref-item__icon"><IconFileText /></div>
          <div className="cw-ref-item__body">
            <div className="cw-ref-item__name">{sop.name}</div>
            <div className="cw-ref-item__meta">v{sop.version} - 更新于 {sop.updatedAt}</div>
          </div>
          <span className="cw-ref-item__chevron"><IconChevronRightSmall /></span>
        </div>
      ))}
    </div>
  );
}

/** SOP detail drawer with markdown rendering */
function SopDetailDrawer({ sop, onClose }: { sop: SopFolder; onClose: () => void }) {
  return (
    <div className="cw-drawer-overlay" onClick={onClose}>
      <div className="cw-drawer" onClick={e => e.stopPropagation()}>
        <div className="cw-drawer__handle" />
        <div className="cw-drawer__header">
          <div className="cw-drawer__title">{sop.name}</div>
          <button className="cw-drawer__close" onClick={onClose}><IconX /></button>
        </div>
        <div className="cw-drawer__body">
          <div className="cw-sop-content cw-sop-content--markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sop.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Login screen */
function ChangePasswordScreen({ token, onDone }: { token: string; onDone: () => void }) {
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!newPwd || newPwd.length < 6) { setError("新密码至少6位"); return; }
    if (newPwd !== confirmPwd) { setError("两次密码不一致"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: "__force_change__", newPassword: newPwd }),
      });
      if (res.ok) { onDone(); } else {
        const data = await res.json();
        setError(data.error ?? "修改失败");
      }
    } catch { setError("网络错误"); }
    setLoading(false);
  };

  return (
    <div className="cw-login">
      <div className="cw-login__card">
        <div className="cw-login__logo">
          <img src="/logo.png" alt="金色年华" width="56" height="56" style={{ borderRadius: 14 }} />
          <h1 className="cw-login__title">首次登录</h1>
          <p className="cw-login__subtitle">请设置您的新密码</p>
        </div>
        <div className="cw-login__form">
          {error && <div className="cw-login__error">{error}</div>}
          <label className="cw-login__field">
            <span>新密码</span>
            <input type="password" placeholder="至少6位" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          </label>
          <label className="cw-login__field">
            <span>确认密码</span>
            <input type="password" placeholder="再次输入新密码" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }} />
          </label>
          <button className="cw-login__btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "设置中..." : "设置密码并进入"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (worker: DemoWorker) => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mustChangePwd, setMustChangePwd] = useState<{ token: string; worker: DemoWorker } | null>(null);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError("请输入账号和密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: phone.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登录失败");
        setLoading(false);
        return;
      }
      const t = data.token;
      const u = data.user;
      const w: DemoWorker = { id: u.id, name: u.name, phone: u.phone || phone.trim(), site: (u.siteIds && u.siteIds[0]) || "site-001" };

      if (data.mustChangePassword) {
        setMustChangePwd({ token: t, worker: w });
        setLoading(false);
        return;
      }

      localStorage.setItem("gy_careworker_token", t);
      onLogin(w);
    } catch {
      setError("网络错误，请重试");
    }
    setLoading(false);
  };

  if (mustChangePwd) {
    return (
      <ChangePasswordScreen
        token={mustChangePwd.token}
        onDone={() => {
          localStorage.setItem("gy_careworker_token", mustChangePwd.token);
          onLogin(mustChangePwd.worker);
        }}
      />
    );
  }

  return (
    <div className="cw-login">
      <div className="cw-login__card">
        <div className="cw-login__logo">
          <img src="/logo.png" alt="金色年华" width="56" height="56" style={{ borderRadius: 14 }} />
          <h1 className="cw-login__title">金色年华</h1>
          <p className="cw-login__subtitle">养老智慧服务平台</p>
        </div>

        <div className="cw-login__form">
          {error && <div className="cw-login__error">{error}</div>}
          <label className="cw-login__field">
            <span>账号</span>
            <input
              type="text"
              placeholder="请输入账号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="cw-login__field">
            <span>密码</span>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
              autoComplete="current-password"
            />
          </label>
          <button className="cw-login__btn" onClick={handleLogin} disabled={loading}>
            {loading ? "登录中..." : "进入工作台"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Default SOP steps by service type ─── */

interface SopStepDetail {
  name: string;
  detail: string;
}

function getDefaultSopSteps(serviceType: string): string[] {
  return (getSopStepDetails(serviceType) ?? []).map(s => s.name);
}

function getSopStepDetails(serviceType: string): SopStepDetail[] {
  const defaults: Record<string, SopStepDetail[]> = {
    "探访关爱": [
      { name: "确认身份", detail: "到达后先自报姓名和机构，确认长者身份，出示工牌。观察对象精神面貌。" },
      { name: "健康状况询问", detail: "询问近期身体状况：睡眠、食欲、疼痛、服药情况。如有血压计可测量血压。" },
      { name: "生活照料检查", detail: "检查居家环境是否整洁安全，食物是否充足，水电煤气是否正常。注意跌倒风险。" },
      { name: "心理关怀", detail: "关注情绪状态，耐心倾听。注意是否有孤独、焦虑、抑郁等情绪。鼓励参与社交活动。" },
      { name: "服务记录填写", detail: "总结本次服务发现，记录健康观察和注意事项。告别时确认下次服务时间。" },
    ],
    "助餐": [
      { name: "到达确认", detail: "到达后确认身份，了解今日饮食需求和禁忌。检查厨房卫生状况。" },
      { name: "食材检查", detail: "检查食材新鲜度和保质期。确认是否有过敏食材。按低盐低糖低油标准准备。" },
      { name: "烹饪/加热", detail: "按长者口味烹饪，注意食物软硬度适合老人咀嚼。确保食物温度适宜。" },
      { name: "摆餐与陪餐", detail: "摆放餐具，协助就座。陪同用餐，观察进食量和咀嚼吞咽情况。" },
      { name: "餐后清理", detail: "收拾餐桌，清洗餐具，整理厨房。确认长者餐后状态。" },
      { name: "记录", detail: "记录进食量、食欲情况、特殊观察。提醒餐后服药（如有需要）。" },
    ],
    "助浴": [
      { name: "安全评估", detail: "评估长者当日身体状况是否适合洗浴。检查浴室防滑设施和扶手。" },
      { name: "水温确认", detail: "调节水温至38-40度，请长者确认温度舒适。准备好干净衣物和浴巾。" },
      { name: "协助沐浴", detail: "全程陪护，防止滑倒。注意保护隐私和尊严。根据需要协助清洗。" },
      { name: "皮肤检查", detail: "洗浴过程中观察皮肤状况，注意是否有红肿、破损、压疮等异常。" },
      { name: "记录", detail: "记录洗浴时长、皮肤状况、长者反馈。整理浴室恢复原状。" },
    ],
    "助洁": [
      { name: "到达确认", detail: "到达后确认清洁区域和重点需求。了解物品摆放习惯，避免随意移动。" },
      { name: "清洁区域确认", detail: "与长者确认需要清洁的房间和区域。注意贵重物品和私人物品。" },
      { name: "清洁执行", detail: "按先卧室后客厅、先高后低的顺序清洁。使用对象家中的清洁用品。" },
      { name: "物品归位", detail: "清洁后物品放回原位。垃圾分类处理。检查是否遗漏。" },
      { name: "服务总结", detail: "请长者检查清洁效果。记录服务内容和特殊发现。" },
    ],
    "健康监测": [
      { name: "问候与身份确认", detail: "到达后问候并确认身份。说明本次监测内容。" },
      { name: "健康状况询问", detail: "询问近期身体感受、睡眠、饮食、排便等情况。了解服药依从性。" },
      { name: "生命体征检查", detail: "测量血压、心率、血糖等指标。如有异常及时记录并告知对象。" },
      { name: "服务总结与满意度询问", detail: "汇总监测结果，给出简单建议。询问服务满意度。" },
    ],
    "常规探访": [
      { name: "问候与身份确认", detail: "到达后先自报姓名和机构，确认长者身份。" },
      { name: "健康状况询问", detail: "询问近期身体状况、服药情况、有无不适。" },
      { name: "生活环境检查", detail: "观察居家环境安全性，检查水电煤气、食物储备等。" },
      { name: "心理关怀", detail: "关注情绪变化，耐心倾听，提供心理支持。" },
      { name: "需求收集", detail: "了解是否有新的服务需求或困难需要帮助解决。" },
      { name: "服务总结", detail: "总结本次探访发现，确认下次服务时间，礼貌告别。" },
    ],
    "康复训练": [
      { name: "评估", detail: "评估当日身体状况和疼痛等级，确认是否适合训练。回顾上次训练记录。" },
      { name: "热身", detail: "指导进行5-10分钟轻度活动，活动关节，预防运动损伤。" },
      { name: "训练执行", detail: "按康复计划执行训练项目。注意动作规范，及时纠正。关注疼痛反馈。" },
      { name: "放松", detail: "训练后进行拉伸和放松。按摩疲劳部位。确认无不适。" },
      { name: "记录", detail: "记录训练内容、完成情况、疼痛等级变化和长者反馈。" },
    ],
    "生活照料": [
      { name: "到达确认", detail: "到达后确认身份，了解服务需求。" },
      { name: "身份确认", detail: "确认长者身份和当日状态。" },
      { name: "照料服务", detail: "按照服务计划执行照料项目。" },
      { name: "环境整理", detail: "完成照料后整理环境。" },
      { name: "记录", detail: "记录服务内容和观察发现。" },
    ],
  };
  return defaults[serviceType] ?? [
    { name: "到达确认", detail: "到达后确认身份，了解服务需求。" },
    { name: "服务执行", detail: "按照规范执行服务内容。" },
    { name: "服务记录", detail: "记录服务内容和观察发现。" },
  ];
}

/* ─── AI Assistant Component ─── */

function IconChat() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([
    { id: 0, role: "ai", text: "您好！我是金色年华AI助手，有什么可以帮您的？" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(1);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const userMsg: AiMessage = { id: idRef.current++, role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    const reply = getAiResponse(text);
    setTimeout(() => {
      setMessages(prev => [...prev, { id: idRef.current++, role: "ai", text: reply }]);
      setTyping(false);
    }, 800 + Math.random() * 600);
  }, [input]);

  return (
    <>
      {!open && (
        <button className="cw-ai-fab" onClick={() => setOpen(true)} aria-label="AI助手">
          <IconChat />
        </button>
      )}

      {open && (
        <div className="cw-ai-panel">
          <div className="cw-ai-panel__header">
            <div className="cw-ai-panel__header-left">
              <div className="cw-ai-panel__avatar">
                <IconChat />
              </div>
              <div>
                <div className="cw-ai-panel__title">AI 助手</div>
                <div className="cw-ai-panel__subtitle">金色年华智能助手</div>
              </div>
            </div>
            <button className="cw-ai-panel__close" onClick={() => setOpen(false)} aria-label="关闭">
              <IconChevronDown />
            </button>
          </div>

          <div className="cw-ai-panel__messages" ref={scrollRef}>
            {messages.map(msg => (
              <div key={msg.id} className={`cw-ai-msg ${msg.role === "user" ? "cw-ai-msg--user" : "cw-ai-msg--ai"}`}>
                {msg.role === "ai" && <div className="cw-ai-msg__avatar">AI</div>}
                <div className={`cw-ai-msg__bubble ${msg.role === "user" ? "cw-ai-msg__bubble--user" : "cw-ai-msg__bubble--ai"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="cw-ai-msg cw-ai-msg--ai">
                <div className="cw-ai-msg__avatar">AI</div>
                <div className="cw-ai-msg__bubble cw-ai-msg__bubble--ai">
                  <span className="cw-ai-typing">
                    <span className="cw-ai-typing__dot" style={{ animationDelay: "0ms" }} />
                    <span className="cw-ai-typing__dot" style={{ animationDelay: "150ms" }} />
                    <span className="cw-ai-typing__dot" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="cw-ai-input">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              placeholder="输入问题..."
              className="cw-ai-input__field"
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              className="cw-ai-input__send"
            >
              <IconSend />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Map Action Sheet Component ─── */

function MapActionSheet({
  address, onClose,
}: {
  address: string;
  onClose: () => void;
}) {
  const handleOpen = (option: MapOption) => {
    window.open(option.getUrl(address), "_blank");
    onClose();
  };

  return (
    <div className="cw-drawer-overlay" onClick={onClose}>
      <div className="cw-map-sheet" onClick={e => e.stopPropagation()}>
        <div className="cw-map-sheet__handle" />
        <div className="cw-map-sheet__title">选择导航应用</div>
        <div className="cw-map-sheet__options">
          {MAP_OPTIONS.map(opt => (
            <button key={opt.name} className="cw-map-option" onClick={() => handleOpen(opt)}>
              <div className="cw-map-option__icon">{opt.icon}</div>
              <span className="cw-map-option__name">{opt.name}</span>
              <span className="cw-map-option__chevron"><IconChevronRightSmall /></span>
            </button>
          ))}
        </div>
        <button className="cw-map-sheet__cancel" onClick={onClose}>取消</button>
      </div>
    </div>
  );
}

/* ─── Unplanned Service Panel ─── */
function UnplannedServicePanel({
  onClose,
  onSelectElder,
}: {
  onClose: () => void;
  onSelectElder: (name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const allElders = ["王淑珍", "陈国强", "李德明", "张秀兰", "刘玉兰", "赵国华", "陈阿姨", "李大爷", "张奶奶"];
  const filtered = search ? allElders.filter(e => e.includes(search)) : allElders;

  return (
    <div className="cw-drawer-overlay" onClick={onClose}>
      <div className="cw-drawer" onClick={e => e.stopPropagation()}>
        <div className="cw-drawer__handle" />
        <div className="cw-drawer__header">
          <div className="cw-drawer__title">计划外服务</div>
          <button className="cw-drawer__close" onClick={onClose}><IconX /></button>
        </div>
        <div className="cw-drawer__body">
          <input
            type="text"
            className="cw-unplanned__search"
            placeholder="搜索长者姓名..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="cw-unplanned__list">
            {filtered.map(name => (
              <div key={name} className="cw-unplanned__item" onClick={() => onSelectElder(name)}>
                <div className="cw-unplanned__avatar">{name[0]}</div>
                <span className="cw-unplanned__name">{name}</span>
                <IconChevronRightSmall />
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="cw-unplanned__empty">未找到匹配的长者</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page Component ─── */

export function CareworkerPage() {
  const [worker, setWorker] = useState<DemoWorker | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("schedule");
  const [selectedSop, setSelectedSop] = useState<SopFolder | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [mapAddress, setMapAddress] = useState<string | null>(null);

  /* ── Service flow state ── */
  const [serviceFlowActive, setServiceFlowActive] = useState(false);
  const [serviceFlowStep, setServiceFlowStep] = useState<ServiceFlowStep>("estimation");
  const [serviceFlowTask, setServiceFlowTask] = useState<ServiceTask | null>(null);
  const [serviceStartTime, setServiceStartTime] = useState<number | null>(null);
  const [serviceEndTime, setServiceEndTime] = useState<number | null>(null);
  const [estimatedItems, setEstimatedItems] = useState<PlannedServiceItem[]>([]);
  const [confirmedItems, setConfirmedItems] = useState<PlannedServiceItem[]>([]);
  const [availableExtraItems, setAvailableExtraItems] = useState<PlannedServiceItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [showUnplanned, setShowUnplanned] = useState(false);

  /* Schedule tab state */
  const [scheduleDate, setScheduleDate] = useState(TODAY_STR);
  const scheduledDates = useMemo(() => buildWeekScheduleDates(), []);
  const scheduleWeekDates = useMemo(() => getWeekDates(new Date(scheduleDate)), [scheduleDate]);
  const todaySchedules = useMemo(() => worker ? buildTodaySchedules(worker.name) : [], [worker]);

  // For schedule tab, show schedules for selected date. Only today has mock data.
  const schedulesForDate = useMemo(() => {
    if (scheduleDate === TODAY_STR) return todaySchedules;
    return [];
  }, [scheduleDate, todaySchedules]);

  /* History data */
  const historyRecords = useMemo(() => buildHistoryRecords(), []);
  const historyByDate = useMemo(() => {
    const map = new Map<string, HistoryRecord[]>();
    for (const r of historyRecords) {
      const arr = map.get(r.date) || [];
      arr.push(r);
      map.set(r.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [historyRecords]);

  /* Restore session */
  const [restoredMustChange, setRestoredMustChange] = useState<{ token: string; worker: DemoWorker } | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("gy_careworker_token");
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        const u = data.user;
        const w: DemoWorker = { id: u.id, name: u.name, phone: u.phone || "", site: (u.siteIds && u.siteIds[0]) || "site-001" };
        if (data.mustChangePassword) {
          setRestoredMustChange({ token, worker: w });
        } else {
          setWorker(w);
        }
      })
      .catch(() => {
        localStorage.removeItem("gy_careworker_token");
      });
  }, []);

  // Badge hook
  const nextPendingStart = useMemo(() => {
    if (!worker) return null;
    const pending = todaySchedules.filter(t => t.status === "pending");
    if (pending.length === 0) return null;
    return pending.sort((a, b) => a.startTime.localeCompare(b.startTime))[0].startTime;
  }, [todaySchedules, worker]);
  const badge = useBadgeHook(nextPendingStart);

  const handleLogout = useCallback(() => {
    setShowLogout(false);
    setWorker(null);
    setActiveTab("schedule");
    setServiceFlowActive(false);
    localStorage.removeItem("gy_careworker_token");
  }, []);

  /* ── Service flow handlers ── */
  const startServiceFlow = useCallback((task: ServiceTask) => {
    const items = task.plannedItems?.map(i => ({ ...i, checked: true })) ?? [];
    setServiceFlowTask(task);
    setEstimatedItems(items);
    setConfirmedItems(items.map(i => ({ ...i })));
    setAvailableExtraItems(EXTRA_PLAN_ITEMS.filter(e => !items.some(i => i.standardItemId === e.standardItemId)));
    setServiceFlowStep("estimation");
    setServiceFlowActive(true);
    setServiceStartTime(null);
    setServiceEndTime(null);
    setPhotos([]);
    setActiveTab("service");
  }, []);

  const toggleEstimatedItem = useCallback((id: string) => {
    setEstimatedItems(prev => prev.map(i => i.standardItemId === id ? { ...i, checked: !i.checked } : i));
  }, []);

  const toggleConfirmedItem = useCallback((id: string) => {
    setConfirmedItems(prev => prev.map(i => i.standardItemId === id ? { ...i, checked: !i.checked } : i));
  }, []);

  const addExtraItem = useCallback((item: PlannedServiceItem) => {
    setConfirmedItems(prev => [...prev, { ...item, checked: true }]);
    setAvailableExtraItems(prev => prev.filter(i => i.standardItemId !== item.standardItemId));
  }, []);

  const handleEndService = useCallback(() => {
    setServiceEndTime(Date.now());
    // Copy estimated items to confirmed (all checked by default)
    setConfirmedItems(estimatedItems.map(i => ({ ...i, checked: true })));
    setServiceFlowStep("end_confirm");
  }, [estimatedItems]);

  const handleSubmitService = useCallback(() => {
    // Mock submission
    setServiceFlowActive(false);
    setServiceFlowTask(null);
    setActiveTab("schedule");
    // In a real app, this would POST to the API
  }, []);

  const handleStartUnplannedService = useCallback((elderName: string) => {
    const items = MOCK_SCHEDULE_ITEMS[elderName] ?? [
      { standardItemId: "up-1", name: "常规探访", categoryName: "探访服务", referenceMinutes: 30, checked: true },
    ];
    const task: ServiceTask = {
      id: `unplanned-${Date.now()}`,
      serviceType: "计划外服务",
      recipientName: elderName,
      workerName: worker?.name ?? "",
      date: TODAY_STR,
      dayOfWeek: dayOfWeek(TODAY_STR),
      startTime: new Date().toTimeString().slice(0, 5),
      endTime: "",
      location: "地址待确认",
      locationShort: "待确认",
      status: "pending",
      source: "计划外",
      notes: "",
      plannedItems: items,
      categoryName: "计划外服务",
      estimatedMinutes: items.reduce((s, i) => s + i.referenceMinutes, 0),
    };
    setShowUnplanned(false);
    startServiceFlow(task);
  }, [worker, startServiceFlow]);

  // Force password change for restored session
  if (restoredMustChange) {
    return (
      <ChangePasswordScreen
        token={restoredMustChange.token}
        onDone={() => {
          setWorker(restoredMustChange.worker);
          setRestoredMustChange(null);
        }}
      />
    );
  }

  // Login screen
  if (!worker) {
    return <LoginScreen onLogin={setWorker} />;
  }

  // Standalone hardware simulator page
  if (window.location.pathname.startsWith("/careworker/hardware")) {
    return <HardwareSimulator worker={worker} />;
  }

  /* ── Service flow overlay (takes over main area) ── */
  if (serviceFlowActive && serviceFlowTask) {
    return (
      <div className="cw-shell">
        {serviceFlowStep === "estimation" && (
          <ServiceEstimation
            task={serviceFlowTask}
            selectedItems={estimatedItems}
            onToggleItem={toggleEstimatedItem}
            onProceed={() => setServiceFlowStep("verification")}
            onBack={() => { setServiceFlowActive(false); setActiveTab("schedule"); }}
          />
        )}
        {serviceFlowStep === "verification" && (
          <ServiceVerification
            task={serviceFlowTask}
            onProceed={() => {
              setServiceStartTime(Date.now());
              setServiceFlowStep("active");
            }}
            onBack={() => setServiceFlowStep("estimation")}
          />
        )}
        {serviceFlowStep === "active" && serviceStartTime && (
          <ServiceActiveMode
            task={serviceFlowTask}
            startTime={serviceStartTime}
            onEndService={handleEndService}
          />
        )}
        {serviceFlowStep === "end_confirm" && serviceStartTime && serviceEndTime && (
          <ServiceEndConfirm
            task={serviceFlowTask}
            startTime={serviceStartTime}
            endTime={serviceEndTime}
            confirmedItems={confirmedItems}
            onToggleItem={toggleConfirmedItem}
            onAddExtraItem={addExtraItem}
            extraItems={availableExtraItems}
            photos={photos}
            onAddPhoto={() => setPhotos(prev => [...prev, `photo-${prev.length + 1}`])}
            onSubmit={handleSubmitService}
            onBack={() => setServiceFlowStep("active")}
          />
        )}
      </div>
    );
  }

  return (
    <div className="cw-shell">
      {/* Header */}
      <header className="cw-header">
        <div className="cw-header__user">
          <div className="cw-header__avatar">{worker.name[0]}</div>
          <div>
            <div className="cw-header__name">{worker.name}</div>
            <div className="cw-header__role">{SITE_NAME_MAP[worker.site] ?? worker.site}</div>
          </div>
        </div>
        <div className="cw-header__actions">
          <BadgeChip badge={badge} />
          <button className="cw-header__logout" onClick={() => setShowLogout(true)} aria-label="退出登录">
            <IconLogout />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="cw-main">
        {/* ═══ Tab 1: 今日排班 (schedule) ═══ */}
        {activeTab === "schedule" && (
          <div className="cw-schedule">
            {/* Week calendar strip */}
            <ScheduleWeekStrip
              weekDates={scheduleWeekDates}
              selectedDate={scheduleDate}
              todayStr={TODAY_STR}
              scheduledDates={scheduledDates}
              onSelect={setScheduleDate}
            />

            {/* Date title */}
            <div className="cw-schedule__date-title">
              {scheduleDate === TODAY_STR ? "今日排班" : formatDateTitle(scheduleDate)}
              {schedulesForDate.length > 0 && (
                <span className="cw-schedule__count">({schedulesForDate.length})</span>
              )}
            </div>

            {/* Schedule cards */}
            <div className="cw-schedule__list">
              {schedulesForDate.length === 0 ? (
                <div className="cw-schedule__empty">
                  {scheduleDate === TODAY_STR ? "今日无排班安排" : "当日无排班安排"}
                </div>
              ) : (
                schedulesForDate.map(task => (
                  <ScheduleCard
                    key={task.id}
                    task={task}
                    onStart={() => startServiceFlow(task)}
                  />
                ))
              )}
            </div>

            {/* Unplanned service button */}
            <div className="cw-schedule__unplanned">
              <button className="cw-schedule__unplanned-btn" onClick={() => setShowUnplanned(true)}>
                <IconPlus /> 计划外服务
              </button>
            </div>
          </div>
        )}

        {/* ═══ Tab 2: 服务流程 (service) — shows prompt when no active flow ═══ */}
        {activeTab === "service" && (
          <div className="cw-service-idle">
            <div className="cw-service-idle__icon">
              <IconWrench color="#C4BAB0" />
            </div>
            <div className="cw-service-idle__title">暂无进行中的服务</div>
            <div className="cw-service-idle__desc">从"排班"页面选择一项服务并点击"开始服务"进入服务流程</div>
            <button className="cw-service-idle__btn" onClick={() => setActiveTab("schedule")}>
              查看今日排班
            </button>
          </div>
        )}

        {/* ═══ Tab 3: 服务记录 (history) ═══ */}
        {activeTab === "history" && (
          <div className="cw-history">
            <div className="cw-history__title">服务记录</div>
            {historyByDate.map(([date, records]) => (
              <div key={date} className="cw-history__group">
                <div className="cw-history__date">{formatDateTitle(date)}</div>
                {records.map(record => (
                  <div key={record.id} className="cw-history__card">
                    <div className="cw-history__card-top">
                      <span className="cw-history__elder">{record.elderName}</span>
                      <span className={`cw-history__status cw-history__status--${record.status}`}>
                        {record.status === "completed" ? "已完成" : "异常"}
                      </span>
                    </div>
                    <div className="cw-history__card-meta">
                      <span>{record.serviceType}</span>
                      <span>{record.startTime}-{record.endTime}</span>
                      <span>{record.durationMinutes}分钟</span>
                    </div>
                    <div className="cw-history__card-bottom">
                      <span>服务项目: {record.itemsCount}项</span>
                      <span className="cw-history__evidence">
                        证据: {record.evidenceScore}/6
                        <span className="cw-history__evidence-bar">
                          <span className="cw-history__evidence-fill" style={{ width: `${(record.evidenceScore / 6) * 100}%` }} />
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ═══ Tab 4: 学习中心 (learn) ═══ */}
        {activeTab === "learn" && (
          <TrainingLearnTab onSelectSop={setSelectedSop} />
        )}
      </main>

      {/* Tab bar */}
      <nav className="cw-tabbar">
        <button
          className={`cw-tabbar__item ${activeTab === "schedule" ? "cw-tabbar__item--active" : ""}`}
          onClick={() => setActiveTab("schedule")}
        >
          <IconCalendar color={activeTab === "schedule" ? "#EB6420" : "#A89E96"} />
          <span className="cw-tabbar__label">排班</span>
        </button>
        <button
          className={`cw-tabbar__item ${activeTab === "service" ? "cw-tabbar__item--active" : ""}`}
          onClick={() => setActiveTab("service")}
        >
          <IconWrench color={activeTab === "service" ? "#EB6420" : "#A89E96"} />
          <span className="cw-tabbar__label">服务</span>
        </button>
        <button
          className={`cw-tabbar__item ${activeTab === "history" ? "cw-tabbar__item--active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <IconClipboard color={activeTab === "history" ? "#EB6420" : "#A89E96"} />
          <span className="cw-tabbar__label">记录</span>
        </button>
        <button
          className={`cw-tabbar__item ${activeTab === "learn" ? "cw-tabbar__item--active" : ""}`}
          onClick={() => setActiveTab("learn")}
        >
          <IconBook color={activeTab === "learn" ? "#EB6420" : "#A89E96"} />
          <span className="cw-tabbar__label">学习</span>
        </button>
      </nav>

      {/* SOP detail drawer */}
      {selectedSop && (
        <SopDetailDrawer sop={selectedSop} onClose={() => setSelectedSop(null)} />
      )}

      {/* Logout confirmation */}
      {showLogout && (
        <div className="cw-confirm-overlay" onClick={() => setShowLogout(false)}>
          <div className="cw-confirm" onClick={e => e.stopPropagation()}>
            <h3 className="cw-confirm__title">退出登录</h3>
            <p className="cw-confirm__msg">确认要退出登录吗？</p>
            <div className="cw-confirm__btns">
              <button className="cw-confirm__btn cw-confirm__btn--cancel" onClick={() => setShowLogout(false)}>取消</button>
              <button className="cw-confirm__btn cw-confirm__btn--danger" onClick={handleLogout}>确认退出</button>
            </div>
          </div>
        </div>
      )}

      {/* Map action sheet */}
      {mapAddress && (
        <MapActionSheet address={mapAddress} onClose={() => setMapAddress(null)} />
      )}

      {/* Unplanned service panel */}
      {showUnplanned && (
        <UnplannedServicePanel
          onClose={() => setShowUnplanned(false)}
          onSelectElder={handleStartUnplannedService}
        />
      )}

      {/* AI Assistant */}
      <AiAssistant />
    </div>
  );
}
