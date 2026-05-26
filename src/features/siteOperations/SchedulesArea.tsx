import { useEscClose } from "./useEscClose";
import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, ChevronDown, List, Calendar, MapPin, Shield, Clock, UserRound, AlertTriangle, Ban, ChevronLeft, ChevronRight as ChevronRightIcon, Maximize2, Minimize2 } from "lucide-react";
import type { ServiceScheduleOccurrence, ServiceSchedulesResponse, WorkAreaOperationalState } from "./contracts";
import { statusText } from "./contracts";
import { siteOperationsApi, authFetch } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";
import { useSite } from "../../auth/SiteContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type ScheduleView = "list" | "calendar" | "map";

function scheduleTone(status: string): string {
  if (status === "completed") return "success";
  if (status === "scheduled" || status === "assigned" || status === "adjusted") return "accent";
  if (status === "in_progress") return "info";
  if (status === "unassigned") return "warning";
  return "muted";
}

function formatDate(d: string) {
  const date = new Date(`${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getMonth() + 1}/${date.getDate()} 周${days[date.getDay()]}`;
}

function formatWindow(s: ServiceScheduleOccurrence) {
  if (s.timeWindow?.label) return s.timeWindow.label;
  return `${s.startTime ?? s.timeWindow?.start ?? ""}-${s.endTime ?? s.timeWindow?.end ?? ""}`;
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

type DrawerMode = { kind: "closed" } | { kind: "view"; schedule: ServiceScheduleOccurrence };

export function SchedulesArea({ resource, onMutate }: { resource: Resource<ServiceSchedulesResponse>; onMutate?: () => void }) {
  const [view, setView] = useState<ScheduleView>("list");
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [searchQuery, setSearchQuery] = useState("");
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const [startDate, setStartDate] = useState<Date | null>(todayDate);
  const [endDate, setEndDate] = useState<Date | null>(todayDate);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const statusRef = useRef<HTMLDivElement>(null);
  const [statusDropOpen, setStatusDropOpen] = useState(false);

  useEffect(() => {
    if (!statusDropOpen) return;
    const handler = (e: MouseEvent) => { if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusDropOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusDropOpen]);

  const dateFrom = startDate ? startDate.toISOString().slice(0, 10) : "";
  const dateTo = endDate ? endDate.toISOString().slice(0, 10) : "";

  const applyPreset = (from: Date | null, to: Date | null) => { setStartDate(from); setEndDate(to); };
  const d = (offset: number) => { const t = new Date(); t.setDate(t.getDate() + offset); t.setHours(0,0,0,0); return t; };
  const weekStart = (() => { const t = new Date(); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); t.setHours(0,0,0,0); return t; })();
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

  const statusOptions = [
    { value: "unassigned", label: "待分配" },
    { value: "scheduled", label: "待执行" },
    { value: "in_progress", label: "进行中" },
    { value: "completed", label: "已完成" },
    { value: "cancelled", label: "已取消" },
  ];
  const toggleStatus = (v: string) => setStatusFilters(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const statusLabel = statusFilters.length === 0 ? "排期状态" : statusFilters.length === 1 ? statusOptions.find(o => o.value === statusFilters[0])?.label ?? "排期状态" : `${statusFilters.length}项已选`;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const operationalState = resource.status === "success" ? resource.data.operationalState : undefined;
  const mutationsDisabled = isMutationDisabled(operationalState);

  const schedules = resource.status === "success" ? resource.data.serviceSchedules : [];

  const handleUpdated = useCallback(() => {
    onMutate?.();
    setDrawer({ kind: "closed" });
  }, [onMutate]);

  const filtered = schedules.filter((s) => {
    if (dateFrom && s.serviceDate < dateFrom) return false;
    if (dateTo && s.serviceDate > dateTo) return false;
    if (statusFilters.length > 0 && !statusFilters.includes(s.status)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.serviceObjectName.toLowerCase().includes(q) && !(s.addressSnapshot ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isLoading = resource.status === "loading" || resource.status === "idle";
  useEscClose(useCallback(() => setDrawer({ kind: "closed" }), []));

  return (
    <>
      <section aria-label="服务排期" className="sw-page">
        <div className="sw-page__inner">
          <header className="sw-header">
            <div className="sw-header__title-group">
              <h2 className="sw-header__title">服务排期</h2>
              <p className="sw-header__desc">查看和管理所有长者的服务安排</p>
            </div>
            <div className="sch-view-switch">
              <button className={`sch-view-btn ${view === "list" ? "sch-view-btn--active" : ""}`} onClick={() => setView("list")} type="button"><List size={16} /> 列表</button>
              <button className={`sch-view-btn ${view === "calendar" ? "sch-view-btn--active" : ""}`} onClick={() => setView("calendar")} type="button"><Calendar size={16} /> 日历</button>
              <button className={`sch-view-btn ${view === "map" ? "sch-view-btn--active" : ""}`} onClick={() => setView("map")} type="button"><MapPin size={16} /> 地图</button>
            </div>
          </header>

          <div className="sw-table-container">
            <div className="sw-toolbar">
              <label className="sw-search">
                <Search size={16} />
                <input aria-label="搜索排期" onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索长者或地址..." value={searchQuery} />
              </label>
              <div className="sw-toolbar__filters">
                {view !== "calendar" && (
                  <div className="sch-date-picker-wrap">
                    <DatePicker
                      selectsRange
                      startDate={startDate}
                      endDate={endDate}
                      onChange={([s, e]: [Date | null, Date | null]) => { setStartDate(s); setEndDate(e); }}
                      dateFormat="yyyy/MM/dd"
                      placeholderText="选择日期范围"
                      className="sch-date-picker-input"
                      isClearable
                    >
                      <div className="sch-date-picker-presets">
                        <button type="button" onClick={() => applyPreset(todayDate, todayDate)}>今天</button>
                        <button type="button" onClick={() => applyPreset(d(-2), todayDate)}>近3天</button>
                        <button type="button" onClick={() => applyPreset(todayDate, d(2))}>未来3天</button>
                        <button type="button" onClick={() => applyPreset(weekStart, weekEnd)}>本周</button>
                        <button type="button" onClick={() => applyPreset(d(-6), todayDate)}>近7天</button>
                        <button type="button" onClick={() => applyPreset(d(-29), todayDate)}>近30天</button>
                        <button type="button" onClick={() => applyPreset(null, null)}>全部</button>
                      </div>
                    </DatePicker>
                  </div>
                )}
                <div className="sw-filter" ref={statusRef} style={{ position: "relative" }}>
                  <select className={statusFilters.length > 0 ? "sw-filter--active" : ""} onMouseDown={(e) => { e.preventDefault(); setStatusDropOpen(!statusDropOpen); }} value="" readOnly>
                    <option>{statusLabel}</option>
                  </select>
                  {statusDropOpen && (
                    <div className="sw-filter__dropdown">
                      {statusOptions.map(opt => (
                        <label key={opt.value} className="sw-filter__option">
                          <input type="checkbox" checked={statusFilters.includes(opt.value)} onChange={() => toggleStatus(opt.value)} />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                      {statusFilters.length > 0 && (
                        <button className="sw-filter__clear" type="button" onClick={() => { setStatusFilters([]); setStatusDropOpen(false); }}>清除筛选</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {operationalState ? <OperationalBanner state={operationalState} /> : null}

            {isLoading ? <div className="sw-empty"><div className="sw-empty__icon"><Calendar size={32} /></div><span>服务排期数据加载中...</span></div>
            : resource.status === "error" ? <div className="sw-empty"><div className="sw-empty__icon sw-empty__icon--error"><X size={32} /></div><span>{resource.error}</span></div>
            : filtered.length === 0 ? <div className="sw-empty"><div className="sw-empty__icon"><Calendar size={32} /></div><span>{schedules.length === 0 ? "暂无服务排期" : "没有匹配的排期"}</span></div>
            : view === "calendar" ? <CalendarView schedules={filtered} onSelect={(s) => setDrawer({ kind: "view", schedule: s })} />
            : view === "map" ? <MapView schedules={filtered} onSelect={(s) => setDrawer({ kind: "view", schedule: s })} />
            : <ListView schedules={filtered} selectedId={selectedId} onRowClick={(s) => setDrawer({ kind: "view", schedule: s })} />}
          </div>
        </div>

        {drawer.kind !== "closed" ? (
          <>
            <button aria-label="关闭抽屉遮罩" className="sw-scrim" onClick={() => setDrawer({ kind: "closed" })} type="button" />
            <ScheduleDrawer schedule={drawer.schedule} mutationsDisabled={mutationsDisabled} onClose={() => setDrawer({ kind: "closed" })} onUpdated={handleUpdated} />
          </>
        ) : null}
      </section>
    </>
  );
}

function OperationalBanner({ state }: { state: WorkAreaOperationalState }) {
  if (state.unavailableMessage) return <div className="sw-banner sw-banner--danger" role="status"><Shield size={16} /><div><strong>服务排期暂不可用</strong><span>{state.unavailableMessage}</span></div></div>;
  if (state.permission === "read_only") return <div className="sw-banner sw-banner--warning" role="status"><Shield size={16} /><div><strong>只读模式</strong><span>可查看数据，调整和取消操作已禁用。</span></div></div>;
  return null;
}

function ListView({ schedules, selectedId, onRowClick }: {
  schedules: ServiceScheduleOccurrence[]; selectedId: string | null;
  onRowClick: (s: ServiceScheduleOccurrence) => void;
}) {
  const sorted = [...schedules].sort((a, b) => a.serviceDate.localeCompare(b.serviceDate) || (a.startTime ?? a.timeWindow?.start ?? "").localeCompare(b.startTime ?? b.timeWindow?.start ?? ""));

  return (
    <>
      <div className="sw-table sch-table" role="table">
        <div className="sw-table__head sch-table__head" role="row">
          <span role="columnheader">日期 / 时间段</span>
          <span role="columnheader">长者</span>
          <span role="columnheader">服务人员</span>
          <span role="columnheader">服务项目</span>
          <span role="columnheader">地址</span>
          <span role="columnheader">状态</span>
        </div>
        {sorted.map((s) => {
          const color = avatarColor(s.serviceObjectName);
          return (
            <div className="sw-table__row sch-table__row" data-selected={selectedId === s.id} data-exception={s.planExceptionApplied} data-status={s.status} key={s.id}
              onClick={() => onRowClick(s)} role="row">
              <div role="cell" className="sch-cell-datetime">
                <span className="sch-cell-date">{formatDate(s.serviceDate)}</span>
                <span className="sch-cell-time">{formatWindow(s)}</span>
              </div>
              <div role="cell" className="sw-table__cell-name">
                <div className="sw-avatar" style={{ background: color.bg, color: color.text, width: 28, height: 28, fontSize: 12, borderRadius: 8 }}>{getInitials(s.serviceObjectName)}</div>
                <div className="sw-name-group">
                  <span className="sch-obj-name">{s.serviceObjectName}</span>
                  {s.riskTags.length > 0 ? <small className="sch-risk-icon">⚠</small> : null}
                </div>
              </div>
              <div role="cell">{s.assignedSocialWorkerName ?? <span className="sw-text-muted">未分配</span>}</div>
              <div role="cell"><span className="sw-tag">{s.serviceProject}</span></div>
              <div role="cell" className="so-cell-address">{s.addressSnapshot}</div>
              <div role="cell"><span className="sw-status-badge" data-tone={scheduleTone(s.status)}>{statusText[s.status] ?? s.status}</span></div>
            </div>
          );
        })}
      </div>

      <div className="sw-mobile-list">
        {schedules.map((s) => (
          <button className="sw-mobile-card" key={s.id} onClick={() => onRowClick(s)} type="button">
            <div className="sw-mobile-card__top">
              <span className="sch-cell-date">{formatDate(s.serviceDate)}</span>
              <span className="sw-status-badge" data-tone={scheduleTone(s.status)}>{statusText[s.status] ?? s.status}</span>
            </div>
            <div className="sw-mobile-card__info"><strong>{s.serviceObjectName} · {s.serviceProject}</strong></div>
            <div className="sw-mobile-card__meta">
              <span>{formatWindow(s)}</span>
              <span>{s.assignedSocialWorkerName ?? "未分配"}</span>
              <span>{s.addressSnapshot}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

type CalendarMode = "day" | "week" | "month";

function CalendarView({ schedules, onSelect }: { schedules: ServiceScheduleOccurrence[]; onSelect: (s: ServiceScheduleOccurrence) => void }) {
  const [mode, setMode] = useState<CalendarMode>("week");
  const [baseDate, setBaseDate] = useState(() => new Date());

  const hours = Array.from({ length: 12 }, (_, i) => i + 7);
  const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  const getDaysForView = (): Date[] => {
    if (mode === "day") return [new Date(baseDate)];
    if (mode === "week") {
      const start = new Date(baseDate);
      start.setDate(start.getDate() - start.getDay() + 1);
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    }
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const startDay = start.getDay() || 7;
    start.setDate(start.getDate() - startDay + 1);
    return Array.from({ length: 35 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  };

  const days = getDaysForView();
  const fmtKey = (d: Date) => d.toISOString().slice(0, 10);

  const byDate = new Map<string, ServiceScheduleOccurrence[]>();
  for (const s of schedules) { const list = byDate.get(s.serviceDate) ?? []; list.push(s); byDate.set(s.serviceDate, list); }

  const navigate = (dir: number) => {
    const d = new Date(baseDate);
    if (mode === "day") d.setDate(d.getDate() + dir);
    else if (mode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setBaseDate(d);
  };

  const title = mode === "day" ? formatDate(fmtKey(baseDate))
    : mode === "week" ? `${formatDate(fmtKey(days[0]))} — ${formatDate(fmtKey(days[days.length - 1]))}`
    : `${baseDate.getFullYear()}年${baseDate.getMonth() + 1}月`;

  const getSlotTop = (s: ServiceScheduleOccurrence) => {
    const st = s.startTime ?? s.timeWindow?.start ?? "09:00";
    const [h, m] = st.split(":").map(Number);
    return ((h - 7) * 60 + (m || 0));
  };

  const getSlotHeight = (s: ServiceScheduleOccurrence) => {
    const st = s.startTime ?? s.timeWindow?.start ?? "09:00";
    const et = s.endTime ?? s.timeWindow?.end ?? "10:00";
    const [sh, sm] = st.split(":").map(Number);
    const [eh, em] = et.split(":").map(Number);
    return Math.max(((eh - sh) * 60 + (em || 0) - (sm || 0)), 30);
  };

  const toneColor: Record<string, string> = {
    success: "#16A34A", warning: "#D97706", accent: "#0052CC", muted: "#9CA3AF"
  };

  if (mode === "month") {
    return (
      <div className="sch-cal">
        <div className="sch-cal__toolbar">
          <div className="sch-cal__nav">
            <button className="sch-cal__nav-btn" onClick={() => navigate(-1)} type="button"><ChevronLeft size={16} /></button>
            <strong className="sch-cal__title">{title}</strong>
            <button className="sch-cal__nav-btn" onClick={() => navigate(1)} type="button"><ChevronRightIcon size={16} /></button>
            <button className="sch-cal__today-btn" onClick={() => setBaseDate(new Date())} type="button">今天</button>
          </div>
          <div className="sch-cal__modes">
            {(["day", "week", "month"] as const).map(m => (
              <button className={`sch-cal__mode-btn ${mode === m ? "sch-cal__mode-btn--active" : ""}`} key={m} onClick={() => setMode(m)} type="button">
                {m === "day" ? "日" : m === "week" ? "周" : "月"}
              </button>
            ))}
          </div>
        </div>
        <div className="sch-cal-month">
          <div className="sch-cal-month__header">
            {dayNames.map(n => <span key={n}>{n}</span>)}
          </div>
          <div className="sch-cal-month__grid">
            {days.map(d => {
              const key = fmtKey(d);
              const items = byDate.get(key) ?? [];
              const isCurrentMonth = d.getMonth() === baseDate.getMonth();
              const isToday = key === fmtKey(new Date());
              return (
                <div className={`sch-cal-month__cell ${isCurrentMonth ? "" : "sch-cal-month__cell--dim"} ${isToday ? "sch-cal-month__cell--today" : ""}`} key={key}>
                  <span className="sch-cal-month__day">{d.getDate()}</span>
                  {items.slice(0, 3).map(s => (
                    <button className="sch-cal-month__event" key={s.id} onClick={() => onSelect(s)} style={{ borderLeftColor: toneColor[scheduleTone(s.status)] ?? "#9CA3AF" }} type="button">
                      {s.serviceObjectName}·{s.serviceProject} {s.assignedSocialWorkerName ? `(${s.assignedSocialWorkerName})` : ""}
                    </button>
                  ))}
                  {items.length > 3 ? <span className="sch-cal-month__more">+{items.length - 3}</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sch-cal">
      <div className="sch-cal__toolbar">
        <div className="sch-cal__nav">
          <button className="sch-cal__nav-btn" onClick={() => navigate(-1)} type="button"><ChevronLeft size={16} /></button>
          <strong className="sch-cal__title">{title}</strong>
          <button className="sch-cal__nav-btn" onClick={() => navigate(1)} type="button"><ChevronRightIcon size={16} /></button>
          <button className="sch-cal__today-btn" onClick={() => setBaseDate(new Date())} type="button">今天</button>
        </div>
        <div className="sch-cal__modes">
          {(["day", "week", "month"] as const).map(m => (
            <button className={`sch-cal__mode-btn ${mode === m ? "sch-cal__mode-btn--active" : ""}`} key={m} onClick={() => setMode(m)} type="button">
              {m === "day" ? "日" : m === "week" ? "周" : "月"}
            </button>
          ))}
        </div>
      </div>
      <div className="sch-cal-grid">
        <div className="sch-cal-grid__header">
          <div className="sch-cal-grid__time-col" />
          {days.map(d => {
            const key = fmtKey(d);
            const isToday = key === fmtKey(new Date());
            return <div className={`sch-cal-grid__day-header ${isToday ? "sch-cal-grid__day-header--today" : ""}`} key={key}><span>{d.getDate()}</span><small>{dayNames[d.getDay()]}</small></div>;
          })}
        </div>
        <div className="sch-cal-grid__body">
          <div className="sch-cal-grid__time-col">
            {hours.map(h => <div className="sch-cal-grid__hour-label" key={h}>{String(h).padStart(2, "0")}:00</div>)}
          </div>
          {days.map(d => {
            const key = fmtKey(d);
            const items = byDate.get(key) ?? [];
            return (
              <div className="sch-cal-grid__day-col" key={key}>
                {hours.map(h => <div className="sch-cal-grid__hour-cell" key={h} />)}
                {items.map(s => (
                  <button className="sch-cal-grid__event" key={s.id} onClick={() => onSelect(s)} style={{
                    top: getSlotTop(s), height: Math.max(getSlotHeight(s), 28),
                    backgroundColor: `${toneColor[scheduleTone(s.status)] ?? "#9CA3AF"}18`,
                    borderLeftColor: toneColor[scheduleTone(s.status)] ?? "#9CA3AF",
                    color: toneColor[scheduleTone(s.status)] ?? "#9CA3AF",
                  }} type="button">
                    <strong>{s.serviceObjectName} · {s.serviceProject}</strong>
                    <span>{formatWindow(s)} · {s.assignedSocialWorkerName ?? "未分配"}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MapView({ schedules, onSelect }: { schedules: ServiceScheduleOccurrence[]; onSelect: (s: ServiceScheduleOccurrence) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const amapRef = useRef<any>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || amapRef.current) return;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Wait for CSS to load
    setTimeout(() => {
      import("leaflet").then((L) => {
        if (!mapRef.current) return;
        const map = L.map(mapRef.current, { zoomControl: true }).setView([31.29, 121.52], 13);
        L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
          subdomains: ["1", "2", "3", "4"],
          attribution: "&copy; 高德地图"
        }).addTo(map);

        const byLocation = new Map<string, { lat: number; lng: number; items: ServiceScheduleOccurrence[] }>();
        for (const s of schedules) {
          if (!s.mapDisplayPoint) continue;
          const key = `${s.mapDisplayPoint.latitude},${s.mapDisplayPoint.longitude}`;
          const existing = byLocation.get(key);
          if (existing) { existing.items.push(s); } else {
            byLocation.set(key, { lat: s.mapDisplayPoint.latitude, lng: s.mapDisplayPoint.longitude, items: [s] });
          }
        }

        for (const [, loc] of byLocation) {
          const toneColors: Record<string, string> = { success: "#16A34A", warning: "#D97706", accent: "#0052CC", muted: "#9CA3AF" };
          const worstTone = loc.items.some(i => !i.assignedSocialWorkerId) ? "warning" : "success";
          const iconHtml = `<div style="background:${toneColors[worstTone]};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${loc.items.length}</div>`;
          const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [28, 28], iconAnchor: [14, 14] });
          const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
          const popupHtml = loc.items.map(s =>
            `<div style="cursor:pointer;padding:5px 0;border-bottom:1px solid #eee;font-size:13px" data-schedule-id="${s.id}">
              <strong>${s.serviceObjectName}</strong> · ${s.serviceProject}<br/>
              <small style="color:#6B7280">${formatDate(s.serviceDate)} · ${formatWindow(s)} · ${s.assignedSocialWorkerName ?? "未分配"}</small>
            </div>`
          ).join("");
          marker.bindPopup(`<div style="min-width:220px;padding:2px">${popupHtml}</div>`);
          marker.on("popupopen", () => {
            setTimeout(() => {
              const popup = marker.getPopup()?.getElement();
              if (!popup) return;
              popup.querySelectorAll("[data-schedule-id]").forEach((el: Element) => {
                (el as HTMLElement).onclick = () => {
                  const sid = el.getAttribute("data-schedule-id");
                  const found = schedules.find(ss => ss.id === sid);
                  if (found) onSelect(found);
                };
              });
            }, 50);
          });
        }

        amapRef.current = map;
        setTimeout(() => map.invalidateSize(), 200);
      });
    }, 100);

    return () => {
      if (amapRef.current) {
        if (typeof amapRef.current.remove === "function") amapRef.current.remove();
        amapRef.current = null;
      }
    };
  }, []);

  const byAddress = new Map<string, ServiceScheduleOccurrence[]>();
  for (const s of schedules) {
    const key = s.addressSnapshot ?? s.address ?? "未知";
    const list = byAddress.get(key) ?? [];
    list.push(s);
    byAddress.set(key, list);
  }

  return (
    <div className={`sch-map ${expanded ? "sch-map--expanded" : ""}`}>
      <div className="sch-map__container">
        <div className="sch-map__leaflet" ref={mapRef} />
        <button className="sch-map__expand-btn" onClick={() => setExpanded(!expanded)} type="button">
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
      <div className="sch-map__list">
        <h3>按地址分组</h3>
        {[...byAddress.entries()].map(([addr, items]) => {
          const firstWithPoint = items.find(s => s.mapDisplayPoint);
          return (
          <div className="sch-map__group" key={addr}>
            <div className="sch-map__group-header">
              <button className="sch-map__locate-btn" onClick={() => {
                if (firstWithPoint?.mapDisplayPoint && amapRef.current) {
                  const { latitude, longitude } = firstWithPoint.mapDisplayPoint;
                  if (typeof amapRef.current.setView === "function") {
                    amapRef.current.setView([latitude, longitude], 16);
                  }
                }
              }} title="定位到此地址" type="button"><MapPin size={14} /></button>
              <strong>{addr}</strong>
              <span className="sw-text-muted">{items.length} 条排期</span>
            </div>
            {items.map(s => (
              <button className="sch-map__item" key={s.id} onClick={() => onSelect(s)} type="button">
                <span>{s.serviceObjectName} · {s.serviceProject} · {formatDate(s.serviceDate)}</span>
                <span className="sw-status-badge" data-tone={scheduleTone(s.status)} style={{ fontSize: 11, padding: "2px 6px" }}>{statusText[s.status]}</span>
              </button>
            ))}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleDrawer({ schedule: s, mutationsDisabled, onClose, onUpdated }: {
  schedule: ServiceScheduleOccurrence; mutationsDisabled: boolean; onClose: () => void;
  onUpdated: () => void;
}) {
  const [showCancel, setShowCancel] = useState(false);
  const [adjustMode, setAdjustMode] = useState<null | "time" | "worker">(null);
  const [adjDate, setAdjDate] = useState(s.serviceDate);
  const [adjTime, setAdjTime] = useState(s.timeWindow?.start?.includes("14") ? "afternoon" : "morning");
  const [adjWorker, setAdjWorker] = useState(s.assignedSocialWorkerId ?? "");
  const [workerOptions, setWorkerOptions] = useState<Array<{ id: string; name: string }>>([]);
  const { currentSite } = useSite();

  useEffect(() => {
    const siteId = currentSite?.id;
    const url = siteId ? `/api/social-workers?siteId=${siteId}` : "/api/social-workers";
    authFetch(url).then(r => r.json()).then(data => {
      setWorkerOptions((data.socialWorkers ?? []).map((w: any) => ({ id: w.id, name: w.name })));
    }).catch(() => {});
  }, [currentSite?.id]);

  const objColor = avatarColor(s.serviceObjectName);
  const workerColor = s.assignedSocialWorkerName ? avatarColor(s.assignedSocialWorkerName) : { bg: "#F1F5F9", text: "#94A3B8" };
  const canAdjust = s.status !== "completed" && s.status !== "cancelled";
  const tone = scheduleTone(s.status);

  const timePresets: Record<string, { start: string; end: string; label: string }> = {
    morning: { start: "09:00", end: "11:00", label: "上午 9:00-11:00" },
    mid_morning: { start: "10:00", end: "12:00", label: "上午 10:00-12:00" },
    afternoon: { start: "14:00", end: "16:00", label: "下午 14:00-16:00" },
    evening: { start: "16:00", end: "18:00", label: "傍晚 16:00-18:00" },
  };

  const handleAdjustTime = async () => {
    try {
      await siteOperationsApi.updateServiceScheduleOccurrence(s.id, { serviceDate: adjDate, timeWindow: timePresets[adjTime] });
      onUpdated();
    } catch { /* noop */ }
    setAdjustMode(null);
  };

  const handleReassign = async () => {
    try {
      await siteOperationsApi.updateServiceScheduleOccurrence(s.id, { assignedSocialWorkerId: adjWorker || undefined });
      onUpdated();
    } catch { /* noop */ }
    setAdjustMode(null);
  };

  const handleCancel = async () => {
    try {
      await siteOperationsApi.updateServiceScheduleOccurrence(s.id, { status: "cancelled" });
      onUpdated();
    } catch { /* noop */ }
    setShowCancel(false);
  };

  const historyItems = ((s as any).adjustmentHistory ?? []) as Array<{ action: string; detail: string; operatorName: string; adjustedAt: string }>;

  return (
    <div className="so-modal sch-event-modal" role="dialog" aria-label="排期详情">
      {/* ── Status Banner ── */}
      <div className="sch-event__banner" data-tone={tone}>
        <button aria-label="关闭" className="so-modal__close sch-event__banner-close" onClick={onClose} type="button"><X size={18} /></button>
        <span className="sw-status-badge" data-tone={tone} style={{ marginBottom: 6 }}>{statusText[s.status] ?? s.status}</span>
        <h2 className="sch-event__title">{s.serviceProject}</h2>
        <p className="sch-event__datetime">{formatDate(s.serviceDate)} · {formatWindow(s)}</p>
        <div className="sch-event__badges">
          <span className="so-modal__chip">{s.source === "service_plan" ? "周期计划" : "按次服务"}</span>
          {s.planExceptionApplied ? <span className="so-modal__chip" style={{ background: "#FEF3C7", borderColor: "#F59E0B", color: "#92400E" }}>已受例外影响</span> : null}
          {s.riskTags.map(t => <span className="so-modal__risk-chip" key={t}><AlertTriangle size={12} /> {t}</span>)}
        </div>
      </div>

      {/* ── Three Info Cards ── */}
      <div className="sch-event__cards">
        <div className="sch-event__card">
          <span className="sch-event__card-label">长者</span>
          <div className="sch-event__card-main">
            <div className="sw-avatar" style={{ background: objColor.bg, color: objColor.text, width: 32, height: 32, fontSize: 13 }}>{getInitials(s.serviceObjectName)}</div>
            <span className="sch-event__card-name">{s.serviceObjectName}</span>
          </div>
          {s.riskTags.length > 0 ? (
            <div className="sch-event__card-risks">{s.riskTags.map(t => <span key={t} className="so-risk-tag">{t}</span>)}</div>
          ) : null}
        </div>

        <div className="sch-event__card">
          <span className="sch-event__card-label">服务人员</span>
          <div className="sch-event__card-main">
            <div className="sw-avatar" style={{ background: workerColor.bg, color: workerColor.text, width: 32, height: 32, fontSize: 13 }}>{s.assignedSocialWorkerName ? getInitials(s.assignedSocialWorkerName) : "?"}</div>
            <span className="sch-event__card-name">{s.assignedSocialWorkerName ?? "待分配"}</span>
          </div>
          {!s.assignedSocialWorkerName ? <span className="sch-event__card-sub">尚未分配服务人员</span> : null}
        </div>

        <div className="sch-event__card">
          <span className="sch-event__card-label">服务地点</span>
          <div className="sch-event__card-main">
            <MapPin size={16} style={{ color: "#6B7280", flexShrink: 0 }} />
            <span className="sch-event__card-name">{s.mapDisplayPoint?.label ?? s.addressSnapshot}</span>
          </div>
          {s.mapDisplayPoint?.label && s.addressSnapshot !== s.mapDisplayPoint.label ? (
            <span className="sch-event__card-sub">{s.addressSnapshot}</span>
          ) : null}
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="so-modal__content">
        {/* Quick Actions */}
        {canAdjust && !mutationsDisabled ? (
          <div className="sch-event__action-bar">
            <button className={`sch-event__action-btn${adjustMode === "time" ? " sch-event__action-btn--active" : ""}`} onClick={() => setAdjustMode(adjustMode === "time" ? null : "time")} type="button">
              <Clock size={15} /> 调整时间
            </button>
            <button className={`sch-event__action-btn${adjustMode === "worker" ? " sch-event__action-btn--active" : ""}`} onClick={() => setAdjustMode(adjustMode === "worker" ? null : "worker")} type="button">
              <UserRound size={15} /> 改派人员
            </button>
            {s.serviceRecordId ? (
              <button className="sch-event__action-btn" type="button">
                <Search size={15} /> 查看记录
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Inline Forms */}
        {adjustMode === "time" ? (
          <div className="sch-event__inline-form">
            <strong className="sch-event__inline-form-title">调整排期时间</strong>
            <div className="so-form-card__row">
              <label className="sw-field"><span>日期</span><input onChange={(e) => setAdjDate(e.target.value)} type="date" value={adjDate} /></label>
              <label className="sw-field"><span>时间段</span>
                <select onChange={(e) => setAdjTime(e.target.value)} value={adjTime}>
                  {Object.entries(timePresets).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
            </div>
            <div className="sch-event__inline-form-actions">
              <button className="sw-btn sw-btn--secondary" onClick={() => setAdjustMode(null)} type="button">取消</button>
              <button className="sw-btn sw-btn--primary" onClick={handleAdjustTime} type="button">保存</button>
            </div>
          </div>
        ) : null}

        {adjustMode === "worker" ? (
          <div className="sch-event__inline-form">
            <strong className="sch-event__inline-form-title">改派服务人员</strong>
            <label className="sw-field"><span>服务人员</span>
              <select onChange={(e) => setAdjWorker(e.target.value)} value={adjWorker}>
                <option value="">未分配</option>
                {workerOptions.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <div className="sch-event__inline-form-actions">
              <button className="sw-btn sw-btn--secondary" onClick={() => setAdjustMode(null)} type="button">取消</button>
              <button className="sw-btn sw-btn--primary" onClick={handleReassign} type="button">保存</button>
            </div>
          </div>
        ) : null}

        {/* Schedule Details */}
        <div className="so-tab-section" style={{ marginTop: canAdjust && !mutationsDisabled ? 0 : undefined }}>
          <h4 className="so-tab-section-title">排期详情</h4>
          <dl className="so-overview-grid">
            <div className="so-overview-item"><dt>服务日期</dt><dd>{formatDate(s.serviceDate)}</dd></div>
            <div className="so-overview-item"><dt>时间段</dt><dd>{formatWindow(s)}</dd></div>
            <div className="so-overview-item"><dt>服务项目</dt><dd><span className="sw-tag">{s.serviceProject}</span></dd></div>
            <div className="so-overview-item"><dt>来源</dt><dd>{s.source === "service_plan" ? "周期计划" : "按次服务"}</dd></div>
            <div className="so-overview-item"><dt>状态</dt><dd><span className="sw-status-badge" data-tone={tone}>{statusText[s.status] ?? s.status}</span></dd></div>
            <div className="so-overview-item"><dt>{s.planExceptionApplied ? "计划例外" : "服务人员"}</dt><dd>{s.planExceptionApplied ? <span className="sw-status-badge" data-tone="warning">已受例外影响</span> : (s.assignedSocialWorkerName ?? <span className="sw-text-muted">待分配</span>)}</dd></div>
            <div className="so-overview-item"><dt>长者</dt><dd>{s.serviceObjectName}</dd></div>
            <div className="so-overview-item"><dt>地址</dt><dd>{s.addressSnapshot}</dd></div>
            <div className="so-overview-item"><dt>{s.serviceRecordId ? "关联记录" : "备注"}</dt><dd>{s.serviceRecordId ?? s.notes ?? "—"}</dd></div>
          </dl>
        </div>

        {/* Adjustment History */}
        {historyItems.length > 0 ? (
          <div className="so-tab-section">
            <h4 className="so-tab-section-title">调整历史 ({historyItems.length})</h4>
            <div className="sch-adj-history">
              {historyItems.map((h, i) => (
                <div className="sch-adj-history__item" key={i}>
                  <div className="sch-adj-history__action">
                    <strong>{h.action}</strong>
                    <small>{new Date(h.adjustedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                  </div>
                  <span className="sch-adj-history__detail">{h.detail}</span>
                  <span className="sw-text-muted" style={{ fontSize: 11 }}>{h.operatorName}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Footer ── */}
      <div className="so-modal__footer">
        <div>
          {canAdjust && !mutationsDisabled ? (
            showCancel ? (
              <span className="sw-drawer__confirm"><span>确认取消？</span><button className="sw-btn sw-btn--danger" onClick={handleCancel} type="button">确认取消</button><button className="sw-btn sw-btn--secondary" onClick={() => setShowCancel(false)} type="button">返回</button></span>
            ) : (
              <button className="sw-btn sw-btn--danger-ghost" onClick={() => setShowCancel(true)} type="button"><Ban size={14} /> 取消排期</button>
            )
          ) : <div />}
        </div>
        <div className="so-modal__footer-right" />
      </div>
    </div>
  );
}
