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

This is a field-deployable MVP, not a demo prototype. The design must support site initialization, SOP authoring/debugging, scheduling, worker assignment, home service execution, AI supervision, log/report generation, manager review, and family delivery as one production-like loop.

The MVP must prove the complete three-sided workflow:

- Social worker uses H5 + Bluetooth headset during home service.
- AI supervises the service by voice, follows SOP progress, and flags risks.
- Service completion automatically produces an internal service log and an external family health report.
- Site manager works through proactive Agents that propose schedules, surface exceptions, support SOP debugging, and drive report review.
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
3. Agent-first cockpit, not dashboard-first workflow.
4. Two generated artifacts are the core value: service log for management and health report for family.
5. H5 interaction must map cleanly to future hardware badge interaction.

## 6. Actors And Permissions

| Actor | Permission Level | Entry Point | Allowed Scope |
| --- | --- | --- | --- |
| Social worker | Worker | Worker H5 task list | Own assigned tasks, required elder context, own history |
| Site manager | Manager | Manager H5 cockpit | Own site schedules, workers, elders, logs, statistics |
| Headquarters admin | Admin | Manager H5 cockpit | All sites, templates, cross-site analysis |
| SOP operator | Manager | Manager H5 SOP console | Service templates, required checks, AI prompt wording, debug runs |
| Family member | Family | Report H5 link | Linked elder reports, history, notes |

Privacy boundary:

- Family member can only access a desensitized health report.
- Internal service logs and raw transcripts are management artifacts.
- Photos, audio, health data, and transcripts require access control and audit logging.

Field deployment responsibilities:

- Headquarters admin initializes organization, sites, global permissions, and baseline templates.
- Site manager configures workers, elders, families, devices, Feishu identities, and daily schedules.
- Service Supervision Agent supports SOP creation/debug before field use and uses the same SOP contract during live service.
- Worker receives assigned home-service tasks and completes service through the Worker H5 flow.
- Family member receives the generated health report and leaves notes for future service.
- AI Agents supervise service, assist scheduling, and generate internal/external artifacts.

## 7. Scenarios

### 7.1 Social Worker Day Flow

The worker opens H5 and sees the ordered task queue. On arrival, the worker starts the task and the system loads elder profile, SOP, history, and family notes. During service, the worker keeps the phone away and receives headset prompts only when SOP steps, omissions, or risks require intervention. At the end, the worker completes the service, optionally adds remarks, and the system generates log/report/debrief before switching to the next task.

### 7.2 Site Initialization And SOP Debug Flow

An admin or site manager starts from an empty site, creates the site, workers, elders, family members, devices, and Feishu delivery identities. Through the Service Supervision Agent, the SOP operator creates 探访关爱 and 助浴 templates, configures required steps, required questions, AI prompt wording, expected duration, and exception triggers. Before field use, the same Agent runs a simulated conversation to verify that AI reminders, SOP progress, and log/report fields are generated correctly.

### 7.3 Site Manager Day Flow

The Scheduling Agent proactively sends a schedule draft before the manager asks. The manager confirms or adjusts the draft in a Feishu card or web scheduling panel. During service, the manager mostly responds to proactive Agent alerts for exceptions, overtime, missing evidence, and reassignment. At day end, the Report QA Agent sends review cards for ServiceLogs and HealthReports.

### 7.4 Family Report Flow

After service completion, the family member receives a Feishu channel link, opens the H5 report, reads service summary and health indicators, checks changes from the previous visit, reviews history, and leaves notes that become context for the next service.

## 8. Functional Requirements

Implementation must be Agent-first and result-panel driven. This product is an agentic service: Agents are the primary interaction model, and web panels/dashboards are contextual surfaces for structured state, evidence, parameters, and confirmations. Feishu cannot show full dashboards, so the same Agent work must be represented as messages, interactive cards, summaries, confirm buttons, and deep links into web panels.

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

