import { useEscClose } from "./useEscClose";
import { formatSyncTime } from "../../shared/utils/dateTimeUtils";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { ConfirmAction } from "../../shared/components/ConfirmAction";
import { useState, useCallback, useEffect } from "react";
import { Search, X, Plus, Smartphone, Battery, Clock, Edit3, AlertTriangle, RefreshCw } from "lucide-react";
import { OperationalBanner } from "../../shared/components/OperationalBanner";
import { FilterDropdown } from "../../shared/components/FilterDropdown";
import { EmptyState } from "../../shared/components/EmptyState";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type {
  SmartBadge,
  SmartBadgeStatus,
  SmartBadgesResponse
} from "./contracts";
import { statusText } from "./contracts";
import { siteOperationsApi, authFetch } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";
import { useSite } from "../../auth/SiteContext";
import { useSiteOpsData } from "../../layouts/SiteOperationsLayout";
import { DetailPageShell } from "../../shared/DetailPageShell";

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

const canDisableOrLose = (s: SmartBadgeStatus) =>
  ["available", "offline", "sync_delayed", "low_battery"].includes(s);

const canRestore = (s: SmartBadgeStatus) =>
  s === "disabled" || s === "lost";

export function SmartBadgesArea({ resource: resourceProp, onOpenRecords: onOpenRecordsProp, onMutate: onMutateProp, initialSearch }: { resource?: Resource<SmartBadgesResponse>; onOpenRecords?: () => void; onMutate?: () => void; initialSearch?: string } = {}) {
  const ctxData = useSiteOpsData();
  const resource = resourceProp ?? ctxData.smartBadges;
  const onMutate = onMutateProp ?? ctxData.refetch;
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const effectiveInitialSearch = initialSearch ?? urlSearch;
  const onOpenRecords = onOpenRecordsProp ?? (() => navigate("/records"));
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(effectiveInitialSearch);
  useEffect(() => { if (effectiveInitialSearch) setSearchQuery(effectiveInitialSearch); }, [effectiveInitialSearch]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [preferredFilter, setPreferredFilter] = useState<PreferredFilter>("");
  const operationalState = resource.status === "success" ? resource.data.operationalState : undefined;
  const mutationsDisabled = isMutationDisabled(operationalState);

  const badges = resource.status === "success" ? resource.data.smartBadges : [];

  const openDrawer = useCallback((badge: SmartBadge) => {
    navigate(`/badges/${badge.id}`);
  }, [navigate]);

  const closeDrawer = useCallback(() => { navigate("/badges"); }, [navigate]);

  const handleBadgeActivated = useCallback(() => {
    onMutate?.();
    navigate("/badges");
  }, [onMutate, navigate]);

  const handleBadgeUpdated = useCallback(() => {
    onMutate?.();
    navigate("/badges");
  }, [onMutate, navigate]);

  const handleBadgeRefresh = useCallback(() => {
    onMutate?.();
  }, [onMutate]);

  // URL -> drawer sync
  useEffect(() => {
    if (routeId === "activate") {
      setDrawer({ kind: "activate" });
    } else if (routeId) {
      const badge = badges.find(b => b.id === routeId);
      if (badge) setDrawer({ kind: "view", badge });
    } else {
      setDrawer({ kind: "closed" });
    }
  }, [routeId, badges]);

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
  useEscClose(useCallback(() => { closeDrawer(); }, [closeDrawer]));

  const listContent = (
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
            onClick={() => navigate("/badges/activate")}
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

          {operationalState ? <OperationalBanner state={operationalState} resourceLabel="设备" readOnlyHint="可查看数据，激活和生命周期动作已禁用。" /> : null}

          <BadgeContent
            filtered={filtered}
            loading={isLoading}
            error={resource.status === "error" ? resource.error : undefined}
            isEmpty={resource.status === "success" && badges.length === 0}
            isFilterEmpty={resource.status === "success" && badges.length > 0 && filtered.length === 0}
            mutationsDisabled={mutationsDisabled}
            onActivateClick={() => navigate("/badges/activate")}
            onRowClick={openDrawer}
            onCodeClick={openDrawer}
            selectedId={selectedId}
          />
        </div>
      </div>
    </section>
  );

  if (drawer.kind === "view") {
    return (
      <ViewDrawer
        badge={drawer.badge}
        mutationsDisabled={mutationsDisabled}
        onClose={closeDrawer}
        onUpdated={handleBadgeRefresh}
        onOpenRecords={onOpenRecords}
      />
    );
  }

  if (drawer.kind === "activate") {
    return (
      <ActivateDrawer onClose={closeDrawer} onActivated={handleBadgeActivated} onViewBadge={(id) => navigate(`/badges/${id}`)} />
    );
  }

  return listContent;
}



function BadgeContent({ filtered, loading, error, isEmpty, isFilterEmpty, mutationsDisabled, onActivateClick, onRowClick, onCodeClick, selectedId }: {
  filtered: SmartBadge[];
  loading: boolean;
  error?: string;
  isEmpty: boolean;
  isFilterEmpty: boolean;
  mutationsDisabled: boolean;
  onActivateClick: () => void;
  onRowClick: (b: SmartBadge) => void;
  onCodeClick: (b: SmartBadge) => void;
  selectedId: string | null;
}) {
  if (loading) return <EmptyState icon={Smartphone} description="设备数据加载中..." />;
  if (error) return <EmptyState icon={X} description={error} isError />;
  if (isEmpty) return (
    <EmptyState
      icon={Smartphone}
      title="暂无智能工牌"
      description="点击激活工牌添加第一个设备"
      action={<button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={onActivateClick} type="button"><Plus size={15} />激活工牌</button>}
    />
  );
  if (isFilterEmpty) return <EmptyState icon={Search} description="没有匹配的设备" />;

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
            role="row"
          >
            <div role="cell">
              <button className="badges-code-link" onClick={(e) => { e.stopPropagation(); onCodeClick(badge); }} type="button">
                {badge.deviceCode}
              </button>
            </div>
            <div role="cell">{badge.siteName ?? badge.siteId}</div>
            <div role="cell">
              <StatusBadge tone={badgeStatusTone(badge.status)}>
                {statusText[badge.status] ?? badge.status}
              </StatusBadge>
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
              <StatusBadge tone={badgeStatusTone(badge.status)}>
                {statusText[badge.status] ?? badge.status}
              </StatusBadge>
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
  const [selectedWorker, setSelectedWorker] = useState(badge.preferredWorkerId ?? "");
  const [recordsData, setRecordsData] = useState<any>(null);

  useEffect(() => {
    if (badge.recentServiceRecordIds.length > 0) {
      authFetch("/api/service-records").then(r => r.json()).then(setRecordsData).catch(() => {});
    }
  }, [badge.id]);

  const handleStatusChange = async (newStatus: SmartBadgeStatus) => {
    try {
      await siteOperationsApi.updateSmartBadge(badge.id, { status: newStatus });
      onUpdated();
    } catch { /* noop */ }
  };

  const [editingWorker, setEditingWorker] = useState(false);
  const [bindError, setBindError] = useState("");
  const [workerOptions, setWorkerOptions] = useState<Array<{id: string; name: string; boundBadge?: string}>>([]);

  useEffect(() => {
    authFetch("/api/social-workers").then(r => r.json()).then(data => {
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

  const statusActions = badge.status === "pending_activation" && !mutationsDisabled ? (
    <button className="sw-btn sw-btn--primary" style={{ height: 32, fontSize: 12 }} onClick={async () => {
      try { await siteOperationsApi.updateSmartBadge(badge.id, { status: "available" }); onUpdated(); } catch {}
    }} type="button">激活此工牌</button>
  ) : canDisableOrLose(badge.status) && !mutationsDisabled ? (
    <div style={{ display: "flex", gap: 8 }}>
      <ConfirmAction label="停用" onConfirm={() => handleStatusChange("disabled")} buttonStyle={{ height: 28, fontSize: 12 }} />
      <ConfirmAction label="标记丢失" onConfirm={() => handleStatusChange("lost")} buttonStyle={{ height: 28, fontSize: 12 }} />
    </div>
  ) : canRestore(badge.status) && !mutationsDisabled ? (
    <button className="sw-btn sw-btn--secondary" style={{ height: 32, fontSize: 12 }} onClick={() => handleStatusChange("available")} type="button"><RefreshCw size={14} /> 恢复为可用</button>
  ) : undefined;

  return (
    <DetailPageShell parentLabel="设备" parentPath="/badges" title={badge.deviceCode} actions={statusActions}>
      <div className="dp-card">
        <div className="dp-card__body">
          {/* 设备信息 */}
          <div className="dp-section">
            <div className="dp-section__head">
              <h4 className="dp-section__title">设备信息</h4>
            </div>
            <dl className="dp-fields">
              <div className="dp-field"><dt>设备码</dt><dd><span className="badges-code-tag">{badge.deviceCode}</span></dd></div>
              <div className="dp-field"><dt>所属站点</dt><dd>{badge.siteName ?? badge.siteId}</dd></div>
              <div className="dp-field"><dt>当前状态</dt><dd><StatusBadge tone={badgeStatusTone(badge.status)}>{statusText[badge.status] ?? badge.status}</StatusBadge></dd></div>
              <div className="dp-field"><dt>激活时间</dt><dd>{badge.activatedAt ? formatSyncTime(badge.activatedAt) : "—"}</dd></div>
              <div className="dp-field"><dt>电量</dt><dd>{badge.batteryPercent != null ? <span className={badge.batteryPercent < 20 ? "badges-battery--low" : ""}>{badge.batteryPercent}%</span> : "—"}</dd></div>
              <div className="dp-field"><dt>最近同步</dt><dd>{badge.lastSyncAt ? formatSyncTime(badge.lastSyncAt) : "—"}</dd></div>
              <div className="dp-field"><dt>最近录音</dt><dd>{badge.lastRecordingAt ? formatSyncTime(badge.lastRecordingAt) : "—"}</dd></div>
              <div className="dp-field"><dt>服务记录</dt><dd>{badge.recentServiceRecordIds.length > 0 ? `${badge.recentServiceRecordIds.length} 条` : "—"}</dd></div>
            </dl>
          </div>

          {/* 服务人员 */}
          <div className="dp-section">
            <div className="dp-section__head">
              <h4 className="dp-section__title">服务人员</h4>
              {!editingWorker && !mutationsDisabled && canDisableOrLose(badge.status) && (
                <button className="dp-section__edit-btn" onClick={() => setEditingWorker(true)} type="button" title="编辑"><Edit3 size={14} /></button>
              )}
            </div>
            <dl className="dp-fields">
              <div className="dp-field"><dt>常用人员</dt><dd>
                {editingWorker ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <select style={{ height: 32, borderRadius: 6, border: "1.5px solid #0052CC", padding: "0 8px", fontSize: 13, boxShadow: "0 0 0 3px rgba(0,82,204,0.1)", maxWidth: "100%" }} value={selectedWorker} onChange={e => { setSelectedWorker(e.target.value); setBindError(""); }}>
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
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--site-muted)" }}>工牌可被站点内任一服务人员使用，常用人员仅作为推断默认关联</p>
          </div>
        </div>
      </div>
    </DetailPageShell>
  );
}

function ActivateDrawer({ onClose, onActivated, onViewBadge }: { onClose: () => void; onActivated: () => void; onViewBadge?: (id: string) => void }) {
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
    <DetailPageShell parentLabel="设备" parentPath="/badges" title="激活工牌">
      <div className="dp-card">
        <div className="dp-card__body">
          {step === "input" ? (
            <div className="dp-section">
              <div className="dp-section__head">
                <h4 className="dp-section__title">设备信息</h4>
              </div>
              <dl className="dp-fields">
                <div className="dp-field"><dt>设备码</dt><dd><input onChange={(e) => setDeviceCode(e.target.value)} placeholder="输入设备码，如 FW-030" value={deviceCode} /></dd></div>
              </dl>
              {error ? <p className="badges-error" style={{ marginTop: 12 }}>{error}</p> : null}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <button className="sw-btn sw-btn--primary" disabled={activating || !deviceCode.trim()} onClick={() => setStep("confirm")} type="button">下一步</button>
              </div>
            </div>
          ) : step === "confirm" ? (
            <div className="dp-section">
              <div className="dp-section__head">
                <h4 className="dp-section__title">确认激活</h4>
              </div>
              <dl className="dp-fields">
                <div className="dp-field"><dt>设备码</dt><dd><span className="badges-code-tag">{deviceCode}</span></dd></div>
                <div className="dp-field"><dt>绑定站点</dt><dd>{currentSite?.name ?? "未选择"}</dd></div>
              </dl>
              {error ? <p className="badges-error" style={{ marginTop: 12 }}>{error}</p> : null}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button className="sw-btn sw-btn--secondary" onClick={() => { setStep("input"); setError(""); }} type="button">上一步</button>
                <button className="sw-btn sw-btn--primary" disabled={activating} onClick={handleActivate} type="button">{activating ? "激活中..." : "确认激活"}</button>
              </div>
            </div>
          ) : (
            <div className="dp-section" style={{ textAlign: "center", padding: "40px 0" }}>
              <div className="badges-success__icon" style={{ margin: "0 auto 12px" }}><Smartphone size={28} /></div>
              <strong style={{ fontSize: 16 }}>激活成功</strong>
              <p style={{ color: "var(--site-muted)", marginTop: 4 }}>{result?.deviceCode} 已绑定到 {result?.siteName}</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
                <button className="sw-btn sw-btn--secondary" onClick={() => { onActivated(); if (result) onViewBadge?.(result.id); }} type="button">查看设备详情</button>
                <button className="sw-btn sw-btn--primary" onClick={() => { setDeviceCode(""); setStep("input"); setResult(null); setError(""); }} type="button">继续激活</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DetailPageShell>
  );
}
