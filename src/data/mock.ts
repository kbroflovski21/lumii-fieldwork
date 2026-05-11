export interface Elder {
  id: string
  name: string
  address: string
  age: number
  gender: '男' | '女'
  health: {
    bloodPressure: string
    bloodPressureStatus: 'normal' | 'warning' | 'danger'
    medication: string
    medicationStatus: 'normal' | 'warning' | 'danger'
    sleep: string
    sleepStatus: 'normal' | 'warning' | 'danger'
    mood: string
    moodStatus: 'normal' | 'warning' | 'danger'
    mobility: string
    mobilityStatus: 'normal' | 'warning' | 'danger'
  }
  serviceFrequency: string
  defaultServiceType: string
  notes: string
  family: FamilyMember
  history: HealthRecord[]
}

export interface FamilyMember {
  id: string
  name: string
  phone: string
  relation: string
  pushChannel: '微信' | '短信'
}

export interface HealthRecord {
  date: string
  bloodPressure: string
  bpSystolic: number
  bpDiastolic: number
  medication: '正常' | '漏服' | '调整'
  mood: '良好' | '一般' | '低落'
  mobility: '正常' | '下降' | '受限'
  weight?: number
  summary: string
  workerName: string
  serviceType: string
  duration: number
  alerts: string[]
}

export interface Worker {
  id: string
  name: string
  phone: string
  stationId: string
  deviceId: string
  elders: string[]
}

export interface Station {
  id: string
  name: string
  area: string
  managerId: string
}

export interface SOPStep {
  id: string
  name: string
  guidance: string
  status: 'pending' | 'in_progress' | 'completed'
  duration: number
  checkItems: string[]
}

export interface SOPTemplate {
  id: string
  serviceType: string
  name: string
  steps: Omit<SOPStep, 'status'>[]
  estimatedDuration: number
  enabled: boolean
}

export interface ServiceTask {
  id: string
  elderId: string
  elder: Elder
  workerId: string
  serviceType: string
  scheduledTime: string
  estimatedDuration: number
  status: 'pending' | 'en_route' | 'in_progress' | 'completed'
  alert?: string
  sopProgress: SOPStep[]
  startTime?: string
  endTime?: string
  actualDuration?: number
  aiNotes: string[]
  photos: string[]
  workerNotes?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: string
}

export interface FamilyNote {
  id: string
  familyId: string
  elderId: string
  content: string
  createdAt: string
  read: boolean
}

// ─── Mock Data ───────────────────────────────────────────

export const station: Station = {
  id: 'ST001',
  name: '西湖区翠苑街道养老服务站',
  area: '杭州市西湖区',
  managerId: 'W001',
}

export const workers: Worker[] = [
  { id: 'W001', name: '李小明', phone: '138****1234', stationId: 'ST001', deviceId: 'DEV-A001', elders: ['E001', 'E002', 'E003'] },
  { id: 'W002', name: '张晓华', phone: '139****5678', stationId: 'ST001', deviceId: 'DEV-A002', elders: ['E004', 'E005'] },
  { id: 'W003', name: '王美丽', phone: '137****9012', stationId: 'ST001', deviceId: 'DEV-A003', elders: ['E001', 'E004'] },
]

