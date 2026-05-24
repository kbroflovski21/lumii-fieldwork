import React, { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import { Bot, Edit3, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../auth/AuthContext";
import { CopilotPanel } from "../features/siteOperations/CopilotPanel";
import { useAgentChat } from "../features/siteOperations/useAgentChat";
import { ADMIN_COMMANDS, HeaderCopilotInput } from "../features/siteOperations/CommandInput";
import { ProfileMenu } from "../shared/ProfileMenu";
import { SupervisorContent } from "../supervisor/SupervisorContent";
import "./quality.css";

/* ── Types ── */

type Period = "day" | "week" | "month";

interface WorkerPeriodScore {
  socialWorkerId: string;
  socialWorkerName: string;
  siteId: string;
  siteName: string;
  serviceCount: number;
  avgS: number;
  avgA: number;
  avgB: number;
  avgC: number;
  avgD: number;
  prevAvgS: number | null;
  delta: number | null;
}

interface SitePeriodScore {
  siteId: string;
  siteName: string;
  workerCount: number;
  serviceCount: number;
  avgS: number;
  avgA: number;
  avgB: number;
  avgC: number;
  avgD: number;
  prevAvgS: number | null;
  delta: number | null;
}

interface TrendPoint {
  label: string;
  avgS: number;
  avgA: number;
  avgB: number;
  avgC: number;
  avgD: number;
  serviceCount: number;
}

/* ── Mock data for quality dashboard ── */

const MOCK_SITES = [
  { id: "site-001", name: "翠苑站" },
  { id: "site-002", name: "三墩站" },
  { id: "site-003", name: "古荡站" },
  { id: "site-004", name: "文新站" },
];

function buildMockWorkers(period: Period): WorkerPeriodScore[] {
  const monthData = [
    { id: "w1", name: "李明", siteId: "site-001", siteName: "翠苑站", count: 24, s: 34.2, a: 8.8, b: 6.2, c: 9.0, d: 10.2, prev: 32.5 },
    { id: "w2", name: "王芳", siteId: "site-001", siteName: "翠苑站", count: 18, s: 31.5, a: 8.2, b: 5.0, c: 8.3, d: 10.0, prev: 30.8 },
    { id: "w3", name: "张伟", siteId: "site-002", siteName: "三墩站", count: 22, s: 28.6, a: 7.5, b: 5.0, c: 7.1, d: 9.0, prev: 30.2 },
    { id: "w4", name: "陈静", siteId: "site-002", siteName: "三墩站", count: 20, s: 35.8, a: 9.2, b: 7.8, c: 9.3, d: 9.5, prev: 34.1 },
    { id: "w5", name: "刘洋", siteId: "site-003", siteName: "古荡站", count: 26, s: 33.0, a: 8.5, b: 5.5, c: 9.0, d: 10.0, prev: 33.5 },
    { id: "w6", name: "赵敏", siteId: "site-003", siteName: "古荡站", count: 19, s: 36.4, a: 9.4, b: 8.0, c: 9.5, d: 9.5, prev: 35.0 },
    { id: "w7", name: "孙磊", siteId: "site-004", siteName: "文新站", count: 15, s: 22.8, a: 6.0, b: 3.0, c: 6.8, d: 7.0, prev: 25.1 },
    { id: "w8", name: "周婷", siteId: "site-004", siteName: "文新站", count: 21, s: 30.2, a: 7.8, b: 5.0, c: 8.4, d: 9.0, prev: 29.0 },
    { id: "w9", name: "吴强", siteId: "site-001", siteName: "翠苑站", count: 16, s: 26.5, a: 7.0, b: 4.0, c: 7.5, d: 8.0, prev: 27.8 },
    { id: "w10", name: "郑华", siteId: "site-003", siteName: "古荡站", count: 23, s: 32.1, a: 8.3, b: 6.0, c: 8.8, d: 9.0, prev: 31.0 },
  ];
  const weekData = [
    { id: "w1", name: "李明", siteId: "site-001", siteName: "翠苑站", count: 6, s: 35.0, a: 9.0, b: 6.5, c: 9.2, d: 10.3, prev: 33.8 },
    { id: "w2", name: "王芳", siteId: "site-001", siteName: "翠苑站", count: 4, s: 30.2, a: 7.8, b: 5.0, c: 8.0, d: 9.4, prev: 31.5 },
    { id: "w3", name: "张伟", siteId: "site-002", siteName: "三墩站", count: 5, s: 27.1, a: 7.0, b: 5.0, c: 6.6, d: 8.5, prev: 28.6 },
    { id: "w4", name: "陈静", siteId: "site-002", siteName: "三墩站", count: 5, s: 36.5, a: 9.5, b: 8.0, c: 9.5, d: 9.5, prev: 35.8 },
    { id: "w5", name: "刘洋", siteId: "site-003", siteName: "古荡站", count: 7, s: 34.2, a: 8.8, b: 6.0, c: 9.2, d: 10.2, prev: 33.0 },
    { id: "w6", name: "赵敏", siteId: "site-003", siteName: "古荡站", count: 5, s: 37.1, a: 9.5, b: 8.2, c: 9.6, d: 9.8, prev: 36.4 },
    { id: "w7", name: "孙磊", siteId: "site-004", siteName: "文新站", count: 3, s: 24.5, a: 6.5, b: 3.5, c: 7.2, d: 7.3, prev: 22.8 },
    { id: "w8", name: "周婷", siteId: "site-004", siteName: "文新站", count: 5, s: 31.0, a: 8.0, b: 5.2, c: 8.6, d: 9.2, prev: 30.2 },
    { id: "w9", name: "吴强", siteId: "site-001", siteName: "翠苑站", count: 4, s: 25.8, a: 6.8, b: 3.8, c: 7.2, d: 8.0, prev: 26.5 },
    { id: "w10", name: "郑华", siteId: "site-003", siteName: "古荡站", count: 6, s: 33.5, a: 8.6, b: 6.2, c: 9.0, d: 9.7, prev: 32.1 },
  ];
  const dayData = [
    { id: "w1", name: "李明", siteId: "site-001", siteName: "翠苑站", count: 2, s: 36.0, a: 9.2, b: 7.0, c: 9.5, d: 10.3, prev: 34.5 },
    { id: "w2", name: "王芳", siteId: "site-001", siteName: "翠苑站", count: 1, s: 29.5, a: 7.5, b: 4.8, c: 8.2, d: 9.0, prev: 30.2 },
    { id: "w3", name: "张伟", siteId: "site-002", siteName: "三墩站", count: 1, s: 26.0, a: 6.8, b: 4.5, c: 6.2, d: 8.5, prev: 27.1 },
    { id: "w4", name: "陈静", siteId: "site-002", siteName: "三墩站", count: 2, s: 37.2, a: 9.6, b: 8.2, c: 9.8, d: 9.6, prev: 36.5 },
    { id: "w5", name: "刘洋", siteId: "site-003", siteName: "古荡站", count: 2, s: 35.0, a: 9.0, b: 6.5, c: 9.5, d: 10.0, prev: 34.2 },
    { id: "w6", name: "赵敏", siteId: "site-003", siteName: "古荡站", count: 1, s: 38.0, a: 9.8, b: 8.5, c: 9.7, d: 10.0, prev: 37.1 },
    { id: "w8", name: "周婷", siteId: "site-004", siteName: "文新站", count: 1, s: 32.0, a: 8.2, b: 5.5, c: 8.8, d: 9.5, prev: 31.0 },
    { id: "w10", name: "郑华", siteId: "site-003", siteName: "古荡站", count: 2, s: 34.0, a: 8.8, b: 6.5, c: 9.2, d: 9.5, prev: 33.5 },
  ];
  const workers = period === "day" ? dayData : period === "week" ? weekData : monthData;
  return workers.map((w) => ({
    socialWorkerId: w.id,
    socialWorkerName: w.name,
    siteId: w.siteId,
    siteName: w.siteName,
    serviceCount: w.count,
    avgS: w.s,
    avgA: w.a,
    avgB: w.b,
    avgC: w.c,
    avgD: w.d,
    prevAvgS: w.prev,
    delta: +(w.s - w.prev).toFixed(1),
  }));
}

function buildMockSiteScores(period: Period): SitePeriodScore[] {
  const workers = buildMockWorkers(period);
  const grouped = new Map<string, WorkerPeriodScore[]>();
  for (const w of workers) {
    const arr = grouped.get(w.siteId) || [];
    arr.push(w);
    grouped.set(w.siteId, arr);
  }
  return MOCK_SITES.map((site) => {
    const ws = grouped.get(site.id) || [];
    const n = ws.length || 1;
    const totalServices = ws.reduce((s, w) => s + w.serviceCount, 0);
    const avgS = +(ws.reduce((s, w) => s + w.avgS, 0) / n).toFixed(1);
    const avgA = +(ws.reduce((s, w) => s + w.avgA, 0) / n).toFixed(1);
    const avgB = +(ws.reduce((s, w) => s + w.avgB, 0) / n).toFixed(1);
    const avgC = +(ws.reduce((s, w) => s + w.avgC, 0) / n).toFixed(1);
    const avgD = +(ws.reduce((s, w) => s + w.avgD, 0) / n).toFixed(1);
    const prevAvgS = +(ws.reduce((s, w) => s + (w.prevAvgS ?? 0), 0) / n).toFixed(1);
    return {
      siteId: site.id, siteName: site.name, workerCount: ws.length,
      serviceCount: totalServices, avgS, avgA, avgB, avgC, avgD,
      prevAvgS, delta: +(avgS - prevAvgS).toFixed(1),
    };
  });
}

function buildMockTrend(_workerId: string, period: Period): TrendPoint[] {
  const labels = period === "day"
    ? ["5/11","5/12","5/13","5/14","5/15","5/16","5/17","5/18","5/19","5/20","5/21","5/22"]
    : period === "week"
    ? ["W06","W07","W08","W09","W10","W11","W12","W13","W14","W15","W16","W17"]
    : ["2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"];
  const base = 28 + Math.random() * 6;
  const countBase = period === "week" ? 3 : 15;
  const countRange = period === "week" ? 5 : 12;
  return labels.map((m, i) => {
    const s = +(base + (Math.random() - 0.3) * 4 + i * 0.3).toFixed(1);
    const a = +(s * 0.26).toFixed(1);
    const b = +(s * 0.16).toFixed(1);
    const c = +(s * 0.28).toFixed(1);
    const d = +(s * 0.30).toFixed(1);
    return { label: m, avgS: Math.min(40, Math.max(10, s)), avgA: Math.min(10, a), avgB: Math.min(10, b), avgC: Math.min(10, c), avgD: Math.min(10, d), serviceCount: countBase + Math.floor(Math.random() * countRange) };
  });
}

/* ── Helpers ── */

function scoreClass(s: number): string {
  if (s >= 32) return "qd-score--success";
  if (s >= 24) return "qd-score--warning";
  return "qd-score--danger";
}

function deltaClass(d: number | null): string {
  if (d === null || d === 0) return "qd-delta--flat";
  return d > 0 ? "qd-delta--up" : "qd-delta--down";
}

function deltaText(d: number | null): string {
  if (d === null) return "—";
  if (d === 0) return "—";
  return d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1);
}

function deltaArrow(d: number | null): string {
  if (d === null || d === 0) return "—";
  return d > 0 ? "↑" : "↓";
}

/* ── Sort helper ── */

type SortKey = "name" | "site" | "count" | "s" | "a" | "b" | "c" | "d" | "delta";
type SortDir = "asc" | "desc";

function getSortValue(w: WorkerPeriodScore, key: SortKey): number | string {
  switch (key) {
    case "name": return w.socialWorkerName;
    case "site": return w.siteName;
    case "count": return w.serviceCount;
    case "s": return w.avgS;
    case "a": return w.avgA;
    case "b": return w.avgB;
    case "c": return w.avgC;
    case "d": return w.avgD;
    case "delta": return w.delta ?? 0;
  }
}


/* ── Icons (inline SVG helpers) ── */

function IconShield({ size = 20, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconDocument({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}



function IconUsers({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

/* ── Helpers ── */

function IconClipboardList({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

type View = "dashboard" | "sop" | "sites" | "users" | "feishu";

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */

const VIEW_LABELS: Record<View, string> = {
  dashboard: "质量总览",
  sop: "规范管理",
  sites: "站点管理",
  users: "用户管理",
  feishu: "飞书管理",
};

const ADMIN_NAV_MAP: Record<string, View> = { sites: "sites", users: "users", sop: "sop", dashboard: "dashboard", quality: "dashboard", feishu: "feishu" };

export function QualityPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const getToken = useCallback(() => localStorage.getItem("gy_chat_token") ?? "", []);
  const { messages, connected, wip, handleSend, sendCardAction, endRef } = useAgentChat({
    agentId: "lumii-goldenyears",
    sessionId: "copilot:admin",
    getToken,
  });

  const sendWithContext = useCallback((content: string) => {
    const label = VIEW_LABELS[view] ?? view;
    handleSend(`[ctx:${label}] ${content}`);
  }, [view, handleSend]);

  const handleAdminNavigate = useCallback((area: string, params: Record<string, string>) => {
    const target = ADMIN_NAV_MAP[area];
    if (target) {
      setView(target);
      setSearchFilter(params.search ?? "");
    }
  }, []);

  const handleSelectView = useCallback((v: View) => {
    setView(v);
    setSearchFilter("");
  }, []);

  const navItems: { key: View; label: string; icon: ReactNode }[] = [
    { key: "dashboard", label: "质量总览", icon: <IconShield /> },
    { key: "sop", label: "规范管理", icon: <IconClipboardList /> },
    { key: "sites", label: "站点管理", icon: <IconDocument /> },
    { key: "users", label: "用户管理", icon: <IconUsers /> },
    { key: "feishu", label: "飞书管理", icon: <Bot size={20} /> },
  ];

  return (
    <div className="quality-page" data-copilot-open={copilotOpen}>
      {/* Header — row 1, spans all columns */}
      <header className="quality-header">
        <div className="quality-header__logo">
          <IconShield size={18} stroke="white" />
        </div>
        <div>
          <h1 className="quality-header__title">金色年华 · 集团管理</h1>
          <div className="quality-header__status">
            <span className="quality-header__dot" />
            运行中 · 4 个站点 · 本周 168 单
          </div>
        </div>
        <div className="quality-header__actions">
          <HeaderCopilotInput
            onSend={(msg) => { sendWithContext(msg); setCopilotOpen(true); }}
            onOpenPanel={() => setCopilotOpen(true)}
            commands={ADMIN_COMMANDS}
            panelOpen={copilotOpen}
          />
        </div>
      </header>

      {/* Left Icon Rail — row 2, col 1 */}
      <div className="quality-rail">
        {navItems.map((n) => (
          <button
            key={n.key}
            onClick={() => handleSelectView(n.key)}
            title={n.label}
            className="quality-rail__btn"
            data-active={view === n.key}
          >
            {n.icon}
          </button>
        ))}
        <ProfileMenu />
      </div>

      {/* Main content — row 2, col 2 */}
      <div className="quality-main">
        {view === "sop" ? (
          <SupervisorContent />
        ) : (
          <div className="quality-content">
            {view === "dashboard" && <DashboardView />}
            {view === "sites" && <SitesView initialSearch={searchFilter} />}
            {view === "users" && <UsersView initialSearch={searchFilter} />}
            {view === "feishu" && <FeishuView />}
          </div>
        )}
      </div>

      {/* CopilotPanel — row 2, col 3 */}
      <CopilotPanel
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        messages={messages}
        connected={connected}
        wip={wip}
        endRef={endRef}
        onSend={sendWithContext}
        onNavigate={handleAdminNavigate}
        onCardAction={sendCardAction}
        title="AI 助手"
        commands={ADMIN_COMMANDS}
      />
      {/* Mobile bottom nav */}
      <nav className="quality-mobile-nav">
        {navItems.map((n) => (
          <button
            key={n.key}
            className="quality-mobile-nav__btn"
            data-active={view === n.key}
            onClick={() => handleSelectView(n.key)}
            type="button"
          >
            {n.icon}
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      {!copilotOpen && (
        <button
          className="copilot-mobile-fab"
          onClick={() => setCopilotOpen(true)}
          type="button"
          aria-label="打开 AI 助手"
        >
          <Bot size={24} color="#FFFCF8" />
        </button>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════
   Dashboard View
   ═══════════════════════════════════════════════ */

function DashboardView() {
  const [period, setPeriod] = useState<Period>("month");
  const [siteFilter, setSiteFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("s");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [detailWorker, setDetailWorker] = useState<WorkerPeriodScore | null>(null);
  const [siteDropOpen, setSiteDropOpen] = useState(false);
  const siteDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (siteDropRef.current && !siteDropRef.current.contains(e.target as Node)) setSiteDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [siteDropOpen]);

  const allWorkers = useMemo(() => buildMockWorkers(period), [period]);
  const siteScores = useMemo(() => buildMockSiteScores(period), [period]);

  const filteredWorkers = useMemo(() => {
    let list = siteFilter === "all" ? allWorkers : allWorkers.filter((w) => w.siteId === siteFilter);
    list = [...list].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return list;
  }, [allWorkers, siteFilter, sortKey, sortDir]);

  const [workerTableExpanded, setWorkerTableExpanded] = useState(false);
  const [siteTableExpanded, setSiteTableExpanded] = useState(false);

  const summary = useMemo(() => {
    const ws = filteredWorkers;
    const n = ws.length || 1;
    const avgS = +(ws.reduce((s, w) => s + w.avgS, 0) / n).toFixed(1);
    const prevAvgS = +(ws.reduce((s, w) => s + (w.prevAvgS ?? 0), 0) / n).toFixed(1);
    const avgSDelta = +(avgS - prevAvgS).toFixed(1);
    const totalServices = ws.reduce((s, w) => s + w.serviceCount, 0);
    const workerCount = ws.length;
    const elderCount = Math.round(totalServices * 0.55);
    const avgServicePerElder = elderCount > 0 ? +(totalServices / elderCount).toFixed(1) : 0;
    const serviceDelta = period === "day" ? 8 : period === "week" ? 13 : 13;
    const workerDelta = period === "day" ? 5 : period === "week" ? 10 : 15;
    const improved = ws.filter((w) => (w.delta ?? 0) > 0).length;
    const declined = ws.filter((w) => (w.delta ?? 0) < 0).length;
    const subRates: Record<string, [number, number]> = { all: [68, 3.2], "site-001": [72, 4.1], "site-002": [61, 2.8], "site-003": [75, 1.5], "site-004": [58, 5.3] };
    const [subscriptionRate, subscriptionDelta] = subRates[siteFilter] ?? [65, 3.0];
    const bestSite = siteScores.reduce((best, s) => s.avgS > best.avgS ? s : best, siteScores[0]);
    return { avgS, prevAvgS, avgSDelta, totalServices, workerCount, elderCount, avgServicePerElder, serviceDelta, workerDelta, improved, declined, subscriptionRate, subscriptionDelta, bestSiteName: bestSite?.siteName ?? "—", bestSiteScore: bestSite?.avgS ?? 0 };
  }, [filteredWorkers, siteFilter, siteScores, period]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const periodLabel = period === "month" ? "本月" : period === "week" ? "本周" : "今日";
  const prevLabel = period === "month" ? "上月" : period === "week" ? "上周" : "昨日";

  const periodDateLabel = useMemo(() => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    if (period === "day") {
      return `${now.getFullYear()}年${m}月${d}日`;
    }
    if (period === "month") {
      return `${now.getFullYear()}年 ${m}月（${m}/1 - ${m}/${d}）`;
    }
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return `${now.getFullYear()}年 第${weekNum}周（${mon.getMonth() + 1}/${mon.getDate()} - ${sun.getMonth() + 1}/${sun.getDate()}）`;
  }, [period]);

  const siteLabel = siteFilter === "all" ? "全部站点" : (MOCK_SITES.find((s) => s.id === siteFilter)?.name ?? "全部站点");

  return (
    <>
      {/* ── Page header with global controls ── */}
      <div className="qd-page-header">
        <div className="qd-page-header__left">
          <div className="quality-dashboard__title">管理概览</div>
          <div className="qd-context-badge">{siteLabel} · {periodDateLabel}</div>
        </div>
        <div className="qd-page-header__controls">
          <div className="qd-site-dropdown" ref={siteDropRef}>
            <button className="qd-site-dropdown__trigger" onClick={() => setSiteDropOpen(!siteDropOpen)}>
              {siteLabel}
              <ChevronDown size={14} />
            </button>
            {siteDropOpen && (
              <div className="qd-site-dropdown__menu">
                <button className={`qd-site-dropdown__item ${siteFilter === "all" ? "qd-site-dropdown__item--active" : ""}`} onClick={() => { setSiteFilter("all"); setSiteDropOpen(false); }}>
                  全部站点
                </button>
                {MOCK_SITES.map((s) => (
                  <button key={s.id} className={`qd-site-dropdown__item ${siteFilter === s.id ? "qd-site-dropdown__item--active" : ""}`} onClick={() => { setSiteFilter(s.id); setSiteDropOpen(false); }}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="qd-period-toggle">
            <button className={`qd-period-btn ${period === "day" ? "qd-period-btn--active" : ""}`} onClick={() => setPeriod("day")}>日</button>
            <button className={`qd-period-btn ${period === "week" ? "qd-period-btn--active" : ""}`} onClick={() => setPeriod("week")}>周</button>
            <button className={`qd-period-btn ${period === "month" ? "qd-period-btn--active" : ""}`} onClick={() => setPeriod("month")}>月</button>
          </div>
        </div>
      </div>

      {/* ═══ Section 1: 运营数据 ═══ */}
      <div className="qd-section">
        <div className="qd-section__header">
          <span className="qd-section__title">运营数据 - 服务了多少长者？</span>
          <span className="qd-section__context">{siteLabel} · {periodDateLabel}</span>
        </div>
      </div>
      <div className="quality-kpi-grid">
        <div className="quality-kpi-card">
          <div className="quality-kpi-card__label">{periodLabel}总服务次数</div>
          <div className="quality-kpi-card__value">{summary.totalServices}次</div>
          <div className="quality-kpi-card__trend">
            <span className="quality-kpi-card__sub" style={{ color: summary.serviceDelta >= 0 ? "var(--quality-success-text)" : "var(--quality-danger-text)" }}>
              {summary.serviceDelta >= 0 ? "+" : ""}{summary.serviceDelta}%
            </span>
          </div>
        </div>
        <div className="quality-kpi-card">
          <div className="quality-kpi-card__label">出动服务人员数量</div>
          <div className="quality-kpi-card__value">{summary.workerCount}人</div>
          <div className="quality-kpi-card__trend">
            <span className="quality-kpi-card__sub" style={{ color: summary.workerDelta >= 0 ? "var(--quality-success-text)" : "var(--quality-danger-text)" }}>
              {summary.workerDelta >= 0 ? "+" : ""}{summary.workerDelta}%
            </span>
          </div>
        </div>
        <div className="quality-kpi-card">
          <div className="quality-kpi-card__label">覆盖长者数量</div>
          <div className="quality-kpi-card__value">{summary.elderCount}人</div>
          <div className="quality-kpi-card__trend">
            <span className="quality-kpi-card__sub">平均每名长者接受 {summary.avgServicePerElder} 次服务</span>
          </div>
        </div>
        <div className="quality-kpi-card">
          <div className="quality-kpi-card__label">家属订阅率</div>
          <div className="quality-kpi-card__value">{summary.subscriptionRate}%</div>
          <div className="quality-kpi-card__trend">
            <span className="quality-kpi-card__sub" style={{ color: summary.subscriptionDelta >= 0 ? "var(--quality-success-text)" : "var(--quality-danger-text)" }}>
              {summary.subscriptionDelta >= 0 ? "▲" : "▼"} 较{prevLabel}{summary.subscriptionDelta >= 0 ? "上升" : "下降"} {Math.abs(summary.subscriptionDelta)}%
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Section 2: 质量数据 ═══ */}
      <div className="qd-section">
        <div className="qd-section__header">
          <span className="qd-section__title">质量数据 - 员工服务质量如何？</span>
          <span className="qd-section__context">{siteLabel} · {periodDateLabel}</span>
        </div>
      </div>

      {/* Quality KPI cards */}
      <div className="quality-kpi-grid">
        <div className="quality-kpi-card">
          <div className="quality-kpi-card__label">{periodLabel}平均服务质量总分</div>
          <div className="quality-kpi-card__value">{summary.avgS}</div>
          <div className="quality-kpi-card__trend">
            <span className="quality-kpi-card__sub">满分 40</span>
          </div>
        </div>
        <div className="quality-kpi-card">
          <div className="quality-kpi-card__label">相比{prevLabel}变化</div>
          <div className="quality-kpi-card__value" style={{ color: summary.avgSDelta >= 0 ? "var(--quality-success-text)" : "var(--quality-danger-text)" }}>
            {summary.avgSDelta >= 0 ? "+" : ""}{summary.avgSDelta}
          </div>
          <div className="quality-kpi-card__trend">
            <span className="quality-kpi-card__sub">{prevLabel}均分 {summary.prevAvgS}</span>
          </div>
        </div>
        <div className="quality-kpi-card">
          <div className="quality-kpi-card__label">服务人员 进步 / 退步</div>
          <div className="quality-kpi-card__value">
            <span style={{ color: "var(--quality-success-text)" }}>{summary.improved}</span>
            {" / "}
            <span style={{ color: "var(--quality-danger-text)" }}>{summary.declined}</span>
          </div>
          <div className="quality-kpi-card__trend">
            <span className="quality-kpi-card__sub">较{prevLabel}变动人数</span>
          </div>
        </div>
        <div className="quality-kpi-card">
          <div className="quality-kpi-card__label">表现最佳站点</div>
          <div className="quality-kpi-card__value">{summary.bestSiteName}</div>
          <div className="quality-kpi-card__trend">
            <span className="quality-kpi-card__sub">S 均分 {summary.bestSiteScore.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Worker scoring table */}
      <div className="quality-table-wrap" style={{ marginTop: 20 }}>
        <table className="qd-worker-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")}>姓名{sortIcon("name")}</th>
              <th onClick={() => handleSort("site")}>站点{sortIcon("site")}</th>
              <th onClick={() => handleSort("count")}>服务次数{sortIcon("count")}</th>
              <th onClick={() => handleSort("s")}>S 均分{sortIcon("s")}<div className="qd-th-sub">总分 A+B+C+D</div></th>
              <th onClick={() => handleSort("a")}>A 均分{sortIcon("a")}<div className="qd-th-sub">长者评价</div></th>
              <th onClick={() => handleSort("b")}>B 均分{sortIcon("b")}<div className="qd-th-sub">家属评价</div></th>
              <th onClick={() => handleSort("c")}>C 均分{sortIcon("c")}<div className="qd-th-sub">SOP 符合度</div></th>
              <th onClick={() => handleSort("d")}>D 均分{sortIcon("d")}<div className="qd-th-sub">特殊识别</div></th>
              <th onClick={() => handleSort("delta")}>较{prevLabel}{sortIcon("delta")}</th>
            </tr>
          </thead>
          <tbody>
            {(workerTableExpanded ? filteredWorkers : filteredWorkers.slice(0, 4)).map((w) => (
              <tr key={w.socialWorkerId}>
                <td>
                  <a className="qd-worker-table__name" onClick={(e) => { e.preventDefault(); setDetailWorker(w); }} href="#">
                    {w.socialWorkerName}
                  </a>
                </td>
                <td>{w.siteName}</td>
                <td>{w.serviceCount}</td>
                <td><span className={scoreClass(w.avgS)}>{w.avgS.toFixed(1)}</span></td>
                <td>{w.avgA.toFixed(1)}</td>
                <td>{w.avgB.toFixed(1)}</td>
                <td>{w.avgC.toFixed(1)}</td>
                <td>{w.avgD.toFixed(1)}</td>
                <td>
                  <span className={deltaClass(w.delta)}>
                    {deltaArrow(w.delta)} {deltaText(w.delta)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredWorkers.length > 4 && (
          <button className="qd-table-toggle" onClick={() => setWorkerTableExpanded(!workerTableExpanded)}>
            {workerTableExpanded ? "收起" : `展开全部 ${filteredWorkers.length} 名员工`}
          </button>
        )}
      </div>

      {/* Site comparison table */}
      <div className="quality-table-wrap" style={{ marginTop: 20 }}>
        <table className="qd-worker-table">
          <thead>
            <tr>
              <th>站点</th>
              <th>员工数</th>
              <th>服务次数</th>
              <th>S 均分</th>
              <th>A 均分</th>
              <th>B 均分</th>
              <th>C 均分</th>
              <th>D 均分</th>
              <th>较{prevLabel}</th>
            </tr>
          </thead>
          <tbody>
            {(siteTableExpanded ? siteScores : siteScores.slice(0, 4)).map((s) => (
              <tr key={s.siteId}>
                <td style={{ fontWeight: 500 }}>{s.siteName}</td>
                <td>{s.workerCount}</td>
                <td>{s.serviceCount}</td>
                <td><span className={scoreClass(s.avgS)}>{s.avgS.toFixed(1)}</span></td>
                <td>{s.avgA.toFixed(1)}</td>
                <td>{s.avgB.toFixed(1)}</td>
                <td>{s.avgC.toFixed(1)}</td>
                <td>{s.avgD.toFixed(1)}</td>
                <td>
                  <span className={deltaClass(s.delta)}>
                    {deltaArrow(s.delta)} {deltaText(s.delta)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {siteScores.length > 4 && (
          <button className="qd-table-toggle" onClick={() => setSiteTableExpanded(!siteTableExpanded)}>
            {siteTableExpanded ? "收起" : `展开全部 ${siteScores.length} 个站点`}
          </button>
        )}
      </div>

      {/* Worker detail modal */}
      {detailWorker && (
        <WorkerDetailModal worker={detailWorker} period={period} onClose={() => setDetailWorker(null)} />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════
   Worker Detail Modal
   ═══════════════════════════════════════════════ */

function WorkerDetailModal({ worker, period, onClose }: { worker: WorkerPeriodScore; period: Period; onClose: () => void }) {
  useEscClose(onClose);
  const trend = useMemo(() => buildMockTrend(worker.socialWorkerId, period), [worker.socialWorkerId, period]);

  return (
    <>
      <div className="sw-scrim" onClick={onClose} />
      <div className="quality-user-modal" role="dialog" aria-label={worker.socialWorkerName}>
        <div className="quality-user-modal__header">
          <div>
            <div className="quality-user-modal__title">{worker.socialWorkerName}</div>
            <div className="quality-user-modal__tags">
              <span className="so-modal__chip">{worker.siteName}</span>
              <span className="so-modal__chip">{period === "month" ? "本月" : "本周"} {worker.serviceCount} 次服务</span>
            </div>
          </div>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="quality-user-modal__body">
          {/* Score cards */}
          <div className="qd-detail-scores">
            <div className="qd-detail-score-card qd-detail-score-card--primary">
              <div className="qd-detail-score-card__label">S 总分</div>
              <div className="qd-detail-score-card__value">{worker.avgS.toFixed(1)}</div>
            </div>
            <div className="qd-detail-score-card">
              <div className="qd-detail-score-card__label">A 服务评价</div>
              <div className="qd-detail-score-card__value">{worker.avgA.toFixed(1)}</div>
            </div>
            <div className="qd-detail-score-card">
              <div className="qd-detail-score-card__label">B 家属评价</div>
              <div className="qd-detail-score-card__value">{worker.avgB.toFixed(1)}</div>
            </div>
            <div className="qd-detail-score-card">
              <div className="qd-detail-score-card__label">C SOP符合</div>
              <div className="qd-detail-score-card__value">{worker.avgC.toFixed(1)}</div>
            </div>
            <div className="qd-detail-score-card">
              <div className="qd-detail-score-card__label">D 特殊识别</div>
              <div className="qd-detail-score-card__value">{worker.avgD.toFixed(1)}</div>
            </div>
          </div>

          {/* Trend chart */}
          <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "var(--quality-text)" }}>
            {period === "month" ? "月度" : "周度"} S 分趋势（近 12 期）
          </div>
          <div className="qd-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--quality-line)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--quality-text-muted)" }} tickLine={false} axisLine={{ stroke: "var(--quality-line)" }} />
                <YAxis domain={[10, 40]} tick={{ fontSize: 11, fill: "var(--quality-text-muted)" }} tickLine={false} axisLine={false} width={35} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--quality-line)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(value) => [Number(value).toFixed(1), "S 分"]}
                />
                <Line type="monotone" dataKey="avgS" stroke="#EB6420" strokeWidth={2.5} dot={{ r: 3.5, fill: "#EB6420" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="quality-user-modal__footer">
          <div />
          <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">关闭</button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   Sites View
   ═══════════════════════════════════════════════ */

interface SiteData {
  id: string;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  status: string;
  operators: Array<{ id: string; username: string; name: string; role: string }>;
}

function SitesView({ initialSearch }: { initialSearch?: string }) {
  const { token } = useAuth();
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [detailSite, setDetailSite] = useState<SiteData | null>(null);
  const [editingSite, setEditingSite] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ site: SiteData } | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [search, setSearch] = useState(initialSearch ?? "");
  useEffect(() => { if (initialSearch) setSearch(initialSearch); }, [initialSearch]);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2000); }, []);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sites", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setSites(data.sites); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  // Sync detailSite with refreshed sites data
  useEffect(() => {
    if (detailSite) {
      const fresh = sites.find(s => s.id === detailSite.id);
      if (fresh && fresh !== detailSite) setDetailSite(fresh);
    }
  }, [sites]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!confirmAction) return;
    setConfirmSubmitting(true);
    try {
      await fetch(`/api/admin/sites/${confirmAction.site.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      showToast("站点已删除");
      if (detailSite?.id === confirmAction.site.id) setDetailSite(null);
      fetchSites();
    } catch { /* ignore */ }
    setConfirmAction(null);
    setConfirmSubmitting(false);
  };

  const filteredSites = sites.filter(s => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || s.contactName.toLowerCase().includes(q);
  });

  return (
    <>
      {toast && <div className="quality-toast">{toast}</div>}

      <div className="quality-records__header">
        <div>
          <div className="quality-records__title">站点管理</div>
          <div className="quality-records__subtitle">管理服务站点及运营人员分配</div>
        </div>
        <button className="quality-users__add-btn" onClick={() => setShowCreate(true)}>新增站点</button>
      </div>

      <div className="quality-table-wrap">
        <div className="quality-toolbar">
          <div className="quality-toolbar__search-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索站点名称、地址、联系人..." className="quality-toolbar__search" />
          </div>
          <div className="quality-toolbar__spacer" />
        </div>
        {loading ? (
          <p style={{ padding: 20, color: "var(--quality-text-muted)" }}>加载中...</p>
        ) : (
          <table className="quality-records-table">
            <thead><tr>{["站点名称", "地址", "联系人", "联系电话", "运营人员", "操作"].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {filteredSites.length === 0 && <tr><td colSpan={6} className="quality-records-table__empty">暂无站点</td></tr>}
              {filteredSites.map(s => (
                <tr key={s.id} onClick={() => { setEditingSite(false); setDetailSite(s); }} style={{ cursor: "pointer" }}>
                  <td><a className="quality-users__link" onClick={e => { e.preventDefault(); setEditingSite(false); setDetailSite(s); }} href="#">{s.name}</a></td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.address || "—"}</td>
                  <td>{s.contactName || "—"}</td>
                  <td>{s.contactPhone || "—"}</td>
                  <td>{s.operators.length > 0 ? s.operators.map(o => o.name).join("、") : <span style={{ color: "var(--quality-text-muted)" }}>未分配</span>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="quality-users__action-btn" onClick={e => { e.stopPropagation(); window.open(`/site-operations?siteId=${s.id}`, "_blank"); }}>进入站点</button>
                      <button className="quality-users__action-btn" onClick={e => { e.stopPropagation(); setEditingSite(true); setDetailSite(s); }}>编辑</button>
                      <button className="quality-users__action-btn" onClick={e => { e.stopPropagation(); setConfirmAction({ site: s }); }}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailSite && (
        <SiteDetailModal site={detailSite} token={token!} onClose={() => { setDetailSite(null); setEditingSite(false); }}
          onSaved={() => { fetchSites(); showToast("站点信息已更新"); }}
          onDelete={s => setConfirmAction({ site: s })}
          initialEditing={editingSite} />
      )}

      {showCreate && (
        <SiteCreateModal token={token!} onClose={() => setShowCreate(false)}
          onCreated={() => { fetchSites(); showToast("站点创建成功"); setShowCreate(false); }} />
      )}

      {confirmAction && (
        <ConfirmDialog title="确认删除" message={`确定要删除站点「${confirmAction.site.name}」吗？删除后数据无法恢复。`}
          confirmLabel="确认删除" danger submitting={confirmSubmitting} onConfirm={handleDelete} onCancel={() => setConfirmAction(null)} />
      )}
    </>
  );
}

function SiteDetailModal({ site, token, onClose, onSaved, onDelete, initialEditing = false }: {
  site: SiteData; token: string; onClose: () => void; onSaved: () => void; onDelete: (s: SiteData) => void; initialEditing?: boolean;
}) {
  useEscClose(onClose);
  const [editing, setEditing] = useState(initialEditing);
  const [name, setName] = useState(site.name);
  const [address, setAddress] = useState(site.address);
  const [contactName, setContactName] = useState(site.contactName);
  const [contactPhone, setContactPhone] = useState(site.contactPhone);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Inline operator assignment */
  const [allOperators, setAllOperators] = useState<Array<{ id: string; username: string; name: string }>>([]);
  const [selectedOps, setSelectedOps] = useState<Set<string>>(new Set(site.operators.map(o => o.id)));
  const [opsLoading, setOpsLoading] = useState(false);

  useEffect(() => { setName(site.name); setAddress(site.address); setContactName(site.contactName); setContactPhone(site.contactPhone); setEditing(initialEditing); setError(""); setSelectedOps(new Set(site.operators.map(o => o.id))); }, [site, initialEditing]);

  useEffect(() => {
    setOpsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setAllOperators((data.users ?? []).filter((u: any) => u.role === "site_operator"));
        }
      } catch { /* ignore */ }
      setOpsLoading(false);
    })();
  }, [editing, token]);

  const [opsSaving, setOpsSaving] = useState(false);

  const toggleOp = (id: string) => {
    setSelectedOps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSaveOperators = async () => {
    setOpsSaving(true);
    try {
      await fetch(`/api/admin/sites/${site.id}/operators`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userIds: [...selectedOps] }),
      });
      onSaved();
    } catch { /* ignore */ }
    setOpsSaving(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("站点名称不能为空"); return; }
    setError(""); setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/sites/${site.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), address: address.trim(), contactName: contactName.trim(), contactPhone: contactPhone.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "更新失败"); setSubmitting(false); return; }
      /* Save operator assignments */
      await fetch(`/api/admin/sites/${site.id}/operators`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userIds: [...selectedOps] }),
      });
      onSaved(); setEditing(false);
    } catch { setError("网络错误"); }
    setSubmitting(false);
  };

  const handleCancel = () => { setName(site.name); setAddress(site.address); setContactName(site.contactName); setContactPhone(site.contactPhone); setSelectedOps(new Set(site.operators.map(o => o.id))); setEditing(false); setError(""); };

  return (
    <>
      <div className="sw-scrim" onClick={onClose} />
      <div className="quality-user-modal" role="dialog" aria-label={site.name}>
        <div className="quality-user-modal__header">
          <div>
            <div className="quality-user-modal__title">{site.name}</div>
            <div className="quality-user-modal__tags">
              <span className="so-modal__chip">{site.operators.length} 名运营人员</span>
            </div>
          </div>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="quality-user-modal__body">
          {error && <div className="quality-modal__error">{error}</div>}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--quality-text)" }}>站点信息</h4>
              {!editing && <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--quality-text-muted)", padding: 2, display: "flex" }} onClick={() => setEditing(true)} type="button" title="编辑"><Edit3 size={14} /></button>}
            </div>
            <div className="so-overview-grid">
              <dl className="so-overview-item"><dt>站点名称</dt><dd>{editing ? <input className="quality-user-modal__inline-input" value={name} onChange={e => setName(e.target.value)} /> : site.name}</dd></dl>
              <dl className="so-overview-item"><dt>联系人</dt><dd>{editing ? <input className="quality-user-modal__inline-input" value={contactName} onChange={e => setContactName(e.target.value)} /> : (site.contactName || "—")}</dd></dl>
              <dl className="so-overview-item"><dt>联系电话</dt><dd>{editing ? <input className="quality-user-modal__inline-input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} /> : (site.contactPhone || "—")}</dd></dl>
              <dl className="so-overview-item so-overview-item--full"><dt>地址</dt><dd>{editing ? <input className="quality-user-modal__inline-input" value={address} onChange={e => setAddress(e.target.value)} /> : (site.address || "—")}</dd></dl>
            </div>
            {editing && (
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={handleCancel} type="button">取消</button>
                <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 12 }} disabled={submitting} onClick={handleSave} type="button">{submitting ? "保存中..." : "保存"}</button>
              </div>
            )}
          </div>
          <div>
            <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--quality-text)" }}>运营人员</h4>
            {opsLoading ? <span style={{ color: "var(--quality-text-muted)", fontSize: 14 }}>加载中...</span> : allOperators.length === 0 ? <span style={{ color: "var(--quality-text-muted)", fontSize: 14 }}>暂无站点运营账号</span> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allOperators.map(op => (
                  <label key={op.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", borderRadius: 8, background: selectedOps.has(op.id) ? "var(--quality-accent-soft)" : "transparent", border: `1px solid ${selectedOps.has(op.id) ? "var(--quality-accent)" : "var(--quality-line)"}` }}>
                    <input type="checkbox" checked={selectedOps.has(op.id)} onChange={() => toggleOp(op.id)} style={{ width: 16, height: 16 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{op.name}</div>
                      <div style={{ fontSize: 12, color: "var(--quality-text-muted)" }}>{op.username}</div>
                    </div>
                  </label>
                ))}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 12 }} disabled={opsSaving} onClick={handleSaveOperators} type="button">{opsSaving ? "保存中..." : "保存分配"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="quality-user-modal__footer">
          <div className="quality-user-modal__footer-left">
            <button className="sw-btn sw-btn--danger-ghost" onClick={() => onDelete(site)} type="button">删除</button>
          </div>
          <div />
        </div>
      </div>
    </>
  );
}

function SiteCreateModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  useEscClose(onClose);
  const [form, setForm] = useState({ name: "", address: "", contactName: "", contactPhone: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("站点名称为必填"); return; }
    setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/admin/sites", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "创建失败"); } else { onCreated(); }
    } catch { setError("网络错误"); }
    setSubmitting(false);
  };

  return (
    <>
      <div className="sw-scrim" onClick={onClose} />
      <div className="quality-user-modal" role="dialog" aria-label="新增站点">
        <div className="quality-user-modal__header">
          <div className="quality-user-modal__title">新增站点</div>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="quality-user-modal__body">
          {error && <div className="quality-modal__error">{error}</div>}
          <div className="so-form-cards">
            <div className="so-form-card">
              <h4 className="so-form-card__title">站点信息</h4>
              <div className="so-form-card__row">
                <div className="sw-field"><span>站点名称</span><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                <div className="sw-field"><span>联系人</span><input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} /></div>
              </div>
              <div className="so-form-card__row">
                <div className="sw-field"><span>联系电话</span><input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} /></div>
                <div />
              </div>
              <div className="sw-field"><span>地址</span><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            </div>
          </div>
        </div>
        <div className="quality-user-modal__footer">
          <div />
          <div className="quality-user-modal__footer-right">
            <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">取消</button>
            <button className="sw-btn sw-btn--primary" disabled={submitting} onClick={handleSubmit} type="button">{submitting ? "创建中..." : "创建站点"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

function OperatorAssignModal({ site, token, onClose, onSaved }: {
  site: SiteData; token: string; onClose: () => void; onSaved: () => void;
}) {
  useEscClose(onClose);
  const [allOperators, setAllOperators] = useState<Array<{ id: string; username: string; name: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(site.operators.map(o => o.id)));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setAllOperators((data.users ?? []).filter((u: any) => u.role === "site_operator"));
        }
      } catch { /* ignore */ }
    })();
  }, [token]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await fetch(`/api/admin/sites/${site.id}/operators`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userIds: [...selected] }),
      });
      onSaved();
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  return (
    <>
      <div className="sw-scrim" onClick={onClose} />
      <div className="quality-user-modal quality-user-modal--sm" role="dialog" aria-label="分配运营人员">
        <div className="quality-user-modal__header">
          <div className="quality-user-modal__title">分配运营人员<span className="quality-user-modal__sub">{site.name}</span></div>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="quality-user-modal__body">
          {allOperators.length === 0 ? (
            <p style={{ color: "var(--quality-text-muted)", fontSize: 14 }}>暂无站点运营账号</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allOperators.map(op => (
                <label key={op.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", borderRadius: 8, background: selected.has(op.id) ? "var(--quality-accent-soft)" : "transparent", border: `1px solid ${selected.has(op.id) ? "var(--quality-accent)" : "var(--quality-line)"}` }}>
                  <input type="checkbox" checked={selected.has(op.id)} onChange={() => toggle(op.id)} style={{ width: 16, height: 16 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{op.name}</div>
                    <div style={{ fontSize: 12, color: "var(--quality-text-muted)" }}>{op.username}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="quality-user-modal__footer">
          <div />
          <div className="quality-user-modal__footer-right">
            <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">取消</button>
            <button className="sw-btn sw-btn--primary" disabled={submitting} onClick={handleSave} type="button">{submitting ? "保存中..." : "确认分配"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   Users View
   ═══════════════════════════════════════════════ */

interface QualityUser {
  id: string;
  username: string;
  name: string;
  role: string;
  orgId: string;
  siteIds: string[];
  phone: string;
  status: string;
  createdAt: string;
}

const QUALITY_ROLE_LABELS: Record<string, string> = {
  org_admin: "集团管理",
  site_operator: "站点运营",
  careworker: "护理员",
};

function UsersView({ initialSearch }: { initialSearch?: string }) {
  const { token } = useAuth();
  const [users, setUsers] = useState<QualityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [detailUser, setDetailUser] = useState<QualityUser | null>(null);
  const [initialEditing, setInitialEditing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "toggle"; user: QualityUser } | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [resetTarget, setResetTarget] = useState<QualityUser | null>(null);
  const [search, setSearch] = useState(initialSearch ?? "");
  useEffect(() => { if (initialSearch) setSearch(initialSearch); }, [initialSearch]);
  const [roleFilter, setRoleFilter] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers((data.users ?? []).filter((u: QualityUser) => u.role !== "careworker"));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Sync detailUser with refreshed users data
  useEffect(() => {
    if (detailUser) {
      const fresh = users.find(u => u.id === detailUser.id);
      if (fresh && fresh !== detailUser) setDetailUser(fresh);
    }
  }, [users]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = (u: QualityUser, editMode = false) => { setInitialEditing(editMode); setDetailUser(u); };
  const closeDetail = () => { setDetailUser(null); setInitialEditing(false); };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setConfirmSubmitting(true);
    try {
      if (confirmAction.type === "toggle") {
        const newStatus = confirmAction.user.status === "active" ? "disabled" : "active";
        await fetch(`/api/admin/users/${confirmAction.user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: newStatus }),
        });
        showToast(newStatus === "disabled" ? "用户已禁用" : "用户已启用");
      } else {
        await fetch(`/api/admin/users/${confirmAction.user.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("用户已删除");
        if (detailUser?.id === confirmAction.user.id) closeDetail();
      }
      fetchUsers();
    } catch { /* ignore */ }
    setConfirmAction(null);
    setConfirmSubmitting(false);
  };

  const ROLE_FILTER_MAP: Record<string, string> = { "集团管理": "org_admin", "站点运营": "site_operator" };

  const filteredUsers = users.filter(u => {
    if (roleFilter && u.role !== ROLE_FILTER_MAP[roleFilter]) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
  });

  return (
    <>
      {toast && <div className="quality-toast">{toast}</div>}

      <div className="quality-records__header">
        <div>
          <div className="quality-records__title">用户管理</div>
          <div className="quality-records__subtitle">管理系统用户账号、角色和权限</div>
        </div>
        <button className="quality-users__add-btn" onClick={() => setShowCreate(true)}>新增用户</button>
      </div>

      <div className="quality-table-wrap">
        <div className="quality-toolbar">
          <div className="quality-toolbar__search-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索用户名、姓名..." className="quality-toolbar__search" />
          </div>
          <div className="quality-toolbar__spacer" />
          <select className="quality-toolbar__select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">全部角色</option>
            <option value="集团管理">集团管理</option>
            <option value="站点运营">站点运营</option>
          </select>
        </div>
        {loading ? (
          <p style={{ padding: 20, color: "var(--quality-text-muted)" }}>加载中...</p>
        ) : (
          <table className="quality-records-table">
            <thead>
              <tr>
                {["用户名", "姓名", "手机号", "角色", "状态", "操作"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} className="quality-records-table__empty">暂无用户</td></tr>
              )}
              {filteredUsers.map(u => (
                <tr key={u.id} onClick={() => openDetail(u)} style={{ cursor: "pointer" }}>
                  <td>
                    <a className="quality-users__link" onClick={(e) => { e.preventDefault(); openDetail(u); }} href="#">
                      {u.username}
                    </a>
                  </td>
                  <td className="quality-records-table__worker">{u.name}</td>
                  <td>{u.phone || "—"}</td>
                  <td>{QUALITY_ROLE_LABELS[u.role] ?? u.role}</td>
                  <td>
                    <span className={`quality-status-badge quality-status-badge--${u.status === "active" ? "normal" : "anomaly"}`}>
                      {u.status === "active" ? "正常" : "已禁用"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="quality-users__action-btn" onClick={(e) => { e.stopPropagation(); openDetail(u, true); }}>编辑</button>
                      <button className="quality-users__action-btn" onClick={(e) => { e.stopPropagation(); setResetTarget(u); }}>重置密码</button>
                      <button className="quality-users__action-btn" onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "delete", user: u }); }}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── User Detail Modal (inline edit) ── */}
      {detailUser && (
        <UserDetailModal
          user={detailUser}
          token={token!}
          onClose={closeDetail}
          onSaved={() => { fetchUsers(); showToast("用户信息已更新"); }}
          onToggle={(u) => setConfirmAction({ type: "toggle", user: u })}
          onDelete={(u) => setConfirmAction({ type: "delete", user: u })}
          initialEditing={initialEditing}
        />
      )}

      {/* ── Create User Modal ── */}
      {showCreate && (
        <CreateUserModal
          token={token!}
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchUsers(); showToast("用户创建成功"); setShowCreate(false); }}
        />
      )}

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          token={token!}
          onClose={() => setResetTarget(null)}
          onSuccess={() => { setResetTarget(null); showToast("密码已重置"); }}
        />
      )}

      {/* ── Confirm Dialog (delete/toggle) ── */}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === "delete" ? "确认删除" : (confirmAction.user.status === "active" ? "确认禁用" : "确认启用")}
          message={confirmAction.type === "delete"
            ? `确定要删除用户「${confirmAction.user.name}」吗？删除后数据无法恢复。`
            : confirmAction.user.status === "active"
              ? `确定要禁用用户「${confirmAction.user.name}」吗？禁用后该用户将无法登录。`
              : `确定要启用用户「${confirmAction.user.name}」吗？`}
          confirmLabel={confirmAction.type === "delete" ? "确认删除" : (confirmAction.user.status === "active" ? "确认禁用" : "确认启用")}
          danger={confirmAction.type === "delete" || confirmAction.user.status === "active"}
          submitting={confirmSubmitting}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

/* ── Shared close button ── */
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className="so-modal__close" aria-label="关闭" onClick={onClick} type="button">
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  );
}

/* ── User Detail Modal with inline edit ── */
function useEscClose(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
}

function UserDetailModal({ user, token, onClose, onSaved, onToggle, onDelete, initialEditing = false }: {
  user: QualityUser; token: string; onClose: () => void; onSaved: () => void;
  onToggle: (u: QualityUser) => void; onDelete: (u: QualityUser) => void; initialEditing?: boolean;
}) {
  useEscClose(onClose);
  const [editing, setEditing] = useState(initialEditing);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setName(user.name); setPhone(user.phone); setEditing(initialEditing); setError(""); }, [user, initialEditing]);

  const handleSave = async () => {
    if (!name.trim()) { setError("姓名不能为空"); return; }
    setError(""); setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "更新失败"); } else { onSaved(); setEditing(false); }
    } catch { setError("网络错误"); }
    setSubmitting(false);
  };

  const handleCancel = () => { setName(user.name); setPhone(user.phone); setEditing(false); setError(""); };

  return (
    <>
      <div className="sw-scrim" onClick={onClose} />
      <div className="quality-user-modal" role="dialog" aria-label={user.name}>
        <div className="quality-user-modal__header">
          <div>
            <div className="quality-user-modal__title">{user.name}<span className="quality-user-modal__sub">{user.username}</span></div>
            <div className="quality-user-modal__tags">
              <span className="so-modal__chip">{QUALITY_ROLE_LABELS[user.role] ?? user.role}</span>
              <span className={`so-modal__chip ${user.status !== "active" ? "so-modal__chip--danger" : ""}`}>{user.status === "active" ? "正常" : "已禁用"}</span>
            </div>
          </div>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="quality-user-modal__body">
          {error && <div className="quality-modal__error">{error}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--quality-text)" }}>用户信息</h4>
            {!editing && <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--quality-text-muted)", padding: 2, display: "flex" }} onClick={() => setEditing(true)} type="button" title="编辑"><Edit3 size={14} /></button>}
          </div>
          <div className="so-overview-grid">
            <dl className="so-overview-item"><dt>用户名</dt><dd>{user.username}</dd></dl>
            <dl className="so-overview-item"><dt>姓名</dt><dd>{editing ? <input className="quality-user-modal__inline-input" value={name} onChange={e => setName(e.target.value)} /> : user.name}</dd></dl>
            <dl className="so-overview-item"><dt>手机号</dt><dd>{editing ? <input className="quality-user-modal__inline-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="选填" /> : (user.phone || "—")}</dd></dl>
            <dl className="so-overview-item"><dt>角色</dt><dd>{QUALITY_ROLE_LABELS[user.role] ?? user.role}</dd></dl>
            <dl className="so-overview-item"><dt>状态</dt><dd>{user.status === "active" ? "正常" : "已禁用"}</dd></dl>
            <dl className="so-overview-item"><dt>创建时间</dt><dd>{user.createdAt?.slice(0, 10) ?? "—"}</dd></dl>
          </div>
          {editing && (
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={handleCancel} type="button">取消</button>
              <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 12 }} disabled={submitting} onClick={handleSave} type="button">{submitting ? "保存中..." : "保存"}</button>
            </div>
          )}
        </div>
        <div className="quality-user-modal__footer">
          <div className="quality-user-modal__footer-left">
            <button className="sw-btn sw-btn--danger-ghost" onClick={() => onDelete(user)} type="button">删除</button>
            <button className="sw-btn sw-btn--secondary" onClick={() => onToggle(user)} type="button">{user.status === "active" ? "禁用" : "启用"}</button>
          </div>
          <div />
        </div>
      </div>
    </>
  );
}

/* ── Create User Modal ── */
function CreateUserModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  useEscClose(onClose);
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "site_operator", phone: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.name) { setError("用户名、密码和姓名为必填"); return; }
    setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, siteIds: [] }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "创建失败"); } else { onCreated(); }
    } catch { setError("网络错误"); }
    setSubmitting(false);
  };

  return (
    <>
      <div className="sw-scrim" onClick={onClose} />
      <div className="quality-user-modal" role="dialog" aria-label="新增用户">
        <div className="quality-user-modal__header">
          <div className="quality-user-modal__title">新增用户</div>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="quality-user-modal__body">
          {error && <div className="quality-modal__error">{error}</div>}
          <div className="so-form-cards">
            <div className="so-form-card">
              <h4 className="so-form-card__title">账号信息</h4>
              <div className="so-form-card__row">
                <div className="sw-field"><span>用户名</span><input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required /></div>
                <div className="sw-field"><span>密码</span><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="至少6位" /></div>
              </div>
              <div className="so-form-card__row">
                <div className="sw-field"><span>姓名</span><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                <div className="sw-field"><span>手机号</span><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="选填" /></div>
              </div>
              <div className="so-form-card__row">
                <div className="sw-field">
                  <span>角色</span>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="site_operator">站点运营</option>
                    <option value="org_admin">集团管理</option>
                  </select>
                </div>
                <div />
              </div>
            </div>
          </div>
        </div>
        <div className="quality-user-modal__footer">
          <div />
          <div className="quality-user-modal__footer-right">
            <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">取消</button>
            <button className="sw-btn sw-btn--primary" disabled={submitting} onClick={handleSubmit} type="button">{submitting ? "创建中..." : "创建用户"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Reset Password Modal (compact) ── */
function ResetPasswordModal({ user, token, onClose, onSuccess }: { user: QualityUser; token: string; onClose: () => void; onSuccess: () => void }) {
  useEscClose(onClose);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!pwd || pwd.length < 6) { setError("密码至少6位"); return; }
    if (pwd !== confirm) { setError("两次密码输入不一致"); return; }
    setError(""); setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) { onSuccess(); } else { const d = await res.json(); setError(d.error ?? "重置失败"); }
    } catch { setError("网络错误"); }
    setSubmitting(false);
  };

  return (
    <>
      <div className="sw-scrim" onClick={onClose} />
      <div className="quality-user-modal quality-user-modal--sm" role="dialog" aria-label="重置密码">
        <div className="quality-user-modal__header">
          <div className="quality-user-modal__title">重置密码<span className="quality-user-modal__sub">{user.name}</span></div>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="quality-user-modal__body">
          {error && <div className="quality-modal__error">{error}</div>}
          <div className="sw-field"><span>新密码</span><input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="至少6位" /></div>
          <div className="sw-field" style={{ marginTop: 14 }}><span>确认密码</span><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="再次输入新密码" /></div>
        </div>
        <div className="quality-user-modal__footer">
          <div />
          <div className="quality-user-modal__footer-right">
            <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">取消</button>
            <button className="sw-btn sw-btn--primary" disabled={submitting} onClick={handleSubmit} type="button">{submitting ? "重置中..." : "确认重置"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Confirm Dialog (centered, compact) ── */
function ConfirmDialog({ title, message, confirmLabel, danger, submitting, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; danger: boolean;
  submitting: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  useEscClose(onCancel);
  return (
    <>
      <div className="sw-scrim" style={{ zIndex: 40 }} onClick={onCancel} />
      <div className="quality-user-modal quality-user-modal--sm" style={{ zIndex: 41 }} role="alertdialog">
        <div className="quality-user-modal__header">
          <div className="quality-user-modal__title">{title}</div>
          <CloseBtn onClick={onCancel} />
        </div>
        <div className="quality-user-modal__body">
          <p style={{ margin: 0, fontSize: 14, color: "var(--quality-text)", lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="quality-user-modal__footer">
          <div />
          <div className="quality-user-modal__footer-right">
            <button className="sw-btn sw-btn--secondary" onClick={onCancel} type="button">取消</button>
            <button className={`sw-btn ${danger ? "sw-btn--danger" : "sw-btn--primary"}`} disabled={submitting} onClick={onConfirm} type="button">
              {submitting ? "处理中..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   Feishu Management View
   ═══════════════════════════════════════════════ */

interface FeishuUserRow {
  id: string;
  openId: string;
  name: string;
  role: string;
  siteIds: string[];
  createdAt: string;
}

const FEISHU_ROLE_LABELS: Record<string, string> = {
  unset: "未分配",
  org_admin: "集团管理",
  service_supervisor: "服务主管",
};

function FeishuView() {
  const { token } = useAuth();
  const [users, setUsers] = useState<FeishuUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [editUser, setEditUser] = useState<FeishuUserRow | null>(null);
  const [editRole, setEditRole] = useState("unset");
  const [editSiteIds, setEditSiteIds] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete"; user: FeishuUserRow } | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2000); }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/feishu-users", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setUsers(data.feishuUsers ?? []); }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    fetch("/api/admin/sites", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setSites((d.sites ?? d ?? []).map((s: any) => ({ id: s.id, name: s.name })))).catch(() => {});
  }, [token]);

  const openEdit = (u: FeishuUserRow) => { setEditUser(u); setEditRole(u.role); setEditSiteIds(Array.isArray(u.siteIds) ? u.siteIds : []); };

  const saveEdit = async () => {
    if (!editUser) return;
    setEditSubmitting(true);
    await fetch(`/api/admin/feishu-users/${editUser.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: editRole, siteIds: editRole === "service_supervisor" ? editSiteIds : [] }),
    });
    setEditUser(null); setEditSubmitting(false); fetchUsers(); showToast("飞书用户角色已更新");
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setConfirmSubmitting(true);
    await fetch(`/api/admin/feishu-users/${confirmAction.user.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setConfirmAction(null); setConfirmSubmitting(false); fetchUsers(); showToast("飞书用户已删除");
  };

  const siteName = (id: string) => sites.find(s => s.id === id)?.name ?? id;

  const ROLE_FILTER_MAP: Record<string, string> = { "集团管理": "org_admin", "服务主管": "service_supervisor", "未分配": "unset" };
  const filteredUsers = users.filter(u => {
    if (roleFilter && u.role !== ROLE_FILTER_MAP[roleFilter]) return false;
    if (!search.trim()) return true;
    return u.name.toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <>
      {toast && <div className="quality-toast">{toast}</div>}

      <div className="quality-records__header">
        <div>
          <div className="quality-records__title">飞书管理</div>
          <div className="quality-records__subtitle">管理飞书机器人用户的角色绑定。飞书用户首次给机器人发消息后自动出现在此列表。</div>
        </div>
      </div>

      <div className="quality-table-wrap">
        <div className="quality-toolbar">
          <div className="quality-toolbar__search-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索飞书昵称..." className="quality-toolbar__search" />
          </div>
          <div className="quality-toolbar__spacer" />
          <select className="quality-toolbar__select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">全部角色</option>
            <option value="集团管理">集团管理</option>
            <option value="服务主管">服务主管</option>
            <option value="未分配">未分配</option>
          </select>
        </div>
        {loading ? (
          <p style={{ padding: 20, color: "var(--quality-text-muted)" }}>加载中...</p>
        ) : (
          <table className="quality-records-table">
            <thead>
              <tr>
                {["飞书昵称", "角色", "管理站点", "注册时间", "操作"].map(h => (<th key={h}>{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr><td colSpan={5} className="quality-records-table__empty">暂无飞书用户</td></tr>
              )}
              {filteredUsers.map(u => (
                <tr key={u.id} onClick={() => openEdit(u)} style={{ cursor: "pointer" }}>
                  <td className="quality-records-table__worker">{u.name || u.openId}</td>
                  <td>
                    <span className={`quality-status-badge quality-status-badge--${u.role === "unset" ? "anomaly" : "normal"}`}>
                      {FEISHU_ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td>{u.role === "org_admin" ? "全部" : u.role === "service_supervisor" && Array.isArray(u.siteIds) && u.siteIds.length > 0 ? u.siteIds.map(siteName).join(", ") : "—"}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="quality-users__action-btn" onClick={(e) => { e.stopPropagation(); openEdit(u); }}>编辑</button>
                      <button className="quality-users__action-btn" onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "delete", user: u }); }}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editUser && (<>
        <div className="sw-scrim" onClick={() => setEditUser(null)} />
        <div className="quality-user-modal" role="dialog" aria-label={editUser.name || editUser.openId}>
          <div className="quality-user-modal__header">
            <div>
              <div className="quality-user-modal__title">{editUser.name || editUser.openId}</div>
              <div className="quality-user-modal__tags">
                <span className={`so-modal__chip ${editUser.role === "unset" ? "so-modal__chip--danger" : ""}`}>
                  {FEISHU_ROLE_LABELS[editUser.role] ?? editUser.role}
                </span>
              </div>
            </div>
            <CloseBtn onClick={() => setEditUser(null)} />
          </div>
          <div className="quality-user-modal__body">
            <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--quality-text)" }}>角色设置</h4>
            <div className="so-overview-grid">
              <dl className="so-overview-item"><dt>飞书昵称</dt><dd>{editUser.name || editUser.openId}</dd></dl>
              <dl className="so-overview-item"><dt>Open ID</dt><dd style={{ fontSize: 11, fontFamily: "monospace" }}>{editUser.openId}</dd></dl>
              <dl className="so-overview-item"><dt>注册时间</dt><dd>{new Date(editUser.createdAt).toLocaleDateString("zh-CN")}</dd></dl>
              <dl className="so-overview-item">
                <dt>角色</dt>
                <dd>
                  <select className="quality-user-modal__inline-input" value={editRole} onChange={e => setEditRole(e.target.value)} style={{ width: "100%", padding: "4px 8px" }}>
                    <option value="unset">未分配</option>
                    <option value="org_admin">集团管理</option>
                    <option value="service_supervisor">服务主管</option>
                  </select>
                </dd>
              </dl>
              {editRole === "service_supervisor" && (
                <dl className="so-overview-item" style={{ gridColumn: "1 / -1" }}>
                  <dt>管理站点</dt>
                  <dd>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {sites.map(s => (
                        <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input type="checkbox" checked={editSiteIds.includes(s.id)} onChange={e => {
                            setEditSiteIds(e.target.checked ? [...editSiteIds, s.id] : editSiteIds.filter(x => x !== s.id));
                          }} />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  </dd>
                </dl>
              )}
            </div>
          </div>
          <div className="quality-user-modal__footer">
            <div />
            <div className="quality-user-modal__footer-right">
              <button className="sw-btn sw-btn--secondary" onClick={() => setEditUser(null)} type="button">取消</button>
              <button className="sw-btn sw-btn--primary" disabled={editSubmitting} onClick={saveEdit} type="button">{editSubmitting ? "保存中..." : "保存"}</button>
            </div>
          </div>
        </div>
      </>)}

      {confirmAction && (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除飞书用户「${confirmAction.user.name || confirmAction.user.openId}」的绑定记录吗？`}
          confirmLabel="删除"
          danger={true}
          submitting={confirmSubmitting}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

