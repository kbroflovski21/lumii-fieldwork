import { useEscClose } from "../../shared/hooks/useEscClose";
import { formatTime, formatSyncTime } from "../../shared/utils/dateTimeUtils";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { AvatarInitial } from "../../shared/components/AvatarInitial";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Search, X, Plus, UserRound, Edit3, AlertTriangle, CalendarPlus, Sparkles, Send, Clock, FileText, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { ListToolbar } from "../../shared/components/ListToolbar";
import { OperationalBanner } from "../../shared/components/OperationalBanner";
import { FilterDropdown } from "../../shared/components/FilterDropdown";
import { EmptyState } from "../../shared/components/EmptyState";
import { DetailPageShell } from "../../shared/DetailPageShell";
import type {
  ServiceObject,
  ServiceObjectState,
  ServiceEligibilityType,
  ServiceRecord,
  ServiceObjectsResponse,
  FamilyContact,
  AiScheduleResult,
  ServicePlan,
  Device,
} from "./contracts";
import { RecordDrawer } from "./RecordsArea";
import { statusText } from "./contracts";
import { siteOperationsApi, authFetch } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";
import { useSite } from "../../auth/SiteContext";
import { useSiteOpsData } from "../../layouts/SiteOperationsLayout";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSetDetailEntity } from "../../shared/DetailPageContext";

type DrawerMode =
  | { kind: "closed" }
  | { kind: "view"; object: ServiceObject }
  | { kind: "create" };

type EligibilityFilter = "" | ServiceEligibilityType;
type StateFilter = "" | "normal" | "risk" | "paused" | "pending";
type RiskFilter = "" | "has" | "none";

