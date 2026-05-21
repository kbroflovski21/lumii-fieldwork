# P0+P1 Integration: Processor ↔ Dashboard

**Date:** 2026-05-19
**Status:** Approved
**Deployment target:** 81.68.254.22 (processor:30000, dashboard:3001)

## Overview

Connect the processor (real-time ASR/LLM/TTS pipeline) and dashboard (management platform) into a cohesive product. Currently these services run independently with zero data flow between them.

## P0: Core Data Pipeline

### P0-1: Dashboard Internal API

New route file `server/routes/internal.ts` mounted at `/api/internal/*`.

Auth: `SERVICE_TOKEN` env var, validated via `Authorization: Bearer {token}` header.

**Endpoints:**

`POST /api/internal/service-records`
- Creates transcript record, audio_asset record, and service_record in SQLite
- Request body: sessionId, badgeId, serviceDate, startTime, endTime, durationMinutes, transcript (text/confidence/segments), serviceRecord (summary/confidence/completeness/sopCompliance/healthFindings/anomalies/feedbackText/etc.), isOfflineRevision (bool)
- If isOfflineRevision=true, updates existing record by sessionId instead of creating new
- Returns: { id, created: true/false }

`PATCH /api/internal/smart-badges/:badgeId/status`
- Updates badge status, battery, lastRecordingAt, lastSyncAt
- Request body: { status?, batteryPercent?, lastRecordingAt?, lastSyncAt? }
- Matches badge by device_code or id
- Returns: { updated: true }

### P0-2: Processor API Client

New package `internal/apiclient/client.go` in processor.

Uses `config.APIBaseURL` + `SERVICE_TOKEN` env var.

Methods:
- `PostServiceRecord(data)` — POST to dashboard
- `UpdateBadgeStatus(badgeId, fields)` — PATCH to dashboard

Call sites in `orchestrator.go`:
- OnRecordingStart → UpdateBadgeStatus(in_use)
- processCompleteRecording → PostServiceRecord(initial)
- runOfflineAnalysis → PostServiceRecord(offline revision)
- OnRecordingStop → UpdateBadgeStatus(available, lastRecordingAt=now)

Errors are logged but don't block WebSocket responses.

### P0-3: Dashboard HardwareSimulator Rewrite

Rewrite `src/careworker/HardwareSimulator.tsx` as full React component with:

1. WebSocket to processor (`VITE_PROCESSOR_URL` env var → `ws://{url}/ws/badge`)
2. Microphone capture via AudioWorklet (16kHz PCM streaming)
3. Real-time transcript display with speaker labels (社工/老人)
4. SOP compliance panel (progress bar + checklist + alerts)
5. TTS audio playback queue (CosyVoice MP3 + browser fallback)
6. Service record display after recording stops
7. Offline comparison report display
8. BroadcastChannel events for CareworkerPage BadgeChip linkage

Layout: two-column (left: controls+transcript, right: AI panel+results).

### P0-4: Processor CORS

Add CORS headers to processor's HTTP handler for dashboard frontend cross-origin WebSocket and fetch access.

## P1: Data Loop Completion

### P1-1: Real Data Display

Dashboard's existing QualityPage and service record list already read from service_records table. Once processor writes real data via the internal API, these pages automatically show AI-generated results. No code changes needed for existing read endpoints.

### P1-2: Badge Lifecycle

- Dashboard activates badge → processor references same badge_id in WebSocket sessions
- Processor updates badge status during recording lifecycle via internal API
- Dashboard device management pages reflect real-time badge state

## Files Changed

| Change | Repo | File |
|--------|------|------|
| Internal API routes + SERVICE_TOKEN middleware | dashboard/server | new `routes/internal.ts`, edit `index.ts` |
| API client package | processor | new `internal/apiclient/client.go` |
| Orchestrator writeback calls | processor | edit `internal/event/orchestrator.go` |
| CORS headers | processor | edit `cmd/processor/main.go` |
| Simulator rewrite | dashboard/src | edit `careworker/HardwareSimulator.tsx`, `careworker.css` |
| Env config | dashboard | `.env` with VITE_PROCESSOR_URL, SERVICE_TOKEN |

## What Stays Unchanged

- `useBadge.ts` — continues listening on BroadcastChannel
- CareworkerPage + BadgeChip — no changes
- Agent service — not involved
- Processor demo_page.go — kept as standalone test tool
