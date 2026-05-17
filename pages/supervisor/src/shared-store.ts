import type { Message, ServiceRecord, ServiceTask, PendingItem, FamilyReport, SOPItem, SOPStep, SupervisionStrategy, ReportStrategy } from './types';
import { sopItems as defaultSops, todayTasks as defaultTasks, recentRecords as defaultRecords, pendingItems as defaultPending, familyReports as defaultReports } from './data/mock-data';
import { roles } from './data/role-config';

// ============ Types ============

export interface VoiceLog {
  recordId: string;
  transcript: { time: string; speaker: string; text: string }[];
  llmAnalysis: {
    summary: string;
    sopCheck: Record<string, boolean>;
    concerns: string[];
    mood: string;
    healthObservations: string[];
  } | null;
  rawTranscript: string;
  analyzing: boolean;
}

export interface FamilyFeedback {
  id: string;
  family: string;
  content: string;
  time: string;
  status: 'pending' | 'resolved';
}

export interface SopDraft {
  action: 'create' | 'edit';
  sopId?: string;
  serviceType: string;
  steps: SOPStep[];
  status: 'drafting' | 'confirming';
}

export interface SharedState {
  tasks: ServiceTask[];
  records: ServiceRecord[];
  pendingItems: PendingItem[];
  familyReports: FamilyReport[];
  voiceLogs: VoiceLog[];
  sops: SOPItem[];
  strategies: SupervisionStrategy[];
  reportStrategies: ReportStrategy[];
  sopDraft: SopDraft | null;
  familyFeedbacks: FamilyFeedback[];
  messagesByRole: Record<string, Message[]>;
  notifications: { id: string; role: string; message: string; time: string }[];
}

// ============ Default Data ============

const DEFAULT_STRATEGIES: SupervisionStrategy[] = [
  {
    id: 'strat1', sopId: 'sop1', serviceType: '探访关爱',
    onStart: '社工确认开始服务后，语音简要介绍本次探访对象和 SOP 必做项目',
    duringService: '监听服务过程，自动根据对话记录分析和 check 已完成的项目',
    checkMode: 'any_order',
    onEnd: '当社工语音确认结束或探测到告别，若有项目未完成则提示社工',
    customRules: ['无需按顺序执行，只要对话中体现即可 check', '服务时长低于 20 分钟时提醒'],
    lastUpdated: '2026-05-13',
  },
  {
    id: 'strat3', sopId: 'sop3', serviceType: '用药提醒',
    onStart: '语音播报今日应服药品清单',
    duringService: '监听是否当面确认服药',
    checkMode: 'sequential',
    onEnd: '确认所有药品已服用，未服药需记录间隔',
    customRules: ['连续漏服 2 次以上需上报运营'],
    lastUpdated: '2026-05-13',
  },
];

const DEFAULT_REPORT_STRATEGIES: ReportStrategy[] = [
  {
    id: 'rpt1', sopId: 'sop1', serviceType: '探访关爱',
    items: [
      { key: 'full_transcript', label: '服务全文日志', description: '输出完整的语音转写日志', enabled: true, isCustom: false },
      { key: 'opening_info', label: '开场白信息提取', description: '提取社工自我介绍（身份、来源、服务对象）', enabled: true, isCustom: false },
      { key: 'satisfaction', label: '客户满意度提取', description: '提取对话中涉及满意度询问或客户表达满意/不满意的信息', enabled: true, isCustom: false },
    ],
    lastUpdated: '2026-05-14',
  },
  {
    id: 'rpt3', sopId: 'sop3', serviceType: '用药提醒',
    items: [
      { key: 'full_transcript', label: '服务全文日志', description: '输出完整的语音转写日志', enabled: true, isCustom: false },
      { key: 'opening_info', label: '开场白信息提取', description: '提取社工自我介绍（身份、来源、服务对象）', enabled: true, isCustom: false },
      { key: 'satisfaction', label: '客户满意度提取', description: '提取对话中涉及满意度询问或客户表达满意/不满意的信息', enabled: true, isCustom: false },
    ],
    lastUpdated: '2026-05-14',
  },
];

const DEFAULT_FEEDBACKS: FamilyFeedback[] = [
  { id: 'ff1', family: '王丽（王秀英家属）', content: '反映母亲情绪波动大，希望增加关注', time: '2026-05-12 18:30', status: 'pending' },
  { id: 'ff2', family: '赵强（赵淑芬家属）', content: '要求增加助浴频次', time: '2026-05-10 14:00', status: 'resolved' },
  { id: 'ff3', family: '刘芳（刘国强家属）', content: '询问本周为何少了一次服务', time: '2026-05-09 10:20', status: 'resolved' },
];

