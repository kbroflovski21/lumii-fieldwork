# GoldenYears 开发总结（2026-05-22 ~ 2026-05-24）

## 一、本轮完成的核心功能

### 1. SOP → AI 督导配置链路（meta-prompt 系统）

**目标**：Admin 编写 SOP 规范文档后，系统自动生成可直接驱动 AI 的实时督导要求和事后报告要求。

**实现**：
- `server/routes/ai.ts` 中 `buildPrompt()` 函数按 `sopType × docType` 选择 4 套不同的 meta-prompt：

| | general（通用规范） | service（服务项目规范） |
|---|---|---|
| **supervision**（实时督导） | 三类规则提取（前置/结束/违禁）→ TTS 督导 prompt | 流程步骤识别 + 健康安全监控 → 服务流程督导 prompt |
| **report**（事后报告） | 三类规则提取 → 质量评估报告 prompt（JSON 输出） | 流程匹配度 + 预警分析 → 事后分析报告 prompt（JSON 输出） |

- 前端 `SupervisorPage.tsx` 的 `handleGenerate` 传 `sopType` 给 API
- LLM（qwen3-max）max_tokens 提升到 8000

### 2. Processor 多服务 SOP 动态检测（Phase 1）

**目标**：一段录音可以匹配多个 service SOP（如助餐 + 健康监测）。

**改动文件**：`lumii-goldenyears-processor/internal/event/orchestrator.go`

**关键设计**：
- `detectedServices map[string]map[string]bool` 替代一次性 `serviceDetected` 标记
- 每 3 句触发一次检测，LLM 窗口上限 500 字
- LLM prompt 要求 JSON 输出 `{"services": ["助餐服务", "健康监测"]}`（因为 Chat 函数强制 `response_format: json_object`）
- SOP 名称去掉"SOP"后缀后做双向 Contains 匹配
- `serviceProject` 默认值从硬编码 `"探访关爱"` 改为空字符串
- 多服务时 serviceProject 为逗号分隔：`"助餐服务,健康监测"`

### 3. 服务记录分组展示（Phase 2 + 3）

**目标**：服务内容按 SOP 分组显示，一级是 SOP 名称，二级是具体检查项。

**改动文件**：
- `contracts.ts` — 新增 `SopGroup` 类型、`serviceProjects: string[]`、`sopGroups: SopGroup[]`
- `server/routes/serviceRecords.ts` — `buildSopGroups()` 按 `sopName` 分组、`serviceProject` 拆为数组
- `RecordsArea.tsx` — 列表多标签、RecordDrawer 折叠分组、ServiceItemRow 录音证据 + 播放按钮

**关键设计**：
- 默认折叠，点击展开
- 每个 excerpt 有 ▶ 播放按钮，共享 `_clipPlayer` 避免重音
- 兼容旧数据（无 sopGroups 时 fallback 平铺展示）

### 4. Processor 使用 reportContent 作为 LLM system prompt（Phase 4）

**目标**：让 admin 生成的 reportContent 直接驱动最终报告生成。

**改动文件**：`lumii-goldenyears-processor/internal/llm/dashscope.go`

**关键设计**：
- `ProcessRecording` 的 system prompt = `reportContext + outputFormatRequirement`
- `outputFormatRequirement` 是统一的 JSON 输出格式说明（确保 processor 能解析）
- 无 reportContext 时使用 `fallbackSystemPrompt`
- `ServiceItem` 新增 `SopName` 字段

### 5. sopName 自动填充

**目标**：LLM 经常不输出 sopName 字段，需要 processor 端补充。

**改动文件**：`orchestrator.go` 的 `fillSopNames()` 方法

**逻辑**：
- general 项 → 通用规范名称
- 单个 service SOP → 直接赋值
- 多个 service SOP → 用 title/requirementText 匹配 SOP 内容

## 二、修复的 Bug

