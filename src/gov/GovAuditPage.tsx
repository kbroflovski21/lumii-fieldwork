import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { ServiceSession, AnomalyAlert, FollowUpRecord, FamilyFeedback, ElderVerification } from "../features/siteOperations/contracts";

/* ── Mock filter options ── */

const MOCK_INSTITUTIONS_FILTER = [
  { id: "all", name: "全部机构" },
  { id: "inst-001", name: "金色年华养老服务有限公司" },
  { id: "inst-002", name: "康乐居家养老服务中心" },
  { id: "inst-003", name: "仁爱老年护理服务站" },
];

const MOCK_SITES_FILTER = [
  { id: "all", name: "全部站点" },
  { id: "site-001", name: "翠苑站" },
  { id: "site-002", name: "三墩站" },
  { id: "site-003", name: "古荡站" },
  { id: "site-004", name: "文新站" },
];

type RiskLevel = "high" | "watch" | "normal";
type ComplianceGrade = "A" | "B" | "C" | "D";

type AuditDetailData = {
  session: ServiceSession;
  alerts: AnomalyAlert[];
  followUps: FollowUpRecord[];
  feedback: FamilyFeedback[];
};

/* ── Audit row computed data ── */
type AuditRow = {
  session: ServiceSession;
  institutionName: string;
  siteName: string;
  workerElderCount: number;
  workerElderMax: number;
  durationCompliant: boolean;
  evidencePassCount: number;
  evidenceTotal: number;
  elderVerifyStatus: string;
  complianceGrade: ComplianceGrade;
  riskLevel: RiskLevel;
};

/* ── Site mapping mock ── */
const SITE_MAP: Record<string, string> = {
  "site-001": "阳光社区服务站",
  "site-002": "幸福家园服务站",
  "site-003": "古荡社区服务站",
  "site-004": "文新社区服务站",
};

/* ── Worker elder ratio mock data (workerName -> current elder count) ── */
const WORKER_ELDER_COUNTS: Record<string, number> = {};

function getWorkerElderCount(workerName: string, sessions: ServiceSession[]): number {
  if (WORKER_ELDER_COUNTS[workerName] !== undefined) return WORKER_ELDER_COUNTS[workerName];
  // Derive from unique service objects for this worker in the dataset
  const uniqueElders = new Set(sessions.filter(s => s.workerName === workerName).map(s => s.serviceObjectId));
  let count = uniqueElders.size;
  // Make one worker exceed limit for demo purposes
  if (workerName === "张丽" || count === 0) count = 9;
  else if (count < 3) count = Math.min(count + 3, 8);
  WORKER_ELDER_COUNTS[workerName] = count;
  return count;
}

function getWorkerSiteId(session: ServiceSession): string {
  // Use siteName from session if available, otherwise derive from worker
  const sn = (session as any).siteName;
  if (sn) {
    for (const [id, name] of Object.entries(SITE_MAP)) {
      if (name === sn) return id;
    }
  }
  // Fallback: hash workerId to pick a site
  const hash = session.workerId.charCodeAt(session.workerId.length - 1) % 2;
  return hash === 0 ? "site-001" : "site-002";
}

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

function computeComplianceGrade(
  evidencePass: number,
  evidenceTotal: number,
  elderStatus: string,
  durationOk: boolean,
  ratioOk: boolean,
): ComplianceGrade {
  const allEvidencePass = evidencePass === evidenceTotal;
  const elderOk = elderStatus === "pass" || elderStatus === "missing";
  if (allEvidencePass && elderOk && durationOk && ratioOk) return "A";
  if (evidencePass >= evidenceTotal - 1 && durationOk && ratioOk) return "B";
  if (evidencePass >= evidenceTotal - 2) return "C";
  return "D";
}

function computeRiskLevel(
  evidencePass: number,
  evidenceTotal: number,
  elderStatus: string,
  durationOk: boolean,
  ratioOk: boolean,
): RiskLevel {
  let failures = 0;
  if (evidencePass < evidenceTotal) failures += (evidenceTotal - evidencePass);
  if (elderStatus === "fail") failures += 2;
  if (!durationOk) failures += 1;
  if (!ratioOk) failures += 1;
  if (failures >= 3) return "high";
  if (failures >= 1) return "watch";
  return "normal";
}

