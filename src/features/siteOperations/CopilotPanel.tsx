import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, X } from "lucide-react";
import { useAgentChat } from "./useAgentChat";
import { ChatStream } from "./ChatStream";
import { CommandInput } from "./CommandInput";

const WORK_AREA_LABELS: Record<string, string> = {
  social_workers: "服务人员",
  smart_badges: "设备",
  service_objects: "服务对象",
  service_schedules: "服务排期",
  service_records: "服务记录",
};

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 360;

interface CopilotPanelProps {
  workAreaId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CopilotPanel({ workAreaId, isOpen, onClose }: CopilotPanelProps) {
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

  const getToken = useCallback(() => {
    return localStorage.getItem("gy_chat_token") ?? "";
  }, []);

  const { messages, connected, wip, handleSend, endRef } = useAgentChat({
    agentId: "lumii-goldenyears",
    sessionId: workAreaId,
    getToken,
  });

  return (
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
        <span>AI 助手 · {WORK_AREA_LABELS[workAreaId] ?? workAreaId}</span>
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
        />
      </div>
      <footer className="copilot-panel__footer">
        <CommandInput
          onSend={handleSend}
          disabled={!connected}
          placeholder="输入指令..."
          compact
        />
      </footer>
    </aside>
  );
}
