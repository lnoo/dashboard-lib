import type { DashboardComponentProps } from "@sqx717/dashboard";
import { cn } from "@sqx717/dashboard";

/** 标题栏组件：纯展示，样式由 demo 自己负责。 */
export function ScreenHeader({ className }: DashboardComponentProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center rounded-lg border border-border bg-card",
        className,
      )}
    >
      <h1 className="text-lg font-semibold text-foreground">数据监测大屏</h1>
      <p className="text-xs text-muted-foreground">业务组件由消费方注入 · 样式与主题由消费方负责</p>
    </div>
  );
}

/** KPI 指标组件：三块指标。 */
export function KpiStats({ className }: DashboardComponentProps) {
  const items = [
    { label: "今日客流", value: "12,480", delta: "+6.2%" },
    { label: "在线设备", value: "3,214", delta: "-0.8%" },
    { label: "告警数", value: "17", delta: "+3" },
  ];
  return (
    <div className={cn("grid h-full w-full grid-cols-3 gap-2", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center justify-center rounded-lg border border-border bg-card"
        >
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <span className="text-xl font-semibold text-foreground">{item.value}</span>
          <span className="text-xs text-muted-foreground">{item.delta}</span>
        </div>
      ))}
    </div>
  );
}

/** 趋势图组件：零依赖 inline SVG 折线。 */
export function TrendChart({ className }: DashboardComponentProps) {
  const points = [8, 14, 11, 18, 16, 24, 21, 28, 26, 32].map((v, i) => {
    const x = (i / 9) * 100;
    const y = 40 - (v / 32) * 36;
    return `${x},${y}`;
  });
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-lg border border-border bg-card p-3",
        className,
      )}
    >
      <span className="text-xs text-muted-foreground">近 10 日趋势（示例数据）</span>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2 h-full w-full">
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="hsl(222 65% 45%)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
