import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import "./admin.css";

interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: string;
  orgId: string;
  siteIds: string[];
  phone: string;
  status: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  org_admin: "集团管理",
  site_operator: "站点运营",
  service_supervisor: "服务主管",
};

export function AdminPage() {
  const { user, token, logout } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "", name: "", role: "site_operator", phone: "", siteIds: "site-001" });
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...formData, siteIds: formData.siteIds.split(",").map(s => s.trim()).filter(Boolean) }),
    });
    if (res.ok) {
      setShowForm(false);
      setFormData({ username: "", password: "", name: "", role: "site_operator", phone: "", siteIds: "site-001" });
      fetchUsers();
    } else {
      const data = await res.json();
      setFormError(data.error ?? "创建失败");
    }
  };

  const handleToggleStatus = async (u: AdminUser) => {
    const newStatus = u.status === "active" ? "disabled" : "active";
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchUsers();
  };

  const handleResetPassword = async (u: AdminUser) => {
    const pwd = prompt(`重置「${u.name}」的密码为：`);
    if (!pwd || pwd.length < 6) { alert("密码至少6位"); return; }
    await fetch(`/api/admin/users/${u.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: pwd }),
    });
    alert("密码已重置");
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>金色年华 · 管理后台</h1>
          <span className="admin-header__user">{user?.name}（{ROLE_LABELS[user?.role ?? ""]}）</span>
        </div>
        <div className="admin-header__actions">
          <a href="/site-operations" className="admin-btn admin-btn--secondary">进入站点运营</a>
          <button className="admin-btn admin-btn--ghost" onClick={logout}>退出</button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-toolbar">
          <h2>用户管理</h2>
          <button className="admin-btn admin-btn--primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "取消" : "新增用户"}
          </button>
        </div>

        {showForm && (
          <form className="admin-form" onSubmit={handleCreate}>
            {formError && <div className="admin-form__error">{formError}</div>}
            <div className="admin-form__grid">
              <label>用户名 <input value={formData.username} onChange={e => setFormData(d => ({ ...d, username: e.target.value }))} required /></label>
              <label>密码 <input type="password" value={formData.password} onChange={e => setFormData(d => ({ ...d, password: e.target.value }))} required minLength={6} /></label>
              <label>姓名 <input value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} required /></label>
              <label>角色
                <select value={formData.role} onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}>
                  <option value="site_operator">站点运营</option>
                  <option value="service_supervisor">服务主管</option>
                  <option value="org_admin">集团管理</option>
                </select>
              </label>
              <label>手机号 <input value={formData.phone} onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))} /></label>
              <label>站点ID <input value={formData.siteIds} onChange={e => setFormData(d => ({ ...d, siteIds: e.target.value }))} placeholder="site-001,site-002" /></label>
            </div>
            <button type="submit" className="admin-btn admin-btn--primary">创建</button>
          </form>
        )}

        {loading ? <p>加载中...</p> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>用户名</th>
                <th>角色</th>
                <th>站点</th>
                <th>手机</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} data-status={u.status}>
                  <td>{u.name}</td>
                  <td><code>{u.username}</code></td>
                  <td>{ROLE_LABELS[u.role] ?? u.role}</td>
                  <td>{u.siteIds.join(", ")}</td>
                  <td>{u.phone || "—"}</td>
                  <td><span className={`admin-badge admin-badge--${u.status}`}>{u.status === "active" ? "正常" : "已禁用"}</span></td>
                  <td>
                    <button className="admin-btn admin-btn--sm" onClick={() => handleToggleStatus(u)}>
                      {u.status === "active" ? "禁用" : "启用"}
                    </button>
                    <button className="admin-btn admin-btn--sm" onClick={() => handleResetPassword(u)}>重置密码</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
