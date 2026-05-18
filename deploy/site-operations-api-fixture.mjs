const fullOperationalState = {
  isLoading: false,
  permission: "full"
};

const readOnlyOperationalState = {
  isLoading: false,
  permission: "read_only"
};

const restrictedOperationalState = {
  isLoading: false,
  permission: "restricted",
  unavailableMessage: "当前账号仅可查看脱敏信息"
};

const familyContact = {
  id: "family-001",
  name: "陈女士",
  relation: "女儿",
  phone: "13900000001",
  subscriptionStatus: "weekly",
  lastPushedAt: "2026-05-12T18:00:00+08:00"
};

const servicePlan = {
  id: "plan-001",
  serviceObjectId: "object-001",
  serviceProject: "助餐",
  cadenceRule: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
  cadenceLabel: "每周一三五",
  preferredTimeWindow: { start: "09:00", end: "10:30", label: "上午" },
  startDate: "2026-05-01",
  primarySocialWorkerId: "worker-001",
  status: "active",
  exceptions: [
    {
      id: "exception-pause",
      servicePlanId: "plan-001",
      kind: "pause",
      effectiveFrom: "2026-05-20",
      effectiveTo: "2026-05-22",
      note: "住院暂停"
    },
    {
      id: "exception-time",
      servicePlanId: "plan-001",
      kind: "time_change",
      effectiveFrom: "2026-05-14",
      timeWindow: { start: "14:00", end: "15:00", label: "下午临时调整" }
    },
    {
      id: "exception-worker",
      servicePlanId: "plan-001",
      kind: "worker_change",
      effectiveFrom: "2026-05-15",
      replacementSocialWorkerId: "worker-002"
    },
    {
      id: "exception-skip",
      servicePlanId: "plan-001",
      kind: "skip",
      effectiveFrom: "2026-05-17",
      note: "家属临时陪护"
    }
  ],
  nextScheduleAt: "2026-05-14T14:00:00+08:00"
};

const serviceObject = {
  id: "object-001",
  name: "陈阿姨",
  phone: "13800001234",
  age: 82,
  gender: "female",
  address: "上海市杨浦区控江路 1200 号",
  mapDisplayPoint: { latitude: 31.292, longitude: 121.515, label: "控江路 1200 号" },
  eligibilityType: "government",
  serviceFrequency: "每周三次",
  serviceProjects: ["助餐", "陪诊"],
  riskTags: ["独居", "跌倒风险"],
  careNotes: ["午餐后需确认服药"],
  familySubscriptionSummary: "weekly",
  latestInsightSummary: "最近三次助餐完成稳定，需关注用药提醒。",
  insightSummaries: [
    { id: "insight-001", title: "状态稳定", description: "最近三次服务均按时完成。", severity: "info" },
    { id: "insight-002", title: "用药提醒", description: "午餐后需确认服药。", severity: "warning" }
  ],
  servicePlanSummaries: [
    {
      id: "plan-001",
      serviceObjectId: "object-001",
      serviceProject: "助餐",
      cadenceLabel: "每周一三五",
      preferredTimeWindow: { start: "09:00", end: "10:30", label: "上午" },
      primarySocialWorkerId: "worker-001",
      primarySocialWorkerName: "王丽",
      status: "active",
      activeExceptionCount: 4
    }
  ],
  familyContacts: [familyContact],
  state: "plan_exception_active"
};

const smartBadges = [
  {
    id: "badge-021",
    deviceCode: "FW-021",
    orgId: "org-001",
    siteId: "site-001",
    siteName: "红培社区站",
    status: "available",
    batteryPercent: 83,
    activatedAt: "2026-05-01T09:00:00+08:00",
    lastSyncAt: "2026-05-13T08:50:00+08:00",
    lastRecordingAt: "2026-05-12T10:22:00+08:00",
    preferredWorkerId: "worker-001",
    preferredWorkerName: "王丽",
    recentServiceRecordIds: ["record-001"]
  },
  {
    id: "badge-026",
    deviceCode: "FW-026",
    orgId: "org-001",
    siteId: "site-001",
    siteName: "红培社区站",
    status: "sync_delayed",
    batteryPercent: 92,
    activatedAt: "2026-05-03T09:00:00+08:00",
    lastSyncAt: "2026-05-12T18:43:00+08:00",
    recentServiceRecordIds: []
  },
  {
    id: "badge-030",
    deviceCode: "FW-030",
    orgId: "org-001",
    siteId: "site-001",
    siteName: "红培社区站",
    status: "pending_activation",
    recentServiceRecordIds: []
  },
  {
    id: "badge-031",
    deviceCode: "FW-031",
    orgId: "org-001",
    siteId: "site-001",
    siteName: "红培社区站",
    status: "in_use",
    batteryPercent: 67,
    activatedAt: "2026-05-02T10:00:00+08:00",
    lastSyncAt: "2026-05-14T09:30:00+08:00",
    lastRecordingAt: "2026-05-14T09:35:00+08:00",
    preferredWorkerId: "worker-002",
    preferredWorkerName: "张敏",
    recentServiceRecordIds: ["record-001"]
  },
  {
    id: "badge-032",
    deviceCode: "FW-032",
    orgId: "org-001",
    siteId: "site-001",
    siteName: "红培社区站",
    status: "offline",
    batteryPercent: 45,
    activatedAt: "2026-04-20T09:00:00+08:00",
    lastSyncAt: "2026-05-11T14:20:00+08:00",
    recentServiceRecordIds: []
  },
  {
    id: "badge-033",
    deviceCode: "FW-033",
    orgId: "org-001",
    siteId: "site-001",
    siteName: "红培社区站",
    status: "low_battery",
    batteryPercent: 8,
    activatedAt: "2026-04-15T09:00:00+08:00",
    lastSyncAt: "2026-05-14T07:10:00+08:00",
    preferredWorkerId: "worker-003",
    preferredWorkerName: "李芳",
    recentServiceRecordIds: []
  },
  {
    id: "badge-034",
    deviceCode: "FW-034",
    orgId: "org-001",
    siteId: "site-001",
    siteName: "红培社区站",
    status: "disabled",
    batteryPercent: 55,
    activatedAt: "2026-03-01T09:00:00+08:00",
    lastSyncAt: "2026-04-30T16:00:00+08:00",
    recentServiceRecordIds: []
  },
  {
    id: "badge-035",
    deviceCode: "FW-035",
    orgId: "org-001",
    siteId: "site-001",
    siteName: "红培社区站",
    status: "lost",
    batteryPercent: 30,
    activatedAt: "2026-03-10T09:00:00+08:00",
    lastSyncAt: "2026-05-05T11:00:00+08:00",
    recentServiceRecordIds: []
  }
];

