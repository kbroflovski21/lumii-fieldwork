import { useState, useEffect, useRef } from "react";
import "./careworker.css";

/* ─── Types ─── */

type BadgeState = "disconnected" | "connected_idle" | "connected_recording";

interface BadgeEvent {
  type: "badge_state" | "badge_heartbeat" | "badge_button_press";
  state: BadgeState;
  timestamp: number;
  recordingStartTime?: number;
}

/* ─── Badge Channel ─── */

const BADGE_CHANNEL = "golden-years-badge";

function sendBadgeEvent(event: BadgeEvent) {
  try {
    const ch = new BroadcastChannel(BADGE_CHANNEL);
    ch.postMessage(event);
    ch.close();
  } catch {
    // BroadcastChannel not supported
  }
}

/* ─── GPS Simulation ─── */

const BASE_LAT = 30.2741;
const BASE_LNG = 120.1551;

function simulateGPS(isRecording: boolean): { lat: string; lng: string } {
  if (!isRecording) return { lat: BASE_LAT.toFixed(6), lng: BASE_LNG.toFixed(6) };
  // Add small random drift when recording
  const drift = () => (Math.random() - 0.5) * 0.001;
  return {
    lat: (BASE_LAT + drift()).toFixed(6),
    lng: (BASE_LNG + drift()).toFixed(6),
  };
}

/* ─── Helpers ─── */

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ─── SVG Icons ─── */

function IconRecord() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" fill="white" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function IconBattery() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
      <line x1="23" y1="13" x2="23" y2="11" />
      <rect x="3" y="8" width="10" height="8" rx="1" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function IconSignal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 1l22 22" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

/* ─── Component ─── */

export function HardwareSimulator() {
  const [state, setState] = useState<BadgeState>("connected_idle");
  const [recordingStart, setRecordingStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [gps, setGps] = useState(() => simulateGPS(false));
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Send initial state and start heartbeat
  useEffect(() => {
    sendBadgeEvent({ type: "badge_state", state: "connected_idle", timestamp: Date.now() });

    heartbeatRef.current = setInterval(() => {
      sendBadgeEvent({ type: "badge_heartbeat", state: "connected_idle", timestamp: Date.now() });
    }, 2000);

    return () => {
      clearInterval(heartbeatRef.current);
      sendBadgeEvent({ type: "badge_state", state: "disconnected", timestamp: Date.now() });
    };
  }, []);

  // Update heartbeat when state changes
  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      sendBadgeEvent({ type: "badge_heartbeat", state, timestamp: Date.now() });
    }, 2000);
  }, [state]);

  // Recording timer
  useEffect(() => {
    if (state !== "connected_recording" || !recordingStart) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - recordingStart) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [state, recordingStart]);

  // GPS simulation
  useEffect(() => {
    const isRec = state === "connected_recording";
    const timer = setInterval(() => {
      setGps(simulateGPS(isRec));
    }, isRec ? 3000 : 10000);
    return () => clearInterval(timer);
  }, [state]);

  const handlePress = () => {
    if (state === "connected_idle") {
      const now = Date.now();
      setState("connected_recording");
      setRecordingStart(now);
      setElapsed(0);
      sendBadgeEvent({
        type: "badge_button_press",
        state: "connected_recording",
        timestamp: now,
        recordingStartTime: now,
      });
    } else if (state === "connected_recording") {
      setState("connected_idle");
      setRecordingStart(null);
      setElapsed(0);
      sendBadgeEvent({
        type: "badge_button_press",
        state: "connected_idle",
        timestamp: Date.now(),
      });
    }
  };

  const isRecording = state === "connected_recording";

  return (
    <div className="hw-shell">
      {/* Title */}
      <div className="hw-title">
        <h1>智能工牌模拟器</h1>
        <p>模拟物理工牌的单按钮操作</p>
      </div>

      {/* Status */}
      <div className="hw-status">
        <div className={`hw-status__label ${isRecording ? "hw-status__label--recording" : "hw-status__label--idle"}`}>
          {isRecording ? "● 录音中" : "● 待命"}
        </div>
        {isRecording && (
          <div className="hw-status__timer">{formatTime(elapsed)}</div>
        )}
      </div>

      {/* Big button */}
      <button
        className={`hw-button ${isRecording ? "hw-button--recording" : "hw-button--idle"}`}
        onClick={handlePress}
      >
        {isRecording ? <IconStop /> : <IconRecord />}
        <span className="hw-button__label">{isRecording ? "结束服务" : "开始服务"}</span>
      </button>

      {/* Hardware info */}
      <div className="hw-info">
        <div className="hw-info__battery">
          <span className="hw-info__stat"><IconBattery /> 87%</span>
          <span className="hw-info__stat"><IconSignal /> 良好</span>
        </div>

        {/* GPS */}
        <div className="hw-gps">
          <div className="hw-gps__title">GPS 定位</div>
          <div className="hw-gps__coord">
            {gps.lat}N, {gps.lng}E
          </div>
        </div>

        <p className="hw-info__hint">
          {isRecording ? "服务录音中，再次按下按钮结束服务" : "按下按钮开始服务录音"}
        </p>
        <p className="hw-info__hint">
          请在另一个标签页打开护理人员页面观察状态变化
        </p>
      </div>
    </div>
  );
}
