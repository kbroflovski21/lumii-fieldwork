import { useEscClose } from "../../shared/hooks/useEscClose";
import { formatDateWithDay, formatWindow } from "../../shared/utils/dateTimeUtils";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { AvatarInitial } from "../../shared/components/AvatarInitial";
import { ConfirmAction } from "../../shared/components/ConfirmAction";
import { EmptyState } from "../../shared/components/EmptyState";
import { useState, useCallback, useEffect, useRef } from "react";
import { X, List, Calendar, MapPin, AlertTriangle, ChevronLeft, ChevronRight as ChevronRightIcon, Maximize2, Minimize2, Edit3 } from "lucide-react";
import { ListToolbar } from "../../shared/components/ListToolbar";
import { OperationalBanner } from "../../shared/components/OperationalBanner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DetailPageShell } from "../../shared/DetailPageShell";
import { AddressMap } from "../../shared/AddressMap";
import type { ServiceScheduleOccurrence, ServiceSchedulesResponse } from "./contracts";
import { statusText } from "./contracts";
import { siteOperationsApi, authFetch } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";
import { useSite } from "../../auth/SiteContext";
import { useSiteOpsData } from "../../layouts/SiteOperationsLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useSetDetailEntity } from "../../shared/DetailPageContext";

type ScheduleView = "list" | "calendar" | "map";

function scheduleTone(status: string): string {
  if (status === "completed") return "success";
  if (status === "scheduled" || status === "assigned" || status === "adjusted") return "accent";
  if (status === "in_progress") return "info";
  if (status === "unassigned") return "warning";
  return "muted";
}

type DrawerMode = { kind: "closed" } | { kind: "view"; schedule: ServiceScheduleOccurrence };

