import { useState, useEffect, useCallback, useMemo } from "react";
import type { Institution, AnomalyAlert } from "../features/siteOperations/contracts";

/* ── Mock Data ── */

const MOCK_INSTITUTIONS: Institution[] = [
  {
    id: "inst-001",
    name: "金色年华养老服务有限公司",
    type: "direct",
    licenseNumber: "浙养老证字[2024]001号",
    address: "杭州市西湖区文三西路128号",
    siteCount: 3,
    workerCount: 28,
    elderCount: 156,
    evidencePassRate: 87.5,
    elderVerifyPassRate: 92.3,
    anomalyRate: 3.2,
    qualityScore: 88,
    sites: [
      { id: "site-001", name: "翠苑站", address: "杭州市西湖区翠苑一区58号", workerCount: 10, elderCount: 52, evidencePassRate: 91.2, elderVerifyPassRate: 94.1 },
      { id: "site-002", name: "三墩站", address: "杭州市西湖区三墩镇振华路12号", workerCount: 9, elderCount: 48, evidencePassRate: 85.6, elderVerifyPassRate: 90.5 },
      { id: "site-003", name: "古荡站", address: "杭州市西湖区古荡新村西区3幢", workerCount: 9, elderCount: 56, evidencePassRate: 86.0, elderVerifyPassRate: 92.0 },
    ],
  },
  {
    id: "inst-002",
    name: "康乐居家养老服务中心",
    type: "franchise",
    licenseNumber: "浙养老证字[2024]028号",
    address: "杭州市拱墅区湖墅南路88号",
    siteCount: 2,
    workerCount: 18,
    elderCount: 102,
    evidencePassRate: 79.8,
    elderVerifyPassRate: 85.6,
    anomalyRate: 5.8,
    qualityScore: 76,
    sites: [
      { id: "site-004", name: "文新站", address: "杭州市拱墅区文晖路55号", workerCount: 10, elderCount: 58, evidencePassRate: 82.1, elderVerifyPassRate: 87.3 },
      { id: "site-005", name: "半山站", address: "杭州市拱墅区半山路166号", workerCount: 8, elderCount: 44, evidencePassRate: 76.5, elderVerifyPassRate: 83.2 },
    ],
  },
  {
    id: "inst-003",
    name: "仁爱老年护理服务站",
    type: "franchise",
    licenseNumber: "浙养老证字[2024]045号",
    address: "杭州市上城区凤起东路189号",
    siteCount: 2,
    workerCount: 15,
    elderCount: 88,
    evidencePassRate: 83.2,
    elderVerifyPassRate: 89.1,
    anomalyRate: 4.1,
    qualityScore: 82,
    sites: [
      { id: "site-006", name: "凤起站", address: "杭州市上城区凤起东路200号", workerCount: 8, elderCount: 50, evidencePassRate: 85.0, elderVerifyPassRate: 91.0 },
      { id: "site-007", name: "城站站", address: "杭州市上城区城站路78号", workerCount: 7, elderCount: 38, evidencePassRate: 80.5, elderVerifyPassRate: 86.5 },
    ],
  },
];

const MOCK_ANOMALIES: AnomalyAlert[] = [
  { id: "a1", institutionId: "inst-002", institutionName: "康乐居家养老服务中心", sessionId: "s1", type: "gps_mismatch", severity: "high", title: "GPS偏离较大", description: "服务人员定位距老人住址超过500m", detectedAt: "2026-06-07T09:30:00Z", status: "pending" },
  { id: "a2", institutionId: "inst-002", institutionName: "康乐居家养老服务中心", sessionId: "s2", type: "duration_abnormal", severity: "medium", title: "服务时长异常", description: "实际服务时长仅15分钟，远低于计划45分钟", detectedAt: "2026-06-07T10:15:00Z", status: "pending" },
  { id: "a3", institutionId: "inst-003", institutionName: "仁爱老年护理服务站", sessionId: "s3", type: "missing_evidence", severity: "medium", title: "证据缺失", description: "录音和照片均未上传", detectedAt: "2026-06-06T14:20:00Z", status: "pending" },
  { id: "a4", institutionId: "inst-001", institutionName: "金色年华养老服务有限公司", sessionId: "s4", type: "voiceprint_mismatch", severity: "high", title: "声纹不匹配", description: "检测到的声纹与注册服务人员不一致", detectedAt: "2026-06-06T11:00:00Z", status: "verified" },
];

const MOCK_MONTHLY_TREND = [
  { month: "1月", rate: 82 },
  { month: "2月", rate: 84 },
  { month: "3月", rate: 81 },
  { month: "4月", rate: 86 },
  { month: "5月", rate: 85 },
  { month: "6月", rate: 88 },
];

