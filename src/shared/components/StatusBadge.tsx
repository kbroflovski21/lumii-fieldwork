import type { ReactNode, CSSProperties } from "react";

interface StatusBadgeProps {
  tone: string;
  children: ReactNode;
  style?: CSSProperties;
}

export function StatusBadge({ tone, children, style }: StatusBadgeProps) {
  return (
    <span className="sw-status-badge" data-tone={tone} style={style}>
      {children}
    </span>
  );
}