const socialWorkers = [
  {
    id: "worker-001",
    userId: "user-001",
    name: "王丽",
    phone: "13800000001",
    siteId: "site-001",
    workerType: "service_personnel",
    qualificationLabels: ["助餐", "陪诊"],
    status: "active",
    preferredBadge: {
      badgeId: "badge-021",
      deviceCode: "FW-021",
      status: "available",
      lastSyncAt: "2026-05-13T08:50:00+08:00"
    },
    praiseSummary: {
      praiseCount: 42,
      latestPraiseAt: "2026-05-12T16:30:00+08:00",
      latestPraiseExcerpt: "服务细心周到，阿姨很满意"
    }
  },
  {
    id: "worker-002",
    userId: "user-002",
    name: "张敏",
    phone: "13800000002",
    siteId: "site-001",
    workerType: "service_personnel",
    qualificationLabels: ["助洁"],
    status: "active",
    praiseSummary: {
      praiseCount: 17,
      latestPraiseAt: "2026-05-10T11:00:00+08:00"
    }
  },
  {
    id: "worker-003",
    userId: "user-003",
    name: "李芳",
    phone: "13900000003",
    siteId: "site-001",
    workerType: "service_personnel",
    qualificationLabels: ["助餐"],
    status: "incomplete_profile",
    preferredBadge: {
      badgeId: "badge-030",
      deviceCode: "FW-030",
      status: "pending_activation"
    },
    praiseSummary: { praiseCount: 3 }
  },
  {
    id: "worker-004",
    userId: "user-004",
    name: "周建国",
    phone: "13700000004",
    siteId: "site-001",
    workerType: "service_personnel",
    qualificationLabels: [],
    status: "disabled",
    praiseSummary: { praiseCount: 0 }
  }
];