const TYPE_LABELS: Record<string, string> = {
  gps_mismatch: "GPS不匹配",
  voiceprint_mismatch: "声纹不匹配",
  duration_abnormal: "时长异常",
  missing_evidence: "证据缺失",
  pattern_detected: "模式异常",
  quality_low: "质量低",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};

export function GovInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("gy_auth_token") ?? "";
    setLoading(true);
    fetch("/api/gov/institutions", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error("获取数据失败");
        return r.json();
      })
      .then(d => setInstitutions(d.institutions ?? d))
      .catch(() => {
        // Fallback to mock data
        setInstitutions(MOCK_INSTITUTIONS);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRowClick = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  // Cross-institution comparison data
  const comparisonData = useMemo(() => {
    return institutions.map(inst => ({
      name: inst.name.length > 8 ? inst.name.slice(0, 8) + "..." : inst.name,
      fullName: inst.name,
      evidencePassRate: inst.evidencePassRate,
      elderVerifyPassRate: inst.elderVerifyPassRate,
      anomalyRate: inst.anomalyRate,
      qualityScore: inst.qualityScore,
    }));
  }, [institutions]);

  if (loading) {
    return <div className="gov-loading">加载中...</div>;
  }

  if (error) {
    return <div className="gov-error">{error}</div>;
  }

  return (
    <div>
      <h1 className="gov-page-title">机构与站点</h1>
      <p className="gov-page-subtitle">跨机构横向对比与下钻管理</p>

      {/* Cross-institution comparison chart */}
      <div className="gov-section">
        <h2 className="gov-section__title">机构证据通过率对比</h2>
        <div className="gov-inst-comparison">
          <div className="gov-inst-comparison__chart">
            {comparisonData.map((item, i) => {
              const barHeight = Math.max(8, (item.evidencePassRate / 100) * 140);
              const barClass =
                item.evidencePassRate >= 85
                  ? "gov-inst-bar--good"
                  : item.evidencePassRate >= 75
                    ? "gov-inst-bar--ok"
                    : "gov-inst-bar--bad";
              return (
                <div key={i} className="gov-inst-bar-group" title={item.fullName}>
                  <span className="gov-inst-bar-value">{item.evidencePassRate}%</span>
                  <div
                    className={`gov-inst-bar ${barClass}`}
                    style={{ height: `${barHeight}px` }}
                  />
                  <span className="gov-inst-bar-label">{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Institution list table */}
      <div className="gov-section">
        <h2 className="gov-section__title">机构列表</h2>
        <div className="gov-inst-table">
          <div className="gov-inst-table__head">
            <span>机构名称</span>
            <span>类型</span>
            <span>站点数</span>
            <span>员工数</span>
            <span>长者数</span>
            <span>证据通过率</span>
            <span>老人核查率</span>
            <span>异常率</span>
            <span>质量评分</span>
          </div>
          {institutions.length === 0 ? (
            <div className="gov-inst-table__empty">暂无机构数据</div>
          ) : (
            institutions.map(inst => (
              <div key={inst.id}>
                <div
                  className="gov-inst-table__row"
                  onClick={() => handleRowClick(inst.id)}
                  data-selected={expandedId === inst.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && handleRowClick(inst.id)}
                >
                  <span className="gov-inst-table__name">{inst.name}</span>
                  <span>
                    <span className={`gov-inst-type-badge gov-inst-type-badge--${inst.type}`}>
                      {inst.type === "direct" ? "直营" : "加盟"}
                    </span>
                  </span>
                  <span>{inst.siteCount}</span>
                  <span>{inst.workerCount}</span>
                  <span>{inst.elderCount}</span>
                  <span className={inst.evidencePassRate >= 85 ? "gov-rate--good" : inst.evidencePassRate >= 75 ? "gov-rate--ok" : "gov-rate--bad"}>
                    {inst.evidencePassRate}%
                  </span>
                  <span className={inst.elderVerifyPassRate >= 90 ? "gov-rate--good" : inst.elderVerifyPassRate >= 80 ? "gov-rate--ok" : "gov-rate--bad"}>
                    {inst.elderVerifyPassRate}%
                  </span>
                  <span className={inst.anomalyRate <= 3 ? "gov-rate--good" : inst.anomalyRate <= 5 ? "gov-rate--ok" : "gov-rate--bad"}>
                    {inst.anomalyRate}%
                  </span>
                  <span className={inst.qualityScore >= 85 ? "gov-rate--good" : inst.qualityScore >= 75 ? "gov-rate--ok" : "gov-rate--bad"}>
                    {inst.qualityScore}
                  </span>
                </div>

                {/* Expanded detail */}
                {expandedId === inst.id && (
                  <InstitutionDetail
                    institution={inst}
                    onClose={() => setExpandedId(null)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Institution Detail Panel ── */

function InstitutionDetail({
  institution,
  onClose,
}: {
  institution: Institution;
  onClose: () => void;
}) {
  const anomalies = MOCK_ANOMALIES.filter(a => a.institutionId === institution.id);

  return (
    <div className="gov-inst-detail">
      <div className="gov-inst-detail__header">
        <h3>{institution.name} - 详细信息</h3>
        <button className="gov-audit-detail__close" onClick={onClose} type="button">
          &times;
        </button>
      </div>

      <div className="gov-inst-detail__body">
        {/* Basic Info */}
        <div className="gov-basic-info">
          <div className="gov-basic-info__item">
            <span className="gov-basic-info__label">机构类型</span>
            <span className="gov-basic-info__value">
              <span className={`gov-inst-type-badge gov-inst-type-badge--${institution.type}`}>
                {institution.type === "direct" ? "直营" : "加盟"}
              </span>
            </span>
          </div>
          <div className="gov-basic-info__item">
            <span className="gov-basic-info__label">许可证号</span>
            <span className="gov-basic-info__value">{institution.licenseNumber}</span>
          </div>
          <div className="gov-basic-info__item">
            <span className="gov-basic-info__label">地址</span>
            <span className="gov-basic-info__value">{institution.address}</span>
          </div>
          <div className="gov-basic-info__item">
            <span className="gov-basic-info__label">证据通过率</span>
            <span className="gov-basic-info__value">{institution.evidencePassRate}%</span>
          </div>
          <div className="gov-basic-info__item">
            <span className="gov-basic-info__label">老人核查通过率</span>
            <span className="gov-basic-info__value">{institution.elderVerifyPassRate}%</span>
          </div>
          <div className="gov-basic-info__item">
            <span className="gov-basic-info__label">质量评分</span>
            <span className="gov-basic-info__value">{institution.qualityScore}</span>
          </div>
        </div>

        {/* Sites sub-table */}
        <div className="gov-inst-sites-section">
          <h4 className="gov-dimension-section__title">下属站点</h4>
          <div className="gov-inst-sites-table">
            <div className="gov-inst-sites-table__head">
              <span>站点名称</span>
              <span>地址</span>
              <span>员工数</span>
              <span>长者数</span>
              <span>证据通过率</span>
              <span>老人核查率</span>
            </div>
            {institution.sites.map(site => (
              <div key={site.id} className="gov-inst-sites-table__row">
                <span className="gov-inst-table__name">{site.name}</span>
                <span className="gov-inst-sites-table__addr">{site.address}</span>
                <span>{site.workerCount}</span>
                <span>{site.elderCount}</span>
                <span className={site.evidencePassRate >= 85 ? "gov-rate--good" : site.evidencePassRate >= 75 ? "gov-rate--ok" : "gov-rate--bad"}>
                  {site.evidencePassRate}%
                </span>
                <span className={site.elderVerifyPassRate >= 90 ? "gov-rate--good" : site.elderVerifyPassRate >= 80 ? "gov-rate--ok" : "gov-rate--bad"}>
                  {site.elderVerifyPassRate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly trend placeholder */}
        <div className="gov-inst-trend-section">
          <h4 className="gov-dimension-section__title">月度趋势</h4>
          <div className="gov-inst-trend-chart">
            <div className="gov-inst-trend-chart__bars">
              {MOCK_MONTHLY_TREND.map((point, i) => {
                const barHeight = Math.max(8, (point.rate / 100) * 120);
                const barClass =
                  point.rate >= 85
                    ? "gov-trend-chart__bar--good"
                    : point.rate >= 75
                      ? "gov-trend-chart__bar--ok"
                      : "gov-trend-chart__bar--bad";
                return (
                  <div key={i} className="gov-trend-chart__bar-group">
                    <span className="gov-trend-chart__value">{point.rate}%</span>
                    <div
                      className={`gov-trend-chart__bar ${barClass}`}
                      style={{ height: `${barHeight}px` }}
                    />
                    <span className="gov-trend-chart__label">{point.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent anomalies */}
        <div className="gov-inst-anomalies-section">
          <h4 className="gov-dimension-section__title">近期异常</h4>
          {anomalies.length === 0 ? (
            <div className="gov-inst-anomalies-empty">暂无异常记录</div>
          ) : (
            <div className="gov-inst-anomalies-list">
              {anomalies.map(alert => (
                <div key={alert.id} className="gov-anomaly-row">
                  <span className="gov-anomaly-row__time">
                    {formatDateTime(alert.detectedAt)}
                  </span>
                  <span className={`gov-anomaly-row__type gov-anomaly-row__type--${alert.type}`}>
                    {TYPE_LABELS[alert.type] ?? alert.type}
                  </span>
                  <span className={`gov-anomaly-row__severity gov-anomaly-row__severity--${alert.severity}`}>
                    {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                  </span>
                  <span className="gov-anomaly-row__elder">{alert.title}</span>
                  <span className="gov-anomaly-row__worker">{alert.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${month}-${day} ${hours}:${mins}`;
  } catch {
    return isoStr;
  }
}
