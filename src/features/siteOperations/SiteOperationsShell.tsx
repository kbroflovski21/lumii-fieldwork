import { useState, useEffect, useRef, type ReactNode } from "react";
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

const ROLE_LABELS: Record<string, string> = {
  org_admin: "集团管理",
  site_operator: "站点运营",
  service_supervisor: "服务主管",
  careworker: "护理员",
};

function hashNameToColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${hue}, 55%, 48%)`;
}

type SiteOperationsShellProps = {
  activeArea: WorkAreaId;
  children: ReactNode;
  onSelectArea: (area: WorkAreaId) => void;
};

export function SiteOperationsShell({ activeArea, children, onSelectArea }: SiteOperationsShellProps) {
  const { user, token, logout } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const showCopilot = activeArea !== "home";

  const [profileOpen, setProfileOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile menu on click outside
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  const handleChangePassword = async () => {
    setPwdError("");
    setPwdSuccess(false);
    if (!oldPwd || !newPwd) { setPwdError("请填写所有字段"); return; }
    if (newPwd.length < 6) { setPwdError("新密码至少6位"); return; }
    if (newPwd !== confirmPwd) { setPwdError("两次输入的新密码不一致"); return; }
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setPwdError(data.error ?? "修改失败"); return; }
      setPwdSuccess(true);
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setShowPasswordModal(false), 1200);
    } catch {
      setPwdError("网络错误");
    }
  };

  return (
    <div className="site-operations-root">
      <div
        className="site-operations-shell"
        data-copilot-open={showCopilot && copilotOpen}
      >
        <header className="site-operations-header">
          <div className="site-operations-header__logo">
            <ClipboardList size={18} />
          </div>
          <div>
            <h1>Lumii 站点运营助手</h1>
            <p>
              <span />
              运行中 · 今日服务 18 单
            </p>
          </div>
          <div className="site-operations-header__actions">
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
          </div>
        </header>
        <AreaNav
          activeArea={activeArea}
          ariaLabel="站点运营工作区"
          className="site-operations-rail"
          onSelectArea={onSelectArea}
          showLabels={false}
          profileSlot={
            <div className="so-shell__profile" ref={profileRef}>
              <button
                className="so-shell__avatar"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label="用户菜单"
                style={{ background: hashNameToColor(user?.name ?? "") }}
                type="button"
              >
                {(user?.name ?? "U")[0]}
              </button>
              {profileOpen && (
                <div className="so-shell__profile-menu">
                  <div className="so-shell__profile-name">{user?.name}</div>
                  <div className="so-shell__profile-role">{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</div>
                  <hr />
                  <button type="button" onClick={() => { setProfileOpen(false); setShowPasswordModal(true); setPwdError(""); setPwdSuccess(false); }}>修改密码</button>
                  <button type="button" onClick={() => { setProfileOpen(false); logout(); }}>退出登录</button>
                </div>
              )}
            </div>
          }
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

      {showPasswordModal && (
        <div className="so-shell__modal-scrim" onClick={() => setShowPasswordModal(false)}>
          <div className="so-shell__modal" onClick={e => e.stopPropagation()}>
            <h3>修改密码</h3>
            {pwdError && <div className="so-shell__modal-error">{pwdError}</div>}
            {pwdSuccess && <div className="so-shell__modal-success">密码修改成功</div>}
            <input type="password" placeholder="当前密码" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
            <input type="password" placeholder="新密码" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            <input type="password" placeholder="确认新密码" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
            <div className="so-shell__modal-actions">
              <button type="button" onClick={() => setShowPasswordModal(false)}>取消</button>
              <button type="button" onClick={handleChangePassword}>确认修改</button>
            </div>
          </div>
        </div>
      )}
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