function buildAuditRow(session: ServiceSession, allSessions: ServiceSession[]): AuditRow {
  const siteId = getWorkerSiteId(session);
  const siteName = SITE_MAP[siteId] ?? "未知站点";
  const institutionName = "金色年华";
  const workerElderCount = getWorkerElderCount(session.workerName, allSessions);
  const workerElderMax = 8;
  const actualMin = session.actualMinutes ?? session.estimatedMinutes;
  const durationCompliant = actualMin >= 60 && actualMin <= 120;
  const evidencePassCount = countEvidencePass(session.evidenceChain);
  const evidenceTotal = 6;
  const elderStatus = session.elderVerification?.status ?? "missing";
  const ratioOk = workerElderCount <= workerElderMax;
  const complianceGrade = computeComplianceGrade(evidencePassCount, evidenceTotal, elderStatus, durationCompliant, ratioOk);
  const riskLevel = computeRiskLevel(evidencePassCount, evidenceTotal, elderStatus, durationCompliant, ratioOk);

  return {
    session,
    institutionName,
    siteName,
    workerElderCount,
    workerElderMax,
    durationCompliant,
    evidencePassCount,
    evidenceTotal,
    elderVerifyStatus: elderStatus,
    complianceGrade,
    riskLevel,
  };
}

/* ── Mock KPI data ── */
const MOCK_KPI = {
  pendingAudit: 47,
  evidenceAnomalyRate: 12,
  elderVerifyAnomalyRate: 5,
  ratioViolationCount: 2,
  durationComplianceRate: 91,
};

