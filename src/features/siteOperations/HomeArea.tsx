import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { SiteOperationsHomeResponse } from "./contracts";
import type { Resource } from "./useSiteOperationsData";

type Period = "week" | "month";
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

type TrendPoint = {
  label: string;
  avgS: number;
};

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
  const data = period === "week" ? weekData : monthData;
  return data.map((w) => ({
    id: w.id, name: w.name, serviceCount: w.count,
    avgS: w.s, avgA: w.a, avgB: w.b, avgC: w.c, avgD: w.d,
    prevAvgS: w.prev, delta: +(w.s - w.prev).toFixed(1),
  }));
}

function buildMockTrend(_workerId: string, period: Period): TrendPoint[] {
  const labels = period === "week"
    ? ["W06", "W07", "W08", "W09", "W10", "W11", "W12", "W13", "W14", "W15", "W16", "W17"]
    : ["2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];
  const base = 28 + Math.random() * 6;
  return labels.map((m, i) => ({
    label: m,
    avgS: Math.min(40, Math.max(10, +(base + (Math.random() - 0.3) * 4 + i * 0.3).toFixed(1))),
  }));
}

export function HomeArea({ resource, onRoute }: { resource: Resource<SiteOperationsHomeResponse>; onRoute?: (area: string) => void }) {
  const [period, setPeriod] = useState<Period>("week");
  const [sortCol, setSortCol] = useState<SortCol>("s");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [detailWorker, setDetailWorker] = useState<WorkerScore | null>(null);

  const workers = useMemo(() => buildMockWorkers(period), [period]);
  const siteAvgS = useMemo(() => {
    if (!workers.length) return 0;
    return +(workers.reduce((sum, w) => sum + w.avgS, 0) / workers.length).toFixed(1);
  }, [workers]);

  const periodLabel = period === "month" ? "本月" : "本周";
  const prevLabel = period === "month" ? "上月" : "上周";
  const periodDateLabel = useMemo(() => {
    const now = new Date();
    if (period === "month") return `${now.getFullYear()}年${now.getMonth() + 1}月`;
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return `${now.getFullYear()}年 第${weekNum}周（${mon.getMonth() + 1}/${mon.getDate()} - ${sun.getMonth() + 1}/${sun.getDate()}）`;
  }, [period]);

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
    if (sortCol !== col) return " ↕";
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

  const { summary } = resource.data;

  return (
    <section aria-label="首页" className="hd-page">
      <div className="hd-header">
        <div>
          <div className="hd-header__title">首页</div>
          <div className="hd-header__subtitle">本站服务运营与质量概览</div>
        </div>
        <div className="hd-header__controls">
          <div className="hd-period-toggle">
            <button className={`hd-period-btn${period === "week" ? " hd-period-btn--active" : ""}`} onClick={() => setPeriod("week")}>周</button>
            <button className={`hd-period-btn${period === "month" ? " hd-period-btn--active" : ""}`} onClick={() => setPeriod("month")}>月</button>
          </div>
          <span className="hd-period-label">{periodDateLabel}</span>
        </div>
      </div>

      <div className="hd-kpi-grid">
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">今日服务 已完成/待完成</div>
          <div className="hd-kpi-card__value">{summary.totalScheduledServices - summary.unassignedServices}/{summary.unassignedServices + summary.recordsNeedReview}</div>
          <div className="hd-kpi-card__sub">本站今日排期</div>
        </div>
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">待排班缺口</div>
          <a className="hd-kpi-card__value hd-kpi-card__value--warning hd-kpi-card__link" href="#" onClick={(e) => { e.preventDefault(); onRoute?.("service_schedules"); }}>
            {summary.unassignedServices}
          </a>
          <div className="hd-kpi-card__sub">未分配服务数</div>
        </div>
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">待复核服务记录</div>
          <a className="hd-kpi-card__value hd-kpi-card__value--accent hd-kpi-card__link" href="#" onClick={(e) => { e.preventDefault(); onRoute?.("service_records"); }}>
            {summary.recordsNeedReview}
          </a>
          <div className="hd-kpi-card__sub">需确认记录</div>
        </div>
        <div className="hd-kpi-card">
          <div className="hd-kpi-card__label">{periodLabel}全站平均服务质量分</div>
          <div className="hd-kpi-card__value">{siteAvgS}</div>
          <div className="hd-kpi-card__sub">满分 40</div>
        </div>
      </div>

      <div className="hd-section">
        <div className="hd-section__title">员工服务质量评分</div>
        <div className="hd-table-wrap">
          <table className="hd-worker-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("name")}>姓名{sortIcon("name")}</th>
                <th onClick={() => handleSort("count")}>服务次数{sortIcon("count")}</th>
                <th onClick={() => handleSort("s")}>S 均分{sortIcon("s")}<div className="hd-th-sub">总分 A+B+C+D</div></th>
                <th onClick={() => handleSort("a")}>A 均分{sortIcon("a")}<div className="hd-th-sub">服务对象评价</div></th>
                <th onClick={() => handleSort("b")}>B 均分{sortIcon("b")}<div className="hd-th-sub">家属评价</div></th>
                <th onClick={() => handleSort("c")}>C 均分{sortIcon("c")}<div className="hd-th-sub">SOP 符合度</div></th>
                <th onClick={() => handleSort("d")}>D 均分{sortIcon("d")}<div className="hd-th-sub">特殊识别</div></th>
                <th onClick={() => handleSort("delta")}>较{prevLabel}{sortIcon("delta")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedWorkers.map((w) => (
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
        </div>
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
          <div className="hd-modal__score-item"><span className="hd-modal__score-label">A 服务对象</span><span className="hd-modal__score-value">{worker.avgA.toFixed(1)}</span></div>
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
              <Line type="monotone" dataKey="avgS" stroke="var(--site-accent, #0b5bd3)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
