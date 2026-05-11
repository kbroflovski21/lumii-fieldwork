# Fieldwork Product Design Spec

日期：2026-05-11
状态：Approved for documentation
团队阅读版：[`docs/product-design.md`](../../product-design.md)

## 1. Reference Source

This spec explicitly follows and references the original product design link:

<http://124.221.48.52:3002/l/PlnMHgwtWwdW1zq7lAvUU2EQ/>

Anti-drift rule: if future product, design, engineering, test, or delivery discussions conflict with this spec or with `docs/product-design.md`, the team must revisit the source link above and record the decision before changing scope.

This spec was derived from the reference content available on 2026-05-11. The referenced product is “社区居家养老 AI 督导 — H5 MVP 产品设计”, based on 金色年华合作需求.

## 2. Impact Assessment

- Scope: docs
- Surfaces: product, scenario, e2e, security, UX
- Risk: medium
- Reason: the document establishes product behavior, role boundaries, privacy expectations, and future implementation acceptance criteria even though no runtime code changes are made.

Contract docs checked or created:

- Created product/function doc: `docs/product-design.md`
- Created superpowers spec: `docs/superpowers/specs/2026-05-11-fieldwork-product-design.md`
- No existing architecture, scenario, E2E, or implementation-plan docs existed because the cloned repo is empty.

Required design/doc updates:

- Maintain `docs/product-design.md` as the human-readable product contract.
- Maintain this spec as the superpowers process contract.
- Future implementation plans must cite both files and the original reference link.

## 3. Goals

Build an H5 MVP for community home-based elderly care fieldwork supervision.

The MVP must prove the complete three-sided workflow:

- Social worker uses H5 + Bluetooth headset during home service.
- AI supervises the service by voice, follows SOP progress, and flags risks.
- Service completion automatically produces an internal service log and an external family health report.
- Site manager can schedule work, monitor live status, review logs, and talk to a management Agent.
- Family member receives a readable H5 report through Feishu channel, reviews history/trends, and leaves notes for future service.

## 4. Non-Goals

- Do not block MVP on hardware badge availability.
- Do not build a full CRM, billing system, or government reporting platform.
- Do not turn the social worker workflow into a form-heavy data entry tool.
- Do not expose internal quality control, worker performance, raw transcript, or audit notes to family members.
- Do not optimize for minimum AI cost before the full service loop is validated.

## 5. Product Principles

1. Voice-first, near-zero operation during service.
2. Task-driven workflow, not blank tooling.
3. Agent-driven collaboration, not form-driven workflow.
4. Two generated artifacts are the core value: service log for management and health report for family.
5. H5 interaction must map cleanly to future hardware badge interaction.

## 6. Actors And Permissions

| Actor | Permission Level | Entry Point | Allowed Scope |
| --- | --- | --- | --- |
| Social worker | Worker | Worker H5 task list | Own assigned tasks, required elder context, own history |
| Site manager | Manager | Manager H5 dashboard | Own site schedules, workers, elders, logs, statistics |
| Headquarters admin | Admin | Manager H5 dashboard | All sites, templates, cross-site analysis |
| Family member | Family | Report H5 link | Linked elder reports, history, notes |

Privacy boundary:

- Family member can only access a desensitized health report.
- Internal service logs and raw transcripts are management artifacts.
- Photos, audio, health data, and transcripts require access control and audit logging.

## 7. Scenarios

### 7.1 Social Worker Day Flow

The worker opens H5 and sees the ordered task queue. On arrival, the worker starts the task and the system loads elder profile, SOP, history, and family notes. During service, the worker keeps the phone away and receives headset prompts only when SOP steps, omissions, or risks require intervention. At the end, the worker completes the service, optionally adds remarks, and the system generates log/report/debrief before switching to the next task.

### 7.2 Site Manager Day Flow

The manager confirms daily scheduling, monitors service progress in a Kanban view, receives exception alerts, asks the Agent questions about status or performance, reviews logs, and exports data when needed.