export const elders: Elder[] = [
  {
    id: 'E001',
    name: '王桂芬',
    address: '翠苑一区 3-201',
    age: 78,
    gender: '女',
    health: {
      bloodPressure: '145/90',
      bloodPressureStatus: 'warning',
      medication: '按时服用降压药',
      medicationStatus: 'normal',
      sleep: '6小时，偶有失眠',
      sleepStatus: 'warning',
      mood: '良好',
      moodStatus: 'normal',
      mobility: '可独立行走，上下楼需扶',
      mobilityStatus: 'warning',
    },
    serviceFrequency: '每周2次',
    defaultServiceType: '探访关爱',
    notes: '有高血压史，需持续关注。喜欢聊天，儿子在外地工作。',
    family: { id: 'F001', name: '王建国', phone: '136****3456', relation: '儿子', pushChannel: '微信' },
    history: [
      { date: '2026-05-09', bloodPressure: '148/92', bpSystolic: 148, bpDiastolic: 92, medication: '正常', mood: '良好', mobility: '正常', weight: 62, summary: '王奶奶今天精神不错，血压略偏高。按时服药中，建议继续监测。聊了家常，提到想儿子了。', workerName: '李小明', serviceType: '探访关爱', duration: 35, alerts: ['血压偏高'] },
      { date: '2026-05-07', bloodPressure: '150/95', bpSystolic: 150, bpDiastolic: 95, medication: '正常', mood: '一般', mobility: '正常', weight: 62, summary: '血压 150/95 偏高，情绪一般，提到睡眠不太好。已建议就医复查。', workerName: '李小明', serviceType: '探访关爱', duration: 30, alerts: ['血压偏高', '睡眠问题'] },
      { date: '2026-05-05', bloodPressure: '142/88', bpSystolic: 142, bpDiastolic: 88, medication: '正常', mood: '良好', mobility: '正常', weight: 62.5, summary: '今天状态不错，血压比上次有所下降。饮食规律，活动正常。', workerName: '李小明', serviceType: '探访关爱', duration: 30, alerts: [] },
      { date: '2026-05-02', bloodPressure: '146/91', bpSystolic: 146, bpDiastolic: 91, medication: '正常', mood: '良好', mobility: '正常', weight: 62, summary: '血压控制尚可，按时用药。膝盖偶有不适，提醒注意防滑。', workerName: '王美丽', serviceType: '探访关爱', duration: 32, alerts: ['血压偏高'] },
      { date: '2026-04-30', bloodPressure: '144/89', bpSystolic: 144, bpDiastolic: 89, medication: '正常', mood: '良好', mobility: '正常', weight: 62, summary: '整体状态良好，用药规律。和邻居关系融洽，常一起散步。', workerName: '李小明', serviceType: '探访关爱', duration: 28, alerts: [] },
    ],
  },
  {
    id: 'E002',
    name: '张福来',
    address: '文三路 12-502',
    age: 82,
    gender: '男',
    health: {
      bloodPressure: '135/82',
      bloodPressureStatus: 'normal',
      medication: '按时服药',
      medicationStatus: 'normal',
      sleep: '7小时，较好',
      sleepStatus: 'normal',
      mood: '良好',
      moodStatus: 'normal',
      mobility: '行动缓慢，需助浴',
      mobilityStatus: 'warning',
    },
    serviceFrequency: '每周1次',
    defaultServiceType: '助浴',
    notes: '腿脚不便，需要助浴服务。性格开朗，喜欢下棋。',
    family: { id: 'F002', name: '张丽华', phone: '135****7890', relation: '女儿', pushChannel: '微信' },
    history: [
      { date: '2026-05-08', bloodPressure: '135/82', bpSystolic: 135, bpDiastolic: 82, medication: '正常', mood: '良好', mobility: '下降', weight: 68, summary: '助浴服务顺利完成。发现左小腿有新的淤青，已拍照记录。整体精神不错。', workerName: '李小明', serviceType: '助浴', duration: 45, alerts: ['皮肤淤青'] },
      { date: '2026-05-01', bloodPressure: '138/85', bpSystolic: 138, bpDiastolic: 85, medication: '正常', mood: '良好', mobility: '下降', weight: 68.5, summary: '助浴正常，皮肤状况良好。聊到最近在学用智能手机。', workerName: '李小明', serviceType: '助浴', duration: 40, alerts: [] },
    ],
  },
  {
    id: 'E003',
    name: '刘秀英',
    address: '翠苑二区 7-103',
    age: 75,
    gender: '女',
    health: {
      bloodPressure: '128/80',
      bloodPressureStatus: 'normal',
      medication: '按时服用降糖药',
      medicationStatus: 'normal',
      sleep: '5小时，失眠严重',
      sleepStatus: 'danger',
      mood: '低落',
      moodStatus: 'danger',
      mobility: '正常',
      mobilityStatus: 'normal',
    },
    serviceFrequency: '每周2次',
    defaultServiceType: '探访关爱',
    notes: '独居老人，老伴去年去世。近期情绪波动大，多次提到不想活。需重点心理关注。',
    family: { id: 'F003', name: '刘志强', phone: '133****4567', relation: '儿子', pushChannel: '短信' },
    history: [
      { date: '2026-05-10', bloodPressure: '130/82', bpSystolic: 130, bpDiastolic: 82, medication: '正常', mood: '低落', mobility: '正常', weight: 55, summary: '刘阿姨今天情绪明显低落，多次提到"活着没意思"。已做心理疏导，建议安排心理咨询。饮食偏少。', workerName: '李小明', serviceType: '探访关爱', duration: 40, alerts: ['情绪异常', '疑似抑郁倾向'] },
      { date: '2026-05-08', bloodPressure: '126/78', bpSystolic: 126, bpDiastolic: 78, medication: '正常', mood: '一般', mobility: '正常', weight: 55.5, summary: '整体平稳，但话少，不太愿意交流。饮食和用药正常。', workerName: '李小明', serviceType: '探访关爱', duration: 30, alerts: ['情绪关注'] },
    ],
  },
  {
    id: 'E004',
    name: '陈玉兰',
    address: '古荡湾北苑 15-301',
    age: 80,
    gender: '女',
    health: {
      bloodPressure: '132/78',
      bloodPressureStatus: 'normal',
      medication: '按时服用',
      medicationStatus: 'normal',
      sleep: '7小时，良好',
      sleepStatus: 'normal',
      mood: '良好',
      moodStatus: 'normal',
      mobility: '正常',
      mobilityStatus: 'normal',
    },
    serviceFrequency: '每周1次',
    defaultServiceType: '助医陪诊',
    notes: '下周二有心内科复诊，需陪诊。',
    family: { id: 'F004', name: '陈明', phone: '159****2345', relation: '儿子', pushChannel: '微信' },
    history: [
      { date: '2026-05-06', bloodPressure: '132/78', bpSystolic: 132, bpDiastolic: 78, medication: '正常', mood: '良好', mobility: '正常', weight: 58, summary: '陪诊心内科，医生表示恢复良好，降压药可维持现有剂量。精神状态不错。', workerName: '张晓华', serviceType: '助医陪诊', duration: 120, alerts: [] },
    ],
  },
  {
    id: 'E005',
    name: '赵德明',
    address: '文二路 88-1002',
    age: 85,
    gender: '男',
    health: {
      bloodPressure: '155/98',
      bloodPressureStatus: 'danger',
      medication: '偶有漏服',
      medicationStatus: 'warning',
      sleep: '6小时',
      sleepStatus: 'normal',
      mood: '一般',
      moodStatus: 'warning',
      mobility: '行动受限，需轮椅',
      mobilityStatus: 'danger',
    },
    serviceFrequency: '每周3次',
    defaultServiceType: '康复训练',
    notes: '中风康复期，右侧肢体功能受限。需要持续康复训练。脾气急躁。',
    family: { id: 'F005', name: '赵小红', phone: '158****6789', relation: '女儿', pushChannel: '微信' },
    history: [
      { date: '2026-05-10', bloodPressure: '155/98', bpSystolic: 155, bpDiastolic: 98, medication: '漏服', mood: '一般', mobility: '受限', weight: 72, summary: '康复训练完成，右臂力量较上周略有提升。发现昨天漏服降压药，血压偏高。已提醒按时服药。', workerName: '张晓华', serviceType: '康复训练', duration: 50, alerts: ['血压过高', '漏服药物'] },
      { date: '2026-05-08', bloodPressure: '148/92', bpSystolic: 148, bpDiastolic: 92, medication: '正常', mood: '良好', mobility: '受限', weight: 72, summary: '今天训练配合度好，右手握力有进步。心情不错，主动聊了很多。', workerName: '张晓华', serviceType: '康复训练', duration: 45, alerts: [] },
    ],
  },
]

