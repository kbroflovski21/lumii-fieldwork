import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Types ─── */

export type BadgeState = "disconnected" | "connected_idle" | "connected_recording";
export type ServicePhase = "none" | "pre_service" | "active_service" | "post_service";

export interface BadgeEvent {
  type: "badge_state" | "badge_heartbeat" | "badge_button_press";
  state: BadgeState;
  timestamp: number;
  recordingStartTime?: number;
}

export interface BadgeInfo {
  badgeState: BadgeState;
  servicePhase: ServicePhase;
  recordingStartTime: number | null;
  recordingEndTime: number | null;
}

/* ─── Constants ─── */

const BADGE_CHANNEL = "golden-years-badge";
const DISCONNECT_TIMEOUT = 5000; // 5 seconds
const POST_SERVICE_WINDOW = 30 * 60 * 1000; // 30 minutes
const PRE_SERVICE_WINDOW = 15 * 60 * 1000; // 15 minutes

/* ─── Avatar Color Hashing ─── */

const AVATAR_COLORS = [
  "#0052CC", "#E65100", "#2E7D32", "#7B1FA2",
  "#C62828", "#00695C", "#AD1457", "#4527A0",
  "#1565C0", "#EF6C00", "#2E7D32", "#6A1B9A",
];

export function hashNameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ─── Hook ─── */

export function useBadge(nextTaskStartTime?: string | null): BadgeInfo {
  const [badgeState, setBadgeState] = useState<BadgeState>("disconnected");
  const [servicePhase, setServicePhase] = useState<ServicePhase>("none");
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingEndTime, setRecordingEndTime] = useState<number | null>(null);
  const lastHeartbeat = useRef<number>(0);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Pre-service detection: 15 minutes before task start
  useEffect(() => {
    if (servicePhase !== "none" || !nextTaskStartTime) return;

    const check = () => {
      const [h, m] = nextTaskStartTime.split(":").map(Number);
      const taskStart = new Date();
      taskStart.setHours(h, m, 0, 0);
      const msUntil = taskStart.getTime() - Date.now();
      if (msUntil > 0 && msUntil <= PRE_SERVICE_WINDOW) {
        setServicePhase("pre_service");
      }
    };

    check();
    const interval = setInterval(check, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [servicePhase, nextTaskStartTime]);

  // Handle badge events via BroadcastChannel
  const handleEvent = useCallback((event: BadgeEvent) => {
    lastHeartbeat.current = Date.now();

    // Reset disconnect timer on any event
    if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
    disconnectTimer.current = setTimeout(() => {
      setBadgeState("disconnected");
      setServicePhase((prev) => {
        if (prev === "active_service") {
          setRecordingEndTime(Date.now());
          return "post_service";
        }
        return prev;
      });
    }, DISCONNECT_TIMEOUT);

    if (event.type === "badge_state" || event.type === "badge_heartbeat") {
      setBadgeState(event.state);
      if (event.state === "disconnected") {
        setServicePhase((prev) => {
          if (prev === "active_service") {
            setRecordingEndTime(Date.now());
            return "post_service";
          }
          return prev;
        });
      }
    }

    if (event.type === "badge_button_press") {
      setBadgeState(event.state);
      if (event.state === "connected_recording") {
        setServicePhase("active_service");
        setRecordingStartTime(event.recordingStartTime || Date.now());
        setRecordingEndTime(null);
      } else if (event.state === "connected_idle") {
        setServicePhase("post_service");
        setRecordingEndTime(Date.now());
      }
    }
  }, []);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(BADGE_CHANNEL);
      channel.onmessage = (e: MessageEvent<BadgeEvent>) => handleEvent(e.data);
    } catch {
      // BroadcastChannel not supported
    }
    return () => {
      channel?.close();
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
    };
  }, [handleEvent]);

  // Post-service countdown: auto-reset after 30 minutes
  useEffect(() => {
    if (servicePhase !== "post_service" || !recordingEndTime) return;
    const remaining = POST_SERVICE_WINDOW - (Date.now() - recordingEndTime);
    if (remaining <= 0) {
      setServicePhase("none");
      return;
    }
    const timer = setTimeout(() => setServicePhase("none"), remaining);
    return () => clearTimeout(timer);
  }, [servicePhase, recordingEndTime]);

  return { badgeState, servicePhase, recordingStartTime, recordingEndTime };
}
