# Phase 2: Recording独立模型 + 自动关联 + 多段聚合

> **For agentic workers:** Use superpowers:subagent-driven-development to implement.

**Goal:** 护工不再需要先选任务，直接按工牌录音。录音结束后AI自动匹配到服务，匹配不到挂在工牌上待站长确认。多段录音可以聚合到一个服务。

**Architecture:** 新增Recording模型（独立于ServiceRecord），Processor完成录音后先创建Recording，然后异步自动匹配。匹配逻辑：时间窗口 + 人名 + 服务类型。ServiceRecord由匹配成功的Recording(s)聚合生成。

---

## 改动清单

### 1. Prisma Schema — 新增Recording模型

```prisma
enum RecordingStatus {
  processing       // processor正在处理
  pending_match     // 等待匹配
  matched           // 已匹配到服务
  unmatched         // 未匹配，待人工确认
}

model Recording {
  id                String          @id @db.VarChar(64)
  sessionId         String          @map("session_id") @db.VarChar(128)
  badgeId           String          @map("badge_id") @db.VarChar(64)
  workerId          String?         @map("worker_id") @db.VarChar(64)
  workerName        String?         @map("worker_name") @db.VarChar(255)
  siteId            String          @default("site-001") @map("site_id") @db.VarChar(64)
  startedAt         DateTime        @map("started_at")
  endedAt           DateTime?       @map("ended_at")
  durationSeconds   Int             @default(0) @map("duration_seconds")
  transcriptText    String?         @map("transcript_text") @db.Text
  transcriptSegments Json           @default("[]") @map("transcript_segments")
  transcriptConfidence Float?       @map("transcript_confidence")
  audioUrl          String?         @map("audio_url") @db.VarChar(500)
  sopResults        Json?           @map("sop_results")     // AI分析结果
  aiSummary         String?         @map("ai_summary") @db.Text
  status            RecordingStatus @default(processing)
  matchConfidence   Float?          @map("match_confidence")
  matchedServiceRecordId String?    @map("matched_service_record_id") @db.VarChar(64)
  matchedScheduleId String?         @map("matched_schedule_id") @db.VarChar(64)
  matchedServiceObjectId String?    @map("matched_service_object_id") @db.VarChar(64)
  matchedServiceObjectName String?  @map("matched_service_object_name") @db.VarChar(255)
  matchReason       String?         @map("match_reason") @db.Text
  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @default(now()) @updatedAt @map("updated_at")

  @@map("recordings")
}
```

### 2. Dashboard API — Recording端点

新建 `server/routes/recordings.ts`:

- `POST /api/internal/recordings` — Processor创建录音记录
- `GET /api/recordings` — 列表（支持按badgeId/workerId/status筛选）
- `PATCH /api/recordings/:id/match` — 站长手动匹配到服务
- `POST /api/internal/recordings/:id/auto-match` — 自动匹配逻辑

自动匹配逻辑:
1. 查该worker今天的所有scheduled任务
2. 匹配条件:
   - 时间窗口: 录音时间在任务时间前后1小时内
   - 人名: transcript里出现了serviceObjectName
   - 服务类型: transcript里出现了serviceProject关键字
3. 打分: 时间匹配+0.4, 人名匹配+0.3, 服务类型匹配+0.3
4. 分数>=0.5 → matched, 关联到该schedule
5. 分数<0.5 → unmatched, 等站长确认

### 3. Processor改动

- processCompleteRecording: 改为调 `POST /api/internal/recordings`（创建Recording），不再直接创建ServiceRecord
- 录音数据发完后，触发 `POST /api/internal/recordings/:id/auto-match`
- 离线分析完成后，更新Recording的transcript和sopResults

### 4. Dashboard前端 — 录音列表

在站点运营页面新增"录音管理"tab或在服务记录页面旁边展示:
- 录音列表: 显示所有录音，按状态分组（待匹配/已匹配/未匹配）
- 已匹配的显示关联的服务和老人
- 未匹配的显示"手动匹配"按钮，点击弹出schedule选择器
- 匹配成功后自动创建/更新ServiceRecord

### 5. CareworkerPage改动

- "开始服务"按钮 → 改为直接进模拟器（不需要先选任务）
- 任务列表保留但变成参考（告诉护工今天有哪些任务要做）
- 模拟器不再需要scheduleId参数
