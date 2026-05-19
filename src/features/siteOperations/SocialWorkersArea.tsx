import { useEscClose } from "./useEscClose";
import { useState, useCallback, useEffect } from "react";
import { Search, X, ChevronDown, Plus, UserRound, Phone, Award, Edit3, Shield, ThumbsUp } from "lucide-react";
import type {
  SocialWorker,
  SocialWorkerStatus,
  WorkAreaOperationalState,
  SocialWorkersResponse
} from "./contracts";
import { statusText } from "./contracts";
import { siteOperationsApi } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";

type DrawerMode =
  | { kind: "closed" }
  | { kind: "view"; worker: SocialWorker }
  | { kind: "edit"; worker: SocialWorker }
  | { kind: "create" };

type StatusFilter = "" | SocialWorkerStatus;
type BadgeFilter = "" | "bound" | "unbound";

const statusFilterOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "全部状态", value: "" },
  { label: "在职", value: "active" },
  { label: "已停用", value: "disabled" },
  { label: "资料待补全", value: "incomplete_profile" }
];

const badgeFilterOptions: Array<{ label: string; value: BadgeFilter }> = [
  { label: "工牌绑定", value: "" },
  { label: "已绑定工牌", value: "bound" },
  { label: "未绑定工牌", value: "unbound" }
];

function statusTone(status: SocialWorkerStatus) {
  if (status === "active") return "success";
  if (status === "incomplete_profile") return "warning";
  return "muted";
}

function badgeStatusTone(status: string) {
  if (status === "available" || status === "in_use") return "success";
  if (status === "offline" || status === "sync_delayed" || status === "low_battery") return "warning";
  return "muted";
}

function formatSyncTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

function getInitials(name: string) {
  return name.slice(0, 1);
}