export const sopTemplates: SOPTemplate[] = [
  {
    id: 'SOP001',
    serviceType: '探访关爱',
    name: '探访关爱标准流程',
    estimatedDuration: 30,
    enabled: true,
    steps: [
      { id: 's1', name: '问候与环境观察', guidance: '观察老人精神状态、居住环境整洁度、是否有安全隐患', duration: 3, checkItems: ['精神状态', '环境整洁', '安全隐患'] },
      { id: 's2', name: '健康指标检查', guidance: '测量血压，询问近期身体状况，检查用药情况', duration: 8, checkItems: ['血压测量', '身体状况', '用药确认'] },
      { id: 's3', name: '日常生活评估', guidance: '了解饮食、睡眠、活动情况，评估自理能力变化', duration: 5, checkItems: ['饮食情况', '睡眠质量', '活动能力'] },
      { id: 's4', name: '心理情绪关注', guidance: '关注情绪变化，倾听诉求，提供心理支持', duration: 8, checkItems: ['情绪状态', '社交情况', '心理需求'] },
      { id: 's5', name: '安全与跌倒风险', guidance: '评估跌倒风险，检查辅助设备，提醒注意事项', duration: 3, checkItems: ['跌倒风险', '辅助设备', '安全提醒'] },
      { id: 's6', name: '总结与告别', guidance: '总结今日情况，告知下次服务时间，确认紧急联系方式', duration: 3, checkItems: ['情况总结', '下次预约', '紧急联系'] },
    ],
  },
  {
    id: 'SOP002',
    serviceType: '助浴',
    name: '助浴服务标准流程',
    estimatedDuration: 45,
    enabled: true,
    steps: [
      { id: 's1', name: '环境准备', guidance: '检查浴室安全，准备防滑垫，调节水温', duration: 5, checkItems: ['浴室安全', '防滑措施', '水温调节'] },
      { id: 's2', name: '身体状况评估', guidance: '确认老人当前身体状况适合沐浴，检查皮肤', duration: 5, checkItems: ['身体状况', '皮肤检查', '禁忌确认'] },
      { id: 's3', name: '协助沐浴', guidance: '协助老人安全沐浴，注意保暖和隐私保护', duration: 20, checkItems: ['安全协助', '保暖措施', '隐私保护'] },
      { id: 's4', name: '皮肤护理', guidance: '沐浴后检查皮肤状况，涂抹护肤品，注意异常', duration: 5, checkItems: ['皮肤检查', '护理涂抹', '异常记录'] },
      { id: 's5', name: '穿衣与整理', guidance: '协助穿衣，整理浴室，确保环境安全', duration: 5, checkItems: ['穿衣协助', '环境整理', '安全确认'] },
      { id: 's6', name: '健康记录', guidance: '记录服务情况，标注皮肤异常，确认老人感受', duration: 5, checkItems: ['服务记录', '异常标注', '满意度'] },
    ],
  },
  {
    id: 'SOP003',
    serviceType: '康复训练',
    name: '康复训练标准流程',
    estimatedDuration: 50,
    enabled: true,
    steps: [
      { id: 's1', name: '状态评估', guidance: '评估当日身体状况，确认可以进行训练', duration: 5, checkItems: ['身体评估', '疼痛检查', '训练确认'] },
      { id: 's2', name: '热身活动', guidance: '协助进行轻度关节活动和肌肉拉伸', duration: 8, checkItems: ['关节活动', '肌肉拉伸', '呼吸调整'] },
      { id: 's3', name: '功能训练', guidance: '根据康复计划进行针对性功能训练', duration: 20, checkItems: ['上肢训练', '下肢训练', '平衡训练'] },
      { id: 's4', name: '力量评估', guidance: '测试肌力和活动范围，记录进步情况', duration: 7, checkItems: ['握力测试', '活动范围', '进步记录'] },
      { id: 's5', name: '放松与指导', guidance: '放松肌肉，指导日常自主训练动作', duration: 5, checkItems: ['放松活动', '居家训练指导', '注意事项'] },
      { id: 's6', name: '记录与计划', guidance: '记录今日训练情况，调整下次训练计划', duration: 5, checkItems: ['训练记录', '计划调整', '预约下次'] },
    ],
  },
]

