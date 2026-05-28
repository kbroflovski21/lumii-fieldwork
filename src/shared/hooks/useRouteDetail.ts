import { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

export function useRouteDetail<T>(
  basePath: string,
  items: T[],
  getId: (item: T) => string,
): {
  routeId: string | undefined;
  selectedItem: T | undefined;
  isCreate: boolean;
  close: () => void;
  open: (id: string) => void;
  openCreate: () => void;
} {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const selectedItem = useMemo(
    () => (routeId && routeId !== "new" ? items.find((i) => getId(i) === routeId) : undefined),
    [routeId, items, getId],
  );

  const isCreate = routeId === "new";

  const close = useCallback(() => navigate(basePath), [navigate, basePath]);
  const open = useCallback((id: string) => navigate(`${basePath}/${id}`), [navigate, basePath]);
  const openCreate = useCallback(() => navigate(`${basePath}/new`), [navigate, basePath]);

  return { routeId, selectedItem, isCreate, close, open, openCreate };
}