function avatarColor(name: string) {
  const colors = [
    { bg: "#EEF2FF", text: "#4F46E5" },
    { bg: "#F0FDF4", text: "#16A34A" },
    { bg: "#FFF7ED", text: "#EA580C" },
    { bg: "#FDF2F8", text: "#DB2777" },
    { bg: "#ECFEFF", text: "#0891B2" },
    { bg: "#F5F3FF", text: "#7C3AED" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function SocialWorkersArea({ resource, onMutate }: { resource: Resource<SocialWorkersResponse>; onMutate?: () => void }) {
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>("");
  const operationalState = resource.status === "success" ? resource.data.operationalState : undefined;
  const mutationsDisabled = isMutationDisabled(operationalState);

  const workers = resource.status === "success" ? resource.data.socialWorkers : [];

  const openDrawer = useCallback((worker: SocialWorker) => {
    setDrawer({ kind: "view", worker });
  }, []);

  const handleWorkerCreated = useCallback(() => {
    onMutate?.();
    setDrawer({ kind: "closed" });
  }, [onMutate]);

  const handleWorkerUpdated = useCallback(() => {
    onMutate?.();
    setDrawer({ kind: "closed" });
  }, [onMutate]);

  const handleWorkerRefresh = useCallback(() => {
    onMutate?.();
  }, [onMutate]);

  // Sync drawer worker with refreshed list data
  useEffect(() => {
    if (drawer.kind !== "closed" && "worker" in drawer) {
      const fresh = workers.find(w => w.id === drawer.worker.id);
      if (fresh && fresh !== drawer.worker) {
        setDrawer(prev => prev.kind !== "closed" && "worker" in prev ? { ...prev, worker: fresh } : prev);
      }
    }
  }, [workers]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = workers.filter((w) => {
    if (statusFilter && w.status !== statusFilter) return false;
    if (badgeFilter === "bound" && !w.preferredBadge) return false;
    if (badgeFilter === "unbound" && w.preferredBadge) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!w.name.toLowerCase().includes(q) && !w.phone.includes(q)) return false;
    }
    return true;
  });

  const isLoading = resource.status === "loading" || resource.status === "idle";
  useEscClose(useCallback(() => setDrawer({ kind: "closed" }), []));

  return (
    <>
      <section aria-label="服务人员" className="sw-page">
        <div className="sw-page__inner">
          <header className="sw-header">
            <div className="sw-header__title-group">
              <h2 className="sw-header__title">服务人员</h2>
              <p className="sw-header__desc">管理站点人员目录、联系方式和常用工牌关系</p>
            </div>
            <button
              className="sw-btn sw-btn--primary"
              disabled={mutationsDisabled}
              onClick={() => setDrawer({ kind: "create" })}
              type="button"
            >
              <Plus size={15} />
              新增人员
            </button>
          </header>

          <div className="sw-table-container">
            <div className="sw-toolbar">
              <label className="sw-search">
                <Search size={16} />
                <input
                  aria-label="搜索服务人员"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索姓名或电话..."
                  value={searchQuery}
                />
              </label>
              <div className="sw-toolbar__filters">
                <FilterDropdown
                  onChange={(v) => setStatusFilter(v as StatusFilter)}
                  options={statusFilterOptions}
                  value={statusFilter}
                />
                <FilterDropdown
                  onChange={(v) => setBadgeFilter(v as BadgeFilter)}
                  options={badgeFilterOptions}
                  value={badgeFilter}
                />
              </div>
            </div>

            {operationalState ? <OperationalBanner state={operationalState} /> : null}

            <WorkerContent
              filtered={filtered}
              loading={isLoading}
              error={resource.status === "error" ? resource.error : undefined}
              isEmpty={resource.status === "success" && workers.length === 0}
              isFilterEmpty={resource.status === "success" && workers.length > 0 && filtered.length === 0}
              mutationsDisabled={mutationsDisabled}
              onCreateClick={() => setDrawer({ kind: "create" })}
              onRowClick={(worker) => setSelectedId(worker.id)}
              onNameClick={openDrawer}
              onRowDoubleClick={openDrawer}
              selectedId={selectedId}
            />
          </div>
        </div>

        {drawer.kind !== "closed" ? (
          <>
            <button
              aria-label="关闭抽屉遮罩"
              className="sw-scrim"
              onClick={() => setDrawer({ kind: "closed" })}
              type="button"
            />
            <WorkerDrawer
              drawer={drawer}
              mutationsDisabled={mutationsDisabled}
              onClose={() => setDrawer({ kind: "closed" })}
              onEdit={(worker) => setDrawer({ kind: "edit", worker })}
              onView={(worker) => setDrawer({ kind: "view", worker })}
              onWorkerCreated={handleWorkerCreated}
              onWorkerUpdated={handleWorkerUpdated}
              onWorkerRefresh={handleWorkerRefresh}
            />
          </>
        ) : null}
      </section>
    </>
  );
}

function FilterDropdown({
  onChange,
  options,
  value
}: {
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const isFiltered = value !== "";
  return (
    <div className="sw-filter">
      <select
        className={isFiltered ? "sw-filter--active" : ""}
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}

function OperationalBanner({ state }: { state: WorkAreaOperationalState }) {
  if (state.unavailableMessage) {
    return (
      <div className="sw-banner sw-banner--danger" role="status">
        <Shield size={16} />
        <div>
          <strong>服务人员暂不可用</strong>
          <span>{state.unavailableMessage}</span>
        </div>
      </div>
    );
  }
  if (state.permission === "read_only") {
    return (
      <div className="sw-banner sw-banner--warning" role="status">
        <Shield size={16} />
        <div>
          <strong>只读模式</strong>
          <span>可查看数据，新增、编辑、归档等操作已禁用。</span>
        </div>
      </div>
    );
  }
  if (state.permission === "restricted") {
    return (
      <div className="sw-banner sw-banner--warning" role="status">
        <Shield size={16} />
        <div>
          <strong>权限受限</strong>
          <span>敏感信息已隐藏，部分操作不可用。</span>
        </div>
      </div>
    );
  }
  return null;
}

function WorkerContent({
  filtered,
  loading,
  error,
  isEmpty,
  isFilterEmpty,
  mutationsDisabled,
  onCreateClick,
  onRowClick,
  onNameClick,
  onRowDoubleClick,
  selectedId
}: {
  filtered: SocialWorker[];
  loading: boolean;
  error?: string;
  isEmpty: boolean;
  isFilterEmpty: boolean;
  mutationsDisabled: boolean;
  onCreateClick: () => void;
  onRowClick: (worker: SocialWorker) => void;
  onNameClick: (worker: SocialWorker) => void;
  onRowDoubleClick: (worker: SocialWorker) => void;
  selectedId: string | null;
}) {
  if (loading) {
    return (
      <div className="sw-empty">
        <div className="sw-empty__icon"><UserRound size={32} /></div>
        <span>服务人员数据加载中...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="sw-empty">
        <div className="sw-empty__icon sw-empty__icon--error"><X size={32} /></div>
        <span>{error}</span>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="sw-empty">
        <div className="sw-empty__icon"><UserRound size={32} /></div>
        <strong>暂无服务人员</strong>
        <span>点击新增创建第一条记录</span>
        <button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={onCreateClick} type="button">
          <Plus size={15} />
          新增服务人员
        </button>
      </div>
    );
  }
  if (isFilterEmpty) {
    return (
      <div className="sw-empty">
        <div className="sw-empty__icon"><Search size={32} /></div>
        <span>没有匹配的服务人员</span>
      </div>
    );
  }

  return (
    <>
      <div className="sw-table" role="table">
        <div className="sw-table__head" role="row">
          <span role="columnheader">姓名</span>
          <span role="columnheader">联系方式</span>
          <span role="columnheader">资质</span>
          <span role="columnheader">常用工牌</span>
          <span role="columnheader">表扬</span>
          <span role="columnheader">状态</span>
        </div>
        {filtered.map((worker) => {
          const color = avatarColor(worker.name);
          return (
            <div
              className="sw-table__row"
              data-selected={selectedId === worker.id}
              key={worker.id}
              onClick={() => onRowClick(worker)}
              onDoubleClick={() => onRowDoubleClick(worker)}
              role="row"
            >
              <div role="cell" className="sw-table__cell-name">
                <div className="sw-avatar" style={{ background: color.bg, color: color.text }}>
                  {getInitials(worker.name)}
                </div>
                <div className="sw-name-group">
                  <button
                    className="sw-name-link"
                    onClick={(e) => { e.stopPropagation(); onNameClick(worker); }}
                    type="button"
                  >
                    {worker.name}
                  </button>
                  <small>服务人员</small>
                </div>
              </div>
              <div role="cell" className="sw-table__cell-phone">
                <Phone size={14} className="sw-cell-icon" />
                {worker.phone}
              </div>
              <div role="cell">
                {worker.qualificationLabels.length > 0
                  ? <div className="sw-tags">{worker.qualificationLabels.map(q => <span key={q} className="sw-tag">{q}</span>)}</div>
                  : <span className="sw-text-muted">—</span>}
              </div>
              <div role="cell">
                {worker.preferredBadge ? (
                  <span className="sw-badge-cell">
                    <span className="sw-badge-code">{worker.preferredBadge.deviceCode}</span>
                    <span className="sw-status-dot" data-tone={badgeStatusTone(worker.preferredBadge.status)}>
                      {statusText[worker.preferredBadge.status] ?? worker.preferredBadge.status}
                    </span>
                  </span>
                ) : (
                  <span className="sw-text-muted">未绑定</span>
                )}
              </div>
              <div role="cell" className="sw-table__cell-praise">
                <ThumbsUp size={14} className="sw-cell-icon sw-cell-icon--praise" />
                <span>{worker.praiseSummary.praiseCount}</span>
              </div>
              <div role="cell">
                <span className="sw-status-badge" data-tone={statusTone(worker.status)}>
                  {statusText[worker.status] ?? worker.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sw-mobile-list">
        {filtered.map((worker) => {
          const color = avatarColor(worker.name);
          return (
            <button
              className="sw-mobile-card"
              key={worker.id}
              onClick={() => onNameClick(worker)}
              type="button"
            >
              <div className="sw-mobile-card__top">
                <div className="sw-avatar" style={{ background: color.bg, color: color.text }}>
                  {getInitials(worker.name)}
                </div>
                <div className="sw-mobile-card__info">
                  <strong>{worker.name}</strong>
                  <span>{worker.phone}</span>
                </div>
                <span className="sw-status-badge" data-tone={statusTone(worker.status)}>
                  {statusText[worker.status] ?? worker.status}
                </span>
              </div>
              <div className="sw-mobile-card__meta">
                <span>{worker.qualificationLabels.length > 0 ? worker.qualificationLabels.join("、") : "无资质"}</span>
                <span>{worker.preferredBadge ? worker.preferredBadge.deviceCode : "未绑定工牌"}</span>
                <span>{worker.praiseSummary.praiseCount} 次表扬</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function WorkerDrawer({
  drawer,
  mutationsDisabled,
  onClose,
  onEdit,
  onView,
  onWorkerCreated,
  onWorkerUpdated,
  onWorkerRefresh
}: {
  drawer: Exclude<DrawerMode, { kind: "closed" }>;
  mutationsDisabled: boolean;
  onClose: () => void;
  onEdit: (worker: SocialWorker) => void;
  onView: (worker: SocialWorker) => void;
  onWorkerCreated: () => void;
  onWorkerUpdated: () => void;
  onWorkerRefresh: () => void;
}) {
  if (drawer.kind === "view") return <ViewModal mutationsDisabled={mutationsDisabled} onClose={onClose} onEdit={() => onEdit(drawer.worker)} onMutate={onWorkerRefresh} worker={drawer.worker} />;
  if (drawer.kind === "edit") return <EditModal onCancel={() => onView(drawer.worker)} onClose={onClose} onSaved={onWorkerUpdated} worker={drawer.worker} />;
  return <CreateModal onClose={onClose} onCreated={onWorkerCreated} />;
}

type ViewTab = "overview" | "praise";

function ViewModal({
  mutationsDisabled,
  onClose,
  onEdit,
  onMutate,
  worker
}: {
  mutationsDisabled: boolean;
  onClose: () => void;
  onEdit: () => void;
  onMutate?: () => void;
  worker: SocialWorker;
}) {
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showBadgeSelect, setShowBadgeSelect] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(worker.preferredBadge?.badgeId ?? "");
  const [resetPwdResult, setResetPwdResult] = useState<string | null>(null);
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingBasic, setEditingBasic] = useState(false);
  const [editName, setEditName] = useState(worker.name);
  const [editPhone, setEditPhone] = useState(worker.phone);
  const [editQual, setEditQual] = useState(worker.qualificationLabels.join("、"));
  const [savingBasic, setSavingBasic] = useState(false);
  const color = avatarColor(worker.name);

  const copyText = (text: string) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      navigator.clipboard?.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveBasic = async () => {
    setSavingBasic(true);
    try {
      await siteOperationsApi.updateSocialWorker(worker.id, {
        name: editName.trim(), phone: editPhone.trim(),
        qualificationLabels: editQual.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
      });
      setEditingBasic(false);
      onMutate?.();
    } catch {}
    setSavingBasic(false);
  };

  const handleResetPassword = async () => {
    setResetPwdLoading(true);
    setResetPwdResult(null);
    try {
      const token = localStorage.getItem("gy_auth_token");
      const res = await fetch(`/api/social-workers/${worker.id}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResetPwdResult(data.initialPassword);
      }
    } catch { /* ignore */ }
    setResetPwdLoading(false);
  };

  const tabs: Array<{ id: ViewTab; label: string }> = [
    { id: "overview", label: "档案概览" },
    { id: "praise", label: "好评记录" },
  ];

  return (
    <div className="so-modal so-modal--view" role="dialog" aria-label="服务人员详情">
      {/* Summary Card */}
      <div className="so-modal__summary">
        <div className="so-modal__summary-main">
          <div className="sw-avatar sw-avatar--lg" style={{ background: color.bg, color: color.text }}>{getInitials(worker.name)}</div>
          <div className="so-modal__summary-name">
            <h3>{worker.name}</h3>
            <span className="so-modal__summary-demo">服务人员</span>
            <span className="sw-status-badge sw-status-badge--inline" data-tone={statusTone(worker.status)}>{statusText[worker.status] ?? worker.status}</span>
          </div>
          <div className="so-modal__summary-actions">
            <button aria-label="关闭" className="so-modal__close" onClick={onClose} type="button"><X size={18} /></button>
          </div>
        </div>
        <div className="so-modal__summary-contact">
          <span className="so-modal__meta-item"><Phone size={13} /> {worker.phone}</span>
        </div>
        <div className="so-modal__summary-tags">
          {worker.qualificationLabels.length > 0 ? worker.qualificationLabels.map(q => (
            <span className="so-modal__chip" key={q}>{q}</span>
          )) : <span className="so-modal__chip">无资质</span>}
          {worker.preferredBadge ? (
            <span className="so-modal__chip">{worker.preferredBadge.deviceCode}</span>
          ) : null}
          {worker.praiseSummary.praiseCount > 0 ? (
            <span className="so-modal__chip">{worker.praiseSummary.praiseCount} 次表扬</span>
          ) : null}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="so-modal__tabs" role="tablist">
        {tabs.map(tab => (
          <button className="so-modal__tab" data-active={activeTab === tab.id} key={tab.id} onClick={() => setActiveTab(tab.id)} role="tab" type="button">
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="so-modal__content">
        {activeTab === "overview" && (
          <>
            <div className="so-tab-section">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h4 className="so-tab-section-title" style={{ margin: 0, border: 0, paddingBottom: 0 }}>基础信息</h4>
                {!editingBasic && <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2, display: "flex" }} disabled={mutationsDisabled} onClick={() => { setEditName(worker.name); setEditPhone(worker.phone); setEditQual(worker.qualificationLabels.join("、")); setEditingBasic(true); }} type="button" title="编辑"><Edit3 size={14} /></button>}
              </div>
              <dl className="so-overview-grid" style={{ marginTop: 10 }}>
                <div className="so-overview-item"><dt>姓名</dt><dd>{editingBasic ? <input className="quality-user-modal__inline-input" value={editName} onChange={e => setEditName(e.target.value)} /> : worker.name}</dd></div>
                <div className="so-overview-item"><dt>电话</dt><dd>{editingBasic ? <input className="quality-user-modal__inline-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} /> : worker.phone}</dd></div>
                <div className="so-overview-item"><dt>状态</dt><dd><span className="sw-status-badge" data-tone={statusTone(worker.status)}>{statusText[worker.status] ?? worker.status}</span></dd></div>
                <div className="so-overview-item so-overview-item--full"><dt>资质</dt><dd>{editingBasic ? <input className="quality-user-modal__inline-input" value={editQual} onChange={e => setEditQual(e.target.value)} placeholder="用顿号分隔" /> : (worker.qualificationLabels.length > 0 ? worker.qualificationLabels.join("、") : "—")}</dd></div>
              </dl>
              {editingBasic && (
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                  <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => setEditingBasic(false)} type="button">取消</button>
                  <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 12 }} disabled={savingBasic} onClick={handleSaveBasic} type="button">{savingBasic ? "保存中..." : "保存"}</button>
                </div>
              )}
            </div>

            <div className="so-tab-section">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h4 className="so-tab-section-title" style={{ margin: 0, border: 0, paddingBottom: 0 }}>常用工牌</h4>
                {!showBadgeSelect && <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2, display: "flex" }} disabled={mutationsDisabled} onClick={() => setShowBadgeSelect(true)} type="button" title="更换工牌"><Edit3 size={14} /></button>}
              </div>
              <dl className="so-overview-grid" style={{ marginTop: 10 }}>
                <div className="so-overview-item"><dt>设备编号</dt><dd>
                  {showBadgeSelect ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <select style={{ height: 32, borderRadius: 6, border: "1.5px solid #0052CC", padding: "0 8px", fontSize: 13, boxShadow: "0 0 0 3px rgba(0,82,204,0.1)" }} value={selectedBadge} onChange={e => setSelectedBadge(e.target.value)}>
                        <option value="">无</option>
                        <option value="badge-021">FW-021</option>
                        <option value="badge-026">FW-026</option>
                        <option value="badge-030">FW-030</option>
                        <option value="badge-031">FW-031</option>
                        <option value="badge-032">FW-032</option>
                        <option value="badge-033">FW-033</option>
                      </select>
                      <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 11, padding: "0 8px" }} onClick={async () => {
                        try { await siteOperationsApi.updateSocialWorkerBadgeBinding(worker.id, { preferredBadgeId: selectedBadge || undefined }); } catch {}
                        setShowBadgeSelect(false);
                        onMutate?.();
                      }} type="button">确认</button>
                      <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 11, padding: "0 8px" }} onClick={() => setShowBadgeSelect(false)} type="button">取消</button>
                    </div>
                  ) : (worker.preferredBadge?.deviceCode ?? "—")}
                </dd></div>
                {!showBadgeSelect && worker.preferredBadge && (
                  <>
                    <div className="so-overview-item"><dt>状态</dt><dd><span className="sw-status-badge" data-tone={badgeStatusTone(worker.preferredBadge.status)}>{statusText[worker.preferredBadge.status] ?? worker.preferredBadge.status}</span></dd></div>
                    <div className="so-overview-item"><dt>最近同步</dt><dd>{worker.preferredBadge.lastSyncAt ? formatSyncTime(worker.preferredBadge.lastSyncAt) : "—"}</dd></div>
                  </>
                )}
              </dl>
            </div>

            <div className="so-tab-section">
              <h4 className="so-tab-section-title">登录账号</h4>
              {worker.account ? (
                <dl className="so-overview-grid">
                  <div className="so-overview-item"><dt>账号</dt><dd><strong>{worker.account.username}</strong></dd></div>
                  <div className="so-overview-item"><dt>状态</dt><dd>
                    {worker.account.mustChangePassword
                      ? (worker.account.initialPassword ? <span style={{ color: "#D97706" }}>待激活</span> : <span style={{ color: "#EA580C" }}>待修改密码</span>)
                      : <span style={{ color: "#16A34A" }}>已激活</span>}
                  </dd></div>
                  <div className="so-overview-item"><dt></dt><dd>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <button className="sw-btn sw-btn--secondary" style={{ height: 26, fontSize: 11, padding: "0 10px" }} disabled={resetPwdLoading} onClick={handleResetPassword} type="button">{resetPwdLoading ? "重置中..." : "重置密码"}</button>
                      {worker.account.mustChangePassword && worker.account.initialPassword && (
                        <>
                          <code style={{ fontFamily: "monospace", fontSize: 13, color: "#0F172A" }}>{worker.account.initialPassword}</code>
                          <button style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 4, cursor: "pointer", fontSize: 11, padding: "2px 6px", color: copied ? "#16A34A" : "#64748B" }} type="button" onClick={() => copyText(worker.account!.initialPassword!)}>{copied ? "✓ 已复制" : "复制"}</button>
                        </>
                      )}
                      {resetPwdResult && (
                        <>
                          <code style={{ fontFamily: "monospace", fontSize: 13, color: "#0052CC" }}>{resetPwdResult}</code>
                          <button style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 4, cursor: "pointer", fontSize: 11, padding: "2px 6px", color: copied ? "#16A34A" : "#64748B" }} type="button" onClick={() => copyText(resetPwdResult)}>{copied ? "✓ 已复制" : "复制"}</button>
                        </>
                      )}
                    </span>
                  </dd></div>
                </dl>
              ) : (
                <p className="sw-text-muted">暂无登录账号（创建服务人员时自动生成）</p>
              )}
            </div>
          </>
        )}

        {activeTab === "praise" && (
          <div className="so-tab-section">
            <div className="sw-praise-summary">
              <Award size={20} className="sw-praise-icon" />
              <strong>{worker.praiseSummary.praiseCount}</strong>
              <span>次表扬</span>
            </div>
            {worker.praiseSummary.latestPraiseExcerpt ? (
              <blockquote className="sw-praise-quote">
                "{worker.praiseSummary.latestPraiseExcerpt}"
                {worker.praiseSummary.latestPraiseAt ? <cite>{formatSyncTime(worker.praiseSummary.latestPraiseAt)}</cite> : null}
              </blockquote>
            ) : (
              <p className="sw-text-muted">暂无表扬记录</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="so-modal__footer">
        <div>
          {showArchiveConfirm ? (
            <span className="sw-drawer__confirm"><span>确认归档？</span><button className="sw-btn sw-btn--danger" type="button">确认归档</button><button className="sw-btn sw-btn--secondary" onClick={() => setShowArchiveConfirm(false)} type="button">取消</button></span>
          ) : (
            <button className="sw-btn sw-btn--danger-ghost" disabled={mutationsDisabled} onClick={() => setShowArchiveConfirm(true)} type="button">归档人员</button>
          )}
        </div>
        <div />
      </div>
    </div>
  );
}

function EditModal({
  onCancel,
  onClose,
  onSaved,
  worker
}: {
  onCancel: () => void;
  onClose: () => void;
  onSaved: () => void;
  worker: SocialWorker;
}) {
  const [name, setName] = useState(worker.name);
  const [phone, setPhone] = useState(worker.phone);
  const [qualifications, setQualifications] = useState(worker.qualificationLabels.join("、"));
  const [status, setStatus] = useState(worker.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await siteOperationsApi.updateSocialWorker(worker.id, {
        name: name.trim(),
        phone: phone.trim(),
        qualificationLabels: qualifications.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
        status
      });
      onSaved();
    } catch { setSaving(false); }
  };

  return (
    <div className="so-modal so-modal--form" role="dialog" aria-label="编辑服务人员">
      <div className="so-modal__form-header">
        <h3>编辑服务人员</h3>
        <button aria-label="关闭" className="so-modal__close" onClick={onClose} type="button"><X size={18} /></button>
      </div>
      <div className="so-modal__content">
        <div className="so-form-cards">
          <div className="so-form-card">
            <h4 className="so-form-card__title">基本信息</h4>
            <div className="so-form-card__row">
              <label className="sw-field"><span>姓名</span><input onChange={(e) => setName(e.target.value)} placeholder="输入姓名" value={name} /></label>
              <label className="sw-field"><span>电话</span><input onChange={(e) => setPhone(e.target.value)} placeholder="输入电话" value={phone} /></label>
            </div>
            <label className="sw-field"><span>资质</span><input onChange={(e) => setQualifications(e.target.value)} placeholder="用顿号分隔，如：助餐、陪诊" value={qualifications} /></label>
          </div>
          <div className="so-form-card">
            <h4 className="so-form-card__title">状态</h4>
            <label className="sw-field"><span>当前状态</span>
              <select onChange={(e) => setStatus(e.target.value as SocialWorkerStatus)} value={status}>
                <option value="active">在职</option>
                <option value="disabled">已停用</option>
                <option value="incomplete_profile">资料待补全</option>
              </select>
            </label>
          </div>
        </div>
      </div>
      <div className="so-modal__footer">
        <div />
        <div className="so-modal__footer-right">
          <button className="sw-btn sw-btn--secondary" onClick={onCancel} type="button">取消</button>
          <button className="sw-btn sw-btn--primary" disabled={saving} onClick={handleSave} type="button">{saving ? "保存中..." : "保存"}</button>
        </div>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) return;
    setCreating(true);
    try {
      await siteOperationsApi.createSocialWorker({
        name: name.trim(),
        phone: phone.trim(),
        workerType: "service_personnel",
        qualificationLabels: qualifications.split(/[、,，]/).map((s) => s.trim()).filter(Boolean)
      });
      onCreated();
    } catch { setCreating(false); }
  };

  return (
    <div className="so-modal so-modal--form" role="dialog" aria-label="新增服务人员">
      <div className="so-modal__form-header">
        <h3>新增服务人员</h3>
        <button aria-label="关闭" className="so-modal__close" onClick={onClose} type="button"><X size={18} /></button>
      </div>
      <div className="so-modal__content">
        <div className="so-form-cards">
          <div className="so-form-card">
            <h4 className="so-form-card__title">基本信息</h4>
            <div className="so-form-card__row">
              <label className="sw-field"><span>姓名 *</span><input onChange={(e) => setName(e.target.value)} placeholder="输入姓名" value={name} /></label>
              <label className="sw-field"><span>电话 *</span><input onChange={(e) => setPhone(e.target.value)} placeholder="输入电话" value={phone} /></label>
            </div>
            <label className="sw-field"><span>资质</span><input onChange={(e) => setQualifications(e.target.value)} placeholder="用顿号分隔，如：助餐、陪诊" value={qualifications} /></label>
          </div>
        </div>
      </div>
      <div className="so-modal__footer">
        <div />
        <div className="so-modal__footer-right">
          <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">取消</button>
          <button className="sw-btn sw-btn--primary" disabled={creating || !name.trim() || !phone.trim()} onClick={handleCreate} type="button">{creating ? "创建中..." : "创建"}</button>
        </div>
      </div>
    </div>
  );
}