const schedules = [
  {
    id: "schedule-001",
    source: "service_plan",
    servicePlanId: "plan-001",
    serviceObjectId: "object-001",
    serviceObjectName: "陈阿姨",
    serviceProject: "助餐",
    addressSnapshot: serviceObject.address,
    address: serviceObject.address,
    mapDisplayPoint: serviceObject.mapDisplayPoint,
    latitude: serviceObject.mapDisplayPoint.latitude,
    longitude: serviceObject.mapDisplayPoint.longitude,
    serviceDate: "2026-05-14",
    startTime: "14:00",
    endTime: "15:00",
    timeWindow: { start: "14:00", end: "15:00", label: "下午临时调整" },
    assignedSocialWorkerId: "worker-002",
    assignedSocialWorkerName: "张敏",
    status: "adjusted",
    notes: "active plan exception has already changed time and worker",
    planExceptionApplied: true,
    riskTags: ["独居"]
  },
  {
    id: "schedule-002",
    source: "one_time",
    serviceObjectId: "object-001",
    serviceObjectName: "陈阿姨",
    serviceProject: "陪诊",
    addressSnapshot: serviceObject.address,
    address: serviceObject.address,
    mapDisplayPoint: serviceObject.mapDisplayPoint,
    serviceDate: "2026-05-15",
    startTime: "10:00",
    endTime: "11:30",
    timeWindow: { start: "10:00", end: "11:30" },
    status: "assigned",
    assignedSocialWorkerId: "worker-001",
    assignedSocialWorkerName: "王丽",
    riskTags: ["跌倒风险"]
  },
  {
    id: "schedule-003",
    source: "service_plan",
    servicePlanId: "plan-001",
    serviceObjectId: "object-001",
    serviceObjectName: "陈阿姨",
    serviceProject: "助餐",
    addressSnapshot: serviceObject.address,
    address: serviceObject.address,
    serviceDate: "2026-05-12",
    startTime: "09:30",
    endTime: "10:30",
    timeWindow: { start: "09:30", end: "10:30" },
    assignedSocialWorkerId: "worker-001",
    assignedSocialWorkerName: "王丽",
    status: "completed",
    serviceRecordId: "record-001",
    riskTags: []
  },
  {
    id: "schedule-004",
    source: "service_plan",
    servicePlanId: "plan-002",
    serviceObjectId: "object-002",
    serviceObjectName: "李爷爷",
    serviceProject: "助浴",
    addressSnapshot: "上海市杨浦区长阳路 800 号",
    address: "上海市杨浦区长阳路 800 号",
    mapDisplayPoint: { latitude: 31.288, longitude: 121.525, label: "长阳路 800 号" },
    serviceDate: "2026-05-15",
    startTime: "14:00",
    endTime: "15:30",
    timeWindow: { start: "14:00", end: "15:30", label: "下午" },
    status: "scheduled",
    riskTags: ["认知障碍"]
  },
  {
    id: "schedule-005",
    source: "one_time",
    serviceObjectId: "object-003",
    serviceObjectName: "王奶奶",
    serviceProject: "探访关爱",
    addressSnapshot: "上海市杨浦区国顺路 500 号",
    address: "上海市杨浦区国顺路 500 号",
    serviceDate: "2026-05-16",
    startTime: "09:00",
    endTime: "10:00",
    timeWindow: { start: "09:00", end: "10:00", label: "上午" },
    assignedSocialWorkerId: "worker-003",
    assignedSocialWorkerName: "李芳",
    status: "assigned",
    riskTags: []
  },
  {
    id: "schedule-006",
    source: "service_plan",
    servicePlanId: "plan-001",
    serviceObjectId: "object-001",
    serviceObjectName: "陈阿姨",
    serviceProject: "助餐",
    addressSnapshot: serviceObject.address,
    address: serviceObject.address,
    serviceDate: "2026-05-17",
    startTime: "09:00",
    endTime: "10:30",
    timeWindow: { start: "09:00", end: "10:30", label: "上午" },
    status: "cancelled",
    notes: "家属临时取消",
    riskTags: []
  }
];

