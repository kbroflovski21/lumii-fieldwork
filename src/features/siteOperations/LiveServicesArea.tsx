import { useState, useEffect, useCallback, useMemo } from "react";
import { Play, Radio, X, Zap, MapPin, Bluetooth, AudioLines, Camera, Video, Eye } from "lucide-react";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { EmptyState } from "../../shared/components/EmptyState";
import { ListToolbar } from "../../shared/components/ListToolbar";
import { FilterDropdown } from "../../shared/components/FilterDropdown";
import { AvatarInitial } from "../../shared/components/AvatarInitial";
import type { ServiceSession } from "./contracts";
import { evidenceCount, evidenceScoreClass, formatTime } from "./serviceTableUtils";

type LiveTab = "tab_overview" | "tab_evidence" | "tab_visual" | "tab_audio" | "tab_radar" | "tab_photos" | "tab_inspection";

type DateFilter = "today" | "week" | "month" | "";

const dateFilterOptions: Array<{ label: string; value: DateFilter }> = [
  { label: "日期范围", value: "" },
  { label: "今日", value: "today" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
];

const liveTabs: Array<{ id: LiveTab; label: string }> = [
  { id: "tab_overview", label: "实时感知总揽" },
  { id: "tab_evidence", label: "六维证据链" },
  { id: "tab_visual", label: "视觉证据详情" },
  { id: "tab_audio", label: "语音证据详情" },
  { id: "tab_radar", label: "雷达证据详情" },
  { id: "tab_photos", label: "照片证据详情" },
  { id: "tab_inspection", label: "飞行检查" },
];

/* ── Helper: extract site names from sessions ── */
function getSessionSiteName(session: ServiceSession): string {
  return (session as any).siteName ?? "未知站点";
}

/* ── Build 9-type anomaly tags ── */
type AnomalyTag9 = {
  label: string;
  tone: "red" | "orange" | "darkred" | "green";
};

function buildAnomalyTags9(session: ServiceSession): AnomalyTag9[] {
  const tags: AnomalyTag9[] = [];
  const ec = session.evidenceChain;

  // GPS不匹配 (red) — gps is false (fail)
  if (ec.gps === false) tags.push({ label: "GPS不匹配", tone: "red" });

  // GPS缺失 (orange) — we treat gps === null/undefined as missing; for boolean, no separate missing state
  // Since evidenceChain.gps is boolean, we use: if not true and not false => missing
  // But the type is boolean. We'll consider: if the verification.gpsMatch is null => GPS缺失
  if (session.verification.gpsMatch === null && ec.gps !== false) tags.push({ label: "GPS缺失", tone: "orange" });

  // 信标缺失 (orange)
  if (!ec.bleBeacon) tags.push({ label: "信标缺失", tone: "orange" });

  // 语音缺失 (orange) — audioRecording
  if (!ec.audioRecording) tags.push({ label: "语音缺失", tone: "orange" });

  // 雷达缺失 (orange)
  if (!ec.radarData) tags.push({ label: "雷达缺失", tone: "orange" });

  // 视觉缺失 (orange) — photo
  if (!ec.photo) tags.push({ label: "视觉缺失", tone: "orange" });

  // 声纹不匹配 (red) — voiceprint is false
  if (ec.voiceprint === false) tags.push({ label: "声纹不匹配", tone: "red" });

  // 失能程度可疑 (red) — elderVerification.status is fail
  if (session.elderVerification && session.elderVerification.status === "fail") {
    tags.push({ label: "失能程度可疑", tone: "red" });
  }

  // 疑似违规行为 (dark red) — aiAssessment has anomalies
  if (session.aiAssessment && session.aiAssessment.anomalies && session.aiAssessment.anomalies.length > 0) {
    tags.push({ label: "疑似违规行为", tone: "darkred" });
  }

  // If none: show green "正常" tag
  if (tags.length === 0) {
    tags.push({ label: "正常", tone: "green" });
  }

  return tags;
}

/* ── Mock data for live sessions ── */
function buildMockLiveSessions(): ServiceSession[] {
  const now = new Date();
  return [
    {
      id: "sess-live-1",
      siteName: "阳光社区服务站",
      serviceDate: now.toISOString().slice(0, 10),
      serviceObjectId: "elder-1",
      serviceObjectName: "王桂芬",
      serviceObjectAddress: "杭州市西湖区文三路218号3单元501",
      workerId: "w1",
      workerName: "李明",
      workerQualifications: ["养老护理员(初级)"],
      planId: "plan-1",
      selectedItems: [
        { standardItemId: "si-1", name: "面部清洁", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "1次/日", checked: true },
        { standardItemId: "si-2", name: "口腔清洁", categoryName: "清洁卫生类", referenceMinutes: 10, frequency: "2次/日", checked: true },
        { standardItemId: "si-3", name: "协助进食", categoryName: "营养摄取类", referenceMinutes: 20, frequency: "3次/日", checked: true },
      ],
      estimatedMinutes: 45,
      status: "in_progress",
      verification: { gpsMatch: true, bleBeaconMatch: true, voiceprintMatch: true, verifiedAt: new Date(now.getTime() - 35 * 60000).toISOString() },
      startedAt: new Date(now.getTime() - 32 * 60000).toISOString(),
      realtimeData: {
        audioStatus: "recording",
        radarStatus: "connected",
        radarDeviceId: "GY-R001",
        transcriptLog: [
          { timestamp: new Date(now.getTime() - 30 * 60000).toISOString(), speaker: "worker", text: "王奶奶，我们今天先洗脸好不好？" },
          { timestamp: new Date(now.getTime() - 29 * 60000).toISOString(), speaker: "elder", text: "好的，水温不要太烫。" },
          { timestamp: new Date(now.getTime() - 25 * 60000).toISOString(), speaker: "worker", text: "好的，我先试一下水温。温度合适的。" },
          { timestamp: new Date(now.getTime() - 20 * 60000).toISOString(), speaker: "worker", text: "脸洗好了，现在帮您刷牙。" },
          { timestamp: new Date(now.getTime() - 15 * 60000).toISOString(), speaker: "elder", text: "谢谢小李。" },
          { timestamp: new Date(now.getTime() - 10 * 60000).toISOString(), speaker: "worker", text: "不客气，现在准备吃早餐了。" },
        ],
        aiGuidanceLog: [
          { timestamp: new Date(now.getTime() - 28 * 60000).toISOString(), type: "reminder", message: "提醒：面部清洁前请先确认水温适宜", triggeredBy: "timer", ttsPlayed: true },
          { timestamp: new Date(now.getTime() - 18 * 60000).toISOString(), type: "guidance", message: "口腔清洁已完成，建议进入下一项服务", triggeredBy: "audio", ttsPlayed: false },
        ],
      },
      evidenceChain: { gps: true, bleBeacon: true, voiceprint: true, audioRecording: true, radarData: true, photo: true },
    },
    {
      id: "sess-live-2",
      siteName: "幸福家园服务站",
      serviceDate: now.toISOString().slice(0, 10),
      serviceObjectId: "elder-2",
      serviceObjectName: "张秀英",
      serviceObjectAddress: "杭州市上城区解放路56号2幢301",
      workerId: "w2",
      workerName: "王芳",
      workerQualifications: ["养老护理员(中级)", "护士"],
      planId: "plan-2",
      selectedItems: [
        { standardItemId: "si-5", name: "整理床单位", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "1次/日", checked: true },
        { standardItemId: "si-8", name: "协助更衣", categoryName: "清洁卫生类", referenceMinutes: 15, frequency: "必要时", checked: true },
      ],
      estimatedMinutes: 30,
      status: "in_progress",
      verification: { gpsMatch: false, bleBeaconMatch: true, voiceprintMatch: null, verifiedAt: new Date(now.getTime() - 15 * 60000).toISOString() },
      startedAt: new Date(now.getTime() - 12 * 60000).toISOString(),
      realtimeData: {
        audioStatus: "recording",
        radarStatus: "disconnected",
        transcriptLog: [
          { timestamp: new Date(now.getTime() - 10 * 60000).toISOString(), speaker: "worker", text: "张奶奶，今天精神不错啊。" },
          { timestamp: new Date(now.getTime() - 8 * 60000).toISOString(), speaker: "elder", text: "还好，昨晚睡得不错。" },
        ],
        aiGuidanceLog: [
          { timestamp: new Date(now.getTime() - 11 * 60000).toISOString(), type: "warning", message: "GPS定位与老人地址距离较远(1.2km)，请核实", triggeredBy: "system", ttsPlayed: true },
        ],
      },
      evidenceChain: { gps: false, bleBeacon: true, voiceprint: false, audioRecording: true, radarData: false, photo: false },
    },
    {
      id: "sess-live-3",
      siteName: "阳光社区服务站",
      serviceDate: now.toISOString().slice(0, 10),
      serviceObjectId: "elder-3",
      serviceObjectName: "陈美玉",
      serviceObjectAddress: "杭州市拱墅区湖墅南路88号",
      workerId: "w3",
      workerName: "张伟",
      workerQualifications: ["养老护理员(初级)"],
      planId: "plan-3",
      selectedItems: [
        { standardItemId: "si-10", name: "协助如厕", categoryName: "排泄护理类", referenceMinutes: 15, frequency: "必要时", checked: true },
        { standardItemId: "si-12", name: "药物管理", categoryName: "医学护理类", referenceMinutes: 10, frequency: "3次/日", checked: true },
        { standardItemId: "si-13", name: "生命体征监测", categoryName: "医学护理类", referenceMinutes: 10, frequency: "1次/日", checked: true },
        { standardItemId: "si-14", name: "情绪疏导", categoryName: "心理支持类", referenceMinutes: 20, frequency: "必要时", checked: true },
      ],
      estimatedMinutes: 55,
      status: "in_progress",
      verification: { gpsMatch: true, bleBeaconMatch: true, voiceprintMatch: true, verifiedAt: new Date(now.getTime() - 50 * 60000).toISOString() },
      startedAt: new Date(now.getTime() - 48 * 60000).toISOString(),
      realtimeData: {
        audioStatus: "recording",
        radarStatus: "connected",
        radarDeviceId: "GY-R002",
        transcriptLog: [
          { timestamp: new Date(now.getTime() - 45 * 60000).toISOString(), speaker: "worker", text: "陈奶奶，先量一下血压。" },
          { timestamp: new Date(now.getTime() - 40 * 60000).toISOString(), speaker: "worker", text: "血压正常，120/80。" },
          { timestamp: new Date(now.getTime() - 35 * 60000).toISOString(), speaker: "elder", text: "今天心情不太好。" },
          { timestamp: new Date(now.getTime() - 33 * 60000).toISOString(), speaker: "worker", text: "没事的，我陪您聊聊天。" },
        ],
        aiGuidanceLog: [
          { timestamp: new Date(now.getTime() - 34 * 60000).toISOString(), type: "guidance", message: "检测到老人情绪低落，建议进行情绪疏导", triggeredBy: "audio", ttsPlayed: true },
        ],
      },
      evidenceChain: { gps: true, bleBeacon: true, voiceprint: true, audioRecording: true, radarData: true, photo: false },
    },
  ];
}

function formatElapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs > 0) return `${hrs}小时${remainMins}分钟`;
  return `${mins}分钟`;
}

