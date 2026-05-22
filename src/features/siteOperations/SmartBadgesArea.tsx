import { useEscClose } from "./useEscClose";
import { useState, useCallback, useEffect } from "react";
import { Search, X, ChevronDown, Plus, Smartphone, Battery, Clock, Shield, Edit3, AlertTriangle, RefreshCw } from "lucide-react";
import type {
  SmartBadge,
  SmartBadgeStatus,
  WorkAreaOperationalState,
  SmartBadgesResponse
} from "./contracts";
import { statusText } from "./contracts";
import { siteOperationsApi } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";
import { useSite } from "../../auth/SiteContext";

type DrawerMode =
  | { kind: "closed" }
  | { kind: "view"; badge: SmartBadge }
  | { kind: "activate" };

type StatusFilter = "" | SmartBadgeStatus;
type PreferredFilter = "" | "has" | "none";

const statusFilterOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "工牌状态", value: "" },
  { label: "可用", value: "available" },
  { label: "使用中", value: "in_use" },
  { label: "待激活", value: "pending_activation" },
  { label: "离线", value: "offline" },
  { label: "同步延迟", value: "sync_delayed" },
  { label: "低电量", value: "low_battery" },
  { label: "已停用", value: "disabled" },
  { label: "丢失", value: "lost" }
];

const preferredFilterOptions: Array<{ label: string; value: PreferredFilter }> = [
  { label: "常用人员", value: "" },
  { label: "有常用人员", value: "has" },
  { label: "无常用人员", value: "none" }
];

function badgeStatusTone(status: SmartBadgeStatus): string {
  if (status === "available") return "success";
  if (status === "in_use") return "accent";
  if (status === "offline" || status === "low_battery" || status === "sync_delayed") return "warning";
  if (status === "lost") return "danger";
  return "muted";
}

function formatSyncTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

const canDisableOrLose = (s: SmartBadgeStatus) =>
  ["available", "offline", "sync_delayed", "low_battery"].includes(s);

const canRestore = (s: SmartBadgeStatus) =>
  s === "disabled" || s === "lost";

