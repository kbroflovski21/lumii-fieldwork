export type MockTabId = "home" | "social_workers" | "service_schedules" | "service_records" | "service_objects";

export const todaySummary = {
  totalServices: 18,
  scheduledServices: 14,
  availableWorkers: 7,
  pendingRecords: 3
};

export const homeMessages = [
  {
    body: "早上好。今天共有 18 单服务，第一批排期已经完成。",
    time: "09:05"
  },
  {
    body: "王丽 09:30 的助餐服务已开始，服务对象是陈阿姨。工牌在线，位置正常。",
    time: "09:31"
  },
  {
    body: "还有 2 单下午服务暂未分配服务人员，建议先处理浦东片区。",
    time: "09:42"
  }
];

export const socialWorkers = [
  {
    name: "王丽",
    phone: "138****2101",
    skills: "助餐 / 探访",
    servicesToday: "3 单",
    badge: "21 号工牌",
    status: "可服务"
  },
  {
    name: "刘洋",
    phone: "136****8824",
    skills: "陪诊 / 慢病随访",
    servicesToday: "2 单",
    badge: "24 号工牌",
    status: "可服务"
  },
  {
    name: "赵敏",
    phone: "139****0707",
    skills: "康复陪护",
    servicesToday: "1 单",
    badge: "未绑定",
    status: "待处理"
  },
  {
    name: "陈静",
    phone: "137****6330",
    skills: "助浴 / 探访",
    servicesToday: "0 单",
    badge: "18 号工牌",
    status: "休息"
  }
];

export const serviceSchedules = [
  {
    time: "09:30-10:30",
    person: "陈阿姨",
    profile: "独居",
    service: "助餐",
    address: "杨浦区控江路 1200 号",
    worker: "王丽",
    status: "已排期"
  },
  {
    time: "10:30-11:10",
    person: "周伯伯",
    profile: "慢病随访",
    service: "助餐",
    address: "杨浦区控江路 1555 号",
    worker: "刘洋",
    status: "已排期"
  },
  {
    time: "14:00-15:00",
    person: "吴叔叔",
    profile: "康复陪护",
    service: "陪诊",
    address: "浦东新区长阳路 900 号",
    worker: "待分配",
    status: "待排"
  },
  {
    time: "15:30-16:10",
    person: "林阿姨",
    profile: "高龄独居",
    service: "探访",
    address: "虹口区公平路 318 号",
    worker: "赵敏",
    status: "已排期"
  }
];

export const serviceRecords = [
  {
    person: "陈阿姨",
    time: "05-12 09:31-10:22",
    worker: "王丽",
    badge: "21 号工牌",
    media: "音频已保存",
    transcript: "文字已保存",
    review: "待复核",
    exportState: "可导出"
  },
  {
    person: "周伯伯",
    time: "05-12 10:33-11:08",
    worker: "刘洋",
    badge: "24 号工牌",
    media: "音频已保存",
    transcript: "文字已保存",
    review: "已复核",
    exportState: "可导出"
  },
  {
    person: "吴叔叔",
    time: "05-12 14:02-15:01",
    worker: "赵敏",
    badge: "27 号工牌",
    media: "音频已保存",
    transcript: "文字待补充",
    review: "待处理",
    exportState: "暂不可导出"
  }
];

export const serviceObjects = [
  {
    name: "陈阿姨",
    profile: "82 岁 · 独居",
    address: "杨浦区控江路 1200 号",
    healthStatus: "高血压稳定",
    careFocus: "助餐、用药提醒、每周血压记录",
    familySubscription: "2 位家属订阅",
    servicePlan: "每周助餐 3 次",
    latestService: "05-12 助餐"
  },
  {
    name: "周伯伯",
    profile: "79 岁 · 慢病随访",
    address: "杨浦区控江路 1555 号",
    healthStatus: "糖尿病随访",
    careFocus: "餐后血糖记录、步行能力观察",
    familySubscription: "1 位家属订阅",
    servicePlan: "每周探访 2 次",
    latestService: "05-12 助餐"
  },
  {
    name: "吴叔叔",
    profile: "76 岁 · 康复陪护",
    address: "浦东新区长阳路 900 号",
    healthStatus: "术后康复",
    careFocus: "陪诊、康复训练提醒、跌倒风险关注",
    familySubscription: "未订阅",
    servicePlan: "按需陪诊",
    latestService: "今日待排"
  }
];
