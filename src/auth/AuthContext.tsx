import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: "org_admin" | "site_operator";
  orgId: string;
  siteIds: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("gy_auth_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem("gy_auth_token");
          setToken(null);
        }
      })
      .catch(() => {
        localStorage.removeItem("gy_auth_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? "登录失败" };
      localStorage.setItem("gy_auth_token", data.token);
      localStorage.setItem("gy_chat_token", data.token);
      localStorage.removeItem("gy_current_site");
      setToken(data.token);
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: "网络错误" };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("gy_auth_token");
    localStorage.removeItem("gy_chat_token");
    localStorage.removeItem("gy_current_site");
    setToken(null);
    setUser(null);
    window.history.replaceState(null, "", "/");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
