export function formatDateWithDay(d: string): string {
  const date = new Date(`${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getMonth() + 1}/${date.getDate()} 周${days[date.getDay()]}`;
}

export function formatDateShort(d: string): string {
  const date = new Date(`${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatSyncTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function toBjStr(d: Date): { date: string; time: string; full: string } {
  const bj = new Date(d.getTime() + 8 * 3600000);
  return {
    date: `${bj.getUTCMonth() + 1}/${bj.getUTCDate()}`,
    time: `${bj.getUTCHours().toString().padStart(2, "0")}:${bj.getUTCMinutes().toString().padStart(2, "0")}`,
    full: bj.toISOString().replace("T", " ").slice(0, 16),
  };
}

export function formatWindow(s: {
  timeWindow?: { label?: string; start?: string; end?: string };
  startTime?: string;
  endTime?: string;
}): string {
  if (s.timeWindow?.label) return s.timeWindow.label;
  return `${s.startTime ?? s.timeWindow?.start ?? ""}-${s.endTime ?? s.timeWindow?.end ?? ""}`;
}
