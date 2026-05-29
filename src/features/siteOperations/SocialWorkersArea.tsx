import { useEscClose } from "../../shared/hooks/useEscClose";
import { formatSyncTime } from "../../shared/utils/dateTimeUtils";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { AvatarInitial } from "../../shared/components/AvatarInitial";
import { ConfirmAction } from "../../shared/components/ConfirmAction";
import { useState, useCallback, useEffect } from "react";
import { useCopyToClipboard } from "../../shared/hooks/useCopyToClipboard";
import { Search, X, Plus, UserRound, Phone, Award, Edit3, ThumbsUp } from "lucide-react";
import { ListToolbar } from "../../shared/components/ListToolbar";
import { OperationalBanner } from "../../shared/components/OperationalBanner";
import { FilterDropdown } from "../../shared/components/FilterDropdown";
import { EmptyState } from "../../shared/components/EmptyState";
import { DetailPageShell } from "../../shared/DetailPageShell";
import type {
  SocialWorker,
  SocialWorkerStatus,
  SocialWorkersResponse
} from "./contracts";
import { statusText } from "./contracts";
import { siteOperationsApi, authFetch } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";
import { useSiteOpsData } from "../../layouts/SiteOperationsLayout";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSetDetailEntity } from "../../shared/DetailPageContext";

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

