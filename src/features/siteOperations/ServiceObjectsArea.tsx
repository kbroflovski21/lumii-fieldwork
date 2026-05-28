import { useEscClose } from "./useEscClose";
import { formatTime } from "../../shared/utils/dateTimeUtils";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { AvatarInitial } from "../../shared/components/AvatarInitial";
import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, ChevronDown, Plus, UserRound, Shield, Edit3, AlertTriangle, CalendarPlus, Sparkles, Send, Clock, Ban, CalendarClock, FileText, Phone, MapPin } from "lucide-react";
import { DetailPageShell } from "../../shared/DetailPageShell";
import type {
  ServiceObject,
  ServiceObjectState,
  ServiceEligibilityType,
  ServiceRecord,
  WorkAreaOperationalState,
  ServiceObjectsResponse,
  FamilyContact,
  AiScheduleResult,
  ServicePlan,
} from "./contracts";
import { RecordDrawer } from "./RecordsArea";
import { statusText } from "./contracts";
import { siteOperationsApi, authFetch } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";
import { useSite } from "../../auth/SiteContext";
import { useSiteOpsData } from "../../layouts/SiteOperationsLayout";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

type DrawerMode =
  | { kind: "closed" }
  | { kind: "view"; object: ServiceObject }
  | { kind: "create" };

type EligibilityFilter = "" | ServiceEligibilityType;
type StateFilter = "" | "normal" | "risk" | "paused" | "pending";
type RiskFilter = "" | "has" | "none";

const eligibilityFilterOptions: Array<{ label: string; value: EligibilityFilter }> = [
  { label: "服务资格", value: "" },
  { label: "养护险", value: "insurance" },
  { label: "政府购买", value: "government" },
  { label: "机构服务", value: "institution" },
  { label: "自费", value: "self_paid" }
];

const stateFilterOptions: Array<{ label: string; value: StateFilter }> = [
  { label: "服务状态", value: "" },
  { label: "正常", value: "normal" },
  { label: "需关注", value: "risk" },
  { label: "计划暂停", value: "paused" },
  { label: "家属待绑定", value: "pending" }
];

const riskFilterOptions: Array<{ label: string; value: RiskFilter }> = [
  { label: "风险标签", value: "" },
  { label: "有风险标签", value: "has" },
  { label: "无风险标签", value: "none" }
];

const eligibilityLabel: Record<string, string> = {
  insurance: "养护险", government: "政府购买", institution: "机构服务", self_paid: "自费"
};

const subscriptionLabel: Record<string, string> = {
  none: "未订阅", daily: "日报", weekly: "周报", monthly: "月报", exception_only: "仅异常"
};

const exceptionKindLabel: Record<string, string> = {
  pause: "暂停", time_change: "时间调整", worker_change: "人员替换", skip: "跳过服务"
};

const examplePrompts = [
  "每周一、三、五上午10点到12点助餐",
  "下周二下午2点陪诊",
  "每天上午9点到11点探访关爱、测血糖血压",
  "本周五下午助浴",
];

function compositeStateTone(obj: ServiceObject): { label: string; tone: string } {
  if (obj.riskTags.length > 0 || obj.state === "risk_tagged") return { label: "需关注", tone: "warning" };
  if (obj.state === "plan_exception_active") return { label: "计划例外", tone: "warning" };
  if (obj.state === "plan_paused") return { label: "计划暂停", tone: "muted" };
  if (obj.state === "family_binding_pending") return { label: "待绑定", tone: "muted" };
  return { label: "正常", tone: "success" };
}

function matchStateFilter(obj: ServiceObject, filter: StateFilter): boolean {
  if (!filter) return true;
  if (filter === "normal") return obj.state === "normal" || obj.state === "plan_active" || obj.state === "subscribed";
  if (filter === "risk") return obj.riskTags.length > 0 || obj.state === "risk_tagged" || obj.state === "plan_exception_active";
  if (filter === "paused") return obj.state === "plan_paused";
  if (filter === "pending") return obj.state === "family_binding_pending";
  return true;
}


/* ==========================================
   Page-level components (unchanged)
   ========================================== */