const serviceRecord = {
  id: "record-001",
  serviceDate: "2026-05-12",
  startTime: "09:31",
  endTime: "10:22",
  durationMinutes: 51,
  socialWorkerId: "worker-001",
  socialWorkerName: "王丽",
  serviceObjectId: "object-001",
  serviceObjectName: "陈阿姨",
  familyContactIds: ["family-001"],
  badgeId: "badge-021",
  smartBadgeId: "badge-021",
  serviceProject: "助餐",
  assignmentConfidence: 0.72,
  reviewStatus: "needs_review",
  exportStatus: "exportable",
  locationEvidence: {
    startPoint: { latitude: 31.292, longitude: 121.515, capturedAt: "2026-05-12T09:31:00+08:00", accuracyMeters: 18 },
    endPoint: { latitude: 31.292, longitude: 121.515, capturedAt: "2026-05-12T10:22:00+08:00", accuracyMeters: 16 },
    addressMatched: true
  },
  serviceExceptions: [
    {
      id: "service-exception-001",
      type: "service_incomplete",
      title: "服务项待补充",
      description: "结算字段缺失，导出前需补齐。",
      status: "open"
    }
  ],
  exceptionTags: ["信息不完整"],
  missingFields: ["结算字段"],
  audioAssetId: "audio-001",
  transcriptId: "transcript-001",
  serviceItems: [
    { id: "si-01", seq: 1, category: "business", title: "问候老人，确认身份", status: "completed", transcript: "阿姨您好，我是王丽，今天来给您送餐。", audioDurationSeconds: 8 },
    { id: "si-02", seq: 2, category: "business", title: "询问老人当日身体状况", status: "completed", transcript: "阿姨今天身体怎么样？精神好不好？", audioDurationSeconds: 12 },
    { id: "si-03", seq: 3, category: "business", title: "检查居住环境安全隐患", status: "completed", transcript: "家里地面很干净，没有障碍物。", audioDurationSeconds: 6 },
    { id: "si-04", seq: 4, category: "business", title: "确认服务对象用药情况", status: "abnormal", transcript: "阿姨说今天早上忘记吃降压药了。", abnormalReason: "AI 检测到服务对象未按时服药，属于用药风险。根据 SOP 要求，应提醒服务对象立即补服并记录。", audioDurationSeconds: 15 },
    { id: "si-05", seq: 5, category: "business", title: "准备餐食材料", status: "completed", transcript: "今天准备了清蒸鱼和青菜豆腐汤。", audioDurationSeconds: 10 },
    { id: "si-06", seq: 6, category: "business", title: "烹饪餐食", status: "completed", audioDurationSeconds: 45 },
    { id: "si-07", seq: 7, category: "business", title: "摆放餐具和餐食", status: "completed", audioDurationSeconds: 5 },
    { id: "si-08", seq: 8, category: "business", title: "协助老人就座用餐", status: "completed", transcript: "阿姨慢慢坐，我扶您。", audioDurationSeconds: 8 },
    { id: "si-09", seq: 9, category: "business", title: "观察老人进食情况", status: "completed", transcript: "阿姨今天胃口不错，吃了大半碗饭。", audioDurationSeconds: 20 },
    { id: "si-10", seq: 10, category: "business", title: "提醒老人服药", status: "completed", transcript: "阿姨，现在吃完饭了，把降压药吃了吧。", audioDurationSeconds: 10 },
    { id: "si-11", seq: 11, category: "business", title: "收拾餐具和厨房", status: "completed", audioDurationSeconds: 30 },
    { id: "si-12", seq: 12, category: "business", title: "检查冰箱食材存量", status: "completed", transcript: "冰箱里还有鸡蛋和牛奶，蔬菜需要补充。", audioDurationSeconds: 8 },
    { id: "si-13", seq: 13, category: "business", title: "询问老人对餐食满意度", status: "completed", transcript: "阿姨说今天的鱼很好吃。", audioDurationSeconds: 6 },
    { id: "si-14", seq: 14, category: "business", title: "记录老人情绪状态", status: "completed", transcript: "阿姨今天心情不错，聊了聊家常。", audioDurationSeconds: 12 },
    { id: "si-15", seq: 15, category: "business", title: "检查室内温度和通风", status: "skipped", abnormalReason: "录音中未检测到通风检查相关对话，可能已执行但未录入语音记录。" },
    { id: "si-16", seq: 16, category: "business", title: "协助老人活动或康复训练", status: "completed", transcript: "阿姨我们走两圈吧，活动活动。", audioDurationSeconds: 25 },
    { id: "si-17", seq: 17, category: "business", title: "检查老人皮肤状况", status: "completed", audioDurationSeconds: 10 },
    { id: "si-18", seq: 18, category: "business", title: "记录老人行动能力变化", status: "completed", transcript: "阿姨今天走路比上次稳一些了。", audioDurationSeconds: 8 },
    { id: "si-19", seq: 19, category: "business", title: "告知老人下次服务时间", status: "completed", transcript: "阿姨，后天周三我再来，还是上午。", audioDurationSeconds: 6 },
    { id: "si-20", seq: 20, category: "business", title: "与老人道别", status: "completed", transcript: "阿姨再见，您注意休息。", audioDurationSeconds: 5 },
    { id: "si-21", seq: 21, category: "business", title: "锁好门窗", status: "completed", audioDurationSeconds: 8 },
    { id: "si-22", seq: 22, category: "business", title: "填写服务小结", status: "completed", audioDurationSeconds: 15 },
    { id: "si-23", seq: 23, category: "business", title: "上传服务证据", status: "completed", audioDurationSeconds: 5 },
    { id: "si-24", seq: 24, category: "business", title: "结束服务并签退", status: "completed", audioDurationSeconds: 3 },
    { id: "sp-01", seq: 1, category: "process", title: "入门自我介绍", status: "completed", transcript: "您好阿姨，我是红培社区站的服务人员王丽，工号 SW-001，今天由我为您提供助餐服务。", audioDurationSeconds: 12 },
    { id: "sp-02", seq: 2, category: "process", title: "服务结束总结", status: "completed", transcript: "阿姨，今天的助餐服务已经完成了，您吃了大半碗饭，精神状态不错。下次服务是后天周三上午，我会准时来。", audioDurationSeconds: 18 },
    { id: "sp-03", seq: 3, category: "process", title: "服务期间行为规范", status: "abnormal", transcript: "（录音中检测到服务人员接听私人电话约2分钟）", abnormalReason: "AI 检测到服务人员在服务期间接听私人电话，违反服务期间行为规范。根据 SOP 要求，服务期间应将手机调为静音，紧急情况需向服务对象说明后再处理。", audioDurationSeconds: 130 }
  ],
  structuredSummary: "完成助餐服务，服务对象状态稳定。",
  generatedSummary: "完成助餐服务，服务对象状态稳定。",
  exportHistory: [
    {
      id: "export-001",
      exportedAt: "2026-05-13T17:10:00+08:00",
      operatorName: "站点管理员",
      fileVersion: "v1",
      filterSummary: "助餐记录",
      exceptionFlags: ["信息不完整"],
      unresolvedItems: ["结算字段"]
    }
  ]
};

