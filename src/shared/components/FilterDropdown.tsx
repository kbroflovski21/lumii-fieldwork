import { ChevronDown } from "lucide-react";

interface FilterDropdownProps {
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}

export function FilterDropdown({ onChange, options, value }: FilterDropdownProps) {
  return (
    <div className="sw-filter">
      <select
        className={value ? "sw-filter--active" : ""}
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}