export function SchedulesArea({ resource: resourceProp, onMutate: onMutateProp }: { resource?: Resource<ServiceSchedulesResponse>; onMutate?: () => void } = {}) {
  const ctxData = useSiteOpsData();
  const resource = resourceProp ?? ctxData.serviceSchedules;
  const onMutate = onMutateProp ?? ctxData.refetch;
  const { id: routeId } = useParams();
  const setDetailEntity = useSetDetailEntity();
  const navigate = useNavigate();
  const [view, setView] = useState<ScheduleView>("list");
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [searchQuery, setSearchQuery] = useState("");
  type DatePreset = "" | "today" | "week" | "month";
  const [dateFilter, setDateFilter] = useState<DatePreset>("");
  const [statusFilters, setStatusFilters] = useState<string[]>(["unassigned", "scheduled", "in_progress"]);
  const statusRef = useRef<HTMLDivElement>(null);
  const [statusDropOpen, setStatusDropOpen] = useState(false);

  useEffect(() => {
    if (!statusDropOpen) return;
    const handler = (e: MouseEvent) => { if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusDropOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusDropOpen]);

  const dateFilterOptions: Array<{ label: string; value: DatePreset }> = [
    { label: "全部", value: "" }, { label: "今天", value: "today" },
    { label: "本周", value: "week" }, { label: "本月", value: "month" },
  ];

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

  const closeDrawer = useCallback(() => { navigate("/schedules"); }, [navigate]);

  const handleUpdated = useCallback(() => {
    onMutate?.();
    navigate("/schedules");
  }, [onMutate, navigate]);

  // URL -> drawer sync
  useEffect(() => {
    if (routeId) {
      const sch = schedules.find(s => s.id === routeId);
      if (sch) setDrawer({ kind: "view", schedule: sch });
    } else {
      setDrawer({ kind: "closed" });
    }
  }, [routeId, schedules]);

  useEffect(() => {
    if (routeId && drawer.kind === "view") {
      setDetailEntity({ entityType: "schedule", entityId: routeId, entityName: drawer.schedule.serviceProject });
    } else {
      setDetailEntity(null);
    }
    return () => setDetailEntity(null);
  }, [routeId, drawer, setDetailEntity]);

  const filtered = schedules.filter((s) => {
    if (view !== "calendar") {
      if (dateFilter) {
        const today = new Date().toISOString().slice(0, 10);
        if (dateFilter === "today" && s.serviceDate !== today) return false;
        if (dateFilter === "week") {
          const now = new Date();
          const ws = new Date(now); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
          const we = new Date(ws); we.setDate(we.getDate() + 6);
          if (s.serviceDate < ws.toISOString().slice(0, 10) || s.serviceDate > we.toISOString().slice(0, 10)) return false;
        }
        if (dateFilter === "month") {
          const ym = new Date().toISOString().slice(0, 7);
          if (!s.serviceDate.startsWith(ym)) return false;
        }
      }
      if (statusFilters.length > 0 && !statusFilters.includes(s.status)) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.serviceObjectName.toLowerCase().includes(q) && !(s.addressSnapshot ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isLoading = resource.status === "loading" || resource.status === "idle";
  useEscClose(useCallback(() => { closeDrawer(); }, [closeDrawer]));

  if (drawer.kind !== "closed") {
    return <ScheduleDrawer schedule={drawer.schedule} mutationsDisabled={mutationsDisabled} onClose={closeDrawer} onUpdated={handleUpdated} />;
  }

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
            <ListToolbar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="搜索长者或地址..."
              filters={<>
                {view !== "calendar" && (
                  <div className="sch-date-btns">
                    {dateFilterOptions.map(o => (
                      <button className={`sch-date-btn ${dateFilter === o.value ? "sch-date-btn--active" : ""}`} key={o.value} onClick={() => setDateFilter(o.value)} type="button">{o.label}</button>
                    ))}
                  </div>
                )}
                <div className="sw-filter" ref={statusRef}>
                  <select className={statusFilters.length > 0 ? "sw-filter--active" : ""} onMouseDown={(e) => { e.preventDefault(); setStatusDropOpen(!statusDropOpen); }} value="" readOnly>
                    <option>{statusLabel}</option>
                  </select>
                  {statusDropOpen && <StatusDropdown anchorRef={statusRef} options={statusOptions} selected={statusFilters} onToggle={toggleStatus} onClear={() => { setStatusFilters([]); setStatusDropOpen(false); }} />}
                </div>
              </>}
            />

            {operationalState ? <OperationalBanner state={operationalState} resourceLabel="服务排期" readOnlyHint="可查看数据，调整和取消操作已禁用。" /> : null}

            {isLoading ? <EmptyState icon={Calendar} description="服务排期数据加载中..." />
            : resource.status === "error" ? <EmptyState icon={X} description={resource.error} isError />
            : filtered.length === 0 ? <EmptyState icon={Calendar} description={schedules.length === 0 ? "暂无服务排期" : "没有匹配的排期"} />
            : view === "calendar" ? <CalendarView schedules={filtered} onSelect={(s) => navigate(`/schedules/${s.id}`)} />
            : view === "map" ? <MapView schedules={filtered} onSelect={(s) => navigate(`/schedules/${s.id}`)} />
            : <ListView schedules={filtered} selectedId={selectedId} onRowClick={(s) => navigate(`/schedules/${s.id}`)} />}
          </div>
        </div>
      </section>
    </>
  );
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
          return (
            <div className="sw-table__row sch-table__row" data-selected={selectedId === s.id} data-exception={s.planExceptionApplied} data-status={s.status} key={s.id}
              onClick={() => onRowClick(s)} role="row">
              <div role="cell" className="sch-cell-datetime">
                <span className="sch-cell-date">{formatDateWithDay(s.serviceDate)}</span>
                <span className="sch-cell-time">{formatWindow(s)}</span>
              </div>
              <div role="cell" className="sw-table__cell-name">
                <AvatarInitial name={s.serviceObjectName} size="sm" />
                <div className="sw-name-group">
                  <span className="sch-obj-name">{s.serviceObjectName}</span>
                  {s.riskTags.length > 0 ? <small className="sch-risk-icon">⚠</small> : null}
                </div>
              </div>
              <div role="cell">{s.assignedSocialWorkerName ?? <span className="sw-text-muted">未分配</span>}</div>
              <div role="cell"><span className="sw-tag">{s.serviceProject}</span></div>
              <div role="cell" className="so-cell-address">{s.addressSnapshot}</div>
              <div role="cell"><StatusBadge tone={scheduleTone(s.status)}>{statusText[s.status] ?? s.status}</StatusBadge></div>
            </div>
          );
        })}
      </div>

      <div className="sw-mobile-list">
        {schedules.map((s) => (
          <button className="sw-mobile-card" key={s.id} onClick={() => onRowClick(s)} type="button">
            <div className="sw-mobile-card__top">
              <span className="sch-cell-date">{formatDateWithDay(s.serviceDate)}</span>
              <StatusBadge tone={scheduleTone(s.status)}>{statusText[s.status] ?? s.status}</StatusBadge>
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

  const title = mode === "day" ? formatDateWithDay(fmtKey(baseDate))
    : mode === "week" ? `${formatDateWithDay(fmtKey(days[0]))} — ${formatDateWithDay(fmtKey(days[days.length - 1]))}`
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
              <small style="color:#6B7280">${formatDateWithDay(s.serviceDate)} · ${formatWindow(s)} · ${s.assignedSocialWorkerName ?? "未分配"}</small>
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
                <span>{s.serviceObjectName} · {s.serviceProject} · {formatDateWithDay(s.serviceDate)}</span>
                <StatusBadge tone={scheduleTone(s.status)} style={{ fontSize: 11, padding: "2px 6px" }}>{statusText[s.status]}</StatusBadge>
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
  const [showMap, setShowMap] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [editingWorker, setEditingWorker] = useState(false);
  const [adjStartDate, setAdjStartDate] = useState<Date | null>(null);
  const [adjEndDate, setAdjEndDate] = useState<Date | null>(null);
  const [adjWorker, setAdjWorker] = useState(s.assignedSocialWorkerId ?? "");
  const [workerSearch, setWorkerSearch] = useState("");
  const [workerOptions, setWorkerOptions] = useState<Array<{ id: string; name: string }>>([]);
  const { currentSite } = useSite();

  useEffect(() => {
    const siteId = currentSite?.id;
    const url = siteId ? `/api/social-workers?siteId=${siteId}` : "/api/social-workers";
    authFetch(url).then(r => r.json()).then(data => {
      setWorkerOptions((data.socialWorkers ?? []).map((w: any) => ({ id: w.id, name: w.name })));
    }).catch(() => {});
  }, [currentSite?.id]);

  const canAdjust = s.status !== "completed" && s.status !== "cancelled";
  const tone = scheduleTone(s.status);

  const startEditTime = () => {
    const startH = parseInt(s.timeWindow?.start ?? "09", 10);
    const startM = parseInt((s.timeWindow?.start ?? "09:00").split(":")[1] ?? "0", 10);
    const endH = parseInt(s.timeWindow?.end ?? "11", 10);
    const endM = parseInt((s.timeWindow?.end ?? "11:00").split(":")[1] ?? "0", 10);
    const d = new Date(s.serviceDate + "T00:00:00");
    const sd = new Date(d); sd.setHours(startH, startM);
    const ed = new Date(d); ed.setHours(endH, endM);
    setAdjStartDate(sd);
    setAdjEndDate(ed);
    setEditingTime(true);
  };

  const handleSaveTime = async () => {
    if (!adjStartDate || !adjEndDate) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const serviceDate = `${adjStartDate.getFullYear()}-${pad(adjStartDate.getMonth() + 1)}-${pad(adjStartDate.getDate())}`;
    const timeWindow = {
      start: `${pad(adjStartDate.getHours())}:${pad(adjStartDate.getMinutes())}`,
      end: `${pad(adjEndDate.getHours())}:${pad(adjEndDate.getMinutes())}`,
    };
    try {
      await siteOperationsApi.updateServiceScheduleOccurrence(s.id, { serviceDate, timeWindow });
      onUpdated();
    } catch { /* noop */ }
    setEditingTime(false);
  };

  const startEditWorker = () => {
    setAdjWorker(s.assignedSocialWorkerId ?? "");
    setWorkerSearch("");
    setEditingWorker(true);
  };

  const handleSaveWorker = async () => {
    try {
      await siteOperationsApi.updateServiceScheduleOccurrence(s.id, { assignedSocialWorkerId: adjWorker || undefined });
      onUpdated();
    } catch { /* noop */ }
    setEditingWorker(false);
  };

  const handleCancel = async () => {
    try {
      await siteOperationsApi.updateServiceScheduleOccurrence(s.id, { status: "cancelled" });
      onUpdated();
    } catch { /* noop */ }
  };

  const historyItems = ((s as any).adjustmentHistory ?? []) as Array<{ action: string; detail: string; operatorName: string; adjustedAt: string }>;

  const cancelAction = canAdjust && !mutationsDisabled ? (
    <ConfirmAction label="取消排期" onConfirm={handleCancel} buttonStyle={{ height: 28, fontSize: 12 }} />
  ) : undefined;

  const filteredWorkers = workerSearch
    ? workerOptions.filter(w => w.name.toLowerCase().includes(workerSearch.toLowerCase()))
    : workerOptions;

  return (
    <DetailPageShell parentLabel="服务排期" parentPath="/schedules" title={`${s.serviceProject} · ${formatDateWithDay(s.serviceDate)}`} actions={cancelAction}>
      <div className="dp-card">
        <div className="dp-card__body">
          <div className="dp-section">
            <div className="dp-section__head">
              <h4 className="dp-section__title">排期详情</h4>
            </div>
            <dl className="dp-fields">
              {/* 长者 */}
              <div className="dp-field"><dt>长者</dt><dd><strong>{s.serviceObjectName}</strong>{s.riskTags.length > 0 && s.riskTags.map(t => <span key={t} className="so-risk-tag" style={{ marginLeft: 6 }}><AlertTriangle size={11} /> {t}</span>)}</dd></div>

              {/* 服务人员 — floating popover edit */}
              <div className="dp-field dp-field--editable"><dt style={{ display: "flex", alignItems: "center", gap: 4 }}>服务人员{canAdjust && !mutationsDisabled && !editingWorker && <button className="dp-section__edit-btn" onClick={startEditWorker} type="button" title="改派"><Edit3 size={12} /></button>}</dt><dd>
                <strong>{s.assignedSocialWorkerName ?? <span className="sw-text-muted">待分配</span>}</strong>
                {editingWorker && (
                  <div className="dp-field-popover">
                    <input placeholder="搜索服务人员..." value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} style={{ height: 32, borderRadius: 6, border: "1px solid var(--site-line)", padding: "0 8px", fontSize: 13 }} />
                    <select value={adjWorker} onChange={e => setAdjWorker(e.target.value)} size={Math.min(filteredWorkers.length + 1, 6)} style={{ borderRadius: 6, border: "1px solid var(--site-line)", padding: 4, fontSize: 13 }}>
                      <option value="">未分配</option>
                      {filteredWorkers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <div className="dp-field-popover__actions">
                      <button className="sw-btn sw-btn--secondary" style={{ height: 26, fontSize: 11 }} onClick={() => setEditingWorker(false)} type="button">取消</button>
                      <button className="sw-btn sw-btn--primary" style={{ height: 26, fontSize: 11 }} onClick={handleSaveWorker} type="button">保存</button>
                    </div>
                  </div>
                )}
              </dd></div>

              {/* 服务时间 — floating popover edit with react-datepicker */}
              <div className="dp-field dp-field--editable"><dt style={{ display: "flex", alignItems: "center", gap: 4 }}>服务时间{canAdjust && !mutationsDisabled && !editingTime && <button className="dp-section__edit-btn" onClick={startEditTime} type="button" title="调整时间"><Edit3 size={12} /></button>}</dt><dd>
                {`${formatDateWithDay(s.serviceDate)} ${formatWindow(s)}`}
                {editingTime && (
                  <div className="dp-field-popover" style={{ minWidth: 340 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <label style={{ fontSize: 12, color: "var(--site-muted)" }}>开始
                        <DatePicker
                          selected={adjStartDate}
                          onChange={(d: Date | null) => {
                            setAdjStartDate(d);
                            if (d && adjEndDate && d > adjEndDate) {
                              const end = new Date(d); end.setHours(d.getHours() + 2); setAdjEndDate(end);
                            }
                          }}
                          showTimeSelect timeIntervals={30}
                          dateFormat="yyyy-MM-dd HH:mm" timeFormat="HH:mm"
                          className="dp-datepicker-input"
                          popperPlacement="bottom-start"
                        />
                      </label>
                      <label style={{ fontSize: 12, color: "var(--site-muted)" }}>结束
                        <DatePicker
                          selected={adjEndDate}
                          onChange={(d: Date | null) => setAdjEndDate(d)}
                          showTimeSelect timeIntervals={30}
                          dateFormat="yyyy-MM-dd HH:mm" timeFormat="HH:mm"
                          className="dp-datepicker-input"
                          popperPlacement="bottom-start"
                        />
                      </label>
                    </div>
                    <div className="dp-field-popover__actions">
                      <button className="sw-btn sw-btn--secondary" style={{ height: 26, fontSize: 11 }} onClick={() => setEditingTime(false)} type="button">取消</button>
                      <button className="sw-btn sw-btn--primary" style={{ height: 26, fontSize: 11 }} onClick={handleSaveTime} type="button">保存</button>
                    </div>
                  </div>
                )}
              </dd></div>

              {/* 服务项目 */}
              <div className="dp-field"><dt>服务项目</dt><dd><span className="sw-tag">{s.serviceProject}</span></dd></div>
              {/* 来源 */}
              <div className="dp-field"><dt>来源</dt><dd>{s.source === "service_plan" ? "周期计划" : "按次服务"}</dd></div>
              {/* 状态 */}
              <div className="dp-field"><dt>状态</dt><dd><StatusBadge tone={tone}>{statusText[s.status] ?? s.status}</StatusBadge></dd></div>

              {/* 服务地点 — with inline expanding map */}
              <div className="dp-field dp-field--full"><dt>服务地点</dt><dd>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <strong>{s.addressSnapshot}</strong>
                  {s.addressSnapshot && (
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2, display: "flex" }} onClick={() => setShowMap(!showMap)} type="button" title="查看地图">
                      <MapPin size={14} />
                    </button>
                  )}
                </span>
                {showMap && s.addressSnapshot && (
                  <div style={{ marginTop: 8, border: "1px solid var(--site-line)", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--site-card)", borderBottom: "1px solid var(--site-line)" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--site-text)" }}>地图位置 · {s.addressSnapshot}</span>
                      <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: 2, display: "flex" }} onClick={() => setShowMap(false)} type="button"><X size={14} /></button>
                    </div>
                    <AddressMap address={s.addressSnapshot} />
                  </div>
                )}
              </dd></div>

              {/* 备注/关联记录 */}
              <div className="dp-field"><dt>{s.serviceRecordId ? "关联记录" : "备注"}</dt><dd>{s.serviceRecordId ?? s.notes ?? "—"}</dd></div>
            </dl>
          </div>

          {/* 调整历史 */}
          {historyItems.length > 0 ? (
            <div className="dp-section">
              <div className="dp-section__head"><h4 className="dp-section__title">调整历史 ({historyItems.length})</h4></div>
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
      </div>
    </DetailPageShell>
  );
}

function StatusDropdown({ anchorRef, options, selected, onToggle, onClear }: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const rect = anchorRef.current?.getBoundingClientRect();
  const style: React.CSSProperties = rect
    ? { position: "fixed", top: rect.bottom + 4, left: rect.left, zIndex: 9999 }
    : { position: "absolute", top: "100%", left: 0, zIndex: 9999 };

  return (
    <div className="sw-filter__dropdown" style={style}>
      {options.map(opt => (
        <label key={opt.value} className="sw-filter__option">
          <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => onToggle(opt.value)} />
          <span>{opt.label}</span>
        </label>
      ))}
      {selected.length > 0 && (
        <button className="sw-filter__clear" type="button" onClick={onClear}>清除筛选</button>
      )}
    </div>
  );
}
