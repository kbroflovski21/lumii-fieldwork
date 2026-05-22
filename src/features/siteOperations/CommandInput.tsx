import React, { useState, useCallback, useRef, useEffect } from "react";

export interface SlashCommand {
  command: string;
  description: string;
}

export const SITE_OPS_COMMANDS: SlashCommand[] = [
  { command: "/help", description: "展示所有可用命令" },
  { command: "/worker-create", description: "创建新的服务人员档案" },
  { command: "/worker-query", description: "查询服务人员列表或详情" },
  { command: "/worker-update", description: "更新服务人员信息或状态" },
  { command: "/badge-activate", description: "激活并绑定新的智能工牌" },
  { command: "/badge-query", description: "查询智能工牌列表或详情" },
  { command: "/badge-update", description: "更新工牌状态或服务人员绑定" },
  { command: "/object-create", description: "创建新的长者档案" },
  { command: "/object-query", description: "查询长者档案或详情" },
  { command: "/object-update", description: "更新长者档案或服务计划" },
  { command: "/schedule-create", description: "创建按次服务排期" },
  { command: "/schedule-query", description: "查询服务排期列表" },
  { command: "/schedule-adjust", description: "调整排期时间、人员或取消" },
  { command: "/record-query", description: "查询服务记录列表或详情" },
  { command: "/record-review", description: "执行服务记录复核操作" },
  { command: "/record-export", description: "导出服务记录凭证包" },
];

export const ADMIN_COMMANDS: SlashCommand[] = [
  { command: "/help", description: "展示所有可用命令" },
  { command: "/quality-overview", description: "查看全站服务质量总览" },
  { command: "/quality-compare", description: "跨站点质量对比分析" },
  { command: "/site-query", description: "查询站点列表或详情" },
  { command: "/site-update", description: "更新站点信息或运营人员" },
  { command: "/user-create", description: "创建系统用户账号" },
  { command: "/user-query", description: "查询用户列表或详情" },
  { command: "/user-update", description: "更新用户信息或状态" },
  { command: "/sop-query", description: "查询服务规范文档" },
];

interface CommandInputProps {
  onSend: (content: string) => void;
  commands?: SlashCommand[];
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
}

const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;

export function CommandInput({ onSend, commands, disabled, placeholder, compact }: CommandInputProps) {
  const cmds = commands ?? SITE_OPS_COMMANDS;
  const [value, setValue] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const toggleVoice = useCallback(() => {
    if (!SpeechRecognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as SpeechRecognitionResultList)
        .map((r: any) => r[0].transcript).join("");
      setValue(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  const filtered = value.startsWith("/")
    ? cmds.filter(c => c.command.startsWith(value.toLowerCase()))
    : [];

  const menuVisible = showMenu && filtered.length > 0;

  useEffect(() => {
    if (value.startsWith("/") && value.length >= 1) {
      setShowMenu(true);
      setSelectedIdx(0);
    } else {
      setShowMenu(false);
    }
  }, [value]);

  useEffect(() => {
    if (menuVisible && menuRef.current) {
      const el = menuRef.current.children[selectedIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIdx, menuVisible]);

  const selectCommand = useCallback((cmd: SlashCommand) => {
    setValue(cmd.command + " ");
    setShowMenu(false);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
    setShowMenu(false);
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (menuVisible) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        selectCommand(filtered[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        setShowMenu(false);
        return;
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }, [menuVisible, filtered, selectedIdx, selectCommand, handleSubmit]);

  return (
    <form className={`command-input ${compact ? "command-input--compact" : ""}`} onSubmit={handleSubmit}>
      {menuVisible && (
        <div className="command-input__menu" ref={menuRef}>
          {filtered.map((cmd, i) => (
            <button
              key={cmd.command}
              type="button"
              className="command-input__menu-item"
              data-selected={i === selectedIdx}
              onMouseDown={(e) => { e.preventDefault(); selectCommand(cmd); }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span className="command-input__menu-cmd">{cmd.command}</span>
              <span className="command-input__menu-desc">{cmd.description}</span>
            </button>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        className="command-input__field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowMenu(false), 150)}
        placeholder={placeholder ?? "输入 / 查看命令..."}
        disabled={disabled}
      />
      {SpeechRecognition && (
        <button
          type="button"
          className={`command-input__voice${listening ? " command-input__voice--active" : ""}`}
          onClick={toggleVoice}
          disabled={disabled}
          aria-label={listening ? "停止语音" : "语音输入"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      )}
      <button
        type="submit"
        className="command-input__send"
        disabled={disabled || !value.trim()}
        aria-label="发送"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </form>
  );
}
