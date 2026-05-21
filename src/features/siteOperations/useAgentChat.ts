import { useState, useEffect, useRef, useCallback } from "react";

export interface ChatMessage {
  id: string | number;
  role: "user" | "assistant";
  content: string;
  msgType: "text" | "card" | "buttons" | "stream";
  cardData?: unknown;
  timestamp: string;
  isStreaming?: boolean;
  sendStatus?: "sending" | "sent" | "failed";
}

interface UseAgentChatOptions {
  agentId: string;
  sessionId: string;
  siteId?: string;
  getToken: () => string;
}

interface UseAgentChatReturn {
  messages: ChatMessage[];
  connected: boolean;
  sending: boolean;
  wip: boolean;
  handleSend: (content: string) => void;
  sendCardAction: (msgId: string | number, action: string) => void;
  endRef: React.RefObject<HTMLDivElement | null>;
}

export function useAgentChat({ agentId, sessionId, siteId, getToken }: UseAgentChatOptions): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [wip, setWip] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const turnActiveRef = useRef(false);
  const initReceivedRef = useRef(false);

  // Auto-scroll when new messages arrive or wip changes
  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === "function") {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, wip]);

  useEffect(() => {
    if (!agentId) return;

    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let healthCheckTimer: ReturnType<typeof setInterval>;
    let closed = false;
    let cachedWsUrl = "";

    async function init() {
      const token = getToken();
      if (!token || closed) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const effectiveSession = siteId ? `${sessionId}:${siteId}` : sessionId;
      cachedWsUrl = `${protocol}//${window.location.host}/api/ws/chat?agentId=${agentId}&sessionId=${effectiveSession}&token=${token}`;
      connect();
    }

    function connect() {
      if (!cachedWsUrl || closed) return;
      // Reset init gate on new connection
      initReceivedRef.current = false;
      turnActiveRef.current = false;

      ws = new WebSocket(cachedWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Wait for init frame
      };

      ws.onmessage = (evt) => {
        try {
          const frame = JSON.parse(evt.data);
          handleFrame(frame);
        } catch {
          // Ignore non-JSON frames
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    // Health check: reconnect if WS is not open
    healthCheckTimer = setInterval(() => {
      if (closed) return;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect();
      }
    }, 5000);

    /** Progress card prefix to filter out in all frame types */
    const PROGRESS_PREFIX = "__lak_progress_card_v1__:";

    function handleFrame(frame: any) {
      // Init gate: don't process message/stream frames before init
      if (frame.type !== "init" && frame.type !== "error" && !initReceivedRef.current) {
        return;
      }

      switch (frame.type) {
        case "init":
          initReceivedRef.current = true;
          turnActiveRef.current = false;
          setConnected(frame.connected);
          setWip(frame.wip);
          setMessages(frame.messages.map(toMessage));
          break;

        case "message":
          if (frame.content?.startsWith(PROGRESS_PREFIX)) break;
          setMessages((prev) => {
            // Dedup: if this message ID already exists (from stream_end), skip
            if (prev.some((m) => m.id === frame.id)) return prev;
            // Echo dedup: match optimistic user bubble by content (strip [ctx:] prefix)
            if (frame.role === "user") {
              const stripped = (frame.content ?? "").replace(/^\[ctx:[^\]]*\]\s*/, "");
              const idx = prev.findIndex((m) => m.sendStatus === "sending" && (m.content === frame.content || m.content === stripped) && m.role === "user");
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], id: frame.id, sendStatus: "sent", timestamp: frame.timestamp };
                return updated;
              }
            }
            // Dedup: if assistant message content matches last streamed message, update ID only
            if (frame.role === "assistant") {
              const lastAssistant = [...prev].reverse().find((m) => m.role === "assistant" && !m.isStreaming);
              if (lastAssistant && lastAssistant.content === frame.content) {
                return prev.map((m) => m === lastAssistant ? { ...m, id: frame.id, timestamp: frame.timestamp } : m);
              }
            }
            return [...prev, toMessage(frame)];
          });
          setSending(false);
          break;

        case "stream_start":
          if (frame.content?.startsWith(PROGRESS_PREFIX)) break;
          setMessages((prev) => {
            if (prev.some((m) => m.id === frame.msg_id)) return prev;
            return [...prev, { id: frame.msg_id, role: "assistant", content: frame.content ?? "", msgType: "stream", timestamp: "", isStreaming: true }];
          });
          break;

        case "stream_chunk":
          if (frame.content?.startsWith(PROGRESS_PREFIX)) break;
          setMessages((prev) => prev.map((m) => m.id === frame.msg_id ? { ...m, content: frame.content } : m));
          break;

        case "stream_end":
          setMessages((prev) => prev.map((m) => m.id === frame.msg_id ? { ...m, content: frame.content, isStreaming: false, msgType: "text" } : m));
          setSending(false);
          break;

        case "turn_active":
          turnActiveRef.current = frame.active === true;
          if (frame.active) setWip(true);
          break;

        case "wip_update":
          // Suppress wip=false when turn is still active
          if (frame.wip === false && turnActiveRef.current) break;
          setWip(frame.wip === true);
          break;

        case "status":
          setConnected(frame.connected);
          break;

        case "history":
          setMessages((prev) => [...frame.messages.map(toMessage), ...prev]);
          break;

        case "error":
          console.error("[chat] server error:", frame.error);
          break;
      }
    }

    init();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      clearInterval(healthCheckTimer);
      ws?.close();
    };
  }, [agentId, sessionId, siteId, getToken]);

  const handleSend = useCallback((content: string) => {
    if (!content.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    setSending(true);
    setWip(true);

    const displayContent = content.replace(/^\[ctx:[^\]]*\]\s*/, "");
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      role: "user",
      content: displayContent,
      msgType: "text",
      timestamp: new Date().toISOString(),
      sendStatus: "sending",
    };
    setMessages((prev) => [...prev, optimistic]);

    wsRef.current.send(JSON.stringify({ type: "send", content }));
  }, []);

  const sendCardAction = useCallback((msgId: string | number, action: string) => {
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: "card_action", msg_id: String(msgId), action }));
  }, []);

  return { messages, connected, sending, wip, handleSend, sendCardAction, endRef };
}

function toMessage(row: any): ChatMessage {
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    msgType: row.msg_type || "text",
    cardData: row.card_data ? (typeof row.card_data === "string" ? JSON.parse(row.card_data) : row.card_data) : undefined,
    timestamp: row.timestamp || row.created_at || "",
    isStreaming: false,
  };
}
