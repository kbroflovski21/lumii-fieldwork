# 智能工牌 Demo 完整规格说明

状态：规格定稿（含完整实现细节）
日期：2026-05-13
仓库：`aro-network/lumii-fieldwork`

## 1. 产品概述

智能工牌养老服务平台的交互式 Demo。核心能力：AI 驱动的社工上门服务督导、跨角色数据联动、实时语音交互。

所有界面统一采用「聊天主界面 + 角色相关 Tab」的交互模式。聊天负责对话和详情展示，Tab 负责结构化数据列表。

## 2. 设计语言

### 色彩体系

- 主色 brand：brand-50(#EEF4FA) ~ brand-700(#1C3A55)，用于按钮、链接、选中状态
- 金色 gold：gold-300(#EFCD6F) ~ gold-700(#8C6720)，用于 hover 高亮
- 基底色：stone-50(背景) / white(卡片) / stone-200(边框)
- 语义色：emerald-400(成功/正常)、amber-400(警告)、red-500(异常/录音)
- 录音界面：slate-900 → slate-800 渐变深色背景

### 字体

系统字体栈：-apple-system, "SF Pro Text", "PingFang SC", "Noto Sans SC", system-ui, sans-serif

### 通用组件

- **SectionTitle**：text-sm font-semibold text-stone-700
- **StatCard**：彩色边框卡片（brand/red/green/amber 四种），含 label(11px) + value(lg bold) + sub(11px)
- **Badge**：圆角药丸标签，green/amber/red/gray 四色，11px font-medium
- **SimpleTable**：stone-50 表头 + stone-200 边框圆角表格
- **ServiceCard**：统一服务卡片，展示时间+社工→服务对象、类型+地址/时长、备注(📌)、摘要(2行限制)、SOP%+置信度、待处理数(⚠️)。可点击时显示「点击查看完整报告 →」

## 3. 总入口（角色选择页）

### 视觉设计

- 背景：gradient `from-stone-50 via-amber-50/30 to-stone-100`
- 顶部：圆角药丸 badge「Demo 演示入口」(bg-white/80 backdrop-blur)
- 标题：金色年华养老服务集团（3xl bold）
- 副标题：养老智慧服务平台 · 请选择角色进入
- 卡片网格：responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`，max-w-4xl
- 卡片样式：bg-white/80 backdrop-blur, border-stone-200/60, rounded-2xl, p-6
- Hover：shadow-lg shadow-amber-100/50, border-gold-300/60, -translate-y-0.5
- 卡片内容：emoji(3xl) → 角色名(lg semibold) → 副标题(sm stone-500) → 「进入工作台 >」(xs)
- 底部：「本 Demo 中所有数据均为模拟数据，用于展示产品交互逻辑」

### 角色图标

| 角色 | 图标 | 副标题 |
|------|------|--------|
| 集团管理 | 🏢 | 跨站点经营与质量总览 |
| 站点运营 | 📋 | 翠苑站日常运营管理 |
| 服务主管 | 📐 | SOP 管理与服务质量指导 |
| 社工人员 | 👤 | 王建国的工作台 |
| 服务对象家属 | 👨‍👩‍👦 | 张明（张大伟家属） |

### Reset Demo 按钮

- 位置：fixed top-4 right-4
- 无活动时：bg-white/60 border-stone-200 text-stone-400
- 有活动时：bg-red-50 border-red-200 text-red-500，下方显示「X 条操作记录」
- 点击弹出 confirm() 对话框，确认后清除所有 session 数据

### Session 机制

- 所有角色共享同一个全局 store（React Context）
- 切换角色时聊天记录保留
- Reset 恢复全部初始 mock 数据，包括 tasks/records/pendingItems/familyReports/voiceLogs/notifications/sops/strategies/sopDraft/messagesByRole/familyFeedbacks

## 4. 主界面布局

### 结构

```
+------------------------------------------------------------------+
| Header: [< 切换角色] | [emoji] 角色名 / 副标题    [● 智能助手在线] |
+--------------------------------+---------------------------------+
|                                |  [Tab1] [Tab2] [Tab3] ...       |
|   聊天区域                      +---------------------------------+
|   (flex-1, 自适应宽度)          |  Tab 内容区域                    |
|                                |  (w-[440px], overflow-y-auto)   |
|   [建议问题按钮]                |                                 |
|   [输入框] [发送]               |                                 |
+--------------------------------+---------------------------------+
```

### Header

- 白色背景 + 底部 border-stone-200
- 左侧：「< 切换角色」按钮 → 竖分隔线 → emoji + 角色名(sm semibold) + 副标题(xs stone-400)
- 右侧：绿色脉冲圆点(w-2 h-2 bg-emerald-400 animate-pulse) + 「智能助手在线」

### 聊天区域

- 消息气泡：用户(右侧, bg-brand-500 white, rounded-2xl rounded-br-md) / Agent(左侧, bg-white border shadow-sm, rounded-2xl rounded-bl-md)
- 最大宽度 80%
- 文本支持 `**bold**` 渲染为 `<strong font-semibold>`
- 时间戳：10px stone-400，用户右对齐，agent 左对齐，格式 HH:MM
- 打字指示器：三个脉冲圆点(2x2 stone-300)，延迟 0/150/300ms
- 自动滚动到底部（smooth behavior）
- 建议问题：仅在 messages.length <= 3 时显示，圆角药丸按钮，点击直接发送
- 输入框：textarea 自动增高(max 120px)，Enter 发送 / Shift+Enter 换行，placeholder「输入消息...」
- 发送按钮：40x40 rounded-xl brand-500，空内容时 disabled(opacity-30)
- Agent 回复延迟：800 + random(600) ms

### Tab 面板

- Tab 栏：底部 border，每个 tab 为按钮，选中时底部有 h-0.5 brand-500 圆角指示条
- Tab 高亮动画：当聊天回复包含 tabHighlight 时，对应 tab 上出现脉冲琥珀色圆点(w-2 h-2 amber-400 animate-pulse)，3 秒后消失
- 内容区域：overflow-y-auto，p-4，自定义 scrollbar-thin

## 5. 各角色 Tab 详细定义

### 5.1 集团管理

#### 运营总览 Tab

KPI 卡片（2列网格）：
| 指标 | 值 | 趋势 |
|------|-----|------|
| 本周服务次数 | 47 | ↑ +12% |
| 服务完成率 | 93% | → 0% |
| 异常率 | 6.4% | ↓ -1.2% |
| SOP 执行完整率 | 89% | ↑ +3% |
| 投诉率 | 2.1% | ↓ -0.5% |
| 家属满意度 | 4.6/5 | ↑ +0.1 |

KPI 卡片颜色逻辑：「异常」「投诉」类指标下降=green（好事），其他指标上升=green。

站点对比表：

| 站点 | 服务量 | 完成率 | 异常率 | SOP率 |
|------|--------|--------|--------|-------|
| 翠苑站 | 47 | 93% | 6.4% | 89% |
| 三墩站 | 38 | 91% | 7.8% | 85% |
| 古荡站 | 52 | 96% | 4.2% | 92% |
| 文新站 | 31 | 88% | 9.1% | 81% |

#### 质量管理 Tab

按服务类型分 block（来自 store.sops 中 status=active 的 SOP）。每个 block：
- 标题：服务类型名 + 记录数
- SOP 完成率 StatCard（从 store.records 计算均值）
- 最常见问题（取第一条异常记录的 pendingItems[0] 或 summary 前 40 字）
- 近期异常记录（取第一条异常记录展示在 red-50 卡片中）

#### 服务报告 Tab

按站点分组（硬编码）：
- 翠苑站：第20周服务周报(2026-05-12, 周报), 4月服务月报(2026-05-01, 月报)
- 三墩站：第20周服务周报(2026-05-12, 周报)
- 古荡站：第20周服务周报(2026-05-12, 周报), 服务质量专项分析(2026-05-10, 专题)
- 文新站：第20周服务周报(2026-05-12, 周报), 异常率专项分析(2026-05-10, 专题)

Badge 颜色：专题=amber, 周报/月报=green

#### 默认聊天记录

Agent 问候 → 用户问「最近服务质量怎么样？」→ Agent 回复详细统计

建议问题：「哪些站点异常最多？」「社工人员有没有按规程做？」「本月家属投诉情况如何？」「生成本周管理报告」

### 5.2 站点运营

#### 工牌设备 Tab

每个工牌卡片展示：设备码(monospace) + 状态 Badge + 分配社工 + 电量% + 最后活跃时间

状态映射：active→green/已激活, recording→red/录音中, idle→gray/空闲, offline→gray/离线

初始数据 5 台：GK-2026-0001(李晓红,录音中,72%), 0002(王建国,已激活,88%), 0003(陈秀芳,已激活,65%), 0004(未分配,空闲,100%), 0005(未分配,离线,0%)

#### 待服务 Tab

从 store.tasks 筛选 status=pending 或 in_progress。使用 ServiceCard 展示。

#### 已服务 Tab

从 store.records 筛选 status=normal 或 warning。使用 ServiceCard 展示。

**点击行为**：点击卡片 → 在聊天框推送完整报告。报告格式：

```
📋 **{服务对象} — {服务类型} 服务报告**

**基本信息**
- 社工：{workerName}
- 时间：{startTime} ~ {endTime}
- 时长：{duration}
- SOP 完成率：{sopCompletion}%

**AI 摘要**
{summary}

**情绪观察**：{mood}
**健康观察**：{healthObservations}

**提示项**
- ⚠️ {concern1}
- ⚠️ {concern2}

**SOP 逐项检查**
- ✅ 步骤1
- ❌ 步骤2

**语音日志**（N 条）
- [社工] xxx
- [服务对象] xxx
... 最多展示 10 条
```

#### 需确认 Tab

合并展示：store.records 中 status=anomaly 的记录（用 ServiceCard，status 映射为 needs_confirm）+ store.pendingItems（用独立卡片，severity 映射：critical→red/紧急, warning→amber/警告, info→gray/提示，含「处理」按钮）。

#### 家属反馈 Tab

从 store.familyFeedbacks 读取。标题显示待处理数。每条：家属名 + 状态 Badge(pending→amber/待处理, resolved→green/已处理) + 内容 + 时间 + 「处理」按钮（待处理项）。

初始数据 3 条：王丽(待处理)、赵强(已处理)、刘芳(已处理)。

#### 默认聊天记录

Agent 问候（今日概况：7 任务、1 进行中、4 待确认、2 可用社工） → 用户问「今天有哪些服务安排？」→ Agent 列出 7 条任务

建议问题：「哪些工牌还没归属？」「哪些服务记录需要确认？」「帮我排一个新任务」「本月可导出结算的记录有哪些？」

#### 站点运营动态响应

当 store 中有 live records（id 以 `rec-live-` 开头）且用户提到「张大伟/刚完成/最近/这一单/服务情况/服务记录」时，回复从 store 实时数据生成，包含 LLM 分析结果（如有）。

### 5.3 服务主管

#### 服务 SOP 管理 Tab

顶部：标题 + 生效中 SOP 数量

草稿区（store.sopDraft 存在时）：amber-50 背景卡片，显示操作类型(新建/修改) + 服务类型名 + 步骤列表(amber-200 编号圆) + 提示「输入确认发布来发布」。

SOP 列表：每个 SOP 卡片含服务类型 + 版本号 + 状态 Badge + 步骤列表(stone-100 编号圆, 必做标红) + 必问项 + 完成标准 + 更新日期。

底部：虚线框提示「在聊天中输入新增 XXX SOP 来创建」。

#### SOP 督导策略 Tab

顶部说明：brand-50 卡片解释督导策略的作用。

每个策略卡片：服务类型 + 关联 SOP 版本 + 4 行配置：
- 服务开始：策略文本
- 服务过程：策略文本
- 检查方式：any_order→brand-600「不限顺序，对话中体现即 check」/ sequential→amber-600「按顺序执行」
- 服务结束：策略文本

自定义规则区（stone-50 圆角框）+ 更新日期

#### SOP 管理对话流程

新增 SOP：
1. 匹配正则 `/(?:新增|新建|创建)(?:一个)?[「""]?(.+?)[」""]?\s*(?:SOP|服务|$)/`
2. 创建草稿，默认 3 步：服务前准备与确认(必做)、服务执行(必做)、服务记录与总结(必做)
3. 增删步骤后输入「确认发布」→ publishSopDraft() → SOP 生效 + 自动创建默认督导策略 + 通知社工

修改 SOP：
1. 匹配 `/(?:修改|编辑|调整)[「""]?(.+?)[」""]?\s*(?:SOP|$)/`
2. 加载当前 SOP 为草稿 → 增删步骤 → 确认发布 → 版本号递增

版本号逻辑：新建 v1.0，publishSopDraft 编辑时 +1.0，addSOPStep 单步 +0.1

#### 督导策略对话流程（立即生效，无需确认）

- 增加规则：匹配 `/(?:增加|添加|新增)(?:一条)?(?:自定义)?规则[：:]?\s*[「""]?(.+?)[」""]?\s*$/`
- 修改服务开始/结束/过程行为：匹配对应关键词
- 切换检查模式：「不限顺序」/「按顺序」

#### 默认聊天记录

Agent 问候（3 个生效 SOP 概况）

注意：默认消息说探访关爱有「7 步骤」但实际只有 4 步，需修正。

建议问题：「新增一个康复指导 SOP」「修改探访关爱 SOP」「查看当前督导策略」「探访关爱 SOP 的完整步骤是什么？」

### 5.4 社工人员

#### 今日任务 Tab

从 store.tasks 筛选 workerId='w2'。每个任务卡片含：时间 + 服务对象名 + 状态 Badge(in_progress→green/进行中, completed→gray/已完成, 默认→amber/待执行) + 类型 + 地址 + concerns(amber ⚠️) + notes(📌) + 服务对象详情子面板(stone-50, name/age/healthNotes/familyContact+phone)。

#### 当前服务 Tab

渲染 ServiceRecording 组件。Fallback 逻辑：如无 activeService，查找 w2 的下一个 pending 任务；如无 pending 任务，使用默认值(张大伟/探访关爱)。详见第 6 节。

#### 历史记录 Tab

王建国的服务记录列表 + 关联的语音日志。语音日志使用 VoiceLogDetail 可展开组件：
- 折叠时：「▶ 语音日志」+ 分析中/已分析 Badge
- 展开时：
  - LLM 分析结果（brand-50 卡）：摘要、情绪、健康观察、关注事项(⚠️)、SOP check(✓/✗ 逐项)
  - 转写记录（stone-50 卡）：时间 + 声源标签([社工]=brand-500, [服务对象]=amber-600, 其他=stone-400) + 文字，max-h-40 滚动

#### 默认聊天记录

Agent 问候（王建国今日 3 个任务详情含注意事项）

建议问题：「张大伟老人有什么注意事项？」「开始服务记录」「我刚才的记录完整吗？」「查看我的历史服务记录」

#### 服务启动检测

聊天中输入匹配 `/开始.*(服务|记录)/` → 从 store.tasks 找 w2 的下一个 pending 任务 → 设为 activeService → 切换到 current_service tab。

### 5.5 服务对象家属

#### 服务与状态 Tab

张大伟个人卡（👴 amber-100 圆形头像 + 姓名(age) + 地址）→ 健康状态 StatCard(风险等级/服务记录数) → 近期关注(amber-50 框) → 最近服务记录（从 store.records 筛选 recipientName='张大伟'）

#### 订阅报告 Tab

订阅状态卡（绿点 + 已订阅周报，推送方式微信服务号）→ 报告列表（从 store.familyReports 筛选 recipientName='张大伟'，展示类型/期间/摘要/关注事项📌）

#### 反馈与需求 Tab

空状态提示「暂无反馈记录」+ 4 个操作按钮（提交服务建议、申请增加服务、反馈问题、请求回访）。纯视觉，无点击处理。

#### 默认聊天记录

Agent 问候（张明你好，介绍父亲近况）

建议问题：「最近服务情况怎么样？」「这周报告发我看一下」「我想反馈一个问题」「父亲血压最近正常吗？」

#### 家属反馈检测

聊天中输入匹配 `/安排|希望|能否|可以|建议|喜欢|留言|告诉|转告|备注|麻烦/` → store.addFamilyFeedback() → 流转到站点运营。回复中 `{INPUT}` 占位符替换为用户原文。

## 6. 语音督导（ServiceRecording 组件）

### 6.1 服务前状态

白色卡片布局：
- 服务对象信息卡：w-11 h-11 brand-100 圆形 👴 + 姓名 + 类型·地址
- 注意事项：amber-50 框，从 recipient.concerns 获取
- SOP 信息：版本号 + 步骤数
- SOP 流程预览：编号圆(stone-100) + 步骤名(必做标红) + 描述
- 语音督导区：开关按钮(brand-100 pill) + 声音下拉框(显示「名称 (性别) — 风格」) + 试听按钮(text: 「语音督导测试，您好，我是您的服务助手。」)
- 开始按钮：full-width brand-500 rounded-2xl py-4，含红色脉冲圆点

### 6.2 录音状态

深色界面(slate-900→slate-800 渐变)：
- Header：红色脉冲点 + 「REC」red-400 + 计时器(white/90 mono semibold) | 督导开/关 + TTS「🔊 播报中」(amber-300 pulse)
- 服务信息：对象名·类型(white/90) + 地址(white/40)
- 波形：Canvas 380x80, white/5 bg rounded-xl, 48 条频谱柱，HSL(200-230, 60%, 45-60%)，3px 间距，rounded 2px。数据来源 getByteFrequencyData，smoothing 0.8
- SOP 进度条：水平分段(emerald-400/white/15)，hover tooltip(black/80)。下方文字列表(✓ emerald-400 / ○ white/30)
- 转写区：empty「等待语音输入...」(white/20)，final(white/30 时间 + white/80 文字)，interim(white/40 italic + ...)
- 结束按钮：red-500 rounded-2xl py-4 + 白色方形图标

### 6.3 结束确认状态

按钮变为 amber-500 disabled，显示「等待确认中...请说"没有"或"结束"」+ 白色脉冲点

### 6.4 服务后总结

白色布局：
- ✅ 完成标志(3xl) + 标题 + 服务信息
- 3 列 StatCard：时长(brand-50) / SOP(emerald-50 或 amber-50) / 转写句数(brand-50)
- SOP 逐项：✓(emerald-100/emerald-600) / ✗(red-50/red-400) + 步骤名 + 「必做未完成」标记
- 转写记录(max-h-48 scroll)
- 返回按钮(stone-100)

### 6.5 督导行为详细定义

#### 开始播报（speakNow，立即播放，CosyVoice TTS）

文本拆分为 2-3 段短句逐段合成播放：
1. 「你好王建国，本次为{recipientName}提供{serviceType}服务。」
2. 「必做项目：{requiredSteps}。」
3. 「请注意：{concerns}。」（如有 concerns）

首段约 2-3 秒出声。setTimeout 500ms 后开始。

#### SOP 自动 check（LLM 驱动，静默）

- 每句转写结果进入 pendingCheckRef 缓冲队列
- 2 秒去抖（停说 2 秒后触发）
- 批量发送到 `/api/check-live`
- Qwen3-max 语义分析，返回新完成步骤编号和违规描述
- 静默更新 UI（无 TTS 播报步骤完成）
- 检查方式由 strategy.checkMode 控制

#### 自定义规则检测（LLM 驱动）

- 与 SOP check 同一个 API 调用
- LLM 基于对话语义判断是否违反 customRules
- 检测到违规 → TTS 警告（通过 speak，遵守静默检测）：
  > 督导提醒：{violation描述}。请注意规范服务行为。

#### 静默检测机制

- AUDIO_LEVEL_SPEECH 阈值：0.12
- SILENCE_THRESHOLD：3000ms
- 检查间隔：500ms（setInterval）
- 逻辑：音频电平 > 0.12 或有语音识别结果 → markSpeechActivity → 重置计时
- TTS 队列：silent 时播放，speaking 时等待
- speakNow 不受限制（开始/结束播报用）

#### 两阶段结束

第一阶段（initiateEnd）：
- 设 endingPhase='confirming'
- 播报总结含未完成步骤
- 录音继续

第二阶段（finalizeEnd）：
- 触发条件：语音识别匹配 `/没有|不用|结束|没了|就这样|可以了|好了/`
- 播报「服务结束，停止录音。」
- 3 秒后停止所有资源
- 数据写入 store + 触发 LLM 分析

### 6.6 资源管理

- startRecording 开头清理上一次的 stream/AudioContext/Recognition
- 组件卸载 useEffect 清理所有资源
- getUserMedia fallback：先尝试带约束，失败则 `{ audio: true }`
- AudioContext：fftSize=256, smoothingTimeConstant=0.8
- SpeechRecognition：lang='zh-CN', continuous=true, interimResults=true, maxAlternatives=1, 结束后自动重启

#### 文字输入模式（待实现）

当麦克风不可用时，提供文字输入框替代语音。打字内容走相同的 SOP check 和规则检测流程。

## 7. 跨角色数据联动

### 服务完成数据流

```
社工完成服务（finalizeEnd）
  → store.completeService()
    → 创建 ServiceRecord
      status: anomaly(sopCompletion<60% 或 duration<300s) / warning(sopCompletion<90%) / normal
      confidence: 95(sopCompletion>=80) / 75(>=50) / 50
    → 更新 task status='completed'
    → 创建 PendingItem（SOP 缺失、异常）
    → 生成 FamilyReport（日报）
    → 推送消息到 site_ops 聊天：📋 服务完成通知（含时长、SOP率、置信度、待确认数）
    → 推送消息到 family 聊天：📢 服务报告推送
  → store.addVoiceLog()
  → fetch('/api/analyze') → 异步更新 record 摘要 + voiceLog 分析 + familyReport
```

### SOP 更新数据流

```
服务主管修改 SOP → store 更新 → 社工读取最新 SOP
服务主管修改策略 → store 更新 → 社工录音时使用最新策略
```

### 家属反馈数据流

```
家属发送反馈
  → store.addFamilyFeedback()
    → 写入 familyFeedbacks
    → 推送 📨 家属反馈通知到 site_ops 聊天
  → site_ops 家属反馈 Tab 显示新条目
```

## 8. API 端点

### POST /api/tts

CosyVoice V2 语音合成代理。

请求：`{ text, voice?, model? }`（默认 voice=longxiaochun_v2, model=cosyvoice-v2）

服务端流程：
1. POST `https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer`（10 秒超时 AbortController）
   - body: `{ model, input: { text, voice, format: 'mp3', sample_rate: 22050 } }`
2. 从响应 JSON 提取 output.audio.url
3. 下载音频文件
4. 返回 audio/mpeg 二进制

客户端 playOneTts：
- 15 秒超时 AbortController
- 检查 blob.size >= 500（否则视为错误）
- Audio 播放失败 → reject → fallback 到 browser speechSynthesis(zh-CN, rate 0.95)

### GET /api/tts-voices

返回可用声音列表 JSON：

| voice ID | 名称 | 性别 | 风格 |
|----------|------|------|------|
| longxiaochun_v2 | 龙小淳 | 女 | 温柔亲切 |
| longxiaoxia_v2 | 龙小夏 | 女 | 活泼可爱 |
| longyue_v2 | 龙悦 | 女 | 知性温婉 |
| longwan_v2 | 龙湾 | 女 | 甜美清新 |
| longshu_v2 | 龙叔 | 男 | 成熟稳重 |
| longxiaobai_v2 | 龙小白 | 男 | 少年清朗 |
| longcheng_v2 | 龙城 | 男 | 浑厚大气 |
| longyuan_v2 | 龙远 | 男 | 沉稳低沉 |

### POST /api/check-live

实时 SOP check + 规则违反检测。

请求：`{ recentText, sopSteps, completedStepIndices, customRules }`

Prompt 模板：
```
你是社工上门服务的实时督导。分析最新对话，返回JSON。

SOP步骤（编号:名称）：
0: 问候与身份确认 [已完成]
1: 健康状况询问
...

督导规则：
{rules}

最新对话："{recentText}"

严格返回JSON，不要其他文字：
{"new_steps":[编号],"violation":null或"描述"}
```

模型：qwen3-max，response_format: json_object

错误处理：DashScope 失败时返回 `{ new_steps: [], violation: null, error: true }`（HTTP 200）

### POST /api/analyze

服务转写完整分析。

请求：`{ transcript, recipientName, workerName, serviceType, sopSteps }`

Prompt 模板：
```
你是一个社区养老服务的智能分析助手。请分析以下社工上门服务的语音转写记录。

服务信息：
- 服务对象：{recipientName}
- 社工：{workerName}
- 服务类型：{serviceType}
- SOP 步骤：{steps}

转写记录：
{transcript}

请返回严格的 JSON 格式，包含：
{
  "summary": "两到三句话的服务摘要",
  "speaker_turns": [{"speaker": "社工/服务对象", "text": "..."}],
  "sop_check": {"步骤名": true/false},
  "concerns": ["关注事项"],
  "mood": "情绪状态",
  "health_observations": ["健康观察"]
}
```

模型：qwen3-max，response_format: json_object

错误处理：失败时 store.updateVoiceLogAnalysis(recordId, null)

### DashScope 配置

- API Key：`.env` 文件中 `DASHSCOPE_API_KEY=xxx`
- CosyVoice 端点：`https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer`
- Qwen3-max 端点：`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- Vite 配置需要 `server: { allowedHosts: true }`（Cloudflare Tunnel 需要）

## 9. Mock 数据完整定义

### 机构

- 集团：金色年华养老服务集团
- 站点：翠苑站（主站点）、三墩站、古荡站、文新站

### 社工人员

| ID | 姓名 | 电话 | 技能 | 状态 | 今日任务 | 已完成 |
|----|------|------|------|------|---------|--------|
| w1 | 李晓红 | 138****2201 | 探访关爱、助浴、康复指导 | on_service | 4 | 2 |
| w2 | 王建国 | 139****3302 | 探访关爱、助餐、用药提醒 | available | 3 | 1 |
| w3 | 陈秀芳 | 137****4403 | 探访关爱、助洁、心理疏导 | available | 3 | 2 |
| w4 | 张伟明 | 136****5504 | 探访关爱、助浴、助餐 | off_duty | 0 | 0 |

### 服务对象

| ID | 姓名 | 年龄 | 地址 | 健康情况 | 风险 | 家属 | 电话 | 频次 | 上次服务 | 关注事项 |
|----|------|------|------|---------|------|------|------|------|---------|---------|
| r1 | 张大伟 | 82 | 翠苑一区3幢402 | 高血压，左膝关节炎，需助行器 | 中 | 张明(儿子) | 158****6601 | 每周3次 | 2026-05-12 | 血压偏高；膝盖疼痛加重 |
| r2 | 王秀英 | 78 | 翠苑二区7幢201 | 糖尿病II型，轻度认知障碍 | 高 | 王丽(女儿) | 159****7702 | 每周5次 | 2026-05-12 | 常忘记吃药；情绪波动大 |
| r3 | 刘国强 | 75 | 翠苑三区12幢101 | 身体良好，独居 | 低 | 刘芳(女儿) | 150****8803 | 每周2次 | 2026-05-11 | 无 |
| r4 | 赵淑芬 | 88 | 翠苑一区9幢301 | 帕金森中期，卧床为主 | 高 | 赵强(儿子) | 151****9904 | 每天1次 | 2026-05-12 | 压疮风险；家属要求增加助浴 |
| r5 | 孙志明 | 80 | 翠苑二区5幢502 | 慢性支气管炎，轻度听力下降 | 低 | 孙婷(女儿) | 152****0005 | 每周2次 | 2026-05-10 | 上次咳嗽较多 |

### 今日任务（7 条）

| ID | 时间 | 社工 | 服务对象 | 类型 | 状态 | 备注 |
|----|------|------|---------|------|------|------|
| t1 | 09:00 | 王建国(w2) | 张大伟 | 探访关爱 | pending | 注意血压和膝盖 |
| t2 | 09:30 | 李晓红(w1) | 王秀英 | 用药提醒 | in_progress | 确认服药，观察情绪 |
| t3 | 10:30 | 李晓红(w1) | 赵淑芬 | 助浴 | pending | 压疮部位检查 |
| t4 | 14:00 | 陈秀芳(w3) | 刘国强 | 探访关爱 | pending | |
| t5 | 15:30 | 陈秀芳(w3) | 孙志明 | 探访关爱 | pending | 关注咳嗽 |
| t6 | 11:30 | 王建国(w2) | 王秀英 | 助餐 | pending | 糖尿病饮食 |
| t7 | 16:00 | 王建国(w2) | 赵淑芬 | 探访关爱 | pending | 翻身检查压疮 |

### 历史服务记录（5 条）

| ID | 社工 | 服务对象 | 类型 | 时间 | 时长 | SOP% | 置信度 | 状态 |
|----|------|---------|------|------|------|------|--------|------|
| rec1 | 李晓红 | 张大伟 | 探访关爱 | 05-12 09:05 | 47分 | 100 | 95 | normal |
| rec2 | 李晓红 | 王秀英 | 用药提醒 | 05-12 10:10 | 28分 | 85 | 90 | warning |
| rec3 | 陈秀芳 | 赵淑芬 | 助浴 | 05-12 14:00 | 75分 | 100 | 98 | normal |
| rec4 | 王建国 | 刘国强 | 探访关爱 | 05-12 15:30 | 40分 | 20 | 60 | anomaly |
| rec5 | 陈秀芳 | 孙志明 | 探访关爱 | 05-11 10:00 | 45分 | 100 | 96 | normal |

### SOP 定义（3 个）

**探访关爱 v2.1**（4 步骤）：
1. 问候与身份确认（必做）— 敲门问候，确认身份，观察精神状态
2. 健康状况询问（必做）— 询问身体、睡眠、饮食、用药
3. 生命体征检查（可选）— 测量血压、体温
4. 服务总结与告别（必做）— 总结内容，告知下次时间

**助浴 v1.3**（6 步骤）：
1. 服务前准备（必做）
2. 身体状况评估（必做，异常分支：身体不适改擦浴）
3. 协助洗浴（必做）
4. 皮肤检查（必做）
5. 穿衣与整理（必做）
6. 记录与反馈（必做）

**用药提醒 v1.0**（4 步骤）：
1. 核对药品清单（必做）
2. 检查剩余药量（必做）
3. 督促服药（必做）
4. 记录服药情况（必做）

### 初始督导策略（3 个）

**探访关爱**：onStart=语音介绍对象和必做项, duringService=监听+自动check, checkMode=any_order, onEnd=未完成时提示, customRules=[不限顺序check, 时长<20分钟提醒]

**助浴**：onStart=提醒防滑和水温, duringService=监听皮肤检查, checkMode=sequential, onEnd=确认浴室整理, customRules=[按顺序执行, 身体不适改擦浴]

**用药提醒**：onStart=播报药品清单, duringService=监听服药确认, checkMode=sequential, onEnd=确认全部服用, customRules=[连续漏服2次上报]

### 家属报告（3 条初始）

| 对象 | 类型 | 期间 | 摘要概要 |
|------|------|------|---------|
| 张大伟 | 周报 | 05-06~05-12 | 3次探访，血压偏高，膝盖加重 |
| 王秀英 | 日报 | 05-12 | 服药遗漏，情绪低落 |
| 赵淑芬 | 周报 | 05-06~05-12 | 7次探访3次助浴，压疮好转 |

### 待确认事项（4 条初始）

| 类型 | 标题 | 严重度 |
|------|------|--------|
| low_confidence | 刘国强5/12服务归属待确认 | warning |
| anomaly | 王秀英5/12服药遗漏 | critical |
| sop_gap | 王建国5/12探访SOP缺失安全检查 | info |
| family_feedback | 王丽来电反映母亲情绪异常 | warning |

## 10. Mock 响应规则完整映射

### 关键词匹配机制

`generateMockResponse(roleId, text)` 按顺序遍历规则数组，返回第一个匹配的规则。关键词检查使用 `msg.includes(kw)`。

### 已知问题（待修正）

以下 tabHighlight 值是旧 Tab key，不会触发高亮：
- 集团管理：`recipients`（已删除）、`reports`（应为 `service_reports`）
- 站点运营：`tasks`（应为 `pending_service`）、`records`（应为 `completed_service`）、`pending`（应为 `needs_confirm`）

集团管理 fallback 引用了「服务对象与家属情况」（已删除的 Tab）

社工人员的「开始服务」响应列出 7 个 SOP 步骤（实际只有 4 个）

## 11. Demo 演示流程

### 步骤 1：服务主管 — 配置督导策略

1. 选择「服务主管」
2. 查看 SOP 督导策略 Tab
3. 输入：「增加规则：不得私下向被服务人员推销任何商业产品，如果发现就要提示」
4. 确认 Tab 中规则更新，AI 回复确认

### 步骤 2：社工 — 上门服务

1. 切换到「社工人员」→ 当前服务 Tab
2. 开始服务记录 → 听到自然语言开场白
3. 模拟对话：问好(step1✓) → 问健康(step2✓) → 跳过体征检查 → 尝试推销(被警告) → 告别(step4✓)
4. 结束服务 → 总结播报(含未完成项) → 说「没有」→ 正式结束
5. 验证：今日任务中张大伟变为「已完成」，当前服务加载下一任务

### 步骤 3：站点运营 — 查看结果

1. 切换到「站点运营」
2. 聊天区有服务完成通知
3. 待服务 Tab：张大伟消失
4. 已服务 Tab：新记录出现，点击查看报告
5. 需确认 Tab：SOP 缺失项
6. 问「张大伟这一单怎么样」→ 实时数据回答

### 步骤 4：家属 — 查看推送并反馈

1. 切换到「服务对象家属」
2. 聊天区有推送消息
3. 订阅报告有新日报
4. 输入「我爸喜欢吃鱼，能否多安排」→ AI 确认

### 步骤 5：站点运营 — 处理家属反馈

1. 切换回「站点运营」
2. 聊天区有家属反馈通知
3. 家属反馈 Tab 有新条目
4. 输入「把这个信息加入张大伟的信息库，下次送餐服务可以自动备注」→ AI 确认

## 12. 已知问题与待实现

- [ ] 文字输入模式（无麦克风时的备选方案）
- [ ] 麦克风资源管理需更健壮
- [ ] CosyVoice 延迟优化（考虑 WebSocket 流式合成）
- [ ] LLM 聊天对话（当前用关键词 mock，可接 Qwen3-max）
- [ ] 修正旧 Tab key 引用（mock-responses 中的 stale tabHighlight）
- [ ] 修正默认消息中的 SOP 步数不一致
- [ ] 部署到 staging 服务器
