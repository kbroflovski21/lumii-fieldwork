import type { ServiceTask, SopFolder, DemoUser } from '../types'

export const demoUser: DemoUser = {
  name: '王建国',
  region: '余杭',
  role: '护理服务人员',
}

export const mockTasks: ServiceTask[] = [
  // 5/12 周一
  {
    id: 't1',
    serviceType: '助餐',
    recipientName: '陈阿姨',
    workerName: '王建国',
    date: '2026-05-12',
    dayOfWeek: '周一',
    startTime: '09:00',
    endTime: '10:00',
    location: '杭州市余杭区翠苑一区12幢3单元401',
    locationShort: '翠苑一区',
    status: 'completed',
    source: '周期计划',
    notes: '',
  },
  {
    id: 't2',
    serviceType: '健康监测',
    recipientName: '李大爷',
    workerName: '王建国',
    date: '2026-05-12',
    dayOfWeek: '周一',
    startTime: '10:30',
    endTime: '11:30',
    location: '杭州市余杭区文一西路288号翡翠城5幢1单元302',
    locationShort: '翡翠城',
    status: 'completed',
    source: '周期计划',
    notes: '血压偏高，已记录',
  },
  {
    id: 't3',
    serviceType: '助洁',
    recipientName: '张奶奶',
    workerName: '王建国',
    date: '2026-05-12',
    dayOfWeek: '周一',
    startTime: '14:00',
    endTime: '15:30',
    location: '杭州市余杭区五常街道荆长路100号阳光花园8幢201',
    locationShort: '阳光花园',
    status: 'completed',
    source: '临时派单',
    notes: '',
  },
  // 5/13 周二
  {
    id: 't4',
    serviceType: '常规探访',
    recipientName: '赵叔叔',
    workerName: '王建国',
    date: '2026-05-13',
    dayOfWeek: '周二',
    startTime: '09:00',
    endTime: '10:30',
    location: '杭州市余杭区良渚街道玉鸟路99号万科良渚文化村3幢502',
    locationShort: '良渚文化村',
    status: 'completed',
    source: '周期计划',
    notes: '',
  },
  {
    id: 't5',
    serviceType: '助浴',
    recipientName: '刘阿姨',
    workerName: '王建国',
    date: '2026-05-13',
    dayOfWeek: '周二',
    startTime: '11:00',
    endTime: '12:00',
    location: '杭州市余杭区仓前街道梦想小镇天使村2幢103',
    locationShort: '梦想小镇',
    status: 'abnormal',
    source: '周期计划',
    notes: '服务对象临时身体不适，已中止服务并上报',
  },
  {
    id: 't6',
    serviceType: '康复训练',
    recipientName: '陈阿姨',
    workerName: '王建国',
    date: '2026-05-13',
    dayOfWeek: '周二',
    startTime: '14:00',
    endTime: '15:00',
    location: '杭州市余杭区翠苑一区12幢3单元401',
    locationShort: '翠苑一区',
    status: 'completed',
    source: '周期计划',
    notes: '',
  },
  // 5/14 周三
  {
    id: 't7',
    serviceType: '助餐',
    recipientName: '张奶奶',
    workerName: '王建国',
    date: '2026-05-14',
    dayOfWeek: '周三',
    startTime: '09:00',
    endTime: '10:00',
    location: '杭州市余杭区五常街道荆长路100号阳光花园8幢201',
    locationShort: '阳光花园',
    status: 'completed',
    source: '周期计划',
    notes: '',
  },
  {
    id: 't8',
    serviceType: '健康监测',
    recipientName: '赵叔叔',
    workerName: '王建国',
    date: '2026-05-14',
    dayOfWeek: '周三',
    startTime: '10:30',
    endTime: '11:30',
    location: '杭州市余杭区良渚街道玉鸟路99号万科良渚文化村3幢502',
    locationShort: '良渚文化村',
    status: 'completed',
    source: '周期计划',
    notes: '',
  },
  // 5/15 周四
  {
    id: 't9',
    serviceType: '常规探访',
    recipientName: '李大爷',
    workerName: '王建国',
    date: '2026-05-15',
    dayOfWeek: '周四',
    startTime: '09:00',
    endTime: '10:30',
    location: '杭州市余杭区文一西路288号翡翠城5幢1单元302',
    locationShort: '翡翠城',
    status: 'completed',
    source: '周期计划',
    notes: '',
  },
  {
    id: 't10',
    serviceType: '助浴',
    recipientName: '陈阿姨',
    workerName: '王建国',
    date: '2026-05-15',
    dayOfWeek: '周四',
    startTime: '14:00',
    endTime: '15:00',
    location: '杭州市余杭区翠苑一区12幢3单元401',
    locationShort: '翠苑一区',
    status: 'completed',
    source: '临时派单',
    notes: '',
  },
  // 5/16 周五
  {
    id: 't11',
    serviceType: '助餐',
    recipientName: '刘阿姨',
    workerName: '王建国',
    date: '2026-05-16',
    dayOfWeek: '周五',
    startTime: '09:00',
    endTime: '10:00',
    location: '杭州市余杭区仓前街道梦想小镇天使村2幢103',
    locationShort: '梦想小镇',
    status: 'completed',
    source: '周期计划',
    notes: '',
  },
  {
    id: 't12',
    serviceType: '康复训练',
    recipientName: '张奶奶',
    workerName: '王建国',
    date: '2026-05-16',
    dayOfWeek: '周五',
    startTime: '10:30',
    endTime: '11:30',
    location: '杭州市余杭区五常街道荆长路100号阳光花园8幢201',
    locationShort: '阳光花园',
    status: 'completed',
    source: '周期计划',
    notes: '',
  },
  // 5/17 周六（今天）
  {
    id: 't13',
    serviceType: '健康监测',
    recipientName: '陈阿姨',
    workerName: '王建国',
    date: '2026-05-17',
    dayOfWeek: '周六',
    startTime: '09:00',
    endTime: '10:00',
    location: '杭州市余杭区翠苑一区12幢3单元401',
    locationShort: '翠苑一区',
    status: 'pending',
    source: '周期计划',
    notes: '',
  },
  {
    id: 't14',
    serviceType: '助餐',
    recipientName: '李大爷',
    workerName: '王建国',
    date: '2026-05-17',
    dayOfWeek: '周六',
    startTime: '11:00',
    endTime: '12:00',
    location: '杭州市余杭区文一西路288号翡翠城5幢1单元302',
    locationShort: '翡翠城',
    status: 'pending',
    source: '临时派单',
    notes: '',
  },
  // 5/18 周日
  {
    id: 't15',
    serviceType: '常规探访',
    recipientName: '刘阿姨',
    workerName: '王建国',
    date: '2026-05-18',
    dayOfWeek: '周日',
    startTime: '10:00',
    endTime: '11:30',
    location: '杭州市余杭区仓前街道梦想小镇天使村2幢103',
    locationShort: '梦想小镇',
    status: 'pending',
    source: '周期计划',
    notes: '',
  },
  // 5/19 周一（下周）
  {
    id: 't16',
    serviceType: '助餐',
    recipientName: '陈阿姨',
    workerName: '王建国',
    date: '2026-05-19',
    dayOfWeek: '周一',
    startTime: '09:00',
    endTime: '10:00',
    location: '杭州市余杭区翠苑一区12幢3单元401',
    locationShort: '翠苑一区',
    status: 'pending',
    source: '周期计划',
    notes: '',
  },
  {
    id: 't17',
    serviceType: '助浴',
    recipientName: '赵叔叔',
    workerName: '王建国',
    date: '2026-05-19',
    dayOfWeek: '周一',
    startTime: '14:00',
    endTime: '15:00',
    location: '杭州市余杭区良渚街道玉鸟路99号万科良渚文化村3幢502',
    locationShort: '良渚文化村',
    status: 'pending',
    source: '周期计划',
    notes: '',
  },
  // 5/20 周二（下周）
  {
    id: 't18',
    serviceType: '健康监测',
    recipientName: '张奶奶',
    workerName: '王建国',
    date: '2026-05-20',
    dayOfWeek: '周二',
    startTime: '09:30',
    endTime: '10:30',
    location: '杭州市余杭区五常街道荆长路100号阳光花园8幢201',
    locationShort: '阳光花园',
    status: 'pending',
    source: '周期计划',
    notes: '',
  },
  {
    id: 't19',
    serviceType: '康复训练',
    recipientName: '李大爷',
    workerName: '王建国',
    date: '2026-05-20',
    dayOfWeek: '周二',
    startTime: '14:00',
    endTime: '15:30',
    location: '杭州市余杭区文一西路288号翡翠城5幢1单元302',
    locationShort: '翡翠城',
    status: 'pending',
    source: '周期计划',
    notes: '',
  },
]

