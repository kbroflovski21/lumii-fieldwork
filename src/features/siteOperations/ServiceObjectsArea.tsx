import { useEscClose } from "./useEscClose";
import { useState, useCallback, useEffect } from "react";
import { Search, X, ChevronDown, Plus, UserRound, Shield, Edit3, AlertTriangle, CalendarPlus, Sparkles, Send, Clock, Ban, CalendarClock, FileText, Phone, MapPin } from "lucide-react";
import type {
  ServiceObject,
  ServiceObjectState,
  ServiceEligibilityType,
  ServiceRecord,
  WorkAreaOperationalState,
  ServiceObjectsResponse,
  FamilyContact
} from "./contracts";
import { RecordDrawer } from "./RecordsArea";
import { statusText } from "./contracts";
import { siteOperationsApi, authFetch } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";

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

type GeneratedScheduleItem = {
  id: string;
  dayLabel: string;
  date: string;
  timeLabel: string;
  project: string;
  status: "pending" | "confirmed" | "cancelled" | "postponed";
  isRecurring?: boolean;
  recurrenceLabel?: string;
  recurrenceDays?: number[];
};

const examplePrompts = [
  "每周一、三、五上午10点到12点助餐",
  "下周二下午2点陪诊",
  "每天上午9点到11点探访关爱",
  "本周五下午助浴",
];

function parseNaturalLanguageToSchedules(input: string): GeneratedScheduleItem[] {
  const today = new Date();
  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];

  let project = "助餐";
  if (input.includes("助浴")) project = "助浴";
  else if (input.includes("陪诊")) project = "陪诊";
  else if (input.includes("探访") || input.includes("关爱")) project = "探访关爱";
  else if (input.includes("助洁")) project = "助洁";

  let timeLabel = "上午 10:00-12:00";
  if (input.includes("下午")) timeLabel = "下午 14:00-16:00";
  else if (input.includes("9点") || input.includes("9:00")) timeLabel = "上午 9:00-11:00";
  else if (input.includes("10点") || input.includes("10:00")) timeLabel = "上午 10:00-12:00";
  else if (input.includes("2点") || input.includes("14")) timeLabel = "下午 14:00-16:00";

  const isRecurring = input.includes("每周") || input.includes("每天") || input.includes("每日");

  const targetDays: number[] = [];
  if (input.includes("每天") || input.includes("每日")) {
    targetDays.push(1, 2, 3, 4, 5);
  } else {
    if (input.includes("一")) targetDays.push(1);
    if (input.includes("二")) targetDays.push(2);
    if (input.includes("三")) targetDays.push(3);
    if (input.includes("四")) targetDays.push(4);
    if (input.includes("五")) targetDays.push(5);
    if (input.includes("六")) targetDays.push(6);
    if (input.includes("日") && !input.includes("每日")) targetDays.push(0);
  }

  if (targetDays.length === 0) {
    const dayMatch = input.match(/(一|二|三|四|五|六|日)/);
    if (dayMatch) {
      const map: Record<string, number> = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 0 };
      targetDays.push(map[dayMatch[1]] ?? 1);
    }
    if (targetDays.length === 0) targetDays.push((today.getDay() + 1) % 7 || 1);
  }

  if (isRecurring) {
    const recurrenceLabel = input.includes("每天") ? "每天" : `每周${targetDays.map(d => dayNames[d]).join("、")}`;
    const items: GeneratedScheduleItem[] = [];
    for (let week = 0; week < 4; week++) {
      for (const dayOfWeek of targetDays) {
        const d = new Date(today);
        const diff = (dayOfWeek - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + diff + week * 7);
        items.push({
          id: `gen-${Date.now()}-w${week}-d${dayOfWeek}`,
          dayLabel: `周${dayNames[dayOfWeek]}`,
          date: d.toISOString().slice(0, 10),
          timeLabel, project, status: "pending",
          isRecurring: true, recurrenceLabel, recurrenceDays: targetDays,
        });
      }
    }
    return items;
  }

  return targetDays.map(dayOfWeek => {
    const d = new Date(today);
    const diff = (dayOfWeek - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return {
      id: `gen-${Date.now()}-${dayOfWeek}`,
      dayLabel: `周${dayNames[dayOfWeek]}`,
      date: d.toISOString().slice(0, 10),
      timeLabel, project, status: "pending" as const,
    };
  });
}

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

function getInitials(name: string) { return name.slice(0, 1); }

