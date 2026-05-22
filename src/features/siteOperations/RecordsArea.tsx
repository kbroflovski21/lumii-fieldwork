import { useEscClose } from "./useEscClose";
import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, ChevronDown, Download, Shield, AlertTriangle, FileText, Headphones, MessageSquare, CheckCircle, Clock, Check, XCircle, MinusCircle, ChevronRight as ChevronRightIcon, Play, MapPin } from "lucide-react";
import type { ServiceRecord, ServiceItem, ServiceRecordsResponse, WorkAreaOperationalState } from "./contracts";
import { statusText } from "./contracts";
import { authFetch } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";

type DrawerMode = { kind: "closed" } | { kind: "view"; record: ServiceRecord };
type DateFilter = "" | "today" | "week" | "month";
type ReviewFilter = "" | ServiceRecord["reviewStatus"];
type ExportFilter = "" | ServiceRecord["exportStatus"];

const dateFilterOptions: Array<{ label: string; value: DateFilter }> = [
  { label: "全部", value: "" }, { label: "今天", value: "today" },
  { label: "本周", value: "week" }, { label: "本月", value: "month" }
];

const reviewFilterOptions: Array<{ label: string; value: ReviewFilter }> = [
  { label: "复核状态", value: "" }, { label: "待复核", value: "needs_review" },
  { label: "已确认", value: "confirmed" }, { label: "信息不完整", value: "info_incomplete" },
  { label: "异常未闭环", value: "exception_open" }
];

const exportFilterOptions: Array<{ label: string; value: ExportFilter }> = [
  { label: "导出状态", value: "" }, { label: "可导出", value: "exportable" },
  { label: "暂不可导出", value: "not_ready" }, { label: "已导出", value: "exported" },
  { label: "带标记导出", value: "exported_with_flags" }
];

function reviewTone(s: string) { return s === "confirmed" ? "success" : s === "exception_open" ? "danger" : "warning"; }
function exportTone(s: string) { return s === "exportable" || s === "exported" ? "success" : s === "exported_with_flags" ? "warning" : "muted"; }

const exceptionTypeLabel: Record<string, string> = {
  late_arrival: "迟到", early_leave: "早退", service_incomplete: "服务不完整", safety_risk: "安全风险", other: "其他"
};

