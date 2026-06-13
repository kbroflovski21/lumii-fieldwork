const today = new Date().toISOString().slice(0, 10);
const now = new Date().toISOString();

export const users = [
  { id: "u1", username: "admin", password: "admin123", name: "张明", role: "org_admin", orgId: "org1", siteIds: ["site1", "site2"], phone: "13800001111", status: "active" },
  { id: "u2", username: "operator1", password: "op123", name: "李芳", role: "site_operator", orgId: "org1", siteIds: ["site1"], phone: "13800002222", status: "active" },
  { id: "u3", username: "operator2", password: "op123", name: "王磊", role: "site_operator", orgId: "org1", siteIds: ["site2"], phone: "13800003333", status: "active" },
  { id: "u4", username: "supervisor", password: "sv123", name: "赵婷", role: "org_admin", orgId: "org1", siteIds: ["site1", "site2"], phone: "13800004444", status: "active" },
  { id: "u5", username: "auditor", password: "audit123", name: "医保审计员", role: "gov_auditor", orgId: "org1", siteIds: ["site1", "site2"], phone: "13800005555", status: "active" },
  { id: "u6", username: "worker1", password: "worker123", name: "刘秀英", role: "careworker", orgId: "org1", siteIds: ["site1"], phone: "13900001111", status: "active" },
];

export const sites = [
  { id: "site1", name: "阳光社区服务站", address: "上海市浦东新区阳光路100号", contactName: "李芳", contactPhone: "13800002222", orgId: "org1", status: "active", createdAt: "2025-01-15T08:00:00Z", operators: [users[1]] },
  { id: "site2", name: "幸福家园服务站", address: "上海市徐汇区幸福路200号", contactName: "王磊", contactPhone: "13800003333", orgId: "org1", status: "active", createdAt: "2025-03-01T08:00:00Z", operators: [users[2]] },
];

export const feishuUsers = [
  { id: "fs1", openId: "ou_abc123", name: "张明", role: "org_admin", siteIds: ["site1", "site2"], createdAt: "2025-01-10T08:00:00Z" },
  { id: "fs2", openId: "ou_def456", name: "陈晓", role: "site_operator", siteIds: ["site1"], createdAt: "2025-02-20T08:00:00Z" },
];

export const socialWorkers = [
  { id: "sw1", userId: "wu1", name: "刘秀英", phone: "13900001111", siteId: "site1", workerType: "service_personnel" as const, qualificationLabels: ["养老护理员(初级)", "急救证"], status: "active" as const, preferredBadge: { badgeId: "b1", deviceCode: "GY-B001", status: "in_use" as const, lastSyncAt: now }, praiseSummary: { praiseCount: 12, latestPraiseAt: now, latestPraiseExcerpt: "刘阿姨特别耐心" } },
  { id: "sw2", userId: "wu2", name: "陈建国", phone: "13900002222", siteId: "site1", workerType: "service_personnel" as const, qualificationLabels: ["养老护理员(中级)"], status: "active" as const, preferredBadge: { badgeId: "b2", deviceCode: "GY-B002", status: "in_use" as const, lastSyncAt: now }, praiseSummary: { praiseCount: 8, latestPraiseAt: now, latestPraiseExcerpt: "服务态度很好" } },
  { id: "sw3", userId: "wu3", name: "周美玲", phone: "13900003333", siteId: "site1", workerType: "service_personnel" as const, qualificationLabels: ["养老护理员(初级)", "社工证"], status: "active" as const, praiseSummary: { praiseCount: 5 } },
  { id: "sw4", userId: "wu4", name: "孙伟", phone: "13900004444", siteId: "site2", workerType: "service_personnel" as const, qualificationLabels: ["养老护理员(初级)"], status: "active" as const, preferredBadge: { badgeId: "b3", deviceCode: "GY-B003", status: "in_use" as const, lastSyncAt: now }, praiseSummary: { praiseCount: 15, latestPraiseAt: now, latestPraiseExcerpt: "非常专业" } },
  { id: "sw5", userId: "wu5", name: "吴丽华", phone: "13900005555", siteId: "site2", workerType: "service_personnel" as const, qualificationLabels: ["养老护理员(中级)", "康复师"], status: "active" as const, praiseSummary: { praiseCount: 3 } },
  { id: "sw6", userId: "wu6", name: "马志强", phone: "13900006666", siteId: "site1", workerType: "service_personnel" as const, qualificationLabels: [], status: "incomplete_profile" as const, praiseSummary: { praiseCount: 0 } },
];

export const smartBadges = [
  { id: "b1", deviceCode: "GY-B001", orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, batteryPercent: 85, activatedAt: "2025-06-01T08:00:00Z", lastSyncAt: now, lastRecordingAt: now, preferredWorkerId: "sw1", preferredWorkerName: "刘秀英", recentServiceRecordIds: ["sr1", "sr3"] },
  { id: "b2", deviceCode: "GY-B002", orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, batteryPercent: 62, activatedAt: "2025-06-01T08:00:00Z", lastSyncAt: now, lastRecordingAt: now, preferredWorkerId: "sw2", preferredWorkerName: "陈建国", recentServiceRecordIds: ["sr2"] },
  { id: "b3", deviceCode: "GY-B003", orgId: "org1", siteId: "site2", siteName: "幸福家园服务站", status: "in_use" as const, batteryPercent: 93, activatedAt: "2025-06-05T08:00:00Z", lastSyncAt: now, preferredWorkerId: "sw4", preferredWorkerName: "孙伟", recentServiceRecordIds: ["sr4"] },
  { id: "b4", deviceCode: "GY-B004", orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "available" as const, batteryPercent: 100, activatedAt: "2025-06-10T08:00:00Z", recentServiceRecordIds: [] },
  { id: "b5", deviceCode: "GY-B005", orgId: "org1", siteId: "site2", siteName: "幸福家园服务站", status: "low_battery" as const, batteryPercent: 12, activatedAt: "2025-05-15T08:00:00Z", lastSyncAt: "2025-06-02T06:00:00Z", preferredWorkerId: "sw5", preferredWorkerName: "吴丽华", recentServiceRecordIds: [] },
  { id: "b6", deviceCode: "GY-B006", orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "offline" as const, batteryPercent: 0, activatedAt: "2025-04-01T08:00:00Z", lastSyncAt: "2025-05-30T10:00:00Z", recentServiceRecordIds: [] },
];

export const serviceObjects = [
  { id: "so1", name: "王淑珍", phone: "13700001111", idNumber: "310101193501012345", age: 91, gender: "female" as const, address: "阳光路120号3楼301", eligibilityType: "government", serviceProjects: ["生活照料", "精神慰藉"], careNotes: ["行动不便，需轮椅", "听力下降，需大声交流"], riskTags: ["跌倒高风险", "独居"], familySubscriptionSummary: "weekly" as const, latestInsightSummary: "王奶奶近期精神状态好转，但膝关节疼痛加重", insightSummaries: [{ id: "ins1", title: "6月健康观察", description: "膝关节疼痛加重，建议增加康复训练频次", severity: "warning" as const }], servicePlanSummaries: [{ id: "sp1", serviceObjectId: "so1", serviceProject: "生活照料", cadenceLabel: "每周一/三/五", preferredTimeWindow: { start: "09:00", end: "10:30", label: "上午" }, primarySocialWorkerId: "sw1", primarySocialWorkerName: "刘秀英", status: "active" as const, activeExceptionCount: 0 }], familyContacts: [{ id: "fc1", name: "王建华", relation: "儿子", phone: "13600001111", subscriptionStatus: "weekly" as const, lastPushedAt: now }], state: "plan_active" as const },
  { id: "so2", name: "李德明", phone: "13700002222", idNumber: "310101193803025678", age: 88, gender: "male" as const, address: "阳光路88号1楼102", eligibilityType: "insurance", serviceProjects: ["康复训练", "助餐服务"], careNotes: ["糖尿病，需注意饮食", "轻度认知障碍"], riskTags: ["认知风险"], familySubscriptionSummary: "daily" as const, latestInsightSummary: "李爷爷血糖控制稳定", insightSummaries: [], servicePlanSummaries: [{ id: "sp2", serviceObjectId: "so2", serviceProject: "康复训练", cadenceLabel: "每周二/四", preferredTimeWindow: { start: "14:00", end: "15:00", label: "下午" }, primarySocialWorkerId: "sw2", primarySocialWorkerName: "陈建国", status: "active" as const, activeExceptionCount: 0 }], familyContacts: [{ id: "fc2", name: "李小红", relation: "女儿", phone: "13600002222", subscriptionStatus: "daily" as const, lastPushedAt: now }], state: "subscribed" as const },
  { id: "so3", name: "张秀兰", phone: "13700003333", idNumber: "310101194005039876", age: 86, gender: "female" as const, address: "幸福路150号5楼502", eligibilityType: "government", serviceProjects: ["精神慰藉", "医疗陪护"], careNotes: ["高血压", "丧偶后情绪低落"], riskTags: ["心理风险", "高血压"], familySubscriptionSummary: "monthly" as const, insightSummaries: [], servicePlanSummaries: [{ id: "sp3", serviceObjectId: "so3", serviceProject: "精神慰藉", cadenceLabel: "每周三", preferredTimeWindow: { start: "10:00", end: "11:00", label: "上午" }, primarySocialWorkerId: "sw4", primarySocialWorkerName: "孙伟", status: "active" as const, activeExceptionCount: 1 }], familyContacts: [{ id: "fc3", name: "张强", relation: "儿子", phone: "13600003333", subscriptionStatus: "monthly" as const }], state: "plan_exception_active" as const },
  { id: "so4", name: "赵金凤", phone: "13700004444", idNumber: "310101194202041234", age: 84, gender: "female" as const, address: "幸福路180号2楼203", eligibilityType: "self_paid", serviceProjects: ["生活照料"], careNotes: ["视力不佳"], riskTags: [], familySubscriptionSummary: "none" as const, insightSummaries: [], servicePlanSummaries: [], familyContacts: [{ id: "fc4", name: "赵亮", relation: "孙子", phone: "13600004444", subscriptionStatus: "none" as const }], state: "family_binding_pending" as const },
  { id: "so5", name: "陈国强", phone: "13700005555", idNumber: "310101193606055678", age: 90, gender: "male" as const, address: "阳光路200号1楼101", eligibilityType: "government", serviceProjects: ["生活照料", "康复训练", "助餐服务"], careNotes: ["中风后遗症", "半身不遂", "需要助行器"], riskTags: ["跌倒高风险", "中风后遗症"], familySubscriptionSummary: "daily" as const, latestInsightSummary: "陈爷爷右侧肢体活动度有改善", insightSummaries: [{ id: "ins2", title: "康复进展", description: "右手握力从5kg提升至8kg", severity: "info" as const }], servicePlanSummaries: [{ id: "sp4", serviceObjectId: "so5", serviceProject: "康复训练", cadenceLabel: "每天", preferredTimeWindow: { start: "08:00", end: "09:00", label: "早上" }, primarySocialWorkerId: "sw3", primarySocialWorkerName: "周美玲", status: "active" as const, activeExceptionCount: 0 }, { id: "sp5", serviceObjectId: "so5", serviceProject: "生活照料", cadenceLabel: "每天", preferredTimeWindow: { start: "11:00", end: "12:00", label: "中午" }, primarySocialWorkerId: "sw1", primarySocialWorkerName: "刘秀英", status: "active" as const, activeExceptionCount: 0 }], familyContacts: [{ id: "fc5", name: "陈小明", relation: "儿子", phone: "13600005555", subscriptionStatus: "daily" as const, lastPushedAt: now }, { id: "fc6", name: "陈小芳", relation: "女儿", phone: "13600005556", subscriptionStatus: "weekly" as const }], state: "plan_active" as const },
];

function offsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const serviceSchedules = [
  { id: "sch1", source: "service_plan", servicePlanId: "sp1", serviceObjectId: "so1", serviceObjectName: "王淑珍", serviceProject: "生活照料", addressSnapshot: "阳光路120号3楼301", serviceDate: today, timeWindow: { start: "09:00", end: "10:30", label: "上午" }, assignedSocialWorkerId: "sw1", assignedSocialWorkerName: "刘秀英", status: "in_progress", riskTags: ["跌倒高风险", "独居"], matchStatus: "exact" as const, plannedItems: [{ standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 }, { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 }, { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 }, { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 }], actualSessionId: "sess-01", recurringRuleId: "rsr-1" },
  { id: "sch2", source: "service_plan", servicePlanId: "sp2", serviceObjectId: "so2", serviceObjectName: "李德明", serviceProject: "康复训练", addressSnapshot: "阳光路88号1楼102", serviceDate: today, timeWindow: { start: "14:00", end: "15:00", label: "下午" }, assignedSocialWorkerId: "sw2", assignedSocialWorkerName: "陈建国", status: "scheduled", riskTags: ["认知风险"], matchStatus: undefined, plannedItems: [{ standardItemId: "hz-item-32", name: "生活自理能力训练", referenceMinutes: 20 }, { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 }, { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 }], recurringRuleId: "rsr-2" },
  { id: "sch3", source: "service_plan", servicePlanId: "sp3", serviceObjectId: "so3", serviceObjectName: "张秀兰", serviceProject: "精神慰藉", addressSnapshot: "幸福路150号5楼502", serviceDate: today, timeWindow: { start: "10:00", end: "11:00", label: "上午" }, assignedSocialWorkerId: "sw4", assignedSocialWorkerName: "孙伟", status: "scheduled", riskTags: ["心理风险"], matchStatus: undefined, plannedItems: [{ standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", referenceMinutes: 20 }, { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 }], recurringRuleId: "rsr-3" },
  { id: "sch4", source: "service_plan", servicePlanId: "sp4", serviceObjectId: "so5", serviceObjectName: "陈国强", serviceProject: "康复训练", addressSnapshot: "阳光路200号1楼101", serviceDate: today, timeWindow: { start: "08:00", end: "09:00", label: "早上" }, assignedSocialWorkerId: "sw3", assignedSocialWorkerName: "周美玲", status: "completed", serviceRecordId: "sr5", riskTags: ["跌倒高风险"], matchStatus: "exact" as const, plannedItems: [{ standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 }, { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 }, { standardItemId: "hz-item-29", name: "协助行走", referenceMinutes: 15 }], actualSessionId: "sess-02", recurringRuleId: "rsr-4" },
  { id: "sch5", source: "one_time", serviceObjectId: "so4", serviceObjectName: "赵金凤", serviceProject: "生活照料", addressSnapshot: "幸福路180号2楼203", serviceDate: today, timeWindow: { start: "15:00", end: "16:00", label: "下午" }, status: "unassigned", riskTags: [], plannedItems: [{ standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 }, { standardItemId: "hz-item-09", name: "协助更衣", referenceMinutes: 15 }] },
  { id: "sch6", source: "service_plan", servicePlanId: "sp1", serviceObjectId: "so1", serviceObjectName: "王淑珍", serviceProject: "生活照料", addressSnapshot: "阳光路120号3楼301", serviceDate: offsetDate(1), timeWindow: { start: "09:00", end: "10:30", label: "上午" }, assignedSocialWorkerId: "sw1", assignedSocialWorkerName: "刘秀英", status: "scheduled", riskTags: ["跌倒高风险"], plannedItems: [{ standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 }, { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 }, { standardItemId: "hz-item-07", name: "协助沐浴/擦浴", referenceMinutes: 30 }, { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 }], recurringRuleId: "rsr-1" },
  { id: "sch7", source: "service_plan", servicePlanId: "sp5", serviceObjectId: "so5", serviceObjectName: "陈国强", serviceProject: "生活照料", addressSnapshot: "阳光路200号1楼101", serviceDate: offsetDate(1), timeWindow: { start: "11:00", end: "12:00", label: "中午" }, assignedSocialWorkerId: "sw1", assignedSocialWorkerName: "刘秀英", status: "scheduled", riskTags: ["跌倒高风险"], plannedItems: [{ standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 }, { standardItemId: "hz-item-27", name: "协助翻身与体位转换", referenceMinutes: 10 }, { standardItemId: "hz-item-28", name: "协助移乘", referenceMinutes: 10 }], recurringRuleId: "rsr-5" },
  { id: "sch8", source: "service_plan", servicePlanId: "sp2", serviceObjectId: "so2", serviceObjectName: "李德明", serviceProject: "康复训练", addressSnapshot: "阳光路88号1楼102", serviceDate: offsetDate(2), timeWindow: { start: "14:00", end: "15:00", label: "下午" }, assignedSocialWorkerId: "sw2", assignedSocialWorkerName: "陈建国", status: "scheduled", riskTags: [], plannedItems: [{ standardItemId: "hz-item-32", name: "生活自理能力训练", referenceMinutes: 20 }, { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 }, { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 }], recurringRuleId: "rsr-2" },
  // 0606 additions: more schedules for this week
  { id: "sch9", source: "service_plan", servicePlanId: "sp4", serviceObjectId: "so5", serviceObjectName: "陈国强", serviceProject: "康复训练", addressSnapshot: "阳光路200号1楼101", serviceDate: offsetDate(1), timeWindow: { start: "08:00", end: "09:00", label: "早上" }, assignedSocialWorkerId: "sw3", assignedSocialWorkerName: "周美玲", status: "scheduled", riskTags: ["跌倒高风险"], plannedItems: [{ standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 }, { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 }, { standardItemId: "hz-item-29", name: "协助行走", referenceMinutes: 15 }], recurringRuleId: "rsr-4" },
  { id: "sch10", source: "service_plan", servicePlanId: "sp1", serviceObjectId: "so1", serviceObjectName: "王淑珍", serviceProject: "生活照料", addressSnapshot: "阳光路120号3楼301", serviceDate: offsetDate(3), timeWindow: { start: "09:00", end: "10:30", label: "上午" }, assignedSocialWorkerId: "sw1", assignedSocialWorkerName: "刘秀英", status: "scheduled", riskTags: ["跌倒高风险"], plannedItems: [{ standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 }, { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 }, { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 }, { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 }], recurringRuleId: "rsr-1" },
  { id: "sch11", source: "service_plan", servicePlanId: "sp3", serviceObjectId: "so3", serviceObjectName: "张秀兰", serviceProject: "精神慰藉", addressSnapshot: "幸福路150号5楼502", serviceDate: offsetDate(3), timeWindow: { start: "10:00", end: "11:00", label: "上午" }, assignedSocialWorkerId: "sw4", assignedSocialWorkerName: "孙伟", status: "scheduled", riskTags: ["心理风险"], plannedItems: [{ standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", referenceMinutes: 20 }, { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 }], recurringRuleId: "rsr-3" },
  { id: "sch12", source: "service_plan", servicePlanId: "sp5", serviceObjectId: "so5", serviceObjectName: "陈国强", serviceProject: "生活照料", addressSnapshot: "阳光路200号1楼101", serviceDate: offsetDate(3), timeWindow: { start: "11:00", end: "12:00", label: "中午" }, assignedSocialWorkerId: "sw1", assignedSocialWorkerName: "刘秀英", status: "scheduled", riskTags: ["跌倒高风险"], plannedItems: [{ standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 }, { standardItemId: "hz-item-27", name: "协助翻身与体位转换", referenceMinutes: 10 }], recurringRuleId: "rsr-5" },
];

export const serviceRecords = [
  { id: "sr1", serviceDate: offsetDate(-1), startTime: "09:05", endTime: "10:25", durationMinutes: 80, socialWorkerId: "sw1", socialWorkerName: "刘秀英", serviceObjectId: "so1", serviceObjectName: "王淑珍", elderName: "王淑珍", serviceAddress: "阳光路120号3楼301", familyContactIds: ["fc1"], badgeId: "GY-B001", smartBadgeId: "b1", serviceProject: "生活照料", serviceProjects: ["生活照料"], expectedSops: [{ sopId: "sop1", sopName: "居家养老生活照料" }], assignmentConfidence: 0.95, reviewStatus: "confirmed" as const, exportStatus: "exportable" as const, serviceExceptions: [], serviceItems: [{ id: "si1", seq: 1, title: "身体状况观察", category: "process" as const, status: "completed" as const }, { id: "si2", seq: 2, title: "居室清洁", category: "business" as const, status: "completed" as const }, { id: "si3", seq: 3, title: "衣物换洗", category: "business" as const, status: "completed" as const }], sopGroups: [{ sopName: "居家养老生活照料", sopType: "service" as const, items: [{ id: "si1", seq: 1, title: "身体状况观察", category: "process" as const, status: "completed" as const }, { id: "si2", seq: 2, title: "居室清洁", category: "business" as const, status: "completed" as const }] }], exceptionTags: [], missingFields: [], audioAssetId: "audio1", transcriptId: "trans1", structuredSummary: "完成生活照料服务，包括身体观察、居室清洁和衣物换洗", generatedSummary: "刘秀英于上午9:05至10:25为王淑珍提供生活照料服务。观察老人精神状态良好，完成居室清洁和衣物换洗。", exportHistory: [] },
  { id: "sr2", serviceDate: offsetDate(-1), startTime: "14:10", endTime: "14:55", durationMinutes: 45, socialWorkerId: "sw2", socialWorkerName: "陈建国", serviceObjectId: "so2", serviceObjectName: "李德明", elderName: "李德明", serviceAddress: "阳光路88号1楼102", familyContactIds: ["fc2"], badgeId: "GY-B002", smartBadgeId: "b2", serviceProject: "康复训练", serviceProjects: ["康复训练"], expectedSops: [{ sopId: "sop2", sopName: "康复训练标准" }], assignmentConfidence: 0.88, reviewStatus: "needs_review" as const, exportStatus: "not_ready" as const, serviceExceptions: [{ id: "ex1", type: "service_incomplete" as const, title: "训练项目未全部完成", description: "由于老人疲劳，下肢训练未完成", status: "open" as const }], serviceItems: [{ id: "si4", seq: 1, title: "上肢活动训练", category: "business" as const, status: "completed" as const }, { id: "si5", seq: 2, title: "下肢活动训练", category: "business" as const, status: "skipped" as const }], exceptionTags: ["训练不完整"], missingFields: [], audioAssetId: "audio2", transcriptId: "trans2", structuredSummary: "部分完成康复训练", exportHistory: [] },
  { id: "sr3", serviceDate: offsetDate(-2), startTime: "09:00", endTime: "10:20", durationMinutes: 80, socialWorkerId: "sw1", socialWorkerName: "刘秀英", serviceObjectId: "so1", serviceObjectName: "王淑珍", elderName: "王淑珍", serviceAddress: "阳光路120号3楼301", familyContactIds: ["fc1"], badgeId: "GY-B001", smartBadgeId: "b1", serviceProject: "生活照料", serviceProjects: ["生活照料"], expectedSops: [{ sopId: "sop1", sopName: "居家养老生活照料" }], assignmentConfidence: 0.97, reviewStatus: "confirmed" as const, exportStatus: "exported" as const, serviceExceptions: [], serviceItems: [], exceptionTags: [], missingFields: [], audioAssetId: "audio3", transcriptId: "trans3", structuredSummary: "常规生活照料服务", exportHistory: [{ id: "eh1", exportedAt: offsetDate(-1) + "T16:00:00Z", operatorName: "李芳", fileVersion: "v1", filterSummary: "全量导出" }] },
  { id: "sr4", serviceDate: offsetDate(-1), startTime: "10:05", endTime: "10:58", durationMinutes: 53, socialWorkerId: "sw4", socialWorkerName: "孙伟", serviceObjectId: "so3", serviceObjectName: "张秀兰", elderName: "张秀兰", serviceAddress: "幸福路150号5楼502", familyContactIds: ["fc3"], badgeId: "GY-B003", smartBadgeId: "b3", serviceProject: "精神慰藉", serviceProjects: ["精神慰藉"], expectedSops: [{ sopId: "sop3", sopName: "精神慰藉服务标准" }], assignmentConfidence: 0.92, reviewStatus: "confirmed" as const, exportStatus: "exportable" as const, serviceExceptions: [], serviceItems: [{ id: "si6", seq: 1, title: "情绪评估", category: "process" as const, status: "completed" as const }, { id: "si7", seq: 2, title: "陪伴聊天", category: "business" as const, status: "completed" as const }, { id: "si8", seq: 3, title: "兴趣活动引导", category: "business" as const, status: "completed" as const }], exceptionTags: [], missingFields: [], audioAssetId: "audio4", transcriptId: "trans4", structuredSummary: "精神慰藉服务完成，老人情绪有改善", exportHistory: [] },
  { id: "sr5", serviceDate: today, startTime: "08:05", endTime: "08:52", durationMinutes: 47, socialWorkerId: "sw3", socialWorkerName: "周美玲", serviceObjectId: "so5", serviceObjectName: "陈国强", elderName: "陈国强", serviceAddress: "阳光路200号1楼101", familyContactIds: ["fc5"], badgeId: "GY-B001", smartBadgeId: "b1", serviceProject: "康复训练", serviceProjects: ["康复训练"], expectedSops: [{ sopId: "sop2", sopName: "康复训练标准" }], assignmentConfidence: 0.90, reviewStatus: "info_incomplete" as const, exportStatus: "not_ready" as const, serviceExceptions: [], serviceItems: [{ id: "si9", seq: 1, title: "上肢活动训练", category: "business" as const, status: "completed" as const }, { id: "si10", seq: 2, title: "下肢活动训练", category: "business" as const, status: "completed" as const }], exceptionTags: [], missingFields: ["serviceObjectId"], audioAssetId: "audio5", transcriptId: "trans5", structuredSummary: "康复训练完成，右侧肢体活动度改善", exportHistory: [] },
];

export const audioAssets = serviceRecords.map((r, i) => ({
  id: `audio${i + 1}`, recordId: r.id, playbackUrl: `/mock-audio.wav`, durationSeconds: r.durationMinutes * 60, capturedByBadgeId: r.badgeId, uploadedAt: r.serviceDate + "T12:00:00Z", retentionLabel: "90天",
}));

export const transcripts = serviceRecords.map((r, i) => ({
  id: `trans${i + 1}`, recordId: r.id, language: "zh-CN" as const, text: r.structuredSummary, confidence: 0.92, segments: [{ startSecond: 0, endSecond: 60, speaker: "social_worker" as const, text: "您好，我来给您做今天的服务" }, { startSecond: 61, endSecond: 120, speaker: "service_object" as const, text: "好的，谢谢你来" }],
}));

export const recordings = [
  { id: "rec1", sessionId: "sess1", badgeId: "GY-B001", workerId: "sw1", workerName: "刘秀英", siteId: "site1", startedAt: offsetDate(-1) + "T09:05:00Z", endedAt: offsetDate(-1) + "T10:25:00Z", durationSeconds: 4800, audioUrl: "/mock-audio.wav", status: "matched", matchConfidence: 0.95, matchedServiceRecordId: "sr1", matchedScheduleId: "sch1", matchedServiceObjectId: "so1", matchedServiceObjectName: "王淑珍", matchReason: "时间+地点匹配", createdAt: offsetDate(-1) + "T10:30:00Z", updatedAt: offsetDate(-1) + "T10:30:00Z" },
  { id: "rec2", sessionId: "sess2", badgeId: "GY-B002", workerId: "sw2", workerName: "陈建国", siteId: "site1", startedAt: offsetDate(-1) + "T14:10:00Z", endedAt: offsetDate(-1) + "T14:55:00Z", durationSeconds: 2700, audioUrl: "/mock-audio.wav", status: "matched", matchConfidence: 0.88, matchedServiceRecordId: "sr2", matchedScheduleId: "sch2", matchedServiceObjectId: "so2", matchedServiceObjectName: "李德明", matchReason: "时间匹配", createdAt: offsetDate(-1) + "T15:00:00Z", updatedAt: offsetDate(-1) + "T15:00:00Z" },
  { id: "rec3", sessionId: "sess3", badgeId: "GY-B001", workerId: "sw3", workerName: "周美玲", siteId: "site1", startedAt: today + "T08:05:00Z", endedAt: today + "T08:52:00Z", durationSeconds: 2820, audioUrl: "/mock-audio.wav", status: "pending", matchConfidence: 0, createdAt: today + "T09:00:00Z", updatedAt: today + "T09:00:00Z" },
];

export const sops = [
  { id: "sop1", name: "居家养老生活照料", type: "service", description: "居家养老基本生活照料服务标准", keywords: ["生活照料", "居家养老", "清洁", "饮食"], exampleDialogue: "您好王奶奶，我是刘秀英，今天来给您做生活照料服务...", sopContent: "## 服务流程\n1. 问候与身体观察\n2. 居室清洁整理\n3. 衣物换洗\n4. 饮食准备协助\n5. 服务记录填写", sopSource: "manual", sopVersion: 3, sopHistory: [], supervisionContent: "## 督导要点\n- 观察服务人员问候礼仪\n- 检查清洁标准执行", supervisionSource: "manual", supervisionVersion: 1, supervisionHistory: [], guidanceContent: "## 指导建议\n- 注意老人隐私保护", guidanceSource: "manual", guidanceVersion: 1, guidanceHistory: [], reportContent: "## 报告模板\n服务对象：{name}\n服务日期：{date}", reportSource: "manual", reportVersion: 1, reportHistory: [], orgId: "org1", steps: ["问候", "身体观察", "居室清洁", "衣物换洗", "告别"], isComplete: true, status: "active", published: true },
  { id: "sop2", name: "康复训练标准", type: "service", description: "居家康复训练服务操作标准", keywords: ["康复", "训练", "肢体", "活动"], exampleDialogue: "李爷爷您好，今天我们继续做康复训练...", sopContent: "## 服务流程\n1. 健康评估\n2. 热身活动\n3. 上肢训练\n4. 下肢训练\n5. 放松活动\n6. 训练记录", sopSource: "manual", sopVersion: 2, sopHistory: [], supervisionContent: "## 督导要点\n- 训练强度是否适当", supervisionSource: "manual", supervisionVersion: 1, supervisionHistory: [], guidanceContent: "", guidanceSource: "manual", guidanceVersion: 1, guidanceHistory: [], reportContent: "", reportSource: "manual", reportVersion: 1, reportHistory: [], orgId: "org1", steps: ["健康评估", "热身", "上肢训练", "下肢训练", "放松", "记录"], isComplete: true, status: "active", published: true },
  { id: "sop3", name: "精神慰藉服务标准", type: "service", description: "老年人精神慰藉服务操作规范", keywords: ["精神慰藉", "心理", "陪伴", "聊天"], exampleDialogue: "张奶奶，今天天气不错，我们一起聊聊天吧...", sopContent: "## 服务流程\n1. 情绪评估\n2. 陪伴聊天\n3. 兴趣活动引导\n4. 心理疏导\n5. 服务小结", sopSource: "manual", sopVersion: 1, sopHistory: [], supervisionContent: "", supervisionSource: "manual", supervisionVersion: 1, supervisionHistory: [], guidanceContent: "", guidanceSource: "manual", guidanceVersion: 1, guidanceHistory: [], reportContent: "", reportSource: "manual", reportVersion: 1, reportHistory: [], orgId: "org1", steps: ["情绪评估", "陪伴聊天", "兴趣活动", "心理疏导", "小结"], isComplete: true, status: "active", published: true },
  { id: "sop4", name: "助餐服务标准", type: "service", description: "居家养老助餐服务标准", keywords: ["助餐", "饮食", "营养"], sopContent: "## 服务流程\n1. 饮食需求确认\n2. 食材准备\n3. 烹饪\n4. 协助用餐\n5. 餐后清理", sopSource: "manual", sopVersion: 1, sopHistory: [], supervisionContent: "", supervisionSource: "manual", supervisionVersion: 1, supervisionHistory: [], guidanceContent: "", guidanceSource: "manual", guidanceVersion: 1, guidanceHistory: [], reportContent: "", reportSource: "manual", reportVersion: 1, reportHistory: [], orgId: "org1", steps: ["需求确认", "食材准备", "烹饪", "协助用餐", "清理"], isComplete: false, status: "draft", published: false },
  { id: "sop5", name: "通用服务流程规范", type: "general", description: "所有服务通用的基础流程规范", keywords: ["通用", "流程", "问候", "记录"], sopContent: "## 通用流程\n1. 到达确认\n2. 身份核实\n3. 服务执行\n4. 服务记录\n5. 告别确认", sopSource: "manual", sopVersion: 2, sopHistory: [], supervisionContent: "## 通用督导\n- 是否按时到达\n- 是否完成记录", supervisionSource: "manual", supervisionVersion: 1, supervisionHistory: [], guidanceContent: "", guidanceSource: "manual", guidanceVersion: 1, guidanceHistory: [], reportContent: "", reportSource: "manual", reportVersion: 1, reportHistory: [], orgId: "org1", steps: ["到达确认", "身份核实", "服务执行", "记录", "告别"], isComplete: true, status: "active", published: true },
];

export const homeData = {
  summary: { date: today, totalScheduledServices: 8, unassignedServices: 1, activeSocialWorkers: 5, onlineBadges: 3, recordsNeedReview: 2, exportableServiceRecords: 3 },
  highlights: [
    { id: "h1", type: "schedule_gap" as const, title: "1项服务待分配", description: "赵金凤的生活照料服务尚未分配服务人员", severity: "warning" as const, relatedEntityType: "service_schedule" as const, relatedEntityId: "sch5" },
    { id: "h2", type: "record_review" as const, title: "2条记录待复核", description: "有2条服务记录需要运营人员复核", severity: "info" as const, relatedEntityType: "service_record" as const, relatedEntityId: "sr2" },
    { id: "h3", type: "badge_issue" as const, title: "设备低电量", description: "GY-B005 电量仅12%，请及时充电", severity: "critical" as const, relatedEntityType: "badge" as const, relatedEntityId: "b5" },
    { id: "h4", type: "service_object_risk" as const, title: "跌倒高风险关注", description: "王淑珍和陈国强为跌倒高风险，请关注", severity: "warning" as const, relatedEntityType: "service_object" as const, relatedEntityId: "so1" },
  ],
  activities: [
    { id: "a1", occurredAt: now, title: "周美玲完成康复训练", description: "为陈国强完成康复训练服务", relatedEntityType: "service_record" as const, relatedEntityId: "sr5" },
    { id: "a2", occurredAt: new Date(Date.now() - 3600000).toISOString(), title: "新录音上传", description: "GY-B001 上传了1段新录音", relatedEntityType: "badge" as const, relatedEntityId: "b1" },
    { id: "a3", occurredAt: new Date(Date.now() - 7200000).toISOString(), title: "服务记录已导出", description: "李芳导出了3条服务记录", relatedEntityType: "service_record" as const, relatedEntityId: "sr3" },
  ],
  recommendedActions: [
    { id: "ra1", label: "分配赵金凤的服务人员", targetWorkspace: "service_schedules" as const, relatedEntityId: "sch5" },
    { id: "ra2", label: "复核待审服务记录", targetWorkspace: "service_records" as const, relatedEntityId: "sr2" },
    { id: "ra3", label: "检查低电量设备", targetWorkspace: "smart_badges" as const, relatedEntityId: "b5" },
  ],
  permissionState: "full" as const,
};

export const servicePlans = serviceObjects.flatMap(so => so.servicePlanSummaries.map(sp => ({
  id: sp.id, serviceObjectId: sp.serviceObjectId, serviceProject: sp.serviceProject, cadenceRule: "custom", cadenceLabel: sp.cadenceLabel, preferredTimeWindow: sp.preferredTimeWindow, startDate: "2025-06-01", description: `${so.name}的${sp.serviceProject}计划`, primarySocialWorkerId: sp.primarySocialWorkerId, status: sp.status, exceptions: [], sopLinks: sops.filter(s => s.keywords.some(k => sp.serviceProject.includes(k))).map(s => ({ sopId: s.id, sopName: s.name })),
})));

// ═══════════════════════════════════════════════════════════════════════
// V2 Mock Data — 0604 Design Spec additions
// ═══════════════════════════════════════════════════════════════════════

// ── Qualification Tags (master data) ──

export const qualificationTags = [
  { id: "qt1", name: "护士", category: "medical" },
  { id: "qt2", name: "养老护理员(初级)", category: "caregiving" },
  { id: "qt3", name: "养老护理员(中级)", category: "caregiving" },
  { id: "qt4", name: "养老护理员(高级)", category: "caregiving" },
  { id: "qt5", name: "康复师", category: "medical" },
  { id: "qt6", name: "社工证", category: "other" },
  { id: "qt7", name: "急救证", category: "other" },
  { id: "qt8", name: "心理咨询师", category: "other" },
  { id: "qt9", name: "营养师", category: "medical" },
  { id: "qt10", name: "中医推拿师", category: "medical" },
];

// ── Hangzhou Standard Catalog (41 items) ──

const HZ_CATALOG_ID = "catalog-hz-2024";
const HZ_CAT_CLEAN = "hz-cat-1";
const HZ_CAT_NUTRITION = "hz-cat-2";
const HZ_CAT_EXCRETION = "hz-cat-3";
const HZ_CAT_MOBILITY = "hz-cat-4";
const HZ_CAT_VITALS = "hz-cat-5";
const HZ_CAT_MEDICATION = "hz-cat-6";

export const hangzhouCatalog = {
  id: HZ_CATALOG_ID,
  name: "杭州市长护险服务项目目录",
  region: "hangzhou",
  version: "2024-v1",
  effectiveDate: "2024-07-01",
  status: "active" as const,
  categories: [
    { id: HZ_CAT_CLEAN, catalogId: HZ_CATALOG_ID, name: "清洁卫生类", sortOrder: 1 },
    { id: HZ_CAT_NUTRITION, catalogId: HZ_CATALOG_ID, name: "营养摄取类", sortOrder: 2 },
    { id: HZ_CAT_EXCRETION, catalogId: HZ_CATALOG_ID, name: "排泄护理类", sortOrder: 3 },
    { id: HZ_CAT_MOBILITY, catalogId: HZ_CATALOG_ID, name: "移动舒适和安全护理类", sortOrder: 4 },
    { id: HZ_CAT_VITALS, catalogId: HZ_CATALOG_ID, name: "生命体征观察与护理类", sortOrder: 5 },
    { id: HZ_CAT_MEDICATION, catalogId: HZ_CATALOG_ID, name: "用药指导类", sortOrder: 6 },
  ],
  totalItems: 41,
};

export const hangzhouCatalogItems = [
  // ── 清洁卫生类 (1-15) ──
  { id: "hz-item-01", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 1, name: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", requiredQualifications: [] },
  { id: "hz-item-02", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 2, name: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1-2次/日", requiredQualifications: [] },
  { id: "hz-item-03", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 3, name: "头发清洁与梳理", categoryName: "清洁卫生类", referenceMinutes: 20, frequency: "1-2次/周", requiredQualifications: [] },
  { id: "hz-item-04", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 4, name: "手/足部清洁", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "1次/日", requiredQualifications: [] },
  { id: "hz-item-05", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 5, name: "指/趾甲护理", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "1次/周", requiredQualifications: [] },
  { id: "hz-item-06", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 6, name: "口腔清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1-2次/日", requiredQualifications: [] },
  { id: "hz-item-07", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 7, name: "协助沐浴/擦浴", categoryName: "清洁卫生类", referenceMinutes: 30, frequency: "1-2次/周", requiredQualifications: [] },
  { id: "hz-item-08", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 8, name: "会阴部清洁", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "1-2次/日", requiredQualifications: [] },
  { id: "hz-item-09", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 9, name: "协助更衣", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "必要时", requiredQualifications: [] },
  { id: "hz-item-10", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 10, name: "皮肤护理", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "1-2次/日", requiredQualifications: [] },
  { id: "hz-item-11", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 11, name: "失禁护理", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "必要时", requiredQualifications: [] },
  { id: "hz-item-12", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 12, name: "人工取便术", categoryName: "清洁卫生类", referenceMinutes: 20, frequency: "必要时", requiredQualifications: ["护士"] },
  { id: "hz-item-13", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 13, name: "温水擦浴物理降温", categoryName: "清洁卫生类", referenceMinutes: 20, frequency: "必要时", requiredQualifications: [] },
  { id: "hz-item-14", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 14, name: "床上使用便盆/尿壶", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "必要时", requiredQualifications: [] },
  { id: "hz-item-15", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_CLEAN, seq: 15, name: "晨晚间护理", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "2次/日", requiredQualifications: [] },

  // ── 营养摄取类 (16-18) ──
  { id: "hz-item-16", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_NUTRITION, seq: 16, name: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "3次/日", requiredQualifications: [] },
  { id: "hz-item-17", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_NUTRITION, seq: 17, name: "鼻饲", categoryName: "营养摄取类", referenceMinutes: 30, frequency: "3-5次/日", requiredQualifications: ["护士"] },
  { id: "hz-item-18", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_NUTRITION, seq: 18, name: "留置胃管护理", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "1-2次/日", requiredQualifications: ["护士"] },

  // ── 排泄护理类 (19-26) ──
  { id: "hz-item-19", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_EXCRETION, seq: 19, name: "留置尿管护理", categoryName: "排泄护理类", referenceMinutes: 20, frequency: "1-2次/日", requiredQualifications: ["护士"] },
  { id: "hz-item-20", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_EXCRETION, seq: 20, name: "人工肛门便袋护理", categoryName: "排泄护理类", referenceMinutes: 20, frequency: "必要时", requiredQualifications: ["护士"] },
  { id: "hz-item-21", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_EXCRETION, seq: 21, name: "导尿", categoryName: "排泄护理类", referenceMinutes: 30, frequency: "必要时", requiredQualifications: ["护士"] },
  { id: "hz-item-22", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_EXCRETION, seq: 22, name: "灌肠", categoryName: "排泄护理类", referenceMinutes: 30, frequency: "必要时", requiredQualifications: ["护士"] },
  { id: "hz-item-23", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_EXCRETION, seq: 23, name: "协助如厕/使用便器", categoryName: "排泄护理类", referenceMinutes: 10, frequency: "必要时", requiredQualifications: [] },
  { id: "hz-item-24", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_EXCRETION, seq: 24, name: "尿布/纸尿裤更换", categoryName: "排泄护理类", referenceMinutes: 10, frequency: "必要时", requiredQualifications: [] },
  { id: "hz-item-25", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_EXCRETION, seq: 25, name: "集尿袋护理", categoryName: "排泄护理类", referenceMinutes: 15, frequency: "必要时", requiredQualifications: ["护士"] },
  { id: "hz-item-26", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_EXCRETION, seq: 26, name: "排泄观察与记录", categoryName: "排泄护理类", referenceMinutes: 10, frequency: "1次/日", requiredQualifications: [] },

  // ── 移动舒适和安全护理类 (27-37) ──
  { id: "hz-item-27", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 27, name: "协助翻身与体位转换", categoryName: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "每2小时", requiredQualifications: [] },
  { id: "hz-item-28", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 28, name: "协助移乘", categoryName: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "必要时", requiredQualifications: [] },
  { id: "hz-item-29", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 29, name: "协助行走", categoryName: "移动舒适和安全护理类", referenceMinutes: 15, frequency: "必要时", requiredQualifications: [] },
  { id: "hz-item-30", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 30, name: "安全防护", categoryName: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "必要时", requiredQualifications: [] },
  { id: "hz-item-31", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 31, name: "压疮预防与护理", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "每2小时", requiredQualifications: ["护士"] },
  { id: "hz-item-32", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 32, name: "生活自理能力训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", requiredQualifications: [] },
  { id: "hz-item-33", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 33, name: "肢体活动训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1-2次/日", requiredQualifications: [] },
  { id: "hz-item-34", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 34, name: "管路固定", categoryName: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "必要时", requiredQualifications: ["护士"] },
  { id: "hz-item-35", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 35, name: "情绪安抚与心理疏导", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "必要时", requiredQualifications: [] },
  { id: "hz-item-36", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 36, name: "安全用氧护理", categoryName: "移动舒适和安全护理类", referenceMinutes: 15, frequency: "必要时", requiredQualifications: ["护士"] },
  { id: "hz-item-37", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MOBILITY, seq: 37, name: "排痰护理", categoryName: "移动舒适和安全护理类", referenceMinutes: 15, frequency: "必要时", requiredQualifications: ["护士"] },

  // ── 生命体征观察与护理类 (38-39) ──
  { id: "hz-item-38", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_VITALS, seq: 38, name: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1-2次/日", requiredQualifications: [] },
  { id: "hz-item-39", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_VITALS, seq: 39, name: "血糖监测", categoryName: "生命体征观察与护理类", referenceMinutes: 10, frequency: "必要时", requiredQualifications: ["护士"] },

  // ── 用药指导类 (40-41) ──
  { id: "hz-item-40", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MEDICATION, seq: 40, name: "口服给药", categoryName: "用药指导类", referenceMinutes: 10, frequency: "遵医嘱", requiredQualifications: ["护士"] },
  { id: "hz-item-41", catalogId: HZ_CATALOG_ID, categoryId: HZ_CAT_MEDICATION, seq: 41, name: "药物管理指导", categoryName: "用药指导类", referenceMinutes: 15, frequency: "必要时", requiredQualifications: ["护士"] },
];

// ── Service Plans V2 (catalog-based) ──

export const servicePlansV2 = [
  {
    id: "spv2-1",
    serviceObjectId: "so1", // 王淑珍
    catalogId: HZ_CATALOG_ID,
    preferredWorkerId: "sw1", // 刘秀英
    status: "active" as const,
    createdAt: "2026-05-01T08:00:00Z",
    updatedAt: "2026-05-28T10:00:00Z",
    approvedBy: "u2", // 李芳
    items: [
      { id: "spi-1-1", planId: "spv2-1", standardItemId: "hz-item-01", standardItemName: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", requiredQualifications: [], notes: "老人行动不便，需独立完成" },
      { id: "spi-1-2", planId: "spv2-1", standardItemId: "hz-item-02", standardItemName: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-1-3", planId: "spv2-1", standardItemId: "hz-item-07", standardItemName: "协助沐浴/擦浴", categoryName: "清洁卫生类", referenceMinutes: 30, frequency: "1次/周", requiredQualifications: [] },
      { id: "spi-1-4", planId: "spv2-1", standardItemId: "hz-item-09", standardItemName: "协助更衣", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "必要时", requiredQualifications: [] },
      { id: "spi-1-5", planId: "spv2-1", standardItemId: "hz-item-16", standardItemName: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "2次/日", requiredQualifications: [] },
      { id: "spi-1-6", planId: "spv2-1", standardItemId: "hz-item-27", standardItemName: "协助翻身与体位转换", categoryName: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "每2小时", requiredQualifications: [], notes: "注意膝关节疼痛" },
      { id: "spi-1-7", planId: "spv2-1", standardItemId: "hz-item-38", standardItemName: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-1-8", planId: "spv2-1", standardItemId: "hz-item-35", standardItemName: "情绪安抚与心理疏导", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "必要时", requiredQualifications: [], notes: "独居老人，需关注心理状态" },
    ],
  },
  {
    id: "spv2-2",
    serviceObjectId: "so2", // 李德明
    catalogId: HZ_CATALOG_ID,
    preferredWorkerId: "sw2", // 陈建国
    status: "active" as const,
    createdAt: "2026-05-05T08:00:00Z",
    updatedAt: "2026-05-20T14:00:00Z",
    approvedBy: "u2",
    items: [
      { id: "spi-2-1", planId: "spv2-2", standardItemId: "hz-item-02", standardItemName: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-2-2", planId: "spv2-2", standardItemId: "hz-item-16", standardItemName: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "3次/日", requiredQualifications: [], notes: "糖尿病饮食控制" },
      { id: "spi-2-3", planId: "spv2-2", standardItemId: "hz-item-32", standardItemName: "生活自理能力训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-2-4", planId: "spv2-2", standardItemId: "hz-item-33", standardItemName: "肢体活动训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-2-5", planId: "spv2-2", standardItemId: "hz-item-38", standardItemName: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-2-6", planId: "spv2-2", standardItemId: "hz-item-39", standardItemName: "血糖监测", categoryName: "生命体征观察与护理类", referenceMinutes: 10, frequency: "1次/日", requiredQualifications: ["护士"], notes: "血糖需密切监控" },
    ],
  },
  {
    id: "spv2-3",
    serviceObjectId: "so3", // 张秀兰
    catalogId: HZ_CATALOG_ID,
    preferredWorkerId: "sw4", // 孙伟
    status: "active" as const,
    createdAt: "2026-05-10T08:00:00Z",
    updatedAt: "2026-05-25T16:00:00Z",
    approvedBy: "u3",
    items: [
      { id: "spi-3-1", planId: "spv2-3", standardItemId: "hz-item-02", standardItemName: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-3-2", planId: "spv2-3", standardItemId: "hz-item-06", standardItemName: "口腔清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-3-3", planId: "spv2-3", standardItemId: "hz-item-35", standardItemName: "情绪安抚与心理疏导", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", requiredQualifications: [], notes: "丧偶后情绪低落，重点关注" },
      { id: "spi-3-4", planId: "spv2-3", standardItemId: "hz-item-38", standardItemName: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1次/日", requiredQualifications: [], notes: "高血压，需每日监测" },
      { id: "spi-3-5", planId: "spv2-3", standardItemId: "hz-item-41", standardItemName: "药物管理指导", categoryName: "用药指导类", referenceMinutes: 15, frequency: "1次/日", requiredQualifications: ["护士"], notes: "降压药服用指导" },
    ],
  },
  {
    id: "spv2-4",
    serviceObjectId: "so5", // 陈国强
    catalogId: HZ_CATALOG_ID,
    preferredWorkerId: "sw3", // 周美玲
    status: "active" as const,
    createdAt: "2026-04-20T08:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    approvedBy: "u2",
    items: [
      { id: "spi-4-1", planId: "spv2-4", standardItemId: "hz-item-01", standardItemName: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-4-2", planId: "spv2-4", standardItemId: "hz-item-07", standardItemName: "协助沐浴/擦浴", categoryName: "清洁卫生类", referenceMinutes: 30, frequency: "2次/周", requiredQualifications: [] },
      { id: "spi-4-3", planId: "spv2-4", standardItemId: "hz-item-09", standardItemName: "协助更衣", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-4-4", planId: "spv2-4", standardItemId: "hz-item-16", standardItemName: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "3次/日", requiredQualifications: [] },
      { id: "spi-4-5", planId: "spv2-4", standardItemId: "hz-item-27", standardItemName: "协助翻身与体位转换", categoryName: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "每2小时", requiredQualifications: [] },
      { id: "spi-4-6", planId: "spv2-4", standardItemId: "hz-item-28", standardItemName: "协助移乘", categoryName: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "必要时", requiredQualifications: [] },
      { id: "spi-4-7", planId: "spv2-4", standardItemId: "hz-item-29", standardItemName: "协助行走", categoryName: "移动舒适和安全护理类", referenceMinutes: 15, frequency: "1次/日", requiredQualifications: [], notes: "使用助行器" },
      { id: "spi-4-8", planId: "spv2-4", standardItemId: "hz-item-33", standardItemName: "肢体活动训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "2次/日", requiredQualifications: [], notes: "中风后遗症康复训练" },
      { id: "spi-4-9", planId: "spv2-4", standardItemId: "hz-item-31", standardItemName: "压疮预防与护理", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "每2小时", requiredQualifications: ["护士"] },
      { id: "spi-4-10", planId: "spv2-4", standardItemId: "hz-item-38", standardItemName: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "2次/日", requiredQualifications: [] },
    ],
  },
  {
    id: "spv2-5",
    serviceObjectId: "so4", // 赵金凤
    catalogId: HZ_CATALOG_ID,
    status: "paused" as const,
    createdAt: "2026-05-20T08:00:00Z",
    updatedAt: "2026-05-28T12:00:00Z",
    items: [
      { id: "spi-5-1", planId: "spv2-5", standardItemId: "hz-item-02", standardItemName: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", requiredQualifications: [] },
      { id: "spi-5-2", planId: "spv2-5", standardItemId: "hz-item-09", standardItemName: "协助更衣", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "必要时", requiredQualifications: [] },
      { id: "spi-5-3", planId: "spv2-5", standardItemId: "hz-item-16", standardItemName: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "2次/日", requiredQualifications: [] },
      { id: "spi-5-4", planId: "spv2-5", standardItemId: "hz-item-30", standardItemName: "安全防护", categoryName: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "必要时", requiredQualifications: [], notes: "视力不佳，注意防跌倒" },
      { id: "spi-5-5", planId: "spv2-5", standardItemId: "hz-item-38", standardItemName: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1次/日", requiredQualifications: [] },
    ],
  },
];

// ── Devices (generalized from SmartBadge) ──

export const devices = [
  // mmwave_radar — bound to workers
  { id: "dev-r1", deviceCode: "GY-R001", deviceType: "mmwave_radar" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, batteryPercent: 78, activatedAt: "2026-04-01T08:00:00Z", lastSyncAt: now, boundToType: "worker" as const, boundToId: "sw1", boundToName: "刘秀英", capabilities: ["mmwave_sensing" as const, "audio_recording" as const, "audio_playback" as const, "network_call" as const] },
  { id: "dev-r2", deviceCode: "GY-R002", deviceType: "mmwave_radar" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, batteryPercent: 91, activatedAt: "2026-04-05T08:00:00Z", lastSyncAt: now, boundToType: "worker" as const, boundToId: "sw2", boundToName: "陈建国", capabilities: ["mmwave_sensing" as const, "audio_recording" as const, "audio_playback" as const, "network_call" as const] },
  { id: "dev-r3", deviceCode: "GY-R003", deviceType: "mmwave_radar" as const, orgId: "org1", siteId: "site2", siteName: "幸福家园服务站", status: "in_use" as const, batteryPercent: 65, activatedAt: "2026-04-10T08:00:00Z", lastSyncAt: now, boundToType: "worker" as const, boundToId: "sw4", boundToName: "孙伟", capabilities: ["mmwave_sensing" as const, "audio_recording" as const, "audio_playback" as const, "network_call" as const] },
  // ble_beacon — bound to elder homes
  { id: "dev-s1", deviceCode: "GY-S001", deviceType: "ble_beacon" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, activatedAt: "2026-04-15T08:00:00Z", lastSyncAt: now, boundToType: "elder_home" as const, boundToId: "so1", boundToName: "王淑珍", capabilities: ["ble_proximity" as const] },
  { id: "dev-s2", deviceCode: "GY-S002", deviceType: "ble_beacon" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, activatedAt: "2026-04-15T08:00:00Z", lastSyncAt: now, boundToType: "elder_home" as const, boundToId: "so2", boundToName: "李德明", capabilities: ["ble_proximity" as const] },
  { id: "dev-s3", deviceCode: "GY-S003", deviceType: "ble_beacon" as const, orgId: "org1", siteId: "site2", siteName: "幸福家园服务站", status: "in_use" as const, activatedAt: "2026-04-20T08:00:00Z", lastSyncAt: now, boundToType: "elder_home" as const, boundToId: "so3", boundToName: "张秀兰", capabilities: ["ble_proximity" as const] },
  { id: "dev-s4", deviceCode: "GY-S004", deviceType: "ble_beacon" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, activatedAt: "2026-04-25T08:00:00Z", lastSyncAt: now, boundToType: "elder_home" as const, boundToId: "so5", boundToName: "陈国强", capabilities: ["ble_proximity" as const] },
  // smart_badge — bound to workers
  { id: "dev-b1", deviceCode: "GY-B001", deviceType: "smart_badge" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, batteryPercent: 85, activatedAt: "2026-05-01T08:00:00Z", lastSyncAt: now, boundToType: "worker" as const, boundToId: "sw1", boundToName: "刘秀英", capabilities: ["audio_recording" as const, "gps_location" as const] },
  { id: "dev-b2", deviceCode: "GY-B002", deviceType: "smart_badge" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, batteryPercent: 62, activatedAt: "2026-05-01T08:00:00Z", lastSyncAt: now, boundToType: "worker" as const, boundToId: "sw2", boundToName: "陈建国", capabilities: ["audio_recording" as const, "gps_location" as const] },
  { id: "dev-b3", deviceCode: "GY-B003", deviceType: "smart_badge" as const, orgId: "org1", siteId: "site2", siteName: "幸福家园服务站", status: "available" as const, batteryPercent: 100, activatedAt: "2026-05-10T08:00:00Z", capabilities: ["audio_recording" as const, "gps_location" as const] },
  // phone_app — abstract device (login credentials) bound to workers
  { id: "dev-app-1", deviceCode: "APP-SW1", deviceType: "phone_app" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, boundToType: "worker" as const, boundToId: "sw1", boundToName: "刘秀英", capabilities: ["audio_recording" as const, "gps_location" as const], appAccount: { username: "liuxiuying", passwordSet: true, lastLoginAt: "2026-06-06T08:00:00Z" } },
  { id: "dev-app-2", deviceCode: "APP-SW2", deviceType: "phone_app" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, boundToType: "worker" as const, boundToId: "sw2", boundToName: "陈建国", capabilities: ["audio_recording" as const, "gps_location" as const], appAccount: { username: "chenjianguo", passwordSet: true, lastLoginAt: "2026-06-06T07:30:00Z" } },
  { id: "dev-app-3", deviceCode: "APP-SW3", deviceType: "phone_app" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "in_use" as const, boundToType: "worker" as const, boundToId: "sw3", boundToName: "周美玲", capabilities: ["audio_recording" as const, "gps_location" as const], appAccount: { username: "zhoumeiling", passwordSet: true, lastLoginAt: "2026-06-05T16:00:00Z" } },
  { id: "dev-app-4", deviceCode: "APP-SW4", deviceType: "phone_app" as const, orgId: "org1", siteId: "site2", siteName: "幸福家园服务站", status: "in_use" as const, boundToType: "worker" as const, boundToId: "sw4", boundToName: "孙伟", capabilities: ["audio_recording" as const, "gps_location" as const], appAccount: { username: "sunwei", passwordSet: true, lastLoginAt: "2026-06-06T09:15:00Z" } },
  { id: "dev-app-5", deviceCode: "APP-SW5", deviceType: "phone_app" as const, orgId: "org1", siteId: "site2", siteName: "幸福家园服务站", status: "in_use" as const, boundToType: "worker" as const, boundToId: "sw5", boundToName: "吴丽华", capabilities: ["audio_recording" as const, "gps_location" as const], appAccount: { username: "wulihua", passwordSet: true, lastLoginAt: "2026-06-05T14:20:00Z" } },
  { id: "dev-app-6", deviceCode: "APP-SW6", deviceType: "phone_app" as const, orgId: "org1", siteId: "site1", siteName: "阳光社区服务站", status: "disabled" as const, boundToType: "worker" as const, boundToId: "sw6", boundToName: "马志强", capabilities: ["audio_recording" as const, "gps_location" as const], appAccount: { username: "mazhiqiang", passwordSet: false } },
];

// ── Service Sessions ──

export const serviceSessions = [
  // ─── 2 in_progress sessions ───
  {
    id: "sess-01",
    serviceDate: today,
    serviceObjectId: "so1",
    serviceObjectName: "王淑珍",
    serviceObjectAddress: "阳光路120号3楼301",
    workerId: "sw1",
    workerName: "刘秀英",
    workerQualifications: ["养老护理员(初级)", "急救证"],
    planId: "spv2-1",
    // 0606 additions
    scheduleId: "sch1",
    scheduleMatchStatus: "exact" as const,
    plannedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    durationStatus: "normal" as const,
    elderVerification: {
      status: "pass" as const,
      mobilityDetected: false,
      mobilityLevel: "none" as const,
      declaredDisabilityLevel: "重度失能",
      consistentWithDeclaration: true,
      radarDataAvailable: true,
      aiAnalysisSummary: "雷达数据显示老人全程在床/轮椅区域，无自主移动行为，与重度失能申报一致。",
    },
    selectedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-02", name: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-09", name: "协助更衣", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "必要时", checked: true },
      { standardItemId: "hz-item-16", name: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "2次/日", checked: true },
      { standardItemId: "hz-item-27", name: "协助翻身与体位转换", categoryName: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "每2小时", checked: true },
      { standardItemId: "hz-item-38", name: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1次/日", checked: true },
    ],
    estimatedMinutes: 80,
    status: "in_progress" as const,
    verification: {
      gpsMatch: true,
      gpsWorkerLat: 30.2741,
      gpsWorkerLng: 120.1551,
      gpsElderLat: 30.2742,
      gpsElderLng: 120.1550,
      bleBeaconMatch: true,
      bleBeaconId: "dev-s1",
      voiceprintMatch: true,
      verifiedAt: today + "T09:02:00Z",
    },
    startedAt: today + "T09:05:00Z",
    realtimeData: {
      audioStatus: "recording" as const,
      radarStatus: "connected" as const,
      radarDeviceId: "dev-r1",
      transcriptLog: [
        { timestamp: today + "T09:05:30Z", speaker: "worker" as const, text: "王奶奶，早上好！我来给您做今天的服务了。" },
        { timestamp: today + "T09:06:00Z", speaker: "elder" as const, text: "好的，小刘来了啊。" },
        { timestamp: today + "T09:07:15Z", speaker: "worker" as const, text: "我先帮您整理一下床铺。" },
        { timestamp: today + "T09:10:00Z", speaker: "worker" as const, text: "好了，床铺整理好了。现在帮您洗洗脸。" },
        { timestamp: today + "T09:10:30Z", speaker: "elder" as const, text: "水温刚好，谢谢你。" },
        { timestamp: today + "T09:15:00Z", speaker: "worker" as const, text: "王奶奶，我现在帮您换一下衣服。" },
        { timestamp: today + "T09:20:00Z", speaker: "worker" as const, text: "好了，我们来量一下血压。" },
        { timestamp: today + "T09:22:00Z", speaker: "worker" as const, text: "血压135/85，比昨天稍微高一点，我记录一下。" },
      ],
      aiGuidanceLog: [
        { timestamp: today + "T09:08:00Z", type: "reminder" as const, message: "提醒：请注意检查老人皮肤状况，关注膝关节区域。", triggeredBy: "timer" as const, ttsPlayed: true },
        { timestamp: today + "T09:22:30Z", type: "warning" as const, message: "注意：血压偏高（135/85），建议关注老人近期情绪和饮食。", triggeredBy: "audio" as const, ttsPlayed: false },
      ],
    },
    evidenceChain: { gps: true, bleBeacon: true, voiceprint: true, audioRecording: true, radarData: true, photo: false },
  },
  {
    id: "sess-02",
    serviceDate: today,
    serviceObjectId: "so5",
    serviceObjectName: "陈国强",
    serviceObjectAddress: "阳光路200号1楼101",
    workerId: "sw3",
    workerName: "周美玲",
    workerQualifications: ["养老护理员(初级)", "社工证"],
    planId: "spv2-4",
    // 0606 additions
    scheduleId: "sch4",
    scheduleMatchStatus: "exact" as const,
    plannedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 },
      { standardItemId: "hz-item-29", name: "协助行走", referenceMinutes: 15 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    durationStatus: "normal" as const,
    elderVerification: {
      status: "pass" as const,
      mobilityDetected: true,
      mobilityLevel: "minimal" as const,
      declaredDisabilityLevel: "重度失能",
      consistentWithDeclaration: true,
      radarDataAvailable: true,
      aiAnalysisSummary: "老人在护工辅助下有微弱的肢体活动（康复训练期间），属正常康复表现，与重度失能（中风后遗症）申报一致。",
    },
    selectedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-16", name: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "3次/日", checked: true },
      { standardItemId: "hz-item-27", name: "协助翻身与体位转换", categoryName: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "每2小时", checked: true },
      { standardItemId: "hz-item-33", name: "肢体活动训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "2次/日", checked: true },
      { standardItemId: "hz-item-29", name: "协助行走", categoryName: "移动舒适和安全护理类", referenceMinutes: 15, frequency: "1次/日", checked: true },
    ],
    estimatedMinutes: 75,
    status: "in_progress" as const,
    verification: {
      gpsMatch: true,
      gpsWorkerLat: 30.2800,
      gpsWorkerLng: 120.1600,
      gpsElderLat: 30.2801,
      gpsElderLng: 120.1601,
      bleBeaconMatch: true,
      bleBeaconId: "dev-s4",
      voiceprintMatch: true,
      verifiedAt: today + "T10:02:00Z",
    },
    startedAt: today + "T10:05:00Z",
    realtimeData: {
      audioStatus: "recording" as const,
      radarStatus: "connected" as const,
      radarDeviceId: "dev-r1",
      transcriptLog: [
        { timestamp: today + "T10:05:30Z", speaker: "worker" as const, text: "陈爷爷，今天感觉怎么样？" },
        { timestamp: today + "T10:06:00Z", speaker: "elder" as const, text: "还行，右手今天感觉好一些。" },
        { timestamp: today + "T10:07:00Z", speaker: "worker" as const, text: "太好了！我们先做一下康复训练，然后帮您翻身。" },
        { timestamp: today + "T10:15:00Z", speaker: "worker" as const, text: "右手握力不错，我们再试试抬腿动作。" },
        { timestamp: today + "T10:20:00Z", speaker: "elder" as const, text: "有点累了。" },
        { timestamp: today + "T10:20:30Z", speaker: "worker" as const, text: "好的，我们休息一下再继续。" },
      ],
      aiGuidanceLog: [
        { timestamp: today + "T10:10:00Z", type: "guidance" as const, message: "引导：右侧肢体训练按标准流程进行，注意观察疼痛反应。", triggeredBy: "system" as const, ttsPlayed: true },
        { timestamp: today + "T10:20:30Z", type: "reminder" as const, message: "提醒：老人表示疲劳，建议休息5分钟后继续，避免过度训练。", triggeredBy: "audio" as const, ttsPlayed: true },
      ],
    },
    evidenceChain: { gps: true, bleBeacon: true, voiceprint: true, audioRecording: true, radarData: true, photo: false },
  },

  // ─── 3 completed sessions (with full evidence chain) ───
  {
    id: "sess-03",
    serviceDate: offsetDate(-1),
    serviceObjectId: "so1",
    serviceObjectName: "王淑珍",
    serviceObjectAddress: "阳光路120号3楼301",
    workerId: "sw1",
    workerName: "刘秀英",
    workerQualifications: ["养老护理员(初级)", "急救证"],
    planId: "spv2-1",
    // 0606 additions
    scheduleMatchStatus: "exact" as const,
    plannedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-07", name: "协助沐浴/擦浴", referenceMinutes: 30 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    confirmedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-07", name: "协助沐浴/擦浴", referenceMinutes: 30 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    itemsDiff: "match" as const,
    durationStatus: "normal" as const,
    elderVerification: {
      status: "pass" as const,
      mobilityDetected: false,
      mobilityLevel: "none" as const,
      declaredDisabilityLevel: "重度失能",
      consistentWithDeclaration: true,
      radarDataAvailable: true,
      heatmapUrl: "/mock-radar/sess-03-heatmap.png",
      timelineDataUrl: "/mock-radar/sess-03-timeline.json",
      aiAnalysisSummary: "老人全程在床/轮椅区域活动，护工活动范围覆盖卧室和厨房。行为模式与重度失能申报一致。",
    },
    selectedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-02", name: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-07", name: "协助沐浴/擦浴", categoryName: "清洁卫生类", referenceMinutes: 30, frequency: "1次/周", checked: true },
      { standardItemId: "hz-item-16", name: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "2次/日", checked: true },
      { standardItemId: "hz-item-38", name: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1次/日", checked: true },
    ],
    estimatedMinutes: 85,
    status: "completed" as const,
    verification: {
      gpsMatch: true,
      gpsWorkerLat: 30.2741,
      gpsWorkerLng: 120.1551,
      gpsElderLat: 30.2742,
      gpsElderLng: 120.1550,
      bleBeaconMatch: true,
      bleBeaconId: "dev-s1",
      voiceprintMatch: true,
      verifiedAt: offsetDate(-1) + "T09:02:00Z",
    },
    startedAt: offsetDate(-1) + "T09:05:00Z",
    completedAt: offsetDate(-1) + "T10:25:00Z",
    submittedAt: offsetDate(-1) + "T10:28:00Z",
    completionPhoto: "/mock-photos/sess-03-completion.jpg",
    actualMinutes: 80,
    evidenceChain: { gps: true, bleBeacon: true, voiceprint: true, audioRecording: true, radarData: true, photo: true },
    aiAssessment: {
      qualityScore: 92,
      summary: "刘秀英为王淑珍完成了5项护理服务，整体质量优秀。服务流程规范，与老人沟通良好，各项操作符合标准要求。血压记录及时准确。",
      itemCompletionRate: 1.0,
      anomalies: [],
      recommendations: ["建议增加膝关节护理关注频次"],
    },
  },
  {
    id: "sess-04",
    serviceDate: offsetDate(-1),
    serviceObjectId: "so2",
    serviceObjectName: "李德明",
    serviceObjectAddress: "阳光路88号1楼102",
    workerId: "sw2",
    workerName: "陈建国",
    workerQualifications: ["养老护理员(中级)"],
    planId: "spv2-2",
    // 0606 additions
    scheduleMatchStatus: "partial" as const,
    plannedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
      { standardItemId: "hz-item-32", name: "生活自理能力训练", referenceMinutes: 20 },
      { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    confirmedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
      { standardItemId: "hz-item-32", name: "生活自理能力训练", referenceMinutes: 20 },
      { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
      { standardItemId: "hz-item-39", name: "血糖监测", referenceMinutes: 10 },
    ],
    itemsDiff: "added" as const,
    durationStatus: "normal" as const,
    elderVerification: {
      status: "pass" as const,
      mobilityDetected: true,
      mobilityLevel: "minimal" as const,
      declaredDisabilityLevel: "中度失能",
      consistentWithDeclaration: true,
      radarDataAvailable: true,
      heatmapUrl: "/mock-radar/sess-04-heatmap.png",
      timelineDataUrl: "/mock-radar/sess-04-timeline.json",
      aiAnalysisSummary: "老人在训练期间有少量辅助下的活动，与轻度认知障碍+中度失能申报一致。",
    },
    selectedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-16", name: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "3次/日", checked: true },
      { standardItemId: "hz-item-32", name: "生活自理能力训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-33", name: "肢体活动训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-38", name: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1次/日", checked: true },
    ],
    estimatedMinutes: 85,
    status: "completed" as const,
    verification: {
      gpsMatch: true,
      gpsWorkerLat: 30.2710,
      gpsWorkerLng: 120.1520,
      gpsElderLat: 30.2711,
      gpsElderLng: 120.1521,
      bleBeaconMatch: true,
      bleBeaconId: "dev-s2",
      voiceprintMatch: true,
      verifiedAt: offsetDate(-1) + "T14:02:00Z",
    },
    startedAt: offsetDate(-1) + "T14:05:00Z",
    completedAt: offsetDate(-1) + "T15:20:00Z",
    submittedAt: offsetDate(-1) + "T15:23:00Z",
    completionPhoto: "/mock-photos/sess-04-completion.jpg",
    actualMinutes: 75,
    evidenceChain: { gps: true, bleBeacon: true, voiceprint: true, audioRecording: true, radarData: true, photo: true },
    aiAssessment: {
      qualityScore: 88,
      summary: "陈建国为李德明完成5项服务。肢体活动训练因老人疲劳提前结束，其余项目完成良好。饮食指导方面注意到糖尿病饮食控制。",
      itemCompletionRate: 0.9,
      anomalies: ["肢体活动训练未完全完成"],
      recommendations: ["根据老人体力调整训练强度", "注意监控餐后血糖"],
    },
  },
  {
    id: "sess-05",
    serviceDate: offsetDate(-2),
    serviceObjectId: "so3",
    serviceObjectName: "张秀兰",
    serviceObjectAddress: "幸福路150号5楼502",
    workerId: "sw4",
    workerName: "孙伟",
    workerQualifications: ["养老护理员(初级)"],
    planId: "spv2-3",
    // 0606 additions
    scheduleMatchStatus: "exact" as const,
    plannedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-06", name: "口腔清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    confirmedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-06", name: "口腔清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    itemsDiff: "match" as const,
    durationStatus: "normal" as const,
    elderVerification: {
      status: "pass" as const,
      mobilityDetected: true,
      mobilityLevel: "moderate" as const,
      declaredDisabilityLevel: "中度失能",
      consistentWithDeclaration: true,
      radarDataAvailable: true,
      aiAnalysisSummary: "老人在服务期间有中等程度自主活动（走动到客厅聊天），与中度失能申报一致。",
    },
    selectedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-06", name: "口腔清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-38", name: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1次/日", checked: true },
    ],
    estimatedMinutes: 55,
    status: "completed" as const,
    verification: {
      gpsMatch: true,
      gpsWorkerLat: 30.2580,
      gpsWorkerLng: 120.1430,
      gpsElderLat: 30.2581,
      gpsElderLng: 120.1431,
      bleBeaconMatch: true,
      bleBeaconId: "dev-s3",
      voiceprintMatch: true,
      verifiedAt: offsetDate(-2) + "T10:02:00Z",
    },
    startedAt: offsetDate(-2) + "T10:05:00Z",
    completedAt: offsetDate(-2) + "T10:58:00Z",
    submittedAt: offsetDate(-2) + "T11:00:00Z",
    completionPhoto: "/mock-photos/sess-05-completion.jpg",
    actualMinutes: 53,
    evidenceChain: { gps: true, bleBeacon: true, voiceprint: true, audioRecording: true, radarData: true, photo: true },
    aiAssessment: {
      qualityScore: 95,
      summary: "孙伟为张秀兰提供了高质量的护理服务。特别是心理疏导方面表现突出，老人情绪明显改善。血压监测结果正常。",
      itemCompletionRate: 1.0,
      anomalies: [],
      recommendations: ["继续关注老人心理状态"],
    },
  },

  // ─── 2 completed with anomalies ───
  {
    id: "sess-06",
    serviceDate: offsetDate(-3),
    serviceObjectId: "so1",
    serviceObjectName: "王淑珍",
    serviceObjectAddress: "阳光路120号3楼301",
    workerId: "sw1",
    workerName: "刘秀英",
    workerQualifications: ["养老护理员(初级)", "急救证"],
    planId: "spv2-1",
    // 0606 additions — elderVerification FAIL (suspicious mobility)
    scheduleMatchStatus: "partial" as const,
    plannedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
    ],
    confirmedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
    ],
    itemsDiff: "match" as const,
    durationStatus: "too_short" as const,
    elderVerification: {
      status: "fail" as const,
      mobilityDetected: true,
      mobilityLevel: "normal" as const,
      declaredDisabilityLevel: "重度失能",
      consistentWithDeclaration: false,
      radarDataAvailable: true,
      heatmapUrl: "/mock-radar/sess-06-heatmap.png",
      timelineDataUrl: "/mock-radar/sess-06-timeline.json",
      aiAnalysisSummary: "异常：老人被申报为重度失能，但雷达数据显示其在服务期间多次自主起身、独立行走至厨房和阳台，活动能力明显超出重度失能范围。建议复核失能等级评定。",
    },
    selectedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-02", name: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-16", name: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "2次/日", checked: true },
    ],
    estimatedMinutes: 40,
    status: "completed" as const,
    verification: {
      gpsMatch: false, // GPS mismatch anomaly
      gpsWorkerLat: 30.2900, // >500m away
      gpsWorkerLng: 120.1700,
      gpsElderLat: 30.2742,
      gpsElderLng: 120.1550,
      bleBeaconMatch: true,
      bleBeaconId: "dev-s1",
      voiceprintMatch: true,
      verifiedAt: offsetDate(-3) + "T09:02:00Z",
    },
    startedAt: offsetDate(-3) + "T09:05:00Z",
    completedAt: offsetDate(-3) + "T09:42:00Z",
    submittedAt: offsetDate(-3) + "T09:45:00Z",
    completionPhoto: "/mock-photos/sess-06-completion.jpg",
    actualMinutes: 37,
    evidenceChain: { gps: false, bleBeacon: true, voiceprint: true, audioRecording: true, radarData: true, photo: true },
    aiAssessment: {
      qualityScore: 65,
      summary: "服务基本完成，但GPS定位与老人地址不匹配（距离超过500米）。蓝牙星标和声纹均验证通过，可能是GPS信号漂移导致。服务时长偏短。",
      itemCompletionRate: 1.0,
      anomalies: ["GPS定位与老人地址不匹配（距离约1.8km）", "服务时长低于预估（37分钟 vs 40分钟预估）"],
      recommendations: ["复核GPS设备精度", "关注服务时长是否充足"],
    },
  },
  {
    id: "sess-07",
    serviceDate: offsetDate(-4),
    serviceObjectId: "so5",
    serviceObjectName: "陈国强",
    serviceObjectAddress: "阳光路200号1楼101",
    workerId: "sw3",
    workerName: "周美玲",
    workerQualifications: ["养老护理员(初级)", "社工证"],
    planId: "spv2-4",
    // 0606 additions — elderVerification INCONCLUSIVE (insufficient radar data)
    scheduleMatchStatus: "exact" as const,
    plannedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    confirmedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    itemsDiff: "match" as const,
    durationStatus: "normal" as const,
    elderVerification: {
      status: "inconclusive" as const,
      mobilityDetected: true,
      mobilityLevel: "moderate" as const,
      declaredDisabilityLevel: "重度失能",
      consistentWithDeclaration: false,
      radarDataAvailable: true,
      heatmapUrl: "/mock-radar/sess-07-heatmap.png",
      timelineDataUrl: "/mock-radar/sess-07-timeline.json",
      aiAnalysisSummary: "老人在康复训练期间有中等程度活动，部分活动可能是护工辅助下完成。由于训练场景的特殊性，无法确定是否为自主活动。建议结合回访进一步核实。",
    },
    selectedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-33", name: "肢体活动训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "2次/日", checked: true },
      { standardItemId: "hz-item-38", name: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "2次/日", checked: true },
    ],
    estimatedMinutes: 45,
    status: "completed" as const,
    verification: {
      gpsMatch: true,
      gpsWorkerLat: 30.2800,
      gpsWorkerLng: 120.1600,
      gpsElderLat: 30.2801,
      gpsElderLng: 120.1601,
      bleBeaconMatch: true,
      bleBeaconId: "dev-s4",
      voiceprintMatch: false, // Voiceprint mismatch anomaly
      verifiedAt: offsetDate(-4) + "T08:02:00Z",
    },
    startedAt: offsetDate(-4) + "T08:05:00Z",
    completedAt: offsetDate(-4) + "T08:48:00Z",
    submittedAt: offsetDate(-4) + "T08:50:00Z",
    completionPhoto: "/mock-photos/sess-07-completion.jpg",
    actualMinutes: 43,
    evidenceChain: { gps: true, bleBeacon: true, voiceprint: false, audioRecording: true, radarData: true, photo: true },
    aiAssessment: {
      qualityScore: 70,
      summary: "服务项目全部完成，但声纹匹配失败。GPS和蓝牙星标均验证通过。可能的原因：周美玲声纹采集时间较早需要更新，或现场有家属同时说话干扰。",
      itemCompletionRate: 1.0,
      anomalies: ["声纹验证未通过"],
      recommendations: ["建议重新采集周美玲的声纹基线", "核查现场是否有第三方人员在场"],
    },
  },

  // ─── 1 cancelled session ───
  {
    id: "sess-08",
    serviceDate: offsetDate(-2),
    serviceObjectId: "so2",
    serviceObjectName: "李德明",
    serviceObjectAddress: "阳光路88号1楼102",
    workerId: "sw2",
    workerName: "陈建国",
    workerQualifications: ["养老护理员(中级)"],
    planId: "spv2-2",
    // 0606 additions
    scheduleMatchStatus: "unplanned" as const,
    elderVerification: {
      status: "missing" as const,
      mobilityDetected: false,
      mobilityLevel: "none" as const,
      declaredDisabilityLevel: "中度失能",
      consistentWithDeclaration: true,
      radarDataAvailable: false,
    },
    selectedItems: [
      { standardItemId: "hz-item-32", name: "生活自理能力训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-33", name: "肢体活动训练", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", checked: true },
    ],
    estimatedMinutes: 40,
    status: "cancelled" as const,
    verification: {
      gpsMatch: null,
      bleBeaconMatch: null,
      voiceprintMatch: null,
    },
    evidenceChain: { gps: false, bleBeacon: false, voiceprint: false, audioRecording: false, radarData: false, photo: false },
  },

  // ─── 2 more completed sessions for richer data ───
  {
    id: "sess-09",
    serviceDate: offsetDate(-5),
    serviceObjectId: "so1",
    serviceObjectName: "王淑珍",
    serviceObjectAddress: "阳光路120号3楼301",
    workerId: "sw1",
    workerName: "刘秀英",
    workerQualifications: ["养老护理员(初级)", "急救证"],
    planId: "spv2-1",
    // 0606 additions
    scheduleMatchStatus: "exact" as const,
    plannedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
      { standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    confirmedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
      { standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    itemsDiff: "match" as const,
    durationStatus: "normal" as const,
    elderVerification: {
      status: "pass" as const,
      mobilityDetected: false,
      mobilityLevel: "none" as const,
      declaredDisabilityLevel: "重度失能",
      consistentWithDeclaration: true,
      radarDataAvailable: true,
      aiAnalysisSummary: "老人全程未有自主移动行为，与重度失能申报一致。",
    },
    selectedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-02", name: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-16", name: "协助进食/水", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "2次/日", checked: true },
      { standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "必要时", checked: true },
      { standardItemId: "hz-item-38", name: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1次/日", checked: true },
    ],
    estimatedMinutes: 75,
    status: "completed" as const,
    verification: {
      gpsMatch: true,
      gpsWorkerLat: 30.2741,
      gpsWorkerLng: 120.1551,
      gpsElderLat: 30.2742,
      gpsElderLng: 120.1550,
      bleBeaconMatch: true,
      bleBeaconId: "dev-s1",
      voiceprintMatch: true,
      verifiedAt: offsetDate(-5) + "T09:02:00Z",
    },
    startedAt: offsetDate(-5) + "T09:05:00Z",
    completedAt: offsetDate(-5) + "T10:18:00Z",
    submittedAt: offsetDate(-5) + "T10:20:00Z",
    completionPhoto: "/mock-photos/sess-09-completion.jpg",
    actualMinutes: 73,
    evidenceChain: { gps: true, bleBeacon: true, voiceprint: true, audioRecording: true, radarData: true, photo: true },
    aiAssessment: {
      qualityScore: 90,
      summary: "服务质量良好，所有项目按标准完成。老人状态稳定，情绪安抚效果明显。",
      itemCompletionRate: 1.0,
      anomalies: [],
      recommendations: [],
    },
  },
  {
    id: "sess-10",
    serviceDate: offsetDate(-3),
    serviceObjectId: "so3",
    serviceObjectName: "张秀兰",
    serviceObjectAddress: "幸福路150号5楼502",
    workerId: "sw4",
    workerName: "孙伟",
    workerQualifications: ["养老护理员(初级)"],
    planId: "spv2-3",
    // 0606 additions
    scheduleMatchStatus: "exact" as const,
    plannedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    confirmedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    itemsDiff: "match" as const,
    durationStatus: "normal" as const,
    elderVerification: {
      status: "pass" as const,
      mobilityDetected: true,
      mobilityLevel: "moderate" as const,
      declaredDisabilityLevel: "中度失能",
      consistentWithDeclaration: true,
      radarDataAvailable: true,
      aiAnalysisSummary: "老人活动能力为中等，与中度失能申报一致。",
    },
    selectedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", categoryName: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", checked: true },
      { standardItemId: "hz-item-38", name: "生命体征监测", categoryName: "生命体征观察与护理类", referenceMinutes: 15, frequency: "1次/日", checked: true },
    ],
    estimatedMinutes: 45,
    status: "completed" as const,
    verification: {
      gpsMatch: true,
      gpsWorkerLat: 30.2580,
      gpsWorkerLng: 120.1430,
      gpsElderLat: 30.2581,
      gpsElderLng: 120.1431,
      bleBeaconMatch: true,
      bleBeaconId: "dev-s3",
      voiceprintMatch: true,
      verifiedAt: offsetDate(-3) + "T10:02:00Z",
    },
    startedAt: offsetDate(-3) + "T10:05:00Z",
    completedAt: offsetDate(-3) + "T10:50:00Z",
    submittedAt: offsetDate(-3) + "T10:52:00Z",
    completionPhoto: "/mock-photos/sess-10-completion.jpg",
    actualMinutes: 45,
    evidenceChain: { gps: true, bleBeacon: true, voiceprint: true, audioRecording: true, radarData: true, photo: true },
    aiAssessment: {
      qualityScore: 93,
      summary: "孙伟为张秀兰提供了优质护理服务，心理疏导效果显著。老人血压稳定在正常范围。",
      itemCompletionRate: 1.0,
      anomalies: [],
      recommendations: [],
    },
  },
];

// ── Follow-Up Records ──

export const followUpRecords = [
  {
    id: "fu-1",
    serviceSessionId: "sess-03",
    serviceObjectId: "so1",
    serviceObjectName: "王淑珍",
    type: "in_person" as const,
    conductedBy: "u2",
    conductedByName: "李芳",
    conductedAt: offsetDate(-1) + "T15:00:00Z",
    location: "阳光路120号3楼301",
    conclusion: "老人整体状态良好，对刘秀英的服务很满意。膝关节疼痛略有加重，建议增加康复训练频次。家属王建华在场，无特殊意见。",
    notes: "王奶奶提到最近睡眠不太好，已告知护工注意观察。",
    status: "completed" as const,
  },
  {
    id: "fu-2",
    serviceSessionId: "sess-04",
    serviceObjectId: "so2",
    serviceObjectName: "李德明",
    type: "phone_manual" as const,
    conductedBy: "u2",
    conductedByName: "李芳",
    conductedAt: offsetDate(-1) + "T16:30:00Z",
    conclusion: "与女儿李小红电话沟通，确认昨日康复训练情况。家属表示老人训练后精神状态好，血糖控制稳定。",
    status: "completed" as const,
  },
  {
    id: "fu-3",
    serviceObjectId: "so3",
    serviceObjectName: "张秀兰",
    type: "phone_ai" as const,
    conductedBy: "system",
    conductedByName: "AI回访系统",
    conductedAt: offsetDate(-2) + "T14:00:00Z",
    conclusion: "AI电话回访完成。张秀兰表示对孙伟的服务满意，情绪状态较前改善。系统评估：服务满意度高，无异常发现。",
    notes: "AI识别到老人语速正常、情绪平稳。",
    status: "completed" as const,
  },
  {
    id: "fu-4",
    serviceSessionId: "sess-06",
    serviceObjectId: "so1",
    serviceObjectName: "王淑珍",
    type: "phone_manual" as const,
    conductedBy: "u2",
    conductedByName: "李芳",
    conductedAt: offsetDate(-3) + "T14:00:00Z",
    conclusion: "针对sess-06的GPS异常进行电话回访。确认刘秀英确实到场服务（蓝牙星标通过），GPS异常可能是信号问题。家属确认服务正常完成。",
    status: "completed" as const,
  },
  {
    id: "fu-5",
    serviceObjectId: "so5",
    serviceObjectName: "陈国强",
    type: "in_person" as const,
    conductedBy: "u3",
    conductedByName: "王磊",
    conductedAt: offsetDate(-5) + "T11:00:00Z",
    location: "阳光路200号1楼101",
    conclusion: "上门回访陈国强，评估康复进展。右手握力从5kg提升至8kg，活动范围改善。家属陈小明参与，对服务团队工作表示肯定。",
    notes: "建议下月增加下肢训练强度。",
    status: "completed" as const,
  },
  {
    id: "fu-6",
    serviceObjectId: "so4",
    serviceObjectName: "赵金凤",
    type: "phone_manual" as const,
    conductedBy: "u2",
    conductedByName: "李芳",
    conductedAt: today + "T11:00:00Z",
    conclusion: "",
    status: "scheduled" as const,
  },
];

// ── Family Feedback ──

export const familyFeedback = [
  {
    id: "ff-1",
    serviceObjectId: "so1",
    serviceObjectName: "王淑珍",
    familyContactId: "fc1",
    familyContactName: "王建华",
    familyRelation: "儿子",
    workerId: "sw1",
    workerName: "刘秀英",
    feedbackAt: offsetDate(-1) + "T18:00:00Z",
    channel: "wechat" as const,
    content: "刘阿姨对我妈妈照顾得特别好，每次来都很有耐心，妈妈很喜欢她。希望能继续安排刘阿姨服务。",
    sentiment: "positive" as const,
    actionTaken: "已记录好评，同步给刘秀英本人。",
    actionTakenAt: offsetDate(-1) + "T19:00:00Z",
    status: "resolved" as const,
  },
  {
    id: "ff-2",
    serviceObjectId: "so2",
    serviceObjectName: "李德明",
    familyContactId: "fc2",
    familyContactName: "李小红",
    familyRelation: "女儿",
    workerId: "sw2",
    workerName: "陈建国",
    feedbackAt: offsetDate(-2) + "T20:00:00Z",
    channel: "phone" as const,
    content: "上次康复训练没有全部完成，希望陈师傅能按计划完成所有训练项目。爸爸的腿需要多练。",
    sentiment: "neutral" as const,
    actionTaken: "已与陈建国沟通，后续会根据老人状态灵活调整训练节奏，确保完成率。",
    actionTakenAt: offsetDate(-1) + "T09:00:00Z",
    status: "resolved" as const,
  },
  {
    id: "ff-3",
    serviceObjectId: "so3",
    serviceObjectName: "张秀兰",
    familyContactId: "fc3",
    familyContactName: "张强",
    familyRelation: "儿子",
    workerId: "sw4",
    workerName: "孙伟",
    feedbackAt: offsetDate(-3) + "T10:00:00Z",
    channel: "app" as const,
    content: "感谢孙师傅对我妈妈的心理关怀，妈妈最近心情好多了，也愿意出门走动了。非常感谢！",
    sentiment: "positive" as const,
    status: "acknowledged" as const,
  },
  {
    id: "ff-4",
    serviceObjectId: "so5",
    serviceObjectName: "陈国强",
    familyContactId: "fc5",
    familyContactName: "陈小明",
    familyRelation: "儿子",
    feedbackAt: offsetDate(-4) + "T21:00:00Z",
    channel: "phone" as const,
    content: "希望康复训练时间能固定一些，每次时间不太一样，家里人不好安排陪同。",
    sentiment: "neutral" as const,
    actionTaken: "已与周美玲沟通，尽量固定上午10点左右上门。",
    actionTakenAt: offsetDate(-3) + "T10:00:00Z",
    status: "resolved" as const,
  },
  {
    id: "ff-5",
    serviceObjectId: "so1",
    serviceObjectName: "王淑珍",
    familyContactId: "fc1",
    familyContactName: "王建华",
    familyRelation: "儿子",
    feedbackAt: offsetDate(-7) + "T15:00:00Z",
    channel: "in_person" as const,
    content: "上周服务时间比约定的晚了将近半小时，妈妈在家等了很久。希望能准时一些。",
    sentiment: "negative" as const,
    actionTaken: "已与刘秀英沟通时间管理，后续如有延迟会提前电话通知家属。",
    actionTakenAt: offsetDate(-6) + "T09:00:00Z",
    status: "resolved" as const,
  },
  {
    id: "ff-6",
    serviceObjectId: "so5",
    serviceObjectName: "陈国强",
    familyContactId: "fc6",
    familyContactName: "陈小芳",
    familyRelation: "女儿",
    feedbackAt: offsetDate(-1) + "T14:00:00Z",
    channel: "wechat" as const,
    content: "爸爸最近右手恢复得不错，很感谢服务团队的努力。想了解下一阶段的康复计划。",
    sentiment: "positive" as const,
    status: "pending" as const,
  },
];

// ── Anomaly Alerts (for gov audit view) ──

export const anomalyAlerts = [
  {
    id: "alert-1",
    institutionId: "org1",
    institutionName: "金色年华",
    sessionId: "sess-06",
    type: "gps_mismatch" as const,
    severity: "high" as const,
    title: "GPS定位与服务地址不匹配",
    description: "护工刘秀英为王淑珍服务时，GPS定位距离老人地址约1.8km。蓝牙星标验证通过，可能是GPS信号漂移。",
    detectedAt: offsetDate(-3) + "T09:45:00Z",
    status: "resolved" as const,
    resolvedBy: "u2",
    resolvedAt: offsetDate(-3) + "T14:30:00Z",
    resolution: "经电话回访确认服务正常完成，GPS异常判定为信号漂移。蓝牙星标和声纹均通过。",
  },
  {
    id: "alert-2",
    institutionId: "org1",
    institutionName: "金色年华",
    sessionId: "sess-07",
    type: "voiceprint_mismatch" as const,
    severity: "medium" as const,
    title: "声纹验证未通过",
    description: "护工周美玲为陈国强服务时，声纹匹配失败。GPS和蓝牙星标均验证通过。",
    detectedAt: offsetDate(-4) + "T08:50:00Z",
    status: "verified" as const,
    resolvedBy: "u2",
    resolvedAt: offsetDate(-3) + "T10:00:00Z",
    resolution: "核查确认周美玲确实到场服务，声纹基线需要更新。已安排重新采集。",
  },
  {
    id: "alert-3",
    institutionId: "org1",
    institutionName: "金色年华",
    sessionId: "sess-06",
    type: "duration_abnormal" as const,
    severity: "low" as const,
    title: "服务时长偏短",
    description: "sess-06服务实际时长37分钟，低于预估40分钟。差异不大，但结合GPS异常需关注。",
    detectedAt: offsetDate(-3) + "T09:45:00Z",
    status: "dismissed" as const,
    resolvedBy: "u2",
    resolvedAt: offsetDate(-3) + "T14:30:00Z",
    resolution: "服务时长差异在合理范围内，结合回访确认服务正常完成。",
  },
  {
    id: "alert-4",
    institutionId: "org1",
    institutionName: "金色年华",
    sessionId: "sess-04",
    type: "quality_low" as const,
    severity: "low" as const,
    title: "服务质量评分偏低",
    description: "sess-04服务质量评分88分，肢体活动训练未完全完成。原因为老人疲劳提前结束。",
    detectedAt: offsetDate(-1) + "T15:30:00Z",
    status: "pending" as const,
  },
  {
    id: "alert-5",
    institutionId: "org1",
    institutionName: "金色年华",
    sessionId: "sess-08",
    type: "missing_evidence" as const,
    severity: "medium" as const,
    title: "服务取消，证据链缺失",
    description: "sess-08服务被取消，所有证据维度缺失。需核查取消原因。",
    detectedAt: offsetDate(-2) + "T12:00:00Z",
    status: "pending" as const,
  },
  {
    id: "alert-6",
    institutionId: "org1",
    institutionName: "金色年华",
    sessionId: "sess-06",
    type: "pattern_detected" as const,
    severity: "medium" as const,
    title: "同一护工多次GPS异常",
    description: "护工刘秀英在最近10次服务中有2次GPS定位异常，高于平均水平。可能是设备问题或需要进一步核查。",
    detectedAt: offsetDate(-2) + "T08:00:00Z",
    status: "pending" as const,
  },
];

// ── Gov Overview Data ──

export const govOverviewData = {
  todayCompleted: 2,
  weekCompleted: 18,
  sixDimensionPassRate: 85.7,
  anomalyCount: 4,
  recentAnomalies: anomalyAlerts.filter(a => a.status === "pending"),
  qualityTrend: [
    { week: "W22 (05/25-05/31)", passRate: 82.0 },
    { week: "W23 (06/01-06/07)", passRate: 85.7 },
    { week: "W21 (05/18-05/24)", passRate: 88.5 },
    { week: "W20 (05/11-05/17)", passRate: 80.0 },
    { week: "W19 (05/04-05/10)", passRate: 78.5 },
    { week: "W18 (04/27-05/03)", passRate: 83.0 },
    { week: "W17 (04/20-04/26)", passRate: 79.2 },
    { week: "W16 (04/13-04/19)", passRate: 76.8 },
  ],
  // 0606 additions: institution comparison & elder verification stats
  institutionComparison: [
    { institutionId: "inst-1", name: "金色年华养老服务有限公司", evidencePassRate: 87.5, elderVerifyPassRate: 91.2, anomalyRate: 5.3, serviceCount: 156, qualityScore: 88 },
    { institutionId: "inst-2", name: "康乐居家养老服务中心", evidencePassRate: 82.0, elderVerifyPassRate: 78.5, anomalyRate: 8.1, serviceCount: 89, qualityScore: 79 },
    { institutionId: "inst-3", name: "夕阳红护理服务站", evidencePassRate: 79.3, elderVerifyPassRate: 85.0, anomalyRate: 10.2, serviceCount: 62, qualityScore: 74 },
  ],
  elderVerificationStats: {
    totalVerified: 280,
    passCount: 243,
    failCount: 18,
    inconclusiveCount: 12,
    missingCount: 7,
    passRate: 86.8,
    suspiciousMobilityCount: 15,
    recentFailures: [
      { sessionId: "sess-06", elderName: "王淑珍", institutionName: "金色年华养老服务有限公司", declaredLevel: "重度失能", observedLevel: "moderate", detectedAt: offsetDate(-3) + "T09:45:00Z" },
      { sessionId: "sess-07", elderName: "陈国强", institutionName: "金色年华养老服务有限公司", declaredLevel: "重度失能", observedLevel: "minimal", detectedAt: offsetDate(-4) + "T08:50:00Z" },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════
// V3 Mock Data — 0606 Design Spec additions
// ═══════════════════════════════════════════════════════════════════════

// ── Policy Constraints (Hangzhou catalog) ──

export const policyConstraints = [
  {
    id: "pc-1",
    catalogId: HZ_CATALOG_ID,
    name: "护工服务老人上限",
    type: "max_elders_per_worker" as const,
    rule: { max: 8, unit: "count" as const },
    description: "每位护工同时服务的老人数量不得超过8人",
    severity: "hard" as const,
  },
  {
    id: "pc-2",
    catalogId: HZ_CATALOG_ID,
    name: "月度服务时长上限",
    type: "hours_per_month" as const,
    rule: { max: 25, unit: "hours" as const, period: "per_month" as const },
    description: "每位老人每月享受的长护险服务时长不超过25小时",
    severity: "hard" as const,
  },
  {
    id: "pc-3",
    catalogId: HZ_CATALOG_ID,
    name: "每周最低上门次数",
    type: "visits_per_week" as const,
    rule: { min: 1, unit: "count" as const, period: "per_week" as const },
    description: "每位享受长护险服务的老人每周至少上门服务1次",
    severity: "hard" as const,
  },
  {
    id: "pc-4",
    catalogId: HZ_CATALOG_ID,
    name: "单次服务时长约束",
    type: "duration_per_visit" as const,
    rule: { min: 60, max: 120, unit: "minutes" as const, period: "per_visit" as const },
    description: "单次上门服务时长建议在60-120分钟之间",
    severity: "hard" as const,
  },
  {
    id: "pc-5",
    catalogId: HZ_CATALOG_ID,
    name: "护工连续性偏好",
    type: "custom" as const,
    rule: { unit: "count" as const },
    description: "建议同一老人尽量由同一护工持续服务，减少频繁更换",
    severity: "soft" as const,
  },
];

// ── Recurring Schedule Rules ──

export const recurringScheduleRules = [
  {
    id: "rsr-1",
    serviceObjectId: "so1", // 王淑珍
    assignedWorkerId: "sw1", // 刘秀英
    planId: "spv2-1",
    cadence: "weekly:mon,wed,fri",
    cadenceLabel: "每周一/三/五",
    startTime: "09:00",
    endTime: "10:30",
    plannedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
      { standardItemId: "hz-item-27", name: "协助翻身与体位转换", referenceMinutes: 10 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    effectiveFrom: "2026-05-01",
    status: "active" as const,
  },
  {
    id: "rsr-2",
    serviceObjectId: "so2", // 李德明
    assignedWorkerId: "sw2", // 陈建国
    planId: "spv2-2",
    cadence: "weekly:tue,thu",
    cadenceLabel: "每周二/四",
    startTime: "14:00",
    endTime: "15:30",
    plannedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
      { standardItemId: "hz-item-32", name: "生活自理能力训练", referenceMinutes: 20 },
      { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    effectiveFrom: "2026-05-05",
    status: "active" as const,
  },
  {
    id: "rsr-3",
    serviceObjectId: "so3", // 张秀兰
    assignedWorkerId: "sw4", // 孙伟
    planId: "spv2-3",
    cadence: "weekly:wed",
    cadenceLabel: "每周三",
    startTime: "10:00",
    endTime: "11:00",
    plannedItems: [
      { standardItemId: "hz-item-02", name: "面部清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-06", name: "口腔清洁", referenceMinutes: 10 },
      { standardItemId: "hz-item-35", name: "情绪安抚与心理疏导", referenceMinutes: 20 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    effectiveFrom: "2026-05-10",
    status: "active" as const,
  },
  {
    id: "rsr-4",
    serviceObjectId: "so5", // 陈国强
    assignedWorkerId: "sw3", // 周美玲
    planId: "spv2-4",
    cadence: "daily",
    cadenceLabel: "每天",
    startTime: "08:00",
    endTime: "09:00",
    plannedItems: [
      { standardItemId: "hz-item-01", name: "整理床单位", referenceMinutes: 10 },
      { standardItemId: "hz-item-33", name: "肢体活动训练", referenceMinutes: 20 },
      { standardItemId: "hz-item-29", name: "协助行走", referenceMinutes: 15 },
      { standardItemId: "hz-item-38", name: "生命体征监测", referenceMinutes: 15 },
    ],
    effectiveFrom: "2026-04-20",
    status: "active" as const,
  },
  {
    id: "rsr-5",
    serviceObjectId: "so5", // 陈国强
    assignedWorkerId: "sw1", // 刘秀英
    planId: "spv2-4",
    cadence: "weekly:mon,wed,fri",
    cadenceLabel: "每周一/三/五",
    startTime: "11:00",
    endTime: "12:00",
    plannedItems: [
      { standardItemId: "hz-item-16", name: "协助进食/水", referenceMinutes: 20 },
      { standardItemId: "hz-item-27", name: "协助翻身与体位转换", referenceMinutes: 10 },
      { standardItemId: "hz-item-28", name: "协助移乘", referenceMinutes: 10 },
    ],
    effectiveFrom: "2026-05-01",
    status: "active" as const,
  },
];

// ── Institutions (for gov audit) ──

// ── Training Records ──

export const trainingRecords = [
  { id: "tr-1", workerId: "sw1", workerName: "刘秀英", serviceItemId: "hz-item-01", serviceItemName: "整理床单位", mode: "guidance" as const, completedAt: offsetDate(-1) + "T09:30:00Z", status: "completed" as const, siteId: "site1", siteName: "阳光社区服务站" },
  { id: "tr-2", workerId: "sw1", workerName: "刘秀英", serviceItemId: "hz-item-02", serviceItemName: "面部清洁", mode: "supervision" as const, completedAt: offsetDate(-1) + "T10:15:00Z", status: "completed" as const, siteId: "site1", siteName: "阳光社区服务站" },
  { id: "tr-3", workerId: "sw1", workerName: "刘秀英", serviceItemId: "hz-item-16", serviceItemName: "协助进食/水", mode: "exam" as const, completedAt: offsetDate(-2) + "T14:00:00Z", status: "completed" as const, score: 92, siteId: "site1", siteName: "阳光社区服务站" },
  { id: "tr-4", workerId: "sw2", workerName: "陈建国", serviceItemId: "hz-item-33", serviceItemName: "肢体活动训练", mode: "guidance" as const, completedAt: offsetDate(-2) + "T15:30:00Z", status: "completed" as const, siteId: "site1", siteName: "阳光社区服务站" },
  { id: "tr-5", workerId: "sw2", workerName: "陈建国", serviceItemId: "hz-item-32", serviceItemName: "生活自理能力训练", mode: "exam" as const, completedAt: offsetDate(-3) + "T11:00:00Z", status: "completed" as const, score: 78, siteId: "site1", siteName: "阳光社区服务站" },
  { id: "tr-6", workerId: "sw3", workerName: "周美玲", serviceItemId: "hz-item-07", serviceItemName: "协助沐浴/擦浴", mode: "supervision" as const, completedAt: offsetDate(-3) + "T09:45:00Z", status: "completed" as const, siteId: "site1", siteName: "阳光社区服务站" },
  { id: "tr-7", workerId: "sw3", workerName: "周美玲", serviceItemId: "hz-item-38", serviceItemName: "生命体征监测", mode: "exam" as const, completedAt: offsetDate(-4) + "T10:30:00Z", status: "failed" as const, score: 45, siteId: "site1", siteName: "阳光社区服务站" },
  { id: "tr-8", workerId: "sw4", workerName: "孙伟", serviceItemId: "hz-item-35", serviceItemName: "情绪安抚与心理疏导", mode: "guidance" as const, completedAt: offsetDate(-1) + "T16:00:00Z", status: "completed" as const, siteId: "site2", siteName: "幸福家园服务站" },
  { id: "tr-9", workerId: "sw4", workerName: "孙伟", serviceItemId: "hz-item-02", serviceItemName: "面部清洁", mode: "exam" as const, completedAt: offsetDate(-2) + "T11:30:00Z", status: "completed" as const, score: 88, siteId: "site2", siteName: "幸福家园服务站" },
  { id: "tr-10", workerId: "sw5", workerName: "吴丽华", serviceItemId: "hz-item-29", serviceItemName: "协助行走", mode: "supervision" as const, completedAt: offsetDate(-4) + "T14:20:00Z", status: "completed" as const, siteId: "site2", siteName: "幸福家园服务站" },
  { id: "tr-11", workerId: "sw5", workerName: "吴丽华", serviceItemId: "hz-item-27", serviceItemName: "协助翻身与体位转换", mode: "exam" as const, completedAt: offsetDate(-5) + "T10:00:00Z", status: "completed" as const, score: 65, siteId: "site2", siteName: "幸福家园服务站" },
  { id: "tr-12", workerId: "sw1", workerName: "刘秀英", serviceItemId: "hz-item-09", serviceItemName: "协助更衣", mode: "exam" as const, completedAt: offsetDate(-5) + "T16:30:00Z", status: "completed" as const, score: 95, siteId: "site1", siteName: "阳光社区服务站" },
];

export const institutions = [
  {
    id: "inst-1",
    name: "金色年华养老服务有限公司",
    type: "direct" as const,
    licenseNumber: "浙民养字[2024]第001号",
    address: "杭州市西湖区文三路398号",
    siteCount: 2,
    workerCount: 6,
    elderCount: 5,
    evidencePassRate: 87.5,
    elderVerifyPassRate: 91.2,
    anomalyRate: 5.3,
    qualityScore: 88,
    sites: [
      {
        id: "site1",
        name: "阳光社区服务站",
        address: "杭州市西湖区阳光路100号",
        workerCount: 4,
        elderCount: 3,
        evidencePassRate: 89.0,
        elderVerifyPassRate: 92.5,
      },
      {
        id: "site2",
        name: "幸福家园服务站",
        address: "杭州市拱墅区幸福路200号",
        workerCount: 2,
        elderCount: 2,
        evidencePassRate: 85.0,
        elderVerifyPassRate: 88.0,
      },
    ],
  },
  {
    id: "inst-2",
    name: "康乐居家养老服务中心",
    type: "franchise" as const,
    licenseNumber: "浙民养字[2024]第015号",
    address: "杭州市拱墅区莫干山路128号",
    siteCount: 1,
    workerCount: 8,
    elderCount: 12,
    evidencePassRate: 82.0,
    elderVerifyPassRate: 78.5,
    anomalyRate: 8.1,
    qualityScore: 79,
    sites: [
      {
        id: "inst2-site1",
        name: "康乐社区服务站",
        address: "杭州市拱墅区康桥路50号",
        workerCount: 8,
        elderCount: 12,
        evidencePassRate: 82.0,
        elderVerifyPassRate: 78.5,
      },
    ],
  },
  {
    id: "inst-3",
    name: "夕阳红护理服务站",
    type: "franchise" as const,
    licenseNumber: "浙民养字[2024]第032号",
    address: "杭州市滨江区江南大道600号",
    siteCount: 1,
    workerCount: 5,
    elderCount: 8,
    evidencePassRate: 79.3,
    elderVerifyPassRate: 85.0,
    anomalyRate: 10.2,
    qualityScore: 74,
    sites: [
      {
        id: "inst3-site1",
        name: "夕阳红滨江站",
        address: "杭州市滨江区长河路120号",
        workerCount: 5,
        elderCount: 8,
        evidencePassRate: 79.3,
        elderVerifyPassRate: 85.0,
      },
    ],
  },
];

// ── Radar session mock data generator ──

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface RadarSample {
  t: number;
  worker: { x: number; y: number; posture: "standing" | "bending" | "walking"; movement: "large" | "medium" | "small" };
  elder: { x: number; y: number; posture: "lying_supine" | "lying_side" | "sitting" | "standing"; movement: "large" | "medium" | "small"; inBed: boolean };
  distance: number;
}

export function generateRadarSamples(sessionSeed: number, roomW: number, roomH: number, bedX: number, bedY: number): RadarSample[] {
  const totalSeconds = 1800; // 30 min
  const interval = 5;
  const samples: RadarSample[] = [];
  const doorX = 0.3, doorY = roomH - 0.3;
  const bedCX = bedX + 1.0, bedCY = bedY + 0.45;

  for (let i = 0; i < totalSeconds / interval; i++) {
    const t = i * interval;
    const phase = t / totalSeconds;
    const r = (offset: number) => seededRandom(sessionSeed * 1000 + i * 7 + offset);

    let wx: number, wy: number;
    let wPosture: "standing" | "bending" | "walking";
    let wMovement: "large" | "medium" | "small";
    let ex: number, ey: number;
    let ePosture: "lying_supine" | "lying_side" | "sitting" | "standing";
    let eMovement: "large" | "medium" | "small";
    let eInBed: boolean;

    if (phase < 0.05) {
      // Worker enters, walks toward bed
      const p = phase / 0.05;
      wx = lerp(doorX, bedCX + 0.5, p) + (r(1) - 0.5) * 0.1;
      wy = lerp(doorY, bedCY + 0.5, p) + (r(2) - 0.5) * 0.1;
      wPosture = "walking"; wMovement = "large";
      ex = bedCX + (r(3) - 0.5) * 0.05; ey = bedCY + (r(4) - 0.5) * 0.05;
      ePosture = "lying_supine"; eMovement = "small"; eInBed = true;
    } else if (phase < 0.15) {
      // Close contact - checking vitals
      const p = (phase - 0.05) / 0.10;
      wx = bedCX + 0.3 + (r(1) - 0.5) * 0.15;
      wy = bedCY + 0.4 + (r(2) - 0.5) * 0.15;
      wPosture = p < 0.5 ? "standing" : "bending"; wMovement = "small";
      ex = bedCX + (r(3) - 0.5) * 0.05; ey = bedCY + (r(4) - 0.5) * 0.05;
      ePosture = "lying_supine"; eMovement = "small"; eInBed = true;
    } else if (phase < 0.25) {
      // Help elder sit up
      const p = (phase - 0.15) / 0.10;
      wx = bedCX + 0.2 + (r(1) - 0.5) * 0.1;
      wy = bedCY + 0.3 + (r(2) - 0.5) * 0.1;
      wPosture = "bending"; wMovement = "medium";
      ex = bedCX + (r(3) - 0.5) * 0.1; ey = bedCY + (r(4) - 0.5) * 0.1;
      ePosture = p < 0.4 ? "lying_side" : "sitting";
      eMovement = p < 0.4 ? "medium" : "large"; eInBed = p < 0.7;
    } else if (phase < 0.35) {
      // Worker gets supplies from across room
      const p = (phase - 0.25) / 0.10;
      const supplyX = roomW - 0.5, supplyY = roomH - 0.8;
      wx = lerp(bedCX + 0.3, supplyX, Math.min(p * 2, 1)) + (r(1) - 0.5) * 0.1;
      wy = lerp(bedCY + 0.3, supplyY, Math.min(p * 2, 1)) + (r(2) - 0.5) * 0.1;
      wPosture = p < 0.7 ? "walking" : "bending"; wMovement = p < 0.7 ? "large" : "medium";
      ex = bedCX + 0.3 + (r(3) - 0.5) * 0.1; ey = bedCY + (r(4) - 0.5) * 0.1;
      ePosture = "sitting"; eMovement = "small"; eInBed = false;
    } else if (phase < 0.50) {
      // Worker returns, performs hygiene care
      const p = (phase - 0.35) / 0.15;
      wx = lerp(roomW - 0.5, bedCX + 0.25, Math.min(p * 2, 1)) + (r(1) - 0.5) * 0.15;
      wy = lerp(roomH - 0.8, bedCY + 0.3, Math.min(p * 2, 1)) + (r(2) - 0.5) * 0.15;
      wPosture = p < 0.3 ? "walking" : "bending"; wMovement = p < 0.3 ? "large" : "medium";
      ex = bedCX + 0.2 + (r(3) - 0.5) * 0.1; ey = bedCY + (r(4) - 0.5) * 0.1;
      ePosture = "sitting"; eMovement = p > 0.7 ? "medium" : "small"; eInBed = false;
    } else if (phase < 0.60) {
      // Worker tidies room, elder lies back
      const p = (phase - 0.50) / 0.10;
      wx = lerp(bedCX + 0.3, roomW * 0.5, p) + (r(1) - 0.5) * 0.3;
      wy = lerp(bedCY + 0.3, roomH * 0.6, p) + (r(2) - 0.5) * 0.3;
      wPosture = r(5) < 0.5 ? "walking" : "bending"; wMovement = "medium";
      ex = bedCX + (r(3) - 0.5) * 0.1; ey = bedCY + (r(4) - 0.5) * 0.05;
      ePosture = p < 0.4 ? "sitting" : "lying_side";
      eMovement = p < 0.4 ? "medium" : "small"; eInBed = p >= 0.4;
    } else if (phase < 0.75) {
      // Worker returns for medication/feeding
      const p = (phase - 0.60) / 0.15;
      wx = lerp(roomW * 0.5, bedCX + 0.2, Math.min(p * 2, 1)) + (r(1) - 0.5) * 0.1;
      wy = lerp(roomH * 0.6, bedCY + 0.3, Math.min(p * 2, 1)) + (r(2) - 0.5) * 0.1;
      wPosture = p < 0.3 ? "walking" : "bending"; wMovement = p < 0.3 ? "large" : "small";
      ex = bedCX + (r(3) - 0.5) * 0.05; ey = bedCY + (r(4) - 0.5) * 0.05;
      ePosture = p < 0.3 ? "lying_side" : "lying_supine"; eMovement = "small"; eInBed = true;
    } else if (phase < 0.85) {
      // Final checks, nearby
      const p = (phase - 0.75) / 0.10;
      wx = bedCX + 0.6 + (r(1) - 0.5) * 0.2;
      wy = bedCY + 0.5 + (r(2) - 0.5) * 0.2;
      wPosture = "standing"; wMovement = "small";
      ex = bedCX + (r(3) - 0.5) * 0.05; ey = bedCY + (r(4) - 0.5) * 0.05;
      ePosture = "lying_supine"; eMovement = "small"; eInBed = true;
    } else if (phase < 0.95) {
      // Worker cleans up, moves around room
      const p = (phase - 0.85) / 0.10;
      wx = lerp(bedCX + 0.6, doorX + 1, p) + (r(1) - 0.5) * 0.3;
      wy = lerp(bedCY + 0.5, doorY - 0.5, p) + (r(2) - 0.5) * 0.3;
      wPosture = r(5) < 0.4 ? "walking" : "standing"; wMovement = "medium";
      ex = bedCX + (r(3) - 0.5) * 0.03; ey = bedCY + (r(4) - 0.5) * 0.03;
      ePosture = "lying_supine"; eMovement = "small"; eInBed = true;
    } else {
      // Worker exits
      const p = (phase - 0.95) / 0.05;
      wx = lerp(doorX + 1, doorX, p) + (r(1) - 0.5) * 0.05;
      wy = lerp(doorY - 0.5, doorY, p) + (r(2) - 0.5) * 0.05;
      wPosture = "walking"; wMovement = "large";
      ex = bedCX + (r(3) - 0.5) * 0.02; ey = bedCY + (r(4) - 0.5) * 0.02;
      ePosture = "lying_supine"; eMovement = "small"; eInBed = true;
    }

    // Clamp positions to room bounds
    wx = clamp(wx, 0.1, roomW - 0.1);
    wy = clamp(wy, 0.1, roomH - 0.1);
    ex = clamp(ex, 0.1, roomW - 0.1);
    ey = clamp(ey, 0.1, roomH - 0.1);

    const distance = Math.round(Math.sqrt((wx - ex) ** 2 + (wy - ey) ** 2) * 100) / 100;

    samples.push({
      t,
      worker: { x: Math.round(wx * 100) / 100, y: Math.round(wy * 100) / 100, posture: wPosture, movement: wMovement },
      elder: { x: Math.round(ex * 100) / 100, y: Math.round(ey * 100) / 100, posture: ePosture, movement: eMovement, inBed: eInBed },
      distance,
    });
  }
  return samples;
}

export function computeSummaries(samples: RadarSample[]) {
  const total = samples.length;
  let close = 0, nearby = 0, far = 0;
  let wLarge = 0, wMedium = 0, wSmall = 0;
  let eLyingSupine = 0, eLyingSide = 0, eOutOfBed = 0;
  let eLarge = 0, eMedium = 0, eSmall = 0;

  for (const s of samples) {
    if (s.distance < 0.5) close++;
    else if (s.distance < 1.0) nearby++;
    else far++;

    if (s.worker.movement === "large") wLarge++;
    else if (s.worker.movement === "medium") wMedium++;
    else wSmall++;

    if (!s.elder.inBed) eOutOfBed++;
    else if (s.elder.posture === "lying_supine") eLyingSupine++;
    else eLyingSide++;

    if (s.elder.movement === "large") eLarge++;
    else if (s.elder.movement === "medium") eMedium++;
    else eSmall++;
  }

  const pct = (n: number) => Math.round(n / total * 1000) / 10;
  return {
    distanceSummary: { close: pct(close), nearby: pct(nearby), far: pct(far) },
    workerMovementSummary: { large: pct(wLarge), medium: pct(wMedium), small: pct(wSmall) },
    elderBedSummary: { lying_supine: pct(eLyingSupine), lying_side: pct(eLyingSide), out_of_bed: pct(eOutOfBed) },
    elderMovementSummary: { large: pct(eLarge), medium: pct(eMedium), small: pct(eSmall) },
  };
}

const session1Samples = generateRadarSamples(1, 4.0, 3.5, 0.5, 0.3);
const session1Summaries = computeSummaries(session1Samples);
const session2Samples = generateRadarSamples(2, 3.8, 3.2, 0.4, 0.2);
const session2Summaries = computeSummaries(session2Samples);

export const radarSessions = [
  {
    id: "rsess-1",
    deviceId: "dev-r1",
    serviceSessionId: "sess-01",
    workerName: "刘秀英",
    elderName: "王淑珍",
    startTime: "2026-06-12T09:00:00Z",
    endTime: "2026-06-12T09:30:00Z",
    duration: 30,
    roomWidth: 4.0,
    roomHeight: 3.5,
    bedPosition: { x: 0.5, y: 0.3, width: 2.0, height: 0.9 },
    samples: session1Samples,
    ...session1Summaries,
  },
  {
    id: "rsess-2",
    deviceId: "dev-r2",
    serviceSessionId: "sess-02",
    workerName: "陈建国",
    elderName: "李德明",
    startTime: "2026-06-12T14:00:00Z",
    endTime: "2026-06-12T14:30:00Z",
    duration: 30,
    roomWidth: 3.8,
    roomHeight: 3.2,
    bedPosition: { x: 0.4, y: 0.2, width: 2.0, height: 0.9 },
    samples: session2Samples,
    ...session2Summaries,
  },
];