### 7.3 Family Report Flow

After service completion, the family member receives a Feishu channel link, opens the H5 report, reads service summary and health indicators, checks changes from the previous visit, reviews history, and leaves notes that become context for the next service.

## 8. Functional Requirements

### 8.1 Worker H5

- Show today's tasks ordered by route.
- Highlight current task and collapse completed tasks.
- Confirm arrival and load elder/SOP/history context.
- Stream audio through WebSocket.
- Display service timer, recording state, SOP progress, latest AI prompt, and waveform.
- Provide photo capture, manual exception mark, and complete-service actions.
- Generate service summary preview and accept worker remarks.
- Archive service and move to the next task.

### 8.2 Manager H5

- Create, adjust, and confirm daily schedules.
- Support Agent-assisted schedule suggestions.
- Show Kanban task states: pending, en route, in service, completed, exception.
- Highlight AI-detected exceptions.
- Support natural-language Agent queries for exceptions, quality, performance, elder health, and scheduling.
- Manage SOP templates, sites, workers, elders, family members, and devices.
- Browse and export service logs.
- Show service volume, SOP completion, exception rate, worker efficiency, and elder health summaries.

### 8.3 Family H5

- Show service report after push notification.
- Show elder, service time, service type, worker, summary, indicators, attention items, and comparison with previous visit.
- Show historical timeline and trend charts.
- Support family notes linked to the elder profile.
- Use larger readable typography and mobile-first layout.

## 9. Agent Requirements

### 9.1 Supervisor Agent

Context:

- Elder profile
- SOP template
- Real-time transcript
- Historical service records
- Family notes
- Current task state

Behavior:

- Use SOP state machine as the backbone.
- Intervene only on SOP milestones, omissions, exceptions, or safety risks.
- Detect health, emotion, safety, and overtime risks.
- Speak professionally and briefly through headset.

Outputs:

- Voice prompt
- On-screen latest prompt
- SOP state update
- Exception mark
- Post-service debrief

### 9.2 Management And Scheduling Agent

Context:

- Site data
- Worker profiles and capacity
- Elder service frequency and location
- Historical schedules
- Exceptions and statistics

Behavior:

- Answer operational questions in natural language.
- Generate schedule suggestions for manager confirmation.
- Consider route optimization, service frequency, worker fit, exception priority, and substitutions.
- Push alerts for overtime, exceptions, completion-rate drop, and scheduling conflicts.

### 9.3 Insight Agent

Inputs:

- Full transcript
- SOP completion
- Photos
- Elder history
- Worker notes
- Family notes

Outputs:

- Internal service log
- Desensitized family health report
- Worker debrief

## 10. Architecture Boundaries

The MVP architecture should keep the product portable from H5 to future hardware badge:

```text
Worker H5 / Manager H5 / Family H5
        |
HTTPS / WebSocket
        |
API Gateway: auth, routing, rate limit
        |
Backend services
- Voice pipeline: ASR -> LLM -> TTS
- Agent engine: supervisor, management/scheduling, insight
- Business services: scheduling, management, Feishu push, export
        |
Data layer: PostgreSQL + Redis + OSS
        |
AI provider abstraction: ASR / LLM / TTS
```

Reference-aligned provider direction:

- Primary: Alibaba Cloud Bailian stack with Paraformer, Qwen, and CosyVoice.
- Alternatives: Volcano stack or Tencent ASR plus GLM.
- Requirement: ASR, LLM, and TTS must go through internal provider abstraction.

## 11. Data Model

Core entities:

- Site
- Worker
- Elder
- Family
- SOPTemplate
- Schedule
- Session
- Transcript
- Recording
- ServiceLog
- HealthReport
- FamilyNote

`ServiceLog` and `HealthReport` must be distinct entities. They can share a source session, but they serve different audiences and have different privacy constraints.

`Recording` is in MVP scope. Service audio is stored in OSS for traceability, quality review, and dispute handling. The implementation plan must define retention period, access audit, and deletion policy.

