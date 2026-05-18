import { useState, type ReactNode } from "react";
import { Bot, CalendarDays, ClipboardList, FileText, Smartphone, UserRound, UsersRound } from "lucide-react";
import { workAreas, type WorkAreaId } from "./contracts";
import { CopilotPanel } from "./CopilotPanel";
import { useAuth } from "../../auth/AuthContext";

const icons = {
  home: Bot,
  social_workers: UsersRound,
  smart_badges: Smartphone,
  service_schedules: CalendarDays,
  service_records: FileText,
  service_objects: UserRound
} satisfies Record<WorkAreaId, typeof Bot>;

/** Map non-home area IDs to copilot session IDs */
const copilotAreaId = (area: WorkAreaId): string => area;

type SiteOperationsShellProps = {
  activeArea: WorkAreaId;
  children: ReactNode;
  onSelectArea: (area: WorkAreaId) => void;
};

export function SiteOperationsShell({ activeArea, children, onSelectArea }: SiteOperationsShellProps) {
  const { user, logout } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const showCopilot = activeArea !== "home";

  return (
    <div className="site-operations-root">
      <div
        className="site-operations-shell"
        data-copilot-open={showCopilot && copilotOpen}
      >
        <header className="site-operations-header">
          <div className="site-operations-header__logo">
            <ClipboardList size={19} />
          </div>
          <div>
            <h1>Lumii 站点运营助手</h1>
            <p>
              <span />
              运行中 · 今日服务 18 单
            </p>
          </div>
          <div className="so-shell__user">
            <span>{user?.name}</span>
            <button onClick={logout} className="so-shell__logout" aria-label="退出登录">退出</button>
          </div>
          {showCopilot ? (
            <button
              className="copilot-toggle"
              data-active={copilotOpen}
              onClick={() => setCopilotOpen((prev) => !prev)}
              type="button"
              aria-label={copilotOpen ? "关闭 AI 助手" : "打开 AI 助手"}
            >
              <Bot size={18} />
            </button>
          ) : null}
        </header>
        <AreaNav
          activeArea={activeArea}
          ariaLabel="站点运营工作区"
          className="site-operations-rail"
          onSelectArea={onSelectArea}
          showLabels={false}
        />
        <main className="site-operations-main">{children}</main>
        {showCopilot ? (
          <CopilotPanel
            workAreaId={copilotAreaId(activeArea)}
            isOpen={copilotOpen}
            onClose={() => setCopilotOpen(false)}
          />
        ) : null}
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
  showLabels
}: {
  activeArea: WorkAreaId;
  ariaLabel: string;
  className: string;
  onSelectArea: (area: WorkAreaId) => void;
  showLabels: boolean;
}) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      {workAreas.map((area) => {
        const Icon = icons[area.id];
        return (
          <button
            aria-label={area.label}
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
    </nav>
  );
}
