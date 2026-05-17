import type {
  SocialWorker, ServiceRecipient, ServiceTask, ServiceRecord,
  SmartBadge, SOPItem, PendingItem, FamilyReport, KPI,
} from '../types';

export const ORG_NAME = '金色年华翠苑站';
export const ORG_GROUP = '金色年华养老服务集团';

export const socialWorkers: SocialWorker[] = [
  { id: 'w1', name: '李晓红', phone: '138****2201', skills: ['探访关爱', '助浴', '康复指导'], status: 'on_service', todayTasks: 4, completedTasks: 2 },
  { id: 'w2', name: '王建国', phone: '139****3302', skills: ['探访关爱', '助餐', '用药提醒'], status: 'available', todayTasks: 3, completedTasks: 1 },
  { id: 'w3', name: '陈秀芳', phone: '137****4403', skills: ['探访关爱', '助洁', '心理疏导'], status: 'available', todayTasks: 3, completedTasks: 2 },
  { id: 'w4', name: '张伟明', phone: '136****5504', skills: ['探访关爱', '助浴', '助餐'], status: 'off_duty', todayTasks: 0, completedTasks: 0 },
];

export const serviceRecipients: ServiceRecipient[] = [
  { id: 'r1', name: '张大伟', age: 82, address: '翠苑一区 3 幢 402 室', healthNotes: '高血压，左膝关节炎，需助行器', riskLevel: 'medium', familyContact: '张明（儿子）', familyPhone: '158****6601', serviceFrequency: '每周 3 次', lastService: '2026-05-12', concerns: ['血压近一周偏高', '上周反映膝盖疼痛加重'] },
  { id: 'r2', name: '王秀英', age: 78, address: '翠苑二区 7 幢 201 室', healthNotes: '糖尿病 II 型，轻度认知障碍', riskLevel: 'high', familyContact: '王丽（女儿）', familyPhone: '159****7702', serviceFrequency: '每周 5 次', lastService: '2026-05-12', concerns: ['最近常忘记吃药', '女儿反映情绪波动大'] },
  { id: 'r3', name: '刘国强', age: 75, address: '翠苑三区 12 幢 101 室', healthNotes: '身体状况良好，独居', riskLevel: 'low', familyContact: '刘芳（女儿）', familyPhone: '150****8803', serviceFrequency: '每周 2 次', lastService: '2026-05-11', concerns: [] },
  { id: 'r4', name: '赵淑芬', age: 88, address: '翠苑一区 9 幢 301 室', healthNotes: '帕金森病中期，卧床为主，需要翻身和助浴', riskLevel: 'high', familyContact: '赵强（儿子）', familyPhone: '151****9904', serviceFrequency: '每天 1 次', lastService: '2026-05-12', concerns: ['皮肤压疮风险', '家属要求增加助浴频次'] },
  { id: 'r5', name: '孙志明', age: 80, address: '翠苑二区 5 幢 502 室', healthNotes: '慢性支气管炎，轻度听力下降', riskLevel: 'low', familyContact: '孙婷（女儿）', familyPhone: '152****0005', serviceFrequency: '每周 2 次', lastService: '2026-05-10', concerns: ['上次服务时咳嗽较多'] },
];

export const todayTasks: ServiceTask[] = [
  { id: 't1', recipientId: 'r1', recipientName: '张大伟', address: '翠苑一区 3 幢 402 室', workerName: '王建国', workerId: 'w2', serviceType: '探访关爱', scheduledTime: '09:00', status: 'pending', notes: '注意询问血压情况，上周膝盖疼痛' },
  { id: 't2', recipientId: 'r2', recipientName: '王秀英', address: '翠苑二区 7 幢 201 室', workerName: '李晓红', workerId: 'w1', serviceType: '用药提醒', scheduledTime: '09:30', status: 'in_progress', notes: '确认是否按时服药，观察情绪' },
  { id: 't3', recipientId: 'r4', recipientName: '赵淑芬', address: '翠苑一区 9 幢 301 室', workerName: '李晓红', workerId: 'w1', serviceType: '助浴', scheduledTime: '10:30', status: 'pending', notes: '注意压疮部位，助浴后检查皮肤' },
  { id: 't4', recipientId: 'r3', recipientName: '刘国强', address: '翠苑三区 12 幢 101 室', workerName: '陈秀芳', workerId: 'w3', serviceType: '探访关爱', scheduledTime: '14:00', status: 'pending', notes: '' },
  { id: 't5', recipientId: 'r5', recipientName: '孙志明', address: '翠苑二区 5 幢 502 室', workerName: '陈秀芳', workerId: 'w3', serviceType: '探访关爱', scheduledTime: '15:30', status: 'pending', notes: '关注咳嗽情况' },
  { id: 't6', recipientId: 'r2', recipientName: '王秀英', address: '翠苑二区 7 幢 201 室', workerName: '王建国', workerId: 'w2', serviceType: '助餐', scheduledTime: '11:30', status: 'pending', notes: '糖尿病饮食注意' },
  { id: 't7', recipientId: 'r4', recipientName: '赵淑芬', address: '翠苑一区 9 幢 301 室', workerName: '王建国', workerId: 'w2', serviceType: '探访关爱', scheduledTime: '16:00', status: 'pending', notes: '翻身，检查压疮' },
];

