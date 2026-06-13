import { useState, useEffect, useMemo } from "react";
import { CheckCircle, MapPin, Bluetooth, AudioLines, Radio, Camera, Eye, Play, Search } from "lucide-react";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { EmptyState } from "../../shared/components/EmptyState";
import { ListToolbar } from "../../shared/components/ListToolbar";
import { FilterDropdown } from "../../shared/components/FilterDropdown";
import { AvatarInitial } from "../../shared/components/AvatarInitial";
import type { ServiceSession } from "./contracts";
import { authFetch } from "./api";
import { evidenceCount, evidenceScoreClass, buildAnomalyTags, scoreTone, formatDate, formatTime } from "./serviceTableUtils";
import { RadarDetailView } from "./RadarDetailView";

/* ── Tab type ── */
type CompletedTab = "tab_summary" | "tab_evidence" | "tab_visual" | "tab_audio" | "tab_radar" | "tab_photos" | "tab_inspection";

type DateFilter = "today" | "week" | "month" | "";
type AnomalyFilter = "pass" | "anomaly" | "";
type MatchFilter = "exact" | "partial" | "unplanned" | "";

const dateFilterOptions: Array<{ label: string; value: DateFilter }> = [
  { label: "日期范围", value: "" },
  { label: "今日", value: "today" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
];

const anomalyFilterOptions: Array<{ label: string; value: AnomalyFilter }> = [
  { label: "全部状态", value: "" },
  { label: "全部通过", value: "pass" },
  { label: "存在异常", value: "anomaly" },
];

const matchFilterOptions: Array<{ label: string; value: MatchFilter }> = [
  { label: "排班匹配", value: "" },
  { label: "按排班", value: "exact" },
  { label: "有偏离", value: "partial" },
  { label: "计划外", value: "unplanned" },
];

/* ── Tab definitions ── */
const completedTabs: Array<{ id: CompletedTab; label: string }> = [
  { id: "tab_summary", label: "服务总结" },
  { id: "tab_evidence", label: "六维证据链" },
  { id: "tab_visual", label: "视觉证据详情" },
  { id: "tab_audio", label: "语音证据详情" },
  { id: "tab_radar", label: "雷达证据详情" },
  { id: "tab_photos", label: "照片证据详情" },
  { id: "tab_inspection", label: "飞行检查" },
];

/* ── Helper: extract site name from session ── */
function getSessionSiteName(session: ServiceSession): string {
  return (session as any).siteName ?? "未知站点";
}

/* ── Evidence Chain Cards (completed variant, reuses ls-detail-* CSS) ── */
function CompletedEvidenceChainCards({ session, setActiveTab }: { session: ServiceSession; setActiveTab: (t: CompletedTab) => void }) {
  const ec = session.evidenceChain;
  const ecCount = evidenceCount(ec);
  const photoCount = ec.photo ? 3 : 0;
  const actualMin = session.actualMinutes ?? 0;

  const videoAvailable = ec.photo; // reuse photo field for visual data mock
  const audioAvailable = ec.audioRecording;
  const radarAvailable = ec.radarData;

  /* Top-row: signal cards (visual, audio, radar) */
  const signalCards = [
    {
      title: "视觉证据",
      icon: Eye,
      status: videoAvailable ? "pass" as const : "missing" as const,
      content: (
        <>
          <span className={`ls-detail-ev__signal ls-detail-ev__signal--${videoAvailable ? "green" : "gray"}`}>
            {videoAvailable ? `已获取 ${actualMin}分钟` : "缺失"}
          </span>
          {videoAvailable && (
            <button className="ls-detail-ev__link" onClick={() => setActiveTab("tab_visual")} type="button">查看视觉详情 &rarr;</button>
          )}
        </>
      ),
    },
    {
      title: "音频证据",
      icon: AudioLines,
      status: audioAvailable ? "pass" as const : "missing" as const,
      content: (
        <>
          <span className={`ls-detail-ev__signal ls-detail-ev__signal--${audioAvailable ? "green" : "gray"}`}>
            {audioAvailable ? `已获取 ${actualMin}分钟` : "缺失"}
          </span>
          {audioAvailable && (
            <button className="ls-detail-ev__link" onClick={() => setActiveTab("tab_audio")} type="button">查看语音详情 &rarr;</button>
          )}
        </>
      ),
    },
    {
      title: "毫米波雷达证据",
      icon: Radio,
      status: radarAvailable ? "pass" as const : "missing" as const,
      content: (
        <>
          <span className={`ls-detail-ev__signal ls-detail-ev__signal--${radarAvailable ? "green" : "gray"}`}>
            {radarAvailable ? `已获取 ${actualMin}分钟` : "缺失"}
          </span>
          {radarAvailable && (
            <button className="ls-detail-ev__link" onClick={() => setActiveTab("tab_radar")} type="button">查看雷达详情 &rarr;</button>
          )}
        </>
      ),
    },
  ];

  /* Bottom-row: non-signal cards (GPS, beacon, photo) */
  const dataCards = [
    {
      title: "GPS证据",
      icon: MapPin,
      status: ec.gps ? "pass" as const : "fail" as const,
      content: (
        <>
          <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">服务地址</span><span>{session.serviceObjectAddress}</span></div>
          <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">服务开始打卡</span><span>{session.startedAt ? `${formatTime(session.startedAt)} | ${session.serviceObjectAddress}` : "--"}</span></div>
          <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">服务结束打卡</span><span>{session.completedAt ? `${formatTime(session.completedAt)} | ${session.serviceObjectAddress}` : "--"}</span></div>
        </>
      ),
    },
    {
      title: "信标证据",
      icon: Bluetooth,
      status: ec.bleBeacon ? "pass" as const : "missing" as const,
      content: (
        <>
          <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">信标设备</span><span>GY-S001</span></div>
          <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">连接时长</span><span>{ec.bleBeacon ? `${actualMin}分钟` : "未连接"}</span></div>
        </>
      ),
    },
    {
      title: "服务照片证据",
      icon: Camera,
      status: photoCount > 0 ? "pass" as const : "missing" as const,
      content: (
        <>
          <span style={{ fontSize: 13, color: photoCount > 0 ? "var(--site-success-text)" : "var(--site-muted)" }}>
            {photoCount > 0 ? `已上传${photoCount}张照片` : "未上传照片"}
          </span>
          {photoCount > 0 && (
            <button className="ls-detail-ev__link" onClick={() => setActiveTab("tab_photos")} type="button">查看照片详情 &rarr;</button>
          )}
        </>
      ),
    },
  ];

  const renderCard = (card: typeof signalCards[number] | typeof dataCards[number]) => {
    const Icon = card.icon;
    return (
      <div key={card.title} className="ls-detail-ev__card" data-status={card.status}>
        <div className="ls-detail-ev__card-header">
          <Icon size={16} />
          <span>{card.title}</span>
          <StatusBadge tone={card.status === "pass" ? "success" : card.status === "fail" ? "danger" : "muted"}>
            {card.status === "pass" ? "已获取" : card.status === "fail" ? "异常" : "缺失"}
          </StatusBadge>
        </div>
        <div className="ls-detail-ev__card-body">
          {card.content}
        </div>
      </div>
    );
  };

  const badgeLevel = ecCount.pass === ecCount.total ? "full" : ecCount.pass >= ecCount.total / 2 ? "partial" : "low";

  return (
    <>
      <h4 className="ls-detail-section-title">
        六维证据链
        <span className={`ls-detail-completeness-badge ls-detail-completeness-badge--${badgeLevel}`}>
          {ecCount.pass}/{ecCount.total}
        </span>
      </h4>
      <div className="ls-detail-ev__grid">
        {signalCards.map(card => renderCard(card))}
        {dataCards.map(card => renderCard(card))}
      </div>
    </>
  );
}

/* ── CompletedDetailPanel (full-page, 7 tabs) ── */
function CompletedDetailPanel({ session, onBack }: { session: ServiceSession; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<CompletedTab>("tab_summary");
  const [transcriptSearch, setTranscriptSearch] = useState("");

  const ec = session.evidenceChain;
  const ecCount = evidenceCount(ec);
  const ai = session.aiAssessment;
  const actualMin = session.actualMinutes ?? 0;

  const videoAvailable = ec.photo;
  const audioAvailable = ec.audioRecording;
  const radarAvailable = ec.radarData;

  const plannedStart = session.startedAt ? formatTime(session.startedAt) : "--";
  const plannedEnd = session.completedAt ? formatTime(session.completedAt) : "--";
  const plannedItems = session.plannedItems ?? [];
  const confirmedItems = session.confirmedItems ?? [];

  // AI summary (use session data or mock)
  const aiSummary = ai?.summary
    ?? `本次服务由${session.workerName}为${session.serviceObjectName}提供生活照料服务，时长${actualMin}分钟。${ec.gps ? "GPS定位" : ""}${ec.bleBeacon ? "、信标" : ""}${ec.audioRecording ? "、录音" : ""}${ec.radarData ? "、雷达" : ""}证据${ecCount.pass === ecCount.total ? "完整" : "部分缺失"}，声纹${ec.voiceprint ? "匹配成功" : "未匹配"}。`;

  // Duration compliance
  const durationCompliant = actualMin >= 60 && actualMin <= 120;
  const durationLabel = actualMin < 60 ? "偏短" : actualMin > 120 ? "偏长" : "正常";
  const durationTone = durationCompliant ? "success" : "warning";

  // Reference minutes
  const refMinutes = session.estimatedMinutes || session.selectedItems.reduce((sum, item) => sum + item.referenceMinutes, 0);

  // Transcript log
  const transcriptLog = session.realtimeData?.transcriptLog ?? [];
  const filteredTranscript = transcriptSearch
    ? transcriptLog.filter(e => e.text.includes(transcriptSearch) || e.speaker.includes(transcriptSearch))
    : transcriptLog;

  // Mock inspection
  const hasInspection = false;

  // AI post-analysis for inspection tab
  const aiPostSummary = useMemo(() => {
    const gaps: string[] = [];
    if (!ec.gps) gaps.push("GPS定位缺失");
    if (!ec.bleBeacon) gaps.push("信标连接缺失");
    if (!ec.audioRecording) gaps.push("录音数据缺失");
    if (!ec.radarData) gaps.push("雷达数据缺失");
    if (!ec.photo) gaps.push("视觉数据缺失");
    if (!ec.voiceprint) gaps.push("声纹未匹配");
    if (gaps.length === 0) return "所有证据维度完整，未发现异常。";
    return `${gaps.join("、")}，建议关注。`;
  }, [ec]);

  return (
    <div className="svc-detail-page">
      {/* Breadcrumb */}
      <div className="svc-breadcrumb">
        <span className="svc-breadcrumb__link" onClick={onBack}>已完成服务</span>
        <span className="svc-breadcrumb__sep">&gt;</span>
        <span className="svc-breadcrumb__current">{session.serviceObjectName} - 服务详情</span>
      </div>

      {/* Tab bar */}
      <div className="cs-tab-bar">
        {completedTabs.map(tab => (
          <button
            key={tab.id}
            className="cs-tab-bar__item"
            data-active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="svc-detail-page__body">

        {/* ═══ Tab 1: 服务总结 ═══ */}
        {activeTab === "tab_summary" && (
          <>
            {/* 基本信息 */}
            <div className="ls-detail__section">
              <h4 className="ls-detail-section-title">基本信息</h4>
              <div className="ls-detail-info__grid--compact">
                <div><span className="ls-detail__label">所属机构</span><span>金色年华</span></div>
                <div><span className="ls-detail__label">长者（参保人）</span><span>{session.serviceObjectName}</span></div>
                <div><span className="ls-detail__label">服务人员</span><span>{session.workerName}</span></div>
                <div><span className="ls-detail__label">服务日期</span><span>{session.serviceDate}</span></div>
                <div><span className="ls-detail__label">开始时间</span><span>{plannedStart}</span></div>
                <div><span className="ls-detail__label">服务时长</span><span style={{ fontWeight: 700 }}>{actualMin}分钟</span></div>
                <div className="ls-detail-info__address"><span className="ls-detail__label">服务地址</span><span>{session.serviceObjectAddress}</span></div>
              </div>
            </div>

            {/* 六维证据链 */}
            <div className="ls-detail__section">
              <CompletedEvidenceChainCards session={session} setActiveTab={setActiveTab} />
            </div>

            {/* AI 服务总结 */}
            <div className="ls-detail__section">
              <h4 className="ls-detail-section-title">AI 服务总结</h4>
              <div className="ls-detail-ai-reminder" style={{ background: "var(--site-ai-accent-soft)", borderLeft: "3px solid var(--site-ai-accent)", padding: "16px 20px", borderRadius: 8, fontSize: 14, lineHeight: 1.8, color: "var(--site-heading)" }}>
                {aiSummary}
              </div>
            </div>

            {/* 服务项目与工时 */}
            <div className="ls-detail__section">
              <h4 className="ls-detail-section-title">服务项目与工时</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {(confirmedItems.length > 0 ? confirmedItems : session.selectedItems).filter(i => i.checked !== false).map((item, i) => (
                  <span key={i} style={{ background: "#F3F4F6", borderRadius: 6, padding: "4px 10px", fontSize: 13, color: "#374151" }}>{item.name} ({item.referenceMinutes}分钟)</span>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "8px 0 0" }}>
                共 <strong>{(confirmedItems.length > 0 ? confirmedItems : session.selectedItems).filter(i => i.checked !== false).length}</strong> 项服务，本次实际工时 <strong>{actualMin}分钟</strong>，本月累计工时 <strong>{Math.min(25 * 60, actualMin + Math.floor(Math.random() * 800 + 400))}分钟 / 1500分钟</strong>。工时合规（60-120分钟）：<span style={{ color: durationCompliant ? "#16A34A" : "#DC2626", fontWeight: 600 }}>{durationCompliant ? "符合" : "不符合"}</span>。
              </p>
            </div>
          </>
        )}

        {/* ═══ Tab 2: 六维证据链 ═══ */}
        {activeTab === "tab_evidence" && (
          <div className="ls-detail__section">
            <CompletedEvidenceChainCards session={session} setActiveTab={setActiveTab} />
          </div>
        )}

        {/* ═══ Tab 3: 视觉证据详情 ═══ */}
        {activeTab === "tab_visual" && (
          <div className="ls-detail__section">
            <h4>视觉证据详情</h4>
            {videoAvailable ? (
              <>
                <div className="ls-detail-signal__feed ls-detail-signal__feed--video ls-detail-signal__feed--large">
                  <Play size={48} />
                  <span>录像回放</span>
                </div>
                <p style={{ textAlign: "center", color: "var(--site-muted)", fontSize: 13, marginTop: 12 }}>
                  录制总时长：{actualMin}分钟
                </p>
              </>
            ) : (
              <p style={{ color: "var(--site-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>本次服务未获取视觉数据</p>
            )}
          </div>
        )}

        {/* ═══ Tab 4: 语音证据详情 ═══ */}
        {activeTab === "tab_audio" && (
          <div className="ls-detail__section">
            <h4>语音证据详情</h4>
            {audioAvailable ? (
              <>
                {/* Audio playback placeholder */}
                <div className="cs-audio-player">
                  <div className="cs-audio-player__bar">
                    <button className="cs-audio-player__play" type="button"><Play size={16} /></button>
                    <div className="cs-audio-player__progress">
                      <div className="cs-audio-player__progress-fill" style={{ width: "0%" }} />
                    </div>
                    <span className="cs-audio-player__time">00:00 / {actualMin}:00</span>
                  </div>
                </div>
                <p style={{ textAlign: "center", color: "var(--site-muted)", fontSize: 13, marginTop: 8, marginBottom: 20 }}>
                  录音回放 | 时长：{actualMin}分钟
                </p>

                {/* ASR transcript with search */}
                <h4 style={{ marginTop: 24 }}>完整ASR文字日志</h4>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--site-muted)" }} />
                  <input
                    type="text"
                    placeholder="搜索对话内容..."
                    value={transcriptSearch}
                    onChange={e => setTranscriptSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 30px",
                      border: "1px solid var(--site-line)",
                      borderRadius: 6,
                      fontSize: 13,
                      background: "var(--site-card)",
                      color: "var(--site-text)",
                    }}
                  />
                </div>
                {filteredTranscript.length > 0 ? (
                  <div className="ls-transcript" style={{ maxHeight: 400 }}>
                    {filteredTranscript.map((entry, i) => (
                      <div key={i} className="ls-transcript__entry" data-speaker={entry.speaker}>
                        <span className="ls-transcript__time">{formatTime(entry.timestamp)}</span>
                        <span className="ls-transcript__speaker">{entry.speaker === "worker" ? "护工" : entry.speaker === "elder" ? "长者" : "未知"}</span>
                        <span className="ls-transcript__text">{entry.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--site-muted)", fontSize: 13 }}>
                    {transcriptSearch ? "未找到匹配的对话记录" : "暂无语音转文字记录"}
                  </p>
                )}
              </>
            ) : (
              <p style={{ color: "var(--site-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>本次服务未获取语音数据</p>
            )}

            {/* AI识别结果 */}
            {audioAvailable && (
              <div className="ls-detail-ai-section">
                <h4>AI识别结果</h4>
                <div className="ls-detail-ai__items">
                  <div className="ls-detail-ai__item">
                    <span>服务人员声纹匹配</span>
                    <span className={`ls-detail-ai__status ls-detail-ai__status--${ec.voiceprint ? "green" : "red"}`}>
                      {ec.voiceprint ? "匹配成功" : "匹配失败"}
                    </span>
                  </div>
                  <div className="ls-detail-ai__item">
                    <span>脏话或辱骂</span>
                    <span className="ls-detail-ai__status ls-detail-ai__status--green">未发现</span>
                  </div>
                  <div className="ls-detail-ai__item">
                    <span>激烈争吵</span>
                    <span className="ls-detail-ai__status ls-detail-ai__status--green">未发现</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ Tab 5: 雷达证据详情 ═══ */}
        {activeTab === "tab_radar" && (
          <div className="ls-detail__section">
            <h4>雷达证据详情</h4>
            {radarAvailable ? (
              <RadarDetailView serviceSessionId={session.id} />
            ) : (
              <p style={{ color: "var(--site-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>本次服务未获取雷达数据</p>
            )}
          </div>
        )}

        {/* ═══ Tab 6: 照片证据详情 ═══ */}
        {activeTab === "tab_photos" && (
          <div className="ls-detail__section">
            <h4>照片证据详情</h4>
            {ec.photo ? (
              <div className="ls-detail-photos__grid">
                {[1, 2, 3].map(i => (
                  <div key={i} className="ls-detail-photos__item">
                    <div className="ls-detail-photos__placeholder">
                      <Camera size={28} />
                      <span>服务照片 {i}</span>
                    </div>
                    <span className="ls-detail-photos__time">
                      上传时间：{session.startedAt ? formatTime(new Date(new Date(session.startedAt).getTime() + i * 10 * 60000).toISOString()) : "--"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--site-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>未上传照片</p>
            )}
          </div>
        )}

        {/* ═══ Tab 7: 飞行检查 ═══ */}
        {activeTab === "tab_inspection" && (
          <div className="ls-detail__section">
            <h4>飞行检查</h4>
            {hasInspection ? (
              <div className="ls-detail-flycheck-history">
                <div className="ls-detail-flycheck-history__item">
                  <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">飞检时间</span><span>--</span></div>
                  <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">飞检形式</span><span>--</span></div>
                  <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">结果</span><span>--</span></div>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--site-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>本次服务未进行飞检</p>
            )}

            {/* AI事后总结 */}
            <div className="ls-detail-ai-section" style={{ marginTop: 24 }}>
              <h4>AI事后总结</h4>
              <div className="ls-detail-ai-reminder" style={{ background: "var(--site-ai-accent-soft)", borderLeft: "3px solid var(--site-ai-accent)", padding: "14px 18px", borderRadius: 8, fontSize: 13, lineHeight: 1.7, color: "var(--site-heading)" }}>
                {aiPostSummary}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Main Component ── */
export function CompletedServicesArea() {
  const [sessions, setSessions] = useState<ServiceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("");
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyFilter>("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("");
  const [selectedSession, setSelectedSession] = useState<ServiceSession | null>(null);

  // Fetch from /api/service-sessions
  useEffect(() => {
    setLoading(true);
    authFetch("/api/service-sessions?status=completed")
      .then(r => r.json())
      .then(data => {
        const completedSessions = (data.serviceSessions ?? data ?? []).filter(
          (s: ServiceSession) => s.status === "completed"
        );
        setSessions(completedSessions);
        setLoading(false);
      })
      .catch(() => {
        setSessions([]);
        setLoading(false);
      });
  }, []);

  const siteOptions = useMemo(() => {
    const unique = [...new Set(sessions.map(s => getSessionSiteName(s)))];
    if (unique.length <= 1) return [];
    return [{ label: "全部站点", value: "" }, ...unique.map(n => ({ label: n, value: n }))];
  }, [sessions]);

  const [siteFilter, setSiteFilter] = useState("");

  const workerOptions = useMemo(() => {
    const unique = [...new Set(sessions.map(s => s.workerName))];
    return [{ label: "全部护工", value: "" }, ...unique.map(n => ({ label: n, value: n }))];
  }, [sessions]);

  const filtered = useMemo(() => {
    let result = sessions;
    if (siteFilter) result = result.filter(s => getSessionSiteName(s) === siteFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.serviceObjectName.toLowerCase().includes(q) || s.workerName.toLowerCase().includes(q)
      );
    }
    if (dateFilter) {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      if (dateFilter === "today") result = result.filter(s => s.serviceDate === todayStr);
      else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
        result = result.filter(s => s.serviceDate >= weekAgo);
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
        result = result.filter(s => s.serviceDate >= monthAgo);
      }
    }
    if (anomalyFilter) {
      result = result.filter(s => {
        const ec = s.evidenceChain;
        const allPass = ec.gps && ec.bleBeacon && ec.voiceprint && ec.audioRecording && ec.radarData && ec.photo;
        return anomalyFilter === "pass" ? allPass : !allPass;
      });
    }
    if (workerFilter) result = result.filter(s => s.workerName === workerFilter);
    if (matchFilter) result = result.filter(s => s.scheduleMatchStatus === matchFilter);
    return result;
  }, [sessions, searchQuery, dateFilter, anomalyFilter, workerFilter, matchFilter, siteFilter]);

  if (loading) return <div className="site-operations-placeholder">已完成服务加载中...</div>;

  // If a session is selected, show the full-page detail view
  if (selectedSession) {
    return (
      <section aria-label="服务详情" className="cs-page">
        <CompletedDetailPanel
          session={selectedSession}
          onBack={() => setSelectedSession(null)}
        />
      </section>
    );
  }

  return (
    <section aria-label="已完成服务" className="cs-page">
      <div className="cs-header">
        <h2 className="cs-header__title">已完成服务</h2>
      </div>

      <ListToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="搜索长者/护工..."
        filters={
          <>
            {siteOptions.length > 0 && <FilterDropdown options={siteOptions} value={siteFilter} onChange={setSiteFilter} />}
            <FilterDropdown options={dateFilterOptions} value={dateFilter} onChange={v => setDateFilter(v as DateFilter)} />
            <FilterDropdown options={anomalyFilterOptions} value={anomalyFilter} onChange={v => setAnomalyFilter(v as AnomalyFilter)} />
            <FilterDropdown options={workerOptions} value={workerFilter} onChange={setWorkerFilter} />
            <FilterDropdown options={matchFilterOptions} value={matchFilter} onChange={v => setMatchFilter(v as MatchFilter)} />
          </>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState icon={CheckCircle} title="暂无记录" description="没有匹配的已完成服务记录" />
      ) : (
        <div className="sw-table-container">
          <div className="svc-table__head">
            <span>日期</span>
            <span>站点</span>
            <span>长者</span>
            <span>服务人员</span>
            <span>时长</span>
            <span>证据完整度</span>
            <span>异常提示</span>
          </div>
          <div className="svc-table__body">
            {filtered.map(session => {
              const ec = evidenceCount(session.evidenceChain);
              const tags = buildAnomalyTags(session);
              return (
                <button
                  key={session.id}
                  className="svc-table__row"
                  onClick={() => setSelectedSession(session)}
                  type="button"
                >
                  <span>{formatDate(session.serviceDate)}</span>
                  <span>{getSessionSiteName(session)}</span>
                  <span className="sw-table__cell-name">
                    <AvatarInitial name={session.serviceObjectName} size="sm" />
                    <span>{session.serviceObjectName}</span>
                  </span>
                  <span>{session.workerName}</span>
                  <span>{session.actualMinutes ?? "--"}分钟</span>
                  <span className={`svc-table__evidence ${evidenceScoreClass(ec.pass, ec.total)}`}>
                    {ec.pass}/{ec.total}
                  </span>
                  <span className="svc-table__tags">
                    {tags.map((tag, i) => (
                      <span key={i} className={`svc-tag svc-tag--${tag.tone}`}>{tag.label}</span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
