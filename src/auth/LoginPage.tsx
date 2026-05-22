import React, { useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import "./login.css";

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await login(username, password);
    setSubmitting(false);
    if (!result.ok) setError(result.error ?? "登录失败");
  }, [username, password, login]);

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-form__logo">
          <img src="/logo.png" alt="金色年华" width="56" height="56" />
        </div>
        <h1 className="login-form__title">金色年华</h1>
        <p className="login-form__subtitle">站点运营管理平台</p>

        {error && <div className="login-form__error" role="alert">{error}</div>}

        <label className="login-form__label">
          <span>用户名</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            autoComplete="username"
            autoFocus
          />
        </label>

        <label className="login-form__label">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            autoComplete="current-password"
          />
        </label>

        <button
          type="submit"
          className="login-form__submit"
          disabled={submitting || !username.trim() || !password.trim()}
        >
          {submitting ? "登录中..." : "登录"}
        </button>
      </form>
    </div>
  );
}