export const recentRecords: ServiceRecord[] = [
  { id: 'rec1', taskId: 't-y1', workerName: '李晓红', recipientName: '张大伟', serviceType: '探访关爱', startTime: '2026-05-12 09:05', endTime: '2026-05-12 09:52', duration: '47 分钟', status: 'normal', summary: '问候，测量血压 145/92，询问膝盖情况，老人反映上楼困难加重，建议就医复查。', sopCompletion: 100, confidence: 95, pendingItems: [] },
  { id: 'rec2', taskId: 't-y2', workerName: '李晓红', recipientName: '王秀英', serviceType: '用药提醒', startTime: '2026-05-12 10:10', endTime: '2026-05-12 10:38', duration: '28 分钟', status: 'warning', summary: '发现老人未按时服用降糖药，已当场督促服药。老人情绪低落，多次提到想念女儿。', sopCompletion: 85, confidence: 90, pendingItems: ['服药遗漏需跟进', '情绪异常已上报'] },
  { id: 'rec3', taskId: 't-y3', workerName: '陈秀芳', recipientName: '赵淑芬', serviceType: '助浴', startTime: '2026-05-12 14:00', endTime: '2026-05-12 15:15', duration: '75 分钟', status: 'normal', summary: '完成助浴，检查皮肤无新压疮，翻身后放置减压垫。', sopCompletion: 100, confidence: 98, pendingItems: [] },
  { id: 'rec4', taskId: 't-y4', workerName: '王建国', recipientName: '刘国强', serviceType: '探访关爱', startTime: '2026-05-12 15:30', endTime: '2026-05-12 16:10', duration: '40 分钟', status: 'anomaly', summary: '老人不在家，邻居说去了社区活动中心。录音仅 2 分钟。', sopCompletion: 20, confidence: 60, pendingItems: ['服务未完成', '归属低置信度待确认'] },
  { id: 'rec5', taskId: 't-y5', workerName: '陈秀芳', recipientName: '孙志明', serviceType: '探访关爱', startTime: '2026-05-11 10:00', endTime: '2026-05-11 10:45', duration: '45 分钟', status: 'normal', summary: '老人状态较好，咳嗽有减轻。已建议继续用药并多喝水。', sopCompletion: 100, confidence: 96, pendingItems: [] },
];

export const smartBadges: SmartBadge[] = [
  { id: 'b1', deviceCode: 'GK-2026-0001', assignedWorker: '李晓红', status: 'recording', battery: 72, lastSeen: '2026-05-13 09:35', orgName: ORG_NAME },
  { id: 'b2', deviceCode: 'GK-2026-0002', assignedWorker: '王建国', status: 'active', battery: 88, lastSeen: '2026-05-13 08:50', orgName: ORG_NAME },
  { id: 'b3', deviceCode: 'GK-2026-0003', assignedWorker: '陈秀芳', status: 'active', battery: 65, lastSeen: '2026-05-13 08:45', orgName: ORG_NAME },
  { id: 'b4', deviceCode: 'GK-2026-0004', assignedWorker: null, status: 'idle', battery: 100, lastSeen: '2026-05-12 17:00', orgName: ORG_NAME },
  { id: 'b5', deviceCode: 'GK-2026-0005', assignedWorker: null, status: 'offline', battery: 0, lastSeen: '2026-05-08 12:00', orgName: ORG_NAME },
];