function buildInitialMessages(): Record<string, Message[]> {
  const map: Record<string, Message[]> = {};
  for (const role of roles) map[role.id] = [...role.defaultMessages];
  return map;
}

function buildDefaultState(): SharedState {
  return {
    tasks: defaultTasks,
    records: defaultRecords,
    pendingItems: defaultPending,
    familyReports: defaultReports,
    voiceLogs: [],
    sops: defaultSops,
    strategies: DEFAULT_STRATEGIES,
    reportStrategies: DEFAULT_REPORT_STRATEGIES,
    sopDraft: null,
    familyFeedbacks: DEFAULT_FEEDBACKS,
    messagesByRole: buildInitialMessages(),
    notifications: [],
  };
}

// ============ Store ============

const STORAGE_KEY = 'fieldwork-store';
const CHANNEL_NAME = 'fieldwork-sync';

type Listener = (state: SharedState) => void;

let _state: SharedState;
let _listeners: Set<Listener> = new Set();
let _channel: BroadcastChannel | null = null;

function load(): SharedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return buildDefaultState();
}

function save(state: SharedState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function broadcast(source: string) {
  _channel?.postMessage({ type: 'state-changed', source, timestamp: Date.now() });
}

function notifyListeners() {
  for (const fn of _listeners) fn(_state);
}

// Initialize
_state = load();
try {
  _channel = new BroadcastChannel(CHANNEL_NAME);
  _channel.onmessage = (e) => {
    if (e.data?.type === 'state-changed' || e.data?.type === 'reset') {
      _state = load();
      notifyListeners();
    }
  };
} catch {}

// Also listen to storage events (for cross-origin or fallback)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      _state = load();
      notifyListeners();
    }
  });
}

// ============ Public API ============

export function getState(): SharedState {
  return _state;
}

export function setState(updater: (prev: SharedState) => SharedState, source = 'unknown') {
  _state = updater(_state);
  save(_state);
  broadcast(source);
  notifyListeners();
}

export function subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function resetStore() {
  _state = buildDefaultState();
  save(_state);
  _channel?.postMessage({ type: 'reset', timestamp: Date.now() });
  notifyListeners();
}

// ============ Convenience Helpers ============

let _nextId = 1000;
const nextId = () => String(++_nextId);
const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

export function addMessage(roleId: string, msg: Message) {
  setState(s => ({
    ...s,
    messagesByRole: { ...s.messagesByRole, [roleId]: [...(s.messagesByRole[roleId] || []), msg] },
  }), roleId);
}

export function getMessages(roleId: string): Message[] {
  return _state.messagesByRole[roleId] || [];
}

export function addNotification(role: string, message: string) {
  setState(s => ({
    ...s,
    notifications: [...s.notifications, { id: nextId(), role, message, time: now() }],
  }), role);
}

export function updateSOP(sopId: string, updates: Partial<SOPItem>) {
  setState(s => ({
    ...s,
    sops: s.sops.map(sop => sop.id === sopId ? { ...sop, ...updates, lastUpdated: new Date().toISOString().slice(0, 10) } : sop),
  }), 'supervisor');
  addNotification('social_worker', `SOP 已更新：${updates.serviceType || sopId}，请查看最新版本`);
}

export function addSOPStep(sopId: string, step: SOPStep) {
  setState(s => ({
    ...s,
    sops: s.sops.map(sop => {
      if (sop.id !== sopId) return sop;
      const newSteps = [...sop.steps, step].map((st, i) => ({ ...st, order: i + 1 }));
      const newVersion = `v${(parseFloat(sop.version.slice(1)) + 0.1).toFixed(1)}`;
      return { ...sop, steps: newSteps, version: newVersion, lastUpdated: new Date().toISOString().slice(0, 10) };
    }),
  }), 'supervisor');
  addNotification('social_worker', `SOP 新增步骤「${step.title}」，请查看最新版本`);
}

export function setSopDraft(draft: SopDraft | null) {
  setState(s => ({ ...s, sopDraft: draft }), 'supervisor');
}

