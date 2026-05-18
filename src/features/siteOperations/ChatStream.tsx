import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "./useAgentChat";

interface ChatStreamProps {
  messages: ChatMessage[];
  wip: boolean;
  connected: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
  compact?: boolean;
}

export function ChatStream({ messages, wip, connected, endRef, compact }: ChatStreamProps) {
  const visibleMessages = messages.filter((m) => !m.content.startsWith("__lak_progress_card_v1__:"));

  return (
    <div className={`chat-stream ${compact ? "chat-stream--compact" : ""}`}>
      {!connected && (
        <div className="chat-stream__status">AI 助手离线中...</div>
      )}
      {visibleMessages.map((msg) => (
        <div key={msg.id} className={`chat-bubble chat-bubble--${msg.role}`}>
          {msg.role === "assistant" && <div className="chat-bubble__avatar">AI</div>}
          <div className="chat-bubble__body">
            <div className="chat-bubble__content">
              {msg.isStreaming && !msg.content ? (
                <span className="chat-bubble__typing">思考中...</span>
              ) : msg.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
              {msg.isStreaming && msg.content && <span className="chat-bubble__cursor" />}
            </div>
            {msg.timestamp && (
              <div className="chat-bubble__time">
                {formatTime(msg.timestamp)}
              </div>
            )}
          </div>
          {msg.sendStatus === "sending" && <span className="chat-bubble__spinner" />}
        </div>
      ))}
      {wip && !messages.some((m) => m.isStreaming) && (
        <div className="chat-bubble chat-bubble--assistant">
          <div className="chat-bubble__avatar">AI</div>
          <div className="chat-bubble__body">
            <div className="chat-bubble__content">
              <span className="chat-bubble__typing">正在思考...</span>
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function formatTime(ts: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