export const sopItems: SOPItem[] = [
  {
    id: 'sop1', serviceType: '探访关爱', version: 'v2.1', status: 'active', lastUpdated: '2026-04-20',
    steps: [
      { order: 1, title: '问候与身份确认', description: '敲门问候，确认服务对象身份，观察精神状态', required: true },
      { order: 2, title: '健康状况询问', description: '询问近期身体状况、睡眠、饮食、用药情况', required: true },
      { order: 3, title: '生命体征检查', description: '测量血压、体温（如有设备）', required: false },
      { order: 4, title: '服务总结与满意度询问', description: '明确叙述已完成的服务项目，询问服务对象是否满意、是否有意见或不满意的情况', required: true },
    ],
    requiredItems: ['身份确认', '健康询问', '服务总结与满意度询问'],
    completionCriteria: '完成所有必做步骤，录音时长不低于 20 分钟',
  },
  {
    id: 'sop3', serviceType: '用药提醒', version: 'v1.0', status: 'active', lastUpdated: '2026-05-01',
    steps: [
      { order: 1, title: '核对药品清单', description: '对照医嘱核对当前药品种类和剂量', required: true },
      { order: 2, title: '检查剩余药量', description: '检查各药品剩余量，不足时提醒补药', required: true },
      { order: 3, title: '督促服药', description: '当面确认服药，观察服药后反应', required: true },
      { order: 4, title: '记录服药情况', description: '记录是否按时按量服药，有无遗漏或异常', required: true },
    ],
    requiredItems: ['药品核对', '当面确认服药', '服药记录'],
    completionCriteria: '确认所有应服药品均已服用',
  },
];

export const pendingItems: PendingItem[] = [
  { id: 'p1', type: 'low_confidence', title: '刘国强 5/12 服务归属待确认', detail: '录音仅 2 分钟，老人不在家，归属置信度 60%', severity: 'warning', relatedRecord: 'rec4', createdAt: '2026-05-12 16:15' },
  { id: 'p2', type: 'anomaly', title: '王秀英 5/12 服药遗漏', detail: '发现未按时服用降糖药，需跟进复访', severity: 'critical', relatedRecord: 'rec2', createdAt: '2026-05-12 10:40' },
  { id: 'p3', type: 'sop_gap', title: '王建国 5/12 探访关爱 SOP 缺失安全检查', detail: '录音分析未检测到安全隐患检查环节', severity: 'info', relatedRecord: 'rec4', createdAt: '2026-05-12 16:20' },
  { id: 'p4', type: 'family_feedback', title: '王丽来电反映母亲情绪异常', detail: '王秀英女儿致电反映最近母亲情绪波动大，要求增加关注', severity: 'warning', relatedRecord: 'rec2', createdAt: '2026-05-12 18:30' },
];

export const familyReports: FamilyReport[] = [
  { id: 'fr1', recipientName: '张大伟', period: '2026-05-06 ~ 2026-05-12', type: 'weekly', summary: '本周共完成 3 次探访关爱服务。张大伟老人整体状态稳定，血压略偏高（最近一次 145/92），膝盖疼痛有加重趋势，建议尽快安排骨科复查。精神状态良好，饮食正常。', statusChange: '血压偏高，膝盖疼痛加重', concerns: ['建议骨科复查', '持续监测血压'], generatedAt: '2026-05-12 20:00' },
  { id: 'fr2', recipientName: '王秀英', period: '2026-05-12', type: 'daily', summary: '今日完成 1 次用药提醒服务。服务中发现王秀英老人未按时服用降糖药，已当场督促。老人情绪较低落。', statusChange: '服药不规律，情绪波动', concerns: ['服药依从性需关注', '建议家属多陪伴'], generatedAt: '2026-05-12 18:00' },
  { id: 'fr3', recipientName: '赵淑芬', period: '2026-05-06 ~ 2026-05-12', type: 'weekly', summary: '本周完成 7 次探访和 3 次助浴服务。赵淑芬老人卧床状态平稳，本周未发现新压疮，已有压疮部位有好转。翻身和助浴均按规程执行。', statusChange: '压疮状况好转', concerns: ['继续定期翻身和减压'], generatedAt: '2026-05-12 20:00' },
];

export const groupKPIs: KPI[] = [
  { label: '本周服务次数', value: 47, trend: 'up', trendValue: '+12%' },
  { label: '服务完成率', value: '93%', trend: 'flat', trendValue: '0%' },
  { label: '异常率', value: '6.4%', trend: 'down', trendValue: '-1.2%' },
  { label: 'SOP 执行完整率', value: '89%', trend: 'up', trendValue: '+3%' },
  { label: '投诉率', value: '2.1%', trend: 'down', trendValue: '-0.5%' },
  { label: '家属满意度', value: '4.6/5', trend: 'up', trendValue: '+0.1' },
];

export const siteComparison = [
  { site: '翠苑站', services: 47, completion: '93%', anomaly: '6.4%', sopRate: '89%' },
  { site: '三墩站', services: 38, completion: '91%', anomaly: '7.8%', sopRate: '85%' },
  { site: '古荡站', services: 52, completion: '96%', anomaly: '4.2%', sopRate: '92%' },
  { site: '文新站', services: 31, completion: '88%', anomaly: '9.1%', sopRate: '81%' },
];
