import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { statusText } from "./contracts";
import type { WorkAreaOperationalState } from "./contracts";

type WorkAreaLayoutProps = {
  children: ReactNode;
  description: string;
  filters?: string[];
  operationalState?: WorkAreaOperationalState;
  primaryAction?: string;
  searchLabel: string;
  searchPlaceholder: string;
  title: string;
};

export function WorkAreaLayout({
  children,
  description,
  filters = [],
  operationalState,
  primaryAction,
  searchLabel,
  searchPlaceholder,
  title
}: WorkAreaLayoutProps) {
  const mutationsDisabled = isMutationDisabled(operationalState);

  return (
    <section aria-label={title} className="site-work">
      <header className="site-work__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="site-work__tools">
          <label className="site-work__search">
            <Search size={15} />
            <input aria-label={searchLabel} placeholder={searchPlaceholder} />
          </label>
          {filters.map((filter) => (
            <button className="site-filter-chip" key={filter} type="button">
              {filter}
            </button>
          ))}
          {primaryAction ? (
            <button className="site-row-action" disabled={mutationsDisabled} type="button">
              {primaryAction}
            </button>
          ) : null}
        </div>
      </header>
      <div className="site-card site-work__card">
        <div aria-label={`${title}内容`} className="site-work__content">
          {operationalState ? <OperationalStateBanner state={operationalState} title={title} /> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

export function BatchActionBar({
  concreteAction,
  label,
  operationalState,
  selectedCount = 1
}: {
  label: string;
  selectedCount?: number;
  concreteAction?: string;
  operationalState?: WorkAreaOperationalState;
}) {
  const concreteDisabled = isMutationDisabled(operationalState);

  return (
    <div aria-label={`${label}批量操作`} className="site-batch-actions">
      <span>已选 {selectedCount}</span>
      <button type="button">全选当前页</button>
      <button type="button">清除选择</button>
      <button type="button">查看已选</button>
      {concreteAction ? <button disabled={concreteDisabled} type="button">{concreteAction}</button> : null}
      <span>权限：{operationalState ? statusText[operationalState.permission] : "可操作"}</span>
    </div>
  );
}

export function isMutationDisabled(state?: WorkAreaOperationalState) {
  return Boolean(state?.unavailableMessage || (state && state.permission !== "full"));
}

function OperationalStateBanner({ state, title }: { state: WorkAreaOperationalState; title: string }) {
  if (state.unavailableMessage) {
    return (
      <div className="site-empty-state" role="status">
        <strong>{title}暂不可用</strong>
        <span>{state.unavailableMessage}</span>
      </div>
    );
  }

  if (state.permission === "read_only") {
    return (
      <div className="site-empty-state" role="status">
        <strong>只读模式</strong>
        <span>可查看数据，新增、编辑、归档、导出等操作已禁用。</span>
      </div>
    );
  }

  if (state.permission === "restricted") {
    return (
      <div className="site-empty-state" role="status">
        <strong>权限受限</strong>
        <span>敏感信息已隐藏，部分操作不可用。</span>
      </div>
    );
  }

  return null;
}
