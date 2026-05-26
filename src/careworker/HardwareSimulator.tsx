import { useState, useEffect, useRef, useCallback } from "react";
import "./careworker.css";

type SimState = "idle" | "connecting" | "recording" | "processing";

interface TranscriptLine {
  text: string;
  speaker: string | null;
  isFinal: boolean;
}

interface SOPCheck {
  completed: string[];
  missing: string[];
  compliance: number;
  alertLevel: string;
}

interface AlertMsg {
  text: string;
  level: string;
  time: string;
}

interface ServiceRecordData {
  summary?: string;
  confidence?: number;
  completeness?: number;
  sop_compliance?: any;
  health_findings?: string;
  medication_status?: string;
  living_status?: string;
  safety_issues?: string;
  mental_status?: string;
  feedback_text?: string;
  anomalies?: string[];
  detail?: any;
  [key: string]: any;
}

interface OfflineReportData {
  offlineTranscript: { sentences?: { text: string; speaker_id: number }[]; full_text?: string };
  finalServiceRecord: ServiceRecordData;
}

const BADGE_CHANNEL = "golden-years-badge";

function sendBadgeEvent(event: any) {
  try {
    const ch = new BroadcastChannel(BADGE_CHANNEL);
    ch.postMessage(event);
    ch.close();
  } catch {}
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const PROCESSOR_URL = (import.meta as any).env?.VITE_PROCESSOR_URL || (window.location.origin + "/processor");
const WS_URL = PROCESSOR_URL.replace(/^http/, "ws") + "/ws/badge";

let ttsQueue: { type: string; data?: string; text?: string }[] = [];
let ttsPlaying = false;

function queueTTSAudio(base64Data: string, text: string) {
  ttsQueue.push({ type: "audio", data: base64Data, text });
  if (!ttsPlaying) playNextTTS();
}

function playNextTTS() {
  if (ttsQueue.length === 0) { ttsPlaying = false; return; }
  ttsPlaying = true;
  const item = ttsQueue.shift()!;
  if (item.type === "audio" && item.data) {
    try {
      const binary = atob(item.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); setTimeout(playNextTTS, 200); };
      audio.onerror = () => { URL.revokeObjectURL(url); setTimeout(playNextTTS, 100); };
      audio.play().catch(() => { URL.revokeObjectURL(url); fallbackSpeak(item.text); });
    } catch { fallbackSpeak(item.text); }
  } else {
    fallbackSpeak(item.text);
  }
}

function fallbackSpeak(text?: string) {
  if (!text) { setTimeout(playNextTTS, 100); return; }
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "zh-CN";
  utt.rate = 1.1;
  utt.onend = () => setTimeout(playNextTTS, 200);
  utt.onerror = () => setTimeout(playNextTTS, 100);
  speechSynthesis.speak(utt);
}

interface SimulatorWorker {
  id: string;
  name: string;
  phone: string;
  site: string;
}

interface SimulatorTask {
  scheduleId: string;
  serviceObjectId: string;
  serviceObjectName: string;
  serviceProject: string;
  clientContext: string;
}

