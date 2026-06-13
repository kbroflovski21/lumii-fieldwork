import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { Play, Pause, SkipBack, Info } from "lucide-react";
import { authFetch } from "./api";
import "./radar-detail.css";

/* ── Types ── */

interface RadarSample {
  t: number;
  worker: { x: number; y: number; posture: string; movement: string };
  elder: { x: number; y: number; posture: string; movement: string; inBed: boolean };
  distance: number;
}

interface RadarSession {
  id: string;
  deviceId: string;
  serviceSessionId: string;
  workerName: string;
  elderName: string;
  startTime: string;
  endTime: string;
  duration: number;
  roomWidth: number;
  roomHeight: number;
  bedPosition: { x: number; y: number; width: number; height: number };
  samples: RadarSample[];
  distanceSummary: { close: number; nearby: number; far: number };
  workerMovementSummary: { large: number; medium: number; small: number };
  elderBedSummary: { lying_supine: number; lying_side: number; out_of_bed: number };
  elderMovementSummary: { large: number; medium: number; small: number };
}

/* ── Constants ── */

const COLORS = {
  worker: "#6b8fb5",
  elder: "#c08a72",
  close: "#7cb5a0",
  nearby: "#c4b07a",
  far: "#c4877d",
  large: "#c4877d",
  medium: "#c4b07a",
  small: "#7cb5a0",
  lying_supine: "#7b9ec4",
  lying_side: "#a394c0",
  out_of_bed: "#c9a46e",
};

const POSTURE_LABELS: Record<string, string> = {
  standing: "站立",
  bending: "弯腰",
  walking: "行走",
  lying_supine: "仰卧",
  lying_side: "侧卧",
  sitting: "坐姿",
};

const MOVEMENT_LABELS: Record<string, string> = {
  large: "大体动",
  medium: "中体动",
  small: "小体动",
};

/* ── AI Judgment Logic ── */

interface Judgment {
  pass: boolean;
  label: string;
  tooltip: string;
}

function computeJudgments(session: RadarSession): {
  distance: Judgment;
  workerMovement: Judgment;
  elderBed: Judgment;
  elderMovement: Judgment;
} {
  const { distanceSummary, workerMovementSummary, elderMovementSummary, samples } = session;

  const within1m = distanceSummary.close + distanceSummary.nearby;
  const distancePass = within1m >= 70;

  const workerSmall = workerMovementSummary.small;
  const workerPass = workerSmall < 30;

  const autonomousLeave = samples.some(s => !s.elder.inBed && s.distance > 1.0);
  const elderBedPass = !autonomousLeave;

  const elderSmall = elderMovementSummary.small;
  const elderMovementPass = elderSmall >= 90;

  return {
    distance: {
      pass: distancePass,
      label: distancePass ? "正常" : "存疑",
      tooltip: `判定逻辑：服务时长内，应有70%以上时长距离在1米以内。当前1米以内占比：${within1m.toFixed(1)}%。`,
    },
    workerMovement: {
      pass: workerPass,
      label: workerPass ? "正常" : "存疑",
      tooltip: `判定逻辑：服务时长内，小体动占比应小于30%。当前小体动占比：${workerSmall.toFixed(1)}%。`,
    },
    elderBed: {
      pass: elderBedPass,
      label: elderBedPass ? "正常" : "存疑",
      tooltip: `判定逻辑：服务时长内，不应出现自主离床事件（老人离床且服务人员距离超过1米）。${autonomousLeave ? "检测到自主离床事件。" : "未检测到自主离床事件。"}`,
    },
    elderMovement: {
      pass: elderMovementPass,
      label: elderMovementPass ? "正常" : "存疑",
      tooltip: `判定逻辑：服务时长内，小体动占比应大于90%（符合失能特征）。当前小体动占比：${elderSmall.toFixed(1)}%。`,
    },
  };
}

/* ── Judgment Badge ── */

function JudgmentBadge({ judgment }: { judgment: Judgment }) {
  return (
    <div className="radar-judgment">
      <span className="radar-judgment__label">AI综合判定：</span>
      <span className={`radar-judgment__result radar-judgment__result--${judgment.pass ? "pass" : "warn"}`}>
        {judgment.label}
      </span>
      <span className="radar-judgment__info-wrap">
        <Info size={14} className="radar-judgment__info-icon" />
        <span className="radar-judgment__tooltip">{judgment.tooltip}</span>
      </span>
    </div>
  );
}

