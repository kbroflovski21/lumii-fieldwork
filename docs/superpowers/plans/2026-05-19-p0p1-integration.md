# P0+P1 Integration: Processor ↔ Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the processor (real-time ASR/LLM/TTS) and dashboard (management platform) so service records flow from badge recordings through AI processing into persistent storage viewable by all roles.

**Architecture:** Processor calls Dashboard's new internal REST API to persist service records and update badge status after processing. Dashboard's HardwareSimulator is rewritten to connect directly to Processor's WebSocket for real-time audio streaming/transcript/AI feedback, while maintaining BroadcastChannel linkage to CareworkerPage. Auth between services uses a shared SERVICE_TOKEN.

**Tech Stack:** TypeScript/Express/SQLite (dashboard), Go (processor), React 19 (frontend), WebSocket, AudioWorklet API

---

## File Map

### Dashboard Server (lumii-goldenyears-dashboard/server/)

| File | Action | Responsibility |
|------|--------|----------------|
| `server/routes/internal.ts` | CREATE | Internal API endpoints: POST service-records, PATCH badge status |
| `server/middleware/serviceAuth.ts` | CREATE | SERVICE_TOKEN validation middleware |
| `server/index.ts` | MODIFY (lines 21-73) | Mount internal routes with service auth |

### Processor (lumii-goldenyears-processor/)

| File | Action | Responsibility |
|------|--------|----------------|
| `internal/apiclient/client.go` | CREATE | HTTP client for Dashboard API calls |
| `internal/config/config.go` | MODIFY (lines 10-46) | Add ServiceToken config field |
| `internal/event/orchestrator.go` | MODIFY (lines 28-74, 92, 146, 434-498, 552-659) | Add apiclient field, call API at recording start/stop/report |
| `cmd/processor/main.go` | MODIFY (lines 38-73) | Add CORS middleware, pass apiclient to orchestrator |

### Dashboard Frontend (lumii-goldenyears-dashboard/src/)

| File | Action | Responsibility |
|------|--------|----------------|
| `src/careworker/HardwareSimulator.tsx` | REWRITE | Full simulator: WebSocket + audio + transcript + SOP + TTS + BroadcastChannel |
| `src/careworker/careworker.css` | MODIFY (lines 1040-1184) | Replace old hw-* styles with new simulator layout |

---

## Task 1: Dashboard SERVICE_TOKEN Middleware

**Files:**
- Create: `server/middleware/serviceAuth.ts`

- [ ] **Step 1: Create serviceAuth middleware**

```typescript
// server/middleware/serviceAuth.ts
import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";

export function requireServiceToken() {
  const token = process.env.SERVICE_TOKEN ?? "dev-service-token";
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "missing service token" });
      return;
    }
    const provided = authHeader.slice(7);
    const expected = token;
    if (provided.length !== expected.length ||
        !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
      res.status(403).json({ error: "invalid service token" });
      return;
    }
    next();
  };
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /opt/nursing-home-workspace/lumii-goldenyears-dashboard && npx tsx --eval "import './server/middleware/serviceAuth.ts'"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/middleware/serviceAuth.ts
git commit -m "feat: add SERVICE_TOKEN auth middleware for internal API"
```

---

## Task 2: Dashboard Internal API Routes

**Files:**
- Create: `server/routes/internal.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Create internal routes file**

```typescript
// server/routes/internal.ts
import { Router } from "express";
import { randomUUID } from "crypto";
import { getDb } from "../db/init";