export function ServiceObjectsArea({ resource: resourceProp, onMutate: onMutateProp, initialSearch }: { resource?: Resource<ServiceObjectsResponse>; onMutate?: () => void; initialSearch?: string } = {}) {
  const ctxData = useSiteOpsData();
  const resource = resourceProp ?? ctxData.serviceObjects;
  const onMutate = onMutateProp ?? ctxData.refetch;
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const effectiveInitialSearch = initialSearch ?? urlSearch;
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(effectiveInitialSearch);
  useEffect(() => { if (effectiveInitialSearch) setSearchQuery(effectiveInitialSearch); }, [effectiveInitialSearch]);
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityFilter>("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("");
  const operationalState = resource.status === "success" ? resource.data.operationalState : undefined;
  const mutationsDisabled = isMutationDisabled(operationalState);

  const objects = resource.status === "success" ? resource.data.serviceObjects : [];

  const openDrawer = useCallback((obj: ServiceObject) => { navigate(`/elders/${obj.id}`); }, [navigate]);

  const closeDrawer = useCallback(() => { navigate("/elders"); }, [navigate]);

  const openCreateDrawer = useCallback(() => { navigate("/elders/new"); }, [navigate]);

  const handleCreated = useCallback(() => {
    onMutate?.();
    navigate("/elders");
  }, [onMutate, navigate]);

  const handleUpdated = useCallback(() => {
    onMutate?.();
    navigate("/elders");
  }, [onMutate, navigate]);

  const handleObjectRefresh = useCallback(() => {
    onMutate?.();
  }, [onMutate]);

  // URL -> drawer sync
  useEffect(() => {
    if (routeId === "new") {
      setDrawer({ kind: "create" });
    } else if (routeId) {
      const obj = objects.find(o => o.id === routeId);
      if (obj) setDrawer({ kind: "view", object: obj });
    } else {
      setDrawer({ kind: "closed" });
    }
  }, [routeId, objects]);

  // Sync drawer object with refreshed list data
  useEffect(() => {
    if (drawer.kind !== "closed" && "object" in drawer) {
      const fresh = objects.find(o => o.id === drawer.object.id);
      if (fresh && fresh !== drawer.object) {
        setDrawer(prev => prev.kind !== "closed" && "object" in prev ? { ...prev, object: fresh } : prev);
      }
    }
  }, [objects]);

  const filtered = objects.filter((o) => {
    if (eligibilityFilter && o.eligibilityType !== eligibilityFilter) return false;
    if (!matchStateFilter(o, stateFilter)) return false;
    if (riskFilter === "has" && o.riskTags.length === 0) return false;
    if (riskFilter === "none" && o.riskTags.length > 0) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!o.name.toLowerCase().includes(q) && !o.address.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isLoading = resource.status === "loading" || resource.status === "idle";
  useEscClose(useCallback(() => { closeDrawer(); }, [closeDrawer]));

  return (
    <>
      {drawer.kind !== "closed" ? (
        <ObjectDrawer
          drawer={drawer}
          mutationsDisabled={mutationsDisabled}
          onClose={closeDrawer}
          onCreated={handleCreated}
          onUpdated={handleObjectRefresh}
        />
      ) : (
        <section aria-label="长者" className="sw-page">
          <div className="sw-page__inner">
            <header className="sw-header">
              <div className="sw-header__title-group">
                <h2 className="sw-header__title">长者</h2>
                <p className="sw-header__desc">管理长者档案、服务计划、照护重点和家属订阅</p>
              </div>
              <button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={openCreateDrawer} type="button">
                <Plus size={15} /> 新增长者
              </button>
            </header>

            <div className="sw-table-container">
              <div className="sw-toolbar">
                <label className="sw-search">
                  <Search size={16} />
                  <input aria-label="搜索长者" onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索姓名或地址..." value={searchQuery} />
                </label>
                <div className="sw-toolbar__filters">
                  <FilterDropdown onChange={(v) => setEligibilityFilter(v as EligibilityFilter)} options={eligibilityFilterOptions} value={eligibilityFilter} />
                  <FilterDropdown onChange={(v) => setStateFilter(v as StateFilter)} options={stateFilterOptions} value={stateFilter} />
                  <FilterDropdown onChange={(v) => setRiskFilter(v as RiskFilter)} options={riskFilterOptions} value={riskFilter} />
                </div>
              </div>

              {operationalState ? <OperationalBanner state={operationalState} /> : null}

              <ObjectContent
                filtered={filtered}
                loading={isLoading}
                error={resource.status === "error" ? resource.error : undefined}
                isEmpty={resource.status === "success" && objects.length === 0}
                isFilterEmpty={resource.status === "success" && objects.length > 0 && filtered.length === 0}
                mutationsDisabled={mutationsDisabled}
                onCreateClick={openCreateDrawer}
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

function FilterDropdown({ onChange, options, value }: { onChange: (v: string) => void; options: Array<{ label: string; value: string }>; value: string }) {
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
  if (state.unavailableMessage) return <div className="sw-banner sw-banner--danger" role="status"><Shield size={16} /><div><strong>长者暂不可用</strong><span>{state.unavailableMessage}</span></div></div>;
  if (state.permission === "read_only") return <div className="sw-banner sw-banner--warning" role="status"><Shield size={16} /><div><strong>只读模式</strong><span>可查看数据，新增、编辑和归档操作已禁用。</span></div></div>;
  if (state.permission === "restricted") return <div className="sw-banner sw-banner--warning" role="status"><Shield size={16} /><div><strong>权限受限</strong><span>敏感信息已隐藏，部分操作不可用。</span></div></div>;
  return null;
}

function ObjectContent({ filtered, loading, error, isEmpty, isFilterEmpty, mutationsDisabled, onCreateClick, onRowClick, onNameClick, selectedId }: {
  filtered: ServiceObject[]; loading: boolean; error?: string; isEmpty: boolean; isFilterEmpty: boolean;
  mutationsDisabled: boolean; onCreateClick: () => void; onRowClick: (o: ServiceObject) => void;
  onNameClick: (o: ServiceObject) => void; selectedId: string | null;
}) {
  if (loading) return <div className="sw-empty"><div className="sw-empty__icon"><UserRound size={32} /></div><span>长者数据加载中...</span></div>;
  if (error) return <div className="sw-empty"><div className="sw-empty__icon sw-empty__icon--error"><X size={32} /></div><span>{error}</span></div>;
  if (isEmpty) return <div className="sw-empty"><div className="sw-empty__icon"><UserRound size={32} /></div><strong>暂无长者</strong><span>点击新增创建第一条记录</span><button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={onCreateClick} type="button"><Plus size={15} />新增长者</button></div>;
  if (isFilterEmpty) return <div className="sw-empty"><div className="sw-empty__icon"><Search size={32} /></div><span>没有匹配的长者</span></div>;

  return (
    <>
      <div className="sw-table so-table" role="table">
        <div className="sw-table__head so-table__head" role="row">
          <span role="columnheader">姓名</span>
          <span role="columnheader">地址</span>
          <span role="columnheader">资格</span>
          <span role="columnheader">服务计划</span>
          <span role="columnheader">家属订阅</span>
          <span role="columnheader">状态</span>
        </div>
        {filtered.map((obj) => {
          const status = compositeStateTone(obj);
          const planLabel = obj.servicePlanSummaries.length > 0
            ? `${obj.servicePlanSummaries[0].serviceProject}·${obj.servicePlanSummaries[0].cadenceLabel}`
            : undefined;
          return (
            <div className="sw-table__row so-table__row" data-selected={selectedId === obj.id} key={obj.id}
              onClick={() => onRowClick(obj)} role="row">
              <div role="cell" className="sw-table__cell-name">
                <AvatarInitial name={obj.name} />
                <div className="sw-name-group">
                  <button className="sw-name-link" onClick={(e) => { e.stopPropagation(); onNameClick(obj); }} type="button">{obj.name}</button>
                  <small>{obj.age ? `${obj.age}岁` : ""}{obj.gender === "female" ? " 女" : obj.gender === "male" ? " 男" : ""}</small>
                </div>
              </div>
              <div role="cell" className="so-cell-address">{obj.address}</div>
              <div role="cell"><span className="sw-tag">{eligibilityLabel[obj.eligibilityType] ?? obj.eligibilityType}</span></div>
              <div role="cell">{planLabel ?? <span className="sw-text-muted">—</span>}</div>
              <div role="cell">{subscriptionLabel[obj.familySubscriptionSummary] ?? <span className="sw-text-muted">—</span>}</div>
              <div role="cell"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></div>
            </div>
          );
        })}
      </div>

      <div className="sw-mobile-list">
        {filtered.map((obj) => {
          const status = compositeStateTone(obj);
          const planLabel = obj.servicePlanSummaries.length > 0 ? `${obj.servicePlanSummaries[0].serviceProject}·${obj.servicePlanSummaries[0].cadenceLabel}` : undefined;
          return (
            <button className="sw-mobile-card" key={obj.id} onClick={() => onNameClick(obj)} type="button">
              <div className="sw-mobile-card__top">
                <AvatarInitial name={obj.name} />
                <div className="sw-mobile-card__info"><strong>{obj.name}</strong><span>{obj.address}</span></div>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <div className="sw-mobile-card__meta">
                <span>{eligibilityLabel[obj.eligibilityType]}</span>
                {planLabel ? <span>{planLabel}</span> : null}
                <span>{subscriptionLabel[obj.familySubscriptionSummary]}</span>
                {obj.riskTags.length > 0 ? <span>{obj.riskTags.length} 个风险标签</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ==========================================
   Modal components (redesigned)
   ========================================== */

function ObjectDrawer({ drawer, mutationsDisabled, onClose, onCreated, onUpdated }: {
  drawer: Exclude<DrawerMode, { kind: "closed" }>; mutationsDisabled: boolean; onClose: () => void;
  onCreated: () => void; onUpdated: () => void;
}) {
  if (drawer.kind === "view") return <ViewModal object={drawer.object} mutationsDisabled={mutationsDisabled} onClose={onClose} onUpdated={onUpdated} />;
  return <CreateModal onClose={onClose} onCreated={onCreated} />;
}

type ViewTab = "overview" | "plans" | "history" | "insights";

function ViewModal({ object: obj, mutationsDisabled, onClose, onUpdated }: {
  object: ServiceObject; mutationsDisabled: boolean; onClose: () => void; onUpdated: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<ServiceRecord | null>(null);
  const [savedSchedules, setSavedSchedules] = useState<Array<{ id: string; serviceDate: string; serviceProject: string; status: string; timeWindow?: any; assignedSocialWorkerName?: string; assignedSocialWorkerId?: string; source?: string; servicePlanId?: string }>>([]);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [workerOptions, setWorkerOptions] = useState<Array<{ id: string; name: string }>>([]);
  const { currentSite } = useSite();

  const refreshPlanData = useCallback(() => {
    authFetch(`/api/service-objects/${obj.id}/service-plans`)
      .then(r => r.json())
      .then(data => setSavedPlans(data.servicePlans ?? []))
      .catch(() => {});
    const rs = new Date().toISOString().slice(0, 10);
    const re = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    authFetch(`/api/service-schedule-occurrences?rangeStart=${rs}&rangeEnd=${re}`)
      .then(r => r.json())
      .then(data => {
        const mine = (data.serviceSchedules ?? []).filter((s: any) => s.serviceObjectId === obj.id && s.status !== "cancelled" && s.status !== "suspended");
        setSavedSchedules(mine);
      })
      .catch(() => {});
  }, [obj.id]);

  useEffect(() => {
    refreshPlanData();
    const siteId = currentSite?.id;
    const workerUrl = siteId ? `/api/social-workers?siteId=${siteId}` : "/api/social-workers";
    authFetch(workerUrl).then(r => r.json()).then(data => {
      setWorkerOptions((data.socialWorkers ?? []).map((w: any) => ({ id: w.id, name: w.name })));
    }).catch(() => {});
  }, [obj.id, refreshPlanData, currentSite?.id]);

  // Inline editing state
  const [editingBasic, setEditingBasic] = useState(false);
  const [editName, setEditName] = useState(obj.name);
  const [editPhone, setEditPhone] = useState(obj.phone ?? "");
  const [editIdNumber, setEditIdNumber] = useState(obj.idNumber ?? "");
  const [editAge, setEditAge] = useState(obj.age?.toString() ?? "");
  const [editGender, setEditGender] = useState<string>(obj.gender ?? "unknown");
  const [editAddress, setEditAddress] = useState(obj.address);
  const [editEligibility, setEditEligibility] = useState(obj.eligibilityType);
  const [editProjects, setEditProjects] = useState(obj.serviceProjects.join("、"));
  const [savingBasic, setSavingBasic] = useState(false);

  const [editingCare, setEditingCare] = useState(false);
  const [editRiskTags, setEditRiskTags] = useState(obj.riskTags.join("、"));
  const [editCareNotes, setEditCareNotes] = useState(obj.careNotes.join("\n"));
  const [savingCare, setSavingCare] = useState(false);

  const handleSaveBasic = async () => {
    setSavingBasic(true);
    try {
      await siteOperationsApi.updateServiceObject(obj.id, {
        name: editName.trim(), phone: editPhone.trim() || undefined, idNumber: editIdNumber.trim() || undefined,
        age: editAge ? Number(editAge) : undefined, address: editAddress.trim(),
        eligibilityType: editEligibility as ServiceEligibilityType,
        serviceProjects: editProjects.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
      });
      setEditingBasic(false);
      onUpdated();
    } catch { /* noop */ }
    setSavingBasic(false);
  };

  const handleSaveCare = async () => {
    setSavingCare(true);
    try {
      await siteOperationsApi.updateServiceObject(obj.id, {
        riskTags: editRiskTags.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
        careNotes: editCareNotes.split("\n").map(s => s.trim()).filter(Boolean),
      });
      setEditingCare(false);
      onUpdated();
    } catch { /* noop */ }
    setSavingCare(false);
  };

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AiScheduleResult | null>(null);
  const [selectedSopIds, setSelectedSopIds] = useState<string[]>([]);
  const [allServiceSops, setAllServiceSops] = useState<Array<{ id: string; name: string }>>([]);
  const [planWorkerId, setPlanWorkerId] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [deletePlanConfirmId, setDeletePlanConfirmId] = useState<string | null>(null);
  const [cancelPlanConfirmId, setCancelPlanConfirmId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const status = compositeStateTone(obj);

  useEffect(() => {
    authFetch("/api/sops/service-list").then(r => r.json()).then(data => {
      setAllServiceSops(data.sops ?? []);
    }).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!aiInput.trim()) return;
    setGenerating(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const resp = await authFetch("/api/ai/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiInput, today }),
      });
      const data = await resp.json();
      if (data.error) { setGenerating(false); return; }
      setAiResult(data);
      setSelectedSopIds((data.matchedSops ?? []).map((s: any) => s.id));
      if (data.matchedWorker) {
        setPlanWorkerId(data.matchedWorker.id);
      }
    } catch {}
    setGenerating(false);
  };

  const handleCreatePlan = async () => {
    if (!aiResult) return;
    const p = aiResult.plan;
    const worker = workerOptions.find(w => w.id === planWorkerId);
    const selectedSopNames = allServiceSops.filter(s => selectedSopIds.includes(s.id)).map(s => s.name);
    const serviceProject = selectedSopNames.length > 0 ? selectedSopNames.join("、") : (p.serviceContent || "长护险");
    if (p.isRecurring) {
      await authFetch(`/api/service-objects/${obj.id}/service-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: aiInput,
          cadenceRule: p.cadenceRule,
          cadenceLabel: p.cadenceLabel,
          preferredTimeWindow: p.timeWindow,
          startDate: p.startDate,
          serviceProject,
          sopIds: selectedSopIds,
          primarySocialWorkerId: planWorkerId || null,
          primarySocialWorkerName: worker?.name ?? null,
        }),
      });
    } else {
      await siteOperationsApi.createOneTimeServiceSchedule({
        serviceObjectId: obj.id,
        serviceProject,
        serviceDate: p.startDate,
        timeWindow: p.timeWindow,
        assignedSocialWorkerId: planWorkerId || undefined,
        sopIds: selectedSopIds.length > 0 ? selectedSopIds : undefined,
      } as any);
    }
    setAiResult(null);
    setAiInput("");
    setShowScheduleForm(false);
    setPlanWorkerId("");
    refreshPlanData();
    onUpdated();
  };

  const handleCancelPlan = async (planId: string) => {
    await authFetch(`/api/service-plans/${planId}/cancel`, { method: "POST" });
    setCancelPlanConfirmId(null);
    refreshPlanData();
    onUpdated();
  };

  const handleReactivatePlan = async (planId: string) => {
    await authFetch(`/api/service-plans/${planId}/reactivate`, { method: "POST" });
    refreshPlanData();
    onUpdated();
  };

  const handleDeletePlan = async (planId: string) => {
    await authFetch(`/api/service-plans/${planId}`, { method: "DELETE" });
    setDeletePlanConfirmId(null);
    refreshPlanData();
    onUpdated();
  };

  const handleSavePlanEdit = async (planId: string, updates: Record<string, any>) => {
    await authFetch(`/api/service-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setEditingPlanId(null);
    refreshPlanData();
    onUpdated();
  };

  const hasInsights = (obj.insightSummaries ?? []).length > 0 || !!obj.latestInsightSummary;
  const tabs: Array<{ id: ViewTab; label: string; count?: number }> = [
    { id: "overview", label: "档案概览" },
    { id: "plans", label: "服务计划", count: savedPlans.length },
    { id: "history", label: "服务历史" },
    { id: "insights", label: "AI 洞察", count: hasInsights ? (obj.insightSummaries ?? []).length || undefined : undefined },
  ];

  const openAiScheduler = () => {
    setActiveTab("plans");
    setShowScheduleForm(true);
  };

  const headerActions = (
    <>
      {showArchiveConfirm ? (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#B54E34" }}>确认归档？</span>
          <button className="sw-btn sw-btn--danger" style={{ height: 28, fontSize: 12 }} type="button">确认归档</button>
          <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => setShowArchiveConfirm(false)} type="button">取消</button>
        </span>
      ) : (
        <button className="sw-btn sw-btn--danger-ghost" style={{ height: 32, fontSize: 12 }} disabled={mutationsDisabled} onClick={() => setShowArchiveConfirm(true)} type="button">归档</button>
      )}
      <button className="sw-btn sw-btn--primary" style={{ height: 32, fontSize: 12 }} disabled={mutationsDisabled} onClick={openAiScheduler} type="button">
        <CalendarPlus size={14} /> 安排服务
      </button>
    </>
  );

  if (viewingRecord) {
    return <RecordDrawer record={viewingRecord} mutationsDisabled={true} onClose={() => setViewingRecord(null)} onUpdated={() => {}} />;
  }

  return (
    <DetailPageShell parentLabel="长者" parentPath="/elders" title={obj.name} actions={headerActions}>
      <div className="dp-card">
        {/* ── Tab Bar ── */}
        <div className="dp-tabs" role="tablist">
          {tabs.map(tab => (
            <button
              className="dp-tabs__btn"
              data-active={activeTab === tab.id}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
              {tab.count ? <span className="so-modal__tab-count">{tab.count}</span> : null}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="dp-card__body">
        {activeTab === "overview" && (
          <>
            <div className="dp-section">
              <div className="dp-section__head">
                <h4 className="dp-section__title">基础信息</h4>
                {!editingBasic && <button className="dp-section__edit-btn" disabled={mutationsDisabled} onClick={() => { setEditName(obj.name); setEditPhone(obj.phone ?? ""); setEditIdNumber(obj.idNumber ?? ""); setEditAge(obj.age?.toString() ?? ""); setEditGender(obj.gender ?? "unknown"); setEditAddress(obj.address); setEditEligibility(obj.eligibilityType); setEditProjects(obj.serviceProjects.join("、")); setEditingBasic(true); }} type="button" title="编辑"><Edit3 size={14} /></button>}
              </div>
              <dl className="dp-fields">
                <div className="dp-field"><dt>姓名</dt><dd>{editingBasic ? <input value={editName} onChange={e => setEditName(e.target.value)} /> : obj.name}</dd></div>
                <div className="dp-field"><dt>电话</dt><dd>{editingBasic ? <input value={editPhone} onChange={e => setEditPhone(e.target.value)} /> : (obj.phone || "—")}</dd></div>
                <div className="dp-field"><dt>身份证号</dt><dd>{editingBasic ? <input value={editIdNumber} onChange={e => setEditIdNumber(e.target.value)} maxLength={18} /> : (obj.idNumber || "—")}</dd></div>
                <div className="dp-field"><dt>年龄</dt><dd>{editingBasic ? <input value={editAge} onChange={e => setEditAge(e.target.value)} type="number" style={{ width: 60 }} /> : (obj.age ? `${obj.age}岁` : "—")}</dd></div>
                <div className="dp-field"><dt>性别</dt><dd>{editingBasic ? <select value={editGender} onChange={e => setEditGender(e.target.value)}><option value="female">女</option><option value="male">男</option><option value="unknown">未知</option></select> : (obj.gender === "female" ? "女" : obj.gender === "male" ? "男" : "—")}</dd></div>
                <div className="dp-field"><dt>服务资格</dt><dd>{editingBasic ? <select value={editEligibility} onChange={e => setEditEligibility(e.target.value)}><option value="insurance">养护险</option><option value="government">政府购买</option><option value="institution">机构服务</option><option value="self_paid">自费</option></select> : <span className="sw-tag">{eligibilityLabel[obj.eligibilityType]}</span>}</dd></div>
                <div className="dp-field"><dt>服务套餐</dt><dd>{editingBasic ? <input value={editProjects} onChange={e => setEditProjects(e.target.value)} placeholder="如：长护险" /> : (obj.serviceProjects.join("、") || "长护险")}</dd></div>
                <div className="dp-field dp-field--full"><dt>地址</dt><dd className="so-address-cell">{editingBasic ? <input value={editAddress} onChange={e => setEditAddress(e.target.value)} style={{ width: "100%" }} /> : (
                  <>
                    <span>{obj.address || "—"}</span>
                    {obj.address && (
                      <button className="so-map-btn" type="button" onClick={() => setShowMap(!showMap)} title="查看地图">
                        <MapPin size={14} />
                      </button>
                    )}
                  </>
                )}</dd></div>
                {showMap && obj.address && (
                  <div className="dp-field dp-field--full" style={{ gridColumn: "1 / -1" }}>
                    <div className="so-map-popup">
                      <div className="so-map-popup__header">
                        <span>地图位置 · {obj.address}</span>
                        <button onClick={() => setShowMap(false)} type="button"><X size={14} /></button>
                      </div>
                      <AddressMap address={obj.address} />
                    </div>
                  </div>
                )}
              </dl>
              {editingBasic && (
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                  <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => setEditingBasic(false)} type="button">取消</button>
                  <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 12 }} disabled={savingBasic} onClick={handleSaveBasic} type="button">{savingBasic ? "保存中..." : "保存"}</button>
                </div>
              )}
            </div>

            <div className="dp-section">
              <div className="dp-section__head">
                <h4 className="dp-section__title">照护重点</h4>
                {!editingCare && <button className="dp-section__edit-btn" disabled={mutationsDisabled} onClick={() => { setEditRiskTags(obj.riskTags.join("、")); setEditCareNotes(obj.careNotes.join("\n")); setEditingCare(true); }} type="button" title="编辑"><Edit3 size={14} /></button>}
              </div>
              {editingCare ? (
                <div style={{ marginTop: 10 }}>
                  <label className="sw-field" style={{ marginBottom: 8 }}><span>风险标签</span><input value={editRiskTags} onChange={e => setEditRiskTags(e.target.value)} placeholder="用顿号分隔，如：独居、跌倒风险" style={{ width: "100%" }} /></label>
                  <label className="sw-field"><span>照护备注</span><textarea className="sw-field__textarea" value={editCareNotes} onChange={e => setEditCareNotes(e.target.value)} placeholder="每行一条" rows={3} style={{ width: "100%" }} /></label>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                    <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => setEditingCare(false)} type="button">取消</button>
                    <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 12 }} disabled={savingCare} onClick={handleSaveCare} type="button">{savingCare ? "保存中..." : "保存"}</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  {obj.riskTags.length > 0 ? (
                    <div className="so-risk-tags">{obj.riskTags.map(t => <span key={t} className="so-risk-tag"><AlertTriangle size={12} /> {t}</span>)}</div>
                  ) : null}
                  {obj.careNotes.length > 0 ? (
                    <ul className="so-care-notes">{obj.careNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                  ) : null}
                  {obj.riskTags.length === 0 && obj.careNotes.length === 0 ? <p className="sw-text-muted">暂无特殊注意事项</p> : null}
                </div>
              )}
            </div>

            <FamilySection obj={obj} mutationsDisabled={mutationsDisabled} onUpdated={onUpdated} />
          </>
        )}

        {activeTab === "plans" && (
          <>
            {/* AI Schedule Form */}
            {showScheduleForm ? (
              <div className="dp-section">
                <div className="so-schedule-form">
                  <div className="so-schedule-form__header">
                    <Sparkles size={16} />
                    <strong>AI 安排服务</strong>
                    <button className="sw-btn sw-btn--secondary so-schedule-form__close" onClick={() => { setShowScheduleForm(false); setGeneratedItems([]); setAiInput(""); }} type="button">收起</button>
                  </div>

                  <div className="so-ai-input-area">
                    <p className="so-ai-hint">描述服务安排，AI 自动生成服务计划：</p>
                    <div className="so-ai-prompts">
                      {examplePrompts.map(p => (
                        <button className="so-ai-prompt" key={p} onClick={() => setAiInput(p)} type="button">{p}</button>
                      ))}
                    </div>
                    <div className="so-ai-input-row">
                      <textarea
                        className="so-ai-input"
                        rows={3}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder={"输入服务安排，如：\n每周一三五上午10点到12点助餐、测血糖血压\n今天下午2点到3点上门助浴"}
                        value={aiInput}
                      />
                      <button className="so-ai-send" disabled={generating || !aiInput.trim()} onClick={handleGenerate} type="button">
                        {generating ? <Clock size={16} className="so-ai-spin" /> : <Send size={16} />}
                      </button>
                    </div>
                    {generating && (
                      <div className="so-ai-loading">
                        <Sparkles size={16} className="so-ai-spin" />
                        <span>AI 正在分析服务安排...</span>
                      </div>
                    )}
                  </div>

                  {aiResult && (
                    <div className="so-plan-summary-card">
                      <div className="so-plan-summary-card__header">
                        <CalendarPlus size={18} />
                        <h4>{aiResult.plan.isRecurring ? "周期服务计划" : "一次性服务排期"}</h4>
                      </div>
                      <div className="so-plan-summary-card__body">
                        <dl className="dp-fields">
                          <div className="dp-field"><dt>服务内容</dt><dd>{aiResult.plan.serviceContent}</dd></div>
                          {aiResult.plan.isRecurring && <div className="dp-field"><dt>频率</dt><dd>{aiResult.plan.cadenceLabel}</dd></div>}
                          <div className="dp-field"><dt>时间</dt><dd>{aiResult.plan.timeWindow.start}-{aiResult.plan.timeWindow.end}</dd></div>
                          <div className="dp-field"><dt>开始日期</dt><dd>{aiResult.plan.startDate}</dd></div>
                        </dl>

                        <div className="so-plan-field">
                          <label className="sw-field"><span>服务人员</span>
                            <select value={planWorkerId} onChange={e => setPlanWorkerId(e.target.value)}>
                              <option value="">不指定（待分配）</option>
                              {workerOptions.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          </label>
                        </div>

                        <div className="so-plan-field">
                          <strong className="so-plan-field__label">服务项目</strong>
                          <div className="so-plan-sop-list">
                            {allServiceSops.filter(s => selectedSopIds.includes(s.id)).map(s => (
                              <label key={s.id} className="so-plan-sop-item">
                                <input type="checkbox" checked onChange={() => setSelectedSopIds(prev => prev.filter(id => id !== s.id))} />
                                <span>{s.name}</span>
                              </label>
                            ))}
                          </div>
                          {allServiceSops.filter(s => !selectedSopIds.includes(s.id)).length > 0 && (
                            <select className="so-plan-sop-add" value="" onChange={(e) => { if (e.target.value) setSelectedSopIds(prev => [...prev, e.target.value]); }}>
                              <option value="">+ 添加服务项目</option>
                              {allServiceSops.filter(s => !selectedSopIds.includes(s.id)).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {aiResult.preview.length > 0 && (
                          <div className="so-plan-field">
                            <strong className="so-plan-field__label">近期排期预览</strong>
                            <div className="so-plan-preview">
                              {aiResult.preview.map((p, i) => (
                                <div key={i} className="so-plan-preview-item">
                                  <span className="so-plan-preview-date">{p.date}</span>
                                  <span className="so-plan-preview-day">{p.dayLabel}</span>
                                  <span className="so-plan-preview-time">{p.timeLabel}</span>
                                </div>
                              ))}
                              {aiResult.plan.isRecurring && <div className="so-plan-preview-note">将自动生成后续排期</div>}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="so-plan-summary-card__footer">
                        <button className="sw-btn sw-btn--secondary" onClick={() => setAiResult(null)} type="button">取消</button>
                        <button className="sw-btn sw-btn--primary" onClick={handleCreatePlan} type="button">
                          {aiResult.plan.isRecurring ? "创建计划" : "创建排期"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="so-plans-header-bar">
                <button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={() => setShowScheduleForm(true)} type="button">
                  <Sparkles size={14} /> AI 安排服务
                </button>
              </div>
            )}

            {/* Existing plans */}
            <div className="dp-section">
              <div className="dp-section__head"><h4 className="dp-section__title">当前计划</h4></div>
              {savedPlans.length > 0 ? (
                <div className="so-plans">
                  {savedPlans.map(plan => (
                    <div className="so-plan-card" data-status={plan.status} key={plan.id}>
                      {/* Row 1: cadence + time + status */}
                      <div className="so-plan-card__row1">
                        <span className="so-plan-card__rule">{plan.cadenceLabel} · {plan.preferredTimeWindow?.start ?? ""}-{plan.preferredTimeWindow?.end ?? ""}</span>
                        <StatusBadge tone={plan.status === "active" ? "success" : plan.status === "paused" ? "warning" : "muted"}>
                          {plan.status === "active" ? "进行中" : plan.status === "paused" ? "已暂停" : "已停用"}
                        </StatusBadge>
                      </div>
                      {/* Row 2: worker + SOP tags */}
                      <div className="so-plan-card__row2">
                        <span className="so-plan-card__worker-tag"><UserRound size={11} /> {plan.primarySocialWorkerName ?? "待分配"}</span>
                        {plan.sopLinks?.map((s: any) => <span key={s.sopId} className="sw-tag sw-tag--sm">{s.sopName}</span>)}
                      </div>
                      {/* Row 3: actions */}
                      <div className="so-plan-card__row3">
                        <button className="so-plan-card__action" onClick={() => setEditingPlanId(plan.id)} type="button"><Edit3 size={12} /> 编辑</button>
                        {plan.status === "active" ? (
                          <div style={{ position: "relative" }}>
                            <button className="so-plan-card__action" onClick={() => setCancelPlanConfirmId(cancelPlanConfirmId === plan.id ? null : plan.id)} type="button">停用</button>
                            {cancelPlanConfirmId === plan.id && (
                              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", border: "1px solid #FDE68A", padding: "10px 14px", zIndex: 100, whiteSpace: "nowrap" }}>
                                <div style={{ fontSize: 13, color: "#92400E", marginBottom: 8 }}>确定停用此计划？排期将被暂停。</div>
                                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                  <button className="sw-btn sw-btn--secondary" style={{ height: 26, fontSize: 11, padding: "0 10px" }} onClick={() => setCancelPlanConfirmId(null)} type="button">取消</button>
                                  <button className="sw-btn sw-btn--primary" style={{ height: 26, fontSize: 11, padding: "0 10px", background: "#D97706" }} onClick={() => handleCancelPlan(plan.id)} type="button">确认停用</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : plan.status === "archived" ? (
                          <button className="so-plan-card__action so-plan-card__action--primary" onClick={() => handleReactivatePlan(plan.id)} type="button">重新启用</button>
                        ) : null}
                        <div style={{ position: "relative" }}>
                          <button className="so-plan-card__action so-plan-card__action--danger" onClick={() => setDeletePlanConfirmId(deletePlanConfirmId === plan.id ? null : plan.id)} type="button">删除</button>
                          {deletePlanConfirmId === plan.id && (
                            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", border: "1px solid #FECACA", padding: "10px 14px", zIndex: 100, whiteSpace: "nowrap" }}>
                              <div style={{ fontSize: 13, color: "#B42318", marginBottom: 8 }}>确定删除此计划？相关排期将被永久删除。</div>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                <button className="sw-btn sw-btn--secondary" style={{ height: 26, fontSize: 11, padding: "0 10px" }} onClick={() => setDeletePlanConfirmId(null)} type="button">取消</button>
                                <button className="sw-btn sw-btn--danger" style={{ height: 26, fontSize: 11, padding: "0 10px" }} onClick={() => handleDeletePlan(plan.id)} type="button">确认删除</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="sw-text-muted">暂无周期服务计划</p>}
            </div>

            {/* Plan Edit Modal */}
            {editingPlanId && (() => {
              const ep = savedPlans.find(p => p.id === editingPlanId);
              if (!ep) return null;
              return <PlanEditModal plan={ep} workerOptions={workerOptions} allServiceSops={allServiceSops} onSave={(updates) => handleSavePlanEdit(ep.id, updates)} onClose={() => setEditingPlanId(null)} />;
            })()}

            {/* Schedule occurrences */}
            {savedSchedules.length > 0 && (
              <div className="dp-section">
                <div className="dp-section__head"><h4 className="dp-section__title">近期排期 ({savedSchedules.length}条)</h4></div>
                <div className="so-schedules-list">
                  {[...savedSchedules].sort((a, b) => a.serviceDate.localeCompare(b.serviceDate) || (a.timeWindow?.start ?? "").localeCompare(b.timeWindow?.start ?? "")).slice(0, 20).map(s => {
                    const effectiveStatus = (!s.assignedSocialWorkerId && s.status === "scheduled") ? "unassigned" : s.status;
                    const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
                    const dow = dayNames[new Date(s.serviceDate + "T00:00:00").getDay()];
                    const timeStr = `${s.timeWindow?.start ?? ""}–${s.timeWindow?.end ?? ""}`;
                    return (
                      <div className="so-schedule-row" key={s.id}>
                        <span>{s.serviceDate} {dow} {timeStr}</span>
                        <span>{s.assignedSocialWorkerName ?? ""}</span>
                        <StatusBadge tone={effectiveStatus === "completed" ? "success" : effectiveStatus === "cancelled" ? "muted" : effectiveStatus === "unassigned" ? "warning" : "accent"} style={{ fontSize: 10, padding: "2px 6px" }}>
                          {statusText[effectiveStatus] ?? effectiveStatus}
                        </StatusBadge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Placeholder for future local plans section */}
            {false && (
              <div></div>
            )}
          </>
        )}

        {activeTab === "history" && (
          <div className="dp-section">
            <HistoryRecords serviceObjectName={obj.name} serviceProjects={obj.serviceProjects} onViewRecord={setViewingRecord} />
          </div>
        )}

        {activeTab === "insights" && (
          <div className="dp-section">
            {hasInsights ? (
              <>
                {obj.latestInsightSummary ? <p className="so-insight-summary">{obj.latestInsightSummary}</p> : null}
                {(obj.insightSummaries ?? []).map(insight => (
                  <div className="so-insight" data-severity={insight.severity} key={insight.id}>
                    <strong>{insight.title}</strong>
                    <span>{insight.description}</span>
                  </div>
                ))}
              </>
            ) : <p className="sw-text-muted">暂无 AI 洞察数据</p>}
          </div>
        )}
        </div>
      </div>
    </DetailPageShell>
  );
}

/* ── Family Section ── */

function FamilySection({ obj, mutationsDisabled, onUpdated }: { obj: ServiceObject; mutationsDisabled: boolean; onUpdated: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", relation: "", phone: "", wechatId: "" });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("gy_auth_token");
      await authFetch(`/api/service-objects/${obj.id}/family-contacts`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setShowAdd(false);
      setForm({ name: "", relation: "", phone: "", wechatId: "" });
      onUpdated();
    } catch {}
    setSaving(false);
  };

  const handleEdit = async (id: string) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("gy_auth_token");
      await authFetch(`/api/family-contacts/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setEditId(null);
      onUpdated();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="dp-section">
      <div className="dp-section__head">
        <h4 className="dp-section__title">家属联系人</h4>
        {!showAdd && !editId && <button className="dp-section__edit-btn" style={{ color: "#0052CC", fontSize: 12, gap: 2 }} disabled={mutationsDisabled} onClick={() => { setForm({ name: "", relation: "", phone: "", wechatId: "" }); setShowAdd(true); }} type="button"><Plus size={14} /> 添加</button>}
      </div>

      {showAdd && (
        <div style={{ marginTop: 10, padding: 12, background: "#F9FAFB", borderRadius: 8, border: "1px solid #E5E7EB" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div className="sw-field"><span>姓名 *</span><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="sw-field"><span>关系</span><input placeholder="如：女儿" value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} /></div>
            <div className="sw-field"><span>电话</span><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="sw-field"><span>微信号</span><input value={form.wechatId} onChange={e => setForm(f => ({ ...f, wechatId: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => setShowAdd(false)} type="button">取消</button>
            <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 12 }} disabled={saving} onClick={handleAdd} type="button">{saving ? "保存中..." : "添加"}</button>
          </div>
        </div>
      )}

      <div className="so-family-list" style={{ marginTop: 10 }}>
        {obj.familyContacts.map(c => (
          <div className="so-family-row" key={c.id}>
            {editId === c.id ? (
              <div style={{ flex: 1, padding: 12, background: "#F9FAFB", borderRadius: 8, border: "1px solid #E5E7EB" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div className="sw-field"><span>姓名</span><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="sw-field"><span>关系</span><input value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} /></div>
                  <div className="sw-field"><span>电话</span><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div className="sw-field"><span>微信号</span><input value={form.wechatId} onChange={e => setForm(f => ({ ...f, wechatId: e.target.value }))} /></div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => setEditId(null)} type="button">取消</button>
                  <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 12 }} disabled={saving} onClick={() => handleEdit(c.id)} type="button">{saving ? "保存中..." : "保存"}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="so-family-row__info">
                  <strong>{c.name}</strong>
                  <span>{c.relation} · {c.phone}{c.wechatId ? ` · 微信: ${c.wechatId}` : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <StatusBadge tone={c.subscriptionStatus === "none" ? "muted" : c.subscriptionStatus === "exception_only" ? "warning" : "success"}>
                    {subscriptionLabel[c.subscriptionStatus]}
                  </StatusBadge>
                  <button className="sw-btn sw-btn--secondary" style={{ height: 26, fontSize: 11, padding: "0 10px" }}
                    disabled={mutationsDisabled}
                    onClick={() => { setForm({ name: c.name, relation: c.relation, phone: c.phone, wechatId: c.wechatId ?? "" }); setEditId(c.id); }}
                    type="button">编辑</button>
                  <div style={{ position: "relative" }}>
                    <button className="sw-btn sw-btn--danger-ghost" style={{ height: 26, fontSize: 11, padding: "0 10px" }}
                      disabled={mutationsDisabled}
                      onClick={() => setDeleteConfirmId(deleteConfirmId === c.id ? null : c.id)}
                      type="button">删除</button>
                    {deleteConfirmId === c.id && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", border: "1px solid #FECACA", padding: "10px 14px", zIndex: 100, whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: 13, color: "#B42318", marginBottom: 8 }}>确定删除「{c.name}」？</div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button className="sw-btn sw-btn--secondary" style={{ height: 26, fontSize: 11, padding: "0 10px" }} onClick={() => setDeleteConfirmId(null)} type="button">取消</button>
                          <button className="sw-btn sw-btn--danger" style={{ height: 26, fontSize: 11, padding: "0 10px" }} onClick={async () => {
                            const token = localStorage.getItem("gy_auth_token");
                            await authFetch(`/api/family-contacts/${c.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                            setDeleteConfirmId(null);
                            onUpdated();
                          }} type="button">确认删除</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        {obj.familyContacts.length === 0 && !showAdd && <p className="sw-text-muted">暂无家属联系人</p>}
      </div>

    </div>
  );
}

/* ── Create Modal ── */

export function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id?: string, name?: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("unknown");
  const [address, setAddress] = useState("");
  const [eligibility, setEligibility] = useState("government");
  const [projects, setProjects] = useState("");
  const [riskTags, setRiskTags] = useState("");
  const [careNotes, setCareNotes] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyRelation, setFamilyRelation] = useState("");
  const [familyPhone, setFamilyPhone] = useState("");
  const [familyWechat, setFamilyWechat] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setError("");
    if (!name.trim() || !address.trim()) { setError("姓名和地址为必填"); return; }
    if (!idNumber.trim()) { setError("身份证号为必填"); return; }
    if (!/^\d{17}[\dXx]$/.test(idNumber.trim())) { setError("身份证号格式不正确"); return; }
    setCreating(true);
    try {
      const result = await siteOperationsApi.createServiceObject({
        name: name.trim(), idNumber: idNumber.trim(), age: age ? Number(age) : undefined, address: address.trim(),
        eligibilityType: eligibility as ServiceEligibilityType,
        serviceProjects: projects.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
        riskTags: riskTags.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
        careNotes: careNotes.split("\n").map(s => s.trim()).filter(Boolean),
      });
      onCreated(result?.id, name.trim());
    } catch { setCreating(false); }
  };

  return (
    <DetailPageShell parentLabel="长者" parentPath="/elders" title="新增">
      <div className="dp-card">
        <div className="dp-card__body">
          <FormFields name={name} onNameChange={setName} phone={phone} onPhoneChange={setPhone} idNumber={idNumber} onIdNumberChange={setIdNumber} age={age} onAgeChange={setAge} gender={gender} onGenderChange={setGender}
            address={address} onAddressChange={setAddress} eligibility={eligibility} onEligibilityChange={setEligibility}
            projects={projects} onProjectsChange={setProjects}
            riskTags={riskTags} onRiskTagsChange={setRiskTags} careNotes={careNotes} onCareNotesChange={setCareNotes}
            familyName={familyName} onFamilyNameChange={setFamilyName} familyRelation={familyRelation} onFamilyRelationChange={setFamilyRelation}
            familyPhone={familyPhone} onFamilyPhoneChange={setFamilyPhone}
            familyWechat={familyWechat} onFamilyWechatChange={setFamilyWechat} />
          {error && <div style={{ margin: "16px 0 0", padding: 10, background: "#FEE2E2", color: "#B42318", borderRadius: 8, fontSize: 13 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button className="sw-btn sw-btn--primary" disabled={creating || !name.trim() || !address.trim()} onClick={handleCreate} type="button">{creating ? "创建中..." : "创建"}</button>
          </div>
        </div>
      </div>
    </DetailPageShell>
  );
}

/* ── Form Fields (card-grouped layout) ── */

function FormFields({ name, onNameChange, phone, onPhoneChange, idNumber, onIdNumberChange, age, onAgeChange, gender, onGenderChange, address, onAddressChange,
  eligibility, onEligibilityChange, projects, onProjectsChange,
  riskTags, onRiskTagsChange, careNotes, onCareNotesChange,
  familyName, onFamilyNameChange, familyRelation, onFamilyRelationChange, familyPhone, onFamilyPhoneChange,
  familyWechat, onFamilyWechatChange }: {
  name: string; onNameChange: (v: string) => void; phone: string; onPhoneChange: (v: string) => void;
  idNumber: string; onIdNumberChange: (v: string) => void;
  age: string; onAgeChange: (v: string) => void;
  gender: string; onGenderChange: (v: string) => void; address: string; onAddressChange: (v: string) => void;
  eligibility: string; onEligibilityChange: (v: string) => void; projects: string; onProjectsChange: (v: string) => void;
  riskTags: string; onRiskTagsChange: (v: string) => void; careNotes: string; onCareNotesChange: (v: string) => void;
  familyName: string; onFamilyNameChange: (v: string) => void; familyRelation: string; onFamilyRelationChange: (v: string) => void;
  familyPhone: string; onFamilyPhoneChange: (v: string) => void;
  familyWechat: string; onFamilyWechatChange: (v: string) => void;
}) {
  return (
    <div className="so-form-cards">
      <div className="so-form-card">
        <h4 className="so-form-card__title">基本信息</h4>
        <div className="so-form-card__row">
          <label className="sw-field"><span>姓名 *</span><input onChange={(e) => onNameChange(e.target.value)} placeholder="输入姓名" value={name} /></label>
          <label className="sw-field"><span>电话</span><input onChange={(e) => onPhoneChange(e.target.value)} placeholder="输入手机号" value={phone} /></label>
        </div>
        <div className="so-form-card__row">
          <label className="sw-field"><span>身份证号 *</span><input onChange={(e) => onIdNumberChange(e.target.value)} placeholder="18位身份证号码" value={idNumber} maxLength={18} /></label>
          <label className="sw-field"><span>年龄</span><input onChange={(e) => onAgeChange(e.target.value)} placeholder="如 82" type="number" value={age} /></label>
          <label className="sw-field"><span>性别</span><select onChange={(e) => onGenderChange(e.target.value)} value={gender}><option value="female">女</option><option value="male">男</option><option value="unknown">未知</option></select></label>
        </div>
        <label className="sw-field"><span>地址 *</span><input onChange={(e) => onAddressChange(e.target.value)} placeholder="输入地址" value={address} /></label>
      </div>

      <div className="so-form-card">
        <h4 className="so-form-card__title">服务配置</h4>
        <div className="so-form-card__row">
          <label className="sw-field"><span>服务资格</span>
            <select onChange={(e) => onEligibilityChange(e.target.value)} value={eligibility}>
              <option value="insurance">养护险</option><option value="government">政府购买</option>
              <option value="institution">机构服务</option><option value="self_paid">自费</option>
            </select>
          </label>
        </div>
        <label className="sw-field"><span>服务套餐</span><input onChange={(e) => onProjectsChange(e.target.value)} placeholder="如：长护险" value={projects || "长护险"} /></label>
      </div>

      <div className="so-form-card">
        <h4 className="so-form-card__title">照护信息</h4>
        <label className="sw-field"><span>风险标签</span><input onChange={(e) => onRiskTagsChange(e.target.value)} placeholder="用顿号分隔，如：独居、跌倒风险" value={riskTags} /></label>
        <label className="sw-field"><span>照护备注</span><textarea className="sw-field__textarea" onChange={(e) => onCareNotesChange(e.target.value)} placeholder="每行一条，如：午餐后需确认服药" rows={3} value={careNotes} /></label>
      </div>

      <div className="so-form-card">
        <h4 className="so-form-card__title">家属联系人</h4>
        <div className="so-form-card__row">
          <label className="sw-field"><span>家属姓名</span><input onChange={(e) => onFamilyNameChange(e.target.value)} placeholder="如：陈女士" value={familyName} /></label>
          <label className="sw-field"><span>关系</span><input onChange={(e) => onFamilyRelationChange(e.target.value)} placeholder="如：女儿" value={familyRelation} /></label>
        </div>
        <div className="so-form-card__row">
          <label className="sw-field"><span>家属电话</span><input onChange={(e) => onFamilyPhoneChange(e.target.value)} placeholder="输入家属手机号" value={familyPhone} /></label>
          <label className="sw-field"><span>微信号</span><input onChange={(e) => onFamilyWechatChange(e.target.value)} placeholder="输入微信号" value={familyWechat} /></label>
        </div>
      </div>
    </div>
  );
}

/* ── Schedule Item Editor ── */

/* ── History Records ── */

function HistoryRecords({ serviceObjectName, serviceProjects, onViewRecord }: {
  serviceObjectName: string; serviceProjects: string[]; onViewRecord: (r: ServiceRecord) => void;
}) {
  const mockHistory: ServiceRecord[] = [
    {
      id: "hist-001", serviceDate: "2026-05-12", startTime: "09:31", endTime: "10:22", durationMinutes: 51,
      socialWorkerName: "王丽", socialWorkerId: "worker-001", serviceObjectName, serviceObjectId: "obj",
      serviceProject: serviceProjects[0] ?? "助餐", badgeId: "badge-021", assignmentConfidence: 0.92,
      reviewStatus: "confirmed", exportStatus: "exported", familyContactIds: [],
      locationEvidence: { startPoint: { latitude: 31.292, longitude: 121.515 }, addressMatched: true },
      serviceExceptions: [], exceptionTags: [], missingFields: [], audioAssetId: "audio-001", transcriptId: "transcript-001",
      structuredSummary: "完成服务，长者状态稳定。", exportHistory: [{ id: "e1", exportedAt: "2026-05-13T09:00:00+08:00", operatorName: "管理员", fileVersion: "v1", filterSummary: "常规导出" }],
      serviceItems: [
        { id: "h1-1", seq: 1, category: "process" as const, title: "入门自我介绍", status: "completed" as const, transcript: "您好，我是王丽。", audioDurationSeconds: 8 },
        { id: "h1-2", seq: 2, category: "process" as const, title: "服务结束总结", status: "completed" as const, audioDurationSeconds: 10 },
        { id: "h1-3", seq: 3, category: "process" as const, title: "服务期间行为规范", status: "completed" as const, audioDurationSeconds: 50 },
        ...Array.from({ length: 12 }, (_, i) => ({ id: `h1-b${i + 1}`, seq: i + 1, category: "business" as const, title: `服务步骤 ${i + 1}`, status: "completed" as const, audioDurationSeconds: 10 + i * 2 })),
      ],
    },
    {
      id: "hist-002", serviceDate: "2026-05-10", startTime: "09:00", endTime: "10:05", durationMinutes: 65,
      socialWorkerName: "张敏", socialWorkerId: "worker-002", serviceObjectName, serviceObjectId: "obj",
      serviceProject: serviceProjects[0] ?? "助餐", badgeId: "badge-031", assignmentConfidence: 0.88,
      reviewStatus: "confirmed", exportStatus: "exportable", familyContactIds: [],
      locationEvidence: { startPoint: { latitude: 31.292, longitude: 121.515 }, addressMatched: true },
      serviceExceptions: [{ id: "hex1", type: "late_arrival" as const, title: "迟到", description: "晚到10分钟", status: "resolved" as const, resolvedAt: "2026-05-10T11:00:00+08:00" }],
      exceptionTags: ["迟到"], missingFields: [], audioAssetId: "audio-001", transcriptId: "transcript-001",
      structuredSummary: "完成服务，有轻微迟到。", exportHistory: [],
      serviceItems: [
        { id: "h2-1", seq: 1, category: "process" as const, title: "入门自我介绍", status: "completed" as const, transcript: "您好，我是张敏。", audioDurationSeconds: 6 },
        { id: "h2-2", seq: 2, category: "process" as const, title: "服务结束总结", status: "completed" as const, audioDurationSeconds: 8 },
        { id: "h2-3", seq: 3, category: "process" as const, title: "服务期间行为规范", status: "completed" as const, audioDurationSeconds: 65 },
        ...Array.from({ length: 12 }, (_, i) => ({ id: `h2-b${i + 1}`, seq: i + 1, category: "business" as const, title: `服务步骤 ${i + 1}`, status: i === 5 ? "abnormal" as const : "completed" as const, audioDurationSeconds: 8 + i * 2, ...(i === 5 ? { abnormalReason: "服务步骤执行不完整", transcript: "这个步骤没有完全按要求完成。" } : {}) })),
      ],
    },
  ];

  return (
    <div className="so-history">
      {mockHistory.map(rec => {
        const bizItems = rec.serviceItems?.filter(i => i.category === "business") ?? [];
        const bizDone = bizItems.filter(i => i.status === "completed").length;
        const hasAbnormal = (rec.serviceItems ?? []).some(i => i.status === "abnormal");
        return (
          <div className="so-history__row" key={rec.id}>
            <div className="so-history__info">
              <strong>{rec.serviceProject} · {rec.serviceDate}</strong>
              <span>{rec.startTime}-{rec.endTime} · {rec.socialWorkerName} · {bizDone}/{bizItems.length}项</span>
            </div>
            <div className="so-history__right">
              {hasAbnormal && <StatusBadge tone="warning" style={{ fontSize: 10, padding: "2px 6px" }}>有异常</StatusBadge>}
              <StatusBadge tone={rec.reviewStatus === "confirmed" ? "success" : "warning"} style={{ fontSize: 10, padding: "2px 6px" }}>
                {rec.reviewStatus === "confirmed" ? "已确认" : "待复核"}
              </StatusBadge>
              <button className="so-history__view-btn" onClick={() => onViewRecord(rec)} type="button">
                <FileText size={12} /> 查看记录
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddressMap({ address }: { address: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mapRef.current) return;
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    let map: any;
    const defaultCenter: [number, number] = [30.27, 120.13];
    setTimeout(() => {
      import("leaflet").then(async (L) => {
        if (!mapRef.current) return;
        map = L.map(mapRef.current, { zoomControl: true }).setView(defaultCenter, 14);
        L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
          subdomains: ["1", "2", "3", "4"], attribution: "&copy; 高德地图"
        }).addTo(map);
        const icon = L.divIcon({
          html: '<div style="background:#0052CC;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3)">📍</div>',
          className: "", iconSize: [28, 28], iconAnchor: [14, 28],
        });
        try {
          const res = await fetch(`https://restapi.amap.com/v3/geocode/geo?key=d8d4c4762c1646338864da06e3e2e574&address=${encodeURIComponent(address)}`);
          const data = await res.json();
          if (data.geocodes?.[0]?.location) {
            const [lng, lat] = data.geocodes[0].location.split(",").map(Number);
            map.setView([lat, lng], 16);
            L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<b>${address}</b>`).openPopup();
            return;
          }
        } catch {}
        L.marker(defaultCenter, { icon }).addTo(map).bindPopup(`<b>${address}</b>`).openPopup();
      });
    }, 100);
    return () => { if (map) map.remove(); };
  }, [address]);
  return <div ref={mapRef} className="so-map-popup__frame" />;
}

function PlanEditModal({ plan, workerOptions, allServiceSops, onSave, onClose }: {
  plan: any;
  workerOptions: Array<{ id: string; name: string }>;
  allServiceSops: Array<{ id: string; name: string }>;
  onSave: (updates: Record<string, any>) => void;
  onClose: () => void;
}) {
  const dayLabels: Record<string, string> = { "0": "日", "1": "一", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六" };
  const parseDays = (rule: string) => {
    const m = rule.match(/^WEEKLY:(.+)$/);
    return m ? m[1].split(",") : [];
  };
  const [desc, setDesc] = useState(plan.description ?? "");
  const [days, setDays] = useState<string[]>(parseDays(plan.cadenceRule));
  const [startTime, setStartTime] = useState((plan.preferredTimeWindow as any)?.start ?? "09:00");
  const [endTime, setEndTime] = useState((plan.preferredTimeWindow as any)?.end ?? "11:00");
  const [workerId, setWorkerId] = useState(plan.primarySocialWorkerId ?? "");
  const [sopIds, setSopIds] = useState<string[]>((plan.sopLinks ?? []).map((s: any) => s.sopId));
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: string) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());

  const cadenceRule = `WEEKLY:${days.join(",")}`;
  const cadenceLabel = days.length === 5 && ["1","2","3","4","5"].every(d => days.includes(d))
    ? "每周一至周五"
    : `每周${days.map(d => dayLabels[d]).join("、")}`;

  const ruleChanged = cadenceRule !== plan.cadenceRule;
  const timeChanged = startTime !== ((plan.preferredTimeWindow as any)?.start ?? "") || endTime !== ((plan.preferredTimeWindow as any)?.end ?? "");
  const needsRegenerate = ruleChanged || timeChanged;

  const handleSave = async () => {
    setSaving(true);
    const worker = workerOptions.find(w => w.id === workerId);
    const updates: Record<string, any> = {
      description: desc || null,
      primarySocialWorkerId: workerId || null,
      primarySocialWorkerName: worker?.name ?? null,
      sopIds,
    };
    if (ruleChanged) {
      updates.cadenceRule = cadenceRule;
      updates.cadenceLabel = cadenceLabel;
    }
    if (timeChanged) {
      updates.preferredTimeWindow = { start: startTime, end: endTime };
    }
    await onSave(updates);
    setSaving(false);
  };

  return (
    <div className="so-plan-edit__overlay" onClick={onClose}>
      <div className="so-plan-edit__modal" role="dialog" onClick={e => e.stopPropagation()}>
        <div className="so-plan-edit__header">
          <div className="so-plan-edit__title">编辑服务计划</div>
          <button className="so-plan-edit__close" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="so-plan-edit__body">
          <label className="sw-field"><span>服务描述</span>
            <textarea className="so-plan-edit__textarea" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
          </label>

          <div className="so-plan-edit__field-group">
            <span className="so-plan-edit__label">服务频率</span>
            <div className="so-plan-edit__day-chips">
              {["1","2","3","4","5","6","0"].map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className="so-plan-edit__day-chip"
                  data-selected={days.includes(d)}>
                  周{dayLabels[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="so-plan-edit__time-row">
            <label className="sw-field so-plan-edit__time-field"><span>开始时间</span>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </label>
            <label className="sw-field so-plan-edit__time-field"><span>结束时间</span>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </label>
          </div>

          <label className="sw-field"><span>服务人员</span>
            <select value={workerId} onChange={e => setWorkerId(e.target.value)}>
              <option value="">待分配</option>
              {workerOptions.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>

          <div className="so-plan-edit__field-group">
            <span className="so-plan-edit__label">服务项目</span>
            <div className="so-plan-edit__sop-list">
              {allServiceSops.filter(s => sopIds.includes(s.id)).map(s => (
                <label key={s.id} className="so-plan-edit__sop-item">
                  <input type="checkbox" checked onChange={() => setSopIds(prev => prev.filter(id => id !== s.id))} />
                  {s.name}
                </label>
              ))}
            </div>
            {allServiceSops.filter(s => !sopIds.includes(s.id)).length > 0 && (
              <select className="so-plan-edit__sop-add" value="" onChange={e => { if (e.target.value) setSopIds(prev => [...prev, e.target.value]); }}>
                <option value="">+ 添加服务项目</option>
                {allServiceSops.filter(s => !sopIds.includes(s.id)).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {needsRegenerate && (
            <div className="so-plan-edit__warning">
              频率或时间已修改，保存后将取消现有排期并重新生成。
            </div>
          )}
        </div>
        <div className="so-plan-edit__footer">
          <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">取消</button>
          <button className="sw-btn sw-btn--primary" onClick={handleSave} disabled={saving || days.length === 0} type="button">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
