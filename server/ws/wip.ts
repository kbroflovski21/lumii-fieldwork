export const WIP_TIMEOUT_MS = 30 * 60_000;
export const STREAM_TTL_MS = 30_000;

export function computeWip(
  history: Array<{ role: string; timestamp?: string }>,
  connected: boolean,
  nowMs: number
): boolean {
  if (!connected) return false;
  if (history.length === 0) return false;
  const last = history[history.length - 1];
  if (last.role !== "user") return false;
  if (!last.timestamp) return true;
  const parsed = new Date(last.timestamp).getTime();
  if (isNaN(parsed)) return true;
  return nowMs - parsed < WIP_TIMEOUT_MS;
}