## 12. Scenario-To-Test-Case Design

These are test-case designs, not implemented tests.

| Scenario | Actor | Given | When | Then User-Visible Result | Side Effect | Forbidden Output / Leak Check | Runner Layer | Suite |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Worker completes service | Worker | Assigned task with elder profile and SOP | Worker starts and completes service | Worker sees debrief and next task | Session archived, log/report queued | No unrelated elder data shown | local | smoke |
| AI flags missing SOP step | Worker | Active service transcript missing required medication check | Transcript reaches reminder threshold | Worker hears concise headset prompt | SOP step remains pending until confirmed | Prompt must not expose internal scoring | replay | full |
| Manager monitors exception | Manager | Active service has AI exception mark | Manager opens Kanban | Exception card is highlighted with summary | Audit read event recorded | No family report text shown as internal evidence | integration | smoke |
| Manager asks scheduling Agent | Manager | Tomorrow has elders, workers, locations, frequencies | Manager asks for schedule | Agent returns proposed schedule with reasons | No schedule changes until manager confirms | No cross-site data unless admin | integration | full |
| Family opens report | Family | Completed service report exists for linked elder | Family opens pushed H5 link | Family sees summary, indicators, trends | Report read event recorded | No raw transcript, QC score, worker performance, or internal notes | local | smoke |
| Unauthorized report access | Anonymous or wrong family | Report token absent or unrelated | User opens report URL | Access denied or safe error | No data mutation | No elder name, health data, transcript, or photo leaked | integration | non-regression |

E2E impact:

- Future implementation must include at least one local end-to-end smoke path for worker service completion through report generation.
- Family report privacy needs explicit negative/non-regression coverage.
- Voice prompt timing can start as replay tests using saved transcript events before live ASR/TTS canary.

## 13. Acceptance Criteria

Worker:

- Worker can execute the full task flow from task list to service archive.
- AI can provide SOP reminders from transcript context.
- Service completion produces log/report/debrief.

Manager:

- Manager can schedule, monitor, query Agent, review logs, and export.
- Exceptions are visible in real time.
- Agent suggestions require manager confirmation before schedule mutation.

Family:

- Family can open report, read summary/indicators/trends, and leave notes.
- Family report is desensitized and cannot expose internal artifacts.

Security:

- Role-based access control prevents cross-role and cross-site access.
- Sensitive asset access is audited.
- Report links do not leak data when invalid or unauthorized.

## 14. Confirmed MVP Decisions

1. Scheduling system: assume 金色年华 has no existing scheduling system for MVP. Build scheduling in this product first; if an existing system is later discovered, treat integration as a separate change.
2. Push channel: use Feishu channel for MVP push delivery and internal alerts.
3. Service audio: store recordings in OSS, not transient-only processing.
4. SOP templates: MVP must include 探访关爱 and 助浴 first; additional templates can be ranked during implementation planning.
5. Frontend stack: use React by default for the implementation plan unless a future repo baseline establishes a different stack before planning begins.

## 15. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| ASR errors from dialects, noise, or multiple speakers | SOP tracking and exception detection may be inaccurate | Use hotwords, speaker separation, confidence thresholds, and worker remarks as fallback |
| AI interrupts too often | Worker service experience declines | Keep prompts limited to SOP milestones, omissions, exceptions, and safety risks |
| Family report leaks internal information | Privacy and trust risk | Keep ServiceLog and HealthReport separate; enforce desensitization and negative tests |
| H5 background audio limitations | Real-time supervision may stop during service | Require foreground service mode for MVP and preserve the path to future hardware badge |
| Manager distrusts auto-scheduling | Low adoption | Agent must provide reasons and require manager confirmation before schedule mutation |

## 16. Approval And Next Step

User selected the dual-document approach:

- Superpowers spec for process compliance.
- Product design document for team reading.

After this spec is reviewed and committed, the next superpowers step is to invoke `superpowers:writing-plans` before any implementation work.
