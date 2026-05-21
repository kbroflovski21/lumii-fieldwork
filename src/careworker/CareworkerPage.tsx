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

type TaskStatus = "completed" | "abnormal" | "pending";
type Tab = "tasks" | "reference";
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
}

interface ServiceContext {
  dietary?: string;
  lastNote?: string;
  familyConcern?: string;
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

const MOCK_TASKS: ServiceTask[] = [
  // ─── 6 days ago ───
  { id: "t1", serviceType: "助餐", recipientName: "陈阿姨", workerName: "王建国",
    date: dateOffset(-6), dayOfWeek: dayOfWeek(dateOffset(-6)),
    startTime: "09:00", endTime: "10:00",
    location: "杭州市余杭区翠苑一区12幢3单元401", locationShort: "翠苑一区",
    status: "completed", source: "周期计划", notes: "",
    serviceContext: { dietary: "低盐低糖", lastNote: "食欲正常", familyConcern: "请留意是否按时吃药" },
    report: {
      summary: "为陈阿姨提供助餐服务，准备了清淡午餐（蒸鱼、青菜豆腐汤、软米饭）。陈阿姨食欲良好，进食量约八成。",
      sopCheck: [
        { step: "到达确认", passed: true }, { step: "食材检查", passed: true },
        { step: "烹饪/加热", passed: true }, { step: "摆餐与陪餐", passed: true },
        { step: "餐后清理", passed: true }, { step: "记录", passed: true },
      ],
      concerns: [], mood: "平稳", healthObservations: ["食欲正常", "咀嚼功能良好"],
      satisfaction: "陈阿姨表示饭菜合口味，很满意",
    },
  },
  // ─── 5 days ago ───
  { id: "t2", serviceType: "健康监测", recipientName: "李大爷", workerName: "王建国",
    date: dateOffset(-5), dayOfWeek: dayOfWeek(dateOffset(-5)),
    startTime: "10:30", endTime: "11:30",
    location: "杭州市余杭区文一西路288号翡翠城5幢1单元302", locationShort: "翡翠城",
    status: "completed", source: "周期计划", notes: "血压偏高，已记录",
    serviceContext: { dietary: "低脂", lastNote: "血压偏高(152/95)，睡眠质量下降", familyConcern: "注意血压变化" },
    report: {
      summary: "为李大爷进行常规健康监测。血压 152/95mmHg，偏高；血糖 6.8mmol/L，正常范围；心率 78次/分，正常。已建议李大爷按时服药并注意饮食。",
      sopCheck: [
        { step: "问候与身份确认", passed: true }, { step: "健康状况询问", passed: true },
        { step: "生命体征检查", passed: true }, { step: "服务总结与满意度询问", passed: true },
      ],
      concerns: ["血压偏高（152/95mmHg），需持续关注", "近期睡眠质量下降"],
      mood: "平稳", healthObservations: ["血压偏高", "睡眠质量下降", "血糖正常", "心率正常"],
      satisfaction: "李大爷对服务表示满意",
    },
  },
  { id: "t3", serviceType: "助洁", recipientName: "张奶奶", workerName: "王建国",
    date: dateOffset(-5), dayOfWeek: dayOfWeek(dateOffset(-5)),
    startTime: "14:00", endTime: "15:30",
    location: "杭州市余杭区五常街道荆长路100号阳光花园8幢201", locationShort: "阳光花园",
    status: "completed", source: "临时派单", notes: "",
    serviceContext: { lastNote: "行动较为缓慢，左膝关节有轻微疼痛", familyConcern: "注意防跌倒" },
    report: {
      summary: "为张奶奶提供居家清洁服务，完成卧室、客厅打扫和厨房台面清洁。张奶奶精神状态良好。",
      sopCheck: [
        { step: "到达确认", passed: true }, { step: "清洁区域确认", passed: true },
        { step: "清洁执行", passed: true }, { step: "物品归位", passed: true },
        { step: "服务总结", passed: true },
      ],
      concerns: [], mood: "开心", healthObservations: ["行动较为缓慢，但精神状态良好"],
      satisfaction: "张奶奶非常满意，表示家里干净多了",
    },
  },
  // ─── 4 days ago ───
  { id: "t4", serviceType: "常规探访", recipientName: "赵叔叔", workerName: "王建国",
    date: dateOffset(-4), dayOfWeek: dayOfWeek(dateOffset(-4)),
    startTime: "09:00", endTime: "10:30",
    location: "杭州市余杭区良渚街道玉鸟路99号万科良渚文化村3幢502", locationShort: "良渚文化村",
    status: "completed", source: "周期计划", notes: "",
    serviceContext: { lastNote: "轻微孤独感，精神状态一般", familyConcern: "多陪他聊聊天" },
    report: {
      summary: "对赵叔叔进行常规探访。赵叔叔近期独居，精神状态一般，有轻微孤独感。饮食和睡眠基本正常，药物按时服用。居家环境整洁，无安全隐患。",
      sopCheck: [
        { step: "问候与身份确认", passed: true }, { step: "健康状况询问", passed: true },
        { step: "生活环境检查", passed: true }, { step: "心理关怀", passed: true },
        { step: "需求收集", passed: true }, { step: "服务总结", passed: true },
      ],
      concerns: ["赵叔叔表现出轻微孤独感，建议增加社交活动"],
      mood: "略显低落", healthObservations: ["饮食正常", "睡眠基本正常", "药物按时服用"],
      satisfaction: "赵叔叔对探访表示感谢",
    },
  },
  { id: "t5", serviceType: "助浴", recipientName: "刘阿姨", workerName: "王建国",
    date: dateOffset(-4), dayOfWeek: dayOfWeek(dateOffset(-4)),
    startTime: "11:00", endTime: "12:00",
    location: "杭州市余杭区仓前街道梦想小镇天使村2幢103", locationShort: "梦想小镇",
    status: "abnormal", source: "周期计划", notes: "服务对象临时身体不适，已中止服务并上报",
    serviceContext: { lastNote: "上次因身体不适中止了助浴服务", familyConcern: "确认身体状况再开始服务" },
  },
  { id: "t6", serviceType: "康复训练", recipientName: "陈阿姨", workerName: "王建国",
    date: dateOffset(-4), dayOfWeek: dayOfWeek(dateOffset(-4)),
    startTime: "14:00", endTime: "15:00",
    location: "杭州市余杭区翠苑一区12幢3单元401", locationShort: "翠苑一区",
    status: "completed", source: "周期计划", notes: "",
    report: {
      summary: "为陈阿姨进行上肢康复训练。完成肩关节活动度训练、握力训练和日常动作模拟。陈阿姨配合度高，疼痛等级2/10。",
      sopCheck: [
        { step: "评估", passed: true }, { step: "热身", passed: true },
        { step: "训练执行", passed: true }, { step: "放松", passed: true }, { step: "记录", passed: true },
      ],
      concerns: [], mood: "积极", healthObservations: ["右肩活动度较上次改善约10度", "握力略有提升"],
      satisfaction: "陈阿姨对训练效果满意",
    },
  },
  // ─── 3 days ago ───
  { id: "t7", serviceType: "助餐", recipientName: "张奶奶", workerName: "王建国",
    date: dateOffset(-3), dayOfWeek: dayOfWeek(dateOffset(-3)),
    startTime: "09:00", endTime: "10:00",
    location: "杭州市余杭区五常街道荆长路100号阳光花园8幢201", locationShort: "阳光花园",
    status: "completed", source: "周期计划", notes: "",
    report: {
      summary: "为张奶奶提供助餐服务。准备了粥、蒸蛋和炒时蔬。张奶奶胃口一般，进食约六成。",
      sopCheck: [
        { step: "到达确认", passed: true }, { step: "食材检查", passed: true },
        { step: "烹饪/加热", passed: true }, { step: "摆餐与陪餐", passed: true },
        { step: "餐后清理", passed: true }, { step: "记录", passed: true },
      ],
      concerns: ["食欲较上次下降，需持续观察"],
      mood: "平稳", healthObservations: ["食欲一般，进食量偏少"],
      satisfaction: "张奶奶表示满意",
    },
  },
  { id: "t8", serviceType: "健康监测", recipientName: "赵叔叔", workerName: "王建国",
    date: dateOffset(-3), dayOfWeek: dayOfWeek(dateOffset(-3)),
    startTime: "10:30", endTime: "11:30",
    location: "杭州市余杭区良渚街道玉鸟路99号万科良渚文化村3幢502", locationShort: "良渚文化村",
    status: "completed", source: "周期计划", notes: "",
    report: {
      summary: "为赵叔叔进行健康监测。血压128/82mmHg，正常；血糖5.9mmol/L，正常；心率72次/分，正常。各项指标稳定。",
      sopCheck: [
        { step: "问候与身份确认", passed: true }, { step: "健康状况询问", passed: true },
        { step: "生命体征检查", passed: true }, { step: "服务总结与满意度询问", passed: true },
      ],
      concerns: [], mood: "平稳", healthObservations: ["各项指标正常", "精神状态较上次改善"],
      satisfaction: "赵叔叔对服务表示满意",
    },
  },
  // ─── 2 days ago ───
  { id: "t9", serviceType: "常规探访", recipientName: "李大爷", workerName: "王建国",
    date: dateOffset(-2), dayOfWeek: dayOfWeek(dateOffset(-2)),
    startTime: "09:00", endTime: "10:30",
    location: "杭州市余杭区文一西路288号翡翠城5幢1单元302", locationShort: "翡翠城",
    status: "completed", source: "周期计划", notes: "",
    report: {
      summary: "对李大爷进行常规探访。李大爷反映近期睡眠改善，但仍需注意血压。药物按时服用，居家环境良好。",
      sopCheck: [
        { step: "问候与身份确认", passed: true }, { step: "健康状况询问", passed: true },
        { step: "生活环境检查", passed: true }, { step: "心理关怀", passed: true },
        { step: "需求收集", passed: true }, { step: "服务总结", passed: true },
      ],
      concerns: ["血压仍需持续监测"],
      mood: "平稳", healthObservations: ["睡眠较上次改善", "药物按时服用"],
      satisfaction: "李大爷表示满意",
    },
  },
  { id: "t10", serviceType: "助浴", recipientName: "陈阿姨", workerName: "王建国",
    date: dateOffset(-2), dayOfWeek: dayOfWeek(dateOffset(-2)),
    startTime: "14:00", endTime: "15:00",
    location: "杭州市余杭区翠苑一区12幢3单元401", locationShort: "翠苑一区",
    status: "completed", source: "临时派单", notes: "",
    report: {
      summary: "为陈阿姨提供助浴服务。室温26℃，水温39℃。洗浴过程顺利，皮肤状况良好，未发现异常。洗浴时间约18分钟。",
      sopCheck: [
        { step: "身体状况评估", passed: true }, { step: "环境检查", passed: true },
        { step: "准备", passed: true }, { step: "协助入浴", passed: true },
        { step: "清洗", passed: true }, { step: "离浴与穿衣", passed: true }, { step: "记录", passed: true },
      ],
      concerns: [], mood: "舒适", healthObservations: ["皮肤状况良好，无红肿或破损"],
      satisfaction: "陈阿姨表示很舒适",
    },
  },
  // ─── Yesterday ───
  { id: "t11", serviceType: "助餐", recipientName: "刘阿姨", workerName: "王建国",
    date: dateOffset(-1), dayOfWeek: dayOfWeek(dateOffset(-1)),
    startTime: "09:00", endTime: "10:00",
    location: "杭州市余杭区仓前街道梦想小镇天使村2幢103", locationShort: "梦想小镇",
    status: "completed", source: "周期计划", notes: "",
    report: {
      summary: "为刘阿姨提供助餐服务。准备了面条和清炒蔬菜。刘阿姨食欲良好，全部吃完。",
      sopCheck: [
        { step: "到达确认", passed: true }, { step: "食材检查", passed: true },
        { step: "烹饪/加热", passed: true }, { step: "摆餐与陪餐", passed: true },
        { step: "餐后清理", passed: true }, { step: "记录", passed: true },
      ],
      concerns: [], mood: "开心", healthObservations: ["食欲良好", "身体恢复正常"],
      satisfaction: "刘阿姨非常满意",
    },
  },
  { id: "t12", serviceType: "康复训练", recipientName: "张奶奶", workerName: "王建国",
    date: dateOffset(-1), dayOfWeek: dayOfWeek(dateOffset(-1)),
    startTime: "10:30", endTime: "11:30",
    location: "杭州市余杭区五常街道荆长路100号阳光花园8幢201", locationShort: "阳光花园",
    status: "completed", source: "周期计划", notes: "",
    report: {
      summary: "为张奶奶进行下肢康复训练。完成站立平衡训练、步行辅助训练和坐立转换练习。张奶奶配合度一般，疼痛等级3/10。",
      sopCheck: [
        { step: "评估", passed: true }, { step: "热身", passed: true },
        { step: "训练执行", passed: true }, { step: "放松", passed: true },
        { step: "记录", passed: false },
      ],
      concerns: ["训练记录填写不完整，需补充"],
      mood: "平稳", healthObservations: ["左膝关节活动时有轻微疼痛", "平衡能力较上次有改善"],
      satisfaction: "张奶奶表示还行",
    },
  },
  // ─── Today ───
  { id: "t13", serviceType: "健康监测", recipientName: "陈阿姨", workerName: "王建国",
    date: TODAY_STR, dayOfWeek: dayOfWeek(TODAY_STR),
    startTime: "09:00", endTime: "10:00",
    location: "杭州市余杭区翠苑一区12幢3单元401", locationShort: "翠苑一区",
    status: "pending", source: "周期计划", notes: "",
    serviceContext: { dietary: "低盐低糖", lastNote: "上次食欲下降，进食量约六成", familyConcern: "请留意是否按时吃药" },
  },
  { id: "t14", serviceType: "助餐", recipientName: "李大爷", workerName: "王建国",
    date: TODAY_STR, dayOfWeek: dayOfWeek(TODAY_STR),
    startTime: "11:00", endTime: "12:00",
    location: "杭州市余杭区文一西路288号翡翠城5幢1单元302", locationShort: "翡翠城",
    status: "pending", source: "临时派单", notes: "",
    serviceContext: { dietary: "低脂", lastNote: "血压偏高(152/95)，睡眠质量下降", familyConcern: "注意血压变化" },
  },
  { id: "t15", serviceType: "助浴", recipientName: "王奶奶", workerName: "王建国",
    date: TODAY_STR, dayOfWeek: dayOfWeek(TODAY_STR),
    startTime: "14:00", endTime: "15:30",
    location: "杭州市余杭区五常街道荆长路100号阳光花园8幢201", locationShort: "阳光花园",
    status: "completed", source: "周期计划", notes: "",
    serviceContext: { lastNote: "皮肤状况良好，喜欢聊天", familyConcern: "注意保暖" },
    report: {
      summary: "为王奶奶提供助浴服务。室温26℃，水温39℃。洗浴过程顺利，皮肤状况良好，未发现异常。",
      sopCheck: [
        { step: "安全评估", passed: true }, { step: "水温确认", passed: true },
        { step: "协助沐浴", passed: true }, { step: "皮肤检查", passed: true },
      ],
      concerns: [], mood: "舒适", healthObservations: ["皮肤状况良好"],
      satisfaction: "王奶奶表示很舒适",
    },
  },
  // ─── Tomorrow ───
  { id: "t16", serviceType: "常规探访", recipientName: "刘阿姨", workerName: "王建国",
    date: dateOffset(1), dayOfWeek: dayOfWeek(dateOffset(1)),
    startTime: "10:00", endTime: "11:30",
    location: "杭州市余杭区仓前街道梦想小镇天使村2幢103", locationShort: "梦想小镇",
    status: "pending", source: "周期计划", notes: "",
  },
  // ─── 2 days from now ───
  { id: "t17", serviceType: "助餐", recipientName: "陈阿姨", workerName: "王建国",
    date: dateOffset(2), dayOfWeek: dayOfWeek(dateOffset(2)),
    startTime: "09:00", endTime: "10:00",
    location: "杭州市余杭区翠苑一区12幢3单元401", locationShort: "翠苑一区",
    status: "pending", source: "周期计划", notes: "",
  },
  { id: "t18", serviceType: "助浴", recipientName: "赵叔叔", workerName: "王建国",
    date: dateOffset(2), dayOfWeek: dayOfWeek(dateOffset(2)),
    startTime: "14:00", endTime: "15:00",
    location: "杭州市余杭区良渚街道玉鸟路99号万科良渚文化村3幢502", locationShort: "良渚文化村",
    status: "pending", source: "周期计划", notes: "",
  },
  // ─── 3 days from now ───
  { id: "t19", serviceType: "康复训练", recipientName: "李大爷", workerName: "王建国",
    date: dateOffset(3), dayOfWeek: dayOfWeek(dateOffset(3)),
    startTime: "14:00", endTime: "15:30",
    location: "杭州市余杭区文一西路288号翡翠城5幢1单元302", locationShort: "翡翠城",
    status: "pending", source: "周期计划", notes: "",
  },
];

const MOCK_SOPS: SopFolder[] = [
  {
    id: "sop1", name: "上门服务通用规范", type: "general", version: 2, updatedAt: "2026-05-10",
    content: `# 上门服务通用规范

## 一、服务前准备

1. **出发前检查**：确认服务工具包完整（工牌、手套、鞋套、消毒用品、服务记录表）。
2. **确认信息**：核对服务对象姓名、地址、联系方式、特殊注意事项。
3. **着装要求**：统一工装，佩戴工牌，保持整洁得体。

## 二、到达与开场

1. **准时到达**：提前5分钟到达服务地点。
2. **敲门/按铃**：轻敲三下或按铃一次，等待开门，不可大声喊叫。
3. **自我介绍**：出示工牌，确认服务对象身份。
4. **穿戴用品**：进门换鞋套，必要时戴手套。

## 三、服务过程

1. **沟通态度**：语速适中，音量适当，使用尊称。
2. **隐私保护**：不窥探服务对象隐私，不拍照录像（除工作需要）。
3. **安全意识**：注意地面湿滑、电器安全、老人跌倒风险。
4. **服务记录**：如实记录服务内容、时间、服务对象状态。

## 四、服务结束

1. **服务复述**：向服务对象复述本次完成的服务内容。
2. **满意度询问**：询问服务满意度和改进建议。
3. **物品归位**：确认所有物品归位，垃圾带走。

## 五、禁止行为

- 向服务对象推销任何商品。
- 私下收取费用或接受贵重礼物。
- 在服务期间使用手机（紧急情况除外）。
- 与服务对象发生争执。`,
  },
  {
    id: "sop2", name: "安全与应急处理规范", type: "general", version: 1, updatedAt: "2026-05-08",
    content: `# 安全与应急处理规范

## 一、常见应急情况

### 1. 服务对象跌倒
- 不要急于搬动，先评估意识和伤情。
- 如无明显骨折，协助缓慢起身。
- 如有骨折嫌疑或意识不清，立即拨打120并通知主管。

### 2. 服务对象突发疾病
- 保持冷静，记录症状（胸痛、呼吸困难、头晕等）。
- 拨打120，同时通知家属和主管。
- 协助服务对象保持舒适体位。

### 3. 服务对象情绪激动
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
- 确认服务对象身份和当日用餐需求。
- 了解饮食禁忌和过敏信息。

### 步骤二：食材检查
- 检查食材新鲜度和保质期。
- 如由平台配送，核对配送清单。

### 步骤三：烹饪/加热
- 按服务对象口味偏好烹饪。
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

1. **身体状况评估**：确认服务对象当日身体状况适合洗浴。
2. **环境检查**：检查浴室防滑垫、扶手、水温控制设备。
3. **禁忌确认**：饭后1小时内、血压异常、皮肤破损等情况暂缓服务。

## 服务流程

### 步骤一：准备
- 调节室温（24-26℃）和水温（38-40℃）。
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

定期了解服务对象生活状况、健康变化、心理状态，及时发现风险。

## 服务流程

### 步骤一：问候与身份确认
- 自我介绍，确认服务对象身份。
- 观察服务对象精神状态。

### 步骤二：健康状况询问
- 近期饮食、睡眠情况。
- 用药情况（是否按时、有无不适）。
- 身体不适症状。

### 步骤三：生活环境检查
- 居家安全隐患排查（电线、地面、通风）。
- 食品保质期检查。
- 生活用品是否充足。

### 步骤四：心理关怀
- 倾听服务对象心声。
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

术后恢复、中风后遗症、骨关节疾病、长期卧床等需要功能训练的服务对象。

## 服务流程

### 步骤一：评估
- 确认服务对象当日身体状况。
- 查看康复计划和上次训练记录。
- 评估疼痛等级（0-10分）。

### 步骤二：热身
- 5分钟轻度关节活动。
- 从远端向近端逐步活动。

### 步骤三：训练执行
- 按康复计划执行训练项目。
- 每个动作示范后再协助完成。
- 训练强度循序渐进，不可过度。
- 全程观察服务对象面色和反应。

### 步骤四：放松
- 5分钟拉伸放松。
- 必要时冷敷或热敷。

### 步骤五：记录
- 记录训练内容、完成度、疼痛反馈。
- 记录需要调整的训练项目。
- 与服务对象沟通下次训练安排。`,
  },
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  completed: "已完成",
  abnormal: "异常",
  pending: "待服务",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  completed: "#10B981",
  abnormal: "#EF4444",
  pending: "#F59E0B",
};

/* ─── AI Assistant Mock Data ─── */

interface AiMessage {
  id: number;
  role: "user" | "ai";
  text: string;
}

const AI_KEYWORD_RESPONSES: { keywords: string[]; response: string }[] = [
  { keywords: ["任务", "今天", "安排", "计划"], response: "今天您还有待完成的任务，请注意按时到达服务对象家中，出发前确认好服务工具包。" },
  { keywords: ["助浴", "洗浴", "水温"], response: "助浴服务的水温建议控制在38-40℃，室温24-26℃，洗浴时间不超过20分钟。服务前需确认服务对象当日身体状况适合洗浴。" },
  { keywords: ["紧急", "应急", "跌倒", "突发"], response: "如遇服务对象突发身体不适，请先保持冷静，评估意识和伤情，必要时拨打120并通知主管。所有异常情况须在30分钟内通过系统上报。" },
  { keywords: ["助餐", "饮食", "做饭", "禁忌"], response: "根据SOP规范，助餐服务需要先确认服务对象的饮食禁忌和过敏信息，控制油盐用量，观察进食情况并记录用餐量。" },
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
};

const SOP_BRIEF: Record<string, string[]> = {
  "助餐": ["确认禁忌", "食材检查", "备餐", "陪餐", "餐后清理", "记录"],
  "助浴": ["身体评估", "环境检查", "调温", "协助入浴", "清洗", "离浴穿衣", "记录"],
  "常规探访": ["问候确认", "健康询问", "环境检查", "心理关怀", "需求收集", "服务总结"],
  "探访关爱": ["确认身份", "健康询问", "生活照料", "心理关怀", "记录"],
  "康复训练": ["评估", "热身", "训练执行", "放松", "记录"],
  "健康监测": ["问候确认", "健康询问", "体征检查", "总结与满意度"],
  "助洁": ["到达确认", "清洁区域确认", "清洁执行", "物品归位", "服务总结"],
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

/* ─── Badge Hook (imported from useBadge.ts) ─── */
// Full badge state machine is in useBadge.ts with phases:
// none → pre_service → active_service → post_service → none

/* ─── Helpers ─── */

function formatDateTitle(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${DAY_NAMES[d.getDay()]}`;
}

function getWeekDates(baseDate: Date): string[] {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay()); // Sunday
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

/* ─── Sub-components ─── */

/** Badge status chip in header — supports full service phase lifecycle */
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

  // Post-service countdown
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

/** Week date strip */
function WeekStrip({
  weekDates, selectedDate, todayStr, tasks, onSelect,
}: {
  weekDates: string[];
  selectedDate: string;
  todayStr: string;
  tasks: ServiceTask[];
  onSelect: (d: string) => void;
}) {
  const tasksByDate = useMemo(() => {
    const map = new Map<string, ServiceTask[]>();
    for (const t of tasks) {
      const arr = map.get(t.date) || [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return map;
  }, [tasks]);

  return (
    <div className="cw-week-strip">
      {weekDates.map((dateStr) => {
        const d = new Date(dateStr);
        const isSelected = dateStr === selectedDate;
        const isToday = dateStr === todayStr;
        const dayTasks = tasksByDate.get(dateStr) || [];
        let cls = "cw-week-strip__day";
        if (isSelected) cls += " cw-week-strip__day--selected";
        if (isToday) cls += " cw-week-strip__day--today";
        return (
          <button key={dateStr} className={cls} onClick={() => onSelect(dateStr)}>
            <span className="cw-week-strip__label">{DAY_NAMES[d.getDay()].slice(1)}</span>
            <span className="cw-week-strip__num">{d.getDate()}</span>
            <span className="cw-week-strip__dots">
              {dayTasks.slice(0, 3).map((t, i) => (
                <span key={i} className="cw-week-strip__dot" style={{ background: STATUS_COLORS[t.status] }} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Single task card */
function TaskCard({ task, onClick }: { task: ServiceTask; onClick: () => void }) {
  return (
    <div className="cw-task-card" onClick={onClick}>
      <div className="cw-task-card__color-bar" style={{ background: STATUS_COLORS[task.status] }} />
      <div className="cw-task-card__body">
        <div className="cw-task-card__top">
          <span className="cw-task-card__type">{task.serviceType}</span>
          <span className={`cw-task-card__status cw-task-card__status--${task.status}`}>
            {STATUS_LABELS[task.status]}
          </span>
        </div>
        <div className="cw-task-card__recipient">{task.recipientName}</div>
        <div className="cw-task-card__meta">
          <span className="cw-task-card__meta-item"><IconClock /> {task.startTime}-{task.endTime}</span>
          <span className="cw-task-card__meta-item"><IconPin /> {task.locationShort}</span>
        </div>
      </div>
    </div>
  );
}

/** Task detail drawer */
function TaskDetailDrawer({
  task, onClose, onStartService, onStopService, isServicing, onNavigate,
}: {
  task: ServiceTask;
  onClose: () => void;
  onStartService: (taskId: string) => void;
  onStopService: (taskId: string) => void;
  isServicing: string | null;
  onNavigate: (address: string) => void;
}) {
  const [sopChecked, setSopChecked] = useState<Set<number>>(new Set());
  const [expandedSop, setExpandedSop] = useState<number | null>(null);
  const sopSteps = task.report?.sopCheck.map(s => s.step) ?? getDefaultSopSteps(task.serviceType);
  const sopDetails = getSopStepDetails(task.serviceType);

  // Pre-populate checked steps for completed tasks
  useEffect(() => {
    if (task.report) {
      const checked = new Set<number>();
      task.report.sopCheck.forEach((s, i) => { if (s.passed) checked.add(i); });
      setSopChecked(checked);
    } else {
      setSopChecked(new Set());
    }
  }, [task.id, task.report]);

  const toggleSop = (_idx: number) => {
    // SOP checklist is read-only — completion is determined by AI after recording
  };

  const isActiveService = isServicing === task.id;

  return (
    <div className="cw-drawer-overlay" onClick={onClose}>
      <div className="cw-drawer" onClick={e => e.stopPropagation()}>
        <div className="cw-drawer__handle" />
        <div className="cw-drawer__header">
          <div className="cw-drawer__title">{task.serviceType} - {task.recipientName}</div>
          <button className="cw-drawer__close" onClick={onClose}><IconX /></button>
        </div>
        <div className="cw-drawer__body">
          {/* Info rows */}
          <div className="cw-detail-info">
            <div className="cw-detail-row">
              <div className="cw-detail-row__icon"><IconUser /></div>
              <div>
                <div className="cw-detail-row__label">服务对象</div>
                <div className="cw-detail-row__value">{task.recipientName}</div>
              </div>
            </div>
            <div className="cw-detail-row">
              <div className="cw-detail-row__icon"><IconClock /></div>
              <div>
                <div className="cw-detail-row__label">服务时间</div>
                <div className="cw-detail-row__value">{formatDateTitle(task.date)} {task.startTime}-{task.endTime}</div>
              </div>
            </div>
            <div className="cw-detail-row">
              <div className="cw-detail-row__icon"><IconPin /></div>
              <div className="cw-detail-row__content">
                <div className="cw-detail-row__label">服务地点</div>
                <div className="cw-detail-row__value">{task.location}</div>
              </div>
              <button className="cw-nav-btn" onClick={() => onNavigate(task.location)}>导航</button>
            </div>
            {task.notes && (
              <div className="cw-detail-row">
                <div className="cw-detail-row__icon"><IconFileText /></div>
                <div>
                  <div className="cw-detail-row__label">备注</div>
                  <div className="cw-detail-row__value">{task.notes}</div>
                </div>
              </div>
            )}
          </div>

          {/* SOP checklist — tappable for details, AI-filled completion after service */}
          <div className="cw-sop-section">
            <div className="cw-sop-section__title">SOP 执行清单{task.status === "pending" ? "（完成情况由AI自动分析）" : ""}</div>
            <div className="cw-sop-list">
              {sopSteps.map((step, idx) => {
                const done = sopChecked.has(idx);
                const detail = sopDetails[idx]?.detail;
                const isExpanded = expandedSop === idx;
                return (
                  <div key={idx} className="cw-sop-item" onClick={() => setExpandedSop(isExpanded ? null : idx)} style={{ cursor: "pointer" }}>
                    <div className={`cw-sop-item__check ${done ? "cw-sop-item__check--done" : ""}`}>
                      {done ? <IconCheck /> : <span style={{ fontSize: 11, color: "#94A3B8" }}>{idx + 1}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span className={`cw-sop-item__label ${done ? "cw-sop-item__label--done" : ""}`}>
                        {step}
                      </span>
                      {isExpanded && detail && (
                        <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6, marginTop: 6, paddingRight: 8 }}>
                          {detail}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: "#CBD5E1", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Service action */}
          {task.status === "pending" && !isActiveService && (
            <button
              className="cw-service-btn cw-service-btn--start"
              onClick={() => onStartService(task.id)}
            >
              开始服务
            </button>
          )}
          {isActiveService && (
            <button
              className="cw-service-btn cw-service-btn--stop"
              onClick={() => onStopService(task.id)}
            >
              结束服务
            </button>
          )}
          {task.status === "completed" && (
            <button className="cw-service-btn cw-service-btn--completed" disabled>
              服务已完成
            </button>
          )}

          {/* Service report */}
          {task.report && (
            <div className="cw-report">
              <div className="cw-report__title">服务报告</div>
              <div className="cw-report__summary">{task.report.summary}</div>

              <div className="cw-report__section">
                <div className="cw-report__label">情绪状态</div>
                <div className="cw-report__value">{task.report.mood}</div>
              </div>

              {task.report.healthObservations.length > 0 && (
                <div className="cw-report__section">
                  <div className="cw-report__label">健康观察</div>
                  <div className="cw-report__tags">
                    {task.report.healthObservations.map((obs, i) => (
                      <span key={i} className="cw-report__tag">{obs}</span>
                    ))}
                  </div>
                </div>
              )}

              {task.report.concerns.length > 0 && (
                <div className="cw-report__section">
                  <div className="cw-report__label">关注事项</div>
                  <div className="cw-report__tags">
                    {task.report.concerns.map((c, i) => (
                      <span key={i} className="cw-report__tag cw-report__tag--concern">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="cw-report__section">
                <div className="cw-report__label">满意度</div>
                <div className="cw-report__value">{task.report.satisfaction}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** SOP reference list */
function ReferenceList({ onSelectSop }: { onSelectSop: (sop: SopFolder) => void }) {
  const general = MOCK_SOPS.filter(s => s.type === "general");
  const service = MOCK_SOPS.filter(s => s.type === "service");

  return (
    <div className="cw-ref-list">
      <div className="cw-ref-group__title">通用规范</div>
      {general.map(sop => (
        <div key={sop.id} className="cw-ref-item" onClick={() => onSelectSop(sop)}>
          <div className="cw-ref-item__icon"><IconFileText /></div>
          <div className="cw-ref-item__body">
            <div className="cw-ref-item__name">{sop.name}</div>
            <div className="cw-ref-item__meta">v{sop.version} · 更新于 {sop.updatedAt}</div>
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
            <div className="cw-ref-item__meta">v{sop.version} · 更新于 {sop.updatedAt}</div>
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
          <div className="cw-login__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
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
          <div className="cw-login__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
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
      { name: "确认身份", detail: "到达后先自报姓名和机构，确认服务对象身份，出示工牌。观察对象精神面貌。" },
      { name: "健康状况询问", detail: "询问近期身体状况：睡眠、食欲、疼痛、服药情况。如有血压计可测量血压。" },
      { name: "生活照料检查", detail: "检查居家环境是否整洁安全，食物是否充足，水电煤气是否正常。注意跌倒风险。" },
      { name: "心理关怀", detail: "关注情绪状态，耐心倾听。注意是否有孤独、焦虑、抑郁等情绪。鼓励参与社交活动。" },
      { name: "服务记录填写", detail: "总结本次服务发现，记录健康观察和注意事项。告别时确认下次服务时间。" },
    ],
    "助餐": [
      { name: "到达确认", detail: "到达后确认身份，了解今日饮食需求和禁忌。检查厨房卫生状况。" },
      { name: "食材检查", detail: "检查食材新鲜度和保质期。确认是否有过敏食材。按低盐低糖低油标准准备。" },
      { name: "烹饪/加热", detail: "按服务对象口味烹饪，注意食物软硬度适合老人咀嚼。确保食物温度适宜。" },
      { name: "摆餐与陪餐", detail: "摆放餐具，协助就座。陪同用餐，观察进食量和咀嚼吞咽情况。" },
      { name: "餐后清理", detail: "收拾餐桌，清洗餐具，整理厨房。确认服务对象餐后状态。" },
      { name: "记录", detail: "记录进食量、食欲情况、特殊观察。提醒餐后服药（如有需要）。" },
    ],
    "助浴": [
      { name: "安全评估", detail: "评估服务对象当日身体状况是否适合洗浴。检查浴室防滑设施和扶手。" },
      { name: "水温确认", detail: "调节水温至38-40℃，请服务对象确认温度舒适。准备好干净衣物和浴巾。" },
      { name: "协助沐浴", detail: "全程陪护，防止滑倒。注意保护隐私和尊严。根据需要协助清洗。" },
      { name: "皮肤检查", detail: "洗浴过程中观察皮肤状况，注意是否有红肿、破损、压疮等异常。" },
      { name: "记录", detail: "记录洗浴时长、皮肤状况、服务对象反馈。整理浴室恢复原状。" },
    ],
    "助洁": [
      { name: "到达确认", detail: "到达后确认清洁区域和重点需求。了解物品摆放习惯，避免随意移动。" },
      { name: "清洁区域确认", detail: "与服务对象确认需要清洁的房间和区域。注意贵重物品和私人物品。" },
      { name: "清洁执行", detail: "按先卧室后客厅、先高后低的顺序清洁。使用对象家中的清洁用品。" },
      { name: "物品归位", detail: "清洁后物品放回原位。垃圾分类处理。检查是否遗漏。" },
      { name: "服务总结", detail: "请服务对象检查清洁效果。记录服务内容和特殊发现。" },
    ],
    "健康监测": [
      { name: "问候与身份确认", detail: "到达后问候并确认身份。说明本次监测内容。" },
      { name: "健康状况询问", detail: "询问近期身体感受、睡眠、饮食、排便等情况。了解服药依从性。" },
      { name: "生命体征检查", detail: "测量血压、心率、血糖等指标。如有异常及时记录并告知对象。" },
      { name: "服务总结与满意度询问", detail: "汇总监测结果，给出简单建议。询问服务满意度。" },
    ],
    "常规探访": [
      { name: "问候与身份确认", detail: "到达后先自报姓名和机构，确认服务对象身份。" },
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
      { name: "记录", detail: "记录训练内容、完成情况、疼痛等级变化和服务对象反馈。" },
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
      {/* FAB */}
      {!open && (
        <button className="cw-ai-fab" onClick={() => setOpen(true)} aria-label="AI助手">
          <IconChat />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="cw-ai-panel">
          {/* Header */}
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

          {/* Messages */}
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

          {/* Input */}
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

/* ─── Current Service Banner Component ─── */

function useServicePhase(
  servicingTaskId: string | null,
  tasks: ServiceTask[],
): { phase: ServicePhase; task: ServiceTask | null; serviceStartTime: number | null; serviceEndTime: number | null } {
  const [serviceStartTime, setServiceStartTime] = useState<number | null>(null);
  const [serviceEndTime, setServiceEndTime] = useState<number | null>(null);
  const [postTask, setPostTask] = useState<ServiceTask | null>(null);
  const [, setTick] = useState(0);

  // Tick every 30s to re-evaluate upcoming tasks
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Track service start/stop
  useEffect(() => {
    if (servicingTaskId) {
      setServiceStartTime(prev => prev ?? Date.now());
      setServiceEndTime(null);
      setPostTask(null);
    } else if (serviceStartTime && !serviceEndTime) {
      // Just stopped
      setServiceEndTime(Date.now());
      const task = tasks.find(t => t.id === servicingTaskId) ?? null;
      setPostTask(task);
    }
  }, [servicingTaskId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Active service
  if (servicingTaskId) {
    const task = tasks.find(t => t.id === servicingTaskId) ?? null;
    return { phase: "active", task, serviceStartTime, serviceEndTime: null };
  }

  // Post-service window (30 min)
  if (serviceEndTime && postTask) {
    const elapsed = Date.now() - serviceEndTime;
    if (elapsed < POST_SERVICE_WINDOW_MS) {
      return { phase: "post", task: postTask, serviceStartTime: null, serviceEndTime };
    }
  }

  // Pre-service: check if any task starts within 15 min
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const pendingToday = tasks.filter(t => t.date === todayStr && t.status === "pending");
  for (const task of pendingToday) {
    const [h, m] = task.startTime.split(":").map(Number);
    const taskStart = new Date(now);
    taskStart.setHours(h, m, 0, 0);
    const diff = taskStart.getTime() - now.getTime();
    if (diff > 0 && diff <= PRE_SERVICE_MINUTES * 60 * 1000) {
      return { phase: "pre", task, serviceStartTime: null, serviceEndTime: null };
    }
  }

  return { phase: "idle", task: null, serviceStartTime: null, serviceEndTime: null };
}

function CurrentServiceBanner({
  phase, task, serviceStartTime, serviceEndTime,
}: {
  phase: ServicePhase;
  task: ServiceTask | null;
  serviceStartTime: number | null;
  serviceEndTime: number | null;
}) {
  if (phase === "idle" || !task) return null;

  if (phase === "pre") return <PreServiceBanner task={task} />;
  if (phase === "active") return <ActiveServiceBanner task={task} recordingStartTime={serviceStartTime} />;
  if (phase === "post") return <PostServiceBanner task={task} recordingEndTime={serviceEndTime} />;
  return null;
}

function PreServiceBanner({ task }: { task: ServiceTask }) {
  const ctx = MOCK_CONTEXT[task.recipientName] ?? {};
  const sopSteps = SOP_BRIEF[task.serviceType] ?? [];

  return (
    <div className="cw-banner cw-banner--pre">
      <div className="cw-banner__top">
        <div className="cw-banner__indicator">
          <span className="cw-banner__icon-pre">&#128276;</span>
          <span className="cw-banner__phase-label cw-banner__phase-label--pre">即将服务: {task.recipientName}</span>
        </div>
        <span className="cw-banner__time">{task.startTime}</span>
      </div>
      <div className="cw-banner__service-info">
        <span className="cw-banner__service-type">{task.serviceType}</span>
        <span className="cw-banner__service-detail"> &middot; {task.recipientName} &middot; {task.locationShort}</span>
      </div>
      <div className="cw-banner__divider cw-banner__divider--pre" />
      <div className="cw-banner__context">
        {ctx.dietary && (
          <div className="cw-banner__context-row">
            <span className="cw-banner__context-icon cw-banner__context-icon--warn">&#9888;</span>
            <span>饮食禁忌：{ctx.dietary}</span>
          </div>
        )}
        {ctx.lastNote && (
          <div className="cw-banner__context-row">
            <span className="cw-banner__context-icon">&#128203;</span>
            <span>上次情况：{ctx.lastNote}</span>
          </div>
        )}
        {ctx.familyConcern && (
          <div className="cw-banner__context-row">
            <span className="cw-banner__context-icon">&#128106;</span>
            <span>家属关注：{ctx.familyConcern}</span>
          </div>
        )}
        {sopSteps.length > 0 && (
          <div className="cw-banner__context-row">
            <span className="cw-banner__context-icon">&#128221;</span>
            <span>SOP 要点：{sopSteps.join(" → ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveServiceBanner({ task, recordingStartTime }: { task: ServiceTask; recordingStartTime: number | null }) {
  const [elapsed, setElapsed] = useState("00:00");
  const sopSteps = SOP_BRIEF[task.serviceType] ?? [];

  useEffect(() => {
    if (!recordingStartTime) return;
    const tick = () => {
      const s = Math.floor((Date.now() - recordingStartTime) / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      setElapsed(`${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [recordingStartTime]);

  return (
    <div className="cw-banner cw-banner--active">
      <div className="cw-banner__top">
        <div className="cw-banner__indicator">
          <span className="cw-banner__pulse-dot" />
          <span className="cw-banner__phase-label cw-banner__phase-label--active">正在服务: {task.recipientName}</span>
        </div>
        <span className="cw-banner__timer">{elapsed}</span>
      </div>
      <div className="cw-banner__service-info">
        <span className="cw-banner__service-type">{task.serviceType}</span>
        <span className="cw-banner__service-detail"> &middot; {task.recipientName} &middot; {task.locationShort}</span>
      </div>
      {sopSteps.length > 0 && (
        <>
          <div className="cw-banner__divider cw-banner__divider--active" />
          <div className="cw-banner__sop-brief">
            {sopSteps.map((step, i) => (
              <span key={i} className="cw-banner__sop-step">{step}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PostServiceBanner({ task, recordingEndTime }: { task: ServiceTask; recordingEndTime: number | null }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!recordingEndTime) return;
    const tick = () => {
      const left = POST_SERVICE_WINDOW_MS - (Date.now() - recordingEndTime);
      if (left <= 0) { setRemaining("已过期"); return; }
      const m = Math.floor(left / 60000);
      setRemaining(`${m}分钟内可编辑`);
    };
    tick();
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, [recordingEndTime]);

  return (
    <div className="cw-banner cw-banner--post">
      <div className="cw-banner__top">
        <div className="cw-banner__indicator">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          <span className="cw-banner__phase-label cw-banner__phase-label--post">服务刚结束: {task.recipientName}</span>
        </div>
        <span className="cw-banner__remaining">{remaining}</span>
      </div>
      <div className="cw-banner__service-info">
        <span className="cw-banner__service-type">{task.serviceType}</span>
        <span className="cw-banner__service-detail"> &middot; {task.recipientName} &middot; {task.locationShort}</span>
      </div>
    </div>
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

/* ─── Main Page Component ─── */

export function CareworkerPage() {
  const [worker, setWorker] = useState<DemoWorker | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [selectedTask, setSelectedTask] = useState<ServiceTask | null>(null);
  const [selectedSop, setSelectedSop] = useState<SopFolder | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [servicingTaskId, setServicingTaskId] = useState<string | null>(null);
  const [mapAddress, setMapAddress] = useState<string | null>(null);

  // Restore session from localStorage on mount
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

  const [apiTasks, setApiTasks] = useState<ServiceTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    if (!worker) { setTasksLoading(false); return; }
    setTasksLoading(true);
    const token = localStorage.getItem("gy_careworker_token");
    fetch(`/api/service-schedule-occurrences?userId=${worker.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(data => {
        const schedules = data.serviceSchedules ?? [];
        const tasks: ServiceTask[] = schedules
          .filter((s: any) => s.status !== "cancelled")
          .map((s: any) => ({
            id: s.id,
            serviceType: s.serviceProject || "探访关爱",
            recipientName: s.serviceObjectName || "",
            workerName: worker.name,
            date: s.serviceDate,
            dayOfWeek: DAY_NAMES[new Date(s.serviceDate).getDay()],
            startTime: s.startTime || "",
            endTime: s.endTime || "",
            location: s.addressSnapshot || s.address || "",
            locationShort: (s.addressSnapshot || s.address || "").slice(-10),
            status: (s.status === "completed" ? "completed" : "pending") as TaskStatus,
            source: s.source === "service_plan" ? "周期计划" : "临时派单",
            notes: s.notes || "",
            serviceObjectId: s.serviceObjectId,
            serviceObjectContext: s.serviceObjectContext,
          }));
        setApiTasks(tasks);
        setTasksLoading(false);
      })
      .catch(() => { setApiTasks([]); setTasksLoading(false); });
  }, [worker]);

  // Find the next pending task's start time for pre-service detection
  const nextPendingStart = useMemo(() => {
    const now = new Date();
    const todayDate = now.toISOString().slice(0, 10);
    const pending = apiTasks.filter(t => t.date === todayDate && t.status === "pending");
    if (pending.length === 0) return null;
    return pending.sort((a, b) => a.startTime.localeCompare(b.startTime))[0].startTime;
  }, [apiTasks]);
  const badge = useBadgeHook(nextPendingStart);
  const serviceState = useServicePhase(servicingTaskId, apiTasks);

  // Calendar state with multi-view support (day/week/month)
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const [calViewMode, setCalViewMode] = useState<CalendarViewMode>("week");
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const tasksForDate = useMemo(
    () => apiTasks.filter(t => t.date === selectedDate),
    [selectedDate, apiTasks],
  );

  const totalPending = useMemo(
    () => apiTasks.filter(t => t.date === selectedDate && t.status === "pending").length,
    [selectedDate, apiTasks],
  );

  const handleCalNavigate = useCallback((dir: number) => {
    setCurrentDate(prev => navigateCalendar(prev, calViewMode, dir));
    if (calViewMode === "day") {
      const nd = navigateCalendar(currentDate, calViewMode, dir);
      setSelectedDate(nd.toISOString().slice(0, 10));
    }
  }, [calViewMode, currentDate]);

  const goToday = useCallback(() => {
    setCurrentDate(today);
    setSelectedDate(todayStr);
  }, [today, todayStr]);

  const handleViewModeChange = useCallback((mode: CalendarViewMode) => {
    setCalViewMode(mode);
    setSelectedDate(currentDate.toISOString().slice(0, 10));
  }, [currentDate]);

  const handleStartService = useCallback((taskId: string) => {
    window.location.href = `/careworker/hardware?scheduleId=${taskId}`;
  }, []);

  const handleStopService = useCallback((_taskId: string) => {
    setServicingTaskId(null);
  }, []);

  const handleLogout = useCallback(() => {
    setShowLogout(false);
    setWorker(null);
    setActiveTab("tasks");
    setServicingTaskId(null);
    localStorage.removeItem("gy_careworker_token");
  }, []);

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

  if (window.location.pathname.startsWith("/careworker/hardware")) {
    if (tasksLoading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#667386" }}>加载任务中...</div>;
    const params = new URLSearchParams(window.location.search);
    const scheduleId = params.get("scheduleId");
    const matchedTask = scheduleId ? apiTasks.find(t => t.id === scheduleId) : undefined;
    const simTask = matchedTask ? {
      scheduleId: matchedTask.id,
      serviceObjectId: matchedTask.serviceObjectId ?? "",
      serviceObjectName: matchedTask.recipientName,
      serviceProject: matchedTask.serviceType,
      clientContext: matchedTask.serviceObjectContext
        ? `注意事项: ${JSON.stringify(matchedTask.serviceObjectContext.careNotes ?? [])}; 风险标签: ${JSON.stringify(matchedTask.serviceObjectContext.riskTags ?? [])}`
        : "",
    } : undefined;
    return <HardwareSimulator worker={worker} task={simTask} />;
  }

  return (
    <div className="cw-shell">
      {/* Header */}
      <header className="cw-header">
        <div className="cw-header__user">
          <div className="cw-header__avatar">{worker.name[0]}</div>
          <div>
            <div className="cw-header__name">{worker.name}</div>
            <div className="cw-header__role">{worker.site}</div>
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
        {activeTab === "tasks" && (
          <>
            {/* Calendar navigation with view mode toggle */}
            <div className="cw-day-nav">
              <div className="cw-day-nav__left">
                <button className="cw-day-nav__arrow" onClick={() => handleCalNavigate(-1)}><IconChevronLeft /></button>
                <span className="cw-day-nav__title">{getHeaderTitle(calViewMode, currentDate)}</span>
                <button className="cw-day-nav__arrow" onClick={() => handleCalNavigate(1)}><IconChevronRight /></button>
                <button className="cw-day-nav__today" onClick={goToday}>{getQuickLabel(calViewMode)}</button>
              </div>
              <CalendarToggle viewMode={calViewMode} onChange={handleViewModeChange} />
            </div>

            {/* Calendar views */}
            {calViewMode === "week" && (
              <>
                <WeekStrip
                  weekDates={weekDates}
                  selectedDate={selectedDate}
                  todayStr={todayStr}
                  tasks={apiTasks}
                  onSelect={setSelectedDate}
                />

                {/* Current service banner */}
                <CurrentServiceBanner
                  phase={serviceState.phase}
                  task={serviceState.task}
                  serviceStartTime={serviceState.serviceStartTime}
                  serviceEndTime={serviceState.serviceEndTime}
                />

                {/* Task list */}
                <div className="cw-task-list">
                  {tasksForDate.length === 0 ? (
                    <div className="cw-task-list__empty">当日无服务安排</div>
                  ) : (
                    tasksForDate.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                    ))
                  )}
                </div>
              </>
            )}

            {calViewMode === "day" && (
              <DayView
                currentDate={currentDate}
                todayStr={todayStr}
                tasks={apiTasks}
                onSelectTask={setSelectedTask}
              />
            )}

            {calViewMode === "month" && (
              <MonthView
                currentDate={currentDate}
                selectedDate={selectedDate}
                todayStr={todayStr}
                tasks={apiTasks}
                onSelectDate={setSelectedDate}
                onSelectTask={setSelectedTask}
              />
            )}
          </>
        )}

        {activeTab === "reference" && (
          <ReferenceList onSelectSop={setSelectedSop} />
        )}
      </main>

      {/* Tab bar */}
      <nav className="cw-tabbar">
        <button
          className={`cw-tabbar__item ${activeTab === "tasks" ? "cw-tabbar__item--active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          <IconCalendar color={activeTab === "tasks" ? "#0052CC" : "#9CA3AF"} />
          <span className="cw-tabbar__label">我的任务</span>
        </button>
        <button
          className={`cw-tabbar__item ${activeTab === "reference" ? "cw-tabbar__item--active" : ""}`}
          onClick={() => setActiveTab("reference")}
        >
          <IconBook color={activeTab === "reference" ? "#0052CC" : "#9CA3AF"} />
          <span className="cw-tabbar__label">参考资料</span>
        </button>
      </nav>

      {/* Task detail drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStartService={handleStartService}
          onStopService={handleStopService}
          isServicing={servicingTaskId}
          onNavigate={(addr) => { setSelectedTask(null); setMapAddress(addr); }}
        />
      )}

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

      {/* AI Assistant */}
      <AiAssistant />

      {/* Floating record button */}
      <button
        className="cw-float-record"
        onClick={() => { window.location.href = "/careworker/hardware"; }}
        title="开始录音"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="6" fill="currentColor" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </button>
    </div>
  );
}
