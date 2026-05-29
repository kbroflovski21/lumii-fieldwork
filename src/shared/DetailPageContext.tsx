import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export interface DetailEntity {
  entityType: string;
  entityId: string;
  entityName: string;
}

type SetDetailEntity = (entity: DetailEntity | null) => void;

const EntityCtx = createContext<DetailEntity | null | undefined>(undefined);
const SetEntityCtx = createContext<SetDetailEntity | undefined>(undefined);

export function DetailPageProvider({ children }: { children: ReactNode }) {
  const [entity, setEntity] = useState<DetailEntity | null>(null);
  const set = useCallback<SetDetailEntity>((e) => setEntity(e), []);
  return (
    <EntityCtx.Provider value={entity}>
      <SetEntityCtx.Provider value={set}>
        {children}
      </SetEntityCtx.Provider>
    </EntityCtx.Provider>
  );
}

export function useDetailEntity(): DetailEntity | null {
  const ctx = useContext(EntityCtx);
  if (ctx === undefined) throw new Error("useDetailEntity must be inside DetailPageProvider");
  return ctx;
}

export function useSetDetailEntity(): SetDetailEntity {
  const ctx = useContext(SetEntityCtx);
  if (ctx === undefined) throw new Error("useSetDetailEntity must be inside DetailPageProvider");
  return ctx;
}