export function SocialWorkersArea({ resource: resourceProp, onMutate: onMutateProp, initialSearch }: { resource?: Resource<SocialWorkersResponse>; onMutate?: () => void; initialSearch?: string } = {}) {
  const ctxData = useSiteOpsData();
  const resource = resourceProp ?? ctxData.socialWorkers;
  const onMutate = onMutateProp ?? ctxData.refetch;
  const { id: routeId } = useParams();
  const setDetailEntity = useSetDetailEntity();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const effectiveInitialSearch = initialSearch ?? urlSearch;
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(effectiveInitialSearch);
  useEffect(() => { if (effectiveInitialSearch) setSearchQuery(effectiveInitialSearch); }, [effectiveInitialSearch]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>("");
  const operationalState = resource.status === "success" ? resource.data.operationalState : undefined;
  const mutationsDisabled = isMutationDisabled(operationalState);

  const workers = resource.status === "success" ? resource.data.socialWorkers : [];

  const openDrawer = useCallback((worker: SocialWorker) => {
    navigate(`/workers/${worker.id}`);
  }, [navigate]);

  const closeDrawer = useCallback(() => { navigate("/workers"); }, [navigate]);

  const handleWorkerCreated = useCallback(() => {
    onMutate?.();
    navigate("/workers");
  }, [onMutate, navigate]);

  const handleWorkerUpdated = useCallback(() => {
    onMutate?.();
    navigate("/workers");
  }, [onMutate, navigate]);

  const handleWorkerRefresh = useCallback(() => {
    onMutate?.();
  }, [onMutate]);

  // URL -> drawer sync
  useEffect(() => {
    if (routeId === "new") {
      setDrawer({ kind: "create" });
    } else if (routeId) {
      const worker = workers.find(w => w.id === routeId);
      if (worker) setDrawer({ kind: "view", worker });
    } else {
      setDrawer({ kind: "closed" });
    }
  }, [routeId, workers]);

  useEffect(() => {
    if (routeId && routeId !== "new" && drawer.kind === "view") {
      setDetailEntity({ entityType: "social_worker", entityId: routeId, entityName: drawer.worker.name });
    } else {
      setDetailEntity(null);
    }
    return () => setDetailEntity(null);
  }, [routeId, drawer, setDetailEntity]);

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
  useEscClose(useCallback(() => { closeDrawer(); }, [closeDrawer]));

  return (
    <>
      {drawer.kind !== "closed" ? (
        <WorkerDrawer
          drawer={drawer}
          mutationsDisabled={mutationsDisabled}
          onClose={closeDrawer}
          onEdit={(worker) => setDrawer({ kind: "edit", worker })}
          onView={(worker) => setDrawer({ kind: "view", worker })}
          onWorkerCreated={handleWorkerCreated}
          onWorkerUpdated={handleWorkerUpdated}
          onWorkerRefresh={handleWorkerRefresh}
        />
      ) : (
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
                onClick={() => navigate("/workers/new")}
                type="button"
              >
                <Plus size={15} />
                新增人员
              </button>
            </header>

            <div className="sw-table-container">
              <ListToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="搜索姓名或电话..."
                filters={<>
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
                </>}
              />

              {operationalState ? <OperationalBanner state={operationalState} resourceLabel="服务人员" readOnlyHint="可查看数据，新增、编辑、归档等操作已禁用。" /> : null}

              <WorkerContent
                filtered={filtered}
                loading={isLoading}
                error={resource.status === "error" ? resource.error : undefined}
                isEmpty={resource.status === "success" && workers.length === 0}
                isFilterEmpty={resource.status === "success" && workers.length > 0 && filtered.length === 0}
                mutationsDisabled={mutationsDisabled}
                onCreateClick={() => navigate("/workers/new")}
                onRowClick={openDrawer}
                onNameClick={openDrawer}
                selectedId={selectedId}
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
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
  selectedId: string | null;
}) {
  if (loading) return <EmptyState icon={UserRound} description="服务人员数据加载中..." />;
  if (error) return <EmptyState icon={X} description={error} isError />;
  if (isEmpty) return (
    <EmptyState
      icon={UserRound}
      title="暂无服务人员"
      description="点击新增创建第一条记录"
      action={<button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={onCreateClick} type="button"><Plus size={15} />新增服务人员</button>}
    />
  );
  if (isFilterEmpty) return <EmptyState icon={Search} description="没有匹配的服务人员" />;

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
          return (
            <div
              className="sw-table__row"
              data-selected={selectedId === worker.id}
              key={worker.id}
              onClick={() => onRowClick(worker)}
              role="row"
            >
              <div role="cell" className="sw-table__cell-name">
                <AvatarInitial name={worker.name} />
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
                {(worker.qualificationLabels ?? []).length > 0
                  ? <div className="sw-tags">{(worker.qualificationLabels ?? []).map(q => <span key={q} className="sw-tag">{q}</span>)}</div>
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
                <StatusBadge tone={statusTone(worker.status)}>
                  {statusText[worker.status] ?? worker.status}
                </StatusBadge>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sw-mobile-list">
        {filtered.map((worker) => {
          return (
            <button
              className="sw-mobile-card"
              key={worker.id}
              onClick={() => onNameClick(worker)}
              type="button"
            >
              <div className="sw-mobile-card__top">
                <AvatarInitial name={worker.name} />
                <div className="sw-mobile-card__info">
                  <strong>{worker.name}</strong>
                  <span>{worker.phone}</span>
                </div>
                <StatusBadge tone={statusTone(worker.status)}>
                  {statusText[worker.status] ?? worker.status}
                </StatusBadge>
              </div>
              <div className="sw-mobile-card__meta">
                <span>{(worker.qualificationLabels ?? []).length > 0 ? (worker.qualificationLabels ?? []).join("、") : "无资质"}</span>
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
  const [showBadgeSelect, setShowBadgeSelect] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(worker.preferredBadge?.badgeId ?? "");
  const [resetPwdResult, setResetPwdResult] = useState<string | null>(null);
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const { copy: copyText, copied } = useCopyToClipboard();
  const [editingBasic, setEditingBasic] = useState(false);
  const [editName, setEditName] = useState(worker.name);
  const [editPhone, setEditPhone] = useState(worker.phone);
  const [editQual, setEditQual] = useState((worker.qualificationLabels ?? []).join("、"));
  const [savingBasic, setSavingBasic] = useState(false);

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
      const res = await authFetch(`/api/social-workers/${worker.id}/reset-password`, {
        method: "POST",
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

  const archiveAction = (
    <ConfirmAction label="归档人员" onConfirm={() => {}} disabled={mutationsDisabled} buttonStyle={{ height: 28, fontSize: 12 }} />
  );

  return (
    <DetailPageShell parentLabel="服务人员" parentPath="/workers" title={worker.name} actions={archiveAction}>
      {/* ── Tabbed Content Card ── */}
      <div className="dp-card">
        <div className="dp-tabs" role="tablist">
          {tabs.map(tab => (
            <button className="dp-tabs__btn" data-active={activeTab === tab.id} key={tab.id} onClick={() => setActiveTab(tab.id)} role="tab" type="button">
              {tab.label}
            </button>
          ))}
        </div>

        <div className="dp-card__body">
          {activeTab === "overview" && (
            <>
              {/* 基础信息 */}
              <div className="dp-section">
                <div className="dp-section__head">
                  <h4 className="dp-section__title">基础信息</h4>
                  {!editingBasic && <button className="dp-section__edit-btn" disabled={mutationsDisabled} onClick={() => { setEditName(worker.name); setEditPhone(worker.phone); setEditQual((worker.qualificationLabels ?? []).join("、")); setEditingBasic(true); }} type="button" title="编辑"><Edit3 size={14} /></button>}
                </div>
                <dl className="dp-fields">
                  <div className="dp-field"><dt>姓名</dt><dd>{editingBasic ? <input value={editName} onChange={e => setEditName(e.target.value)} /> : worker.name}</dd></div>
                  <div className="dp-field"><dt>电话</dt><dd>{editingBasic ? <input value={editPhone} onChange={e => setEditPhone(e.target.value)} /> : worker.phone}</dd></div>
                  <div className="dp-field"><dt>状态</dt><dd><StatusBadge tone={statusTone(worker.status)}>{statusText[worker.status] ?? worker.status}</StatusBadge></dd></div>
                  <div className="dp-field dp-field--full"><dt>资质</dt><dd>{editingBasic ? <input value={editQual} onChange={e => setEditQual(e.target.value)} placeholder="用顿号分隔" /> : ((worker.qualificationLabels ?? []).length > 0 ? (worker.qualificationLabels ?? []).join("、") : "—")}</dd></div>
                </dl>
                {editingBasic && (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                    <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => setEditingBasic(false)} type="button">取消</button>
                    <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 12 }} disabled={savingBasic} onClick={handleSaveBasic} type="button">{savingBasic ? "保存中..." : "保存"}</button>
                  </div>
                )}
              </div>

              {/* 常用工牌 */}
              <div className="dp-section">
                <div className="dp-section__head">
                  <h4 className="dp-section__title">常用工牌</h4>
                  {!showBadgeSelect && <button className="dp-section__edit-btn" disabled={mutationsDisabled} onClick={() => setShowBadgeSelect(true)} type="button" title="更换工牌"><Edit3 size={14} /></button>}
                </div>
                <dl className="dp-fields">
                  <div className="dp-field"><dt>设备编号</dt><dd>
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
                      <div className="dp-field"><dt>状态</dt><dd><StatusBadge tone={badgeStatusTone(worker.preferredBadge.status)}>{statusText[worker.preferredBadge.status] ?? worker.preferredBadge.status}</StatusBadge></dd></div>
                      <div className="dp-field"><dt>最近同步</dt><dd>{worker.preferredBadge.lastSyncAt ? formatSyncTime(worker.preferredBadge.lastSyncAt) : "—"}</dd></div>
                    </>
                  )}
                </dl>
              </div>

              {/* 登录账号 */}
              <div className="dp-section">
                <div className="dp-section__head">
                  <h4 className="dp-section__title">登录账号</h4>
                </div>
                {worker.account ? (
                  <dl className="dp-fields">
                    <div className="dp-field"><dt>账号</dt><dd><strong>{worker.account.username}</strong></dd></div>
                    <div className="dp-field"><dt>状态</dt><dd>
                      {worker.account.mustChangePassword
                        ? (worker.account.initialPassword ? <span style={{ color: "#D97706" }}>待激活</span> : <span style={{ color: "#EA580C" }}>待修改密码</span>)
                        : <span style={{ color: "#16A34A" }}>已激活</span>}
                    </dd></div>
                    <div className="dp-field"><dt>操作</dt><dd>
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
            <div className="dp-section">
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
      </div>
    </DetailPageShell>
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
  const [qualifications, setQualifications] = useState((worker.qualificationLabels ?? []).join("、"));
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
    <DetailPageShell parentLabel="服务人员" parentPath="/workers" title={`${worker.name} · 编辑`}>
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
    </DetailPageShell>
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
    <DetailPageShell parentLabel="服务人员" parentPath="/workers" title="新增">
      <div className="dp-card">
        <div className="dp-card__body">
          <div className="dp-section">
            <div className="dp-section__head">
              <h4 className="dp-section__title">基本信息</h4>
            </div>
            <dl className="dp-fields">
              <div className="dp-field"><dt>姓名 *</dt><dd><input onChange={(e) => setName(e.target.value)} placeholder="输入姓名" value={name} /></dd></div>
              <div className="dp-field"><dt>电话 *</dt><dd><input onChange={(e) => setPhone(e.target.value)} placeholder="输入电话" value={phone} /></dd></div>
              <div className="dp-field dp-field--full"><dt>资质</dt><dd><input onChange={(e) => setQualifications(e.target.value)} placeholder="用顿号分隔，如：助餐、陪诊" value={qualifications} /></dd></div>
            </dl>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button className="sw-btn sw-btn--primary" disabled={creating || !name.trim() || !phone.trim()} onClick={handleCreate} type="button">{creating ? "创建中..." : "创建"}</button>
            </div>
          </div>
        </div>
      </div>
    </DetailPageShell>
  );
}
