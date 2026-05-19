import React, { useState, useEffect, useCallback, type ReactNode } from "react";
import { Bot, Edit3 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { CopilotPanel } from "../features/siteOperations/CopilotPanel";
import { ProfileMenu } from "../shared/ProfileMenu";
import { SupervisorContent } from "../supervisor/SupervisorContent";
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

type View = "dashboard" | "sop" | "sites" | "users";

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
    { key: "sop", label: "规范管理", icon: <IconClipboardList /> },
    { key: "sites", label: "站点管理", icon: <IconDocument /> },
    { key: "users", label: "用户管理", icon: <IconUsers /> },
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
        {view === "sop" ? (
          <SupervisorContent />
        ) : (
          <div className="quality-content">
            {view === "dashboard" && <DashboardView />}
            {view === "sites" && <SitesView />}
            {view === "users" && <UsersView />}
          </div>
        )}
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

function SitesView() {
  const { token } = useAuth();
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [detailSite, setDetailSite] = useState<SiteData | null>(null);
  const [editingSite, setEditingSite] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ site: SiteData } | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2000); }, []);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sites", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setSites(data.sites); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

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
                <tr key={s.id} onDoubleClick={() => { setEditingSite(false); setDetailSite(s); }} style={{ cursor: "pointer" }}>
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
          setAllOperators(data.users.filter((u: any) => u.role === "site_operator"));
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
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>站点信息</h4>
              {!editing && <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2, display: "flex" }} onClick={() => setEditing(true)} type="button" title="编辑"><Edit3 size={14} /></button>}
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
            <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>运营人员</h4>
            {opsLoading ? <span style={{ color: "var(--quality-text-muted)", fontSize: 14 }}>加载中...</span> : allOperators.length === 0 ? <span style={{ color: "var(--quality-text-muted)", fontSize: 14 }}>暂无站点运营账号</span> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allOperators.map(op => (
                  <label key={op.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", borderRadius: 8, background: selectedOps.has(op.id) ? "#EFF6FF" : "transparent", border: `1px solid ${selectedOps.has(op.id) ? "#0052CC" : "#E5E7EB"}` }}>
                    <input type="checkbox" checked={selectedOps.has(op.id)} onChange={() => toggleOp(op.id)} style={{ width: 16, height: 16 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{op.name}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{op.username}</div>
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
          setAllOperators(data.users.filter((u: any) => u.role === "site_operator"));
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
                <label key={op.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", borderRadius: 8, background: selected.has(op.id) ? "#EFF6FF" : "transparent", border: `1px solid ${selected.has(op.id) ? "#0052CC" : "#E5E7EB"}` }}>
                  <input type="checkbox" checked={selected.has(op.id)} onChange={() => toggle(op.id)} style={{ width: 16, height: 16 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{op.name}</div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>{op.username}</div>
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

function UsersView() {
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
  const [search, setSearch] = useState("");
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
        setUsers(data.users.filter((u: QualityUser) => u.role !== "careworker"));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
                <tr key={u.id} onDoubleClick={() => openDetail(u)} style={{ cursor: "pointer" }}>
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
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>用户信息</h4>
            {!editing && <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2, display: "flex" }} onClick={() => setEditing(true)} type="button" title="编辑"><Edit3 size={14} /></button>}
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
          <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{message}</p>
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

