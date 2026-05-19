import React, { useState, useEffect, useCallback, type ReactNode } from "react";
import { Bot } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { CopilotPanel } from "../features/siteOperations/CopilotPanel";
import { ProfileMenu } from "../shared/ProfileMenu";
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

function IconSearch() {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
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

type View = "dashboard" | "records" | "users";

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
  const { user } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [copilotOpen, setCopilotOpen] = useState(false);

  const navItems: { key: View; label: string; icon: ReactNode }[] = [
    { key: "dashboard", label: "质量总览", icon: <IconShield /> },
    { key: "records", label: "服务记录", icon: <IconDocument /> },
    { key: "users", label: "用户管理", icon: <IconUsers /> },
  ];

  return (
    <div className="quality-page" data-copilot-open={copilotOpen}>
      {/* Header — row 1, spans all columns */}
      <header className="quality-header">
        <div>
          <h1 className="quality-header__title">金色年华 · 集团质量管理</h1>
          <div className="quality-header__status">
            <span className="quality-header__dot" />
            运行中 · 4 个站点 · 本周 168 单
          </div>
        </div>
        <div className="quality-header__actions">
          {user?.role === "org_admin" && (
            <a href="/site-operations" className="quality-header__nav-link">
              进入站点运营
            </a>
          )}
          <button
            className="copilot-toggle"
            data-active={copilotOpen}
            onClick={() => setCopilotOpen((prev) => !prev)}
            type="button"
            aria-label={copilotOpen ? "关闭 AI 助手" : "打开 AI 助手"}
          >
            <Bot size={18} />
          </button>
        </div>
      </header>

      {/* Left Icon Rail — row 2, col 1 */}
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
        <ProfileMenu />
      </div>

      {/* Main content — row 2, col 2 */}
      <div className="quality-main">
        <div className="quality-content">
          {view === "dashboard" && <DashboardView />}
          {view === "records" && <RecordsView />}
          {view === "users" && <UsersView />}
        </div>
      </div>

      {/* CopilotPanel — row 2, col 3 */}
      <CopilotPanel
        workAreaId="quality"
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />

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
  service_supervisor: "服务主管",
  careworker: "护理员",
};

type UserModalMode = "view" | "create" | "edit";

function UsersView() {
  const { token } = useAuth();
  const [users, setUsers] = useState<QualityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [modalUser, setModalUser] = useState<QualityUser | null>(null);
  const [modalMode, setModalMode] = useState<UserModalMode>("view");

  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "toggle"; user: QualityUser } | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openView = (u: QualityUser) => { setModalUser(u); setModalMode("view"); };
  const openCreate = () => { setModalUser(null); setModalMode("create"); };
  const openEdit = (u: QualityUser) => { setModalUser(u); setModalMode("edit"); };
  const closeModal = () => { setModalUser(null); setModalMode("view"); };

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
        if (modalUser?.id === confirmAction.user.id) closeModal();
      }
      fetchUsers();
    } catch { /* ignore */ }
    setConfirmAction(null);
    setConfirmSubmitting(false);
  };

  return (
    <>
      {toast && <div className="quality-toast">{toast}</div>}

      <div className="quality-records__header">
        <div>
          <div className="quality-records__title">用户管理</div>
          <div className="quality-records__subtitle">管理系统用户账号、角色和权限</div>
        </div>
        <button className="quality-users__add-btn" onClick={openCreate}>新增用户</button>
      </div>

      <div className="quality-table-wrap">
        {loading ? (
          <p style={{ padding: 20, color: "var(--quality-text-muted)" }}>加载中...</p>
        ) : (
          <table className="quality-records-table">
            <thead>
              <tr>
                {["用户名", "姓名", "角色", "手机号", "状态", "操作"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} className="quality-records-table__empty">暂无用户</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} onDoubleClick={() => openView(u)} style={{ cursor: "pointer" }}>
                  <td>
                    <a className="quality-users__link" onClick={(e) => { e.preventDefault(); openView(u); }} href="#">
                      {u.username}
                    </a>
                  </td>
                  <td className="quality-records-table__worker">{u.name}</td>
                  <td>{QUALITY_ROLE_LABELS[u.role] ?? u.role}</td>
                  <td>{u.phone || "—"}</td>
                  <td>
                    <span className={`quality-status-badge quality-status-badge--${u.status === "active" ? "normal" : "anomaly"}`}>
                      {u.status === "active" ? "正常" : "已禁用"}
                    </span>
                  </td>
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

      {/* ── User Detail/Edit/Create Modal (so-modal style) ── */}
      {(modalUser || modalMode === "create") && (
        <UserModal
          mode={modalMode}
          user={modalUser}
          token={token!}
          onClose={closeModal}
          onSaved={() => { fetchUsers(); showToast(modalMode === "create" ? "用户创建成功" : "用户信息已更新"); closeModal(); }}
          onEdit={() => setModalMode("edit")}
          onResetPassword={() => showToast("密码已重置")}
          onToggle={(u) => setConfirmAction({ type: "toggle", user: u })}
          onDelete={(u) => setConfirmAction({ type: "delete", user: u })}
        />
      )}

      {/* ── Confirm Dialog (delete/toggle) ── */}
      {confirmAction && (
        <div className="sw-scrim" onClick={() => setConfirmAction(null)}>
          <div className="quality-modal" onClick={e => e.stopPropagation()} style={{ zIndex: 32 }}>
            <div className="quality-modal__header">
              <span>{confirmAction.type === "delete" ? "确认删除" : (confirmAction.user.status === "active" ? "确认禁用" : "确认启用")}</span>
              <button onClick={() => setConfirmAction(null)}>&times;</button>
            </div>
            <div className="quality-modal__body">
              <div className="quality-modal__warning">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 6v4m0 4h.01M3.07 16.5h13.86c1.1 0 1.79-1.19 1.24-2.14L11.24 3.14a1.43 1.43 0 0 0-2.48 0L1.83 14.36c-.55.95.14 2.14 1.24 2.14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>
                    {confirmAction.type === "delete"
                      ? `确定要删除用户「${confirmAction.user.name}」吗？`
                      : confirmAction.user.status === "active"
                        ? `确定要禁用用户「${confirmAction.user.name}」吗？`
                        : `确定要启用用户「${confirmAction.user.name}」吗？`}
                  </p>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    {confirmAction.type === "delete"
                      ? "删除后该用户数据将无法恢复。"
                      : confirmAction.user.status === "active"
                        ? "禁用后该用户将无法登录系统。"
                        : "启用后该用户将恢复登录权限。"}
                  </p>
                </div>
              </div>
            </div>
            <div className="quality-modal__footer">
              <button type="button" className="quality-modal__btn quality-modal__btn--cancel" onClick={() => setConfirmAction(null)}>取消</button>
              <button type="button" className="quality-modal__btn quality-modal__btn--danger" disabled={confirmSubmitting} onClick={handleConfirm}>
                {confirmSubmitting ? "处理中..." : confirmAction.type === "delete" ? "确认删除" : (confirmAction.user.status === "active" ? "确认禁用" : "确认启用")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── User Modal Component (so-modal design) ── */

function UserModal({ mode, user, token, onClose, onSaved, onEdit, onResetPassword, onToggle, onDelete }: {
  mode: UserModalMode;
  user: QualityUser | null;
  token: string;
  onClose: () => void;
  onSaved: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggle: (u: QualityUser) => void;
  onDelete: (u: QualityUser) => void;
}) {
  const isCreate = mode === "create";
  const isEdit = mode === "edit";
  const isView = mode === "view";

  const [form, setForm] = useState({
    username: user?.username ?? "",
    password: "",
    name: user?.name ?? "",
    role: user?.role ?? "site_operator",
    phone: user?.phone ?? "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [resetPwd, setResetPwd] = useState("");
  const [resetPwdConfirm, setResetPwdConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");

  useEffect(() => {
    setForm({
      username: user?.username ?? "",
      password: "",
      name: user?.name ?? "",
      role: user?.role ?? "site_operator",
      phone: user?.phone ?? "",
    });
    setError("");
    setActiveTab("info");
    setResetPwd("");
    setResetPwdConfirm("");
    setResetError("");
  }, [user, mode]);

  const handleSubmit = async () => {
    setError("");
    if (isCreate && (!form.username || !form.password || !form.name)) {
      setError("用户名、密码和姓名为必填");
      return;
    }
    if (isEdit && !form.name) {
      setError("姓名为必填");
      return;
    }
    setSubmitting(true);
    try {
      if (isCreate) {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ username: form.username, password: form.password, name: form.name, role: form.role, phone: form.phone, siteIds: [] }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error ?? "创建失败"); setSubmitting(false); return; }
      } else {
        const res = await fetch(`/api/admin/users/${user!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: form.name, phone: form.phone, status: form.role === user!.role ? undefined : undefined }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error ?? "更新失败"); setSubmitting(false); return; }
      }
      onSaved();
    } catch { setError("网络错误"); }
    setSubmitting(false);
  };

  const handleResetPassword = async () => {
    setResetError("");
    if (!resetPwd || resetPwd.length < 6) { setResetError("密码至少6位"); return; }
    if (resetPwd !== resetPwdConfirm) { setResetError("两次密码输入不一致"); return; }
    setResetSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user!.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: resetPwd }),
      });
      if (res.ok) {
        setResetPwd("");
        setResetPwdConfirm("");
        onResetPassword();
      } else {
        const d = await res.json();
        setResetError(d.error ?? "重置失败");
      }
    } catch { setResetError("网络错误"); }
    setResetSubmitting(false);
  };

  return (
    <>
      <div className="sw-scrim" onClick={onClose} />
      <div className="so-modal so-modal--view" role="dialog" aria-label={isCreate ? "新增用户" : user?.name}>
        {/* Header */}
        <div className="so-modal__summary">
          <div className="so-modal__summary-main">
            <div className="so-modal__summary-name">
              <h3>{isCreate ? "新增用户" : (isEdit ? "编辑用户" : user?.name)}</h3>
              {isView && user && (
                <span className="so-modal__summary-demo">{user.username}</span>
              )}
            </div>
            <div className="so-modal__summary-actions">
              <button className="so-modal__close" aria-label="关闭" onClick={onClose} type="button">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          {isView && user && (
            <div className="so-modal__summary-tags">
              <span className="so-modal__chip">{QUALITY_ROLE_LABELS[user.role] ?? user.role}</span>
              <span className={`so-modal__chip ${user.status === "active" ? "" : "so-modal__chip--danger"}`}>
                {user.status === "active" ? "正常" : "已禁用"}
              </span>
            </div>
          )}
        </div>

        {/* Tabs (view mode only) */}
        {isView && (
          <div className="so-modal__tabs" role="tablist">
            <button className="so-modal__tab" data-active={activeTab === "info"} onClick={() => setActiveTab("info")} role="tab" type="button">基本信息</button>
            <button className="so-modal__tab" data-active={activeTab === "password"} onClick={() => setActiveTab("password")} role="tab" type="button">重置密码</button>
          </div>
        )}

        {/* Content */}
        <div className="so-modal__content">
          {isView && activeTab === "info" && user && (
            <div className="so-overview-grid">
              <dl className="so-overview-item"><dt>用户名</dt><dd>{user.username}</dd></dl>
              <dl className="so-overview-item"><dt>姓名</dt><dd>{user.name}</dd></dl>
              <dl className="so-overview-item"><dt>角色</dt><dd>{QUALITY_ROLE_LABELS[user.role] ?? user.role}</dd></dl>
              <dl className="so-overview-item"><dt>手机号</dt><dd>{user.phone || "—"}</dd></dl>
              <dl className="so-overview-item"><dt>状态</dt><dd>{user.status === "active" ? "正常" : "已禁用"}</dd></dl>
              <dl className="so-overview-item"><dt>创建时间</dt><dd>{user.createdAt?.slice(0, 10) ?? "—"}</dd></dl>
            </div>
          )}

          {isView && activeTab === "password" && user && (
            <div className="so-form-cards">
              <div className="so-form-card">
                <h4 className="so-form-card__title">重置密码</h4>
                {resetError && <div className="quality-modal__error">{resetError}</div>}
                <div className="sw-field"><span>新密码</span><input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} placeholder="至少6位" /></div>
                <div className="sw-field"><span>确认密码</span><input type="password" value={resetPwdConfirm} onChange={e => setResetPwdConfirm(e.target.value)} placeholder="再次输入新密码" /></div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="sw-btn sw-btn--primary" disabled={resetSubmitting} onClick={handleResetPassword} type="button">
                    {resetSubmitting ? "重置中..." : "确认重置"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {(isCreate || isEdit) && (
            <div className="so-form-cards">
              <div className="so-form-card">
                <h4 className="so-form-card__title">账号信息</h4>
                {error && <div className="quality-modal__error">{error}</div>}
                {isCreate && (
                  <>
                    <div className="so-form-card__row">
                      <div className="sw-field"><span>用户名</span><input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required /></div>
                      <div className="sw-field"><span>密码</span><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="至少6位" /></div>
                    </div>
                  </>
                )}
                <div className="so-form-card__row">
                  <div className="sw-field"><span>姓名</span><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                  <div className="sw-field"><span>手机号</span><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="选填" /></div>
                </div>
                <div className="so-form-card__row">
                  <div className="sw-field">
                    <span>角色</span>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} disabled={isEdit}>
                      <option value="site_operator">站点运营</option>
                      <option value="service_supervisor">服务主管</option>
                      <option value="org_admin">集团管理</option>
                      <option value="careworker">护理员</option>
                    </select>
                  </div>
                  <div />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="so-modal__footer">
          <div>
            {isView && user && (
              <>
                <button className="sw-btn sw-btn--danger-ghost" onClick={() => onDelete(user)} type="button">删除</button>
                <button className="sw-btn sw-btn--secondary" onClick={() => onToggle(user)} type="button" style={{ marginLeft: 8 }}>
                  {user.status === "active" ? "禁用" : "启用"}
                </button>
              </>
            )}
          </div>
          <div className="so-modal__footer-right">
            {isView && <button className="sw-btn sw-btn--primary" onClick={onEdit} type="button">编辑</button>}
            {(isCreate || isEdit) && (
              <>
                <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">取消</button>
                <button className="sw-btn sw-btn--primary" disabled={submitting} onClick={handleSubmit} type="button">
                  {submitting ? "保存中..." : (isCreate ? "创建用户" : "保存修改")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