- Initialize site, roles, permissions, workers, elders, family members, devices, and Feishu identities.
- Let the Scheduling Agent proactively create daily schedule drafts and assignment proposals.
- Confirm, adjust, or reject schedule drafts before any production schedule mutation.
- Show operational task states: pending, en route, in service, completed, exception.
- Highlight AI-detected exceptions.
- Support natural-language Agent queries for exceptions, quality, performance, elder health, scheduling, and report state.
- Manage the minimum required sites, workers, elders, family members, devices, and Feishu identities needed by Agents.
- Use the Service Supervision Agent to create/debug SOP templates with simulated elder profiles and conversations before field use.
- Browse and export service logs.
- Show service volume, SOP completion, exception rate, worker efficiency, and elder health summaries.

### 8.3 Family H5

- Show service report after push notification.
- Show elder, service time, service type, worker, summary, indicators, attention items, and comparison with previous visit.
- Show historical timeline and trend charts.
- Support family notes linked to the elder profile.
- Use larger readable typography and mobile-first layout.

## 9. Agent-First Cockpit And Result Panels

### 9.1 Interaction Contract

- Web: Agent chat can float over or dock beside operations, scheduling, SOP, service detail, and report panels.
- Feishu: Agent work appears as natural-language messages plus interactive cards because full panels are not visible in chat.
- Natural language can query, analyze, draft, and explain.
- Consequential actions require explicit card or panel confirmation: schedule publish, reassignment, SOP publish, log approval, report send, and archive.

### 9.2 Agent Roles

- Scheduling Agent: proactively monitors service demand, elder frequency, worker availability, worker skills, route constraints, historical exceptions, absences, overtime, and urgent inserts; drafts schedules, assigns workers, replans, and posts Feishu/web confirmation cards.
- Service Supervision Agent: owns SOP authoring, SOP debugging, SOP version publishing, live service supervision, headset reminders, evidence capture, exception marking, and service debrief. SOP and supervision are one Agent responsibility because SOP is the runtime contract for supervision.
- Report QA Agent: creates ServiceLog and HealthReport from transcript, SOP state, evidence, notes, and history; flags missing evidence; runs desensitization; posts manager review cards; sends family-facing Feishu delivery cards after approval.
- Family communication is a Report QA Agent mode in MVP, not a separate Agent. It handles report delivery, family notes, and next-service context.

Users are permission contexts and audiences, not the basis for Agent decomposition. A site manager can interact with all three Agents; a worker mostly interacts with the Service Supervision Agent; a family member only receives Report QA Agent outputs.

### 9.3 Control Panels

- Operations panel: today's overview, waiting confirmations, exceptions, overtime, pending review, activity log, and Agent recommended actions. This should follow the product shape of the dashboard repo `/agent` page at <http://124.221.48.52:3000/agent>: chat as the main operational layer, with right-side/state panels as live context.
- Scheduling panel: schedule draft, route, assignment cards, conflicts, recommended workers, confirm/adjust/publish actions.
- SOP and supervision panel: SOP steps, prompt wording, expected duration, simulated debug transcript, publish version; during service, it shows SOP progress, transcript summary, evidence, exceptions, and current reminder.
- Report panel: ServiceLog, HealthReport preview, missing evidence, desensitization status, manager review, Feishu delivery state, retry.
- Field setup panel: only site, worker, elder, family, device, Feishu identity, and service-frequency data required for Agent operation.

### 9.4 Worker H5 Screens

- Today's tasks: ordered route, elder, address, service type, expected duration, previous exception.
- Active service: elder, service type, timer, recording state, SOP progress, latest AI prompt, photo, exception mark, complete action.
- Service complete: debrief, AI summary, worker remark, next stop.

Worker H5 must avoid complex chat. In-field AI interaction is mainly through headset prompts.

### 9.5 Family Report H5 Screens

- Single-service report: summary, indicators, attention items, comparison with previous visit, worker information.
- History and trends: timeline plus key health metric charts.
- Family note: simple note input that becomes future service context.

## 10. Agent Requirements

### 10.1 Scheduling Agent

Context:

- Site service demand
- Elder frequency, location, service type, and historical exceptions
- Worker availability, skills, workload, and route position
- Current task state, absences, overtime, urgent inserts
- Historical schedule quality and completion data

Behavior:

- Proactively detect unassigned demand, conflicts, unreasonable routes, overtime risk, and substitution needs.
- Generate schedule drafts with assignment reasons and route order before the manager asks.
- Replan when absences, overtime, urgent inserts, or service interruptions happen.
- Require manager confirmation before publish, reassignment, cancellation, or other production schedule mutation.

Outputs:

- Schedule draft card
- Assignment and route rationale
- Conflict, overtime, and reassignment alerts
- Publish confirmation card
- Worker task queue update after confirmation

### 10.2 Service Supervision Agent

Context:

- Elder profile
- SOP template
- Real-time transcript
- Historical service records
- Family notes
- Current task state
- SOP debug transcript and published SOP version

Behavior:

- Support SOP authoring, debug, version publishing, and rollback before field use.
- Run simulated conversations to test reminder timing, missing checks, false positives, and log/report field extraction.
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
- SOP debug report and publish recommendation

### 10.3 Report QA Agent

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
- Missing evidence alert
- Manager review card
- Feishu delivery status and retry suggestion

## 11. Architecture Boundaries

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
- Agent engine: scheduling, service supervision, report QA
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

## 12. Data Model

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

## 13. Scenario-To-Test-Case Design

These are test-case designs, not implemented tests.

| Scenario | Actor | Given | When | Then User-Visible Result | Side Effect | Forbidden Output / Leak Check | Runner Layer | Suite |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Worker completes service | Worker | Assigned task with elder profile and SOP | Worker starts and completes service | Worker sees debrief and next task | Session archived, log/report queued | No unrelated elder data shown | local | smoke |
| Admin initializes site | Admin | Empty site | Admin creates site, roles, workers, elders, families, devices, and Feishu identities | Manager cockpit shows deployable site data | Site configuration persisted | Worker cannot see other workers' assigned elders | local | smoke |
| Service Supervision Agent debugs SOP template | SOP operator | Unpublished 探访关爱 template and simulated elder profile | Operator runs simulated conversation through the Service Supervision Agent | SOP progress, AI reminders, and log fields are visible | Template version saved or rejected | Family-facing report must not expose debug transcript | replay | full |
| Scheduling Agent proactively drafts assignments | Manager | Tomorrow has schedulable workers, elders, locations, and service frequencies | Scheduling Agent detects unassigned demand | Manager receives schedule draft card with reasons | No schedule records created until confirmation | No schedule mutation before manager confirmation | integration | smoke |
| Manager confirms proactive schedule | Manager | Scheduling Agent has produced a draft | Manager confirms in Feishu card or web scheduling panel | Worker task queue receives ordered tasks | Schedule records created | No cross-site worker or elder data shown | integration | smoke |
| Manager uses floating Agent over panel | Manager | Operations panel has live service data | Manager asks Agent for exceptions | Agent returns answer with linked cards and panel context | No mutation unless manager clicks card/panel action | No cross-site data unless admin | integration | smoke |
| Feishu scheduling Agent sends draft | Manager | Tomorrow has schedulable workers and elders | Agent posts Feishu schedule card | Manager can confirm or open scheduling panel | Schedule only persists after confirmation | No schedule mutation from plain text alone | integration | full |
| AI flags missing SOP step | Worker | Active service transcript missing required medication check | Transcript reaches reminder threshold | Worker hears concise headset prompt | SOP step remains pending until confirmed | Prompt must not expose internal scoring | replay | full |
| Manager monitors exception | Manager | Active service has AI exception mark | Manager opens operations panel | Exception card is highlighted with summary | Audit read event recorded | No family report text shown as internal evidence | integration | smoke |
| Scheduling Agent replans after absence | Manager | A worker is absent and assigned tasks remain | Scheduling Agent detects the gap | Manager receives reassignment proposal | Schedule changes only after confirmation | No silent reassignment | integration | full |
| Report QA Agent flags missing evidence | Manager | Completed service lacks required photo or note | Agent generates ServiceLog and HealthReport draft | Manager sees missing evidence card before approval | Report remains unsent | Family report must not include internal missing-evidence wording | integration | full |
| Family opens report | Family | Completed service report exists for linked elder | Family opens pushed H5 link | Family sees summary, indicators, trends | Report read event recorded | No raw transcript, QC score, worker performance, or internal notes | local | smoke |
| Unauthorized report access | Anonymous or wrong family | Report token absent or unrelated | User opens report URL | Access denied or safe error | No data mutation | No elder name, health data, transcript, or photo leaked | integration | non-regression |

