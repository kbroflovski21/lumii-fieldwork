import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "./useAgentChat";
import { CardBubble } from "./CardBubble";
import type { CardData } from "./CardBubble";

interface ChatStreamProps {
  messages: ChatMessage[];
  wip: boolean;
  connected: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
  compact?: boolean;
  onNavigate?: (area: string, params: Record<string, string>) => void;
  onCardAction?: (msgId: string | number, value: string) => void;
}

function parseGyLink(href: string): { area: string; params: Record<string, string> } | null {
  if (!href.startsWith("gy://")) return null;
  try {
    const rest = href.slice(5);
    const qIdx = rest.indexOf("?");
    const area = qIdx >= 0 ? rest.slice(0, qIdx) : rest;
    const params: Record<string, string> = {};
    if (qIdx >= 0) new URLSearchParams(rest.slice(qIdx + 1)).forEach((v, k) => { params[k] = v; });
    return { area, params };
  } catch { return null; }
}

export function ChatStream({ messages, wip, connected, endRef, compact, onNavigate, onCardAction }: ChatStreamProps) {
  const visibleMessages = messages.filter((m) => !m.content.startsWith("__lak_progress_card_v1__:"));

  const mdComponents = useMemo(() => ({
    a(props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) {
      const { href, children, ...rest } = props;
      if (href) {
        const gy = parseGyLink(href);
        if (gy) {
          return (
            <span
              className="gy-link"
              role="link"
              tabIndex={0}
              onClick={() => onNavigate?.(gy.area, gy.params)}
              onKeyDown={(e) => { if (e.key === "Enter") onNavigate?.(gy.area, gy.params); }}
            >
              {children}
            </span>
          );
        }
      }
      return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
    },
  }), [onNavigate]);

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
              {msg.msgType === "card" && msg.cardData ? (
                <CardBubble card={msg.cardData as CardData} msgId={msg.id} onAction={onCardAction} />
              ) : msg.isStreaming && !msg.content ? (
                <span className="chat-bubble__typing"><span /><span /><span /></span>
              ) : msg.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents} urlTransform={(url) => url}>
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
              <span className="chat-bubble__typing"><span /><span /><span /></span>
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