export function publishSopDraft() {
  const draft = _state.sopDraft;
  if (!draft) return;
  const today = new Date().toISOString().slice(0, 10);

  if (draft.action === 'create') {
    const newSop: SOPItem = {
      id: `sop-live-${Date.now()}`,
      serviceType: draft.serviceType,
      version: 'v1.0',
      steps: draft.steps,
      requiredItems: draft.steps.filter(s => s.required).map(s => s.title),
      completionCriteria: '完成所有必做步骤',
      status: 'active',
      lastUpdated: today,
    };
    const newStrategy: SupervisionStrategy = {
      id: `strat-live-${Date.now()}`, sopId: newSop.id, serviceType: draft.serviceType,
      onStart: '语音介绍本次服务和 SOP 必做项目',
      duringService: '监听对话，自动 check 已完成步骤',
      checkMode: 'any_order',
      onEnd: '未完成项目时提示社工',
      customRules: [],
      lastUpdated: today,
    };
    setState(s => ({
      ...s,
      sops: [...s.sops, newSop],
      strategies: [...s.strategies, newStrategy],
      sopDraft: null,
    }), 'supervisor');
    addNotification('social_worker', `新 SOP 已发布：${draft.serviceType} v1.0`);
    addNotification('site_ops', `服务主管发布了新 SOP：${draft.serviceType}`);
  } else if (draft.action === 'edit' && draft.sopId) {
    setState(s => ({
      ...s,
      sops: s.sops.map(sop => {
        if (sop.id !== draft.sopId) return sop;
        const newVersion = `v${(parseFloat(sop.version.slice(1)) + 1).toFixed(1)}`;
        return { ...sop, steps: draft.steps, version: newVersion, lastUpdated: today, requiredItems: draft.steps.filter(st => st.required).map(st => st.title) };
      }),
      sopDraft: null,
    }), 'supervisor');
    addNotification('social_worker', `SOP 已更新：${draft.serviceType}，请查看最新版本`);
  }
}

export function updateStrategy(strategyId: string, updates: Partial<SupervisionStrategy>) {
  setState(s => ({
    ...s,
    strategies: s.strategies.map(st => st.id === strategyId ? { ...st, ...updates, lastUpdated: new Date().toISOString().slice(0, 10) } : st),
  }), 'supervisor');
  addNotification('social_worker', `督导策略已更新：${updates.serviceType || strategyId}`);
}

export function updateReportStrategy(strategyId: string, updates: Partial<ReportStrategy>) {
  setState(s => ({
    ...s,
    reportStrategies: s.reportStrategies.map(rs => rs.id === strategyId ? { ...rs, ...updates, lastUpdated: new Date().toISOString().slice(0, 10) } : rs),
  }), 'supervisor');
}

export function addReportStrategyItem(serviceType: string, item: ReportStrategy['items'][0]) {
  setState(s => ({
    ...s,
    reportStrategies: s.reportStrategies.map(rs => {
      if (rs.serviceType !== serviceType) return rs;
      return { ...rs, items: [...rs.items, item], lastUpdated: new Date().toISOString().slice(0, 10) };
    }),
  }), 'supervisor');
  addNotification('supervisor', `报告策略已更新：${serviceType} — 新增「${item.label}」`);
}

export function toggleReportStrategyItem(serviceType: string, itemKey: string, enabled: boolean) {
  setState(s => ({
    ...s,
    reportStrategies: s.reportStrategies.map(rs => {
      if (rs.serviceType !== serviceType) return rs;
      return { ...rs, items: rs.items.map(it => it.key === itemKey ? { ...it, enabled } : it), lastUpdated: new Date().toISOString().slice(0, 10) };
    }),
  }), 'supervisor');
}

// ============ Service Completion Helpers ============

let _recId = 200;
let _pendId = 200;
let _reportId = 200;