E2E impact:

- Future implementation must include at least one local end-to-end smoke path for worker service completion through report generation.
- Future implementation must include a field-deploy smoke path from empty-site setup through SOP debug, scheduling, worker service, report generation, manager review, and Feishu delivery.
- Family report privacy needs explicit negative/non-regression coverage.
- Voice prompt timing can start as replay tests using saved transcript events before live ASR/TTS canary.

## 14. Acceptance Criteria

Worker:

- Worker can execute the full task flow from task list to service archive.
- AI can provide SOP reminders from transcript context.
- Service completion produces log/report/debrief.

Manager:

- Admin or site manager can initialize a deployable site with roles, workers, elders, families, devices, and Feishu identities.
- Service Supervision Agent can create and debug 探访关爱 and 助浴 templates before field use.
- Scheduling Agent can proactively generate assignment drafts and replans; manager confirmation is required before schedule mutation.
- Manager can monitor operations through floating/docked Agent chat plus contextual panels, review logs, and export.
- Manager can use Feishu chat Agent for questions and cards, while final schedule confirmation, SOP publishing, log approval, and report send happen through explicit card or panel actions.
- Exceptions are visible in real time.
- Agent suggestions require manager confirmation before schedule mutation.

Family:

- Family can open report, read summary/indicators/trends, and leave notes.
- Family report is desensitized and cannot expose internal artifacts.

Security:

- Role-based access control prevents cross-role and cross-site access.
- Sensitive asset access is audited.
- Report links do not leak data when invalid or unauthorized.

Field deployment:

- A fresh site can be configured from zero and used for one complete service loop.
- A manager can assign a real task to a worker and the worker can receive it in route order.
- The system can produce ServiceLog, HealthReport, worker debrief, manager review state, and Feishu report delivery from one completed service.

## 15. Confirmed MVP Decisions

1. Scheduling system: assume 金色年华 has no existing scheduling system for MVP. Build scheduling in this product first; if an existing system is later discovered, treat integration as a separate change.
2. Push channel: use Feishu channel for MVP push delivery and internal alerts.
3. Service audio: store recordings in OSS, not transient-only processing.
4. SOP templates: MVP must include 探访关爱 and 助浴 first; additional templates can be ranked during implementation planning.
5. Frontend stack: use React by default for the implementation plan unless a future repo baseline establishes a different stack before planning begins.

## 16. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| ASR errors from dialects, noise, or multiple speakers | SOP tracking and exception detection may be inaccurate | Use hotwords, speaker separation, confidence thresholds, and worker remarks as fallback |
| AI interrupts too often | Worker service experience declines | Keep prompts limited to SOP milestones, omissions, exceptions, and safety risks |
| Family report leaks internal information | Privacy and trust risk | Keep ServiceLog and HealthReport separate; enforce desensitization and negative tests |
| H5 background audio limitations | Real-time supervision may stop during service | Require foreground service mode for MVP and preserve the path to future hardware badge |
| Manager distrusts auto-scheduling | Low adoption | Agent must provide reasons and require manager confirmation before schedule mutation |

## 17. Approval And Next Step

User selected the dual-document approach:

- Superpowers spec for process compliance.
- Product design document for team reading.

After this spec is reviewed and committed, the next superpowers step is to invoke `superpowers:writing-plans` before any implementation work.
