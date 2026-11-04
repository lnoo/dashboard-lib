import { cn } from "../utils/cn";

/**
 * 轻量 Switch 原语（库内置，不依赖 radix）。
 * 以原生 input[type=checkbox] 实现，视觉与 shadcn Switch 一致。
 */
export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  defaultChecked?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  defaultChecked = false,
  disabled = false,
  className,
  ...rest
}: SwitchProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...rest}
      />
      <span
        className={cn(
          "inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none",
          "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
          disabled ? "opacity-50" : "",
          "bg-input dark:bg-input/80",
          "peer-checked:bg-primary",
        )}
      >
        <span
          className={cn(
            "block size-4 rounded-full bg-background ring-0 transition-transform",
            "peer-checked:translate-x-[calc(100%-2px)]",
            "peer-checked:bg-primary-foreground",
          )}
        />
      </span>
    </label>
  );
}