export const todayTasks: ServiceTask[] = [
  {
    id: 'T001',
    elderId: 'E001',
    elder: elders[0],
    workerId: 'W001',
    serviceType: '探访关爱',
    scheduledTime: '09:00',
    estimatedDuration: 30,
    status: 'completed',
    startTime: '09:02',
    endTime: '09:35',
    actualDuration: 33,
    alert: '上次血压 150/95 偏高',
    sopProgress: sopTemplates[0].steps.map(s => ({ ...s, status: 'completed' as const })),
    aiNotes: [
      '王奶奶上次血压 150/95 偏高，今天请先关注血压情况。',
      '用药情况还没有确认。要不要问一下最近有没有按时吃降压药？',
      '收到。接下来可以评估一下跌倒风险——最近有没有头晕、腿软的情况？',
      '今天王奶奶血压 145/90，比上次略有下降。情绪正常，用药规律。服务日志已生成。',
    ],
    photos: [],
    workerNotes: '王奶奶状态不错，血压有改善。',
  },
  {
    id: 'T002',
    elderId: 'E002',
    elder: elders[1],
    workerId: 'W001',
    serviceType: '助浴',
    scheduledTime: '10:00',
    estimatedDuration: 45,
    status: 'in_progress',
    startTime: '10:05',
    sopProgress: [
      { ...sopTemplates[1].steps[0], id: 's1', status: 'completed' },
      { ...sopTemplates[1].steps[1], id: 's2', status: 'completed' },
      { ...sopTemplates[1].steps[2], id: 's3', status: 'in_progress' },
      { ...sopTemplates[1].steps[3], id: 's4', status: 'pending' },
      { ...sopTemplates[1].steps[4], id: 's5', status: 'pending' },
      { ...sopTemplates[1].steps[5], id: 's6', status: 'pending' },
    ],
    aiNotes: [
      '张爷爷上次助浴时发现左小腿淤青，今天请注意观察恢复情况。',
      '环境准备完成，水温 38°C 适宜。',
    ],
    photos: [],
  },
  {
    id: 'T003',
    elderId: 'E003',
    elder: elders[2],
    workerId: 'W001',
    serviceType: '探访关爱',
    scheduledTime: '11:30',
    estimatedDuration: 30,
    status: 'pending',
    alert: '情绪异常，需重点关注',
    sopProgress: sopTemplates[0].steps.map(s => ({ ...s, status: 'pending' as const })),
    aiNotes: [],
    photos: [],
  },
  {
    id: 'T004',
    elderId: 'E005',
    elder: elders[4],
    workerId: 'W001',
    serviceType: '康复训练',
    scheduledTime: '14:00',
    estimatedDuration: 50,
    status: 'pending',
    alert: '昨日漏服降压药，血压偏高',
    sopProgress: sopTemplates[2].steps.map(s => ({ ...s, status: 'pending' as const })),
    aiNotes: [],
    photos: [],
  },
]