function avatarColor(name: string) {
  const colors = [
    { bg: "#EEF2FF", text: "#4F46E5" }, { bg: "#F0FDF4", text: "#16A34A" },
    { bg: "#FFF7ED", text: "#EA580C" }, { bg: "#FDF2F8", text: "#DB2777" },
    { bg: "#ECFEFF", text: "#0891B2" }, { bg: "#F5F3FF", text: "#7C3AED" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

/* ==========================================
   Page-level components (unchanged)
   ========================================== */

export function ServiceObjectsArea({ resource, onMutate, initialSearch }: { resource: Resource<ServiceObjectsResponse>; onMutate?: () => void; initialSearch?: string }) {
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? "");
  useEffect(() => { if (initialSearch) setSearchQuery(initialSearch); }, [initialSearch]);
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityFilter>("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("");
  const operationalState = resource.status === "success" ? resource.data.operationalState : undefined;
  const mutationsDisabled = isMutationDisabled(operationalState);

  const objects = resource.status === "success" ? resource.data.serviceObjects : [];

  const openDrawer = useCallback((obj: ServiceObject) => { setDrawer({ kind: "view", object: obj }); }, []);

  const handleCreated = useCallback(() => {
    onMutate?.();
    setDrawer({ kind: "closed" });
  }, [onMutate]);

  const handleUpdated = useCallback(() => {
    onMutate?.();
    setDrawer({ kind: "closed" });
  }, [onMutate]);

  const handleObjectRefresh = useCallback(() => {
    onMutate?.();
  }, [onMutate]);

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
  useEscClose(useCallback(() => setDrawer({ kind: "closed" }), []));

  return (
    <>
      <section aria-label="服务对象" className="sw-page">
        <div className="sw-page__inner">
          <header className="sw-header">
            <div className="sw-header__title-group">
              <h2 className="sw-header__title">服务对象</h2>
              <p className="sw-header__desc">管理服务对象档案、服务计划、照护重点和家属订阅</p>
            </div>
            <button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={() => setDrawer({ kind: "create" })} type="button">
              <Plus size={15} /> 新增服务对象
            </button>
          </header>

          <div className="sw-table-container">
            <div className="sw-toolbar">
              <label className="sw-search">
                <Search size={16} />
                <input aria-label="搜索服务对象" onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索姓名或地址..." value={searchQuery} />
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
              onCreateClick={() => setDrawer({ kind: "create" })}
              onRowClick={openDrawer}
              onNameClick={openDrawer}
              selectedId={selectedId}
            />
          </div>
        </div>

        {drawer.kind !== "closed" ? (
          <>
            <button aria-label="关闭遮罩" className="sw-scrim" onClick={() => setDrawer({ kind: "closed" })} type="button" />
            <ObjectDrawer
              drawer={drawer}
              mutationsDisabled={mutationsDisabled}
              onClose={() => setDrawer({ kind: "closed" })}
              onCreated={handleCreated}
              onUpdated={handleObjectRefresh}
            />
          </>
        ) : null}
      </section>
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
  if (state.unavailableMessage) return <div className="sw-banner sw-banner--danger" role="status"><Shield size={16} /><div><strong>服务对象暂不可用</strong><span>{state.unavailableMessage}</span></div></div>;
  if (state.permission === "read_only") return <div className="sw-banner sw-banner--warning" role="status"><Shield size={16} /><div><strong>只读模式</strong><span>可查看数据，新增、编辑和归档操作已禁用。</span></div></div>;
  if (state.permission === "restricted") return <div className="sw-banner sw-banner--warning" role="status"><Shield size={16} /><div><strong>权限受限</strong><span>敏感信息已隐藏，部分操作不可用。</span></div></div>;
  return null;
}

function ObjectContent({ filtered, loading, error, isEmpty, isFilterEmpty, mutationsDisabled, onCreateClick, onRowClick, onNameClick, selectedId }: {
  filtered: ServiceObject[]; loading: boolean; error?: string; isEmpty: boolean; isFilterEmpty: boolean;
  mutationsDisabled: boolean; onCreateClick: () => void; onRowClick: (o: ServiceObject) => void;
  onNameClick: (o: ServiceObject) => void; selectedId: string | null;
}) {
  if (loading) return <div className="sw-empty"><div className="sw-empty__icon"><UserRound size={32} /></div><span>服务对象数据加载中...</span></div>;
  if (error) return <div className="sw-empty"><div className="sw-empty__icon sw-empty__icon--error"><X size={32} /></div><span>{error}</span></div>;
  if (isEmpty) return <div className="sw-empty"><div className="sw-empty__icon"><UserRound size={32} /></div><strong>暂无服务对象</strong><span>点击新增创建第一条记录</span><button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={onCreateClick} type="button"><Plus size={15} />新增服务对象</button></div>;
  if (isFilterEmpty) return <div className="sw-empty"><div className="sw-empty__icon"><Search size={32} /></div><span>没有匹配的服务对象</span></div>;

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
          const color = avatarColor(obj.name);
          const status = compositeStateTone(obj);
          const planLabel = obj.servicePlanSummaries.length > 0
            ? `${obj.servicePlanSummaries[0].serviceProject}·${obj.servicePlanSummaries[0].cadenceLabel}`
            : undefined;
          return (
            <div className="sw-table__row so-table__row" data-selected={selectedId === obj.id} key={obj.id}
              onClick={() => onRowClick(obj)} role="row">
              <div role="cell" className="sw-table__cell-name">
                <div className="sw-avatar" style={{ background: color.bg, color: color.text }}>{getInitials(obj.name)}</div>
                <div className="sw-name-group">
                  <button className="sw-name-link" onClick={(e) => { e.stopPropagation(); onNameClick(obj); }} type="button">{obj.name}</button>
                  <small>{obj.age ? `${obj.age}岁` : ""}{obj.gender === "female" ? " 女" : obj.gender === "male" ? " 男" : ""}</small>
                </div>
              </div>
              <div role="cell" className="so-cell-address">{obj.address}</div>
              <div role="cell"><span className="sw-tag">{eligibilityLabel[obj.eligibilityType] ?? obj.eligibilityType}</span></div>
              <div role="cell">{planLabel ?? <span className="sw-text-muted">—</span>}</div>
              <div role="cell">{subscriptionLabel[obj.familySubscriptionSummary] ?? <span className="sw-text-muted">—</span>}</div>
              <div role="cell"><span className="sw-status-badge" data-tone={status.tone}>{status.label}</span></div>
            </div>
          );
        })}
      </div>

      <div className="sw-mobile-list">
        {filtered.map((obj) => {
          const color = avatarColor(obj.name);
          const status = compositeStateTone(obj);
          const planLabel = obj.servicePlanSummaries.length > 0 ? `${obj.servicePlanSummaries[0].serviceProject}·${obj.servicePlanSummaries[0].cadenceLabel}` : undefined;
          return (
            <button className="sw-mobile-card" key={obj.id} onClick={() => onNameClick(obj)} type="button">
              <div className="sw-mobile-card__top">
                <div className="sw-avatar" style={{ background: color.bg, color: color.text }}>{getInitials(obj.name)}</div>
                <div className="sw-mobile-card__info"><strong>{obj.name}</strong><span>{obj.address}</span></div>
                <span className="sw-status-badge" data-tone={status.tone}>{status.label}</span>
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
  const [savedSchedules, setSavedSchedules] = useState<Array<{ id: string; serviceDate: string; serviceProject: string; status: string; timeWindow?: any; assignedSocialWorkerName?: string; source?: string }>>([]);
  const [savedPlans, setSavedPlans] = useState<Array<{ id: string; serviceProject: string; cadenceLabel: string; preferredTimeWindow: any; primarySocialWorkerName?: string; status: string }>>([]);

  useEffect(() => {
    authFetch("/api/service-schedule-occurrences")
      .then(r => r.json())
      .then(data => {
        const mine = (data.serviceSchedules ?? []).filter((s: any) => s.serviceObjectId === obj.id);
        setSavedSchedules(mine);
      })
      .catch(() => {});
    setSavedPlans(obj.servicePlanSummaries ?? []);
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
  const [editFrequency, setEditFrequency] = useState(obj.serviceFrequency ?? "");
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
  const [generatedItems, setGeneratedItems] = useState<GeneratedScheduleItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [localPlans, setLocalPlans] = useState<GeneratedScheduleItem[]>([]);
  const [planCreated, setPlanCreated] = useState(false);

  const color = avatarColor(obj.name);
  const status = compositeStateTone(obj);

  const handleGenerate = () => {
    if (!aiInput.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      const items = parseNaturalLanguageToSchedules(aiInput);
      setGeneratedItems(items);
      setGenerating(false);
    }, 600);
  };

  const handleItemAction = (itemId: string, action: "confirmed" | "cancelled" | "postponed") => {
    setGeneratedItems(prev => prev.map(item => item.id === itemId ? { ...item, status: action } : item));
    setEditingItemId(null);
  };

  const handleItemUpdate = (itemId: string, updates: Partial<GeneratedScheduleItem>) => {
    setGeneratedItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
    setEditingItemId(null);
  };

  const handleConfirmAll = () => {
    setGeneratedItems(prev => prev.map(item => item.status === "pending" ? { ...item, status: "confirmed" } : item));
  };

  const pendingCount = generatedItems.filter(i => i.status === "pending").length;
  const confirmedCount = generatedItems.filter(i => i.status === "confirmed").length;

  const persistSchedule = (item: GeneratedScheduleItem) => {
    const timeMatch = item.timeLabel.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
    const tw = { start: timeMatch?.[1] ?? "09:00", end: timeMatch?.[2] ?? "11:00", label: item.timeLabel };
    siteOperationsApi.createOneTimeServiceSchedule({
      serviceObjectId: obj.id,
      serviceProject: item.project,
      serviceDate: item.date,
      timeWindow: tw,
    }).catch(() => {});
  };

  const persistRecurringPlan = (items: GeneratedScheduleItem[]) => {
    if (planCreated || items.length === 0) return;
    const first = items[0];
    const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
    const cadenceLabel = first.recurrenceLabel ?? `每周${(first.recurrenceDays ?? []).map(d => dayNames[d]).join("、")}`;
    const timeMatch = first.timeLabel.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
    authFetch(`/api/service-objects/${obj.id}/service-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceProject: first.project,
        cadenceRule: `WEEKLY:${(first.recurrenceDays ?? []).join(",")}`,
        cadenceLabel,
        preferredTimeWindow: { start: timeMatch?.[1] ?? "09:00", end: timeMatch?.[2] ?? "11:00", label: first.timeLabel },
        startDate: first.date,
      }),
    }).catch(() => {});
    items.forEach(persistSchedule);
    setPlanCreated(true);
  };

  const handleItemActionWithSync = (itemId: string, action: "confirmed" | "cancelled" | "postponed") => {
    handleItemAction(itemId, action);
    if (action === "confirmed") {
      const item = generatedItems.find(i => i.id === itemId);
      if (item) {
        setLocalPlans(prev => [...prev, { ...item, status: "confirmed" }]);
        persistSchedule(item);
      }
    }
  };

  const handleConfirmAllWithSync = () => {
    const pendingItems = generatedItems.filter(i => i.status === "pending");
    handleConfirmAll();
    setLocalPlans(prev => [...prev, ...pendingItems.map(i => ({ ...i, status: "confirmed" as const }))]);
    const firstRecurring = pendingItems.find(i => i.isRecurring);
    if (firstRecurring) {
      persistRecurringPlan(pendingItems);
    } else {
      pendingItems.forEach(persistSchedule);
    }
    setTimeout(() => {
      authFetch("/api/service-schedule-occurrences").then(r => r.json()).then(data => {
        setSavedSchedules((data.serviceSchedules ?? []).filter((s: any) => s.serviceObjectId === obj.id));
      }).catch(() => {});
    }, 800);
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

  if (viewingRecord) {
    return <RecordDrawer record={viewingRecord} mutationsDisabled={true} onClose={() => setViewingRecord(null)} onUpdated={() => {}} />;
  }

  return (
    <div className="so-modal so-modal--view" role="dialog" aria-label="服务对象详情">
      {/* ── Summary Card ── */}
      <div className="so-modal__summary">
        <div className="so-modal__summary-main">
          <div className="sw-avatar sw-avatar--lg" style={{ background: color.bg, color: color.text }}>{getInitials(obj.name)}</div>
          <div className="so-modal__summary-name">
            <h3>{obj.name}</h3>
            <span className="so-modal__summary-demo">{obj.age ? `${obj.age}岁` : ""}{obj.gender === "female" ? " · 女" : obj.gender === "male" ? " · 男" : ""}</span>
            <span className="sw-status-badge sw-status-badge--inline" data-tone={status.tone}>{status.label}</span>
          </div>
          <div className="so-modal__summary-actions">
            <button aria-label="关闭" className="so-modal__close" onClick={onClose} type="button"><X size={18} /></button>
          </div>
        </div>

        <div className="so-modal__summary-contact">
          <span className="so-modal__meta-item"><Phone size={13} /> {obj.phone || "—"}</span>
          <span className="so-modal__meta-divider" />
          <span className="so-modal__meta-item"><MapPin size={13} /> {obj.address}</span>
        </div>

        <div className="so-modal__summary-tags">
          <span className="so-modal__chip">{eligibilityLabel[obj.eligibilityType]}</span>
          {obj.serviceFrequency ? <span className="so-modal__chip">{obj.serviceFrequency}</span> : null}
          {savedPlans.length > 0 ? <span className="so-modal__chip">{savedPlans.length}个计划</span> : null}
          {obj.serviceProjects.length > 0 ? <span className="so-modal__chip">{obj.serviceProjects.join(" / ")}</span> : null}
          {obj.riskTags.length > 0 ? (
            obj.riskTags.map(t => (
              <span className="so-modal__risk-chip" key={t}><AlertTriangle size={12} /> {t}</span>
            ))
          ) : null}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="so-modal__tabs" role="tablist">
        {tabs.map(tab => (
          <button
            className="so-modal__tab"
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
      <div className="so-modal__content">
        {activeTab === "overview" && (
          <>
            <div className="so-tab-section">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h4 className="so-tab-section-title" style={{ margin: 0, border: 0, paddingBottom: 0 }}>基础信息</h4>
                {!editingBasic && <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2, display: "flex" }} disabled={mutationsDisabled} onClick={() => { setEditName(obj.name); setEditPhone(obj.phone ?? ""); setEditIdNumber(obj.idNumber ?? ""); setEditAge(obj.age?.toString() ?? ""); setEditGender(obj.gender ?? "unknown"); setEditAddress(obj.address); setEditEligibility(obj.eligibilityType); setEditProjects(obj.serviceProjects.join("、")); setEditFrequency(obj.serviceFrequency ?? ""); setEditingBasic(true); }} type="button" title="编辑"><Edit3 size={14} /></button>}
              </div>
              <dl className="so-overview-grid" style={{ marginTop: 10 }}>
                <div className="so-overview-item"><dt>姓名</dt><dd>{editingBasic ? <input className="quality-user-modal__inline-input" value={editName} onChange={e => setEditName(e.target.value)} /> : obj.name}</dd></div>
                <div className="so-overview-item"><dt>电话</dt><dd>{editingBasic ? <input className="quality-user-modal__inline-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} /> : (obj.phone || "—")}</dd></div>
                <div className="so-overview-item"><dt>身份证号</dt><dd>{editingBasic ? <input className="quality-user-modal__inline-input" value={editIdNumber} onChange={e => setEditIdNumber(e.target.value)} maxLength={18} /> : (obj.idNumber || "—")}</dd></div>
                <div className="so-overview-item"><dt>年龄</dt><dd>{editingBasic ? <input className="quality-user-modal__inline-input" value={editAge} onChange={e => setEditAge(e.target.value)} type="number" style={{ width: 60 }} /> : (obj.age ? `${obj.age}岁` : "—")}</dd></div>
                <div className="so-overview-item"><dt>性别</dt><dd>{editingBasic ? <select className="quality-user-modal__inline-input" value={editGender} onChange={e => setEditGender(e.target.value)}><option value="female">女</option><option value="male">男</option><option value="unknown">未知</option></select> : (obj.gender === "female" ? "女" : obj.gender === "male" ? "男" : "—")}</dd></div>
                <div className="so-overview-item"><dt>服务资格</dt><dd>{editingBasic ? <select className="quality-user-modal__inline-input" value={editEligibility} onChange={e => setEditEligibility(e.target.value)}><option value="insurance">养护险</option><option value="government">政府购买</option><option value="institution">机构服务</option><option value="self_paid">自费</option></select> : <span className="sw-tag">{eligibilityLabel[obj.eligibilityType]}</span>}</dd></div>
                <div className="so-overview-item"><dt>服务频次</dt><dd>{editingBasic ? <input className="quality-user-modal__inline-input" value={editFrequency} onChange={e => setEditFrequency(e.target.value)} placeholder="如：每周三次" /> : (obj.serviceFrequency || "—")}</dd></div>
                <div className="so-overview-item"><dt>服务项目</dt><dd>{editingBasic ? <input className="quality-user-modal__inline-input" value={editProjects} onChange={e => setEditProjects(e.target.value)} placeholder="用顿号分隔" /> : (obj.serviceProjects.join("、") || "—")}</dd></div>
                <div className="so-overview-item so-overview-item--full"><dt>地址</dt><dd>{editingBasic ? <input className="quality-user-modal__inline-input" value={editAddress} onChange={e => setEditAddress(e.target.value)} style={{ width: "100%" }} /> : obj.address}</dd></div>
                {!editingBasic && obj.mapDisplayPoint ? <div className="so-overview-item so-overview-item--full"><dt>地图点</dt><dd>{obj.mapDisplayPoint.label ?? `${obj.mapDisplayPoint.latitude}, ${obj.mapDisplayPoint.longitude}`}</dd></div> : null}
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
                <h4 className="so-tab-section-title" style={{ margin: 0, border: 0, paddingBottom: 0 }}>照护重点</h4>
                {!editingCare && <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2, display: "flex" }} disabled={mutationsDisabled} onClick={() => { setEditRiskTags(obj.riskTags.join("、")); setEditCareNotes(obj.careNotes.join("\n")); setEditingCare(true); }} type="button" title="编辑"><Edit3 size={14} /></button>}
              </div>
              {editingCare ? (
                <div style={{ marginTop: 10 }}>
                  <label className="sw-field" style={{ marginBottom: 8 }}><span>风险标签</span><input className="quality-user-modal__inline-input" value={editRiskTags} onChange={e => setEditRiskTags(e.target.value)} placeholder="用顿号分隔，如：独居、跌倒风险" style={{ width: "100%" }} /></label>
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
              <div className="so-tab-section">
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
                      <input
                        className="so-ai-input"
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
                        placeholder='输入服务安排，如"每周一三五上午10点助餐"...'
                        value={aiInput}
                      />
                      <button className="so-ai-send" disabled={generating || !aiInput.trim()} onClick={handleGenerate} type="button">
                        {generating ? <Clock size={16} /> : <Send size={16} />}
                      </button>
                    </div>
                  </div>

                  {generatedItems.length > 0 && (
                    <div className="so-generated">
                      {generatedItems[0]?.isRecurring && (
                        <div className="so-recurring-banner">
                          <CalendarPlus size={16} />
                          <div>
                            <strong>周期服务计划：{generatedItems[0].recurrenceLabel}</strong>
                            <span>{generatedItems[0].project} · {generatedItems[0].timeLabel} · 预览未来4周共{generatedItems.length}次</span>
                          </div>
                        </div>
                      )}
                      <div className="so-generated__header">
                        <span>{generatedItems[0]?.isRecurring ? `${generatedItems.length} 次服务排期` : `已生成 ${generatedItems.length} 条服务`}</span>
                        {pendingCount > 0 && (
                          <button className="sw-btn sw-btn--primary so-generated__confirm-all" onClick={handleConfirmAllWithSync} type="button">
                            全部确认 ({pendingCount})
                          </button>
                        )}
                        {confirmedCount > 0 && pendingCount === 0 && (
                          <span className="so-generated__done">全部已确认</span>
                        )}
                      </div>
                      <div className="so-generated__list">
                        {generatedItems.map(item => (
                          <div className="so-gen-item" data-status={item.status} key={item.id}>
                            {editingItemId === item.id ? (
                              <ScheduleItemEditor item={item} serviceProjects={obj.serviceProjects} onSave={(updates) => handleItemUpdate(item.id, updates)} onCancel={() => setEditingItemId(null)} />
                            ) : (
                              <>
                                <div className="so-gen-item__info" onClick={() => item.status === "pending" ? setEditingItemId(item.id) : undefined} style={item.status === "pending" ? { cursor: "pointer" } : undefined}>
                                  <strong>{item.project}</strong>
                                  <span>{item.dayLabel} · {item.date} · {item.timeLabel}</span>
                                  {item.status === "pending" && <small className="so-gen-item__edit-hint">点击修改</small>}
                                </div>
                                <div className="so-gen-item__actions">
                                  {item.status === "pending" ? (
                                    <>
                                      <button className="so-gen-item__btn so-gen-item__btn--confirm" onClick={() => handleItemActionWithSync(item.id, "confirmed")} title="确认" type="button">确认</button>
                                      <button className="so-gen-item__btn so-gen-item__btn--cancel" onClick={() => handleItemAction(item.id, "cancelled")} title="取消" type="button"><Ban size={13} /></button>
                                      <button className="so-gen-item__btn so-gen-item__btn--postpone" onClick={() => handleItemAction(item.id, "postponed")} title="延期" type="button"><CalendarClock size={13} /></button>
                                    </>
                                  ) : (
                                    <span className="sw-status-badge" data-tone={item.status === "confirmed" ? "success" : item.status === "cancelled" ? "muted" : "warning"}>
                                      {item.status === "confirmed" ? "已确认" : item.status === "cancelled" ? "已取消" : "已延期"}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
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
            <div className="so-tab-section">
              <h4 className="so-tab-section-title">当前计划</h4>
              {savedPlans.length > 0 ? (
                <div className="so-plans">
                  {savedPlans.map(plan => (
                    <div className="so-plan-card so-plan-card--recurring" key={plan.id}>
                      <div className="so-plan-card__header">
                        <strong>{plan.serviceProject}</strong>
                        <span className="sw-status-badge" data-tone={plan.status === "active" ? "success" : "muted"}>
                          {plan.status === "active" ? "周期进行中" : statusText[plan.status] ?? plan.status}
                        </span>
                      </div>
                      <div className="so-plan-card__meta">
                        <span>{plan.cadenceLabel}</span>
                        <span>{plan.preferredTimeWindow?.label ?? `${plan.preferredTimeWindow?.start ?? ""}-${plan.preferredTimeWindow?.end ?? ""}`}</span>
                        {plan.primarySocialWorkerName && <span>{plan.primarySocialWorkerName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="sw-text-muted">暂无周期服务计划</p>}
            </div>

            {/* Schedule occurrences */}
            {savedSchedules.length > 0 && (
              <div className="so-tab-section">
                <h4 className="so-tab-section-title">近期排期 ({savedSchedules.length}条)</h4>
                <div className="so-schedules-list">
                  {savedSchedules.slice(0, 20).map(s => (
                    <div className="so-schedule-row" key={s.id}>
                      <span>{s.serviceDate} · {s.timeWindow?.label ?? `${s.timeWindow?.start ?? ""}-${s.timeWindow?.end ?? ""}`}</span>
                      <span className="sw-status-badge" data-tone={s.status === "completed" ? "success" : s.status === "cancelled" ? "muted" : s.status === "unassigned" ? "warning" : "accent"} style={{ fontSize: 10, padding: "2px 6px" }}>
                        {statusText[s.status] ?? s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locally created plans (not yet in API) */}
            {localPlans.filter(p => !savedSchedules.some(s => s.serviceDate === p.date && s.serviceProject === p.project)).length > 0 && (
              <div className="so-tab-section">
                <h4 className="so-tab-section-title">新安排</h4>
                <div className="so-plans">
                  {localPlans.filter(p => !savedSchedules.some(s => s.serviceDate === p.date && s.serviceProject === p.project)).map(item => (
                    <div className="so-plan-card so-plan-card--new" data-status={item.status} key={item.id}>
                      <div className="so-plan-card__header">
                        <strong>{item.project}</strong>
                        <span className="sw-status-badge" data-tone={item.status === "confirmed" ? "success" : item.status === "cancelled" ? "muted" : "warning"}>
                          {item.status === "confirmed" ? "已安排" : item.status === "cancelled" ? "已取消" : "已延期"}
                        </span>
                      </div>
                      <div className="so-plan-card__meta">
                        <span>{item.dayLabel} · {item.date}</span>
                        <span>{item.timeLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "history" && (
          <div className="so-tab-section">
            <HistoryRecords serviceObjectName={obj.name} serviceProjects={obj.serviceProjects} onViewRecord={setViewingRecord} />
          </div>
        )}

        {activeTab === "insights" && (
          <div className="so-tab-section">
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

      {/* ── Footer ── */}
      <div className="so-modal__footer">
        <div>
          {showArchiveConfirm ? (
            <span className="sw-drawer__confirm"><span>确认归档？</span><button className="sw-btn sw-btn--danger" type="button">确认归档</button><button className="sw-btn sw-btn--secondary" onClick={() => setShowArchiveConfirm(false)} type="button">取消</button></span>
          ) : (
            <button className="sw-btn sw-btn--danger-ghost" disabled={mutationsDisabled} onClick={() => setShowArchiveConfirm(true)} type="button">归档</button>
          )}
        </div>
        <div className="so-modal__footer-right">
          <button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={openAiScheduler} type="button">
            <CalendarPlus size={14} /> 安排服务
          </button>
        </div>
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
    <div className="so-tab-section">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h4 className="so-tab-section-title" style={{ margin: 0, border: 0, paddingBottom: 0 }}>家属联系人</h4>
        {!showAdd && !editId && <button style={{ background: "none", border: "none", cursor: "pointer", color: "#0052CC", padding: 2, display: "flex", fontSize: 12, gap: 2, alignItems: "center" }} disabled={mutationsDisabled} onClick={() => { setForm({ name: "", relation: "", phone: "", wechatId: "" }); setShowAdd(true); }} type="button"><Plus size={14} /> 添加</button>}
      </div>

      {showAdd && (
        <div style={{ marginTop: 10, padding: 12, background: "#F9FAFB", borderRadius: 8, border: "1px solid #E5E7EB" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div className="sw-field"><span>姓名 *</span><input className="quality-user-modal__inline-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="sw-field"><span>关系</span><input className="quality-user-modal__inline-input" placeholder="如：女儿" value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} /></div>
            <div className="sw-field"><span>电话</span><input className="quality-user-modal__inline-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="sw-field"><span>微信号</span><input className="quality-user-modal__inline-input" value={form.wechatId} onChange={e => setForm(f => ({ ...f, wechatId: e.target.value }))} /></div>
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
                  <div className="sw-field"><span>姓名</span><input className="quality-user-modal__inline-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="sw-field"><span>关系</span><input className="quality-user-modal__inline-input" value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} /></div>
                  <div className="sw-field"><span>电话</span><input className="quality-user-modal__inline-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div className="sw-field"><span>微信号</span><input className="quality-user-modal__inline-input" value={form.wechatId} onChange={e => setForm(f => ({ ...f, wechatId: e.target.value }))} /></div>
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
                  <span className="sw-status-badge" data-tone={c.subscriptionStatus === "none" ? "muted" : c.subscriptionStatus === "exception_only" ? "warning" : "success"}>
                    {subscriptionLabel[c.subscriptionStatus]}
                  </span>
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
                      <div style={{ position: "absolute", bottom: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", border: "1px solid #FECACA", padding: "10px 14px", zIndex: 10, whiteSpace: "nowrap" }}>
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

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("unknown");
  const [address, setAddress] = useState("");
  const [eligibility, setEligibility] = useState("government");
  const [projects, setProjects] = useState("");
  const [frequency, setFrequency] = useState("");
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
      await siteOperationsApi.createServiceObject({
        name: name.trim(), idNumber: idNumber.trim(), age: age ? Number(age) : undefined, address: address.trim(),
        eligibilityType: eligibility as ServiceEligibilityType,
        serviceProjects: projects.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
        riskTags: riskTags.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
        careNotes: careNotes.split("\n").map(s => s.trim()).filter(Boolean),
      });
      onCreated();
    } catch { setCreating(false); }
  };

  return (
    <div className="so-modal so-modal--form" role="dialog" aria-label="新增服务对象">
      <div className="so-modal__form-header">
        <h3>新增服务对象</h3>
        <button aria-label="关闭" className="so-modal__close" onClick={onClose} type="button"><X size={18} /></button>
      </div>
      <div className="so-modal__content">
        <FormFields name={name} onNameChange={setName} phone={phone} onPhoneChange={setPhone} idNumber={idNumber} onIdNumberChange={setIdNumber} age={age} onAgeChange={setAge} gender={gender} onGenderChange={setGender}
          address={address} onAddressChange={setAddress} eligibility={eligibility} onEligibilityChange={setEligibility}
          projects={projects} onProjectsChange={setProjects} frequency={frequency} onFrequencyChange={setFrequency}
          riskTags={riskTags} onRiskTagsChange={setRiskTags} careNotes={careNotes} onCareNotesChange={setCareNotes}
          familyName={familyName} onFamilyNameChange={setFamilyName} familyRelation={familyRelation} onFamilyRelationChange={setFamilyRelation}
          familyPhone={familyPhone} onFamilyPhoneChange={setFamilyPhone}
          familyWechat={familyWechat} onFamilyWechatChange={setFamilyWechat} />
      </div>
      {error && <div style={{ margin: "0 16px", padding: 10, background: "#FEE2E2", color: "#B42318", borderRadius: 8, fontSize: 13 }}>{error}</div>}
      <div className="so-modal__footer">
        <div />
        <div className="so-modal__footer-right">
          <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">取消</button>
          <button className="sw-btn sw-btn--primary" disabled={creating || !name.trim() || !address.trim()} onClick={handleCreate} type="button">{creating ? "创建中..." : "创建"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Form Fields (card-grouped layout) ── */

function FormFields({ name, onNameChange, phone, onPhoneChange, idNumber, onIdNumberChange, age, onAgeChange, gender, onGenderChange, address, onAddressChange,
  eligibility, onEligibilityChange, projects, onProjectsChange, frequency, onFrequencyChange,
  riskTags, onRiskTagsChange, careNotes, onCareNotesChange,
  familyName, onFamilyNameChange, familyRelation, onFamilyRelationChange, familyPhone, onFamilyPhoneChange,
  familyWechat, onFamilyWechatChange }: {
  name: string; onNameChange: (v: string) => void; phone: string; onPhoneChange: (v: string) => void;
  idNumber: string; onIdNumberChange: (v: string) => void;
  age: string; onAgeChange: (v: string) => void;
  gender: string; onGenderChange: (v: string) => void; address: string; onAddressChange: (v: string) => void;
  eligibility: string; onEligibilityChange: (v: string) => void; projects: string; onProjectsChange: (v: string) => void;
  frequency: string; onFrequencyChange: (v: string) => void;
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
          <label className="sw-field"><span>服务频次</span><input onChange={(e) => onFrequencyChange(e.target.value)} placeholder="如：每周三次" value={frequency} /></label>
        </div>
        <label className="sw-field"><span>服务项目</span><input onChange={(e) => onProjectsChange(e.target.value)} placeholder="用顿号分隔，如：助餐、陪诊" value={projects} /></label>
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

function ScheduleItemEditor({ item, serviceProjects, onSave, onCancel }: {
  item: GeneratedScheduleItem;
  serviceProjects: string[];
  onSave: (updates: Partial<GeneratedScheduleItem>) => void;
  onCancel: () => void;
}) {
  const [project, setProject] = useState(item.project);
  const [date, setDate] = useState(item.date);
  const [time, setTime] = useState(item.timeLabel.includes("14") ? "afternoon" : item.timeLabel.includes("16") ? "evening" : "morning");

  const timeOptions: Record<string, string> = {
    morning: "上午 9:00-11:00",
    mid_morning: "上午 10:00-12:00",
    afternoon: "下午 14:00-16:00",
    evening: "傍晚 16:00-18:00",
  };

  return (
    <div className="so-gen-item__editor">
      <div className="so-gen-item__editor-row">
        <label className="sw-field">
          <span>服务内容</span>
          <select onChange={(e) => setProject(e.target.value)} value={project}>
            {serviceProjects.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="其他">其他</option>
          </select>
        </label>
      </div>
      <div className="so-gen-item__editor-row">
        <label className="sw-field">
          <span>日期</span>
          <input onChange={(e) => setDate(e.target.value)} type="date" value={date} />
        </label>
        <label className="sw-field">
          <span>时间段</span>
          <select onChange={(e) => setTime(e.target.value)} value={time}>
            {Object.entries(timeOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <div className="so-gen-item__editor-actions">
        <button className="sw-btn sw-btn--secondary" onClick={onCancel} type="button" style={{ height: 28, fontSize: 12, padding: "0 10px" }}>取消</button>
        <button className="sw-btn sw-btn--primary" onClick={() => onSave({ project, date, timeLabel: timeOptions[time] ?? timeOptions.morning, dayLabel: item.dayLabel })} type="button" style={{ height: 28, fontSize: 12, padding: "0 10px" }}>保存</button>
      </div>
    </div>
  );
}

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
      structuredSummary: "完成服务，服务对象状态稳定。", exportHistory: [{ id: "e1", exportedAt: "2026-05-13T09:00:00+08:00", operatorName: "管理员", fileVersion: "v1", filterSummary: "常规导出" }],
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
              {hasAbnormal && <span className="sw-status-badge" data-tone="warning" style={{ fontSize: 10, padding: "2px 6px" }}>有异常</span>}
              <span className="sw-status-badge" data-tone={rec.reviewStatus === "confirmed" ? "success" : "warning"} style={{ fontSize: 10, padding: "2px 6px" }}>
                {rec.reviewStatus === "confirmed" ? "已确认" : "待复核"}
              </span>
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
