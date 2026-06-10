import type { ServiceSession } from "./contracts";

/**
 * Shared utilities for both LiveServicesArea and CompletedServicesArea tables.
 * Ensures identical column logic across the two pages.
 */

/* ── Evidence score ── */

export function evidenceCount(ec: ServiceSession["evidenceChain"]): { pass: number; total: number } {
  const vals = [ec.gps, ec.bleBeacon, ec.voiceprint, ec.audioRecording, ec.radarData, ec.photo];
  return { pass: vals.filter(Boolean).length, total: 6 };
}

export function evidenceScoreClass(pass: number, total: number): string {
  if (pass === total) return "svc-table__evidence--full";
  if (pass >= 4) return "svc-table__evidence--partial";
  return "svc-table__evidence--low";
}

/* ── Quality score tone ── */

export function scoreTone(score: number): string {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

/* ── Anomaly tags ── */

export type AnomalyTag = {
  label: string;
  tone: "red" | "orange" | "green";
};

export function buildAnomalyTags(session: ServiceSession): AnomalyTag[] {
  const tags: AnomalyTag[] = [];
  const ec = session.evidenceChain;

  if (ec.gps === false) tags.push({ label: "GPS不匹配", tone: "red" });
  if (ec.voiceprint === false) tags.push({ label: "声纹异常", tone: "red" });
  if (ec.radarData === false) tags.push({ label: "雷达缺失", tone: "orange" });

  const score = evidenceCount(ec);
  if (score.pass < score.total) tags.push({ label: "证据不完整", tone: "orange" });

  if (session.aiAssessment && session.aiAssessment.anomalies && session.aiAssessment.anomalies.length > 0) {
    tags.push({ label: "存在违规行为", tone: "red" });
  }

  if (session.elderVerification && session.elderVerification.status === "fail") {
    tags.push({ label: "失能核查异常", tone: "red" });
  }

  if (tags.length === 0) {
    tags.push({ label: "正常", tone: "green" });
  }

  return tags;
}

/* ── Date / time formatting ── */

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