export const kanbanTasks: ServiceTask[] = [
  ...todayTasks,
  {
    id: 'T005',
    elderId: 'E004',
    elder: elders[3],
    workerId: 'W002',
    serviceType: '探访关爱',
    scheduledTime: '09:30',
    estimatedDuration: 30,
    status: 'completed',
    startTime: '09:28',
    endTime: '10:00',
    actualDuration: 32,
    sopProgress: sopTemplates[0].steps.map(s => ({ ...s, status: 'completed' as const })),
    aiNotes: ['陈奶奶状态良好，下周二复诊已提醒。'],
    photos: [],
  },
  {
    id: 'T006',
    elderId: 'E005',
    elder: elders[4],
    workerId: 'W002',
    serviceType: '康复训练',
    scheduledTime: '10:30',
    estimatedDuration: 50,
    status: 'en_route',
    sopProgress: sopTemplates[2].steps.map(s => ({ ...s, status: 'pending' as const })),
    aiNotes: [],
    photos: [],
  },
  {
    id: 'T007',
    elderId: 'E001',
    elder: elders[0],
    workerId: 'W003',
    serviceType: '探访关爱',
    scheduledTime: '14:00',
    estimatedDuration: 30,
    status: 'pending',
    sopProgress: sopTemplates[0].steps.map(s => ({ ...s, status: 'pending' as const })),
    aiNotes: [],
    photos: [],
  },
]