const serviceRecord2 = {
  id: "record-002",
  serviceDate: "2026-05-13",
  startTime: "14:10",
  endTime: "15:05",
  durationMinutes: 55,
  socialWorkerId: "worker-002",
  socialWorkerName: "张敏",
  serviceObjectId: "object-002",
  serviceObjectName: "李爷爷",
  familyContactIds: [],
  badgeId: "badge-031",
  smartBadgeId: "badge-031",
  serviceProject: "助浴",
  assignmentConfidence: 0.95,
  reviewStatus: "confirmed",
  exportStatus: "exported",
  locationEvidence: {
    startPoint: { latitude: 31.288, longitude: 121.525, capturedAt: "2026-05-13T14:10:00+08:00", accuracyMeters: 12 },
    endPoint: { latitude: 31.288, longitude: 121.525, capturedAt: "2026-05-13T15:05:00+08:00", accuracyMeters: 10 },
    addressMatched: true
  },
  serviceExceptions: [],
  exceptionTags: [],
  missingFields: [],
  audioAssetId: "audio-002",
  transcriptId: "transcript-002",
  serviceItems: [
    { id: "si2-01", seq: 1, category: "business", title: "确认老人身体状况适合助浴", status: "completed", transcript: "李爷爷今天血压正常，可以洗澡。", audioDurationSeconds: 10 },
    { id: "si2-02", seq: 2, category: "business", title: "检查浴室环境安全", status: "completed", transcript: "浴室防滑垫已铺好，扶手牢固。", audioDurationSeconds: 8 },
    { id: "si2-03", seq: 3, category: "business", title: "调节水温至适宜温度", status: "completed", audioDurationSeconds: 15 },
    { id: "si2-04", seq: 4, category: "business", title: "协助老人脱衣", status: "completed", audioDurationSeconds: 12 },
    { id: "si2-05", seq: 5, category: "business", title: "协助老人进入浴室", status: "completed", transcript: "李爷爷慢慢来，我扶着您。", audioDurationSeconds: 10 },
    { id: "si2-06", seq: 6, category: "business", title: "协助清洗头发", status: "completed", audioDurationSeconds: 20 },
    { id: "si2-07", seq: 7, category: "business", title: "协助清洗身体", status: "completed", audioDurationSeconds: 25 },
    { id: "si2-08", seq: 8, category: "business", title: "检查皮肤状况", status: "completed", transcript: "皮肤状况良好，没有红肿。", audioDurationSeconds: 8 },
    { id: "si2-09", seq: 9, category: "business", title: "协助冲洗干净", status: "completed", audioDurationSeconds: 15 },
    { id: "si2-10", seq: 10, category: "business", title: "协助擦干身体", status: "completed", audioDurationSeconds: 12 },
    { id: "si2-11", seq: 11, category: "business", title: "协助穿衣", status: "completed", audioDurationSeconds: 15 },
    { id: "si2-12", seq: 12, category: "business", title: "协助老人离开浴室", status: "completed", audioDurationSeconds: 8 },
    { id: "si2-13", seq: 13, category: "business", title: "检查老人洗浴后状态", status: "completed", transcript: "李爷爷洗完精神不错。", audioDurationSeconds: 6 },
    { id: "si2-14", seq: 14, category: "business", title: "清理浴室", status: "completed", audioDurationSeconds: 20 },
    { id: "si2-15", seq: 15, category: "business", title: "记录服务情况", status: "completed", audioDurationSeconds: 10 },
    { id: "sp2-01", seq: 1, category: "process", title: "入门自我介绍", status: "completed", transcript: "李爷爷您好，我是张敏，今天来给您助浴。", audioDurationSeconds: 8 },
    { id: "sp2-02", seq: 2, category: "process", title: "服务结束总结", status: "completed", transcript: "李爷爷，助浴服务完成了，您今天状态很好。", audioDurationSeconds: 10 },
    { id: "sp2-03", seq: 3, category: "process", title: "服务期间行为规范", status: "completed", audioDurationSeconds: 55 }
  ],
  structuredSummary: "完成助浴服务，老人状态良好。",
  exportHistory: [{
    id: "export-002",
    exportedAt: "2026-05-14T09:00:00+08:00",
    operatorName: "站点管理员",
    fileVersion: "v1",
    filterSummary: "助浴记录"
  }]
};

