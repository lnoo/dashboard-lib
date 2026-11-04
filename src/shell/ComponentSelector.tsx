import React from "react";
import { toComponentOptions, type DashboardComponentRegistry } from "./types";

export interface ComponentSelectorProps {
  onChange: (componentType: string) => void;
  value: string;
  registry: DashboardComponentRegistry;
}

export const ComponentSelector: React.FC<ComponentSelectorProps> = ({
  onChange,
  value,
  registry,
}) => {
  const componentOptions = toComponentOptions(registry);
  return (
    <div className="p-6">
      <p className="text-sm text-muted-foreground mb-4">请选择功能组件</p>
      <select
        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">选择组件</option>
        {componentOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