export const mockSops: SopFolder[] = [
  {
    id: 'sop1',
    name: '上门服务通用规范',
    type: 'general',
    version: 2,
    updatedAt: '2026-05-10',
    content: `# 上门服务通用规范

## 一、服务前准备

1. **出发前检查**：确认服务工具包完整（工牌、手套、鞋套、消毒用品、服务记录表）。
2. **确认信息**：核对服务对象姓名、地址、联系方式、特殊注意事项。
3. **着装要求**：统一工装，佩戴工牌，保持整洁得体。

## 二、到达与开场

1. **准时到达**：提前5分钟到达服务地点。
2. **敲门/按铃**：轻敲三下或按铃一次，等待开门，不可大声喊叫。
3. **自我介绍**：「您好，我是金色年华的护理人员王建国，今天来为您提供XX服务。」
4. **身份确认**：确认服务对象身份，出示工牌。
5. **穿戴用品**：进门换鞋套，必要时戴手套。

## 三、服务过程

1. **沟通态度**：语速适中，音量适当，使用尊称。
2. **隐私保护**：不窥探服务对象隐私，不拍照录像（除工作需要）。
3. **安全意识**：注意地面湿滑、电器安全、老人跌倒风险。
4. **服务记录**：如实记录服务内容、时间、服务对象状态。

## 四、服务结束

1. **服务复述**：向服务对象复述本次完成的服务内容。
2. **满意度询问**：「请问您对今天的服务还满意吗？有什么需要改进的地方？」
3. **物品归位**：确认所有物品归位，垃圾带走。
4. **告别**：「再见，有需要随时联系我们。」

## 五、禁止行为

- 向服务对象推销任何商品。
- 私下收取费用或接受贵重礼物。
- 在服务期间使用手机（紧急情况除外）。
- 与服务对象发生争执。`,
  },
  {
    id: 'sop2',
    name: '安全与应急处理规范',
    type: 'general',
    version: 1,
    updatedAt: '2026-05-08',
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
    id: 'sop3',
    name: '助餐服务 SOP',
    type: 'service',
    version: 3,
    updatedAt: '2026-05-12',
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
    id: 'sop4',
    name: '助浴服务 SOP',
    type: 'service',
    version: 2,
    updatedAt: '2026-05-11',
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
- 从远心端向近心端方向清洗。
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
    id: 'sop5',
    name: '常规探访 SOP',
    type: 'service',
    version: 2,
    updatedAt: '2026-05-09',
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
    id: 'sop6',
    name: '康复训练 SOP',
    type: 'service',
    version: 1,
    updatedAt: '2026-05-06',
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
]

const STATUS_LABELS: Record<string, string> = {
  completed: '已完成',
  abnormal: '异常',
  pending: '待服务',
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status
}

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function getDayOfWeek(dateStr: string): string {
  return DAY_NAMES[new Date(dateStr).getDay()]
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${getDayOfWeek(dateStr)}`
}