const serviceRecord3 = {
  id: "record-003",
  serviceDate: "2026-05-14",
  startTime: "09:00",
  endTime: "09:45",
  durationMinutes: 45,
  socialWorkerId: "worker-003",
  socialWorkerName: "李芳",
  serviceObjectId: "object-003",
  serviceObjectName: "王奶奶",
  familyContactIds: ["family-003"],
  badgeId: "badge-021",
  smartBadgeId: "badge-021",
  serviceProject: "探访关爱",
  assignmentConfidence: 0.55,
  reviewStatus: "info_incomplete",
  exportStatus: "not_ready",
  locationEvidence: {
    addressMatched: false
  },
  serviceExceptions: [
    { id: "exception-003", type: "late_arrival", title: "迟到", description: "到达时间比预约晚15分钟", status: "resolved", resolvedAt: "2026-05-14T10:00:00+08:00" }
  ],
  exceptionTags: ["迟到"],
  missingFields: ["服务项目确认", "结算字段"],
  audioAssetId: "audio-003",
  transcriptId: "transcript-003",
  serviceItems: [
    { id: "si3-01", seq: 1, category: "business", title: "问候老人，确认身份", status: "completed", transcript: "王奶奶您好，我是李芳。", audioDurationSeconds: 6 },
    { id: "si3-02", seq: 2, category: "business", title: "询问老人近期身体状况", status: "completed", transcript: "奶奶最近身体怎么样？", audioDurationSeconds: 10 },
    { id: "si3-03", seq: 3, category: "business", title: "检查居住环境", status: "completed", audioDurationSeconds: 8 },
    { id: "si3-04", seq: 4, category: "business", title: "了解老人情绪和心理状态", status: "completed", transcript: "奶奶今天心情挺好的。", audioDurationSeconds: 12 },
    { id: "si3-05", seq: 5, category: "business", title: "检查老人用药情况", status: "completed", audioDurationSeconds: 8 },
    { id: "si3-06", seq: 6, category: "business", title: "检查老人饮食情况", status: "abnormal", transcript: "奶奶说昨天没怎么吃东西。", abnormalReason: "AI 检测到服务对象饮食异常，连续两天食欲不振。根据 SOP 要求，应通知家属并建议就医检查。", audioDurationSeconds: 15 },
    { id: "si3-07", seq: 7, category: "business", title: "协助老人简单活动", status: "completed", transcript: "奶奶我们在客厅走两圈。", audioDurationSeconds: 20 },
    { id: "si3-08", seq: 8, category: "business", title: "检查老人行动能力", status: "completed", audioDurationSeconds: 10 },
    { id: "si3-09", seq: 9, category: "business", title: "记录老人身体变化", status: "completed", audioDurationSeconds: 8 },
    { id: "si3-10", seq: 10, category: "business", title: "与老人交流关爱", status: "completed", transcript: "奶奶跟我聊了聊孙女的事。", audioDurationSeconds: 25 },
    { id: "si3-11", seq: 11, category: "business", title: "检查家中安全隐患", status: "skipped", abnormalReason: "录音中未检测到安全检查相关内容。" },
    { id: "si3-12", seq: 12, category: "business", title: "告知下次服务时间", status: "completed", transcript: "奶奶下周我再来看您。", audioDurationSeconds: 5 },
    { id: "sp3-01", seq: 1, category: "process", title: "入门自我介绍", status: "abnormal", transcript: "（录音开头未检测到标准自我介绍）", abnormalReason: "AI 未在录音开头检测到符合规范的自我介绍。SOP 要求服务人员在入门时需报出姓名、工号和服务内容。", audioDurationSeconds: 3 },
    { id: "sp3-02", seq: 2, category: "process", title: "服务结束总结", status: "completed", transcript: "奶奶今天探访完了，您多注意休息。", audioDurationSeconds: 8 },
    { id: "sp3-03", seq: 3, category: "process", title: "服务期间行为规范", status: "completed", audioDurationSeconds: 45 }
  ],
  structuredSummary: "完成探访关爱服务。",
  exportHistory: []
};

const audioAsset = {
  id: "audio-001",
  recordId: "record-001",
  playbackUrl: "/mock-audio.wav",
  durationSeconds: 3060,
  capturedByBadgeId: "badge-021",
  uploadedAt: "2026-05-12T10:30:00+08:00",
  retentionLabel: "内部证据保留 180 天"
};

const transcript = {
  id: "transcript-001",
  recordId: "record-001",
  language: "zh-CN",
  text: "服务人员完成助餐服务，并确认下次服务时间。",
  confidence: 0.91,
  segments: [
    { startSecond: 0, endSecond: 8, speaker: "social_worker", text: "阿姨您好，我是红培社区站的服务人员王丽，工号 SW-001，今天由我为您提供助餐服务。" },
    { startSecond: 9, endSecond: 14, speaker: "service_object", text: "小王啊，快进来坐，今天又麻烦你了。" },
    { startSecond: 15, endSecond: 22, speaker: "social_worker", text: "不麻烦的阿姨。今天身体怎么样？精神好不好？" },
    { startSecond: 23, endSecond: 30, speaker: "service_object", text: "今天还行，就是昨晚没睡好，有点累。" },
    { startSecond: 31, endSecond: 38, speaker: "social_worker", text: "那您要注意休息。我先看看家里环境，地面干净整洁，没有障碍物，很好。" },
    { startSecond: 39, endSecond: 48, speaker: "social_worker", text: "阿姨，今天早上的药按时吃了吗？" },
    { startSecond: 49, endSecond: 55, speaker: "service_object", text: "哎呀，今天早上忘记吃降压药了，你提醒得好。" },
    { startSecond: 56, endSecond: 65, speaker: "social_worker", text: "没关系阿姨，现在补吃也来得及。我帮您把药拿过来，吃完我们再吃饭。" },
    { startSecond: 66, endSecond: 72, speaker: "service_object", text: "好的好的，谢谢你啊小王。" },
    { startSecond: 120, endSecond: 130, speaker: "social_worker", text: "阿姨，今天给您准备了清蒸鱼和青菜豆腐汤，都是清淡的，适合您。" },
    { startSecond: 131, endSecond: 138, speaker: "service_object", text: "看着就不错，闻着也香。你做饭越来越好了。" },
    { startSecond: 139, endSecond: 145, speaker: "social_worker", text: "谢谢阿姨夸奖。来，慢慢坐好，我扶您。" },
    { startSecond: 300, endSecond: 310, speaker: "social_worker", text: "阿姨今天吃了大半碗饭，胃口不错啊。" },
    { startSecond: 311, endSecond: 318, speaker: "service_object", text: "今天的鱼做得好吃，比上次那个红烧的好。" },
    { startSecond: 319, endSecond: 328, speaker: "social_worker", text: "那下次我还给您做清蒸的。阿姨，饭后药吃了，现在我们活动活动吧？在客厅走两圈。" },
    { startSecond: 329, endSecond: 335, speaker: "service_object", text: "好，走走也好，坐久了腿有点酸。" },
    { startSecond: 400, endSecond: 410, speaker: "social_worker", text: "阿姨今天走路比上次稳一些了，恢复得不错。" },
    { startSecond: 411, endSecond: 418, speaker: "service_object", text: "是吗？我自己倒没感觉，你说稳我就放心了。" },
    { startSecond: 500, endSecond: 510, speaker: "social_worker", text: "阿姨，冰箱里还有鸡蛋和牛奶，蔬菜需要补充一些，我帮您记下来了。" },
    { startSecond: 511, endSecond: 516, speaker: "service_object", text: "好的，你帮我看着就好。" },
    { startSecond: 600, endSecond: 612, speaker: "social_worker", text: "阿姨，今天的服务就到这里了。您吃了大半碗饭，精神状态不错。降压药已经补吃了，下次记得按时吃。后天周三我再来，还是上午这个时间。" },
    { startSecond: 613, endSecond: 620, speaker: "service_object", text: "好的好的，辛苦你了小王。路上注意安全。" },
    { startSecond: 621, endSecond: 625, speaker: "social_worker", text: "阿姨再见，您注意休息。门窗我帮您锁好了。" }
  ]
};