/* ── Main Component ── */

export function RadarDetailView({ serviceSessionId }: { serviceSessionId: string }) {
  const [session, setSession] = useState<RadarSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    authFetch(`/api/radar-sessions/by-session/${serviceSessionId}`)
      .then(r => {
        if (!r.ok) throw new Error("加载失败");
        return r.json();
      })
      .then(data => {
        setSession(data);
        setLoading(false);
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : "加载失败");
        setLoading(false);
      });
  }, [serviceSessionId]);

  const judgments = useMemo(() => session ? computeJudgments(session) : null, [session]);

  if (loading) return <div className="radar-loading">雷达数据加载中...</div>;
  if (error) return <div className="radar-error">{error}</div>;
  if (!session || !judgments) return <div className="radar-empty">暂无雷达会话数据</div>;

  return (
    <div className="radar-detail">
      <div className="radar-session-header">
        <div className="radar-session-meta">
          <span>护理人员：<strong>{session.workerName}</strong></span>
          <span>服务对象：<strong>{session.elderName}</strong></span>
          <span>时长：<strong>{session.duration}分钟</strong></span>
          <span>房间：<strong>{session.roomWidth}m x {session.roomHeight}m</strong></span>
        </div>
      </div>

      {/* Section 1: side-by-side trajectory + combined heatmap */}
      <section className="radar-section">
        <h3 className="radar-section__title">基础统计数据</h3>
        <div className="radar-basics-row">
          <div className="radar-card radar-basics-row__traj">
            <h4 className="radar-card__title">全程轨迹动画</h4>
            <TrajectoryAnimation session={session} />
          </div>
          <div className="radar-card radar-basics-row__heat">
            <h4 className="radar-card__title">活动热力图</h4>
            <CombinedHeatmap session={session} />
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section className="radar-section">
        <h3 className="radar-section__title">服务人员服务轨迹验证</h3>
        <div className="radar-section__grid">
          <div className="radar-card">
            <h4 className="radar-card__title">护理轨迹判定</h4>
            <JudgmentBadge judgment={judgments.distance} />
            <DistanceAnalysis session={session} />
          </div>
          <div className="radar-card">
            <h4 className="radar-card__title">体动强度判定（护理人员）</h4>
            <JudgmentBadge judgment={judgments.workerMovement} />
            <MovementAnalysis
              samples={session.samples}
              role="worker"
              summary={session.workerMovementSummary}
            />
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section className="radar-section">
        <h3 className="radar-section__title">服务对象失能程度验证</h3>
        <div className="radar-section__grid">
          <div className="radar-card">
            <h4 className="radar-card__title">在床时长与姿态判定</h4>
            <JudgmentBadge judgment={judgments.elderBed} />
            <BedAnalysis session={session} />
          </div>
          <div className="radar-card">
            <h4 className="radar-card__title">体动强度判定（服务对象）</h4>
            <JudgmentBadge judgment={judgments.elderMovement} />
            <MovementAnalysis
              samples={session.samples}
              role="elder"
              summary={session.elderMovementSummary}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Trajectory Animation ── */

function TrajectoryAnimation({ session }: { session: RadarSession }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  const sample = session.samples[currentIndex];
  const totalSamples = session.samples.length;
  const svgWidth = 400;
  const svgHeight = svgWidth * (session.roomHeight / session.roomWidth);
  const scale = svgWidth / session.roomWidth;

  useEffect(() => {
    if (playing) {
      timerRef.current = window.setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= totalSamples - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 80);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, totalSamples]);

  const togglePlay = useCallback(() => {
    if (currentIndex >= totalSamples - 1) {
      setCurrentIndex(0);
      setPlaying(true);
    } else {
      setPlaying(p => !p);
    }
  }, [currentIndex, totalSamples]);

  const reset = useCallback(() => {
    setPlaying(false);
    setCurrentIndex(0);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const trailStart = Math.max(0, currentIndex - 20);
  const workerTrail = session.samples.slice(trailStart, currentIndex + 1);
  const elderTrail = session.samples.slice(trailStart, currentIndex + 1);

  return (
    <div className="traj-container">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="traj-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          x={1} y={1}
          width={svgWidth - 2} height={svgHeight - 2}
          fill="#f8f8f8" stroke="#999" strokeWidth={1.5} rx={4}
        />
        <rect
          x={session.bedPosition.x * scale}
          y={session.bedPosition.y * scale}
          width={session.bedPosition.width * scale}
          height={session.bedPosition.height * scale}
          fill="#e0d4c8" stroke="#b8a89c" strokeWidth={1} rx={3}
        />
        <text
          x={(session.bedPosition.x + session.bedPosition.width / 2) * scale}
          y={(session.bedPosition.y + session.bedPosition.height / 2) * scale}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={11} fill="#8c7c70"
        >
          床
        </text>
        <rect x={0} y={svgHeight - 30} width={6} height={24} fill="#a0522d" rx={1} />
        <text x={12} y={svgHeight - 14} fontSize={9} fill="#999">门</text>

        {workerTrail.length > 1 && (
          <polyline
            points={workerTrail.map(s => `${s.worker.x * scale},${s.worker.y * scale}`).join(" ")}
            fill="none" stroke={COLORS.worker} strokeWidth={1.5} opacity={0.3}
          />
        )}
        {elderTrail.length > 1 && (
          <polyline
            points={elderTrail.map(s => `${s.elder.x * scale},${s.elder.y * scale}`).join(" ")}
            fill="none" stroke={COLORS.elder} strokeWidth={1.5} opacity={0.3}
          />
        )}

        {sample && (
          <circle
            cx={sample.worker.x * scale} cy={sample.worker.y * scale}
            r={7} fill={COLORS.worker} stroke="#fff" strokeWidth={2}
          />
        )}
        {sample && (
          <circle
            cx={sample.elder.x * scale} cy={sample.elder.y * scale}
            r={7} fill={COLORS.elder} stroke="#fff" strokeWidth={2}
          />
        )}

        <circle cx={svgWidth - 90} cy={14} r={5} fill={COLORS.worker} />
        <text x={svgWidth - 80} y={18} fontSize={10} fill="#333">护理人员</text>
        <circle cx={svgWidth - 90} cy={30} r={5} fill={COLORS.elder} />
        <text x={svgWidth - 80} y={34} fontSize={10} fill="#333">服务对象</text>
      </svg>

      <div className="traj-controls">
        <button className="traj-btn" onClick={reset} title="重置" type="button">
          <SkipBack size={16} />
        </button>
        <button className="traj-btn" onClick={togglePlay} title={playing ? "暂停" : "播放"} type="button">
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <input
          type="range"
          className="traj-slider"
          min={0}
          max={totalSamples - 1}
          value={currentIndex}
          onChange={e => {
            setPlaying(false);
            setCurrentIndex(Number(e.target.value));
          }}
        />
        <span className="traj-time">{sample ? formatTime(sample.t) : "00:00"}</span>
      </div>

      {sample && (
        <div className="traj-info">
          <div className="traj-info__col">
            <span className="traj-info__label" style={{ color: COLORS.worker }}>护理人员</span>
            <span>位置: ({sample.worker.x.toFixed(1)}, {sample.worker.y.toFixed(1)})</span>
            <span>姿态: {POSTURE_LABELS[sample.worker.posture] ?? sample.worker.posture}</span>
            <span>体动: {MOVEMENT_LABELS[sample.worker.movement]}</span>
          </div>
          <div className="traj-info__col">
            <span className="traj-info__label" style={{ color: COLORS.elder }}>服务对象</span>
            <span>位置: ({sample.elder.x.toFixed(1)}, {sample.elder.y.toFixed(1)})</span>
            <span>姿态: {POSTURE_LABELS[sample.elder.posture] ?? sample.elder.posture}</span>
            <span>{sample.elder.inBed ? "在床" : "离床"}</span>
          </div>
          <div className="traj-info__col">
            <span className="traj-info__label">距离</span>
            <span className="traj-info__distance">{sample.distance.toFixed(2)}m</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Combined Heatmap (both roles on one map) ── */

function CombinedHeatmap({ session }: { session: RadarSession }) {
  const gridSize = 20;
  const svgWidth = 400;
  const svgHeight = svgWidth * (session.roomHeight / session.roomWidth);
  const cellW = svgWidth / gridSize;
  const cellH = svgHeight / gridSize;
  const scale = svgWidth / session.roomWidth;

  const { workerGrid, elderGrid, maxCount } = useMemo(() => {
    const wGrid = Array.from({ length: gridSize }, () => new Array(gridSize).fill(0));
    const eGrid = Array.from({ length: gridSize }, () => new Array(gridSize).fill(0));
    let max = 1;

    for (const s of session.samples) {
      const wCol = Math.min(Math.floor((s.worker.x / session.roomWidth) * gridSize), gridSize - 1);
      const wRow = Math.min(Math.floor((s.worker.y / session.roomHeight) * gridSize), gridSize - 1);
      wGrid[wRow][wCol]++;

      const eCol = Math.min(Math.floor((s.elder.x / session.roomWidth) * gridSize), gridSize - 1);
      const eRow = Math.min(Math.floor((s.elder.y / session.roomHeight) * gridSize), gridSize - 1);
      eGrid[eRow][eCol]++;

      max = Math.max(max, wGrid[wRow][wCol], eGrid[eRow][eCol]);
    }

    return { workerGrid: wGrid, elderGrid: eGrid, maxCount: max };
  }, [session]);

  return (
    <div className="heatmap-container">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="heatmap-svg-combined" preserveAspectRatio="xMidYMid meet">
        <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#f8f8f8" rx={4} />
        {/* Bed outline */}
        <rect
          x={session.bedPosition.x * scale}
          y={session.bedPosition.y * scale}
          width={session.bedPosition.width * scale}
          height={session.bedPosition.height * scale}
          fill="none" stroke="#b8a89c" strokeWidth={1} rx={3} strokeDasharray="4 2"
        />
        <text
          x={(session.bedPosition.x + session.bedPosition.width / 2) * scale}
          y={(session.bedPosition.y + session.bedPosition.height / 2) * scale}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={10} fill="#b8a89c"
        >
          床
        </text>
        {/* Worker heatmap layer */}
        {workerGrid.map((row, ri) =>
          row.map((count, ci) =>
            count > 0 ? (
              <rect
                key={`w-${ri}-${ci}`}
                x={ci * cellW} y={ri * cellH}
                width={cellW} height={cellH}
                fill={COLORS.worker}
                opacity={Math.min(count / maxCount, 1) * 0.6 + 0.05}
              />
            ) : null
          )
        )}
        {/* Elder heatmap layer */}
        {elderGrid.map((row, ri) =>
          row.map((count, ci) =>
            count > 0 ? (
              <rect
                key={`e-${ri}-${ci}`}
                x={ci * cellW} y={ri * cellH}
                width={cellW} height={cellH}
                fill={COLORS.elder}
                opacity={Math.min(count / maxCount, 1) * 0.6 + 0.05}
              />
            ) : null
          )
        )}
        {/* Legend */}
        <rect x={svgWidth - 110} y={8} width={100} height={36} fill="rgba(255,255,255,0.85)" rx={4} />
        <rect x={svgWidth - 102} y={15} width={10} height={10} fill={COLORS.worker} opacity={0.7} rx={2} />
        <text x={svgWidth - 88} y={24} fontSize={10} fill="#333">护理人员</text>
        <rect x={svgWidth - 102} y={29} width={10} height={10} fill={COLORS.elder} opacity={0.7} rx={2} />
        <text x={svgWidth - 88} y={38} fontSize={10} fill="#333">服务对象</text>
      </svg>
    </div>
  );
}

/* ── Distance Analysis ── */

function DistanceAnalysis({ session }: { session: RadarSession }) {
  const timeData = useMemo(() => {
    const minuteMap: Record<number, { close: number; nearby: number; far: number; total: number }> = {};
    for (const s of session.samples) {
      const min = Math.floor(s.t / 60);
      if (!minuteMap[min]) minuteMap[min] = { close: 0, nearby: 0, far: 0, total: 0 };
      minuteMap[min].total++;
      if (s.distance < 0.5) minuteMap[min].close++;
      else if (s.distance < 1.0) minuteMap[min].nearby++;
      else minuteMap[min].far++;
    }
    return Object.entries(minuteMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([min, d]) => ({
        name: `${min}分`,
        "近距接触": d.close,
        "近旁": d.nearby,
        "远距": d.far,
      }));
  }, [session]);

  const pieData = [
    { name: "近距接触 (<0.5m)", value: session.distanceSummary.close, color: COLORS.close },
    { name: "近旁 (0.5-1m)", value: session.distanceSummary.nearby, color: COLORS.nearby },
    { name: "远距 (>1m)", value: session.distanceSummary.far, color: COLORS.far },
  ];

  return (
    <div className="analysis-container">
      <div className="analysis-chart">
        <h5 className="analysis-chart__title">时间分布</h5>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={timeData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <XAxis dataKey="name" fontSize={10} interval="preserveStartEnd" />
            <YAxis fontSize={10} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="近距接触" stackId="a" fill={COLORS.close} />
            <Bar dataKey="近旁" stackId="a" fill={COLORS.nearby} />
            <Bar dataKey="远距" stackId="a" fill={COLORS.far} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="analysis-pie">
        <h5 className="analysis-chart__title">总占比</h5>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%" cy="50%"
              innerRadius={40} outerRadius={70}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}%`}
              labelLine={false}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Movement Analysis (shared for worker & elder) ── */

function MovementAnalysis({ samples, role, summary }: {
  samples: RadarSample[];
  role: "worker" | "elder";
  summary: { large: number; medium: number; small: number };
}) {
  const timeData = useMemo(() => {
    const minuteMap: Record<number, { large: number; medium: number; small: number }> = {};
    for (const s of samples) {
      const min = Math.floor(s.t / 60);
      if (!minuteMap[min]) minuteMap[min] = { large: 0, medium: 0, small: 0 };
      const mv = role === "worker" ? s.worker.movement : s.elder.movement;
      minuteMap[min][mv as "large" | "medium" | "small"]++;
    }
    return Object.entries(minuteMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([min, d]) => ({
        name: `${min}分`,
        "大体动": d.large,
        "中体动": d.medium,
        "小体动": d.small,
      }));
  }, [samples, role]);

  const pieData = [
    { name: "大体动", value: summary.large, color: COLORS.large },
    { name: "中体动", value: summary.medium, color: COLORS.medium },
    { name: "小体动", value: summary.small, color: COLORS.small },
  ];

  return (
    <div className="analysis-container">
      <div className="analysis-chart">
        <h5 className="analysis-chart__title">时间分布</h5>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={timeData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <XAxis dataKey="name" fontSize={10} interval="preserveStartEnd" />
            <YAxis fontSize={10} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="大体动" stackId="a" fill={COLORS.large} />
            <Bar dataKey="中体动" stackId="a" fill={COLORS.medium} />
            <Bar dataKey="小体动" stackId="a" fill={COLORS.small} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="analysis-pie">
        <h5 className="analysis-chart__title">总占比</h5>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%" cy="50%"
              innerRadius={40} outerRadius={70}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}%`}
              labelLine={false}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Bed Analysis ── */

function BedAnalysis({ session }: { session: RadarSession }) {
  const timeData = useMemo(() => {
    const minuteMap: Record<number, { lying_supine: number; lying_side: number; out_of_bed: number }> = {};
    for (const s of session.samples) {
      const min = Math.floor(s.t / 60);
      if (!minuteMap[min]) minuteMap[min] = { lying_supine: 0, lying_side: 0, out_of_bed: 0 };
      if (!s.elder.inBed) {
        minuteMap[min].out_of_bed++;
      } else if (s.elder.posture === "lying_supine") {
        minuteMap[min].lying_supine++;
      } else {
        minuteMap[min].lying_side++;
      }
    }
    return Object.entries(minuteMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([min, d]) => ({
        name: `${min}分`,
        "在床-仰卧": d.lying_supine,
        "在床-侧卧": d.lying_side,
        "离床": d.out_of_bed,
      }));
  }, [session]);

  const pieData = [
    { name: "在床-仰卧", value: session.elderBedSummary.lying_supine, color: COLORS.lying_supine },
    { name: "在床-侧卧", value: session.elderBedSummary.lying_side, color: COLORS.lying_side },
    { name: "离床", value: session.elderBedSummary.out_of_bed, color: COLORS.out_of_bed },
  ];

  return (
    <div className="analysis-container">
      <div className="analysis-chart">
        <h5 className="analysis-chart__title">时间分布</h5>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={timeData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <XAxis dataKey="name" fontSize={10} interval="preserveStartEnd" />
            <YAxis fontSize={10} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="在床-仰卧" stackId="a" fill={COLORS.lying_supine} />
            <Bar dataKey="在床-侧卧" stackId="a" fill={COLORS.lying_side} />
            <Bar dataKey="离床" stackId="a" fill={COLORS.out_of_bed} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="analysis-pie">
        <h5 className="analysis-chart__title">总占比</h5>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%" cy="50%"
              innerRadius={40} outerRadius={70}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}%`}
              labelLine={false}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