/* ── Toast component ── */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="ls-toast">
      <span>{message}</span>
      <button onClick={onClose} type="button"><X size={14} /></button>
    </div>
  );
}

/* ── Evidence Chain Cards (reusable for Tab 1 & Tab 2) ── */
/* merged=true embeds live signal previews in top-row cards (for Tab 1) */
function EvidenceChainCards({ session, setActiveTab, merged }: { session: ServiceSession; setActiveTab: (t: LiveTab) => void; merged?: boolean }) {
  const ec = session.evidenceChain;
  const ecCount = evidenceCount(ec);
  const photoCount = ec.photo ? 3 : 0; // mock photo count

  const videoConnected = ec.photo; // reuse photo field for visual signal mock
  const audioConnected = ec.audioRecording;
  const radarConnected = ec.radarData;

  /* ── Top-row cards: signal cards (visual, audio, radar) ── */
  const signalCards = [
    {
      title: "视觉证据",
      icon: Eye,
      status: videoConnected ? "pass" as const : "missing" as const,
      signalPreview: merged ? (
        videoConnected ? (
          <div className="ls-detail-ev-card__signal-area">
            <div className="ls-detail-signal__feed ls-detail-signal__feed--video">
              <Video size={32} />
              <span>实时视觉画面</span>
            </div>
          </div>
        ) : (
          <div className="ls-detail-ev-card__signal-area ls-detail-ev-card__signal-area--offline">
            <span>视觉信号未接入</span>
          </div>
        )
      ) : null,
      content: (
        <>
          <span className={`ls-detail-ev__signal ls-detail-ev__signal--${videoConnected ? "green" : "gray"}`}>
            {videoConnected ? "视觉信号接入中" : "未获得视觉信号"}
          </span>
          {videoConnected && (
            <button className="ls-detail-ev__link" onClick={() => setActiveTab("tab_visual")} type="button">查看视觉信号 &rarr;</button>
          )}
        </>
      ),
    },
    {
      title: "音频证据",
      icon: AudioLines,
      status: audioConnected ? "pass" as const : "missing" as const,
      signalPreview: merged ? (
        audioConnected ? (
          <div className="ls-detail-ev-card__signal-area">
            <div className="ls-detail-signal__feed ls-detail-signal__feed--audio">
              <div className="ls-detail-waveform">
                <div className="ls-detail-waveform__bar" style={{ animationDelay: "0s" }} />
                <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.15s" }} />
                <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.3s" }} />
                <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.45s" }} />
                <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.6s" }} />
                <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.2s" }} />
                <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.5s" }} />
              </div>
              <span>实时语音波形</span>
            </div>
          </div>
        ) : (
          <div className="ls-detail-ev-card__signal-area ls-detail-ev-card__signal-area--offline">
            <span>音频信号未接入</span>
          </div>
        )
      ) : null,
      content: (
        <>
          <span className={`ls-detail-ev__signal ls-detail-ev__signal--${audioConnected ? "green" : "gray"}`}>
            {audioConnected ? "语音信号接入中" : "未获得语音信号"}
          </span>
          {audioConnected && (
            <button className="ls-detail-ev__link" onClick={() => setActiveTab("tab_audio")} type="button">查看语音信号 &rarr;</button>
          )}
        </>
      ),
    },
    {
      title: "毫米波雷达证据",
      icon: Radio,
      status: radarConnected ? "pass" as const : "missing" as const,
      signalPreview: merged ? (
        radarConnected ? (
          <div className="ls-detail-ev-card__signal-area">
            <div className="ls-detail-signal__feed ls-detail-signal__feed--radar">
              <div className="ls-detail-radar-viz">
                <div className="ls-detail-radar-viz__ring" />
                <div className="ls-detail-radar-viz__ring ls-detail-radar-viz__ring--2" />
                <div className="ls-detail-radar-viz__ring ls-detail-radar-viz__ring--3" />
                <div className="ls-detail-radar-viz__dot" />
              </div>
              <span>实时雷达信号</span>
            </div>
          </div>
        ) : (
          <div className="ls-detail-ev-card__signal-area ls-detail-ev-card__signal-area--offline">
            <span>雷达信号未接入</span>
          </div>
        )
      ) : null,
      content: (
        <>
          <span className={`ls-detail-ev__signal ls-detail-ev__signal--${radarConnected ? "green" : "gray"}`}>
            {radarConnected ? "雷达信号接入中" : "未获得雷达信号"}
          </span>
          {radarConnected && (
            <button className="ls-detail-ev__link" onClick={() => setActiveTab("tab_radar")} type="button">查看雷达信号 &rarr;</button>
          )}
        </>
      ),
    },
  ];

  /* ── Bottom-row cards: non-signal cards (GPS, beacon, photo) ── */
  const dataCards = [
    {
      title: "GPS证据",
      icon: MapPin,
      status: ec.gps ? "pass" as const : "fail" as const,
      content: (
        <>
          <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">服务地址</span><span>{session.serviceObjectAddress}</span></div>
          <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">服务开始打卡</span><span>{session.startedAt ? `${formatTime(session.startedAt)} | ${session.serviceObjectAddress}` : "--"}</span></div>
          <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">服务结束打卡</span><span style={{ color: "var(--site-accent)" }}>服务进行中...</span></div>
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
          <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">信标打卡</span><span>{session.startedAt ? `${formatTime(session.startedAt)} | GY-S001` : "--"}</span></div>
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
            {photoCount > 0 ? `提供服务照片证据：${photoCount}张照片` : "当前未上传照片"}
          </span>
          {photoCount > 0 && (
            <button className="ls-detail-ev__link" onClick={() => setActiveTab("tab_photos")} type="button">查看照片详情 &rarr;</button>
          )}
        </>
      ),
    },
  ];

  const renderCard = (card: typeof signalCards[number] | typeof dataCards[number], isSignalCard: boolean) => {
    const Icon = card.icon;
    const hasSignalPreview = isSignalCard && merged && "signalPreview" in card;
    return (
      <div key={card.title} className={`ls-detail-ev__card${hasSignalPreview ? " ls-detail-ev-card--signal" : ""}`} data-status={card.status}>
        <div className="ls-detail-ev__card-header">
          <Icon size={16} />
          <span>{card.title}</span>
          <StatusBadge tone={card.status === "pass" ? "success" : card.status === "fail" ? "danger" : "muted"}>
            {card.status === "pass" ? "已获取" : card.status === "fail" ? "异常" : "缺失"}
          </StatusBadge>
        </div>
        {hasSignalPreview && (card as typeof signalCards[number]).signalPreview}
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
      <div className={`ls-detail-ev__grid${merged ? " ls-detail-ev-grid--merged" : ""}`}>
        {signalCards.map(card => renderCard(card, true))}
        {dataCards.map(card => renderCard(card, false))}
      </div>
    </>
  );
}

/* ── Detail Panel with 7 Tabs (inline full-page, no popup) ── */
function SessionDetailPanel({ session, onBack }: { session: ServiceSession; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<LiveTab>("tab_overview");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(session.startedAt ? formatElapsed(session.startedAt) : "--");
  const [flyCheckDone, setFlyCheckDone] = useState(false);

  const ec = session.evidenceChain;

  // Signal connection states (mock: 2 of 3 connected per spec)
  const videoConnected = ec.photo; // session 1 & 3 have photo=true
  const audioConnected = ec.audioRecording;
  const radarConnected = ec.radarData;

  // Auto-update elapsed time every second
  useEffect(() => {
    if (!session.startedAt) return;
    const interval = setInterval(() => {
      setElapsed(formatElapsed(session.startedAt!));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);

  const handleFlyCheck = useCallback(() => {
    setToastMsg("飞检请求已发送，等待连接...");
    setFlyCheckDone(true);
  }, []);

  // AI reminder for fly inspection
  const aiReminder = useMemo(() => {
    const gaps: string[] = [];
    if (!ec.gps) gaps.push("GPS信号缺失");
    if (!ec.bleBeacon) gaps.push("信标信号缺失");
    if (!ec.audioRecording) gaps.push("语音信号缺失");
    if (!ec.radarData) gaps.push("雷达信号缺失");
    if (!ec.photo) gaps.push("视觉信号缺失");
    if (gaps.length === 0) return "AI提醒：当前服务证据链完整，暂无需要飞检的事项。";
    return `AI提醒：服务过程的${gaps.join("、")}，建议进行飞检。`;
  }, [ec]);

  // Mock data for audio recording duration
  const recordingMinutes = session.startedAt ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000) : 0;

  return (
    <div className="svc-detail-page">
      {/* Breadcrumb */}
      <div className="svc-breadcrumb">
        <span className="svc-breadcrumb__link" onClick={onBack}>进行中服务</span>
        <span className="svc-breadcrumb__sep">&gt;</span>
        <span className="svc-breadcrumb__current">{session.serviceObjectName} - 服务详情</span>
      </div>

      {/* Tab bar */}
      <div className="cs-tab-bar">
        {liveTabs.map(tab => (
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

        {/* ═══ Tab 1: 实时感知总揽 ═══ */}
        {activeTab === "tab_overview" && (
          <>
            {/* Part 1: 基本信息 */}
            <div className="ls-detail__section">
              <h4 className="ls-detail-section-title">基本信息</h4>
              <div className="ls-detail-info__grid--compact">
                <div><span className="ls-detail__label">所属机构</span><span>金色年华</span></div>
                <div><span className="ls-detail__label">长者（参保人）</span><span>{session.serviceObjectName}</span></div>
                <div><span className="ls-detail__label">服务人员</span><span>{session.workerName}</span></div>
                <div><span className="ls-detail__label">服务日期</span><span>{session.serviceDate}</span></div>
                <div><span className="ls-detail__label">开始时间</span><span>{session.startedAt ? formatTime(session.startedAt) : "--"}</span></div>
                <div><span className="ls-detail__label">已进行时长</span><span style={{ color: "var(--site-accent)", fontWeight: 700 }}>{elapsed}</span></div>
                <div className="ls-detail-info__address"><span className="ls-detail__label">服务地址</span><span>{session.serviceObjectAddress}</span></div>
              </div>
            </div>

            {/* Part 2: 六维证据链 with embedded signal previews */}
            <div className="ls-detail__section">
              <EvidenceChainCards session={session} setActiveTab={setActiveTab} merged />
            </div>
          </>
        )}

        {/* ═══ Tab 2: 六维证据链 ═══ */}
        {activeTab === "tab_evidence" && (
          <div className="ls-detail__section">
            <EvidenceChainCards session={session} setActiveTab={setActiveTab} />
          </div>
        )}

        {/* ═══ Tab 3: 视觉证据详情 ═══ */}
        {activeTab === "tab_visual" && (
          <div className="ls-detail__section">
            <h4>视觉证据详情</h4>
            {videoConnected ? (
              <>
                <div className="ls-detail-signal__feed ls-detail-signal__feed--video ls-detail-signal__feed--large">
                  <Play size={48} />
                  <span>实时画面</span>
                </div>
                <p style={{ textAlign: "center", color: "var(--site-muted)", fontSize: 13, marginTop: 12 }}>
                  已录制时长：{recordingMinutes}分钟
                </p>
              </>
            ) : (
              <p style={{ color: "var(--site-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>当前信号未接入</p>
            )}
          </div>
        )}

        {/* ═══ Tab 4: 语音证据详情 ═══ */}
        {activeTab === "tab_audio" && (
          <div className="ls-detail__section">
            <h4>语音证据详情</h4>
            {audioConnected ? (
              <>
                <div className="ls-detail-signal__feed ls-detail-signal__feed--audio ls-detail-signal__feed--large">
                  <div className="ls-detail-waveform ls-detail-waveform--large">
                    <div className="ls-detail-waveform__bar" style={{ animationDelay: "0s" }} />
                    <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.1s" }} />
                    <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.2s" }} />
                    <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.3s" }} />
                    <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.4s" }} />
                    <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.15s" }} />
                    <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.35s" }} />
                    <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.5s" }} />
                    <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.25s" }} />
                    <div className="ls-detail-waveform__bar" style={{ animationDelay: "0.45s" }} />
                  </div>
                  <span>实时语音</span>
                </div>
                <p style={{ textAlign: "center", color: "var(--site-muted)", fontSize: 13, marginTop: 12 }}>
                  已录制时长：{recordingMinutes}分钟
                </p>
              </>
            ) : (
              <p style={{ color: "var(--site-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>当前信号未接入</p>
            )}

            {/* AI识别模式 */}
            <div className="ls-detail-ai-section">
              <h4>AI识别模式</h4>
              <div className="ls-detail-ai__items">
                <div className="ls-detail-ai__item">
                  <span>服务人员声纹匹配</span>
                  <span className={`ls-detail-ai__status ls-detail-ai__status--${ec.voiceprint === true ? "green" : ec.voiceprint === false ? "red" : "gray"}`}>
                    {ec.voiceprint === true ? "匹配成功" : ec.voiceprint === false ? "匹配失败" : "等待匹配"}
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
          </div>
        )}

        {/* ═══ Tab 5: 雷达证据详情 ═══ */}
        {activeTab === "tab_radar" && (
          <div className="ls-detail__section">
            <h4>雷达证据详情</h4>
            {radarConnected ? (
              <>
                <div className="ls-detail-radar-panels">
                  <div className="ls-detail-radar-panel">
                    <h5>实时人员位置</h5>
                    <div className="ls-detail-signal__feed ls-detail-signal__feed--radar ls-detail-signal__feed--panel">
                      <div className="ls-detail-radar-viz ls-detail-radar-viz--large">
                        <div className="ls-detail-radar-viz__ring" />
                        <div className="ls-detail-radar-viz__ring ls-detail-radar-viz__ring--2" />
                        <div className="ls-detail-radar-viz__ring ls-detail-radar-viz__ring--3" />
                        <div className="ls-detail-radar-viz__dot" />
                        <div className="ls-detail-radar-viz__dot ls-detail-radar-viz__dot--2" />
                      </div>
                    </div>
                  </div>
                  <div className="ls-detail-radar-panel">
                    <h5>服务期间活动热力图</h5>
                    <div className="ls-detail-signal__feed ls-detail-signal__feed--heatmap ls-detail-signal__feed--panel">
                      <div className="ls-detail-heatmap">
                        <div className="ls-detail-heatmap__spot" style={{ top: "30%", left: "40%", opacity: 0.9 }} />
                        <div className="ls-detail-heatmap__spot" style={{ top: "50%", left: "60%", opacity: 0.6 }} />
                        <div className="ls-detail-heatmap__spot" style={{ top: "65%", left: "35%", opacity: 0.4 }} />
                        <div className="ls-detail-heatmap__spot" style={{ top: "40%", left: "55%", opacity: 0.7 }} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ color: "var(--site-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>当前信号未接入</p>
            )}

            {/* AI识别模式 */}
            <div className="ls-detail-ai-section">
              <h4>AI识别模式</h4>
              <div className="ls-detail-ai__items">
                <div className="ls-detail-ai__item">
                  <span>老人失能程度识别</span>
                  <span className={`ls-detail-ai__status ls-detail-ai__status--${radarConnected ? "green" : "gray"}`}>
                    {radarConnected ? "符合失能特征" : "数据不足"}
                  </span>
                </div>
                <div className="ls-detail-ai__item">
                  <span>护理人员运动轨迹识别</span>
                  <span className={`ls-detail-ai__status ls-detail-ai__status--${radarConnected ? "green" : "gray"}`}>
                    {radarConnected ? "符合要求" : "数据不足"}
                  </span>
                </div>
              </div>
            </div>
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
              <p style={{ color: "var(--site-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>当前未上传照片</p>
            )}
          </div>
        )}

        {/* ═══ Tab 7: 飞行检查 ═══ */}
        {activeTab === "tab_inspection" && (
          <div className="ls-detail__section">
            <h4>飞行检查</h4>
            {!flyCheckDone ? (
              <>
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <button className="sw-btn sw-btn--primary ls-detail-flycheck-btn" onClick={handleFlyCheck} type="button">
                    <Zap size={20} />
                    发起飞检
                  </button>
                </div>
                <div className="ls-detail-ai-reminder">
                  {aiReminder}
                </div>
              </>
            ) : (
              <div className="ls-detail-flycheck-history">
                <div className="ls-detail-flycheck-history__item">
                  <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">飞检时间</span><span>{new Date().toLocaleString("zh-CN")}</span></div>
                  <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">飞检形式</span><span>人工发起</span></div>
                  <div className="ls-detail-ev__row"><span className="ls-detail-ev__label">状态</span><StatusBadge tone="accent">等待连接中...</StatusBadge></div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
  );
}

/* ── Main Component ── */
export function LiveServicesArea() {
  const [sessions, setSessions] = useState<ServiceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ServiceSession | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Fetch mock data
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setSessions(buildMockLiveSessions());
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Tick every 30s to update elapsed time
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const siteOptions = useMemo(() => {
    const unique = [...new Set(sessions.map(s => getSessionSiteName(s)))];
    if (unique.length <= 1) return [];
    return [{ label: "全部站点", value: "" }, ...unique.map(n => ({ label: n, value: n }))];
  }, [sessions]);

  const [siteFilter, setSiteFilter] = useState("");

  const workerOptions = useMemo(() => {
    const unique = [...new Set(sessions.map(s => s.workerName))];
    return [{ label: "全部服务人员", value: "" }, ...unique.map(n => ({ label: n, value: n }))];
  }, [sessions]);

  const [workerFilter, setWorkerFilter] = useState("");

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
    if (workerFilter) result = result.filter(s => s.workerName === workerFilter);
    return result;
  }, [sessions, searchQuery, dateFilter, workerFilter, siteFilter]);

  const handleFlyCheckFromTable = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setToastMsg("飞检请求已发送");
  }, []);

  if (loading) {
    return <div className="site-operations-placeholder">进行中服务加载中...</div>;
  }

  // If a session is selected, show the full-page detail view
  if (selectedSession) {
    return (
      <section aria-label="服务详情" className="cs-page">
        <SessionDetailPanel
          session={selectedSession}
          onBack={() => setSelectedSession(null)}
        />
      </section>
    );
  }

  return (
    <section aria-label="进行中服务" className="cs-page">
      <div className="cs-header">
        <h2 className="cs-header__title">进行中服务</h2>
        <StatusBadge tone="accent">{sessions.length} 个服务进行中</StatusBadge>
      </div>

      <ListToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="搜索长者/服务人员..."
        filters={
          <>
            {siteOptions.length > 0 && <FilterDropdown options={siteOptions} value={siteFilter} onChange={setSiteFilter} />}
            <FilterDropdown options={dateFilterOptions} value={dateFilter} onChange={v => setDateFilter(v as DateFilter)} />
            <FilterDropdown options={workerOptions} value={workerFilter} onChange={setWorkerFilter} />
          </>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Play} title="暂无进行中服务" description="当前没有正在进行的服务会话" />
      ) : (
        <div className="sw-table-container">
          <div className="svc-table__head svc-table__head--live">
            <span>服务开始</span>
            <span>站点</span>
            <span>长者</span>
            <span>服务人员</span>
            <span>证据链完整度</span>
            <span>AI异常提示</span>
            <span>发起飞检</span>
          </div>
          <div className="svc-table__body">
            {filtered.map(session => {
              const ec = evidenceCount(session.evidenceChain);
              const tags = buildAnomalyTags9(session);
              return (
                <button
                  key={session.id}
                  className="svc-table__row svc-table__row--live"
                  onClick={() => setSelectedSession(session)}
                  type="button"
                >
                  <span>{session.startedAt ? formatTime(session.startedAt) : "--"}</span>
                  <span>{getSessionSiteName(session)}</span>
                  <span className="sw-table__cell-name">
                    <AvatarInitial name={session.serviceObjectName} size="sm" />
                    <span>{session.serviceObjectName}</span>
                  </span>
                  <span>{session.workerName}</span>
                  <span className={`svc-table__evidence ${evidenceScoreClass(ec.pass, ec.total)}`}>
                    {ec.pass}/{ec.total}
                  </span>
                  <span className="svc-table__tags">
                    {tags.map((tag, i) => (
                      <span key={i} className={`svc-tag svc-tag--${tag.tone}`}>{tag.label}</span>
                    ))}
                  </span>
                  <span>
                    <button
                      className="svc-flycheck-btn"
                      onClick={handleFlyCheckFromTable}
                      type="button"
                      title="发起飞检"
                    >
                      <Video size={16} />
                    </button>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
    </section>
  );
}
