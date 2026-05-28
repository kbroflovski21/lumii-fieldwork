import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
  isError?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, isError }: EmptyStateProps) {
  return (
    <div className="sw-empty">
      <div className={`sw-empty__icon${isError ? " sw-empty__icon--error" : ""}`}>
        <Icon size={32} />
      </div>
      {title && <strong>{title}</strong>}
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}