function formatDate(d: string) {
  const date = new Date(`${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
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

export function RecordsArea({ resource, onMutate }: { resource: Resource<ServiceRecordsResponse>; onMutate?: () => void }) {
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("");
  const [exportFilter, setExportFilter] = useState<ExportFilter>("");
  const [viewMode, setViewMode] = useState<"records" | "recordings">("records");
  const [recordings, setRecordings] = useState<any[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [recordingsPage, setRecordingsPage] = useState(1);
  const RECORDINGS_PER_PAGE = 20;
  const [selectedRecording, setSelectedRecording] = useState<any>(null);
  const operationalState = resource.status === "success" ? resource.data.operationalState : undefined;
  const mutationsDisabled = isMutationDisabled(operationalState);

  const records = resource.status === "success" ? resource.data.serviceRecords : [];

  const handleUpdated = useCallback(() => {
    onMutate?.();
    setDrawer({ kind: "closed" });
  }, [onMutate]);

  useEffect(() => {
    if (viewMode !== "recordings") return;
    setRecordingsLoading(true);
    authFetch("/api/recordings")
      .then(r => r.json())
      .then(data => { setRecordings(data.recordings ?? []); setRecordingsLoading(false); })
      .catch(() => setRecordingsLoading(false));
  }, [viewMode]);

  const filtered = records.filter((r) => {
    if (reviewFilter && r.reviewStatus !== reviewFilter) return false;
    if (exportFilter && r.exportStatus !== exportFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(r.serviceObjectName ?? "").toLowerCase().includes(q) && !(r.socialWorkerName ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isLoading = resource.status === "loading" || resource.status === "idle";
  useEscClose(useCallback(() => setDrawer({ kind: "closed" }), []));

  return (
    <>
      <section aria-label="服务记录" className="sw-page">
        <div className="sw-page__inner">
          <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 8, padding: 2, marginBottom: 16 }}>
            <button
              onClick={() => setViewMode("records")}
              style={{ padding: "6px 16px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", background: viewMode === "records" ? "#fff" : "transparent", color: viewMode === "records" ? "#0F172A" : "#64748B", boxShadow: viewMode === "records" ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}
            >服务记录</button>
            <button
              onClick={() => setViewMode("recordings")}
              style={{ padding: "6px 16px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", background: viewMode === "recordings" ? "#fff" : "transparent", color: viewMode === "recordings" ? "#0F172A" : "#64748B", boxShadow: viewMode === "recordings" ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}
            >录音记录</button>
          </div>

          <header className="sw-header">
            <div className="sw-header__title-group">
              <h2 className="sw-header__title">{viewMode === "records" ? "服务记录" : "录音记录"}</h2>
              <p className="sw-header__desc">{viewMode === "records" ? "查看和复核已完成的服务事实，确认归属和导出结算材料" : "查看工牌录音原始数据，管理录音与服务记录的匹配关系"}</p>
            </div>
            {viewMode === "records" && (
              <button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} type="button">
                <Download size={15} /> 导出记录
              </button>
            )}
          </header>

          {viewMode === "records" && (
          <div className="sw-table-container">
            <div className="sw-toolbar">
              <label className="sw-search">
                <Search size={16} />
                <input aria-label="搜索服务记录" onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索服务对象或人员..." value={searchQuery} />
              </label>
              <div className="sw-toolbar__filters">
                <div className="sch-date-btns">
                  {dateFilterOptions.map(o => (
                    <button className={`sch-date-btn ${dateFilter === o.value ? "sch-date-btn--active" : ""}`} key={o.value} onClick={() => setDateFilter(o.value)} type="button">{o.label}</button>
                  ))}
                </div>
                <FilterDropdown onChange={(v) => setReviewFilter(v as ReviewFilter)} options={reviewFilterOptions} value={reviewFilter} />
                <FilterDropdown onChange={(v) => setExportFilter(v as ExportFilter)} options={exportFilterOptions} value={exportFilter} />
              </div>
            </div>

            {operationalState ? <OperationalBanner state={operationalState} /> : null}

            {isLoading ? <div className="sw-empty"><div className="sw-empty__icon"><FileText size={32} /></div><span>服务记录数据加载中...</span></div>
            : resource.status === "error" ? <div className="sw-empty"><div className="sw-empty__icon sw-empty__icon--error"><X size={32} /></div><span>{resource.error}</span></div>
            : filtered.length === 0 ? <div className="sw-empty"><div className="sw-empty__icon"><FileText size={32} /></div><span>{records.length === 0 ? "暂无服务记录" : "没有匹配的记录"}</span></div>
            : <RecordsList records={filtered} selectedId={selectedId} onRowClick={(r) => setSelectedId(r.id)} onRowDoubleClick={(r) => setDrawer({ kind: "view", record: r })} />}
          </div>
          )}

          {viewMode === "recordings" && (
            <div className="sw-table-container">
              {recordingsLoading ? <div className="sw-empty"><div className="sw-empty__icon"><FileText size={32} /></div><span>录音记录加载中...</span></div>
              : recordings.length === 0 ? <div className="sw-empty"><div className="sw-empty__icon"><FileText size={32} /></div><span>暂无录音记录</span></div>
              : (
                <>
                  <div className="sw-table rec-table" role="table">
                    <div className="sw-table__head rec-table__head" role="row">
                      <span role="columnheader">时间</span>
                      <span role="columnheader">服务人员</span>
                      <span role="columnheader">服务对象</span>
                      <span role="columnheader">工牌</span>
                      <span role="columnheader">时长</span>
                      <span role="columnheader">匹配状态</span>
                    </div>
                    {recordings
                      .slice((recordingsPage - 1) * RECORDINGS_PER_PAGE, recordingsPage * RECORDINGS_PER_PAGE)
                      .map((rec: any) => {
                        const statusLabels: Record<string, string> = { processing: "处理中", pending_match: "待匹配", matched: "已匹配", unmatched: "未匹配" };
                        const statusTones: Record<string, string> = { matched: "success", unmatched: "danger", pending_match: "info", processing: "warning" };
                        const t = new Date(rec.startedAt);
                        const dur = rec.durationSeconds ?? 0;
                        const workerColor = avatarColor(rec.workerName ?? "?");
                        return (
                          <div className="sw-table__row rec-table__row" key={rec.id}
                            data-selected={selectedRecording?.id === rec.id}
                            onClick={() => setSelectedRecording(rec)}
                            onDoubleClick={() => setSelectedRecording(rec)}
                            role="row" style={{ cursor: "pointer" }}>
                            <div role="cell" className="sch-cell-datetime">
                              <span className="sch-cell-date">{formatDate(t.toISOString().slice(0, 10))}</span>
                              <span className="sch-cell-time">{t.getHours().toString().padStart(2,"0")}:{t.getMinutes().toString().padStart(2,"0")} · {Math.floor(dur/60)}分{dur%60}秒</span>
                            </div>
                            <div role="cell" className="sw-table__cell-name">
                              <div className="sw-avatar" style={{ background: workerColor.bg, color: workerColor.text, width: 28, height: 28, fontSize: 12, borderRadius: 8 }}>{getInitials(rec.workerName ?? "?")}</div>
                              <span>{rec.workerName ?? <span className="sw-text-muted">未知</span>}</span>
                            </div>
                            <div role="cell">{rec.matchedServiceObjectName ?? <span className="sw-text-muted">—</span>}</div>
                            <div role="cell"><span className="badges-code-tag">{rec.badgeId}</span></div>
                            <div role="cell">{Math.floor(dur/60)}分{dur%60}秒</div>
                            <div role="cell"><span className="sw-status-badge" data-tone={statusTones[rec.status] ?? "warning"}>{statusLabels[rec.status] ?? rec.status}</span></div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="sw-mobile-list">
                    {recordings
                      .slice((recordingsPage - 1) * RECORDINGS_PER_PAGE, recordingsPage * RECORDINGS_PER_PAGE)
                      .map((rec: any) => {
                        const statusLabels: Record<string, string> = { processing: "处理中", pending_match: "待匹配", matched: "已匹配", unmatched: "未匹配" };
                        const statusTones: Record<string, string> = { matched: "success", unmatched: "danger", pending_match: "info", processing: "warning" };
                        const t = new Date(rec.startedAt);
                        const dur = rec.durationSeconds ?? 0;
                        return (
                          <button className="sw-mobile-card" key={rec.id} onClick={() => setSelectedRecording(rec)} type="button">
                            <div className="sw-mobile-card__top">
                              <span className="sch-cell-date">{formatDate(t.toISOString().slice(0, 10))} {t.getHours().toString().padStart(2,"0")}:{t.getMinutes().toString().padStart(2,"0")}</span>
                              <span className="sw-status-badge" data-tone={statusTones[rec.status] ?? "warning"}>{statusLabels[rec.status] ?? rec.status}</span>
                            </div>
                            <div className="sw-mobile-card__info"><span>{rec.workerName ?? "未知"}</span></div>
                            <div className="sw-mobile-card__meta">
                              <span>{rec.badgeId}</span>
                              <span>{Math.floor(dur/60)}分{dur%60}秒</span>
                              {rec.matchedServiceObjectName && <span>{rec.matchedServiceObjectName}</span>}
                            </div>
                          </button>
                        );
                      })}
                  </div>

                  {recordings.length > RECORDINGS_PER_PAGE && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "12px 0" }}>
                      <button className="sw-btn sw-btn--secondary" disabled={recordingsPage <= 1} onClick={() => setRecordingsPage(p => p - 1)}>上一页</button>
                      <span style={{ fontSize: 13, color: "#64748B", lineHeight: "32px" }}>{recordingsPage} / {Math.ceil(recordings.length / RECORDINGS_PER_PAGE)}</span>
                      <button className="sw-btn sw-btn--secondary" disabled={recordingsPage >= Math.ceil(recordings.length / RECORDINGS_PER_PAGE)} onClick={() => setRecordingsPage(p => p + 1)}>下一页</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {drawer.kind !== "closed" ? (
          <>
            <button aria-label="关闭抽屉遮罩" className="sw-scrim" onClick={() => setDrawer({ kind: "closed" })} type="button" />
            <RecordDrawer record={drawer.record} data={resource.status === "success" ? resource.data : undefined} mutationsDisabled={mutationsDisabled} onClose={() => setDrawer({ kind: "closed" })} onUpdated={handleUpdated} />
          </>
        ) : null}

        {selectedRecording && (
          <>
            <button aria-label="关闭录音详情" className="sw-scrim" onClick={() => setSelectedRecording(null)} type="button" />
            <RecordingDrawer recording={selectedRecording} onClose={() => setSelectedRecording(null)} />
          </>
        )}
      </section>
    </>
  );
}

function FilterDropdown({ onChange, options, value }: { onChange: (v: string) => void; options: Array<{ label: string; value: string }>; value: string }) {
  return <div className="sw-filter"><select className={value ? "sw-filter--active" : ""} onChange={(e) => onChange(e.target.value)} value={value}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={14} /></div>;
}

function OperationalBanner({ state }: { state: WorkAreaOperationalState }) {
  if (state.unavailableMessage) return <div className="sw-banner sw-banner--danger" role="status"><Shield size={16} /><div><strong>服务记录暂不可用</strong><span>{state.unavailableMessage}</span></div></div>;
  if (state.permission === "read_only") return <div className="sw-banner sw-banner--warning" role="status"><Shield size={16} /><div><strong>只读模式</strong><span>可查看数据，复核和导出操作已禁用。</span></div></div>;
  if (state.permission === "restricted") return <div className="sw-banner sw-banner--warning" role="status"><Shield size={16} /><div><strong>权限受限</strong><span>原始音频不可播放，敏感信息已隐藏。</span></div></div>;
  return null;
}

function RecordsList({ records, selectedId, onRowClick, onRowDoubleClick }: {
  records: ServiceRecord[]; selectedId: string | null;
  onRowClick: (r: ServiceRecord) => void;
  onRowDoubleClick: (r: ServiceRecord) => void;
}) {
  const sorted = [...records].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));

  return (
    <>
      <div className="sw-table rec-table" role="table">
        <div className="sw-table__head rec-table__head" role="row">
          <span role="columnheader">日期/时间</span>
          <span role="columnheader">服务对象</span>
          <span role="columnheader">服务人员</span>
          <span role="columnheader">服务内容</span>
          <span role="columnheader">工牌</span>
          <span role="columnheader">复核状态</span>
          <span role="columnheader">导出状态</span>
        </div>
        {sorted.map((r) => {
          const color = avatarColor(r.serviceObjectName ?? "?");
          return (
            <div className="sw-table__row rec-table__row" data-selected={selectedId === r.id} key={r.id}
              data-exception={r.exceptionTags.length > 0}
              onClick={() => onRowClick(r)} onDoubleClick={() => onRowDoubleClick(r)} role="row">
              <div role="cell" className="sch-cell-datetime">
                <span className="sch-cell-date">{formatDate(r.serviceDate)}</span>
                <span className="sch-cell-time">{r.startTime}-{r.endTime} · {r.durationMinutes}分钟</span>
              </div>
              <div role="cell" className="sw-table__cell-name">
                <div className="sw-avatar" style={{ background: color.bg, color: color.text, width: 28, height: 28, fontSize: 12, borderRadius: 8 }}>{getInitials(r.serviceObjectName ?? "?")}</div>
                <span className="sch-obj-name">{r.serviceObjectName ?? "待关联"}</span>
                {r.assignmentConfidence < 0.7 ? <AlertTriangle size={12} className="sch-risk-icon" /> : null}
              </div>
              <div role="cell">{r.socialWorkerName ?? <span className="sw-text-muted">待确认</span>}</div>
              <div role="cell">
                <span className="sw-tag">{r.serviceProject ?? "未标注"}</span>
                {r.serviceItems && r.serviceItems.length > 0 ? (() => {
                  const biz = r.serviceItems.filter(i => i.category === "business");
                  return <small className="rec-item-count">{biz.filter(i => i.status === "completed").length}/{biz.length}项</small>;
                })() : null}
              </div>
              <div role="cell"><span className="badges-code-tag">{r.badgeId.replace("badge-", "FW-")}</span></div>
              <div role="cell"><span className="sw-status-badge" data-tone={reviewTone(r.reviewStatus)}>{statusText[r.reviewStatus] ?? r.reviewStatus}</span></div>
              <div role="cell">
                <span className="sw-status-badge" data-tone={exportTone(r.exportStatus)}>{statusText[r.exportStatus] ?? r.exportStatus}</span>
                {r.missingFields.length > 0 ? <small className="rec-missing-count">{r.missingFields.length}缺</small> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sw-mobile-list">
        {sorted.map((r) => (
          <button className="sw-mobile-card" key={r.id} onClick={() => onRowDoubleClick(r)} type="button">
            <div className="sw-mobile-card__top">
              <span className="sch-cell-date">{formatDate(r.serviceDate)} {r.startTime}-{r.endTime}</span>
              <span className="sw-status-badge" data-tone={reviewTone(r.reviewStatus)}>{statusText[r.reviewStatus]}</span>
            </div>
            <div className="sw-mobile-card__info"><strong>{r.serviceObjectName} · {r.serviceProject}</strong></div>
            <div className="sw-mobile-card__meta">
              <span>{r.socialWorkerName ?? "待确认"}</span>
              <span>{r.durationMinutes}分钟</span>
              <span className="sw-status-badge" data-tone={exportTone(r.exportStatus)} style={{ fontSize: 10, padding: "1px 5px" }}>{statusText[r.exportStatus]}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

type RecTab = "sop" | "audio" | "gps";

export function RecordDrawer({ record: r, data, mutationsDisabled, onClose, onUpdated }: {
  record: ServiceRecord; data?: ServiceRecordsResponse; mutationsDisabled: boolean;
  onClose: () => void; onUpdated: () => void;
}) {
  const [activeTab, setActiveTab] = useState<RecTab>("sop");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);
  const color = avatarColor(r.serviceObjectName ?? "?");
  const audioRestricted = data?.operationalState.permission === "restricted";
  const audio = data?.audioAssets.find(a => a.id === r.audioAssetId);
  const transcript = data?.transcripts?.find((t: any) => t.id === r.transcriptId);
  const canReview = r.reviewStatus !== "confirmed" && !mutationsDisabled;
  const items = r.serviceItems ?? [];
  const businessItems = items.filter(i => i.category === "business");
  const processItems = items.filter(i => i.category === "process");
  const bizCompleted = businessItems.filter(i => i.status === "completed").length;
  const bizAbnormal = businessItems.filter(i => i.status === "abnormal").length;
  const procCompleted = processItems.filter(i => i.status === "completed").length;
  const procAbnormal = processItems.filter(i => i.status === "abnormal").length;
  const tone = reviewTone(r.reviewStatus);

  const itemStatusIcon = (status: string) => {
    if (status === "completed") return <Check size={15} className="rec-si-icon rec-si-icon--done" />;
    if (status === "abnormal") return <XCircle size={15} className="rec-si-icon rec-si-icon--abnormal" />;
    if (status === "skipped") return <MinusCircle size={15} className="rec-si-icon rec-si-icon--skipped" />;
    return <Clock size={15} className="rec-si-icon rec-si-icon--pending" />;
  };

  const tabs: Array<{ id: RecTab; label: string }> = [
    { id: "sop", label: "SOP 检查" },
    { id: "audio", label: "录音 · 对话" },
    { id: "gps", label: "GPS 定位" },
  ];

  return (
    <div className="so-modal rec-modal--no-footer" role="dialog" aria-label="服务记录详情">
      {/* ── Header Banner ── */}
      <div className="rec-modal__header" data-tone={tone}>
        <button aria-label="关闭" className="so-modal__close sch-event__banner-close" onClick={onClose} type="button"><X size={18} /></button>
        <div className="rec-modal__header-top">
          <div className="sw-avatar" style={{ background: color.bg, color: color.text, width: 36, height: 36, fontSize: 14 }}>{getInitials(r.serviceObjectName ?? "?")}</div>
          <div className="rec-modal__header-info">
            <h2 className="rec-modal__title">{r.serviceProject ?? "服务"} · {r.serviceObjectName ?? "待关联"}</h2>
            <p className="rec-modal__subtitle">{formatDate(r.serviceDate)} {r.startTime}-{r.endTime} · {r.durationMinutes}分钟 · {r.socialWorkerName ?? "待确认"} · <span className="badges-code-tag" style={{ fontSize: 11 }}>{r.badgeId.replace("badge-", "FW-")}</span></p>
          </div>
        </div>
        <div className="rec-modal__header-bottom">
          <div className="rec-modal__header-tags">
            <span className="rec-modal__header-tag" data-ok={procCompleted === processItems.length && procAbnormal === 0}>
              流程 {procAbnormal > 0 ? "⚠" : "✓"} {procCompleted}/{processItems.length}
            </span>
            <span className="rec-modal__header-tag" data-ok={bizAbnormal === 0}>
              服务 {businessItems.length}项{bizAbnormal > 0 ? `(${bizAbnormal}异常)` : ""}
            </span>
          </div>
          <div className="rec-modal__review-action">
            {showReviewConfirm ? (
              <span className="rec-modal__review-confirm">
                <span>确认标记为已复核？</span>
                <button className="sw-btn sw-btn--secondary" onClick={() => setShowReviewConfirm(false)} type="button" style={{ height: 28, fontSize: 12, padding: "0 10px" }}>取消</button>
                <button className="rec-modal__review-confirm-btn" onClick={onUpdated} type="button">确认通过</button>
              </span>
            ) : canReview ? (
              <button className="rec-modal__review-btn" onClick={() => setShowReviewConfirm(true)} type="button">
                <CheckCircle size={14} /> 复核通过
              </button>
            ) : (
              <span className="rec-modal__reviewed-badge"><Check size={12} /> 已复核</span>
            )}
            <span className="sw-status-badge sw-status-badge--inline" data-tone={tone}>{statusText[r.reviewStatus] ?? r.reviewStatus}</span>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="so-modal__tabs" role="tablist">
        {tabs.map(tab => (
          <button className="so-modal__tab" data-active={activeTab === tab.id} key={tab.id} onClick={() => setActiveTab(tab.id)} role="tab" type="button">
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="so-modal__content">
        {activeTab === "sop" && (
          <>
            {/* Service summary */}
            {(r.generatedSummary || r.structuredSummary) ? (() => {
              let summaryText = r.generatedSummary || "";
              if (!summaryText && r.structuredSummary) {
                try {
                  const parsed = typeof r.structuredSummary === "string" ? JSON.parse(r.structuredSummary) : r.structuredSummary;
                  summaryText = parsed.summary || parsed.detail?.summary || r.structuredSummary;
                } catch { summaryText = r.structuredSummary; }
              }
              return (
                <div className="so-tab-section">
                  <h4 className="so-tab-section-title">服务摘要</h4>
                  <p style={{ color: "#374151", fontSize: 13, lineHeight: 1.6, margin: 0, background: "#F9FAFB", padding: "10px 14px", borderRadius: 8, border: "1px solid #E5E7EB" }}>{summaryText}</p>
                </div>
              );
            })() : null}

            {/* Process SOP */}
            {processItems.length > 0 && (
              <div className="so-tab-section">
                <h4 className="so-tab-section-title">
                  流程规范
                  <span className="rec-si-stats">
                    <span className="rec-si-stats__done">{procCompleted}通过</span>
                    {procAbnormal > 0 ? <span className="rec-si-stats__abnormal">{procAbnormal}异常</span> : null}
                    <span className="rec-si-stats__total">共{processItems.length}项</span>
                  </span>
                </h4>
                <div className="rec-si-list">
                  {processItems.map(item => (
                    <ServiceItemRow key={item.id} item={item} expanded={expandedItemId === item.id} onToggle={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)} itemStatusIcon={itemStatusIcon} />
                  ))}
                </div>
              </div>
            )}

            {/* Business SOP */}
            {businessItems.length > 0 && (
              <div className="so-tab-section">
                <h4 className="so-tab-section-title">
                  服务内容
                  <span className="rec-si-stats">
                    <span className="rec-si-stats__done">{bizCompleted}完成</span>
                    {bizAbnormal > 0 ? <span className="rec-si-stats__abnormal">{bizAbnormal}异常</span> : null}
                    <span className="rec-si-stats__total">共{businessItems.length}项</span>
                  </span>
                </h4>
                <div className="rec-si-list">
                  {businessItems.map(item => (
                    <ServiceItemRow key={item.id} item={item} expanded={expandedItemId === item.id} onToggle={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)} itemStatusIcon={itemStatusIcon} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "audio" && (
          <>
            <div className="so-tab-section">
              <h4 className="so-tab-section-title">完整录音</h4>
              {audio && !audioRestricted ? (
                <>
                  <div className="rec-audio-player">
                    <Headphones size={16} />
                    <audio controls preload="none" src={audio.playbackUrl} style={{ flex: 1, height: 36 }}>音频播放不可用</audio>
                    <small className="sw-text-muted">{Math.floor(audio.durationSeconds / 60)}:{String(audio.durationSeconds % 60).padStart(2, "0")}</small>
                    <a className="rec-download-btn" href={audio.playbackUrl} download title="下载录音"><Download size={14} /></a>
                  </div>
                </>
              ) : (
                <p className="sw-text-muted">{audioRestricted ? "音频受限" : "暂无录音"}</p>
              )}
            </div>

            {transcript && transcript.segments && transcript.segments.length > 0 ? (
              <div className="so-tab-section">
                <h4 className="so-tab-section-title">
                  完整对话记录 ({transcript.segments.length}条)
                  <button className="rec-download-btn" onClick={() => {
                    const text = transcript.segments.map((seg: any) => {
                      const name = seg.speaker === "social_worker" ? (r.socialWorkerName ?? "服务人员") : (r.serviceObjectName ?? "服务对象");
                      const m = Math.floor(seg.startSecond / 60);
                      const s = seg.startSecond % 60;
                      return `[${m}:${String(s).padStart(2, "0")}] ${name}: ${seg.text}`;
                    }).join("\n");
                    const blob = new Blob([text], { type: "text/plain" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `对话记录_${r.serviceObjectName}_${r.serviceDate}.txt`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }} type="button" title="下载对话文本" style={{ marginLeft: 8 }}><Download size={13} /></button>
                </h4>
                <div className="rec-chat">
                  {transcript.segments.map((seg: any, i: number) => {
                    const isWorker = seg.speaker === "social_worker";
                    const name = isWorker ? (r.socialWorkerName ?? "服务人员") : (r.serviceObjectName ?? "服务对象");
                    const mins = Math.floor(seg.startSecond / 60);
                    const secs = seg.startSecond % 60;
                    const ac = avatarColor(name);
                    return (
                      <div className={`rec-chat__row ${isWorker ? "rec-chat__row--left" : "rec-chat__row--right"}`} key={i}>
                        {isWorker ? <div className="rec-chat__avatar" style={{ background: ac.bg, color: ac.text }}>{getInitials(name)}</div> : null}
                        <div className={`rec-chat__bubble ${isWorker ? "rec-chat__bubble--worker" : "rec-chat__bubble--object"}`}>
                          <div className="rec-chat__meta">
                            <span className="rec-chat__name" style={{ color: isWorker ? "#4F46E5" : "#059669" }}>{name}</span>
                            <span className="rec-chat__time">{mins}:{String(secs).padStart(2, "0")}</span>
                          </div>
                          <p className="rec-chat__text">{seg.text}</p>
                        </div>
                        {!isWorker ? <div className="rec-chat__avatar" style={{ background: ac.bg, color: ac.text }}>{getInitials(name)}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}

        {activeTab === "gps" && (
          <GpsSection locationEvidence={r.locationEvidence} />
        )}
      </div>
    </div>
  );
}

function ServiceItemRow({ item, expanded, onToggle, itemStatusIcon }: {
  item: ServiceItem; expanded: boolean; onToggle: () => void;
  itemStatusIcon: (s: string) => React.ReactNode;
}) {
  return (
    <div className="rec-si" data-status={item.status}>
      <button className="rec-si__row" onClick={onToggle} type="button">
        {itemStatusIcon(item.status)}
        <span className="rec-si__seq">{item.seq}</span>
        <span className="rec-si__title">{item.title}</span>
        {item.startTime ? (
          <span className="rec-si__time">{item.startTime}-{item.endTime}{item.audioDurationSeconds ? ` · ${item.audioDurationSeconds}s` : ""}</span>
        ) : null}
        <ChevronRightIcon size={14} className={`rec-si__chevron ${expanded ? "rec-si__chevron--open" : ""}`} />
      </button>
      {expanded ? (
        <div className="rec-si__detail">
          {item.transcript ? (
            <div className="rec-si__evidence">
              <MessageSquare size={14} />
              <p>{item.transcript}</p>
            </div>
          ) : null}
          {item.audioDurationSeconds ? (
            <div className="rec-si__evidence rec-si__audio">
              <Headphones size={14} />
              <audio controls preload="none" src="/mock-audio.wav" style={{ height: 30, flex: 1 }}>音频</audio>
              <small>{item.audioDurationSeconds}秒</small>
            </div>
          ) : null}
          {item.abnormalReason ? (
            <div className="rec-si__abnormal-reason">
              <AlertTriangle size={14} />
              <p>{item.abnormalReason}</p>
            </div>
          ) : null}
          {!item.transcript && !item.audioDurationSeconds && !item.abnormalReason ? (
            <p className="sw-text-muted" style={{ fontSize: 12, margin: 0 }}>暂无证据记录</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GpsSection({ locationEvidence }: { locationEvidence?: ServiceRecord["locationEvidence"] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    if (!locationEvidence?.startPoint) return;

    import("leaflet").then((L) => {
      document.getElementById("leaflet-css") ?? (() => {
        const link = document.createElement("link");
        link.id = "leaflet-css"; link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link); return link;
      })();

      const { latitude: lat, longitude: lng } = locationEvidence.startPoint!;
      const map = L.map(mapRef.current!, { zoomControl: true }).setView([lat, lng], 16);
      L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", { subdomains: ["1", "2", "3", "4"], attribution: "&copy; 高德地图" }).addTo(map);
      L.marker([lat, lng]).addTo(map).bindPopup("签到位置").openPopup();
      if (locationEvidence.endPoint) {
        L.marker([locationEvidence.endPoint.latitude, locationEvidence.endPoint.longitude]).addTo(map).bindPopup("签退位置");
      }
      leafletRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    });

    return () => { if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; } };
  }, []);

  return (
    <div className="so-tab-section">
      <h4 className="so-tab-section-title">GPS 定位</h4>
      {locationEvidence?.startPoint ? (
        <>
          <div className="rec-gps-info">
            <div className="rec-gps-info__item"><dt>签到</dt><dd>{locationEvidence.startPoint.latitude}, {locationEvidence.startPoint.longitude}{locationEvidence.startPoint.accuracyMeters ? ` (±${locationEvidence.startPoint.accuracyMeters}m)` : ""}</dd></div>
            {locationEvidence.endPoint ? <div className="rec-gps-info__item"><dt>签退</dt><dd>{locationEvidence.endPoint.latitude}, {locationEvidence.endPoint.longitude}</dd></div> : null}
            <div className="rec-gps-info__item"><dt>地址匹配</dt><dd><span className="sw-status-badge" data-tone={locationEvidence.addressMatched ? "success" : "warning"}>{locationEvidence.addressMatched ? "已匹配" : "需核实"}</span></dd></div>
          </div>
          <div className="rec-gps-map rec-gps-map--always" ref={mapRef} />
        </>
      ) : <p className="sw-text-muted">暂无定位数据</p>}
    </div>
  );
}

function RecordingDrawer({ recording: rec, onClose }: { recording: any; onClose: () => void }) {
  const dur = rec.durationSeconds ?? 0;
  useEscClose(onClose);

  return (
    <div className="so-modal so-modal--view" role="dialog" aria-label="录音详情">
      <div className="so-modal__summary">
        <div className="so-modal__summary-main">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Headphones size={18} style={{ color: "#0052CC" }} />
          </div>
          <div className="so-modal__summary-name">
            <h3>{rec.workerName ?? "录音"} · {rec.badgeId}</h3>
            <span className="so-modal__summary-demo">{new Date(rec.startedAt).toLocaleString("zh-CN")} · {Math.floor(dur / 60)}分{dur % 60}秒</span>
          </div>
          <div className="so-modal__summary-actions">
            <button aria-label="关闭" className="so-modal__close" onClick={onClose} type="button"><X size={18} /></button>
          </div>
        </div>
      </div>

      <div className="so-modal__content" style={{ padding: 20 }}>
        <div className="so-tab-section">
          <h4 className="so-tab-section-title">基本信息</h4>
          <dl className="so-overview-grid">
            <div className="so-overview-item"><dt>服务人员</dt><dd>{rec.workerName ?? "—"}</dd></div>
            <div className="so-overview-item"><dt>工牌</dt><dd><span className="badges-code-tag">{rec.badgeId}</span></dd></div>
            <div className="so-overview-item"><dt>时间</dt><dd>{new Date(rec.startedAt).toLocaleString("zh-CN")}</dd></div>
            <div className="so-overview-item"><dt>时长</dt><dd>{Math.floor(dur / 60)}分{dur % 60}秒</dd></div>
            {rec.matchedServiceObjectName && <div className="so-overview-item"><dt>服务对象</dt><dd>{rec.matchedServiceObjectName}</dd></div>}
            {rec.matchReason && <div className="so-overview-item"><dt>匹配原因</dt><dd>{rec.matchReason} ({Math.round((rec.matchConfidence ?? 0) * 100)}%)</dd></div>}
          </dl>
        </div>

        {rec.audioUrl && (
          <div className="so-tab-section">
            <h4 className="so-tab-section-title">录音</h4>
            <div className="rec-audio-player">
              <Headphones size={16} />
              <audio controls preload="auto" src={rec.audioUrl} style={{ flex: 1, height: 36 }} />
              <a href={rec.audioUrl} download className="rec-audio-download">下载</a>
            </div>
          </div>
        )}

        {rec.aiSummary && (
          <div className="so-tab-section">
            <h4 className="so-tab-section-title">AI 摘要</h4>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "#334155", background: "#F8FAFC", padding: 14, borderRadius: 10 }}>{rec.aiSummary}</div>
          </div>
        )}

        {rec.transcriptText && (
          <div className="so-tab-section">
            <h4 className="so-tab-section-title">对话记录</h4>
            <div style={{ background: "#F8FAFC", padding: 14, borderRadius: 10, maxHeight: 400, overflowY: "auto", lineHeight: 1.8 }}>
              {Array.isArray(rec.transcriptSegments) && rec.transcriptSegments.length > 0
                ? rec.transcriptSegments.map((seg: any, i: number) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    {seg.speaker && <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, marginRight: 4, background: seg.speaker === "社工" || seg.speaker?.includes("0") ? "rgba(96,165,250,.15)" : "rgba(52,211,153,.15)", color: seg.speaker === "社工" || seg.speaker?.includes("0") ? "#3B82F6" : "#10B981" }}>{seg.speaker}</span>}
                    <span style={{ fontSize: 13 }}>{seg.text}</span>
                  </div>
                ))
                : <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{rec.transcriptText}</div>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
