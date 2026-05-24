import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { Bot, CalendarDays, ChevronDown, ChevronUp, ClipboardList, FileText, Smartphone, UserRound, UsersRound, X } from "lucide-react";
import { workAreas, type WorkAreaId } from "./contracts";
import { CopilotPanel } from "./CopilotPanel";
import { SITE_OPS_COMMANDS, HeaderCopilotInput } from "./CommandInput";
import { useAgentChat } from "./useAgentChat";
import { ProfileMenu } from "../../shared/ProfileMenu";
import { useSite } from "../../auth/SiteContext";

const icons = {
  home: Bot,
  social_workers: UsersRound,
  smart_badges: Smartphone,
  service_schedules: CalendarDays,
  service_records: FileText,
  service_objects: UserRound,
} satisfies Record<WorkAreaId, typeof Bot>;

const AREA_LABELS: Record<string, string> = {
  home: "首页",
  social_workers: "服务人员",
  smart_badges: "设备",
  service_objects: "长者",
  service_schedules: "服务排期",
  service_records: "服务记录",
};

type SiteOperationsShellProps = {
  activeArea: WorkAreaId;
  children: ReactNode;
  onSelectArea: (area: WorkAreaId) => void;
  onCopilotNavigate?: (area: string, search?: string) => void;
};

export function SiteOperationsShell({ activeArea, children, onSelectArea, onCopilotNavigate }: SiteOperationsShellProps) {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const { currentSite, sites, selectSite } = useSite();
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const siteDropRef = useRef<HTMLDivElement>(null);
  const getToken = useCallback(() => localStorage.getItem("gy_chat_token") ?? "", []);

  const { messages, connected, wip, handleSend, sendCardAction, endRef } = useAgentChat({
    agentId: "lumii-goldenyears",
    sessionId: "copilot",
    siteId: currentSite?.id,
    getToken,
  });

  const sendWithContext = useCallback((content: string) => {
    const label = AREA_LABELS[activeArea] ?? activeArea;
    handleSend(`[ctx:${label}] ${content}`);
  }, [activeArea, handleSend]);

  const openCopilotWithMessage = useCallback((msg: string) => {
    sendWithContext(msg);
    setCopilotOpen(true);
  }, [sendWithContext]);

  const handleCopilotNavigate = useCallback((area: string, params: Record<string, string>) => {
    if (area) {
      onSelectArea(area as WorkAreaId);
      onCopilotNavigate?.(area, params.search);
    }
  }, [onSelectArea, onCopilotNavigate]);

  useEffect(() => {
    if (!siteDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (siteDropRef.current && !siteDropRef.current.contains(e.target as Node)) setSiteDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [siteDropdownOpen]);

  return (
    <div className="site-operations-root">
      <div
        className="site-operations-shell"
        data-copilot-open={copilotOpen}
      >
        <header className="site-operations-header">
          {currentSite && sites.length > 0 ? (
            <div className="so-site-picker" ref={siteDropRef}>
              <button
                className="so-site-picker__trigger"
                onClick={() => sites.length > 1 && setSiteDropdownOpen(!siteDropdownOpen)}
                type="button"
                data-open={siteDropdownOpen}
              >
                <span className="so-site-picker__avatar">{currentSite.name.charAt(0)}</span>
                <span className="so-site-picker__name">{currentSite.name}</span>
                {sites.length > 1 && (siteDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
              </button>
              {siteDropdownOpen && sites.length > 1 && (
                <div className="so-site-picker__panel">
                  <div className="so-site-picker__panel-header">
                    <span>切换站点</span>
                    <button type="button" className="so-site-picker__close" onClick={() => setSiteDropdownOpen(false)}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="so-site-picker__list">
                    {sites.map(s => (
                      <button
                        key={s.id}
                        className="so-site-picker__item"
                        data-active={s.id === currentSite.id}
                        onClick={() => { selectSite(s); setSiteDropdownOpen(false); }}
                        type="button"
                      >
                        <span className="so-site-picker__item-avatar">{s.name.charAt(0)}</span>
                        <span className="so-site-picker__item-info">
                          <span className="so-site-picker__item-name">{s.name}</span>
                          <span className="so-site-picker__item-meta">
                            <span className="so-site-picker__dot" />
                            运行中
                          </span>
                        </span>
                        {s.id === currentSite.id && <span className="so-site-picker__badge">当前</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="so-site-picker">
              <span className="so-site-picker__avatar" style={{ background: "var(--site-muted, #8C7E73)" }}>?</span>
              <span className="so-site-picker__name" style={{ color: "var(--site-muted, #8C7E73)" }}>未选择站点</span>
            </div>
          )}
          <p className="so-site-picker__status">
            <span className="so-site-picker__status-dot" />
            运行中 · 今日服务 18 单
          </p>
          <div className="site-operations-header__actions">
            <HeaderCopilotInput
              onSend={openCopilotWithMessage}
              onOpenPanel={() => setCopilotOpen(true)}
              commands={SITE_OPS_COMMANDS}
              panelOpen={copilotOpen}
            />
          </div>
        </header>
        <AreaNav
          activeArea={activeArea}
          ariaLabel="站点运营工作区"
          className="site-operations-rail"
          onSelectArea={onSelectArea}
          showLabels={false}
          profileSlot={<ProfileMenu />}
        />
        <main className="site-operations-main">{children}</main>
        <CopilotPanel
          isOpen={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          messages={messages}
          connected={connected}
          wip={wip}
          endRef={endRef}
          onSend={sendWithContext}
          onNavigate={handleCopilotNavigate}
          onCardAction={sendCardAction}
          title="AI 助手"
        />
        {!copilotOpen && (
          <button
            className="copilot-mobile-fab"
            onClick={() => setCopilotOpen(true)}
            type="button"
            aria-label="打开 AI 助手"
          >
            <Bot size={24} color="#FFFCF8" />
          </button>
        )}
        <AreaNav
          activeArea={activeArea}
          ariaLabel="站点运营移动工作区"
          className="site-operations-mobile-nav"
          onSelectArea={onSelectArea}
          showLabels
        />
      </div>
    </div>
  );
}

function AreaNav({
  activeArea,
  ariaLabel,
  className,
  onSelectArea,
  showLabels,
  profileSlot,
}: {
  activeArea: WorkAreaId;
  ariaLabel: string;
  className: string;
  onSelectArea: (area: WorkAreaId) => void;
  showLabels: boolean;
  profileSlot?: ReactNode;
}) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      {workAreas.map((area) => {
        const Icon = icons[area.id];
        return (
          <button
            aria-label={area.label}
            title={area.label}
            data-active={activeArea === area.id}
            key={area.id}
            onClick={() => onSelectArea(area.id)}
            type="button"
          >
            <Icon size={showLabels ? 20 : 18} />
            {showLabels ? <span>{area.label}</span> : null}
          </button>
        );
      })}
      {profileSlot}
    </nav>
  );
}