export function GovAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<ServiceSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [workerName, setWorkerName] = useState("");
  const [elderName, setElderName] = useState("");
  const [instFilter, setInstFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState<"" | "high" | "watch" | "normal">("");
  const [gradeFilter, setGradeFilter] = useState<"" | "A" | "B" | "C" | "D">("");
  const [ratioViolationOnly, setRatioViolationOnly] = useState(false);

  // Detail state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    () => searchParams.get("sessionId"),
  );
  const [detailData, setDetailData] = useState<AuditDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const token = localStorage.getItem("gy_auth_token") ?? "";

  const fetchSessions = useCallback(
    (params?: URLSearchParams) => {
      setLoading(true);
      setError("");
      const qs = params ?? new URLSearchParams();
      if (dateFrom) qs.set("dateFrom", dateFrom);
      if (dateTo) qs.set("dateTo", dateTo);

      fetch(`/api/gov/audit/search?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => {
          if (!r.ok) throw new Error("获取数据失败");
          return r.json();
        })
        .then(d => {
          let filtered = d.serviceSessions as ServiceSession[];
          if (workerName) {
            filtered = filtered.filter(s => s.workerName.includes(workerName));
          }
          if (elderName) {
            filtered = filtered.filter(s => s.serviceObjectName.includes(elderName));
          }
          setSessions(filtered);
          setTotal(filtered.length);
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    },
    [dateFrom, dateTo, workerName, elderName, token],
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-select session from URL param
  useEffect(() => {
    const sid = searchParams.get("sessionId");
    if (sid) {
      setSelectedSessionId(sid);
    }
  }, [searchParams]);

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

  const handleRandomAudit = useCallback(() => {
    setLoading(true);
    setError("");
    setSelectedSessionId(null);
    fetch(`/api/gov/audit/random?count=5`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setSessions(d.serviceSessions);
        setTotal(d.serviceSessions.length);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleRowClick = useCallback(
    (session: ServiceSession) => {
      if (selectedSessionId === session.id) {
        setSelectedSessionId(null);
        setSearchParams({});
      } else {
        setSelectedSessionId(session.id);
        setSearchParams({ sessionId: session.id });
      }
    },
    [selectedSessionId, setSearchParams],
  );

  // Build audit rows with computed data
  const auditRows = useMemo(() => {
    return sessions.map(s => buildAuditRow(s, sessions));
  }, [sessions]);

  // Apply auditor-specific filters
  const filteredRows = useMemo(() => {
    let result = auditRows;
    if (riskFilter) result = result.filter(r => r.riskLevel === riskFilter);
    if (gradeFilter) result = result.filter(r => r.complianceGrade === gradeFilter);
    if (ratioViolationOnly) result = result.filter(r => r.workerElderCount > r.workerElderMax);
    return result;
  }, [auditRows, riskFilter, gradeFilter, ratioViolationOnly]);

  return (
    <div>
      <h1 className="gov-page-title">服务审计</h1>
      <p className="gov-page-subtitle">已完成服务全量检索与合规审计</p>

      {/* ── KPI Summary Cards ── */}
      <div className="gov-audit-kpi-row">
        <div className="gov-audit-kpi-card">
          <span className="gov-audit-kpi-card__label">证据链异常率</span>
          <span className={`gov-audit-kpi-card__value ${MOCK_KPI.evidenceAnomalyRate > 10 ? "gov-audit-kpi-card__value--danger" : ""}`}>
            {MOCK_KPI.evidenceAnomalyRate}%
          </span>
        </div>
        <div className="gov-audit-kpi-card">
          <span className="gov-audit-kpi-card__label">失能核查异常率</span>
          <span className="gov-audit-kpi-card__value">{MOCK_KPI.elderVerifyAnomalyRate}%</span>
        </div>
        <div className="gov-audit-kpi-card">
          <span className="gov-audit-kpi-card__label">人员配比违规数</span>
          <span className="gov-audit-kpi-card__value gov-audit-kpi-card__value--danger">{MOCK_KPI.ratioViolationCount}</span>
          <span className="gov-audit-kpi-card__sub">护工超过1:8上限</span>
        </div>
        <div className="gov-audit-kpi-card">
          <span className="gov-audit-kpi-card__label">时长合规率</span>
          <span className="gov-audit-kpi-card__value gov-audit-kpi-card__value--success">{MOCK_KPI.durationComplianceRate}%</span>
          <span className="gov-audit-kpi-card__sub">符合60-120分钟要求</span>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="gov-audit-toolbar">
        <input
          type="date"
          className="gov-audit-toolbar__input"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="起始日期"
        />
        <span style={{ color: "#A89E96" }}>-</span>
        <input
          type="date"
          className="gov-audit-toolbar__input"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="结束日期"
        />
        <select
          className="gov-audit-toolbar__select"
          value={instFilter}
          onChange={e => { setInstFilter(e.target.value); setSiteFilter("all"); }}
        >
          {MOCK_INSTITUTIONS_FILTER.map(inst => (
            <option key={inst.id} value={inst.id}>{inst.name}</option>
          ))}
        </select>
        <select
          className="gov-audit-toolbar__select"
          value={siteFilter}
          onChange={e => setSiteFilter(e.target.value)}
        >
          {MOCK_SITES_FILTER.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
        <select
          className="gov-audit-toolbar__select"
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value as typeof riskFilter)}
        >
          <option value="">风险等级</option>
          <option value="high">高风险</option>
          <option value="watch">关注</option>
          <option value="normal">正常</option>
        </select>
        <select
          className="gov-audit-toolbar__select"
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value as typeof gradeFilter)}
        >
          <option value="">合规评级</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
        <label className="gov-audit-toolbar__toggle">
          <input
            type="checkbox"
            checked={ratioViolationOnly}
            onChange={e => setRatioViolationOnly(e.target.checked)}
          />
          仅显示超标人员
        </label>
        <div className="gov-audit-toolbar__spacer" />
        <button
          className="gov-audit-toolbar__btn gov-audit-toolbar__btn--secondary"
          onClick={handleRandomAudit}
          type="button"
        >
          随机抽查
        </button>
      </div>

      {error && <div className="gov-error">{error}</div>}

      {loading ? (
        <div className="gov-loading">加载中...</div>
      ) : (
        <>
          {/* Results count */}
          <div style={{ fontSize: 13, color: "#A89E96", marginBottom: 8 }}>
            共 {filteredRows.length} 条记录
          </div>

          {/* ── Table ── */}
          <div className="gov-audit-table">
            <div className="gov-audit-table__head gov-audit-table__head--revamp">
              <span>日期</span>
              <span>机构/站点</span>
              <span>长者</span>
              <span>服务人员</span>
              <span>时长</span>
              <span>证据链</span>
              <span>失能核查</span>
              <span>合规评级</span>
              <span>风险标记</span>
            </div>
            {filteredRows.length === 0 ? (
              <div className="gov-audit-table__empty">暂无匹配记录</div>
            ) : (
              filteredRows.map(row => (
                <div key={row.session.id}>
                  <div
                    className="gov-audit-table__row gov-audit-table__row--revamp"
                    onClick={() => handleRowClick(row.session)}
                    data-selected={selectedSessionId === row.session.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && handleRowClick(row.session)}
                  >
                    <span className="gov-audit-table__date">{row.session.serviceDate}</span>
                    <span className="gov-audit-table__name" title={`${row.institutionName}/${row.siteName}`}>
                      {row.institutionName}/{row.siteName.replace("服务站", "")}
                    </span>
                    <span className="gov-audit-table__name">{row.session.serviceObjectName}</span>
                    <span className="gov-audit-table__name">
                      {row.session.workerName}
                      <span className={`gov-audit-ratio ${row.workerElderCount > row.workerElderMax ? "gov-audit-ratio--over" : ""}`}>
                        ({row.workerElderCount}/{row.workerElderMax})
                      </span>
                    </span>
                    <span className={`gov-audit-table__duration ${!row.durationCompliant ? "gov-audit-duration--warn" : ""}`}>
                      {row.session.actualMinutes ?? row.session.estimatedMinutes}分钟
                    </span>
                    <span>
                      <EvidenceCountBadge pass={row.evidencePassCount} total={row.evidenceTotal} />
                    </span>
                    <span>
                      <ElderVerifyIcon status={row.elderVerifyStatus as any} />
                    </span>
                    <span>
                      <ComplianceGradeBadge grade={row.complianceGrade} />
                    </span>
                    <span>
                      <RiskBadge level={row.riskLevel} />
                    </span>
                  </div>

                </div>
              ))
            )}
          </div>

          {/* Popup drawer */}
          {selectedSessionId && (
            <>
              <div className="sw-scrim" onClick={() => { setSelectedSessionId(null); setSearchParams({}); }} />
              <div className="sw-drawer cs-drawer cs-drawer--wide">
                <AuditDetail
                  data={detailData}
                  loading={detailLoading}
                  onClose={() => {
                    setSelectedSessionId(null);
                    setSearchParams({});
                  }}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ── Evidence Count Badge ── */

function EvidenceCountBadge({ pass, total }: { pass: number; total: number }) {
  const cls = pass === total ? "gov-evidence-badge--full" : pass >= total - 2 ? "gov-evidence-badge--partial" : "gov-evidence-badge--low";
  return <span className={`gov-evidence-badge ${cls}`}>{pass}/{total}</span>;
}

/* ── Elder Verify Icon ── */

function ElderVerifyIcon({ status }: { status?: ElderVerification["status"] }) {
  if (!status || status === "missing") {
    return <span className="gov-dim-icon gov-dim-icon--missing" title="失能核查: 数据不足">&mdash;</span>;
  }
  if (status === "pass") {
    return <span className="gov-dim-icon gov-dim-icon--pass" title="失能核查: 一致">&#10003;</span>;
  }
  if (status === "fail") {
    return <span className="gov-dim-icon gov-dim-icon--fail" title="失能核查: 可疑">&#10007;</span>;
  }
  return <span className="gov-dim-icon gov-dim-icon--missing" title="失能核查: 数据不足">?</span>;
}

/* ── Compliance Grade Badge ── */

function ComplianceGradeBadge({ grade }: { grade: ComplianceGrade }) {
  return <span className={`gov-grade-badge gov-grade-badge--${grade}`}>{grade}</span>;
}

/* ── Risk Level Badge ── */

function RiskBadge({ level }: { level: RiskLevel }) {
  if (level === "high") return <span className="gov-risk-badge gov-risk-badge--high">高风险</span>;
  if (level === "watch") return <span className="gov-risk-badge gov-risk-badge--watch">关注</span>;
  return <span className="gov-risk-badge gov-risk-badge--normal">正常</span>;
}

/* ── Audit Detail Panel (tabbed layout) ── */

type AuditTab = "overview" | "worker_check" | "elder_check" | "transcript" | "quality" | "inspection";

const auditTabs: Array<{ id: AuditTab; label: string }> = [
  { id: "overview", label: "服务总揽" },
  { id: "worker_check", label: "服务人员多维核查" },
  { id: "elder_check", label: "长者失能核查" },
  { id: "transcript", label: "录音与对话" },
  { id: "quality", label: "服务质量" },
  { id: "inspection", label: "检查信息" },
];

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

        {/* ═══ Tab 1: 服务总揽 ═══ */}
        {activeTab === "overview" && (
          <>
            {/* Basic Info */}
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

            {/* Service Items */}
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

            {/* Summary cards */}
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

        {/* ═══ Tab 2: 服务人员多维核查 ═══ */}
        {activeTab === "worker_check" && (
          <div className="gov-dimension-section">
            <h4 className="gov-dimension-section__title">服务人员核查 ({ecPassCount}/{ecTotal})</h4>
            <DimensionRow
              status={ec.gps}
              label="GPS"
              detail={getGpsDetail(session)}
            />
            <DimensionRow
              status={ec.bleBeacon}
              label="蓝牙星标"
              detail={getBleDetail(session)}
            />
            <DimensionRow
              status={ec.voiceprint}
              label="声纹"
              detail={getVoiceprintDetail(session)}
            />
            <DimensionRow
              status={ec.audioRecording}
              label="录音"
              detail={getAudioDetail(session)}
            />
            <DimensionRow
              status={ec.radarData}
              label="雷达"
              detail={getRadarDetail(session)}
            />
            <DimensionRow
              status={ec.photo}
              label="照片"
              detail={getPhotoDetail(session)}
            />
          </div>
        )}

        {/* ═══ Tab 3: 长者失能核查 ═══ */}
        {activeTab === "elder_check" && (
          <div className="gov-dimension-section">
            <h4 className="gov-dimension-section__title">老人失能核查</h4>
            <ElderVerificationPanel elderVerification={ev} />
          </div>
        )}

        {/* ═══ Tab 4: 录音与对话 ═══ */}
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

        {/* ═══ Tab 5: 服务质量 ═══ */}
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
                        <span key={i} className="gov-ai-assessment__tag">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                  {ai.recommendations.length > 0 && (
                    <div className="gov-ai-assessment__tags">
                      {ai.recommendations.map((r, i) => (
                        <span key={i} className="gov-ai-assessment__tag gov-ai-assessment__tag--rec">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service item comparison */}
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

        {/* ═══ Tab 6: 检查信息 ═══ */}
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

/* ── Dimension Row Component ── */

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

/* ── Elder Verification Panel ── */

function ElderVerificationPanel({ elderVerification }: { elderVerification?: ElderVerification }) {
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

      {/* Heatmap placeholder */}
      <div className="gov-elder-heatmap-placeholder">
        <div className="gov-elder-heatmap-placeholder__label">
          活动热力图
        </div>
        <div className="gov-elder-heatmap-placeholder__legend">
          <span className="gov-elder-heatmap-legend gov-elder-heatmap-legend--elder">老人</span>
          <span className="gov-elder-heatmap-legend gov-elder-heatmap-legend--worker">护工</span>
        </div>
      </div>

      {/* Timeline playback placeholder */}
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

      {/* AI analysis summary */}
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
  if (v.gpsMatch === true) {
    return "定位匹配";
  }
  if (v.gpsMatch === false) {
    if (v.gpsWorkerLat && v.gpsElderLat) {
      const dist = estimateDistance(
        v.gpsWorkerLat,
        v.gpsWorkerLng ?? 0,
        v.gpsElderLat,
        v.gpsElderLng ?? 0,
      );
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
  if (v.bleBeaconMatch === false) {
    return "未检测到星标";
  }
  return "数据缺失";
}

function getVoiceprintDetail(session: ServiceSession): string {
  const v = session.verification;
  if (v.voiceprintMatch === true) {
    return "声纹匹配";
  }
  if (v.voiceprintMatch === false) {
    return "声纹不匹配";
  }
  return "数据缺失";
}

function getAudioDetail(session: ServiceSession): string {
  if (session.evidenceChain.audioRecording) {
    const dur = session.actualMinutes ?? session.estimatedMinutes;
    const summary = session.aiAssessment?.summary;
    let text = `时长: ${dur}分钟`;
    if (summary) {
      text += ` - ${summary.slice(0, 60)}${summary.length > 60 ? "..." : ""}`;
    }
    return text;
  }
  return "录音缺失";
}

function getRadarDetail(session: ServiceSession): string {
  if (session.evidenceChain.radarData) {
    return "雷达数据可用";
  }
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

function estimateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