export function HardwareSimulator({ worker, task, embedded }: { worker?: SimulatorWorker; task?: SimulatorTask; embedded?: boolean }) {
  const [state, setState] = useState<SimState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [hint, setHint] = useState("点击开始模拟上门服务");
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [interimText, setInterimText] = useState("");
  const [sopCheck, setSopCheck] = useState<SOPCheck>({ completed: [], missing: [], compliance: 0, alertLevel: "" });
  const [alerts, setAlerts] = useState<AlertMsg[]>([]);
  const [serviceRecord, setServiceRecord] = useState<ServiceRecordData | null>(null);
  const [offlineReport, setOfflineReport] = useState<OfflineReportData | null>(null);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);
  const recordingStartRef = useRef<number>(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const handleWSMessage = useCallback((e: MessageEvent) => {
    if (typeof e.data !== "string") return;
    const msg = JSON.parse(e.data);
    if (msg.type === "ack") return;
    if (msg.type === "status") setHint(msg.message);
    if (msg.type === "transcript") {
      if (msg.is_final) {
        setTranscriptLines(prev => [...prev, { text: msg.text, speaker: msg.speaker, isFinal: true }]);
        setInterimText("");
      } else {
        setInterimText(msg.text);
      }
    }
    if (msg.type === "speaker_map") {
      setSpeakerMap(msg.speaker_map);
      setTranscriptLines(prev => prev.map(line => {
        if (line.speaker && msg.speaker_map[line.speaker]) {
          return { ...line, speaker: msg.speaker_map[line.speaker] };
        }
        return line;
      }));
    }
    if (msg.type === "realtime_check") {
      setSopCheck({
        completed: msg.completed || [],
        missing: msg.missing || [],
        compliance: msg.compliance || 0,
        alertLevel: msg.alert_level || "",
      });
      if (msg.feedback?.trim()) {
        setAlerts(prev => [{
          text: msg.feedback,
          level: msg.alert_level || "warning",
          time: new Date().toLocaleTimeString(),
        }, ...prev].slice(0, 8));
      }
    }
    if (msg.type === "tts_audio") queueTTSAudio(msg.data, msg.text);
    if (msg.type === "service_record") {
      setServiceRecord(msg.service_record);
      setState("idle");
      setHint("服务记录已生成");
      sendBadgeEvent({ type: "badge_button_press", state: "connected_idle", timestamp: Date.now() });
    }
    if (msg.type === "offline_report") {
      setOfflineReport({ offlineTranscript: msg.offline_transcript, finalServiceRecord: msg.final_service_record });
      setHint("离线对照报告已生成！");
    }
    if (msg.type === "offline_error") setHint("离线分析: " + msg.message);
  }, []);

  const startRecording = useCallback(async () => {
    let mediaStream: MediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch {
      setHint("麦克风权限被拒绝");
      return;
    }
    setState("connecting");
    setTranscriptLines([]);
    setInterimText("");
    setServiceRecord(null);
    setOfflineReport(null);
    setAlerts([]);
    setSopCheck({ completed: [], missing: [], compliance: 0, alertLevel: "" });
    setSeconds(0);
    setHint("连接服务器...");

    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    streamRef.current = mediaStream;
    const badgeID = worker ? `BADGE-${worker.phone.replace(/\D/g, "").slice(-4) || worker.id.slice(-6)}` : "SIM-" + Date.now().toString(36).toUpperCase();

    ws.onopen = async () => {
      ws.send(JSON.stringify({
        type: "start",
        badge_id: badgeID,
        ts: new Date().toISOString(),
        worker_id: worker?.id ?? "",
        worker_name: worker?.name ?? "",
        service_object_id: task?.serviceObjectId ?? "",
        service_object_name: task?.serviceObjectName ?? "",
        service_project: task?.serviceProject ?? "",
        client_context: task?.clientContext ?? "",
        schedule_id: task?.scheduleId ?? "",
      }));
      setState("recording");
      setHint("AI 督导已就绪，正在听...");
      recordingStartRef.current = Date.now();

      sendBadgeEvent({ type: "badge_button_press", state: "connected_recording", timestamp: Date.now(), recordingStartTime: Date.now() });

      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }, 1000);

      heartbeatRef.current = setInterval(() => {
        sendBadgeEvent({ type: "badge_heartbeat", state: "connected_recording", timestamp: Date.now() });
      }, 2000);

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(mediaStream);
      sourceRef.current = source;

      try {
        const code = `class P extends AudioWorkletProcessor{process(inputs){const ch=inputs[0]?.[0];if(!ch)return true;const buf=new Int16Array(ch.length);for(let i=0;i<ch.length;i++){const s=Math.max(-1,Math.min(1,ch[i]));buf[i]=s<0?s*32768:s*32767;}this.port.postMessage(buf.buffer,[buf.buffer]);return true;}}registerProcessor('pcm-proc',P);`;
        const url = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
        await audioCtx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        const worklet = new AudioWorkletNode(audioCtx, "pcm-proc");
        worklet.port.onmessage = (ev) => { if (ws.readyState === 1) ws.send(ev.data); };
        source.connect(worklet);
        worklet.connect(audioCtx.destination);
        workletRef.current = worklet;
      } catch {
        const sn = audioCtx.createScriptProcessor(2048, 1, 1);
        sn.onaudioprocess = (ev) => {
          if (!ws || ws.readyState !== 1) return;
          const f = ev.inputBuffer.getChannelData(0);
          const b = new Int16Array(f.length);
          for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); b[i] = s < 0 ? s * 32768 : s * 32767; }
          ws.send(b.buffer);
        };
        source.connect(sn);
        sn.connect(audioCtx.destination);
        workletRef.current = sn;
      }
    };

    ws.onmessage = handleWSMessage;
    ws.onerror = () => { setHint("连接失败"); setState("idle"); };
  }, [handleWSMessage]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (workletRef.current) { workletRef.current.disconnect(); workletRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (wsRef.current?.readyState === 1) wsRef.current.send(JSON.stringify({ type: "stop", ts: new Date().toISOString() }));
    setState("processing");
    setHint("生成完整服务记录中...");
    setTimeout(() => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      setState(prev => prev === "processing" ? "idle" : prev);
    }, 30000);
  }, []);

  const toggleRecord = useCallback(() => {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  }, [state, startRecording, stopRecording]);

  const resetAll = useCallback(() => {
    setServiceRecord(null);
    setOfflineReport(null);
    setTranscriptLines([]);
    setInterimText("");
    setAlerts([]);
    setSopCheck({ completed: [], missing: [], compliance: 0, alertLevel: "" });
    setSeconds(0);
    setHint("点击开始模拟上门服务");
    setState("idle");
    sendBadgeEvent({ type: "badge_state", state: "connected_idle", timestamp: Date.now() });
  }, []);

  useEffect(() => {
    if (transcriptBoxRef.current) transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
  }, [transcriptLines, interimText]);

  useEffect(() => {
    sendBadgeEvent({ type: "badge_state", state: "connected_idle", timestamp: Date.now() });
    return () => {
      sendBadgeEvent({ type: "badge_state", state: "disconnected", timestamp: Date.now() });
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const compPct = Math.round(sopCheck.compliance * 100);
  const compColor = compPct >= 80 ? "var(--sim-success)" : compPct >= 50 ? "var(--sim-warning)" : "var(--sim-danger)";
  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const btnClass = isRecording ? "sim-rec-btn recording" : isProcessing ? "sim-rec-btn processing" : "sim-rec-btn idle";
  const btnText = isRecording ? "停止" : isProcessing ? "..." : "开始";

  return (
    <div className={`sim-shell ${embedded ? "sim-shell--embedded" : ""}`}>
      {!embedded && (
        <div className="sim-header">
          <h1>智能工牌模拟器</h1>
          <p>{task ? `${task.serviceProject} · ${task.serviceObjectName}` : worker ? `${worker.name} · ${worker.site}` : "GoldenYears · 实时ASR + AI督导"}</p>
        </div>
      )}
      <div className="sim-grid">
        <div className="sim-col">
          <div className="sim-card">
            <div className="sim-rec-row">
              <button className={btnClass} onClick={toggleRecord} disabled={isProcessing}>{btnText}</button>
              <div className="sim-rec-info">
                <div className="sim-timer">{formatTime(seconds)}</div>
                <div className="sim-hint">{hint}</div>
              </div>
            </div>
          </div>
          <div className="sim-card" style={{ flex: 1 }}>
            <h3 className="sim-section-title">实时转写</h3>
            <div className="sim-transcript" ref={transcriptBoxRef}>
              {transcriptLines.length === 0 && !interimText ? (
                <div className="sim-transcript-empty">{isRecording ? "正在听，请说话..." : "点击「开始」按钮，对着麦克风说话"}</div>
              ) : (
                <>
                  {transcriptLines.map((line, i) => {
                    const sp = line.speaker && speakerMap[line.speaker] ? speakerMap[line.speaker] : line.speaker;
                    const cls = sp === "社工" ? "worker" : sp === "老人" ? "elder" : "";
                    return (<div key={i}>{sp && <span className={`sim-speaker-tag ${cls}`}>{sp}</span>}<span className={cls}>{line.text}</span></div>);
                  })}
                  {interimText && <div className="sim-interim">{interimText}<span className="sim-cursor" /></div>}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="sim-col">
          <div className="sim-card">
            <h3 className="sim-section-title">AI 实时督导</h3>
            <div className="sim-alert-log">
              {alerts.length === 0 ? (
                <div className="sim-alert-empty">等待服务开始...</div>
              ) : alerts.map((a, i) => (
                <div key={i} className={`sim-alert ${a.level === "danger" ? "danger" : a.level === "info" || a.level === "none" ? "info" : "warning"}`}>
                  <span className="sim-alert-icon">{a.level === "danger" ? "\u{1F6A8}" : a.level === "info" || a.level === "none" ? "\u{1F4A1}" : "⚠️"}</span>
                  <span className="sim-alert-text">{a.text}</span>
                  <span className="sim-alert-time">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
          {serviceRecord && (
            <div className="sim-card">
              <h3 className="sim-section-title">服务记录</h3>
              <ServiceRecordDisplay record={serviceRecord} />
              <button className="sim-btn-reset" onClick={resetAll}>重新开始</button>
            </div>
          )}
          {offlineReport && (
            <div className="sim-card sim-card--offline">
              <h3 className="sim-section-title">最终版报告（离线分析对照）</h3>
              <div className="sim-result-block">
                <div className="sim-result-label">离线转写（说话人分离）</div>
                <div className="sim-transcript" style={{ maxHeight: 200 }}>
                  {offlineReport.offlineTranscript.sentences?.map((s, i) => (
                    <div key={i}><span className={`sim-speaker-tag ${s.speaker_id === 0 ? "worker" : "elder"}`}>说话人{s.speaker_id}</span>{s.text}</div>
                  ))}
                </div>
              </div>
              <ServiceRecordDisplay record={offlineReport.finalServiceRecord} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceRecordDisplay({ record }: { record: ServiceRecordData }) {
  const conf = Math.round((record.confidence || 0) * 100);
  const comp = Math.round((record.completeness || 0) * 100);
  const sop = record.sop_compliance;
  let sopVal = "-";
  if (sop && typeof sop === "object" && !Array.isArray(sop)) {
    const v = Object.values(sop as Record<string, boolean>);
    sopVal = `${v.filter(Boolean).length}/${v.length}`;
  } else if (typeof sop === "number") {
    sopVal = `${Math.round(sop * 100)}%`;
  }
  const detail = (record.detail || record) as Record<string, any>;
  const fields: [string, string[]][] = [
    ["健康发现", ["health_findings", "health_status"]],
    ["用药情况", ["medication_status", "medication_compliance"]],
    ["生活状态", ["living_status", "daily_living"]],
    ["安全问题", ["safety_issues", "safety_assessment"]],
    ["心理状态", ["mental_status", "psychological_wellbeing"]],
  ];
  const anomalies = (record.anomalies || []).map(a => typeof a === "string" ? a : JSON.stringify(a));
  return (
    <>
      <div className="sim-metrics">
        <div className="sim-metric"><div className="sim-metric-val" style={{ color: conf >= 80 ? "var(--sim-success)" : "var(--sim-warning)" }}>{conf}%</div><div className="sim-metric-label">置信度</div></div>
        <div className="sim-metric"><div className="sim-metric-val" style={{ color: comp >= 80 ? "var(--sim-success)" : "var(--sim-warning)" }}>{comp}%</div><div className="sim-metric-label">完整度</div></div>
        <div className="sim-metric"><div className="sim-metric-val">{sopVal}</div><div className="sim-metric-label">SOP</div></div>
      </div>
      <div className="sim-result-block"><div className="sim-result-label">服务摘要</div><div className="sim-result-value">{record.summary || detail.summary || ""}</div></div>
      {fields.map(([label, keys]) => {
        const val = keys.map(k => detail[k] || record[k]).find(v => v && typeof v === "string");
        if (!val) return null;
        return <div key={label} className="sim-result-block"><div className="sim-result-label">{label}</div><div className="sim-result-value">{val as string}</div></div>;
      })}
      <div className="sim-result-block"><div className="sim-result-label">反馈建议</div><div className="sim-result-value sim-result-value--accent">{record.feedback_text || ""}</div></div>
      <div className="sim-result-block"><div className="sim-result-label">异常检测</div>
        {anomalies.length === 0 ? <div className="sim-result-value" style={{ color: "var(--sim-success)" }}>无异常</div>
          : anomalies.map((a, i) => <div key={i} className="sim-anomaly">{a}</div>)}
      </div>
    </>
  );
}
