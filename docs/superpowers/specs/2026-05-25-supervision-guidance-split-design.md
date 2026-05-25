# AI 实时督导/引导拆分设计

## 概述

将当前的 `supervisionContent`（AI 实时督导要求）拆分为：
- **AI 实时督导**（`supervisionContent`）— 违禁行为检测，每句话分析，发现即提醒
- **AI 实时引导**（`guidanceContent`）— SOP 步骤引导，定期分析，带时间约束，每项提醒一次

## 1. 数据库 Schema 改动

`prisma/schema.prisma` Sop model 新增 3 个字段：

```prisma
guidanceContent    String?  @map("guidance_content") @db.Text
guidanceSource     String   @default("ai_generated") @map("guidance_source") @db.VarChar(32)
guidanceVersion    Int      @default(1) @map("guidance_version")
guidanceHistory    Json     @default("[]") @map("guidance_history")
```

`IsUsable()` 发布条件更新为：sopContent + supervisionContent + guidanceContent + reportContent 全部非空。

## 2. Meta-Prompt 矩阵（6 套）

| | general（通用规范） | service（服务项目规范） |
|---|---|---|
| **supervision**（AI 实时督导） | 提取违禁行为 → 每句话检测的督导 prompt | 提取健康安全违规 → 每句话检测的督导 prompt |
| **guidance**（AI 实时引导） | 提取前置/结束流程 → 带时间约束的引导 prompt | 提取 SOP 步骤 → 带识别关键词的引导 prompt |
| **report**（事后报告） | 不变 | 不变 |

### 通用规范 × 督导
从 SOP 中提取违禁行为列表，生成 prompt：每句话分析，检测到立即提醒，同类去重。

### 通用规范 × 引导
从 SOP 中提取前置/结束流程，生成 prompt：前置流程在 N 分钟内未完成则提醒，结束流程在检测到告别信号时检查，每项只提醒一次。

### 服务规范 × 督导
从 SOP 中提取健康安全关键事项（食物过敏、温度、跌倒风险等），生成 prompt：每句话分析，检测到违背即提醒。

### 服务规范 × 引导
从 SOP 中提取服务流程步骤 + 识别关键词，生成 prompt：定期分析，识别当前进行到哪一步，未执行的步骤提示。

## 3. 前端 SupervisorPage 改动

AI 配置面板从 2 卡片变 3 卡片：
- AI 实时督导（违禁行为检测）
- AI 实时引导（SOP 步骤引导）
- 服务后报告要求

每个卡片独立生成/编辑/版本管理。

## 4. Processor 拆分

### supervisionCheck — 督导线程
- **触发**：每句话（IsFinal=true）
- **锁**：独立 `supervisingMu`
- **输入**：当前 1 句话
- **上下文**：通用规范 supervisionContent + 服务规范 supervisionContent（如已加载）
- **LLM 调用**：快速（输入小）
- **输出**：有违规则 TTS，同类去重（`supervisedViolations map`）

### guidanceCheck — 引导线程
- **触发**：每 5 句新内容或每 30 秒
- **锁**：独立 `guidingMu`
- **输入**：全部 transcript + 每句的时间戳（录音开始后第几秒）
- **上下文**：通用规范 guidanceContent + 服务规范 guidanceContent（如已加载）
- **系统 prompt**：直接使用 guidanceContent（类似 Phase 4）
- **状态追踪**：`guidedItems map[string]bool`，提醒过的不再提醒
- **输出**：未执行的 SOP 步骤 TTS 提醒

### 时间戳传入
引导线程的 LLM 输入格式：
```
[00:05] 你好陈阿姨，我是金色年华的王建国。
[00:12] 请问是陈阿姨吗？
[00:18] 这是我的工牌，您看一下。
[01:05] 我今天来给您做饭。
...
```

## 5. 时间戳 Bug 修复

讯飞 ASR `xfResult.CN.ST` 结构体新增 `BG` 和 `ED` 字段（毫秒），赋值给 `TranscriptResult.StartMS/EndMS`。

## 6. 部署环境更新

- 服务器：`124.221.48.52`
- 域名：`https://stage-gy.lumii-ai.cn`
