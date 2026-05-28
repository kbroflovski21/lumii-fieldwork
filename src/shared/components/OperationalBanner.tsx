import { Shield } from "lucide-react";

interface OperationalBannerProps {
  state: { unavailableMessage?: string; permission?: string };
  resourceLabel: string;
  readOnlyHint?: string;
  restrictedHint?: string;
}

export function OperationalBanner({
  state,
  resourceLabel,
  readOnlyHint = "可查看数据，新增、编辑等操作已禁用。",
  restrictedHint = "敏感信息已隐藏，部分操作不可用。",
}: OperationalBannerProps) {
  if (state.unavailableMessage) {
    return (
      <div className="sw-banner sw-banner--danger" role="status">
        <Shield size={16} />
        <div>
          <strong>{resourceLabel}暂不可用</strong>
          <span>{state.unavailableMessage}</span>
        </div>
      </div>
    );
  }
  if (state.permission === "read_only") {
    return (
      <div className="sw-banner sw-banner--warning" role="status">
        <Shield size={16} />
        <div>
          <strong>只读模式</strong>
          <span>{readOnlyHint}</span>
        </div>
      </div>
    );
  }
  if (state.permission === "restricted") {
    return (
      <div className="sw-banner sw-banner--warning" role="status">
        <Shield size={16} />
        <div>
          <strong>权限受限</strong>
          <span>{restrictedHint}</span>
        </div>
      </div>
    );
  }
  return null;
}
