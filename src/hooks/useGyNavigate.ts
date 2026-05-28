import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GY_AREA_TO_PATH } from "../router";

/**
 * Maps gy:// area names to URL paths and navigates.
 * Used for copilot gy:// links and cross-area navigation.
 */
export function useGyNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (area: string, params: Record<string, string> = {}) => {
      const base = GY_AREA_TO_PATH[area] ?? "/";
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set("search", params.search);
      const qs = searchParams.toString();
      navigate(base + (qs ? `?${qs}` : ""));
    },
    [navigate]
  );
}
