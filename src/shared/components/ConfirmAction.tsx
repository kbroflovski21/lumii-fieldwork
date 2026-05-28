import { useState, type CSSProperties } from "react";

interface ConfirmActionProps {
  label: string;
  confirmLabel?: string;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  disabled?: boolean;
  buttonStyle?: CSSProperties;
}

export function ConfirmAction({
  label,
  confirmLabel,
  tone = "danger",
  onConfirm,
  disabled,
  buttonStyle,
}: ConfirmActionProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const effectiveConfirmLabel = confirmLabel ?? `确认${label}`;

  if (showConfirm) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: tone === "danger" ? "#B54E34" : "#C4893A" }}>
          {effectiveConfirmLabel}？
        </span>
        <button
          className={`sw-btn sw-btn--${tone}`}
          style={buttonStyle}
          type="button"
          onClick={() => { onConfirm(); setShowConfirm(false); }}
        >
          {effectiveConfirmLabel}
        </button>
        <button
          className="sw-btn sw-btn--secondary"
          style={buttonStyle}
          type="button"
          onClick={() => setShowConfirm(false)}
        >
          取消
        </button>
      </span>
    );
  }

  return (
    <button
      className={`sw-btn sw-btn--${tone}-ghost`}
      style={buttonStyle}
      type="button"
      disabled={disabled}
      onClick={() => setShowConfirm(true)}
    >
      {label}
    </button>
  );
}