const eligibilityFilterOptions: Array<{ label: string; value: EligibilityFilter }> = [
  { label: "服务资格", value: "" },
  { label: "长护险", value: "insurance" },
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
  insurance: "长护险", government: "政府购买", institution: "机构服务", self_paid: "自费"
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
  const setDetailEntity = useSetDetailEntity();
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

  useEffect(() => {
    if (routeId && routeId !== "new" && drawer.kind === "view") {
      setDetailEntity({ entityType: "service_object", entityId: routeId, entityName: drawer.object.name });
    } else {
      setDetailEntity(null);
    }
    return () => setDetailEntity(null);
  }, [routeId, drawer, setDetailEntity]);

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
              <ListToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="搜索姓名或地址..."
                filters={<>
                  <FilterDropdown onChange={(v) => setEligibilityFilter(v as EligibilityFilter)} options={eligibilityFilterOptions} value={eligibilityFilter} />
                  <FilterDropdown onChange={(v) => setStateFilter(v as StateFilter)} options={stateFilterOptions} value={stateFilter} />
                  <FilterDropdown onChange={(v) => setRiskFilter(v as RiskFilter)} options={riskFilterOptions} value={riskFilter} />
                </>}
              />

              {operationalState ? <OperationalBanner state={operationalState} resourceLabel="长者" readOnlyHint="可查看数据，新增、编辑和归档操作已禁用。" /> : null}

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



function ObjectContent({ filtered, loading, error, isEmpty, isFilterEmpty, mutationsDisabled, onCreateClick, onRowClick, onNameClick, selectedId }: {
  filtered: ServiceObject[]; loading: boolean; error?: string; isEmpty: boolean; isFilterEmpty: boolean;
  mutationsDisabled: boolean; onCreateClick: () => void; onRowClick: (o: ServiceObject) => void;
  onNameClick: (o: ServiceObject) => void; selectedId: string | null;
}) {
  if (loading) return <EmptyState icon={UserRound} description="长者数据加载中..." />;
  if (error) return <EmptyState icon={X} description={error} isError />;
  if (isEmpty) return (
    <EmptyState
      icon={UserRound}
      title="暂无长者"
      description="点击新增创建第一条记录"
      action={<button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={onCreateClick} type="button"><Plus size={15} />新增长者</button>}
    />
  );
  if (isFilterEmpty) return <EmptyState icon={Search} description="没有匹配的长者" />;

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

type ViewTab = "overview" | "plans" | "schedule" | "history";

function ViewModal({ object: obj, mutationsDisabled, onClose, onUpdated }: {
  object: ServiceObject; mutationsDisabled: boolean; onClose: () => void; onUpdated: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
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

  // Fetch beacon device bound to this elder
  const [beaconDevice, setBeaconDevice] = useState<Device | null>(null);
  useEffect(() => {
    authFetch("/api/devices?deviceType=ble_beacon").then(r => r.json()).then(data => {
      const beacon = (data.devices ?? []).find((d: Device) => d.boundToType === "elder_home" && d.boundToId === obj.id);
      setBeaconDevice(beacon ?? null);
    }).catch(() => {});
  }, [obj.id]);

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

  const tabs: Array<{ id: ViewTab; label: string; count?: number }> = [
    { id: "overview", label: "档案概览" },
    { id: "plans", label: "服务计划", count: savedPlans.length },
    { id: "schedule", label: "服务排班", count: savedSchedules.length },
    { id: "history", label: "服务历史" },
  ];

  const openScheduleTab = () => {
    setActiveTab("schedule");
  };

  const headerActions = (
    <>
      <button className="sw-btn sw-btn--primary" style={{ height: 32, fontSize: 12 }} disabled={mutationsDisabled} onClick={openScheduleTab} type="button">
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
                <div className="dp-field"><dt>服务资格</dt><dd>{editingBasic ? <select value={editEligibility} onChange={e => setEditEligibility(e.target.value)}><option value="insurance">长护险</option><option value="government">政府购买</option><option value="institution">机构服务</option><option value="self_paid">自费</option></select> : <span className="sw-tag">{eligibilityLabel[obj.eligibilityType]}</span>}</dd></div>
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
                <h4 className="dp-section__title">健康档案</h4>
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

            {/* 信标绑定信息 */}
            <div className="dp-section">
              <div className="dp-section__head">
                <h4 className="dp-section__title">蓝牙信标</h4>
              </div>
              {beaconDevice ? (
                <dl className="dp-fields">
                  <div className="dp-field"><dt>信标编码</dt><dd><span className="badges-code-tag">{beaconDevice.deviceCode}</span></dd></div>
                  <div className="dp-field"><dt>状态</dt><dd>
                    <StatusBadge tone={beaconDevice.status === "in_use" ? "success" : beaconDevice.status === "offline" ? "warning" : "muted"}>
                      {statusText[beaconDevice.status] ?? beaconDevice.status}
                    </StatusBadge>
                  </dd></div>
                  <div className="dp-field"><dt>最后同步</dt><dd>{beaconDevice.lastSyncAt ? formatSyncTime(beaconDevice.lastSyncAt) : "--"}</dd></div>
                  <div className="dp-field"><dt>安装时间</dt><dd>{beaconDevice.activatedAt ? formatSyncTime(beaconDevice.activatedAt) : "--"}</dd></div>
                </dl>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <p className="sw-text-muted" style={{ margin: 0 }}>未安装信标</p>
                  <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} disabled={mutationsDisabled} type="button">绑定信标</button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "plans" && (
          <div className="dp-section">
            <ServicePlanTab obj={obj} mutationsDisabled={mutationsDisabled} />
          </div>
        )}

        {activeTab === "history" && (
          <div className="dp-section">
            <HistoryRecords serviceObjectName={obj.name} serviceProjects={obj.serviceProjects} onViewRecord={setViewingRecord} />
          </div>
        )}

        {activeTab === "schedule" && (
          <ElderScheduleCalendar
            savedSchedules={savedSchedules}
            obj={obj}
            workerOptions={workerOptions}
            allServiceSops={allServiceSops}
            selectedSopIds={selectedSopIds}
            setSelectedSopIds={setSelectedSopIds}
            planWorkerId={planWorkerId}
            setPlanWorkerId={setPlanWorkerId}
            aiInput={aiInput}
            setAiInput={setAiInput}
            generating={generating}
            aiResult={aiResult}
            showScheduleForm={showScheduleForm}
            setShowScheduleForm={setShowScheduleForm}
            handleGenerate={handleGenerate}
            handleCreatePlan={handleCreatePlan}
            setAiResult={setAiResult}
            mutationsDisabled={mutationsDisabled}
          />
        )}
        </div>
      </div>
    </DetailPageShell>
  );
}

/* ── Hangzhou 41-item catalog (static fallback) ── */

const HZ_CATALOG_ITEMS: Array<{
  seq: number; name: string; category: string; referenceMinutes: number; frequency: string; qualification: string;
}> = [
  { seq: 1, name: "整理床单位", category: "清洁卫生类", referenceMinutes: 5, frequency: "1-2次/日", qualification: "护理员" },
  { seq: 2, name: "面部清洁", category: "清洁卫生类", referenceMinutes: 10, frequency: "1-2次/日", qualification: "护理员" },
  { seq: 3, name: "口腔清洁", category: "清洁卫生类", referenceMinutes: 10, frequency: "1-2次/日", qualification: "护理员" },
  { seq: 4, name: "头发清洁及梳理", category: "清洁卫生类", referenceMinutes: 20, frequency: "1次/周", qualification: "护理员" },
  { seq: 5, name: "指/趾甲护理", category: "清洁卫生类", referenceMinutes: 10, frequency: "1-2次/周", qualification: "护理员" },
  { seq: 6, name: "温水擦浴", category: "清洁卫生类", referenceMinutes: 30, frequency: "1-2次/周", qualification: "护理员" },
  { seq: 7, name: "沐浴", category: "清洁卫生类", referenceMinutes: 40, frequency: "1次/周", qualification: "护理员" },
  { seq: 8, name: "协助更衣", category: "清洁卫生类", referenceMinutes: 10, frequency: "1-2次/日", qualification: "护理员" },
  { seq: 9, name: "会阴护理", category: "清洁卫生类", referenceMinutes: 10, frequency: "1-2次/日", qualification: "护理员" },
  { seq: 10, name: "足部清洁", category: "清洁卫生类", referenceMinutes: 15, frequency: "1-2次/周", qualification: "护理员" },
  { seq: 11, name: "剃须", category: "清洁卫生类", referenceMinutes: 10, frequency: "必要时", qualification: "护理员" },
  { seq: 12, name: "手部清洁", category: "清洁卫生类", referenceMinutes: 5, frequency: "必要时", qualification: "护理员" },
  { seq: 13, name: "眼部清洁", category: "清洁卫生类", referenceMinutes: 5, frequency: "必要时", qualification: "护理员" },
  { seq: 14, name: "耳部清洁", category: "清洁卫生类", referenceMinutes: 5, frequency: "必要时", qualification: "护理员" },
  { seq: 15, name: "鼻部清洁", category: "清洁卫生类", referenceMinutes: 5, frequency: "必要时", qualification: "护理员" },
  { seq: 16, name: "协助进食/水", category: "营养摄取类", referenceMinutes: 20, frequency: "必要时", qualification: "护理员" },
  { seq: 17, name: "鼻饲", category: "营养摄取类", referenceMinutes: 20, frequency: "必要时", qualification: "护士" },
  { seq: 18, name: "营养指导", category: "营养摄取类", referenceMinutes: 15, frequency: "1次/周", qualification: "护士" },
  { seq: 19, name: "协助如厕", category: "排泄护理类", referenceMinutes: 10, frequency: "必要时", qualification: "护理员" },
  { seq: 20, name: "失禁护理", category: "排泄护理类", referenceMinutes: 15, frequency: "必要时", qualification: "护理员" },
  { seq: 21, name: "人工取便术", category: "排泄护理类", referenceMinutes: 20, frequency: "必要时", qualification: "护士" },
  { seq: 22, name: "留置尿管护理", category: "排泄护理类", referenceMinutes: 15, frequency: "必要时", qualification: "护士" },
  { seq: 23, name: "人工膀胱护理", category: "排泄护理类", referenceMinutes: 15, frequency: "必要时", qualification: "护士" },
  { seq: 24, name: "造口护理", category: "排泄护理类", referenceMinutes: 20, frequency: "必要时", qualification: "护士" },
  { seq: 25, name: "灌肠", category: "排泄护理类", referenceMinutes: 20, frequency: "必要时", qualification: "护士" },
  { seq: 26, name: "尿管更换", category: "排泄护理类", referenceMinutes: 15, frequency: "必要时", qualification: "护士" },
  { seq: 27, name: "协助翻身", category: "移动舒适和安全护理类", referenceMinutes: 5, frequency: "必要时", qualification: "护理员" },
  { seq: 28, name: "协助移动", category: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "必要时", qualification: "护理员" },
  { seq: 29, name: "皮肤外用药涂擦", category: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "必要时", qualification: "护理员" },
  { seq: 30, name: "压疮预防护理", category: "移动舒适和安全护理类", referenceMinutes: 15, frequency: "1-2次/日", qualification: "护理员" },
  { seq: 31, name: "压疮伤口换药", category: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "必要时", qualification: "护士" },
  { seq: 32, name: "安全护理", category: "移动舒适和安全护理类", referenceMinutes: 10, frequency: "必要时", qualification: "护理员" },
  { seq: 33, name: "翻身叩背排痰", category: "移动舒适和安全护理类", referenceMinutes: 15, frequency: "必要时", qualification: "护理员" },
  { seq: 34, name: "吸痰护理", category: "移动舒适和安全护理类", referenceMinutes: 15, frequency: "必要时", qualification: "护士" },
  { seq: 35, name: "关节活动练习", category: "移动舒适和安全护理类", referenceMinutes: 20, frequency: "1次/日", qualification: "护理员" },
  { seq: 36, name: "温热疗法", category: "移动舒适和安全护理类", referenceMinutes: 15, frequency: "必要时", qualification: "护理员" },
  { seq: 37, name: "冷疗法", category: "移动舒适和安全护理类", referenceMinutes: 15, frequency: "必要时", qualification: "护理员" },
  { seq: 38, name: "生命体征监测", category: "生命体征观察与护理类", referenceMinutes: 10, frequency: "1次/日", qualification: "护士" },
  { seq: 39, name: "血糖监测", category: "生命体征观察与护理类", referenceMinutes: 10, frequency: "必要时", qualification: "护士" },
  { seq: 40, name: "口服给药", category: "用药指导类", referenceMinutes: 10, frequency: "必要时", qualification: "护士" },
  { seq: 41, name: "药物管理指导", category: "用药指导类", referenceMinutes: 15, frequency: "1次/周", qualification: "护士" },
];

function ServicePlanTab({ obj, mutationsDisabled }: { obj: ServiceObject; mutationsDisabled: boolean }) {
  const [catalogItems, setCatalogItems] = useState<typeof HZ_CATALOG_ITEMS>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authFetch("/api/standard-catalogs/hz-2024/items")
      .then(r => r.json())
      .then(data => {
        if (data.items && data.items.length > 0) {
          setCatalogItems(data.items.map((it: any) => ({
            seq: it.seq ?? it.itemNumber ?? 0,
            name: it.name ?? it.itemName ?? "",
            category: it.categoryName ?? it.category ?? "",
            referenceMinutes: it.referenceMinutes ?? 0,
            frequency: it.frequency ?? "",
            qualification: (it.requiredQualifications ?? []).join("、") || (it.qualification ?? "护理员"),
          })));
        } else {
          setCatalogItems(HZ_CATALOG_ITEMS);
        }
        setLoading(false);
      })
      .catch(() => {
        setCatalogItems(HZ_CATALOG_ITEMS);
        setLoading(false);
      });
  }, []);

  // Match catalog items to this elder's serviceProjects
  const elderProjectNames = useMemo(() => new Set((obj.serviceProjects ?? []).map(p => p.trim())), [obj.serviceProjects]);

  const planItems = useMemo(() => {
    if (catalogItems.length === 0) return [];
    // Match by name
    const matched = catalogItems.filter(item => elderProjectNames.has(item.name));
    if (matched.length >= 5) return matched;
    // If fewer than 5 matches, supplement with common care items
    const defaultNames = ["整理床单位", "面部清洁", "协助进食/水", "协助如厕", "失禁护理", "翻身叩背排痰", "关节活动练习", "生命体征监测"];
    const matchedNames = new Set(matched.map(m => m.name));
    const supplemented = [...matched];
    for (const dn of defaultNames) {
      if (supplemented.length >= 8) break;
      if (matchedNames.has(dn)) continue;
      const found = catalogItems.find(c => c.name === dn);
      if (found) { supplemented.push(found); matchedNames.add(dn); }
    }
    // If still not enough, fill from catalog
    for (const item of catalogItems) {
      if (supplemented.length >= 8) break;
      if (!matchedNames.has(item.name)) { supplemented.push(item); matchedNames.add(item.name); }
    }
    return supplemented.sort((a, b) => a.seq - b.seq);
  }, [catalogItems, elderProjectNames]);

  return (
    <div className="so-plan-official">
      <div className="so-plan-official__header">
        <h4>长期护理保险护理服务计划</h4>
        <StatusBadge tone="success">生效中</StatusBadge>
      </div>

      <div className="so-plan-official__info">
        <div className="so-plan-official__row"><dt>姓名</dt><dd>{obj.name}</dd></div>
        <div className="so-plan-official__row"><dt>性别</dt><dd>{obj.gender === "female" ? "女" : obj.gender === "male" ? "男" : "未知"}</dd></div>
        <div className="so-plan-official__row"><dt>身份证号</dt><dd>{obj.idNumber ?? "—"}</dd></div>
        <div className="so-plan-official__row"><dt>现住地址</dt><dd>{obj.address}</dd></div>
        <div className="so-plan-official__row"><dt>重度失能等级</dt><dd>重度二级</dd></div>
        <div className="so-plan-official__row"><dt>联系人</dt><dd>{obj.familyContacts?.[0]?.name ?? "—"}（{obj.familyContacts?.[0]?.relation ?? ""}）{obj.familyContacts?.[0]?.phone ?? ""}</dd></div>
        <div className="so-plan-official__row"><dt>定点长护服务机构</dt><dd>金色年华养老服务有限公司</dd></div>
        <div className="so-plan-official__row"><dt>月度额度</dt><dd>25小时</dd></div>
        <div className="so-plan-official__row"><dt>常用服务人员</dt><dd>{obj.servicePlanSummaries?.[0]?.primarySocialWorkerName ?? "待分配"}（建议，非硬约束）</dd></div>
      </div>

      <div className="so-plan-official__table">
        <h5>护理服务项目</h5>
        {loading ? (
          <p className="sw-text-muted">加载服务目录中...</p>
        ) : (
          <table className="so-plan-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>服务项目</th>
                <th>大类</th>
                <th>参考时长(分钟)</th>
                <th>服务频次</th>
                <th>资质要求</th>
              </tr>
            </thead>
            <tbody>
              {planItems.length > 0 ? planItems.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.seq}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.referenceMinutes}</td>
                  <td>{item.frequency}</td>
                  <td>{item.qualification}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#999" }}>暂无服务项目</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="so-plan-official__footer">
        <button className="sw-btn sw-btn--secondary" disabled={mutationsDisabled} type="button"><Edit3 size={12} /> 编辑服务计划</button>
      </div>
    </div>
  );
}

/* ── Elder Schedule Calendar (full day/week/month views + AI section) ── */

type CalendarView = "day" | "week" | "month";

function ElderScheduleCalendar({ savedSchedules, obj, workerOptions, allServiceSops, selectedSopIds, setSelectedSopIds, planWorkerId, setPlanWorkerId, aiInput, setAiInput, generating, aiResult, showScheduleForm, setShowScheduleForm, handleGenerate, handleCreatePlan, setAiResult, mutationsDisabled }: {
  savedSchedules: Array<{ id: string; serviceDate: string; serviceProject: string; status: string; timeWindow?: any; assignedSocialWorkerName?: string; assignedSocialWorkerId?: string; source?: string; servicePlanId?: string }>;
  obj: ServiceObject;
  workerOptions: Array<{ id: string; name: string }>;
  allServiceSops: Array<{ id: string; name: string }>;
  selectedSopIds: string[];
  setSelectedSopIds: (ids: string[]) => void;
  planWorkerId: string;
  setPlanWorkerId: (id: string) => void;
  aiInput: string;
  setAiInput: (v: string) => void;
  generating: boolean;
  aiResult: AiScheduleResult | null;
  showScheduleForm: boolean;
  setShowScheduleForm: (v: boolean) => void;
  handleGenerate: () => void;
  handleCreatePlan: () => void;
  setAiResult: (v: AiScheduleResult | null) => void;
  mutationsDisabled: boolean;
}) {
  const [calView, setCalView] = useState<CalendarView>("week");
  const [calDate, setCalDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [aiCollapsed, setAiCollapsed] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  // Navigation helpers
  const navigate = (dir: number) => {
    const d = new Date(calDate);
    if (calView === "day") d.setDate(d.getDate() + dir);
    else if (calView === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCalDate(d);
  };
  const goToday = () => setCalDate(new Date());

  // Week dates
  const weekDates = useMemo(() => {
    const dow = calDate.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(calDate);
      d.setDate(calDate.getDate() + mondayOffset + i);
      return d.toISOString().slice(0, 10);
    });
  }, [calDate]);

  // Month grid
  const monthGrid = useMemo(() => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Monday=0
    const days: Array<{ date: string; inMonth: boolean }> = [];
    // Pad from previous month
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d.toISOString().slice(0, 10), inMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d).toISOString().slice(0, 10), inMonth: true });
    }
    // Pad to complete last week
    while (days.length % 7 !== 0) {
      const nextD = new Date(year, month + 1, days.length - startPad - lastDay.getDate() + 1);
      days.push({ date: nextD.toISOString().slice(0, 10), inMonth: false });
    }
    return days;
  }, [calDate]);

  // Period label
  const periodLabel = useMemo(() => {
    if (calView === "day") return calDate.toISOString().slice(0, 10);
    if (calView === "week") return `${weekDates[0]} ~ ${weekDates[6]}`;
    return `${calDate.getFullYear()}年${calDate.getMonth() + 1}月`;
  }, [calView, calDate, weekDates]);

  // Filtered schedules for current view
  const schedulesForPeriod = useMemo(() => {
    if (calView === "day") {
      const ds = calDate.toISOString().slice(0, 10);
      return savedSchedules.filter(s => s.serviceDate === ds);
    }
    if (calView === "week") {
      const dateSet = new Set(weekDates);
      return savedSchedules.filter(s => dateSet.has(s.serviceDate));
    }
    // month
    const dateSet = new Set(monthGrid.map(d => d.date));
    return savedSchedules.filter(s => dateSet.has(s.serviceDate));
  }, [calView, calDate, weekDates, monthGrid, savedSchedules]);

  const schedulesForDay = (date: string) => schedulesForPeriod.filter(s => s.serviceDate === date);

  // Show toast helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  // AI generate handler
  const handleAiGenerate = () => {
    showToast("AI正在生成...");
    setTimeout(() => {
      handleGenerate();
    }, 1500);
  };

  const renderCard = (s: typeof savedSchedules[0]) => (
    <div className="so-elder-calendar__card" data-status={s.status} key={s.id}>
      <div className="so-elder-calendar__card-time">{s.timeWindow?.start ?? ""}-{s.timeWindow?.end ?? ""}</div>
      <div className="so-elder-calendar__card-worker">{s.assignedSocialWorkerName ?? "未分配"}</div>
      <div className="so-elder-calendar__card-project">{s.serviceProject}</div>
    </div>
  );

  return (
    <div className="dp-section">
      {/* Toast */}
      {toastMsg && (
        <div className="so-elder-calendar__toast">{toastMsg}</div>
      )}

      {/* Toolbar: view switcher + navigation */}
      <div className="so-elder-calendar__toolbar">
        <div className="so-elder-calendar__view-switcher">
          {(["day", "week", "month"] as CalendarView[]).map(v => (
            <button key={v} type="button" className="so-elder-calendar__view-btn" data-active={calView === v} onClick={() => setCalView(v)}>
              {v === "day" ? "日" : v === "week" ? "周" : "月"}
            </button>
          ))}
        </div>
        <div className="so-elder-calendar__nav">
          <button type="button" className="so-elder-calendar__nav-btn" onClick={() => navigate(-1)}><ChevronLeft size={16} /></button>
          <button type="button" className="so-elder-calendar__nav-today" onClick={goToday}>今天</button>
          <button type="button" className="so-elder-calendar__nav-btn" onClick={() => navigate(1)}><ChevronRight size={16} /></button>
          <span className="so-elder-calendar__period-label">{periodLabel}</span>
        </div>
      </div>

      {/* Week View */}
      {calView === "week" && (
        <div className="so-elder-calendar">
          <div className="so-elder-calendar__header">
            {dayNames.map((name, i) => (
              <div className={`so-elder-calendar__day-header${weekDates[i] === todayStr ? " so-elder-calendar__day-header--today" : ""}`} key={i}>
                <span className="so-elder-calendar__day-name">{name}</span>
                <span className="so-elder-calendar__day-date">{weekDates[i].slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="so-elder-calendar__body">
            {dayNames.map((_, i) => {
              const date = weekDates[i];
              const daySchedules = schedulesForDay(date);
              return (
                <div className={`so-elder-calendar__cell${date === todayStr ? " so-elder-calendar__cell--today" : ""}`} key={i}>
                  {daySchedules.length > 0 ? daySchedules.map(renderCard) : (
                    <span className="so-elder-calendar__empty">无排班</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {calView === "day" && (() => {
        const ds = calDate.toISOString().slice(0, 10);
        const daySchedules = schedulesForDay(ds);
        return (
          <div className="so-elder-calendar__day-view">
            <div className="so-elder-calendar__day-view-header">
              <span className="so-elder-calendar__day-view-date">{ds}{ds === todayStr ? "（今天）" : ""}</span>
              <span className="so-elder-calendar__day-view-count">{daySchedules.length} 项排班</span>
            </div>
            {daySchedules.length > 0 ? (
              <div className="so-elder-calendar__day-view-list">
                {daySchedules.map(s => (
                  <div className="so-elder-calendar__day-view-item" data-status={s.status} key={s.id}>
                    <div className="so-elder-calendar__day-view-time">
                      <Clock size={14} />
                      <span>{s.timeWindow?.start ?? "—"} - {s.timeWindow?.end ?? "—"}</span>
                    </div>
                    <div className="so-elder-calendar__day-view-detail">
                      <strong>{s.serviceProject}</strong>
                      <span>{s.assignedSocialWorkerName ?? "未分配"}</span>
                      <StatusBadge tone={s.status === "completed" ? "success" : s.status === "missed" ? "warning" : "muted"}>
                        {s.status === "completed" ? "已完成" : s.status === "missed" ? "缺失" : s.status === "in_progress" ? "进行中" : "已排班"}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sw-text-muted" style={{ textAlign: "center", padding: 24 }}>当日无排班</p>
            )}
          </div>
        );
      })()}

      {/* Month View */}
      {calView === "month" && (
        <>
          <div className="so-elder-calendar__month-view">
            <div className="so-elder-calendar__month-header">
              {["一", "二", "三", "四", "五", "六", "日"].map(d => (
                <div className="so-elder-calendar__month-header-cell" key={d}>周{d}</div>
              ))}
            </div>
            <div className="so-elder-calendar__month-grid">
              {monthGrid.map((cell, i) => {
                const count = schedulesForDay(cell.date).length;
                const isToday = cell.date === todayStr;
                const isSelected = cell.date === selectedDay;
                return (
                  <div
                    key={i}
                    className={`so-elder-calendar__month-cell${!cell.inMonth ? " so-elder-calendar__month-cell--out" : ""}${isToday ? " so-elder-calendar__month-cell--today" : ""}${isSelected ? " so-elder-calendar__month-cell--selected" : ""}`}
                    onClick={() => setSelectedDay(cell.date)}
                  >
                    <span className="so-elder-calendar__month-cell-day">{parseInt(cell.date.slice(8), 10)}</span>
                    {count > 0 && <span className="so-elder-calendar__month-cell-dot" title={`${count}项排班`} />}
                  </div>
                );
              })}
            </div>
          </div>
          {selectedDay && (() => {
            const daySchedules = schedulesForDay(selectedDay);
            return (
              <div className="so-elder-calendar__month-detail">
                <h5>{selectedDay} 排班详情</h5>
                {daySchedules.length > 0 ? (
                  <div className="so-elder-calendar__day-view-list">
                    {daySchedules.map(s => (
                      <div className="so-elder-calendar__day-view-item" data-status={s.status} key={s.id}>
                        <div className="so-elder-calendar__day-view-time">
                          <Clock size={14} />
                          <span>{s.timeWindow?.start ?? "—"} - {s.timeWindow?.end ?? "—"}</span>
                        </div>
                        <div className="so-elder-calendar__day-view-detail">
                          <strong>{s.serviceProject}</strong>
                          <span>{s.assignedSocialWorkerName ?? "未分配"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="sw-text-muted">该日无排班</p>
                )}
              </div>
            );
          })()}
        </>
      )}

      {savedSchedules.length === 0 && <p className="sw-text-muted" style={{ marginTop: 12 }}>暂无排班记录</p>}

      {/* AI 安排服务 collapsible section */}
      <div className="so-elder-calendar__ai-section">
        <button type="button" className="so-elder-calendar__ai-toggle" onClick={() => setAiCollapsed(!aiCollapsed)}>
          <Sparkles size={14} />
          <span>AI 安排服务</span>
          <ChevronRight size={14} className={`so-elder-calendar__ai-chevron${aiCollapsed ? "" : " so-elder-calendar__ai-chevron--open"}`} />
        </button>
        {!aiCollapsed && (
          <div className="so-elder-calendar__ai-body">
            <textarea
              className="so-elder-calendar__ai-input"
              placeholder="输入服务安排指令，如：每周一三五上午9点到11点上门"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              rows={3}
            />
            <div className="so-elder-calendar__ai-chips">
              {examplePrompts.map((p, i) => (
                <button key={i} type="button" className="so-elder-calendar__ai-chip" onClick={() => setAiInput(p)}>{p}</button>
              ))}
            </div>
            <div className="so-elder-calendar__ai-actions">
              <button className="sw-btn sw-btn--primary" style={{ fontSize: 13 }} disabled={generating || !aiInput.trim() || mutationsDisabled} onClick={handleAiGenerate} type="button">
                <Sparkles size={14} /> {generating ? "生成中..." : "AI 生成排班"}
              </button>
            </div>
            {aiResult && (
              <div className="so-elder-calendar__ai-result">
                <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>
                  AI 建议：{aiResult.plan?.cadenceLabel ?? "单次"} · {aiResult.plan?.timeWindow?.start ?? ""}-{aiResult.plan?.timeWindow?.end ?? ""} · {aiResult.plan?.serviceContent ?? ""}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="sw-btn sw-btn--primary" style={{ height: 28, fontSize: 12 }} disabled={mutationsDisabled} onClick={handleCreatePlan} type="button">确认创建</button>
                  <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => setAiResult(null)} type="button">取消</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
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
              <option value="insurance">长护险</option><option value="government">政府购买</option>
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
