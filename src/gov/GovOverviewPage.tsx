import { useState, useEffect, useCallback } from "react";
import type { ServiceSession, AnomalyAlert, FollowUpRecord, FamilyFeedback } from "../features/siteOperations/contracts";

/* ── Types for the AuditDetail data (same as GovAuditPage) ── */
type AuditDetailData = {
  session: ServiceSession;
  alerts: AnomalyAlert[];
  followUps: FollowUpRecord[];
  feedback: FamilyFeedback[];
};

/* ── Filter options ── */
type TimePeriod = "today" | "week" | "month" | "all";

const TIME_PERIOD_OPTIONS: Array<{ value: TimePeriod; label: string }> = [
  { value: "today", label: "今日" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "all", label: "全部" },
];

const INSTITUTION_OPTIONS = [
  { id: "all", name: "全部机构" },
  { id: "inst-001", name: "金色年华" },
  { id: "inst-002", name: "康乐居家" },
  { id: "inst-003", name: "夕阳红" },
];

/* ── Anomaly type badge styling map ── */
type AnomalyType = "evidence_missing" | "evidence_abnormal" | "evidence_suspicious" | "violation";

const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  evidence_missing: "证据缺失",
  evidence_abnormal: "证据异常",
  evidence_suspicious: "证据可疑",
  violation: "违规行为",
};

const ANOMALY_TYPE_CSS: Record<AnomalyType, string> = {
  evidence_missing: "gov-anomaly-badge--orange",
  evidence_abnormal: "gov-anomaly-badge--red",
  evidence_suspicious: "gov-anomaly-badge--yellow",
  violation: "gov-anomaly-badge--darkred",
};

/* ── Mock data: Section 2 - service anomalies ── */
interface ServiceAnomalyRow {
  id: string;
  sessionId: string;
  serialNumber: string;
  institution: string;
  worker: string;
  elder: string;
  anomalyType: AnomalyType;
  aiSummary: string;
}

const MOCK_SERVICE_ANOMALIES: ServiceAnomalyRow[] = [
  {
    id: "sa-1",
    sessionId: "sess-mock-001",
    serialNumber: "SVC-2026-0604-001",
    institution: "金色年华",
    worker: "张丽",
    elder: "王阿姨",
    anomalyType: "evidence_missing",
    aiSummary: "服务录音文件缺失，无法核实服务人员是否在场提供服务",
  },
  {
    id: "sa-2",
    sessionId: "sess-mock-002",
    serialNumber: "SVC-2026-0604-002",
    institution: "康乐居家",
    worker: "李明",
    elder: "赵大爷",
    anomalyType: "evidence_abnormal",
    aiSummary: "GPS定位与登记地址偏差超过500米，声纹匹配度仅42%",
  },
  {
    id: "sa-3",
    sessionId: "sess-mock-003",
    serialNumber: "SVC-2026-0605-001",
    institution: "夕阳红",
    worker: "王芳",
    elder: "陈奶奶",
    anomalyType: "evidence_suspicious",
    aiSummary: "蓝牙信标信号在服务中段消失15分钟，可能存在中途离开情况",
  },
  {
    id: "sa-4",
    sessionId: "sess-mock-004",
    serialNumber: "SVC-2026-0605-002",
    institution: "金色年华",
    worker: "刘强",
    elder: "孙爷爷",
    anomalyType: "violation",
    aiSummary: "同一护工在同一时段内出现两条重叠的服务记录，疑似虚报服务",
  },
  {
    id: "sa-5",
    sessionId: "sess-mock-005",
    serialNumber: "SVC-2026-0606-001",
    institution: "康乐居家",
    worker: "陈红",
    elder: "周阿姨",
    anomalyType: "evidence_missing",
    aiSummary: "服务照片未上传，毫米波雷达数据缺失，无法验证服务真实性",
  },
  {
    id: "sa-6",
    sessionId: "sess-mock-006",
    serialNumber: "SVC-2026-0606-002",
    institution: "夕阳红",
    worker: "赵磊",
    elder: "吴大爷",
    anomalyType: "evidence_abnormal",
    aiSummary: "录音内容分析显示服务时长实际不足30分钟，与申报的90分钟严重不符",
  },
];

