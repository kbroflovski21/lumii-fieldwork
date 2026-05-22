import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { SiteOperationsHomeResponse } from "./contracts";
import type { Resource } from "./useSiteOperationsData";

type Period = "day" | "week" | "month";
type SortCol = "name" | "count" | "s" | "a" | "b" | "c" | "d" | "delta";
type SortDir = "asc" | "desc";

type WorkerScore = {
  id: string;
  name: string;
  serviceCount: number;
  avgS: number;
  avgA: number;
  avgB: number;
  avgC: number;
  avgD: number;
  prevAvgS: number;
  delta: number;
};

type TrendPoint = { label: string; avgS: number };

function buildMockWorkers(period: Period): WorkerScore[] {
  const monthData = [
    { id: "w1", name: "李明", count: 24, s: 34.2, a: 8.8, b: 6.2, c: 9.0, d: 10.2, prev: 32.5 },
    { id: "w2", name: "王芳", count: 18, s: 31.5, a: 8.2, b: 5.0, c: 8.3, d: 10.0, prev: 30.8 },
    { id: "w3", name: "张伟", count: 22, s: 33.1, a: 8.5, b: 5.8, c: 8.8, d: 10.0, prev: 32.0 },
    { id: "w4", name: "陈静", count: 15, s: 28.5, a: 7.2, b: 4.8, c: 7.5, d: 9.0, prev: 29.2 },
    { id: "w5", name: "刘洋", count: 20, s: 31.8, a: 8.0, b: 5.5, c: 8.3, d: 10.0, prev: 30.5 },
  ];
  const weekData = [
    { id: "w1", name: "李明", count: 6, s: 35.0, a: 9.0, b: 6.5, c: 9.2, d: 10.3, prev: 33.8 },
    { id: "w2", name: "王芳", count: 4, s: 30.2, a: 7.8, b: 5.0, c: 8.0, d: 9.4, prev: 31.5 },
    { id: "w3", name: "张伟", count: 5, s: 33.1, a: 8.5, b: 5.8, c: 8.8, d: 10.0, prev: 32.0 },
    { id: "w4", name: "陈静", count: 3, s: 28.5, a: 7.2, b: 4.8, c: 7.5, d: 9.0, prev: 29.2 },
    { id: "w5", name: "刘洋", count: 4, s: 31.8, a: 8.0, b: 5.5, c: 8.3, d: 10.0, prev: 30.5 },
  ];
  const dayData = [
    { id: "w1", name: "李明", count: 2, s: 36.0, a: 9.2, b: 7.0, c: 9.5, d: 10.3, prev: 34.5 },
    { id: "w3", name: "张伟", count: 1, s: 34.0, a: 8.8, b: 6.0, c: 9.0, d: 10.2, prev: 33.1 },
    { id: "w5", name: "刘洋", count: 2, s: 33.0, a: 8.5, b: 5.8, c: 8.7, d: 10.0, prev: 31.8 },
  ];
  const data = period === "day" ? dayData : period === "week" ? weekData : monthData;
  return data.map((w) => ({
    id: w.id, name: w.name, serviceCount: w.count,
    avgS: w.s, avgA: w.a, avgB: w.b, avgC: w.c, avgD: w.d,
    prevAvgS: w.prev, delta: +(w.s - w.prev).toFixed(1),
  }));
}

function buildMockTrend(_workerId: string, period: Period): TrendPoint[] {
  const labels = period === "day"
    ? ["5/11","5/12","5/13","5/14","5/15","5/16","5/17","5/18","5/19","5/20","5/21","5/22"]
    : period === "week"
    ? ["W06","W07","W08","W09","W10","W11","W12","W13","W14","W15","W16","W17"]
    : ["2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"];
  const base = 28 + Math.random() * 6;
  return labels.map((m, i) => ({
    label: m,
    avgS: Math.min(40, Math.max(10, +(base + (Math.random() - 0.3) * 4 + i * 0.3).toFixed(1))),
  }));
}

