import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthContext";
import "./shell-profile.css";

const ROLE_LABELS: Record<string, string> = {
  org_admin: "集团管理",
  site_operator: "站点运营",
  careworker: "护理员",
};

function hashNameToColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${hue}, 55%, 48%)`;
}

export function ProfileMenu({ expanded, roleName }: { expanded?: boolean; roleName?: string } = {}) {
  const { user, token, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number } | null>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const toggleMenu = useCallback(() => {
    if (!open && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setMenuPos({ left: rect.left, bottom: window.innerHeight - rect.top + 8 });
    }
    setOpen((prev) => !prev);
  }, [open]);

  /* Backdrop handles click-outside dismissal */

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
    <>
      <div className="so-shell__profile">
        <button
          ref={avatarRef}
          className={expanded ? "site-operations-sidebar__profile-card" : "so-shell__avatar"}
          onClick={toggleMenu}
          aria-label="用户菜单"
          style={expanded ? undefined : { background: hashNameToColor(user?.name ?? "") }}
          type="button"
        >
          {expanded ? (
            <>
              <span className="so-shell__avatar" style={{ background: hashNameToColor(user?.name ?? ""), pointerEvents: "none" }}>{(user?.name ?? "U")[0]}</span>
              <span className="site-operations-sidebar__profile-info">
                <span className="site-operations-sidebar__profile-name">{user?.name ?? "用户"}</span>
                <span className="site-operations-sidebar__profile-role">{roleName ?? "站点运营"}</span>
              </span>
            </>
          ) : (user?.name ?? "U")[0]}
        </button>
      </div>

      {open && menuPos && createPortal(
        <div
          className="so-shell__menu-backdrop"
          onClick={() => setOpen(false)}
        >
          <div
            id="profile-menu-portal"
            className="so-shell__profile-menu"
            style={{ left: menuPos.left, bottom: menuPos.bottom }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="so-shell__profile-name">{user?.name}</div>
            <div className="so-shell__profile-role">{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</div>
            <hr />
            <button type="button" onClick={() => { setOpen(false); setShowPasswordModal(true); setPwdError(""); setPwdSuccess(false); }}>修改密码</button>
            <button type="button" onClick={() => { setOpen(false); logout(); }}>退出登录</button>
          </div>
        </div>,
        document.body,
      )}

      {showPasswordModal && createPortal(
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
        </div>,
        document.body,
      )}
    </>
  );
}