| Bug | 根因 | 修复 |
|---|---|---|
| 做饭场景标为"探访关爱" | serviceProject 硬编码默认值 + 服务检测一次性 + 名称匹配失败 | Phase 1 全部重写 |
| 服务检测 LLM 调用无响应 | Chat() 强制 json_object 模式，但检测 prompt 要求纯文本 | 改为 JSON prompt |
| 发布按钮提示"未登录" | `handlePublishToggle` 用了原生 `fetch` 而非 `authFetch` | 改为 `authFetch` |
| 对话记录全部显示为"陈阿姨" | speaker 判断只检查 `"social_worker"`，数据里是 `"社工"` | 增加 `"社工"` 匹配 |
| 对话时间显示 NaN:NaN | segment 用 `startMs` 字段（值为 0），前端取 `startSecond` | 兼容两种字段 |
| 录音片段重复播放 | 每次点击创建新 Audio 元素 | 共享 `_clipPlayer` 实例 |
| Tab 切换器撑满全行 | `display: flex` 不限宽 | 改为 `inline-flex` |

## 三、部署信息

### 统一环境：81.68.254.22

**Dashboard**：
- 地址：`http://81.68.254.22:30001/`
- 部署：docker-compose，容器名 `goldenyears-dashboard`
- 部署流程：`git pull → docker compose build --no-cache → docker compose up -d`
- 代码位置：`/opt/src/goldenyears-dashboard/`（git repo）

**Processor**：
- 端口：30000
- 部署：systemd `goldenyears-processor`
- 部署流程：`git pull → go build → 替换二进制 → systemctl restart`
- 代码位置：`/opt/src/goldenyears-processor-src/`（git repo）
- 二进制位置：`/opt/src/goldenyears-processor/processor`

### 账号

| 用户名 | 角色 | 密码 |
|---|---|---|
| admin | org_admin | admin123 |
| operator | site_operator | 140419 |
| supervisor | org_admin | — |
| 13698455015 | careworker | — |
| 13898454671 | careworker | — |

### 服务 Token
- `SERVICE_TOKEN=golden-years-service-token-2026`（internal API 认证）

## 四、测试

- E2E 测试脚本：`tests/e2e-api-tests.sh`
- 运行：`bash tests/e2e-api-tests.sh [BASE_URL]`
- 覆盖：认证、SOP CRUD、多服务录音创建、sopGroups 验证、发布切换、AI 生成、向后兼容

## 五、已知待优化项

1. **服务检测延迟**：检测和实时督导共用 checking 锁，LLM 调用串行，前几次检测可能被跳过。可改为独立 goroutine。
2. **Speaker mapping**：离线 ASR 的说话人识别有时把两人都标为"社工"，需要调优 CompareTranscripts 的 prompt。
3. **sopName 匹配精度**：当多个 service SOP 被检测到时，用文本相似度匹配 sopName 可能不准确。
4. **诊断日志清理**：`service detection check` 等 Info 级日志在生产环境应降为 Debug。

## 六、完整数据流

```
Admin 编写 SOP → 点击"生成" → meta-prompt 转换 → supervisionContent / reportContent → 发布
                                                                    ↓
Processor 录音开始 → FetchSOPs() → 加载已发布的 general SOP → 构建 sopContext/supervisionCtx/reportCtx
                ↓
          每3句 → LLM 服务类型检测（JSON prompt）→ 匹配到的 service SOP 追加加载
                ↓
          实时 → CheckSOP（用 supervisionCtx）→ TTS 提醒
                ↓
        录音结束 → ProcessRecording（reportCtx 作为 system prompt）→ 生成 ServiceRecord
                ↓
          fillSopNames() → 补充每个 item 的 sopName
                ↓
        发送到 Dashboard → autoMatchRecording → 匹配排班 → 创建 ServiceRecord
                ↓
          buildSopGroups() → 按 sopName 分组
                ↓
        前端展示 → 多标签 + 折叠分组 + 录音片段播放
```