export function completeService(params: {
  taskId: string;
  workerName: string;
  recipientName: string;
  serviceType: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationSeconds: number;
  sopChecked: boolean[];
  sopStepNames: string[];
}): string {
  const { taskId, workerName, recipientName, serviceType, startTime, endTime, duration, durationSeconds, sopChecked, sopStepNames } = params;
  const recordId = `rec-live-${++_recId}`;
  const sopCompletion = Math.round(sopChecked.filter(Boolean).length / sopChecked.length * 100);
  const hasAnomalies = sopCompletion < 60 || durationSeconds < 300;
  const status = hasAnomalies ? 'anomaly' : sopCompletion < 90 ? 'warning' : 'normal';
  const confidence = sopCompletion >= 80 ? 95 : sopCompletion >= 50 ? 75 : 50;

  const newRecord = {
    id: recordId, taskId, workerName, recipientName, serviceType, startTime, endTime, duration,
    status: status as 'normal' | 'warning' | 'anomaly',
    summary: '(等待 LLM 分析生成...)',
    sopCompletion, confidence,
    pendingItems: [] as string[],
  };

  const newPending: any[] = [];
  sopChecked.forEach((checked, i) => {
    if (!checked && sopStepNames[i]) {
      newPending.push({
        id: `p-live-${++_pendId}`, type: 'sop_gap',
        title: `${workerName} ${recipientName} SOP 缺失：${sopStepNames[i]}`,
        detail: `录音分析未检测到「${sopStepNames[i]}」环节`,
        severity: 'info', relatedRecord: recordId, createdAt: endTime,
      });
    }
  });
  if (hasAnomalies) {
    newPending.push({
      id: `p-live-${++_pendId}`, type: 'anomaly',
      title: `${recipientName} 服务异常：${sopCompletion < 60 ? 'SOP 完成率偏低' : '服务时长过短'}`,
      detail: `SOP 完成率 ${sopCompletion}%，时长 ${duration}`,
      severity: 'warning', relatedRecord: recordId, createdAt: endTime,
    });
  }

  const today = new Date().toLocaleDateString('zh-CN');
  const newReport = {
    id: `fr-live-${++_reportId}`, recipientName, period: today, type: 'daily' as const,
    summary: `今日完成 ${serviceType} 服务（${workerName}），时长 ${duration}，SOP 完成率 ${sopCompletion}%。详细分析正在生成中...`,
    statusChange: '(等待 LLM 分析)', concerns: [] as string[], generatedAt: endTime,
  };

  const msgTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const siteOpsMsg = `📋 服务完成通知：${workerName} 刚完成了对 **${recipientName}** 的 ${serviceType} 服务。\n\n- 时长：${duration}\n- SOP 完成率：${sopCompletion}%\n- 置信度：${confidence}%${newPending.length > 0 ? `\n- ⚠️ ${newPending.length} 项待确认事项` : ''}\n\n详情请查看「已服务」Tab。`;
  const familyMsg = `📢 服务报告推送：**${recipientName}** 今日完成了 ${serviceType} 服务（${workerName}），时长 ${duration}。\n\nSOP 完成率 ${sopCompletion}%。详细报告已更新到「订阅报告」Tab。`;

  setState(s => ({
    ...s,
    records: [newRecord, ...s.records],
    tasks: s.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' as const } : t),
    pendingItems: [...newPending, ...s.pendingItems],
    familyReports: [newReport, ...s.familyReports],
    messagesByRole: {
      ...s.messagesByRole,
      site_ops: [...(s.messagesByRole.site_ops || []), { id: `auto-${Date.now()}-ops`, role: 'agent' as const, content: siteOpsMsg, timestamp: msgTime }],
      family: [...(s.messagesByRole.family || []), { id: `auto-${Date.now()}-fam`, role: 'agent' as const, content: familyMsg, timestamp: msgTime }],
    },
    notifications: [
      ...s.notifications,
      { id: `n-${Date.now()}-1`, role: 'site_ops', message: `${workerName} 完成了对 ${recipientName} 的 ${serviceType} 服务`, time: msgTime },
      { id: `n-${Date.now()}-2`, role: 'family', message: `${recipientName} 今日 ${serviceType} 服务已完成`, time: msgTime },
    ],
  }), 'social_worker');

  return recordId;
}

export function addVoiceLog(log: VoiceLog) {
  setState(s => ({ ...s, voiceLogs: [log, ...s.voiceLogs] }), 'social_worker');
}

export function updateVoiceLogAnalysis(recordId: string, analysis: VoiceLog['llmAnalysis']) {
  setState(s => {
    let newState = {
      ...s,
      voiceLogs: s.voiceLogs.map(l => l.recordId === recordId ? { ...l, llmAnalysis: analysis, analyzing: false } : l),
    };
    if (analysis) {
      newState.records = newState.records.map(r => r.id === recordId ? { ...r, summary: analysis.summary, pendingItems: analysis.concerns } : r);
      newState.familyReports = newState.familyReports.map(fr => {
        if (fr.summary.includes('详细分析正在生成中')) {
          return { ...fr, summary: analysis.summary, statusChange: analysis.mood, concerns: analysis.healthObservations };
        }
        return fr;
      });
    }
    return newState;
  }, 'social_worker');
}
