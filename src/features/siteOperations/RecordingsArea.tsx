import { useState, useEffect } from "react";
import { authFetch } from "./api";

interface RecordingItem {
  id: string;
  sessionId: string;
  badgeId: string;
  workerName: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  status: string;
  aiSummary: string | null;
  matchedServiceObjectName: string | null;
  matchedScheduleId: string | null;
  matchConfidence: number | null;
  matchReason: string | null;
  transcriptText: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  processing: "处理中",
  pending_match: "待匹配",
  matched: "已匹配",
  unmatched: "未匹配",
};

const STATUS_COLORS: Record<string, string> = {
  processing: "#F59E0B",
  pending_match: "#3B82F6",
  matched: "#16A34A",
  unmatched: "#DC2626",
};

export function RecordingsArea() {
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/recordings")
      .then(r => r.json())
      .then(data => { setRecordings(data.recordings ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const selected = recordings.find(r => r.id === selectedId);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const bj = new Date(d.getTime() + 8 * 3600000);
    return `${bj.getUTCMonth()+1}/${bj.getUTCDate()} ${bj.getUTCHours().toString().padStart(2,"0")}:${bj.getUTCMinutes().toString().padStart(2,"0")}`;
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}分${s}秒`;
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>加载录音列表...</div>;

  return (
    <div style={{ display: "flex", gap: 16, height: "100%" }}>
      {/* Recording list */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>录音管理</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>共 {recordings.length} 条录音</div>
          </div>
        </div>

        {recordings.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>暂无录音记录</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recordings.map(rec => (
              <div
                key={rec.id}
                onClick={() => setSelectedId(rec.id === selectedId ? null : rec.id)}
                style={{
                  padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  background: rec.id === selectedId ? "#EFF6FF" : "#fff",
                  border: rec.id === selectedId ? "1px solid #BFDBFE" : "1px solid #F1F5F9",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{rec.workerName ?? rec.badgeId}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: STATUS_COLORS[rec.status] + "15", color: STATUS_COLORS[rec.status], fontWeight: 600 }}>
                      {STATUS_LABELS[rec.status] ?? rec.status}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>{formatTime(rec.startedAt)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#64748B", display: "flex", gap: 12 }}>
                  <span>时长: {formatDuration(rec.durationSeconds)}</span>
                  {rec.matchedServiceObjectName && <span>长者: {rec.matchedServiceObjectName}</span>}
                  {rec.matchReason && <span>匹配: {rec.matchReason}</span>}
                </div>
                {rec.aiSummary && (
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 6, lineHeight: 1.5 }}>
                    {rec.aiSummary.slice(0, 80)}{rec.aiSummary.length > 80 ? "..." : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ width: 400, flexShrink: 0, background: "#fff", borderRadius: 16, border: "1px solid #F1F5F9", padding: 20, overflowY: "auto" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>录音详情</div>
          <div style={{ fontSize: 13, color: "#64748B", lineHeight: 2 }}>
            <div><strong>护工:</strong> {selected.workerName ?? "-"}</div>
            <div><strong>工牌:</strong> {selected.badgeId}</div>
            <div><strong>时间:</strong> {formatTime(selected.startedAt)} {selected.endedAt ? `- ${formatTime(selected.endedAt)}` : ""}</div>
            <div><strong>时长:</strong> {formatDuration(selected.durationSeconds)}</div>
            <div><strong>状态:</strong> <span style={{ color: STATUS_COLORS[selected.status] }}>{STATUS_LABELS[selected.status]}</span></div>
            {selected.matchedServiceObjectName && <div><strong>长者:</strong> {selected.matchedServiceObjectName}</div>}
            {selected.matchConfidence !== null && <div><strong>匹配置信度:</strong> {Math.round((selected.matchConfidence ?? 0) * 100)}%</div>}
            {selected.matchReason && <div><strong>匹配原因:</strong> {selected.matchReason}</div>}
          </div>
          {selected.aiSummary && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>AI 摘要</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "#334155", background: "#F8FAFC", padding: 12, borderRadius: 8 }}>
                {selected.aiSummary}
              </div>
            </div>
          )}
          {selected.transcriptText && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>转写文本</div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#475569", background: "#F8FAFC", padding: 12, borderRadius: 8, maxHeight: 300, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                {selected.transcriptText}
              </div>
            </div>
          )}
          {selected.status === "unmatched" && (
            <div style={{ marginTop: 16 }}>
              <button
                style={{ width: "100%", padding: 10, border: "none", borderRadius: 10, background: "#0052CC", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                onClick={() => {
                  const scheduleId = prompt("请输入要关联的排班ID（schedule ID）：");
                  if (!scheduleId) return;
                  authFetch(`/api/recordings/${selected.id}/match`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ scheduleId }),
                  }).then(() => window.location.reload());
                }}
              >
                手动关联服务
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
