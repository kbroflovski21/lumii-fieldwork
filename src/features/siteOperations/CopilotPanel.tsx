import { useEffect, useRef, useState } from "react";
import { Bot, X } from "lucide-react";
import { ChatStream } from "./ChatStream";
import { CommandInput, type SlashCommand } from "./CommandInput";
import type { ChatMessage } from "./useAgentChat";

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 360;

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  connected: boolean;
  wip: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
  onSend: (content: string) => void;
  onNavigate?: (area: string, params: Record<string, string>) => void;
  onCardAction?: (msgId: string | number, value: string) => void;
  title?: string;
  commands?: SlashCommand[];
}

export function CopilotPanel({ isOpen, onClose, messages, connected, wip, endRef, onSend, onNavigate, onCardAction, title, commands }: CopilotPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (isOpen && endRef.current) {
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "instant" }));
    }
  }, [isOpen, messages, wip, endRef]);

  return (
    <>
      <aside
        className="copilot-panel"
        aria-label="AI 助手"
        data-open={isOpen}
        style={{ width }}
      >
        <div
          className="copilot-panel__drag"
          onMouseDown={() => {
            dragging.current = true;
            document.body.style.cursor = "col-resize";
          }}
        />
        <header className="copilot-panel__header">
          <Bot size={18} />
          <span>{title ?? "AI 助手"}</span>
          <button onClick={onClose} type="button" aria-label="关闭 AI 助手">
            <X size={18} />
          </button>
        </header>
        <div className="copilot-panel__body">
          <ChatStream
            messages={messages}
            wip={wip}
            connected={connected}
            endRef={endRef}
            compact
            onNavigate={onNavigate}
            onCardAction={onCardAction}
          />
        </div>
        <footer className="copilot-panel__footer">
          <CommandInput
            onSend={onSend}
            commands={commands}
            disabled={!connected}
            placeholder="输入 / 查看命令..."
            compact
          />
        </footer>
      </aside>
      {isOpen && <div className="copilot-mobile-backdrop" onClick={onClose} />}
    </>
  );
}
