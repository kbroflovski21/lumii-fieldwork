import { useState, useRef, useEffect, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import "./quality.css";

/* ── Mock data ── */

const KPIs = [
  { label: "本周服务总量", value: "168", sub: "4 站点合计", trend: "+12%", up: true },
  { label: "服务完成率", value: "93%", sub: "较上周持平", trend: "0%", up: null },
  { label: "SOP 平均完成率", value: "87%", sub: "较上周 +3%", trend: "+3%", up: true },
  { label: "客户满意度", value: "4.6/5", sub: "较上周 +0.1", trend: "+0.1", up: true },
  { label: "异常率", value: "6.2%", sub: "较上周 -1.1%", trend: "-1.1%", up: false },
  { label: "投诉率", value: "1.8%", sub: "较上周 -0.3%", trend: "-0.3%", up: false },
];

const SITES_DATA = [
  { name: "翠苑站", services: 47, completion: 93, sopRate: 89, satisfaction: 4.7, anomaly: 6.4 },
  { name: "三墩站", services: 38, completion: 91, sopRate: 85, satisfaction: 4.5, anomaly: 7.8 },
  { name: "古荡站", services: 52, completion: 96, sopRate: 92, satisfaction: 4.8, anomaly: 4.2 },
  { name: "文新站", services: 31, completion: 88, sopRate: 81, satisfaction: 4.3, anomaly: 9.1 },
];

const SOP_RATES = [
  { service: "探访关爱", rate: 91, count: 82, issues: "安全检查步骤执行率偏低" },
  { service: "助浴", rate: 84, count: 36, issues: "皮肤检查和水温确认遗漏较多" },
  { service: "用药提醒", rate: 88, count: 28, issues: "药量核对步骤偶有缺失" },
  { service: "助餐", rate: 95, count: 22, issues: "基本达标" },
];

const ALL_RECORDS = [
  { id: "1", date: "05-15 09:48", site: "翠苑站", worker: "王建国", recipient: "张大伟", type: "探访关爱", duration: "43 分钟", sopRate: 100, status: "normal" as const, satisfaction: "满意" },
  { id: "2", date: "05-15 10:38", site: "翠苑站", worker: "李晓红", recipient: "王秀英", type: "用药提醒", duration: "28 分钟", sopRate: 85, status: "warning" as const, satisfaction: "—" },
  { id: "3", date: "05-15 11:15", site: "古荡站", worker: "陈秀芳", recipient: "赵淑芬", type: "助浴", duration: "75 分钟", sopRate: 100, status: "normal" as const, satisfaction: "非常满意" },
  { id: "4", date: "05-14 15:30", site: "文新站", worker: "张伟明", recipient: "刘国强", type: "探访关爱", duration: "40 分钟", sopRate: 20, status: "anomaly" as const, satisfaction: "—" },
  { id: "5", date: "05-14 14:00", site: "三墩站", worker: "周丽华", recipient: "孙志明", type: "探访关爱", duration: "45 分钟", sopRate: 100, status: "normal" as const, satisfaction: "满意" },
  { id: "6", date: "05-14 10:20", site: "古荡站", worker: "吴敏", recipient: "李淑珍", type: "助餐", duration: "35 分钟", sopRate: 95, status: "normal" as const, satisfaction: "满意" },
  { id: "7", date: "05-13 09:30", site: "翠苑站", worker: "王建国", recipient: "赵淑芬", type: "探访关爱", duration: "38 分钟", sopRate: 100, status: "normal" as const, satisfaction: "满意" },
  { id: "8", date: "05-13 14:10", site: "文新站", worker: "张伟明", recipient: "孙志明", type: "用药提醒", duration: "22 分钟", sopRate: 75, status: "warning" as const, satisfaction: "—" },
  { id: "9", date: "05-13 11:00", site: "三墩站", worker: "周丽华", recipient: "王秀英", type: "助浴", duration: "68 分钟", sopRate: 90, status: "normal" as const, satisfaction: "满意" },
  { id: "10", date: "05-12 09:05", site: "翠苑站", worker: "李晓红", recipient: "张大伟", type: "探访关爱", duration: "47 分钟", sopRate: 100, status: "normal" as const, satisfaction: "满意" },
];

const SITE_NAMES = ["全部站点", "翠苑站", "三墩站", "古荡站", "文新站"];
const STATUS_NAMES = ["全部状态", "正常", "警告", "异常"];

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

function IconChat({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

/* ── Helpers ── */

type View = "dashboard" | "records";

function rateClass(value: number, thresholds: [number, number]): string {
  if (value >= thresholds[0]) return "quality-table__value--success";
  if (value >= thresholds[1]) return "quality-table__value--warning";
  return "quality-table__value--danger";
}

function trendClass(label: string, up: boolean | null): string {
  if (up === null) return "quality-kpi-card__trend-value--neutral";
  const isInverse = label.includes("异常") || label.includes("投诉");
  if (isInverse) {
    return up ? "quality-kpi-card__trend-value--inv-up" : "quality-kpi-card__trend-value--inv-down";
  }
  return up ? "quality-kpi-card__trend-value--up" : "quality-kpi-card__trend-value--down";
}

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */

export function QualityPage() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [chatOpen, setChatOpen] = useState(false);

  const navItems: { key: View; label: string; icon: ReactNode }[] = [
    { key: "dashboard", label: "质量总览", icon: <IconShield /> },
    { key: "records", label: "服务记录", icon: <IconDocument /> },
  ];

  return (
    <div className="quality-page">
      {/* Left Icon Rail */}
      <div className="quality-rail">
        <div className="quality-rail__logo">
          <IconShield size={18} stroke="white" />
        </div>
        {navItems.map((n) => (
          <button
            key={n.key}
            onClick={() => setView(n.key)}
            title={n.label}
            className="quality-rail__btn"
            data-active={view === n.key}
          >
            {n.icon}
          </button>
        ))}
      </div>

      {/* Main Area */}
      <div className="quality-main">
        {/* Header */}
        <header className="quality-header">
          <div>
            <h1 className="quality-header__title">金色年华 · 集团质量管理</h1>
            <div className="quality-header__status">
              <span className="quality-header__dot" />
              运行中 · 4 个站点 · 本周 168 单
            </div>
          </div>
          <div className="quality-header__actions">
            <span className="quality-header__user">{user?.name}</span>
            {user?.role === "org_admin" && (
              <a href="/site-operations" className="quality-header__nav-link">
                进入站点运营
              </a>
            )}
            <button className="quality-header__logout" onClick={logout}>
              退出
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="quality-content">
          {view === "dashboard" && <DashboardView />}
          {view === "records" && <RecordsView />}
        </div>
      </div>

      {/* AI Floating Button */}
      {!chatOpen && (
        <button className="quality-ai-fab" onClick={() => setChatOpen(true)}>
          <IconChat />
        </button>
      )}
      {chatOpen && <ChatDrawer onClose={() => setChatOpen(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Dashboard View
   ═══════════════════════════════════════════════ */

function DashboardView() {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="quality-dashboard__title">质量总览</div>
        <div className="quality-dashboard__subtitle">跨站点服务质量监测与分析</div>
      </div>

      {/* KPIs */}
      <div className="quality-kpi-grid">
        {KPIs.map((k) => (
          <div key={k.label} className="quality-kpi-card">
            <div className="quality-kpi-card__label">{k.label}</div>
            <div className="quality-kpi-card__value">{k.value}</div>
            <div className="quality-kpi-card__trend">
              <span className={`quality-kpi-card__trend-value ${trendClass(k.label, k.up)}`}>
                {k.trend !== "0%" ? k.trend : "—"}
              </span>{" "}
              <span className="quality-kpi-card__sub">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Site comparison table */}
      <div className="quality-section-label">站点对比</div>
      <div className="quality-table-wrap">
        <table className="quality-table">
          <thead>
            <tr>
              {["站点", "服务量", "完成率", "SOP 完成率", "满意度", "异常率"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SITES_DATA.map((s) => (
              <tr key={s.name}>
                <td className="quality-table__site-name">{s.name}</td>
                <td>{s.services}</td>
                <td>{s.completion}%</td>
                <td>
                  <span className={rateClass(s.sopRate, [90, 80])}>{s.sopRate}%</span>
                </td>
                <td>{s.satisfaction}</td>
                <td>
                  <span className={s.anomaly <= 5 ? "quality-table__value--success" : s.anomaly <= 8 ? "quality-table__value--warning" : "quality-table__value--danger"}>
                    {s.anomaly}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SOP by service */}
      <div className="quality-section-label">服务项目 SOP 完成率</div>
      <div className="quality-sop-grid">
        {SOP_RATES.map((s) => {
          const colorClass = rateClass(s.rate, [90, 80]);
          return (
            <div key={s.service} className="quality-sop-card">
              <div className="quality-sop-card__header">
                <span className="quality-sop-card__name">{s.service}</span>
                <span className={`quality-sop-card__rate ${colorClass}`}>{s.rate}%</span>
              </div>
              <div className="quality-sop-card__bar">
                <div
                  className="quality-sop-card__bar-fill"
                  style={{
                    width: `${s.rate}%`,
                    background: s.rate >= 90 ? "var(--quality-success-text)" : s.rate >= 80 ? "var(--quality-warning-text)" : "var(--quality-danger-text)",
                  }}
                />
              </div>
              <div className="quality-sop-card__detail">
                {s.count} 次服务 · {s.issues}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   Records View
   ═══════════════════════════════════════════════ */

function RecordsView() {
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("全部站点");
  const [statusFilter, setStatusFilter] = useState("全部状态");

  const statusMap: Record<string, string> = { "正常": "normal", "警告": "warning", "异常": "anomaly" };
  const filtered = ALL_RECORDS.filter((r) => {
    if (siteFilter !== "全部站点" && r.site !== siteFilter) return false;
    if (statusFilter !== "全部状态" && r.status !== statusMap[statusFilter]) return false;
    if (search && !r.worker.includes(search) && !r.recipient.includes(search)) return false;
    return true;
  });

  const stLabel = (s: string) => (s === "normal" ? "正常" : s === "warning" ? "警告" : "异常");

  return (
    <>
      <div className="quality-records__header">
        <div>
          <div className="quality-records__title">服务记录</div>
          <div className="quality-records__subtitle">查看所有站点的服务记录和质量数据</div>
        </div>
      </div>

      <div className="quality-table-wrap">
        {/* Toolbar */}
        <div className="quality-toolbar">
          <div className="quality-toolbar__search-wrap">
            <span className="quality-toolbar__search-icon"><IconSearch /></span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索社工或服务对象..."
              className="quality-toolbar__search"
            />
          </div>
          <div className="quality-toolbar__spacer" />
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className={`quality-toolbar__select ${siteFilter !== "全部站点" ? "quality-toolbar__select--active" : "quality-toolbar__select--inactive"}`}
          >
            {SITE_NAMES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`quality-toolbar__select ${statusFilter !== "全部状态" ? "quality-toolbar__select--active" : "quality-toolbar__select--inactive"}`}
          >
            {STATUS_NAMES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <table className="quality-records-table">
          <thead>
            <tr>
              {["时间", "站点", "社工", "服务对象", "服务项目", "时长", "SOP", "满意度", "状态"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="quality-records-table__empty">
                  无匹配记录
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="quality-records-table__date">{r.date}</td>
                <td className="quality-records-table__site">{r.site}</td>
                <td className="quality-records-table__worker">{r.worker}</td>
                <td className="quality-records-table__recipient">{r.recipient}</td>
                <td className="quality-records-table__type">{r.type}</td>
                <td className="quality-records-table__duration">{r.duration}</td>
                <td>
                  <span className={rateClass(r.sopRate, [90, 60])}>{r.sopRate}%</span>
                </td>
                <td className="quality-records-table__satisfaction">{r.satisfaction}</td>
                <td>
                  <span className={`quality-status-badge quality-status-badge--${r.status}`}>
                    {stLabel(r.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   Chat Drawer (AI chat — mock response, no API key)
   ═══════════════════════════════════════════════ */

interface ChatMsg {
  id: string;
  role: "agent" | "user";
  content: string;
  time: string;
}

/*
 * TODO: Replace mock response with real AI API call.
 * The original used DashScope (qwen3-max) — re-enable when API key
 * is available via server-side proxy to avoid exposing secrets in the client.
 */
function getMockAIResponse(userMessage: string): string {
  if (userMessage.includes("文新") || userMessage.includes("异常")) {
    return "文新站目前是异常率最高的站点（9.1%），主要问题集中在：\n\n1. SOP 完成率偏低（81%），尤其是探访关爱的安全检查步骤\n2. 服务完成率 88%，低于集团平均 93%\n3. 满意度 4.3，为四站最低\n\n建议：安排针对性培训，重点加强 SOP 执行监督，可参考古荡站的管理经验（异常率仅 4.2%）。";
  }
  if (userMessage.includes("古荡") || userMessage.includes("最好")) {
    return "古荡站是目前表现最优秀的站点：\n\n- 服务量最高：52 次\n- 完成率：96%（最高）\n- SOP 完成率：92%（最高）\n- 满意度：4.8（最高）\n- 异常率：4.2%（最低）\n\n古荡站的经验可以作为其他站点的标杆，建议组织经验分享会。";
  }
  if (userMessage.includes("助浴") || userMessage.includes("SOP")) {
    return "助浴服务的 SOP 完成率为 84%，在四项服务中最低。主要问题：\n\n- 皮肤检查步骤遗漏率较高\n- 水温确认步骤执行不规范\n\n共 36 次服务中约有 6 次存在关键步骤缺失。建议：\n1. 制作助浴 SOP 执行清单卡片\n2. 加强入户前检查培训\n3. 考虑增加助浴服务的督导频次";
  }
  return "根据当前数据分析：\n\n- 本周总服务 168 次，整体 SOP 完成率 87%，满意度 4.6/5\n- 古荡站表现最优，文新站需重点关注\n- 助浴服务 SOP 完成率最低（84%），建议加强培训\n\n您可以问我具体站点或服务项目的详细分析。";
}

function ChatDrawer({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "w",
      role: "agent",
      content:
        "您好，我是质量管理 AI 助手。\n\n我可以帮您：\n· 分析某个站点的质量趋势\n· 对比不同站点的表现\n· 查看某项服务的 SOP 执行情况\n· 解释异常原因和改进建议\n\n请问有什么需要了解的？",
      time: "",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: text, time }]);
    setInput("");
    setIsTyping(true);

    // Mock AI response with a slight delay
    setTimeout(() => {
      const reply = getMockAIResponse(text);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "agent",
          content: reply,
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      <div className="quality-chat-overlay" onClick={onClose} />
      <div className="quality-chat-drawer">
        {/* Header */}
        <div className="quality-chat-drawer__header">
          <div className="quality-chat-drawer__header-left">
            <div className="quality-chat-drawer__avatar">
              <IconChat size={14} />
            </div>
            <span className="quality-chat-drawer__title">AI 质量助手</span>
          </div>
          <button className="quality-chat-drawer__close" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        {/* Messages */}
        <div className="quality-chat-drawer__messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`quality-chat-msg quality-chat-msg--${msg.role}`}>
              {msg.role === "agent" && (
                <div className="quality-chat-msg__avatar">
                  <IconChat size={12} />
                </div>
              )}
              <div className="quality-chat-msg__body">
                <div className={`quality-chat-msg__bubble quality-chat-msg__bubble--${msg.role}`}>
                  {msg.content}
                </div>
                {msg.time && (
                  <div className={`quality-chat-msg__time quality-chat-msg__time--${msg.role}`}>
                    {msg.time}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="quality-chat-typing">
              <div className="quality-chat-msg__avatar">
                <IconChat size={12} />
              </div>
              <div className="quality-chat-typing__bubble">正在思考...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="quality-chat-input">
          <div className="quality-chat-input__row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入问题..."
              className="quality-chat-input__field"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`quality-chat-input__send ${input.trim() ? "quality-chat-input__send--active" : "quality-chat-input__send--disabled"}`}
            >
              <IconSend />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