const homeResponse = {
  summary: {
    date: "2026-05-13",
    totalScheduledServices: 18,
    unassignedServices: 2,
    activeSocialWorkers: 7,
    onlineBadges: 6,
    recordsNeedReview: 3,
    exportableServiceRecords: 12
  },
  highlights: [
    {
      id: "highlight-schedule-gap",
      type: "schedule_gap",
      title: "今日还有 2 个服务对象未排期",
      description: "请进入服务排期补齐服务人员和时间窗。",
      severity: "warning",
      relatedEntityType: "service_schedule",
      relatedEntityId: "schedule-002"
    },
    {
      id: "highlight-badge-health",
      type: "badge_issue",
      title: "1 个智能工牌同步延迟",
      description: "FW-026 最近同步超过 12 小时。",
      severity: "warning",
      relatedEntityType: "badge",
      relatedEntityId: "badge-026"
    },
    {
      id: "highlight-export",
      type: "export_ready",
      title: "12 条服务记录可导出",
      description: "包含 1 条带异常标记记录。",
      severity: "info",
      relatedEntityType: "service_record",
      relatedEntityId: "record-001"
    },
    {
      id: "highlight-record-review",
      type: "record_review",
      title: "3 条服务记录待复核",
      description: "优先处理助餐和陪诊记录。",
      severity: "warning",
      relatedEntityType: "service_record",
      relatedEntityId: "record-001"
    }
  ],
  activities: [
    {
      id: "activity-001",
      occurredAt: "2026-05-13T09:10:00+08:00",
      title: "今日还有 6 个服务对象未排期。",
      relatedEntityType: "service_schedule",
      relatedEntityId: "schedule-002"
    },
    {
      id: "activity-002",
      occurredAt: "2026-05-13T09:12:00+08:00",
      title: "智能工牌 FW-021 已接入站点，今日可用。",
      relatedEntityType: "badge",
      relatedEntityId: "badge-021"
    },
    {
      id: "activity-003",
      occurredAt: "2026-05-13T09:14:00+08:00",
      title: "4 条服务记录信息不完整，已放入服务记录。",
      relatedEntityType: "service_record",
      relatedEntityId: "record-001"
    },
    {
      id: "activity-004",
      occurredAt: "2026-05-13T09:15:00+08:00",
      title: "查一下今天谁还没排期。",
      description: "助手已把排期缺口整理为推荐动作。",
      relatedEntityType: "service_schedule",
      relatedEntityId: "schedule-002"
    },
    {
      id: "activity-005",
      occurredAt: "2026-05-13T09:17:00+08:00",
      title: "陈阿姨近期需要用药提醒。",
      description: "服务对象风险已进入首页重点关注。",
      relatedEntityType: "service_object",
      relatedEntityId: "object-001"
    }
  ],
  recommendedActions: [
    { id: "action-schedule-gap", label: "去补排今日缺口", targetWorkspace: "service_schedules", relatedEntityId: "schedule-002" },
    { id: "action-record-review", label: "复核服务记录", targetWorkspace: "service_records", relatedEntityId: "record-001" },
    { id: "action-badge-health", label: "查看设备同步", targetWorkspace: "smart_badges", relatedEntityId: "badge-026" }
  ],
  permissionState: "full"
};