export const familyNotes: FamilyNote[] = [
  { id: 'FN001', familyId: 'F001', elderId: 'E001', content: '妈妈最近腿疼，上下楼不方便，麻烦多关注一下。', createdAt: '2026-05-10 08:30', read: true },
  { id: 'FN002', familyId: 'F003', elderId: 'E003', content: '最近妈妈情绪不太好，可能是想爸爸了。麻烦多陪她聊聊。', createdAt: '2026-05-09 20:15', read: true },
  { id: 'FN003', familyId: 'F005', elderId: 'E005', content: '爸爸说最近右手有进步了，训练请继续加油！', createdAt: '2026-05-09 19:00', read: false },
]

export const agentChatHistory: ChatMessage[] = [
  { id: 'c1', role: 'user', content: '今天有哪些异常？', timestamp: '10:15' },
  { id: 'c2', role: 'agent', content: '今天目前有 2 个异常标记：\n\n1. **张福来**（助浴）—— 李小明正在服务中，上次发现左小腿淤青，今天需观察恢复情况。\n2. **刘秀英**（待服务）—— 上次服务时情绪明显低落，多次提到"活着没意思"，建议重点关注心理状态。\n\n另外赵德明昨日漏服降压药，血压 155/98 偏高，下午康复训练时请注意。', timestamp: '10:15' },
  { id: 'c3', role: 'user', content: '李小明这周表现怎么样？', timestamp: '10:20' },
  { id: 'c4', role: 'agent', content: '李小明本周服务 **12 户**，SOP 完成率 **96%**，高于站平均 89%。\n\n- 探访关爱 8 次，平均时长 32 分钟\n- 助浴 3 次，平均时长 43 分钟\n- 康复训练 1 次，时长 48 分钟\n\n有 1 次助浴服务超时（预计 45 分钟，实际 62 分钟），原因是发现皮肤淤青做了额外检查和拍照记录，属于合理超时。\n\n整体表现优秀，服务态度认真细致。', timestamp: '10:20' },
  { id: 'c5', role: 'user', content: '帮我排一下明天的班', timestamp: '10:25' },
  { id: 'c6', role: 'agent', content: '根据服务频次和地理位置，建议明天排班如下：\n\n**李小明**（3 户，路线最优）：\n1. 09:00 王桂芬 · 探访关爱 · 翠苑一区\n2. 10:00 刘秀英 · 探访关爱 · 翠苑二区 ⚠️ 重点关注\n3. 14:00 赵德明 · 康复训练 · 文二路\n\n**张晓华**（2 户）：\n1. 09:30 陈玉兰 · 助医陪诊 · 古荡湾（下周二复诊提前沟通）\n2. 14:00 张福来 · 助浴 · 文三路\n\n💡 刘秀英情绪异常，建议安排经验丰富的李小明优先跟进。\n\n确认这个排班吗？', timestamp: '10:25' },
]

export const statsData = {
  weeklyServices: [
    { day: '周一', count: 12 },
    { day: '周二', count: 15 },
    { day: '周三', count: 11 },
    { day: '周四', count: 14 },
    { day: '周五', count: 13 },
    { day: '周六', count: 8 },
    { day: '周日', count: 5 },
  ],
  sopCompletion: [
    { worker: '李小明', rate: 96 },
    { worker: '张晓华', rate: 91 },
    { worker: '王美丽', rate: 88 },
  ],
  alertTypes: [
    { type: '血压异常', count: 8 },
    { type: '情绪关注', count: 4 },
    { type: '用药问题', count: 3 },
    { type: '皮肤异常', count: 2 },
    { type: '跌倒风险', count: 1 },
  ],
  monthlyTrend: [
    { month: '1月', services: 280, alerts: 18 },
    { month: '2月', services: 265, alerts: 22 },
    { month: '3月', services: 310, alerts: 15 },
    { month: '4月', services: 325, alerts: 20 },
    { month: '5月', services: 198, alerts: 12 },
  ],
}
