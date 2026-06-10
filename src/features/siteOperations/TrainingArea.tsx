import { useState, useEffect, useMemo } from "react";
import { GraduationCap } from "lucide-react";
import { useSite } from "../../auth/SiteContext";
import type { TrainingRecord } from "./contracts";

const MODE_LABELS: Record<string, string> = {
  guidance: "引导",
  supervision: "督导",
  exam: "考核",
};

const MODE_COLORS: Record<string, { bg: string; fg: string }> = {
  guidance: { bg: "#EFF6FF", fg: "#2563EB" },
  supervision: { bg: "#FFF7ED", fg: "#EA580C" },
  exam: { bg: "#FAF5FF", fg: "#9333EA" },
};

const STATUS_LABELS: Record<string, string> = {
  completed: "已完成",
  in_progress: "进行中",
  failed: "未通过",
};

export function TrainingArea() {
  const { currentSite } = useSite();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterWorker, setFilterWorker] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [filterMode, setFilterMode] = useState("");

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem("gy_auth_token");
    const params = new URLSearchParams();
    if (currentSite?.id) params.set("siteId", currentSite.id);
    fetch(`/api/training-records?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setRecords(data.trainingRecords ?? []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [currentSite?.id]);

  const workers = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => map.set(r.workerId, r.workerName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [records]);

  const items = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => map.set(r.serviceItemId, r.serviceItemName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterWorker && r.workerId !== filterWorker) return false;
      if (filterItem && r.serviceItemId !== filterItem) return false;
      if (filterMode && r.mode !== filterMode) return false;
      return true;
    });
  }, [records, filterWorker, filterItem, filterMode]);

  // KPI calculations
  const totalCompleted = records.filter((r) => r.status === "completed").length;
  const examRecords = records.filter((r) => r.mode === "exam" && r.score != null);
  const avgScore =
    examRecords.length > 0
      ? Math.round(examRecords.reduce((s, r) => s + (r.score ?? 0), 0) / examRecords.length)
      : 0;
  const passRate =
    examRecords.length > 0
      ? Math.round(
          (examRecords.filter((r) => (r.score ?? 0) >= 60).length / examRecords.length) * 100
        )
      : 0;
  const workerCounts = new Map<string, number>();
  records
    .filter((r) => r.status === "completed")
    .forEach((r) => workerCounts.set(r.workerName, (workerCounts.get(r.workerName) ?? 0) + 1));
  let topWorker = "-";
  let topCount = 0;
  workerCounts.forEach((c, name) => {
    if (c > topCount) {
      topCount = c;
      topWorker = name;
    }
  });

  function scoreColor(score: number): string {
    if (score >= 80) return "#16A34A";
    if (score >= 60) return "#EA580C";
    return "#DC2626";
  }

  if (loading) {
    return (
      <div className="sw-table-container" style={{ padding: 40, textAlign: "center", color: "#667386" }}>
        加载中...
      </div>
    );
  }

  return (
    <div className="sw-table-container">
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <GraduationCap size={22} color="#0052CC" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F172A" }}>培训管理</h2>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <div className="sw-kpi-card">
            <div className="sw-kpi-card__label">总培训完成次数</div>
            <div className="sw-kpi-card__value">{totalCompleted}</div>
          </div>
          <div className="sw-kpi-card">
            <div className="sw-kpi-card__label">考核平均得分</div>
            <div className="sw-kpi-card__value">{avgScore}</div>
          </div>
          <div className="sw-kpi-card">
            <div className="sw-kpi-card__label">考核通过率</div>
            <div className="sw-kpi-card__value">{passRate}%</div>
          </div>
          <div className="sw-kpi-card">
            <div className="sw-kpi-card__label">最活跃培训人员</div>
            <div className="sw-kpi-card__value" style={{ fontSize: 16 }}>
              {topWorker}
              {topCount > 0 && <span style={{ fontSize: 12, color: "#64748B", marginLeft: 4 }}>({topCount}次)</span>}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="sw-filter" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <select
            value={filterWorker}
            onChange={(e) => setFilterWorker(e.target.value)}
            className={filterWorker ? "sw-filter--active" : ""}
          >
            <option value="">全部服务人员</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select
            value={filterItem}
            onChange={(e) => setFilterItem(e.target.value)}
            className={filterItem ? "sw-filter--active" : ""}
          >
            <option value="">全部服务项目</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className={filterMode ? "sw-filter--active" : ""}
          >
            <option value="">全部模式</option>
            <option value="guidance">引导</option>
            <option value="supervision">督导</option>
            <option value="exam">考核</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="sw-table" style={{ width: "100%" }}>
          <thead>
            <tr className="sw-table__head">
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#64748B" }}>服务人员</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#64748B" }}>培训项目</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#64748B" }}>子模式</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#64748B" }}>完成时间</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#64748B" }}>状态</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#64748B" }}>得分</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>
                  暂无培训记录
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const mc = MODE_COLORS[r.mode];
              return (
                <tr key={r.id} className="sw-table__row">
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>{r.workerName}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14 }}>{r.serviceItemName}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: mc.bg,
                        color: mc.fg,
                      }}
                    >
                      {MODE_LABELS[r.mode]}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748B" }}>
                    {new Date(r.completedAt).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>
                    <span
                      style={{
                        color:
                          r.status === "completed"
                            ? "#16A34A"
                            : r.status === "failed"
                            ? "#DC2626"
                            : "#EA580C",
                        fontWeight: 500,
                      }}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>
                    {r.mode === "exam" && r.score != null ? (
                      <span style={{ color: scoreColor(r.score) }}>{r.score}</span>
                    ) : (
                      <span style={{ color: "#CBD5E1" }}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