function genId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function internalRoutes() {
  const r = Router();

  // POST /api/internal/service-records
  // Called by processor after generating a service record
  r.post("/internal/service-records", (req, res) => {
    const db = getDb();
    const b = req.body;

    const sessionId = b.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId required" });
      return;
    }

    // Check if this is an offline revision of an existing record
    if (b.isOfflineRevision) {
      const existing = db.prepare(
        "SELECT id FROM service_records WHERE id = ? OR structured_summary LIKE ?"
      ).get(sessionId, `%${sessionId}%`) as any;

      if (existing) {
        // Update transcript if provided
        if (b.transcript) {
          const existingRecord = db.prepare(
            "SELECT transcript_id FROM service_records WHERE id = ?"
          ).get(existing.id) as any;
          if (existingRecord?.transcript_id) {
            db.prepare(
              "UPDATE transcripts SET text = ?, confidence = ?, segments = ?, record_id = ? WHERE id = ?"
            ).run(
              b.transcript.text ?? "",
              b.transcript.confidence ?? null,
              JSON.stringify(b.transcript.segments ?? []),
              existing.id,
              existingRecord.transcript_id
            );
          }
        }

        // Update the service record with offline-revised data
        const sr = b.serviceRecord ?? {};
        db.prepare(`UPDATE service_records SET
          generated_summary = ?,
          structured_summary = ?,
          assignment_confidence = ?,
          service_exceptions = ?,
          updated_at = datetime('now')
          WHERE id = ?`
        ).run(
          sr.summary ?? null,
          JSON.stringify({ ...sr, sessionId, offlineRevision: true }),
          sr.confidence ?? 0.5,
          JSON.stringify(sr.anomalies ?? []),
          existing.id
        );

        res.json({ id: existing.id, created: false, updated: true });
        return;
      }
    }

    // Create new records
    const recordId = genId("rec");
    const transcriptId = b.transcript ? genId("tx") : null;
    const audioAssetId = b.audioUrl ? genId("aud") : null;

    // Insert transcript
    if (transcriptId && b.transcript) {
      db.prepare(
        "INSERT INTO transcripts (id, record_id, language, text, confidence, segments) VALUES (?, ?, 'zh-CN', ?, ?, ?)"
      ).run(
        transcriptId,
        recordId,
        b.transcript.text ?? "",
        b.transcript.confidence ?? null,
        JSON.stringify(b.transcript.segments ?? [])
      );
    }

    // Insert audio asset
    if (audioAssetId && b.audioUrl) {
      db.prepare(
        "INSERT INTO audio_assets (id, record_id, playback_url, duration_seconds, captured_by_badge_id, uploaded_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
      ).run(
        audioAssetId,
        recordId,
        b.audioUrl,
        b.durationMinutes ? b.durationMinutes * 60 : 0,
        b.badgeId ?? ""
      );
    }

    // Insert service record
    const sr = b.serviceRecord ?? {};
    db.prepare(`INSERT INTO service_records (
      id, service_date, start_time, end_time, duration_minutes,
      badge_id, smart_badge_id, service_project,
      assignment_confidence, review_status,
      transcript_id, audio_asset_id,
      generated_summary, structured_summary,
      service_exceptions, service_items
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_review', ?, ?, ?, ?, ?, ?)`
    ).run(
      recordId,
      b.serviceDate ?? new Date().toISOString().slice(0, 10),
      b.startTime ?? "",
      b.endTime ?? "",
      b.durationMinutes ?? 0,
      b.badgeId ?? "",
      b.badgeId ?? null,
      b.serviceProject ?? sr.service_project ?? "",
      sr.confidence ?? 0.5,
      transcriptId,
      audioAssetId,
      sr.summary ?? "",
      JSON.stringify({ ...sr, sessionId }),
      JSON.stringify(sr.anomalies ?? []),
      JSON.stringify(sr.service_items ?? [])
    );

    // Update badge's recent service record list
    if (b.badgeId) {
      const badge = db.prepare(
        "SELECT id, recent_service_record_ids FROM smart_badges WHERE device_code = ? OR id = ?"
      ).get(b.badgeId, b.badgeId) as any;
      if (badge) {
        let ids: string[] = [];
        try { ids = JSON.parse(badge.recent_service_record_ids || "[]"); } catch {}
        ids.unshift(recordId);
        if (ids.length > 10) ids = ids.slice(0, 10);
        db.prepare(
          "UPDATE smart_badges SET recent_service_record_ids = ?, last_recording_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
        ).run(JSON.stringify(ids), badge.id);
      }
    }

    res.json({ id: recordId, created: true });
  });

  // PATCH /api/internal/smart-badges/:badgeId/status
  // Called by processor to update badge status during recording lifecycle
  r.patch("/internal/smart-badges/:badgeId/status", (req, res) => {
    const db = getDb();
    const badgeId = req.params.badgeId;
    const b = req.body;

    const badge = db.prepare(
      "SELECT id FROM smart_badges WHERE device_code = ? OR id = ?"
    ).get(badgeId, badgeId) as any;

    if (!badge) {
      // Auto-create badge if it doesn't exist (demo mode)
      const newId = genId("badge");
      db.prepare(
        "INSERT INTO smart_badges (id, device_code, status, battery_percent, activated_at, last_sync_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
      ).run(newId, badgeId, b.status ?? "available", b.batteryPercent ?? 100);
      res.json({ updated: true, created: true, id: newId });
      return;
    }

    const sets: string[] = ["updated_at = datetime('now')"];
    const vals: any[] = [];

    if (b.status !== undefined) { sets.push("status = ?"); vals.push(b.status); }
    if (b.batteryPercent !== undefined) { sets.push("battery_percent = ?"); vals.push(b.batteryPercent); }
    if (b.lastRecordingAt !== undefined) { sets.push("last_recording_at = ?"); vals.push(b.lastRecordingAt); }
    if (b.lastSyncAt !== undefined) { sets.push("last_sync_at = ?"); vals.push(b.lastSyncAt); }

    vals.push(badge.id);
    db.prepare(`UPDATE smart_badges SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

    res.json({ updated: true });
  });

  return r;
}
```

- [ ] **Step 2: Mount internal routes in server/index.ts**

Add import at top of `server/index.ts` (after line 22):
```typescript
import { internalRoutes } from "./routes/internal";
import { requireServiceToken } from "./middleware/serviceAuth";
```

Add route mounting after the health check endpoint (after line 76):
```typescript
// Internal API (processor → dashboard, requires SERVICE_TOKEN)
const serviceAuth = requireServiceToken();
app.use("/api", serviceAuth, internalRoutes());
```

- [ ] **Step 3: Verify server starts**

Run: `cd /opt/nursing-home-workspace/lumii-goldenyears-dashboard && timeout 5 npx tsx server/index.ts 2>&1 || true`
Expected: Server starts without import errors (will exit on timeout, that's fine)

- [ ] **Step 4: Commit**

```bash
git add server/routes/internal.ts server/index.ts
git commit -m "feat: add internal API for processor service record writeback"
```

---

## Task 3: Processor Config — Add ServiceToken

**Files:**
- Modify: `internal/config/config.go`

- [ ] **Step 1: Add ServiceToken field to Config struct and Load()**

In `internal/config/config.go`, add `ServiceToken string` field after `APIBaseURL string` (line 46):

```go
ServiceToken string
```

In the `Load()` function, add after line 81 (`APIBaseURL` assignment):

```go
ServiceToken: getEnv("SERVICE_TOKEN", "dev-service-token"),
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/nursing-home-workspace/lumii-goldenyears-processor && go build ./...`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add internal/config/config.go
git commit -m "feat: add SERVICE_TOKEN config for dashboard API auth"
```

---

## Task 4: Processor API Client

**Files:**
- Create: `internal/apiclient/client.go`

- [ ] **Step 1: Create the API client**

```go
// internal/apiclient/client.go
package apiclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/aro-network/lumii-goldenyears-processor/internal/config"
)

type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client
	logger     *zap.Logger
}

func New(cfg *config.Config, logger *zap.Logger) *Client {
	return &Client{
		baseURL: cfg.APIBaseURL,
		token:   cfg.ServiceToken,
		httpClient: &http.Client{Timeout: 15 * time.Second},
		logger:  logger,
	}
}

type ServiceRecordPayload struct {
	SessionID       string         `json:"sessionId"`
	BadgeID         string         `json:"badgeId"`
	ServiceDate     string         `json:"serviceDate"`
	StartTime       string         `json:"startTime"`
	EndTime         string         `json:"endTime"`
	DurationMinutes int            `json:"durationMinutes"`
	ServiceProject  string         `json:"serviceProject,omitempty"`
	AudioURL        string         `json:"audioUrl,omitempty"`
	Transcript      *TranscriptData `json:"transcript,omitempty"`
	ServiceRecord   any            `json:"serviceRecord"`
	IsOfflineRevision bool         `json:"isOfflineRevision"`
}

type TranscriptData struct {
	Text       string        `json:"text"`
	Confidence float64       `json:"confidence"`
	Segments   []SegmentData `json:"segments"`
}

type SegmentData struct {
	Text    string `json:"text"`
	Speaker string `json:"speaker"`
	StartMS int64  `json:"startMs"`
	EndMS   int64  `json:"endMs"`
}

type BadgeStatusPayload struct {
	Status          string `json:"status,omitempty"`
	BatteryPercent  *int   `json:"batteryPercent,omitempty"`
	LastRecordingAt string `json:"lastRecordingAt,omitempty"`
	LastSyncAt      string `json:"lastSyncAt,omitempty"`
}

func (c *Client) PostServiceRecord(payload ServiceRecordPayload) error {
	return c.doPost("/api/internal/service-records", payload)
}

func (c *Client) UpdateBadgeStatus(badgeID string, payload BadgeStatusPayload) error {
	url := fmt.Sprintf("/api/internal/smart-badges/%s/status", badgeID)
	return c.doPatch(url, payload)
}

func (c *Client) doPost(path string, body any) error {
	return c.doRequest("POST", path, body)
}

func (c *Client) doPatch(path string, body any) error {
	return c.doRequest("PATCH", path, body)
}

func (c *Client) doRequest(method, path string, body any) error {
	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	url := c.baseURL + path
	req, err := http.NewRequest(method, url, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error("dashboard API call failed",
			zap.String("method", method),
			zap.String("path", path),
			zap.Error(err))
		return fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		c.logger.Error("dashboard API returned error",
			zap.String("path", path),
			zap.Int("status", resp.StatusCode),
			zap.String("body", string(respBody)))
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}

	c.logger.Info("dashboard API call succeeded",
		zap.String("method", method),
		zap.String("path", path),
		zap.Int("status", resp.StatusCode))
	return nil
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/nursing-home-workspace/lumii-goldenyears-processor && go build ./...`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add internal/apiclient/client.go
git commit -m "feat: add dashboard API client for service record writeback"
```

---

## Task 5: Processor Orchestrator — Add API Writeback Calls

**Files:**
- Modify: `internal/event/orchestrator.go`

- [ ] **Step 1: Add apiclient to Orchestrator struct and constructor**

In `orchestrator.go`, add import:
```go
"github.com/aro-network/lumii-goldenyears-processor/internal/apiclient"
```

Add field to the `Orchestrator` struct (after line 37, the `asrSessions` field):
```go
apiClient *apiclient.Client
```

Update `NewOrchestrator` signature and body — add `api *apiclient.Client` parameter after the `ws *wsserver.Server` parameter:

```go
func NewOrchestrator(cfg *config.Config, logger *zap.Logger, sm *session.Manager, ws *wsserver.Server, api *apiclient.Client) *Orchestrator {
```

And add `apiClient: api,` to the struct initializer after `wsServer: ws,`.

- [ ] **Step 2: Add API call in OnRecordingStart (after line 132)**

After the "Notify browser that ASR is ready" block, add:

```go
// Update badge status in dashboard
if o.apiClient != nil {
	go func() {
		err := o.apiClient.UpdateBadgeStatus(badgeID, apiclient.BadgeStatusPayload{
			Status: "in_use",
		})
		if err != nil {
			o.logger.Warn("failed to update badge status on start", zap.Error(err))
		}
	}()
}
```

- [ ] **Step 3: Add API call in processCompleteRecording (after the WebSocket send at line 475)**

After the `o.wsServer.SendToBadge(badgeID, ...)` block for service_record, add:

```go
// Persist to dashboard API
if o.apiClient != nil {
	go func() {
		segments := make([]apiclient.SegmentData, len(sess.TranscriptParts))
		for i, p := range sess.TranscriptParts {
			segments[i] = apiclient.SegmentData{
				Text:    p.Text,
				Speaker: p.Speaker,
				StartMS: p.StartMS,
				EndMS:   p.EndMS,
			}
		}

		payload := apiclient.ServiceRecordPayload{
			SessionID:       sess.ID,
			BadgeID:         badgeID,
			ServiceDate:     sess.StartedAt.Format("2006-01-02"),
			StartTime:       sess.StartedAt.Format("15:04"),
			EndTime:         sess.EndedAt.Format("15:04"),
			DurationMinutes: int(sess.EndedAt.Sub(sess.StartedAt).Minutes()),
			ServiceProject:  sess.ServiceProject,
			Transcript: &apiclient.TranscriptData{
				Text:       transcript,
				Confidence: record.Confidence,
				Segments:   segments,
			},
			ServiceRecord:    record,
			IsOfflineRevision: false,
		}
		if err := o.apiClient.PostServiceRecord(payload); err != nil {
			o.logger.Warn("failed to post service record to dashboard", zap.Error(err))
		}
	}()
}
```

- [ ] **Step 4: Add API call in runOfflineAnalysis (after the WebSocket send at line 652)**

After the `o.wsServer.SendToBadge(badgeID, ...)` block for offline_report, add:

```go
// Persist offline revision to dashboard
if o.apiClient != nil {
	go func() {
		offlineSegments := make([]apiclient.SegmentData, len(offlineResult.Sentences))
		for i, s := range offlineResult.Sentences {
			offlineSegments[i] = apiclient.SegmentData{
				Text:    s.Text,
				Speaker: fmt.Sprintf("说话人%d", s.SpeakerID),
			}
		}

		payload := apiclient.ServiceRecordPayload{
			SessionID: sessionID,
			Transcript: &apiclient.TranscriptData{
				Text:       offlineText.String(),
				Confidence: finalRecord.Confidence,
				Segments:   offlineSegments,
			},
			ServiceRecord:    finalRecord,
			IsOfflineRevision: true,
		}
		if err := o.apiClient.PostServiceRecord(payload); err != nil {
			o.logger.Warn("failed to post offline revision to dashboard", zap.Error(err))
		}
	}()
}
```

- [ ] **Step 5: Add API call in OnRecordingStop (inside the method, after the sleep and EndSession)**

After `o.processCompleteRecording(badgeID, sess)` on line 172, add:

```go
// Update badge status back to available
if o.apiClient != nil {
	go func() {
		now := time.Now().Format(time.RFC3339)
		err := o.apiClient.UpdateBadgeStatus(badgeID, apiclient.BadgeStatusPayload{
			Status:          "available",
			LastRecordingAt: now,
		})
		if err != nil {
			o.logger.Warn("failed to update badge status on stop", zap.Error(err))
		}
	}()
}
```

- [ ] **Step 6: Verify it compiles**

Run: `cd /opt/nursing-home-workspace/lumii-goldenyears-processor && go build ./...`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add internal/event/orchestrator.go
git commit -m "feat: add dashboard API writeback calls in orchestrator"
```

---

## Task 6: Processor main.go — CORS + Wire API Client

**Files:**
- Modify: `cmd/processor/main.go`

- [ ] **Step 1: Add CORS middleware and wire apiclient**

Add import:
```go
"github.com/aro-network/lumii-goldenyears-processor/internal/apiclient"
```

After `cfg := config.Load()` (line 23), create the API client:
```go
apiClient := apiclient.New(cfg, logger)
```

Update the two `NewOrchestrator` calls (lines 32 and 35) to pass `apiClient`:
```go
orch = event.NewOrchestrator(cfg, logger, sm, nil, apiClient)
// ...
orch = event.NewOrchestrator(cfg, logger, sm, ws, apiClient)
```

Wrap `mux` with CORS — replace the `server` declaration (line 73) with:

```go
// CORS wrapper for cross-origin dashboard access
corsHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	if r.Method == "OPTIONS" {
		w.WriteHeader(204)
		return
	}
	mux.ServeHTTP(w, r)
})

addr := fmt.Sprintf("0.0.0.0:%d", cfg.Port)
server := &http.Server{Addr: addr, Handler: corsHandler}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/nursing-home-workspace/lumii-goldenyears-processor && go build ./...`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add cmd/processor/main.go
git commit -m "feat: add CORS support and wire dashboard API client"
```

---

## Task 7: Dashboard HardwareSimulator — Full Rewrite

**Files:**
- Rewrite: `src/careworker/HardwareSimulator.tsx`

- [ ] **Step 1: Rewrite HardwareSimulator.tsx**

Replace entire file with the new React component that integrates WebSocket audio streaming, real-time transcript, SOP compliance panel, TTS playback, service record display, offline report, and BroadcastChannel linkage.

```tsx
// src/careworker/HardwareSimulator.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import "./careworker.css";

/* ─── Types ─── */

type SimState = "idle" | "connecting" | "recording" | "processing";

interface TranscriptLine {
  text: string;
  speaker: string | null;
  isFinal: boolean;
}

interface SOPCheck {
  completed: string[];
  missing: string[];
  compliance: number;
  alertLevel: string;
}

interface AlertMsg {
  text: string;
  level: string;
  time: string;
}

interface ServiceRecordData {
  summary?: string;
  confidence?: number;
  completeness?: number;
  sop_compliance?: any;
  health_findings?: string;
  medication_status?: string;
  living_status?: string;
  safety_issues?: string;
  mental_status?: string;
  feedback_text?: string;
  anomalies?: string[];
  detail?: any;
}

interface OfflineReportData {
  offlineTranscript: { sentences?: { text: string; speaker_id: number }[]; full_text?: string };
  finalServiceRecord: ServiceRecordData;
}

/* ─── BroadcastChannel (CareworkerPage linkage) ─── */

const BADGE_CHANNEL = "golden-years-badge";

function sendBadgeEvent(event: any) {
  try {
    const ch = new BroadcastChannel(BADGE_CHANNEL);
    ch.postMessage(event);
    ch.close();
  } catch {}
}

/* ─── Helpers ─── */

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const PROCESSOR_URL = (import.meta as any).env?.VITE_PROCESSOR_URL || window.location.origin;
const WS_URL = PROCESSOR_URL.replace(/^http/, "ws") + "/ws/badge";

/* ─── TTS Queue ─── */

let ttsQueue: { type: string; data?: string; text?: string }[] = [];
let ttsPlaying = false;

function queueTTSAudio(base64Data: string, text: string) {
  ttsQueue.push({ type: "audio", data: base64Data, text });
  if (!ttsPlaying) playNextTTS();
}

function playNextTTS() {
  if (ttsQueue.length === 0) { ttsPlaying = false; return; }
  ttsPlaying = true;
  const item = ttsQueue.shift()!;
  if (item.type === "audio" && item.data) {
    try {
      const binary = atob(item.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); setTimeout(playNextTTS, 200); };
      audio.onerror = () => { URL.revokeObjectURL(url); setTimeout(playNextTTS, 100); };
      audio.play().catch(() => { URL.revokeObjectURL(url); fallbackSpeak(item.text); });
    } catch { fallbackSpeak(item.text); }
  } else {
    fallbackSpeak(item.text);
  }
}

function fallbackSpeak(text?: string) {
  if (!text) { setTimeout(playNextTTS, 100); return; }
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "zh-CN";
  utt.rate = 1.1;
  utt.onend = () => setTimeout(playNextTTS, 200);
  utt.onerror = () => setTimeout(playNextTTS, 100);
  speechSynthesis.speak(utt);
}

/* ─── Component ─── */

export function HardwareSimulator() {
  const [state, setState] = useState<SimState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [hint, setHint] = useState("点击开始模拟上门服务");
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [interimText, setInterimText] = useState("");
  const [sopCheck, setSopCheck] = useState<SOPCheck>({ completed: [], missing: [], compliance: 0, alertLevel: "" });
  const [alerts, setAlerts] = useState<AlertMsg[]>([]);
  const [serviceRecord, setServiceRecord] = useState<ServiceRecordData | null>(null);
  const [offlineReport, setOfflineReport] = useState<OfflineReportData | null>(null);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);
  const recordingStartRef = useRef<number>(0);

  const resolvedSpeaker = useCallback((raw: string | null) => {
    if (!raw) return null;
    return speakerMap[raw] || raw;
  }, [speakerMap]);

  const handleWSMessage = useCallback((e: MessageEvent) => {
    if (typeof e.data !== "string") return;
    const msg = JSON.parse(e.data);

    if (msg.type === "status") setHint(msg.message);

    if (msg.type === "transcript") {
      if (msg.is_final) {
        setTranscriptLines(prev => [...prev, { text: msg.text, speaker: msg.speaker, isFinal: true }]);
        setInterimText("");
      } else {
        setInterimText(msg.text);
      }
    }

    if (msg.type === "speaker_map") {
      setSpeakerMap(msg.speaker_map);
      setTranscriptLines(prev => prev.map(line => {
        if (line.speaker && msg.speaker_map[line.speaker]) {
          return { ...line, speaker: msg.speaker_map[line.speaker] };
        }
        return line;
      }));
    }

    if (msg.type === "realtime_check") {
      setSopCheck({
        completed: msg.completed || [],
        missing: msg.missing || [],
        compliance: msg.compliance || 0,
        alertLevel: msg.alert_level || "",
      });
      if (msg.feedback?.trim()) {
        const icons: Record<string, string> = { danger: "\u{1F6A8}", warning: "⚠️", info: "\u{1F4A1}", none: "✅" };
        setAlerts(prev => [{
          text: msg.feedback,
          level: msg.alert_level || "warning",
          time: new Date().toLocaleTimeString(),
        }, ...prev].slice(0, 8));
      }
    }

    if (msg.type === "tts_audio") {
      queueTTSAudio(msg.data, msg.text);
    }

    if (msg.type === "service_record") {
      setServiceRecord(msg.service_record);
      setState("idle");
      setHint("服务记录已生成");
      sendBadgeEvent({ type: "badge_button_press", state: "connected_idle", timestamp: Date.now() });
    }

    if (msg.type === "offline_report") {
      setOfflineReport({
        offlineTranscript: msg.offline_transcript,
        finalServiceRecord: msg.final_service_record,
      });
      setHint("离线对照报告已生成！");
    }

    if (msg.type === "offline_error") {
      setHint("离线分析: " + msg.message);
    }
  }, []);

  const startRecording = useCallback(async () => {
    let mediaStream: MediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setHint("麦克风权限被拒绝");
      return;
    }

    setState("connecting");
    setTranscriptLines([]);
    setInterimText("");
    setServiceRecord(null);
    setOfflineReport(null);
    setAlerts([]);
    setSopCheck({ completed: [], missing: [], compliance: 0, alertLevel: "" });
    setSeconds(0);
    setHint("连接服务器...");

    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    streamRef.current = mediaStream;
    const badgeID = "SIM-" + Date.now().toString(36).toUpperCase();

    ws.onopen = async () => {
      ws.send(JSON.stringify({ type: "start", badge_id: badgeID, ts: new Date().toISOString() }));
      setState("recording");
      setHint("AI 督导已就绪，正在听...");
      recordingStartRef.current = Date.now();

      // Notify CareworkerPage
      sendBadgeEvent({
        type: "badge_button_press",
        state: "connected_recording",
        timestamp: Date.now(),
        recordingStartTime: Date.now(),
      });

      // Start timer
      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }, 1000);

      // Start heartbeat
      const heartbeat = setInterval(() => {
        sendBadgeEvent({ type: "badge_heartbeat", state: "connected_recording", timestamp: Date.now() });
      }, 2000);

      // Init audio pipeline
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(mediaStream);
      sourceRef.current = source;

      try {
        const code = `
          class P extends AudioWorkletProcessor {
            process(inputs) {
              const ch = inputs[0]?.[0];
              if(!ch) return true;
              const buf = new Int16Array(ch.length);
              for(let i=0;i<ch.length;i++){const s=Math.max(-1,Math.min(1,ch[i]));buf[i]=s<0?s*32768:s*32767;}
              this.port.postMessage(buf.buffer,[buf.buffer]);
              return true;
            }
          }
          registerProcessor('pcm-proc',P);
        `;
        const url = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
        await audioCtx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        const worklet = new AudioWorkletNode(audioCtx, "pcm-proc");
        worklet.port.onmessage = (ev) => { if (ws.readyState === 1) ws.send(ev.data); };
        source.connect(worklet);
        worklet.connect(audioCtx.destination);
        workletRef.current = worklet;
      } catch {
        const sn = audioCtx.createScriptProcessor(2048, 1, 1);
        sn.onaudioprocess = (ev) => {
          if (!ws || ws.readyState !== 1) return;
          const f = ev.inputBuffer.getChannelData(0);
          const b = new Int16Array(f.length);
          for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); b[i] = s < 0 ? s * 32768 : s * 32767; }
          ws.send(b.buffer);
        };
        source.connect(sn);
        sn.connect(audioCtx.destination);
        workletRef.current = sn;
      }

      ws.onclose = () => { clearInterval(heartbeat); };
    };

    ws.onmessage = handleWSMessage;
    ws.onerror = () => { setHint("连接失败"); setState("idle"); };
  }, [handleWSMessage]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (workletRef.current) { workletRef.current.disconnect(); workletRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: "stop", ts: new Date().toISOString() }));
    }
    setState("processing");
    setHint("生成完整服务记录中...");

    // Auto-cleanup after 30s if no response
    setTimeout(() => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      setState(prev => prev === "processing" ? "idle" : prev);
    }, 30000);
  }, []);

  const toggleRecord = useCallback(() => {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  }, [state, startRecording, stopRecording]);

  const resetAll = useCallback(() => {
    setServiceRecord(null);
    setOfflineReport(null);
    setTranscriptLines([]);
    setInterimText("");
    setAlerts([]);
    setSopCheck({ completed: [], missing: [], compliance: 0, alertLevel: "" });
    setSeconds(0);
    setHint("点击开始模拟上门服务");
    setState("idle");
    sendBadgeEvent({ type: "badge_state", state: "connected_idle", timestamp: Date.now() });
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptBoxRef.current) {
      transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
    }
  }, [transcriptLines, interimText]);

  // Cleanup on unmount
  useEffect(() => {
    sendBadgeEvent({ type: "badge_state", state: "connected_idle", timestamp: Date.now() });
    return () => {
      sendBadgeEvent({ type: "badge_state", state: "disconnected", timestamp: Date.now() });
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const compPct = Math.round(sopCheck.compliance * 100);
  const compColor = compPct >= 80 ? "var(--sim-success)" : compPct >= 50 ? "var(--sim-warning)" : "var(--sim-danger)";
  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  const btnClass = isRecording ? "sim-rec-btn recording" : isProcessing ? "sim-rec-btn processing" : "sim-rec-btn idle";
  const btnText = isRecording ? "停止" : isProcessing ? "..." : "开始";

  return (
    <div className="sim-shell">
      <div className="sim-header">
        <h1>智能工牌模拟器</h1>
        <p>GoldenYears · 实时ASR + AI督导</p>
      </div>

      <div className="sim-grid">
        {/* Left column: controls + transcript */}
        <div className="sim-col">
          <div className="sim-card">
            <div className="sim-rec-row">
              <button className={btnClass} onClick={toggleRecord} disabled={isProcessing}>
                {btnText}
              </button>
              <div className="sim-rec-info">
                <div className="sim-timer">{formatTime(seconds)}</div>
                <div className="sim-hint">{hint}</div>
              </div>
            </div>
          </div>

          <div className="sim-card" style={{ flex: 1 }}>
            <h3 className="sim-section-title">实时转写</h3>
            <div className="sim-transcript" ref={transcriptBoxRef}>
              {transcriptLines.length === 0 && !interimText ? (
                <div className="sim-transcript-empty">
                  {isRecording ? "正在听，请说话..." : "点击「开始」按钮，对着麦克风说话"}
                </div>
              ) : (
                <>
                  {transcriptLines.map((line, i) => {
                    const sp = resolvedSpeaker(line.speaker);
                    const cls = sp === "社工" ? "worker" : sp === "老人" ? "elder" : "";
                    return (
                      <div key={i}>
                        {sp && <span className={`sim-speaker-tag ${cls}`}>{sp}</span>}
                        <span className={cls}>{line.text}</span>
                      </div>
                    );
                  })}
                  {interimText && (
                    <div className="sim-interim">{interimText}<span className="sim-cursor" /></div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right column: SOP panel + results */}
        <div className="sim-col">
          <div className="sim-card">
            <h3 className="sim-section-title">AI 实时督导</h3>
            <div className="sim-compliance-bar">
              <span className="sim-compliance-label">SOP</span>
              <div className="sim-compliance-track">
                <div className="sim-compliance-fill" style={{ width: `${compPct}%`, background: compColor }} />
              </div>
              <span className="sim-compliance-pct">{compPct > 0 ? `${compPct}%` : "-"}</span>
            </div>

            {(sopCheck.completed.length > 0 || sopCheck.missing.length > 0) && (
              <div className="sim-sop-chips">
                {sopCheck.completed.map((s, i) => (
                  <span key={`d-${i}`} className="sim-sop-chip done">{"✓"} {s}</span>
                ))}
                {sopCheck.missing.map((s, i) => (
                  <span key={`m-${i}`} className="sim-sop-chip missing">{"○"} {s}</span>
                ))}
              </div>
            )}

            <div className="sim-alert-log">
              {alerts.length === 0 ? (
                <div className="sim-alert-empty">等待服务开始...</div>
              ) : (
                alerts.map((a, i) => {
                  const icons: Record<string, string> = { danger: "\u{1F6A8}", warning: "⚠️", info: "\u{1F4A1}", none: "✅" };
                  return (
                    <div key={i} className={`sim-alert ${a.level === "danger" ? "danger" : a.level === "info" || a.level === "none" ? "info" : "warning"}`}>
                      <span className="sim-alert-icon">{icons[a.level] || "⚠️"}</span>
                      <span className="sim-alert-text">{a.text}</span>
                      <span className="sim-alert-time">{a.time}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Service Record */}
          {serviceRecord && (
            <div className="sim-card">
              <h3 className="sim-section-title">服务记录</h3>
              <ServiceRecordDisplay record={serviceRecord} />
              <button className="sim-btn-reset" onClick={resetAll}>重新开始</button>
            </div>
          )}

          {/* Offline Report */}
          {offlineReport && (
            <div className="sim-card sim-card--offline">
              <h3 className="sim-section-title">最终版报告（离线分析对照）</h3>
              <div className="sim-result-block">
                <div className="sim-result-label">离线转写（说话人分离）</div>
                <div className="sim-transcript" style={{ maxHeight: 200 }}>
                  {offlineReport.offlineTranscript.sentences?.map((s, i) => {
                    const cls = s.speaker_id === 0 ? "worker" : "elder";
                    return (
                      <div key={i}>
                        <span className={`sim-speaker-tag ${cls}`}>说话人{s.speaker_id}</span>
                        {s.text}
                      </div>
                    );
                  })}
                </div>
              </div>
              <ServiceRecordDisplay record={offlineReport.finalServiceRecord} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Service Record Display Sub-component ─── */

function ServiceRecordDisplay({ record }: { record: ServiceRecordData }) {
  const conf = Math.round((record.confidence || 0) * 100);
  const comp = Math.round((record.completeness || 0) * 100);
  const sop = record.sop_compliance;
  let sopVal = "-";
  if (sop && typeof sop === "object" && !Array.isArray(sop)) {
    const v = Object.values(sop as Record<string, boolean>);
    sopVal = `${v.filter(Boolean).length}/${v.length}`;
  } else if (typeof sop === "number") {
    sopVal = `${Math.round(sop * 100)}%`;
  }

  const detail = (record.detail || record) as Record<string, any>;
  const fields: [string, string, string[]][] = [
    ["健康发现", "healthFindings", ["health_findings", "health_status"]],
    ["用药情况", "medStatus", ["medication_status", "medication_compliance"]],
    ["生活状态", "livingStatus", ["living_status", "daily_living"]],
    ["安全问题", "safetyIssues", ["safety_issues", "safety_assessment"]],
    ["心理状态", "mentalStatus", ["mental_status", "psychological_wellbeing"]],
  ];

  const anomalies = (record.anomalies || []).map(a => typeof a === "string" ? a : JSON.stringify(a));

  return (
    <>
      <div className="sim-metrics">
        <div className="sim-metric">
          <div className="sim-metric-val" style={{ color: conf >= 80 ? "var(--sim-success)" : "var(--sim-warning)" }}>{conf}%</div>
          <div className="sim-metric-label">置信度</div>
        </div>
        <div className="sim-metric">
          <div className="sim-metric-val" style={{ color: comp >= 80 ? "var(--sim-success)" : "var(--sim-warning)" }}>{comp}%</div>
          <div className="sim-metric-label">完整度</div>
        </div>
        <div className="sim-metric">
          <div className="sim-metric-val">{sopVal}</div>
          <div className="sim-metric-label">SOP</div>
        </div>
      </div>

      <div className="sim-result-block">
        <div className="sim-result-label">服务摘要</div>
        <div className="sim-result-value">{record.summary || detail.summary || ""}</div>
      </div>

      {fields.map(([label, , keys]) => {
        const val = keys.map(k => detail[k] || record[k as keyof ServiceRecordData]).find(v => v && typeof v === "string" && v.length > 0);
        if (!val) return null;
        return (
          <div key={label} className="sim-result-block">
            <div className="sim-result-label">{label}</div>
            <div className="sim-result-value">{val as string}</div>
          </div>
        );
      })}

      <div className="sim-result-block">
        <div className="sim-result-label">反馈建议</div>
        <div className="sim-result-value sim-result-value--accent">{record.feedback_text || ""}</div>
      </div>

      <div className="sim-result-block">
        <div className="sim-result-label">异常检测</div>
        {anomalies.length === 0 ? (
          <div className="sim-result-value" style={{ color: "var(--sim-success)" }}>无异常</div>
        ) : (
          anomalies.map((a, i) => <div key={i} className="sim-anomaly">{a}</div>)
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/careworker/HardwareSimulator.tsx
git commit -m "feat: rewrite HardwareSimulator with full processor WebSocket integration"
```

---

## Task 8: Dashboard CSS — Replace Simulator Styles

**Files:**
- Modify: `src/careworker/careworker.css`

- [ ] **Step 1: Replace the hw-* styles (lines 1040-1184) with new sim-* styles**

Remove everything from `/* ── Hardware Simulator ── */` through `/* ── GPS Simulation ── */` section end (line 1184), and replace with:

```css
/* ── Badge Simulator (integrated) ── */
.sim-shell {
  --sim-bg: #F7F9FB;
  --sim-glass: rgba(255,255,255,0.75);
  --sim-text: #191C1E;
  --sim-text2: #64748B;
  --sim-accent: #0052CC;
  --sim-success: #16A34A;
  --sim-danger: #DC2626;
  --sim-warning: #F59E0B;
  --sim-radius: 18px;
  font-family: -apple-system, "SF Pro Text", "PingFang SC", system-ui, sans-serif;
  background: radial-gradient(circle at 12% 8%,rgba(238,190,172,.42),transparent 31%),
    radial-gradient(circle at 86% 5%,rgba(150,215,255,.58),transparent 34%),
    radial-gradient(circle at 74% 54%,rgba(199,183,221,.46),transparent 34%),
    linear-gradient(180deg,#F9FAFC,#EEF3F8 46%,#E8EDF4);
  background-attachment: fixed;
  color: var(--sim-text);
  min-height: 100vh;
  min-height: 100dvh;
  padding: 16px;
}
.sim-header { text-align: center; padding: 20px 0 12px; }
.sim-header h1 { font-size: 22px; font-weight: 800; margin: 0; }
.sim-header p { color: var(--sim-text2); font-size: 13px; margin-top: 2px; }

.sim-grid { display: grid; gap: 12px; max-width: 1200px; margin: 0 auto; }
@media(min-width:768px) { .sim-grid { grid-template-columns: 1fr 1fr; } }
.sim-col { display: flex; flex-direction: column; gap: 12px; }

.sim-card {
  background: var(--sim-glass);
  backdrop-filter: blur(20px);
  border-radius: var(--sim-radius);
  border: 1px solid rgba(255,255,255,.6);
  box-shadow: 0 4px 20px rgba(0,0,0,.05);
  padding: 18px;
}
.sim-card--offline { border-left: 4px solid var(--sim-success); }

.sim-section-title { font-size: 15px; font-weight: 700; margin: 0 0 10px; }

/* Record button */
.sim-rec-row { display: flex; align-items: center; gap: 14px; }
.sim-rec-btn {
  width: 64px; height: 64px; border-radius: 50%; border: none;
  color: white; font-size: 12px; font-weight: 700; cursor: pointer;
  flex-shrink: 0; transition: all .2s;
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
}
.sim-rec-btn:active { transform: scale(.93); }
.sim-rec-btn.idle { background: linear-gradient(135deg,#0052CC,#2684FF); }
.sim-rec-btn.recording { background: linear-gradient(135deg,#DC2626,#EF4444); animation: sim-pulse 1.5s infinite; }
.sim-rec-btn.processing { background: linear-gradient(135deg,#F59E0B,#FBBF24); cursor: wait; }
@keyframes sim-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.4); }
  50% { box-shadow: 0 0 0 16px rgba(220,38,38,0); }
}
.sim-rec-info { flex: 1; }
.sim-timer { font-size: 28px; font-weight: 800; color: var(--sim-accent); font-variant-numeric: tabular-nums; }
.sim-hint { font-size: 12px; color: var(--sim-text2); margin-top: 2px; }

/* Transcript */
.sim-transcript {
  background: #1a1a2e; border-radius: 12px; padding: 14px;
  min-height: 120px; max-height: 300px; overflow-y: auto;
  font-size: 13px; line-height: 1.8; color: #e0e0e0;
}
.sim-transcript .worker { color: #60a5fa; }
.sim-transcript .elder { color: #34d399; }
.sim-transcript-empty { color: #555; text-align: center; padding: 30px 0; font-size: 13px; }
.sim-speaker-tag {
  font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-right: 4px;
}
.sim-speaker-tag.worker { background: rgba(96,165,250,.2); color: #60a5fa; }
.sim-speaker-tag.elder { background: rgba(52,211,153,.2); color: #34d399; }
.sim-interim { color: #666; font-style: italic; }
.sim-cursor {
  display: inline-block; width: 6px; height: 14px;
  background: var(--sim-accent); margin-left: 2px; animation: sim-blink 1s infinite;
}
@keyframes sim-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

/* SOP compliance */
.sim-compliance-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.sim-compliance-label { font-size: 12px; color: var(--sim-text2); }
.sim-compliance-track { flex: 1; height: 8px; background: rgba(0,0,0,.06); border-radius: 4px; overflow: hidden; }
.sim-compliance-fill { height: 100%; border-radius: 4px; transition: width .5s, background .5s; }
.sim-compliance-pct { font-size: 14px; font-weight: 800; min-width: 45px; text-align: right; }

.sim-sop-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
.sim-sop-chip { font-size: 11px; padding: 3px 8px; border-radius: 12px; white-space: nowrap; }
.sim-sop-chip.done { background: #F0FDF4; color: var(--sim-success); }
.sim-sop-chip.missing { background: #FEF2F2; color: var(--sim-danger); }

/* Alerts */
.sim-alert-log { max-height: 200px; overflow-y: auto; }
.sim-alert-empty { color: var(--sim-text2); font-size: 13px; text-align: center; padding: 20px 0; }
.sim-alert {
  padding: 10px 14px; border-radius: 10px; margin-bottom: 8px;
  font-size: 14px; line-height: 1.5; display: flex; align-items: flex-start; gap: 8px;
  animation: sim-slideIn .3s ease;
}
.sim-alert.warning { background: #FEF3C7; color: #92400E; }
.sim-alert.danger { background: #FEF2F2; color: var(--sim-danger); }
.sim-alert.info { background: #EFF6FF; color: var(--sim-accent); }
.sim-alert-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
.sim-alert-text { flex: 1; }
.sim-alert-time { font-size: 10px; color: #999; white-space: nowrap; margin-top: 2px; }
@keyframes sim-slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

/* Service record / results */
.sim-metrics { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 14px; }
.sim-metric { text-align: center; padding: 10px; background: white; border-radius: 10px; }
.sim-metric-val { font-size: 20px; font-weight: 800; }
.sim-metric-label { font-size: 11px; color: var(--sim-text2); margin-top: 2px; }

.sim-result-block { background: rgba(0,82,204,.04); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.sim-result-label { font-size: 11px; color: var(--sim-text2); font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
.sim-result-value { font-size: 14px; line-height: 1.7; }
.sim-result-value--accent { color: var(--sim-accent); font-weight: 600; }

.sim-anomaly { background: #FEF2F2; color: var(--sim-danger); padding: 6px 10px; border-radius: 6px; font-size: 12px; margin-bottom: 4px; }

.sim-btn-reset {
  width: 100%; padding: 12px; border: none; border-radius: 12px;
  font-size: 15px; font-weight: 700; cursor: pointer;
  color: white; background: var(--sim-accent); margin-top: 8px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/careworker/careworker.css
git commit -m "feat: replace hardware simulator CSS with integrated simulator styles"
```

---

## Task 9: Environment Configuration

**Files:**
- Create: `.env.example` (dashboard root)

- [ ] **Step 1: Create .env.example with all required env vars**

```bash
# Dashboard server
PORT=3001
JWT_SECRET=change-me-in-production
WS_TOKEN=change-me-in-production
SERVICE_TOKEN=golden-years-service-token-2026

# Frontend (Vite injects VITE_* vars)
VITE_PROCESSOR_URL=http://81.68.254.22:30000
```

- [ ] **Step 2: Create .env with actual values for 81.68.254.22 deployment**

```bash
PORT=3001
JWT_SECRET=dev-jwt-secret-change-in-prod
WS_TOKEN=dev-ws-token-change-in-prod
SERVICE_TOKEN=golden-years-service-token-2026
VITE_PROCESSOR_URL=http://81.68.254.22:30000
```

- [ ] **Step 3: Add SERVICE_TOKEN to processor's .env on deploy**

On 81.68.254.22, the processor's `.env` (or environment) needs:
```bash
API_BASE_URL=http://127.0.0.1:3001
SERVICE_TOKEN=golden-years-service-token-2026
```

Both services use the same `SERVICE_TOKEN` value — dashboard validates it, processor sends it.

- [ ] **Step 4: Commit .env.example (NOT .env)**

```bash
git add .env.example
git commit -m "docs: add .env.example with processor integration config"
```

---

## Task 10: Integration Verification

- [ ] **Step 1: Build dashboard frontend**

Run: `cd /opt/nursing-home-workspace/lumii-goldenyears-dashboard && npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 2: Build processor**

Run: `cd /opt/nursing-home-workspace/lumii-goldenyears-processor && go build ./...`
Expected: Build succeeds with no errors

- [ ] **Step 3: Start dashboard server locally and test internal API**

Run: `cd /opt/nursing-home-workspace/lumii-goldenyears-dashboard && SERVICE_TOKEN=test-token npx tsx server/index.ts &`

Test service record creation:
```bash
curl -s -X POST http://localhost:3001/api/internal/service-records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"sessionId":"test-sess-001","badgeId":"DEMO-TEST","serviceDate":"2026-05-19","startTime":"09:00","endTime":"09:30","durationMinutes":30,"transcript":{"text":"测试转写","confidence":0.9,"segments":[]},"serviceRecord":{"summary":"测试摘要","confidence":0.85,"completeness":0.7,"anomalies":[],"feedback_text":"测试反馈"}}'
```
Expected: `{"id":"rec-XXXXXXXX","created":true}`

Test badge status update:
```bash
curl -s -X PATCH http://localhost:3001/api/internal/smart-badges/DEMO-TEST/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"status":"in_use"}'
```
Expected: `{"updated":true,...}`

Test auth rejection:
```bash
curl -s -X POST http://localhost:3001/api/internal/service-records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrong-token" \
  -d '{}'
```
Expected: `{"error":"invalid service token"}` with 403 status

- [ ] **Step 4: Verify service record appears in existing API**

```bash
curl -s http://localhost:3001/api/service-records | python3 -c "import json,sys; data=json.load(sys.stdin); print(f'{len(data[\"serviceRecords\"])} records found')"
```
Expected: Count includes the newly created test record

- [ ] **Step 5: Kill test server and commit any fixes**

```bash
kill %1 2>/dev/null || true
```
