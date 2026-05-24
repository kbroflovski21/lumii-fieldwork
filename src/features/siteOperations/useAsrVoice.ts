import { useCallback, useRef, useState } from "react";

const FRAME_SIZE = 1280;
const TARGET_SAMPLE_RATE = 16000;
const SEND_INTERVAL_MS = 40;

export function useAsrVoice(onText: (text: string, isFinal: boolean, segId?: number) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const bufferRef = useRef<Int16Array>(new Int16Array(0));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try { wsRef.current.send('{"end":true}'); } catch {}
      setTimeout(() => { wsRef.current?.close(); wsRef.current = null; }, 1000);
    } else {
      wsRef.current = null;
    }
    bufferRef.current = new Int16Array(0);
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: TARGET_SAMPLE_RATE, channelCount: 1, echoCancellation: true } });
      streamRef.current = stream;

      const token = localStorage.getItem("gy_auth_token") ?? "";
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/asr?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "result") {
            onText(msg.text, msg.isFinal, msg.segId);
          } else if (msg.type === "error") {
            console.error("[ASR]", msg.error);
            stop();
          }
        } catch {}
      };

      ws.onerror = () => stop();
      ws.onclose = () => setListening(false);

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject();
        setTimeout(() => reject(new Error("ws timeout")), 5000);
      });

      // Wait for "ready" from server (xfyun connected)
      await new Promise<void>((resolve) => {
        const origHandler = ws.onmessage;
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === "ready") { ws.onmessage = origHandler; resolve(); return; }
          } catch {}
          if (origHandler) (origHandler as any)(ev);
        };
        setTimeout(resolve, 3000);
      });

      const audioCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      ctxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const prev = bufferRef.current;
        const merged = new Int16Array(prev.length + pcm16.length);
        merged.set(prev);
        merged.set(pcm16, prev.length);
        bufferRef.current = merged;
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      // Send 1280-byte frames every 40ms
      timerRef.current = setInterval(() => {
        const buf = bufferRef.current;
        const bytesNeeded = FRAME_SIZE;
        const samplesNeeded = bytesNeeded / 2;
        if (buf.length < samplesNeeded) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const frame = buf.slice(0, samplesNeeded);
        bufferRef.current = buf.slice(samplesNeeded);
        wsRef.current.send(frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength));
      }, SEND_INTERVAL_MS);

      setListening(true);
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError" || err?.message?.includes("permission")
        ? "麦克风权限被拒绝，请在浏览器设置中允许"
        : !navigator.mediaDevices || location.protocol === "http:"
          ? "语音输入需要 HTTPS 环境"
          : "语音输入启动失败: " + (err?.message ?? "未知错误");
      setError(msg);
      setTimeout(() => setError(""), 5000);
      stop();
    }
  }, [onText, stop]);

  const toggle = useCallback(() => {
    setError("");
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  return { listening, toggle, stop, error };
}