export function HomeArea({ resource, onRoute }: { resource: Resource<SiteOperationsHomeResponse>; onRoute?: (area: string) => void }) {
  const [period, setPeriod] = useState<Period>("month");
  const [sortCol, setSortCol] = useState<SortCol>("s");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [detailWorker, setDetailWorker] = useState<WorkerScore | null>(null);
  const [workerTableExpanded, setWorkerTableExpanded] = useState(false);

  const workers = useMemo(() => buildMockWorkers(period), [period]);

  const periodLabel = period === "month" ? "本月" : period === "week" ? "本周" : "今日";
  const prevLabel = period === "month" ? "上月" : period === "week" ? "上周" : "昨日";

  const periodDateLabel = useMemo(() => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    if (period === "day") return `${now.getFullYear()}年${m}月${d}日`;
    if (period === "month") return `${now.getFullYear()}年 ${m}月（${m}/1 - ${m}/${d}）`;
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return `${now.getFullYear()}年 第${weekNum}周（${mon.getMonth() + 1}/${mon.getDate()} - ${sun.getMonth() + 1}/${sun.getDate()}）`;
  }, [period]);

  const summary = useMemo(() => {
    const ws = workers;
    const n = ws.length || 1;
    const avgS = +(ws.reduce((s, w) => s + w.avgS, 0) / n).toFixed(1);
    const prevAvgS = +(ws.reduce((s, w) => s + w.prevAvgS, 0) / n).toFixed(1);
    const avgSDelta = +(avgS - prevAvgS).toFixed(1);
    const totalServices = ws.reduce((s, w) => s + w.serviceCount, 0);
    const workerCount = ws.length;
    const elderCount = Math.round(totalServices * 0.55);
    const avgServicePerElder = elderCount > 0 ? +(totalServices / elderCount).toFixed(1) : 0;
    const serviceDelta = period === "day" ? 8 : period === "week" ? 13 : 13;
    const workerDelta = period === "day" ? 5 : period === "week" ? 10 : 15;
    const improved = ws.filter((w) => w.delta > 0).length;
    const declined = ws.filter((w) => w.delta < 0).length;
    const subscriptionRate = 72;
    const subscriptionDelta = 4.1;
    const bestWorker = ws.reduce((best, w) => w.avgS > best.avgS ? w : best, ws[0]);
    return { avgS, prevAvgS, avgSDelta, totalServices, workerCount, elderCount, avgServicePerElder, serviceDelta, workerDelta, improved, declined, subscriptionRate, subscriptionDelta, bestWorkerName: bestWorker?.name ?? "—", bestWorkerScore: bestWorker?.avgS ?? 0 };
  }, [workers, period]);

  const sortedWorkers = useMemo(() => {
    const arr = [...workers];
    arr.sort((a, b) => {
      const key = sortCol === "name" ? sortCol : sortCol === "count" ? "serviceCount" : sortCol === "s" ? "avgS" : sortCol === "a" ? "avgA" : sortCol === "b" ? "avgB" : sortCol === "c" ? "avgC" : sortCol === "d" ? "avgD" : "delta";
      const va = a[key as keyof WorkerScore], vb = b[key as keyof WorkerScore];
      if (typeof va === "string" && typeof vb === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return arr;
  }, [workers, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }
  function sortIcon(col: SortCol) {
    if (sortCol !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  if (resource.status === "loading" || resource.status === "idle") {
    return <div className="site-operations-placeholder">首页数据加载中</div>;
  }
  if (resource.status === "error") {
    return <section aria-label="首页" className="hd-page"><div className="home-overview__empty"><strong>加载失败</strong><span>{resource.error}</span></div></section>;
  }
  if (resource.status !== "success") {
    return <div className="site-operations-placeholder">首页数据加载中</div>;
  }

  return (
    <section aria-label="首页" className="hd-page">
      {/* ── Page header ── */}
      <div className="hd-header">
        <div className="hd-header__left">
          <div className="hd-header__title">首页</div>
          <div className="hd-context-badge">{periodDateLabel}</div>
        </div>
        <div className="hd-header__controls">
          <div className="hd-period-toggle">
            <button className={`hd-period-btn${period === "day" ? " hd-period-btn--active" : ""}`} onClick={() => setPeriod("day")}>日</button>
            <button className={`hd-period-btn${period === "week" ? " hd-period-btn--active" : ""}`} onClick={() => setPeriod("week")}>周</button>
            <button className={`hd-period-btn${period === "month" ? " hd-period-btn--active" : ""}`} onClick={() => setPeriod("month")}>月</button>
          </div>
        </div>
      </div>

      {/* ═══ Section 1: 运营数据 ═══ */}
      <div className="hd-section">
        <div className="hd-section__header">
          <span className="hd-section__title">运营数据 - 服务了多少长者？</span>
          <span className="hd-section__context">{periodDateLabel}</span>
        </div>
      </div>
      <div className="hd-kpi-grid">
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">{periodLabel}总服务次数</div>
          <div className="hd-kpi-card__value">{summary.totalServices}次</div>
          <div className="hd-kpi-card__sub" style={{ color: summary.serviceDelta >= 0 ? "var(--site-success-text)" : "var(--site-danger-text)" }}>
            {summary.serviceDelta >= 0 ? "+" : ""}{summary.serviceDelta}%
          </div>
        </div>
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">出动服务人员数量</div>
          <div className="hd-kpi-card__value">{summary.workerCount}人</div>
          <div className="hd-kpi-card__sub" style={{ color: summary.workerDelta >= 0 ? "var(--site-success-text)" : "var(--site-danger-text)" }}>
            {summary.workerDelta >= 0 ? "+" : ""}{summary.workerDelta}%
          </div>
        </div>
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">覆盖长者数量</div>
          <div className="hd-kpi-card__value">{summary.elderCount}人</div>
          <div className="hd-kpi-card__sub">平均每名长者接受 {summary.avgServicePerElder} 次服务</div>
        </div>
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">家属订阅率</div>
          <div className="hd-kpi-card__value">{summary.subscriptionRate}%</div>
          <div className="hd-kpi-card__sub" style={{ color: summary.subscriptionDelta >= 0 ? "var(--site-success-text)" : "var(--site-danger-text)" }}>
            {summary.subscriptionDelta >= 0 ? "▲" : "▼"} 较{prevLabel}{summary.subscriptionDelta >= 0 ? "上升" : "下降"} {Math.abs(summary.subscriptionDelta)}%
          </div>
        </div>
      </div>

      {/* ═══ Section 2: 质量数据 ═══ */}
      <div className="hd-section">
        <div className="hd-section__header">
          <span className="hd-section__title">质量数据 - 员工服务质量如何？</span>
          <span className="hd-section__context">{periodDateLabel}</span>
        </div>
      </div>

      <div className="hd-kpi-grid">
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">{periodLabel}平均服务质量总分</div>
          <div className="hd-kpi-card__value">{summary.avgS}</div>
          <div className="hd-kpi-card__sub">满分 40</div>
        </div>
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">相比{prevLabel}变化</div>
          <div className="hd-kpi-card__value" style={{ color: summary.avgSDelta >= 0 ? "var(--site-success-text)" : "var(--site-danger-text)" }}>
            {summary.avgSDelta >= 0 ? "+" : ""}{summary.avgSDelta}
          </div>
          <div className="hd-kpi-card__sub">{prevLabel}均分 {summary.prevAvgS}</div>
        </div>
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">服务人员 进步 / 退步</div>
          <div className="hd-kpi-card__value">
            <span style={{ color: "var(--site-success-text)" }}>{summary.improved}</span>
            {" / "}
            <span style={{ color: "var(--site-danger-text)" }}>{summary.declined}</span>
          </div>
          <div className="hd-kpi-card__sub">较{prevLabel}变动人数</div>
        </div>
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">表现最佳员工</div>
          <div className="hd-kpi-card__value">{summary.bestWorkerName}</div>
          <div className="hd-kpi-card__sub">S 均分 {summary.bestWorkerScore.toFixed(1)}</div>
        </div>
      </div>

      {/* Worker scoring table */}
      <div className="hd-table-wrap" style={{ marginTop: 20 }}>
        <table className="hd-worker-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")}>姓名{sortIcon("name")}</th>
              <th onClick={() => handleSort("count")}>服务次数{sortIcon("count")}</th>
              <th onClick={() => handleSort("s")}>S 均分{sortIcon("s")}<div className="hd-th-sub">总分 A+B+C+D</div></th>
              <th onClick={() => handleSort("a")}>A 均分{sortIcon("a")}<div className="hd-th-sub">长者评价</div></th>
              <th onClick={() => handleSort("b")}>B 均分{sortIcon("b")}<div className="hd-th-sub">家属评价</div></th>
              <th onClick={() => handleSort("c")}>C 均分{sortIcon("c")}<div className="hd-th-sub">SOP 符合度</div></th>
              <th onClick={() => handleSort("d")}>D 均分{sortIcon("d")}<div className="hd-th-sub">特殊识别</div></th>
              <th onClick={() => handleSort("delta")}>较{prevLabel}{sortIcon("delta")}</th>
            </tr>
          </thead>
          <tbody>
            {(workerTableExpanded ? sortedWorkers : sortedWorkers.slice(0, 4)).map((w) => (
              <tr key={w.id}>
                <td><a className="hd-worker-table__name" href="#" onClick={(e) => { e.preventDefault(); setDetailWorker(w); }}>{w.name}</a></td>
                <td>{w.serviceCount}</td>
                <td><span className={scoreClass(w.avgS)}>{w.avgS.toFixed(1)}</span></td>
                <td>{w.avgA.toFixed(1)}</td>
                <td>{w.avgB.toFixed(1)}</td>
                <td>{w.avgC.toFixed(1)}</td>
                <td>{w.avgD.toFixed(1)}</td>
                <td><span className={deltaClass(w.delta)}>{deltaArrow(w.delta)} {deltaText(w.delta)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedWorkers.length > 4 && (
          <button className="hd-table-toggle" onClick={() => setWorkerTableExpanded(!workerTableExpanded)}>
            {workerTableExpanded ? "收起" : `展开全部 ${sortedWorkers.length} 名员工`}
          </button>
        )}
      </div>

      {detailWorker && (
        <WorkerDetailModal worker={detailWorker} period={period} prevLabel={prevLabel} onClose={() => setDetailWorker(null)} />
      )}
    </section>
  );
}

function scoreClass(s: number) {
  if (s >= 35) return "hd-score hd-score--high";
  if (s >= 28) return "hd-score hd-score--mid";
  return "hd-score hd-score--low";
}
function deltaClass(d: number) {
  if (d > 0) return "hd-delta hd-delta--up";
  if (d < 0) return "hd-delta hd-delta--down";
  return "hd-delta";
}
function deltaArrow(d: number) { return d > 0 ? "▲" : d < 0 ? "▼" : "–"; }
function deltaText(d: number) { return d === 0 ? "持平" : Math.abs(d).toFixed(1); }

function WorkerDetailModal({ worker, period, prevLabel, onClose }: { worker: WorkerScore; period: Period; prevLabel: string; onClose: () => void }) {
  const trend = useMemo(() => buildMockTrend(worker.id, period), [worker.id, period]);
  return (
    <div className="hd-modal-overlay" onClick={onClose}>
      <div className="hd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hd-modal__header">
          <div className="hd-modal__name">{worker.name}</div>
          <button className="hd-modal__close" onClick={onClose} type="button"><X size={16} /></button>
        </div>
        <div className="hd-modal__scores">
          <div className="hd-modal__score-item"><span className="hd-modal__score-label">S 总分</span><span className={`hd-modal__score-value ${scoreClass(worker.avgS)}`}>{worker.avgS.toFixed(1)}</span></div>
          <div className="hd-modal__score-item"><span className="hd-modal__score-label">A 长者</span><span className="hd-modal__score-value">{worker.avgA.toFixed(1)}</span></div>
          <div className="hd-modal__score-item"><span className="hd-modal__score-label">B 家属</span><span className="hd-modal__score-value">{worker.avgB.toFixed(1)}</span></div>
          <div className="hd-modal__score-item"><span className="hd-modal__score-label">C SOP</span><span className="hd-modal__score-value">{worker.avgC.toFixed(1)}</span></div>
          <div className="hd-modal__score-item"><span className="hd-modal__score-label">D 特殊</span><span className="hd-modal__score-value">{worker.avgD.toFixed(1)}</span></div>
          <div className="hd-modal__score-item"><span className="hd-modal__score-label">较{prevLabel}</span><span className={`hd-modal__score-value ${deltaClass(worker.delta)}`}>{deltaArrow(worker.delta)} {deltaText(worker.delta)}</span></div>
        </div>
        <div className="hd-modal__chart">
          <div className="hd-modal__chart-title">S 分趋势</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 40]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => [Number(value).toFixed(1), "S 分"]} />
              <Line type="monotone" dataKey="avgS" stroke="var(--site-accent, #EB6420)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