const socialWorkersResponse = {
  socialWorkers,
  operationalState: fullOperationalState
};

const smartBadgesResponse = {
  smartBadges,
  operationalState: fullOperationalState
};

const serviceObject2 = {
  id: "object-002",
  name: "李爷爷",
  phone: "13900005678",
  age: 78,
  gender: "male",
  address: "上海市杨浦区长阳路 800 号",
  mapDisplayPoint: { latitude: 31.288, longitude: 121.525, label: "长阳路 800 号" },
  eligibilityType: "insurance",
  serviceFrequency: "每周两次",
  serviceProjects: ["助浴"],
  riskTags: ["认知障碍"],
  careNotes: ["需要家属陪同助浴", "对水温敏感"],
  familySubscriptionSummary: "none",
  latestInsightSummary: null,
  insightSummaries: [],
  servicePlanSummaries: [
    {
      id: "plan-002",
      serviceObjectId: "object-002",
      serviceProject: "助浴",
      cadenceLabel: "每周二四",
      preferredTimeWindow: { start: "14:00", end: "15:30", label: "下午" },
      primarySocialWorkerId: "worker-002",
      primarySocialWorkerName: "张敏",
      status: "paused",
      activeExceptionCount: 0
    }
  ],
  familyContacts: [
    {
      id: "family-002",
      name: "李先生",
      relation: "儿子",
      phone: "13800002222",
      subscriptionStatus: "exception_only",
      lastPushedAt: "2026-05-10T10:00:00+08:00"
    }
  ],
  state: "plan_paused"
};

const serviceObject3 = {
  id: "object-003",
  name: "王奶奶",
  phone: "13700009999",
  age: 88,
  gender: "female",
  address: "上海市杨浦区国顺路 500 号",
  eligibilityType: "self_paid",
  serviceFrequency: "每周一次",
  serviceProjects: ["探访关爱"],
  riskTags: [],
  careNotes: [],
  familySubscriptionSummary: "monthly",
  servicePlanSummaries: [],
  familyContacts: [
    {
      id: "family-003",
      name: "王女士",
      relation: "孙女",
      phone: "13700003333",
      subscriptionStatus: "monthly"
    }
  ],
  state: "normal"
};

const serviceObjectsResponse = {
  serviceObjects: [serviceObject, serviceObject2, serviceObject3],
  servicePlans: [servicePlan],
  operationalState: fullOperationalState
};

const serviceSchedulesResponse = {
  serviceSchedules: schedules,
  operationalState: fullOperationalState
};

const serviceRecordsResponse = {
  serviceRecords: [serviceRecord, serviceRecord2, serviceRecord3],
  audioAssets: [audioAsset],
  transcripts: [transcript],
  serviceObjects: [serviceObject, serviceObject2, serviceObject3],
  smartBadges: [smartBadges[0], smartBadges[3]],
  operationalState: fullOperationalState
};

const mutationOk = (id) => ({ ok: true, id, message: "staging mutation accepted" });

export const siteOperationsApiFixture = {
  "/api/site-operations/home": homeResponse,
  "/api/social-workers": socialWorkersResponse,
  "/api/social-workers/worker-001": socialWorkers[0],
  "/api/social-workers/worker-001/archive": mutationOk("worker-001"),
  "/api/social-workers/worker-001/badge-binding": socialWorkers[0],
  "/api/smart-badges": smartBadgesResponse,
  "/api/smart-badges/badge-021": smartBadges[0],
  "/api/smart-badges/badge-021/service-records": serviceRecordsResponse,
  "/api/smart-badges/activations": { ...mutationOk("badge-030"), smartBadge: smartBadges[2] },
  "/api/service-objects": serviceObjectsResponse,
  "/api/service-objects/object-001": serviceObject,
  "/api/service-objects/object-001/archive": mutationOk("object-001"),
  "/api/service-objects/object-001/insights": serviceObject,
  "/api/service-objects/object-001/family-subscriptions": { ...mutationOk("object-001"), serviceObject },
  "/api/service-objects/object-001/service-plans": [servicePlan],
  "/api/service-plans/plan-001": servicePlan,
  "/api/service-plans/plan-001/archive": mutationOk("plan-001"),
  "/api/service-plans/plan-001/exceptions": servicePlan,
  "/api/service-plan-exceptions/exception-skip": servicePlan,
  "/api/service-schedule-occurrences": serviceSchedulesResponse,
  "/api/service-schedule-occurrences/schedule-001": schedules[0],
  "/api/service-records": serviceRecordsResponse,
  "/api/service-records/record-001": serviceRecord,
  "/api/service-records/record-001/audio": audioAsset,
  "/api/service-records/export": {
    ...mutationOk("record-export-001"),
    exportId: "record-export-001",
    fileVersion: "v2",
    exportedAt: "2026-05-13T17:30:00+08:00"
  },
  "/api/service-records/record-001/review": { ...mutationOk("record-001"), serviceRecord },
  "/api/__examples/read-only": readOnlyOperationalState,
  "/api/__examples/restricted": restrictedOperationalState
};
