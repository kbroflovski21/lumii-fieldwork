import type { ReactNode } from "react";
import { Search } from "lucide-react";

interface ListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function ListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "搜索...",
  filters,
  actions,
}: ListToolbarProps) {
  return (
    <div className="sw-toolbar">
      <label className="sw-search">
        <Search size={16} />
        <input
          aria-label={searchPlaceholder}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          value={searchValue}
        />
      </label>
      {filters && <div className="sw-toolbar__filters">{filters}</div>}
      {actions}
    </div>
  );
}
