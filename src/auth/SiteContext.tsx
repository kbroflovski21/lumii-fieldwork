import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

export interface SiteInfo {
  id: string;
  name: string;
  address: string;
}

interface SiteContextValue {
  sites: SiteInfo[];
  currentSite: SiteInfo | null;
  loading: boolean;
  needsSelection: boolean;
  noSiteAssigned: boolean;
  selectSite: (site: SiteInfo) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be inside SiteProvider");
  return ctx;
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [currentSite, setCurrentSite] = useState<SiteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) { setLoading(false); setSites([]); setCurrentSite(null); return; }

    if (user.role === "org_admin") {
      setLoading(false);
      return;
    }

    fetch("/api/auth/my-sites", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.sites) {
          setSites(data.sites);
          if (data.sites.length === 1) {
            setCurrentSite(data.sites[0]);
          } else {
            const saved = localStorage.getItem("gy_current_site");
            if (saved) {
              const found = data.sites.find((s: SiteInfo) => s.id === saved);
              if (found) setCurrentSite(found);
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, token]);

  const selectSite = useCallback((site: SiteInfo) => {
    setCurrentSite(site);
    localStorage.setItem("gy_current_site", site.id);
  }, []);

  const needsSelection = user?.role === "site_operator" && sites.length > 1 && !currentSite;
  const noSiteAssigned = !loading && user?.role === "site_operator" && sites.length === 0;

  return (
    <SiteContext.Provider value={{ sites, currentSite, loading, needsSelection, noSiteAssigned, selectSite }}>
      {children}
    </SiteContext.Provider>
  );
}