/* ── Mock data: Section 3 - elder anomalies ── */
interface ElderAnomalyRow {
  id: string;
  sessionId: string;
  serialNumber: string;
  institution: string;
  worker: string;
  elder: string;
  aiSummary: string;
}

const MOCK_ELDER_ANOMALIES: ElderAnomalyRow[] = [
  {
    id: "ea-1",
    sessionId: "sess-mock-007",
    serialNumber: "SVC-2026-0604-003",
    institution: "康乐居家",
    worker: "李明",
    elder: "王阿姨",
    aiSummary: "雷达数据显示参保人在服务期间存在自主活动能力，与申报的II级失能不符",
  },
  {
    id: "ea-2",
    sessionId: "sess-mock-008",
    serialNumber: "SVC-2026-0605-003",
    institution: "夕阳红",
    worker: "赵磊",
    elder: "李大爷",
    aiSummary: "毫米波雷达检测到参保人多次自主起身行走，活动范围超出申报失能等级预期",
  },
  {
    id: "ea-3",
    sessionId: "sess-mock-009",
    serialNumber: "SVC-2026-0606-003",
    institution: "金色年华",
    worker: "张丽",
    elder: "张奶奶",
    aiSummary: "雷达数据与录音综合分析显示参保人具备正常活动能力，与重度失能申报严重不一致",
  },
];

/* ── Helper: count evidence pass (same as GovAuditPage) ── */
function countEvidencePass(ec: ServiceSession["evidenceChain"]): number {
  let c = 0;
  if (ec.gps) c++;
  if (ec.bleBeacon) c++;
  if (ec.voiceprint) c++;
  if (ec.audioRecording) c++;
  if (ec.radarData) c++;
  if (ec.photo) c++;
  return c;
}

/* ── AuditDetail helpers (duplicated from GovAuditPage to avoid cross-import issues) ── */
type AuditTab = "overview" | "worker_check" | "elder_check" | "transcript" | "quality" | "inspection";

const auditTabs: Array<{ id: AuditTab; label: string }> = [
  { id: "overview", label: "服务总揽" },
  { id: "worker_check", label: "服务人员多维核查" },
  { id: "elder_check", label: "长者失能核查" },
  { id: "transcript", label: "录音与对话" },
  { id: "quality", label: "服务质量" },
  { id: "inspection", label: "检查信息" },
];

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */

export function GovOverviewPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [instFilter, setInstFilter] = useState("all");

  // Detail drawer state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<AuditDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const token = localStorage.getItem("gy_auth_token") ?? "";

  // Fetch detail when session selected
  useEffect(() => {
    if (!selectedSessionId) {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/gov/audit/${selectedSessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error("获取详情失败");
        return r.json();
      })
      .then(d => setDetailData(d))
      .catch(() => setDetailData(null))
      .finally(() => setDetailLoading(false));
  }, [selectedSessionId, token]);

  const closeDrawer = useCallback(() => {
    setSelectedSessionId(null);
  }, []);

  // Filter service anomalies by institution
  const filteredServiceAnomalies = MOCK_SERVICE_ANOMALIES.filter(
    row => instFilter === "all" || row.institution === INSTITUTION_OPTIONS.find(o => o.id === instFilter)?.name,
  );

  // Filter elder anomalies by institution
  const filteredElderAnomalies = MOCK_ELDER_ANOMALIES.filter(
    row => instFilter === "all" || row.institution === INSTITUTION_OPTIONS.find(o => o.id === instFilter)?.name,
  );

  // Period subtitle for KPI card
  const periodLabel = TIME_PERIOD_OPTIONS.find(o => o.value === timePeriod)?.label ?? "";

  return (
    <div>
      {/* ── Header ── */}
      <div className="gov-overview-header">
        <h1 className="gov-page-title">审计总揽</h1>
        <div className="gov-overview-filters">
          <label className="gov-overview-filter">
            <span className="gov-overview-filter__label">时间</span>
            <select
              className="gov-audit-toolbar__select"
              value={timePeriod}
              onChange={e => setTimePeriod(e.target.value as TimePeriod)}
            >
              {TIME_PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="gov-overview-filter">
            <span className="gov-overview-filter__label">机构</span>
            <select
              className="gov-audit-toolbar__select"
              value={instFilter}
              onChange={e => setInstFilter(e.target.value)}
            >
              {INSTITUTION_OPTIONS.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ══ Section 1: 服务数据 ══ */}
      <div className="gov-overview-section">
        <h2 className="gov-section__title">服务数据</h2>
        <div className="gov-audit-kpi-row">
          <div className="gov-audit-kpi-card">
            <span className="gov-audit-kpi-card__label">已完成服务</span>
            <span className="gov-audit-kpi-card__value">204</span>
            <span className="gov-audit-kpi-card__sub">{periodLabel}数据</span>
          </div>
          <div className="gov-audit-kpi-card">
            <span className="gov-audit-kpi-card__label">服务参保人数量</span>
            <span className="gov-audit-kpi-card__value">112</span>
          </div>
          <div className="gov-audit-kpi-card">
            <span className="gov-audit-kpi-card__label">六维度交叉核查通过率</span>
            <span className="gov-audit-kpi-card__value gov-audit-kpi-card__value--success">88%</span>
          </div>
          <div className="gov-audit-kpi-card">
            <span className="gov-audit-kpi-card__label">异常服务数量</span>
            <span className="gov-audit-kpi-card__value gov-audit-kpi-card__value--danger">24</span>
          </div>
        </div>
      </div>

      {/* ══ Section 2: 异常与预警 - 服务 ══ */}
      <div className="gov-overview-section">
        <h2 className="gov-section__title">异常与预警 - 服务</h2>
        <div className="gov-anomaly-table">
          <div className="gov-anomaly-table__head">
            <span>异常服务流水号</span>
            <span>服务机构</span>
            <span>服务人员</span>
            <span>参保人(长者)</span>
            <span>异常类型</span>
            <span>AI总结异常信息</span>
          </div>
          {filteredServiceAnomalies.length === 0 ? (
            <div className="gov-anomaly-table__empty">暂无异常记录</div>
          ) : (
            filteredServiceAnomalies.map(row => (
              <div
                key={row.id}
                className="gov-anomaly-table__row"
                onClick={() => setSelectedSessionId(row.sessionId)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && setSelectedSessionId(row.sessionId)}
              >
                <span className="gov-anomaly-table__serial">{row.serialNumber}</span>
                <span className="gov-anomaly-table__text">{row.institution}</span>
                <span className="gov-anomaly-table__text">{row.worker}</span>
                <span className="gov-anomaly-table__text">{row.elder}</span>
                <span>
                  <span className={`gov-anomaly-badge ${ANOMALY_TYPE_CSS[row.anomalyType]}`}>
                    {ANOMALY_TYPE_LABELS[row.anomalyType]}
                  </span>
                </span>
                <span className="gov-anomaly-table__summary">{row.aiSummary}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ══ Section 3: 异常与预警 - 参保人 ══ */}
      <div className="gov-overview-section">
        <h2 className="gov-section__title">异常与预警 - 参保人</h2>
        <div className="gov-anomaly-table">
          <div className="gov-anomaly-table__head">
            <span>异常服务流水号</span>
            <span>服务机构</span>
            <span>服务人员</span>
            <span>参保人(长者)</span>
            <span>异常类型</span>
            <span>AI总结异常信息</span>
          </div>
          {filteredElderAnomalies.length === 0 ? (
            <div className="gov-anomaly-table__empty">暂无异常记录</div>
          ) : (
            filteredElderAnomalies.map(row => (
              <div
                key={row.id}
                className="gov-anomaly-table__row"
                onClick={() => setSelectedSessionId(row.sessionId)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && setSelectedSessionId(row.sessionId)}
              >
                <span className="gov-anomaly-table__serial">{row.serialNumber}</span>
                <span className="gov-anomaly-table__text">{row.institution}</span>
                <span className="gov-anomaly-table__text">{row.worker}</span>
                <span className="gov-anomaly-table__text">{row.elder}</span>
                <span>
                  <span className="gov-anomaly-badge gov-anomaly-badge--red">失能等级可疑</span>
                </span>
                <span className="gov-anomaly-table__summary">{row.aiSummary}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Popup drawer ── */}
      {selectedSessionId && (
        <>
          <div className="sw-scrim" onClick={closeDrawer} />
          <div className="sw-drawer cs-drawer cs-drawer--wide">
            <AuditDetail
              data={detailData}
              loading={detailLoading}
              onClose={closeDrawer}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AuditDetail Panel (reused pattern from GovAuditPage)
   ══════════════════════════════════════════════════════════════════ */

function AuditDetail({
  data,
  loading,
  onClose,
}: {
  data: AuditDetailData | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<AuditTab>("overview");

  if (loading) {
    return (
      <div className="gov-audit-detail">
        <div className="gov-loading">加载详情...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="gov-audit-detail">
        <div className="gov-loading">无法获取详情</div>
      </div>
    );
  }

  const { session } = data;
  const ai = session.aiAssessment;
  const ev = session.elderVerification;
  const ec = session.evidenceChain;
  const ecPassCount = countEvidencePass(ec);
  const ecTotal = 6;

  return (
    <div className="gov-audit-detail">
      <div className="gov-audit-detail__header">
        <h3>审计详情 - {session.serviceObjectName}</h3>
        <button className="gov-audit-detail__close" onClick={onClose} type="button">
          &times;
        </button>
      </div>

      {/* Tab bar */}
      <div className="cs-tab-bar">
        {auditTabs.map(t => (
          <button
            key={t.id}
            className={`cs-tab-bar__item ${activeTab === t.id ? "cs-tab-bar__item--active" : ""}`}
            onClick={() => setActiveTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="gov-audit-detail__body">

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <>
            <div className="gov-basic-info">
              <div className="gov-basic-info__item">
                <span className="gov-basic-info__label">服务日期</span>
                <span className="gov-basic-info__value">{session.serviceDate}</span>
              </div>
              <div className="gov-basic-info__item">
                <span className="gov-basic-info__label">开始时间</span>
                <span className="gov-basic-info__value">
                  {session.startedAt ? formatTime(session.startedAt) : "--"}
                </span>
              </div>
              <div className="gov-basic-info__item">
                <span className="gov-basic-info__label">结束时间</span>
                <span className="gov-basic-info__value">
                  {session.completedAt ? formatTime(session.completedAt) : "--"}
                </span>
              </div>
              <div className="gov-basic-info__item">
                <span className="gov-basic-info__label">服务人员</span>
                <span className="gov-basic-info__value">{session.workerName}</span>
              </div>
              <div className="gov-basic-info__item">
                <span className="gov-basic-info__label">长者</span>
                <span className="gov-basic-info__value">{session.serviceObjectName}</span>
              </div>
              <div className="gov-basic-info__item">
                <span className="gov-basic-info__label">地址</span>
                <span className="gov-basic-info__value">{session.serviceObjectAddress}</span>
              </div>
            </div>

            {session.selectedItems.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2520", marginBottom: 8 }}>
                  服务项目
                </div>
                <div className="gov-service-items">
                  {session.selectedItems
                    .filter(i => i.checked)
                    .map((item, idx) => (
                      <span key={idx} className="gov-service-item-tag">
                        {item.name}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 16px", border: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>服务人员核查</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: ecPassCount === ecTotal ? "#16A34A" : "#DC2626" }}>
                  {ecPassCount === ecTotal ? "全部通过" : "有异常"} <span style={{ fontSize: 13, fontWeight: 400 }}>({ecPassCount}/{ecTotal})</span>
                </div>
              </div>
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 16px", border: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>长者失能核查</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: ev?.status === "pass" ? "#16A34A" : ev?.status === "fail" ? "#DC2626" : "#9CA3AF" }}>
                  {ev ? (ev.status === "pass" ? "一致" : ev.status === "fail" ? "可疑" : "数据不足") : "缺失"}
                </div>
              </div>
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 16px", border: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>AI 质量评分</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: ai && ai.qualityScore >= 80 ? "#16A34A" : ai && ai.qualityScore >= 60 ? "#D97706" : "#DC2626" }}>
                  {ai ? `${ai.qualityScore}分` : "--"}
                </div>
              </div>
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 16px", border: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>风险识别</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {ai && ai.anomalies.length > 0 ? (
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {ai.anomalies.map((a, i) => (
                        <span key={i} style={{ background: "#FEE2E2", color: "#DC2626", borderRadius: 4, padding: "2px 6px", fontSize: 11 }}>{a}</span>
                      ))}
                    </span>
                  ) : (
                    <span style={{ color: "#16A34A" }}>未发现风险</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Worker Check */}
        {activeTab === "worker_check" && (
          <div className="gov-dimension-section">
            <h4 className="gov-dimension-section__title">服务人员核查 ({ecPassCount}/{ecTotal})</h4>
            <DimensionRow status={ec.gps} label="GPS" detail={getGpsDetail(session)} />
            <DimensionRow status={ec.bleBeacon} label="蓝牙星标" detail={getBleDetail(session)} />
            <DimensionRow status={ec.voiceprint} label="声纹" detail={getVoiceprintDetail(session)} />
            <DimensionRow status={ec.audioRecording} label="录音" detail={getAudioDetail(session)} />
            <DimensionRow status={ec.radarData} label="雷达" detail={getRadarDetail(session)} />
            <DimensionRow status={ec.photo} label="照片" detail={getPhotoDetail(session)} />
          </div>
        )}

        {/* Tab 3: Elder Check */}
        {activeTab === "elder_check" && (
          <div className="gov-dimension-section">
            <h4 className="gov-dimension-section__title">老人失能核查</h4>
            <ElderVerificationPanel elderVerification={ev} />
          </div>
        )}

        {/* Tab 4: Transcript */}
        {activeTab === "transcript" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <h4 className="gov-dimension-section__title">ASR语音转文字</h4>
              {session.realtimeData?.transcriptLog && session.realtimeData.transcriptLog.length > 0 ? (
                <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {session.realtimeData.transcriptLog.map((entry, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.6 }}>
                      <span style={{ color: "#A89E96", flexShrink: 0 }}>{formatTime(entry.timestamp)}</span>
                      <span style={{ fontWeight: 600, flexShrink: 0, color: entry.speaker === "worker" ? "#5B6E4E" : entry.speaker === "elder" ? "#8B6914" : "#A89E96" }}>
                        {entry.speaker === "worker" ? "护工" : entry.speaker === "elder" ? "长者" : "未知"}
                      </span>
                      <span style={{ color: "#2D2520" }}>{entry.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#A89E96", fontSize: 13, padding: "16px 0" }}>暂无语音转文字记录</div>
              )}
            </div>
            <div>
              <h4 className="gov-dimension-section__title">音频播放</h4>
              <div style={{ background: "#F5F0EB", borderRadius: 8, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <button type="button" style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #D4C8BC", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>&#9654;</button>
                <div style={{ flex: 1, height: 4, background: "#D4C8BC", borderRadius: 2 }}>
                  <div style={{ width: "0%", height: "100%", background: "#5B6E4E", borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 12, color: "#A89E96" }}>00:00 / {session.actualMinutes ?? "--"}:00</span>
              </div>
            </div>
          </>
        )}

        {/* Tab 5: Quality */}
        {activeTab === "quality" && (
          <>
            {ai ? (
              <>
                <div className="gov-ai-assessment">
                  <div className="gov-ai-assessment__header">
                    <span
                      className={`gov-ai-assessment__score ${ai.qualityScore >= 80 ? "gov-ai-assessment__score--high" : ai.qualityScore >= 60 ? "gov-ai-assessment__score--mid" : "gov-ai-assessment__score--low"}`}
                    >
                      {ai.qualityScore}
                    </span>
                    <div>
                      <h4 className="gov-ai-assessment__title">AI 综合评估</h4>
                      <span style={{ fontSize: 12, color: "#A89E96" }}>
                        项目完成率 {Math.round(ai.itemCompletionRate * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="gov-ai-assessment__summary">{ai.summary}</p>
                  {ai.anomalies.length > 0 && (
                    <div className="gov-ai-assessment__tags">
                      {ai.anomalies.map((a, i) => (
                        <span key={i} className="gov-ai-assessment__tag">{a}</span>
                      ))}
                    </div>
                  )}
                  {ai.recommendations.length > 0 && (
                    <div className="gov-ai-assessment__tags">
                      {ai.recommendations.map((r, i) => (
                        <span key={i} className="gov-ai-assessment__tag gov-ai-assessment__tag--rec">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 16 }}>
                  <h4 className="gov-dimension-section__title">服务项目对比</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6, color: "#2D2520" }}>AI推断项目</div>
                      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, color: "#5A4F46" }}>
                        {session.selectedItems.map((item, i) => (
                          <li key={i}>{item.name}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6, color: "#2D2520" }}>护工申报项目</div>
                      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, color: "#5A4F46" }}>
                        {(session.confirmedItems && session.confirmedItems.length > 0
                          ? session.confirmedItems
                          : session.selectedItems
                        ).map((item, i) => (
                          <li key={i}>{item.name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: "#A89E96", fontSize: 13, padding: "24px 0", textAlign: "center" }}>暂无AI质量评估数据</div>
            )}
          </>
        )}

        {/* Tab 6: Inspection */}
        {activeTab === "inspection" && (
          <div>
            <h4 className="gov-dimension-section__title">飞检记录</h4>
            <div style={{ color: "#A89E96", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
              本次服务未进行飞检
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── DimensionRow ── */

function DimensionRow({
  status,
  label,
  detail,
}: {
  status: boolean;
  label: string;
  detail: string;
}) {
  const icon = status === true ? "✓" : status === false ? "✗" : "—";
  const statusLabel = status === true ? "通过" : status === false ? "未通过" : "缺失";
  const variant = status === true ? "pass" : status === false ? "fail" : "missing";

  return (
    <div className="gov-dimension-row">
      <span className={`gov-dimension-row__icon gov-dimension-row__icon--${variant}`}>
        {icon}
      </span>
      <span className="gov-dimension-row__label">{label}</span>
      <span className={`gov-dimension-row__status gov-dimension-row__status--${variant}`}>
        {statusLabel}
      </span>
      <span className="gov-dimension-row__detail">{detail}</span>
    </div>
  );
}

/* ── ElderVerificationPanel ── */

function ElderVerificationPanel({ elderVerification }: { elderVerification?: ServiceSession["elderVerification"] }) {
  if (!elderVerification) {
    return (
      <div style={{ padding: 16, color: "#A89E96", fontSize: 13 }}>
        暂无老人核查数据
      </div>
    );
  }

  const ev = elderVerification;
  const statusIcon = ev.status === "pass" ? "✓" : ev.status === "fail" ? "✗" : "—";
  const statusLabel = ev.status === "pass" ? "一致" : ev.status === "fail" ? "可疑" : ev.status === "inconclusive" ? "数据不足" : "缺失";
  const statusVariant = ev.status === "pass" ? "pass" : ev.status === "fail" ? "fail" : "missing";

  const mobilityLabels: Record<string, string> = {
    none: "无自主活动",
    minimal: "极少活动",
    moderate: "中度活动",
    normal: "正常活动",
  };

  return (
    <div className="gov-elder-verify-panel">
      <div className="gov-elder-verify-row">
        <span className="gov-elder-verify-row__label">申报失能等级</span>
        <span className="gov-elder-verify-row__value">{ev.declaredDisabilityLevel || "--"}</span>
      </div>
      <div className="gov-elder-verify-row">
        <span className="gov-elder-verify-row__label">观测活动能力</span>
        <span className="gov-elder-verify-row__value">{mobilityLabels[ev.mobilityLevel] ?? ev.mobilityLevel}</span>
      </div>
      <div className="gov-elder-verify-row">
        <span className="gov-elder-verify-row__label">核查结论</span>
        <span className={`gov-elder-verify-status gov-elder-verify-status--${statusVariant}`}>
          {statusIcon} {statusLabel}
        </span>
      </div>
      <div className="gov-elder-verify-row">
        <span className="gov-elder-verify-row__label">自主移动检测</span>
        <span className="gov-elder-verify-row__value">{ev.mobilityDetected ? "是" : "否"}</span>
      </div>
      <div className="gov-elder-verify-row">
        <span className="gov-elder-verify-row__label">雷达数据</span>
        <span className="gov-elder-verify-row__value">{ev.radarDataAvailable ? "可用" : "不可用"}</span>
      </div>

      <div className="gov-elder-heatmap-placeholder">
        <div className="gov-elder-heatmap-placeholder__label">活动热力图</div>
        <div className="gov-elder-heatmap-placeholder__legend">
          <span className="gov-elder-heatmap-legend gov-elder-heatmap-legend--elder">老人</span>
          <span className="gov-elder-heatmap-legend gov-elder-heatmap-legend--worker">护工</span>
        </div>
      </div>

      <div className="gov-elder-timeline-placeholder">
        <div className="gov-elder-timeline-placeholder__label">动态位置回放</div>
        <div className="gov-elder-timeline-bar">
          <div className="gov-elder-timeline-bar__fill" style={{ width: "65%" }} />
        </div>
        <div className="gov-elder-timeline-timestamps">
          <span>09:00</span>
          <span>09:30</span>
          <span>10:00</span>
          <span>10:30</span>
        </div>
      </div>

      {ev.aiAnalysisSummary && (
        <div className="gov-elder-ai-summary">
          <span className="gov-elder-ai-summary__label">AI 分析结论</span>
          <p className="gov-elder-ai-summary__text">{ev.aiAnalysisSummary}</p>
        </div>
      )}
    </div>
  );
}

/* ── Detail Extraction Helpers ── */

function getGpsDetail(session: ServiceSession): string {
  const v = session.verification;
  if (v.gpsMatch === true) return "定位匹配";
  if (v.gpsMatch === false) {
    if (v.gpsWorkerLat && v.gpsElderLat) {
      const dist = estimateDistance(v.gpsWorkerLat, v.gpsWorkerLng ?? 0, v.gpsElderLat, v.gpsElderLng ?? 0);
      return `距离: ${dist}m (不匹配)`;
    }
    return "GPS不匹配";
  }
  return "数据缺失";
}

function getBleDetail(session: ServiceSession): string {
  const v = session.verification;
  if (v.bleBeaconMatch === true) {
    return `已检测${v.bleBeaconId ? ` (${v.bleBeaconId})` : ""}${v.verifiedAt ? ` ${formatTime(v.verifiedAt)}` : ""}`;
  }
  if (v.bleBeaconMatch === false) return "未检测到星标";
  return "数据缺失";
}

function getVoiceprintDetail(session: ServiceSession): string {
  const v = session.verification;
  if (v.voiceprintMatch === true) return "声纹匹配";
  if (v.voiceprintMatch === false) return "声纹不匹配";
  return "数据缺失";
}

function getAudioDetail(session: ServiceSession): string {
  if (session.evidenceChain.audioRecording) {
    const dur = session.actualMinutes ?? session.estimatedMinutes;
    const summary = session.aiAssessment?.summary;
    let text = `时长: ${dur}分钟`;
    if (summary) text += ` - ${summary.slice(0, 60)}${summary.length > 60 ? "..." : ""}`;
    return text;
  }
  return "录音缺失";
}

function getRadarDetail(session: ServiceSession): string {
  if (session.evidenceChain.radarData) return "雷达数据可用";
  return "雷达数据缺失";
}

function getPhotoDetail(session: ServiceSession): string {
  if (session.evidenceChain.photo) {
    return `已上传${session.submittedAt ? ` (${formatTime(session.submittedAt)})` : ""}`;
  }
  return "照片未上传";
}

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return isoStr;
  }
}

function estimateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
