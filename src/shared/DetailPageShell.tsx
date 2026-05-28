import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./detail-page.css";

interface DetailPageShellProps {
  parentLabel: string;
  parentPath: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DetailPageShell({ parentLabel, parentPath, title, actions, children }: DetailPageShellProps) {
  const navigate = useNavigate();
  const goBack = () => navigate(parentPath);

  return (
    <div className="detail-page">
      <div className="detail-page__header">
        <button className="detail-page__back" onClick={goBack} type="button" aria-label="返回">
          <ChevronLeft size={18} />
        </button>
        <button className="detail-page__breadcrumb" onClick={goBack} type="button">
          {parentLabel}
        </button>
        <span className="detail-page__sep">/</span>
        <span className="detail-page__title">{title}</span>
        {actions && <div className="detail-page__actions">{actions}</div>}
      </div>
      <div className="detail-page__body">
        {children}
      </div>
    </div>
  );
}