export function SmartBadgesArea({ resource, onOpenRecords, onMutate, initialSearch }: { resource: Resource<SmartBadgesResponse>; onOpenRecords?: () => void; onMutate?: () => void; initialSearch?: string }) {
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? "");
  useEffect(() => { if (initialSearch) setSearchQuery(initialSearch); }, [initialSearch]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [preferredFilter, setPreferredFilter] = useState<PreferredFilter>("");
  const operationalState = resource.status === "success" ? resource.data.operationalState : undefined;
  const mutationsDisabled = isMutationDisabled(operationalState);

  const badges = resource.status === "success" ? resource.data.smartBadges : [];

  const openDrawer = useCallback((badge: SmartBadge) => {
    setDrawer({ kind: "view", badge });
  }, []);

  const handleBadgeActivated = useCallback(() => {
    onMutate?.();
    setDrawer({ kind: "closed" });
  }, [onMutate]);

  const handleBadgeUpdated = useCallback(() => {
    onMutate?.();
    setDrawer({ kind: "closed" });
  }, [onMutate]);

  const handleBadgeRefresh = useCallback(() => {
    onMutate?.();
  }, [onMutate]);

  // Sync drawer badge with refreshed list data
  useEffect(() => {
    if (drawer.kind === "view") {
      const fresh = badges.find(b => b.id === drawer.badge.id);
      if (fresh && fresh !== drawer.badge) setDrawer({ kind: "view", badge: fresh });
    }
  }, [badges]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = badges.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (preferredFilter === "has" && !b.preferredWorkerId) return false;
    if (preferredFilter === "none" && b.preferredWorkerId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!b.deviceCode.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isLoading = resource.status === "loading" || resource.status === "idle";
  useEscClose(useCallback(() => setDrawer({ kind: "closed" }), []));

  return (
    <>
      <section aria-label="设备" className="sw-page">
        <div className="sw-page__inner">
          <header className="sw-header">
            <div className="sw-header__title-group">
              <h2 className="sw-header__title">设备</h2>
              <p className="sw-header__desc">管理站点智能工牌激活、监控和维护</p>
            </div>
            <button
              className="sw-btn sw-btn--primary"
              disabled={mutationsDisabled}
              onClick={() => setDrawer({ kind: "activate" })}
              type="button"
            >
              <Plus size={15} />
              激活工牌
            </button>
          </header>

          <div className="sw-table-container">
            <div className="sw-toolbar">
              <label className="sw-search">
                <Search size={16} />
                <input
                  aria-label="搜索设备"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索设备码..."
                  value={searchQuery}
                />
              </label>
              <div className="sw-toolbar__filters">
                <FilterDropdown onChange={(v) => setStatusFilter(v as StatusFilter)} options={statusFilterOptions} value={statusFilter} />
                <FilterDropdown onChange={(v) => setPreferredFilter(v as PreferredFilter)} options={preferredFilterOptions} value={preferredFilter} />
              </div>
            </div>

            {operationalState ? <OperationalBanner state={operationalState} /> : null}

            <BadgeContent
              filtered={filtered}
              loading={isLoading}
              error={resource.status === "error" ? resource.error : undefined}
              isEmpty={resource.status === "success" && badges.length === 0}
              isFilterEmpty={resource.status === "success" && badges.length > 0 && filtered.length === 0}
              mutationsDisabled={mutationsDisabled}
              onActivateClick={() => setDrawer({ kind: "activate" })}
              onRowClick={(b) => setSelectedId(b.id)}
              onCodeClick={openDrawer}
              onRowDoubleClick={openDrawer}
              selectedId={selectedId}
            />
          </div>
        </div>

        {drawer.kind !== "closed" ? (
          <>
            <button aria-label="关闭抽屉遮罩" className="sw-scrim" onClick={() => setDrawer({ kind: "closed" })} type="button" />
            {drawer.kind === "view" ? (
              <ViewDrawer
                badge={drawer.badge}
                mutationsDisabled={mutationsDisabled}
                onClose={() => setDrawer({ kind: "closed" })}
                onUpdated={handleBadgeRefresh}
                onOpenRecords={onOpenRecords}
              />
            ) : (
              <ActivateDrawer
                onClose={() => setDrawer({ kind: "closed" })}
                onActivated={handleBadgeActivated}
              />
            )}
          </>
        ) : null}
      </section>
    </>
  );
}

function FilterDropdown({ onChange, options, value }: {
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <div className="sw-filter">
      <select className={value ? "sw-filter--active" : ""} onChange={(e) => onChange(e.target.value)} value={value}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}

function OperationalBanner({ state }: { state: WorkAreaOperationalState }) {
  if (state.unavailableMessage) {
    return <div className="sw-banner sw-banner--danger" role="status"><Shield size={16} /><div><strong>设备暂不可用</strong><span>{state.unavailableMessage}</span></div></div>;
  }
  if (state.permission === "read_only") {
    return <div className="sw-banner sw-banner--warning" role="status"><Shield size={16} /><div><strong>只读模式</strong><span>可查看数据，激活和生命周期动作已禁用。</span></div></div>;
  }
  if (state.permission === "restricted") {
    return <div className="sw-banner sw-banner--warning" role="status"><Shield size={16} /><div><strong>权限受限</strong><span>敏感信息已隐藏，部分操作不可用。</span></div></div>;
  }
  return null;
}

function BadgeContent({ filtered, loading, error, isEmpty, isFilterEmpty, mutationsDisabled, onActivateClick, onRowClick, onCodeClick, onRowDoubleClick, selectedId }: {
  filtered: SmartBadge[];
  loading: boolean;
  error?: string;
  isEmpty: boolean;
  isFilterEmpty: boolean;
  mutationsDisabled: boolean;
  onActivateClick: () => void;
  onRowClick: (b: SmartBadge) => void;
  onCodeClick: (b: SmartBadge) => void;
  onRowDoubleClick: (b: SmartBadge) => void;
  selectedId: string | null;
}) {
  if (loading) return <div className="sw-empty"><div className="sw-empty__icon"><Smartphone size={32} /></div><span>设备数据加载中...</span></div>;
  if (error) return <div className="sw-empty"><div className="sw-empty__icon sw-empty__icon--error"><X size={32} /></div><span>{error}</span></div>;
  if (isEmpty) return (
    <div className="sw-empty">
      <div className="sw-empty__icon"><Smartphone size={32} /></div>
      <strong>暂无智能工牌</strong><span>点击激活工牌添加第一个设备</span>
      <button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={onActivateClick} type="button"><Plus size={15} />激活工牌</button>
    </div>
  );
  if (isFilterEmpty) return <div className="sw-empty"><div className="sw-empty__icon"><Search size={32} /></div><span>没有匹配的设备</span></div>;

  return (
    <>
      <div className="sw-table badges-table" role="table">
        <div className="sw-table__head badges-table__head" role="row">
          <span role="columnheader">设备码</span>
          <span role="columnheader">站点</span>
          <span role="columnheader">状态</span>
          <span role="columnheader">电量</span>
          <span role="columnheader">最近同步</span>
          <span role="columnheader">常用人员</span>
          <span role="columnheader">服务记录</span>
        </div>
        {filtered.map((badge) => (
          <div
            className="sw-table__row badges-table__row"
            data-selected={selectedId === badge.id}
            key={badge.id}
            onClick={() => onRowClick(badge)}
            onDoubleClick={() => onRowDoubleClick(badge)}
            role="row"
          >
            <div role="cell">
              <button className="badges-code-link" onClick={(e) => { e.stopPropagation(); onCodeClick(badge); }} type="button">
                {badge.deviceCode}
              </button>
            </div>
            <div role="cell">{badge.siteName ?? badge.siteId}</div>
            <div role="cell">
              <span className="sw-status-badge" data-tone={badgeStatusTone(badge.status)}>
                {statusText[badge.status] ?? badge.status}
              </span>
            </div>
            <div role="cell">
              {badge.batteryPercent != null ? (
                <span className={badge.batteryPercent < 20 ? "badges-battery--low" : ""}>
                  {badge.batteryPercent}%
                </span>
              ) : <span className="sw-text-muted">—</span>}
            </div>
            <div role="cell">
              {badge.lastSyncAt ? formatSyncTime(badge.lastSyncAt) : <span className="sw-text-muted">—</span>}
            </div>
            <div role="cell">
              {badge.preferredWorkerName ?? <span className="sw-text-muted">—</span>}
            </div>
            <div role="cell">
              {badge.recentServiceRecordIds.length > 0
                ? `${badge.recentServiceRecordIds.length} 条`
                : <span className="sw-text-muted">—</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="sw-mobile-list">
        {filtered.map((badge) => (
          <button className="sw-mobile-card" key={badge.id} onClick={() => onCodeClick(badge)} type="button">
            <div className="sw-mobile-card__top">
              <span className="badges-code-tag">{badge.deviceCode}</span>
              <span className="sw-status-badge" data-tone={badgeStatusTone(badge.status)}>
                {statusText[badge.status] ?? badge.status}
              </span>
            </div>
            <div className="sw-mobile-card__info"><span>{badge.siteName ?? badge.siteId}</span></div>
            <div className="sw-mobile-card__meta">
              {badge.batteryPercent != null ? <span>电量 {badge.batteryPercent}%</span> : null}
              {badge.lastSyncAt ? <span>同步 {formatSyncTime(badge.lastSyncAt)}</span> : null}
              {badge.preferredWorkerName ? <span>{badge.preferredWorkerName}</span> : <span>站点共享</span>}
              {badge.recentServiceRecordIds.length > 0 ? <span>{badge.recentServiceRecordIds.length} 条记录</span> : null}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

type ViewTab = "info";

function ViewDrawer({ badge, mutationsDisabled, onClose, onUpdated, onOpenRecords }: {
  badge: SmartBadge;
  mutationsDisabled: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onOpenRecords?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ViewTab>("info");
  const [confirmAction, setConfirmAction] = useState<"disable" | "lost" | null>(null);
  const [selectedWorker, setSelectedWorker] = useState(badge.preferredWorkerId ?? "");
  const [recordsData, setRecordsData] = useState<any>(null);

  useEffect(() => {
    if (badge.recentServiceRecordIds.length > 0) {
      fetch("/api/service-records").then(r => r.json()).then(setRecordsData).catch(() => {});
    }
  }, [badge.id]);

  const handleStatusChange = async (newStatus: SmartBadgeStatus) => {
    try {
      await siteOperationsApi.updateSmartBadge(badge.id, { status: newStatus });
      onUpdated();
    } catch { /* noop */ }
    setConfirmAction(null);
  };

  const [editingWorker, setEditingWorker] = useState(false);
  const [bindError, setBindError] = useState("");
  const [workerOptions, setWorkerOptions] = useState<Array<{id: string; name: string; boundBadge?: string}>>([]);

  useEffect(() => {
    fetch("/api/social-workers").then(r => r.json()).then(data => {
      const workers = (data.socialWorkers ?? []).map((w: any) => ({
        id: w.id,
        name: w.name,
        boundBadge: w.preferredBadgeDeviceCode || undefined,
      }));
      setWorkerOptions(workers);
    }).catch(() => {});
  }, []);

  const tabs: Array<{ id: ViewTab; label: string; count?: number }> = [
    { id: "info", label: "设备信息" },
  ];

  return (
    <div className="so-modal so-modal--view" role="dialog" aria-label="设备详情">
      {/* Summary Card */}
      <div className="so-modal__summary">
        <div className="so-modal__summary-main">
          <div className="badges-avatar"><Smartphone size={20} /></div>
          <div className="so-modal__summary-name">
            <h3>{badge.deviceCode}</h3>
            <span className="so-modal__summary-demo">{badge.siteName ?? badge.siteId}</span>
            <span className="sw-status-badge sw-status-badge--inline" data-tone={badgeStatusTone(badge.status)}>{statusText[badge.status] ?? badge.status}</span>
          </div>
          <div className="so-modal__summary-actions">
            <button aria-label="关闭" className="so-modal__close" onClick={onClose} type="button"><X size={18} /></button>
          </div>
        </div>
        <div className="so-modal__summary-contact">
          {badge.batteryPercent != null ? (
            <span className="so-modal__meta-item"><Battery size={13} /> <span className={badge.batteryPercent < 20 ? "badges-battery--low" : ""}>{badge.batteryPercent}%</span></span>
          ) : null}
          {badge.lastSyncAt ? (
            <>
              <span className="so-modal__meta-divider" />
              <span className="so-modal__meta-item"><Clock size={13} /> 同步 {formatSyncTime(badge.lastSyncAt)}</span>
            </>
          ) : null}
        </div>
        <div className="so-modal__summary-tags">
          {badge.preferredWorkerName ? (
            <span className="so-modal__chip">{badge.preferredWorkerName}</span>
          ) : (
            <span className="so-modal__chip">站点共享</span>
          )}
          {badge.recentServiceRecordIds.length > 0 ? (
            <span className="so-modal__chip">{badge.recentServiceRecordIds.length} 条记录</span>
          ) : null}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="so-modal__tabs" role="tablist">
        {tabs.map(tab => (
          <button className="so-modal__tab" data-active={activeTab === tab.id} key={tab.id} onClick={() => setActiveTab(tab.id)} role="tab" type="button">
            {tab.label}
            {tab.count ? <span className="so-modal__tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="so-modal__content">
        {activeTab === "info" && (
          <>
            <div className="so-tab-section">
              <h4 className="so-tab-section-title">设备信息</h4>
              <dl className="so-overview-grid">
                <div className="so-overview-item"><dt>设备码</dt><dd><span className="badges-code-tag">{badge.deviceCode}</span></dd></div>
                <div className="so-overview-item"><dt>所属站点</dt><dd>{badge.siteName ?? badge.siteId}</dd></div>
                <div className="so-overview-item"><dt>当前状态</dt><dd><span className="sw-status-badge" data-tone={badgeStatusTone(badge.status)}>{statusText[badge.status] ?? badge.status}</span></dd></div>
                <div className="so-overview-item"><dt>激活时间</dt><dd>{badge.activatedAt ? formatSyncTime(badge.activatedAt) : "—"}</dd></div>
                <div className="so-overview-item"><dt>电量</dt><dd>{badge.batteryPercent != null ? <span className={badge.batteryPercent < 20 ? "badges-battery--low" : ""}>{badge.batteryPercent}%</span> : "—"}</dd></div>
                <div className="so-overview-item"><dt>最近同步</dt><dd>{badge.lastSyncAt ? formatSyncTime(badge.lastSyncAt) : "—"}</dd></div>
                <div className="so-overview-item"><dt>最近录音</dt><dd>{badge.lastRecordingAt ? formatSyncTime(badge.lastRecordingAt) : "—"}</dd></div>
                <div className="so-overview-item"><dt>服务记录</dt><dd>{badge.recentServiceRecordIds.length > 0 ? `${badge.recentServiceRecordIds.length} 条` : "—"}</dd></div>
              </dl>
            </div>

            <div className="so-tab-section">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h4 className="so-tab-section-title" style={{ margin: 0, border: 0, paddingBottom: 0 }}>服务人员</h4>
                {!editingWorker && !mutationsDisabled && canDisableOrLose(badge.status) && (
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2, display: "flex" }} onClick={() => setEditingWorker(true)} type="button" title="编辑"><Edit3 size={14} /></button>
                )}
              </div>
              <dl className="so-overview-grid" style={{ marginTop: 10 }}>
                <div className="so-overview-item"><dt>常用人员</dt><dd>
                  {editingWorker ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select style={{ height: 32, borderRadius: 6, border: "1.5px solid #0052CC", padding: "0 8px", fontSize: 13, boxShadow: "0 0 0 3px rgba(0,82,204,0.1)" }} value={selectedWorker} onChange={e => { setSelectedWorker(e.target.value); setBindError(""); }}>
                          <option value="">无（站点共享）</option>
                          {workerOptions.map(w => (
                            <option key={w.id} value={w.id} disabled={!!w.boundBadge && w.boundBadge !== badge.deviceCode}>
                              {w.name}{w.boundBadge && w.boundBadge !== badge.deviceCode ? ` (已绑定${w.boundBadge})` : ""}
                            </option>
                          ))}
                        </select>
                        <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 11, padding: "0 8px" }} onClick={async () => {
                          if (selectedWorker) {
                            const chosen = workerOptions.find(w => w.id === selectedWorker);
                            if (chosen?.boundBadge && chosen.boundBadge !== badge.deviceCode) {
                              setBindError(`${chosen.name}已绑定工牌${chosen.boundBadge}，请先解绑后再操作`);
                              return;
                            }
                          }
                          try {
                            await siteOperationsApi.updateSmartBadge(badge.id, { preferredWorkerId: selectedWorker || undefined });
                            setEditingWorker(false);
                            setBindError("");
                          } catch (err: any) {
                            const msg = err?.message || "绑定失败";
                            setBindError(msg.includes("已绑定") ? msg : "绑定失败，该人员可能已绑定其他工牌");
                          }
                          onUpdated();
                        }} type="button">确认</button>
                        <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 11, padding: "0 8px" }} onClick={() => { setEditingWorker(false); setBindError(""); }} type="button">取消</button>
                      </div>
                      {bindError && <div style={{ fontSize: 12, color: "#DC2626" }}>{bindError}</div>}
                    </div>
                  ) : (badge.preferredWorkerName ?? "站点共享")}
                </dd></div>
              </dl>
              <p className="badges-hint" style={{ marginTop: 4 }}>工牌可被站点内任一服务人员使用，常用人员仅作为推断默认关联</p>
            </div>
          </>
        )}

      </div>

      {/* Footer */}
      <div className="so-modal__footer">
        <div>
          {badge.status === "pending_activation" && !mutationsDisabled ? (
            <button className="sw-btn sw-btn--primary" onClick={async () => {
              try { await siteOperationsApi.updateSmartBadge(badge.id, { status: "available" }); onUpdated(); } catch {}
            }} type="button">激活此工牌</button>
          ) : canDisableOrLose(badge.status) && !mutationsDisabled ? (
            confirmAction === "disable" ? (
              <span className="sw-drawer__confirm"><span>确认停用？</span><button className="sw-btn sw-btn--danger" onClick={() => handleStatusChange("disabled")} type="button">确认停用</button><button className="sw-btn sw-btn--secondary" onClick={() => setConfirmAction(null)} type="button">取消</button></span>
            ) : confirmAction === "lost" ? (
              <span className="sw-drawer__confirm"><span>确认标记丢失？</span><button className="sw-btn sw-btn--danger" onClick={() => handleStatusChange("lost")} type="button">确认丢失</button><button className="sw-btn sw-btn--secondary" onClick={() => setConfirmAction(null)} type="button">取消</button></span>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="sw-btn sw-btn--danger-ghost" onClick={() => setConfirmAction("disable")} type="button">停用</button>
                <button className="sw-btn sw-btn--danger-ghost" onClick={() => setConfirmAction("lost")} type="button">标记丢失</button>
              </div>
            )
          ) : canRestore(badge.status) && !mutationsDisabled ? (
            <button className="sw-btn sw-btn--secondary" onClick={() => handleStatusChange("available")} type="button"><RefreshCw size={14} /> 恢复为可用</button>
          ) : <div />}
        </div>
        <div className="so-modal__footer-right" />
      </div>

    </div>
  );
}

function ActivateDrawer({ onClose, onActivated }: { onClose: () => void; onActivated: () => void }) {
  const { currentSite } = useSite();
  const [deviceCode, setDeviceCode] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "done">("input");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SmartBadge | null>(null);

  const handleActivate = async () => {
    if (!deviceCode.trim() || !currentSite) return;
    setActivating(true);
    setError("");
    try {
      const res = await siteOperationsApi.activateSmartBadge({ deviceCode: deviceCode.trim(), siteId: currentSite.id });
      setResult(res.smartBadge);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "激活失败");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="so-modal so-modal--form" role="dialog" aria-label="激活工牌">
      <div className="so-modal__form-header">
        <h3>激活工牌</h3>
        <button aria-label="关闭" className="so-modal__close" onClick={onClose} type="button"><X size={18} /></button>
      </div>
      <div className="so-modal__content">
        {step === "input" ? (
          <div className="so-form-cards">
            <div className="so-form-card">
              <h4 className="so-form-card__title">设备信息</h4>
              <label className="sw-field"><span>设备码</span><input onChange={(e) => setDeviceCode(e.target.value)} placeholder="输入设备码，如 FW-030" value={deviceCode} /></label>
            </div>
            {error ? <p className="badges-error">{error}</p> : null}
          </div>
        ) : step === "confirm" ? (
          <div className="so-form-cards">
            <div className="so-form-card">
              <h4 className="so-form-card__title">确认激活</h4>
              <dl className="so-overview-grid">
                <div className="so-overview-item"><dt>设备码</dt><dd><span className="badges-code-tag">{deviceCode}</span></dd></div>
                <div className="so-overview-item"><dt>绑定站点</dt><dd>{currentSite?.name ?? "未选择"}</dd></div>
              </dl>
            </div>
            {error ? <p className="badges-error">{error}</p> : null}
          </div>
        ) : (
          <div className="badges-success">
            <div className="badges-success__icon"><Smartphone size={28} /></div>
            <strong>激活成功</strong>
            <p>{result?.deviceCode} 已绑定到 {result?.siteName}</p>
          </div>
        )}
      </div>
      <div className="so-modal__footer">
        <div />
        <div className="so-modal__footer-right">
          {step === "input" ? (
            <>
              <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">取消</button>
              <button className="sw-btn sw-btn--primary" disabled={activating || !deviceCode.trim()} onClick={() => setStep("confirm")} type="button">下一步</button>
            </>
          ) : step === "confirm" ? (
            <>
              <button className="sw-btn sw-btn--secondary" onClick={() => { setStep("input"); setError(""); }} type="button">上一步</button>
              <button className="sw-btn sw-btn--primary" disabled={activating} onClick={handleActivate} type="button">{activating ? "激活中..." : "确认激活"}</button>
            </>
          ) : (
            <>
              <button className="sw-btn sw-btn--secondary" onClick={() => { onActivated(); }} type="button">查看设备详情</button>
              <button className="sw-btn sw-btn--primary" onClick={() => { onActivated(); setDeviceCode(""); setStep("input"); setResult(null); }} type="button">继续激活下一个</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
