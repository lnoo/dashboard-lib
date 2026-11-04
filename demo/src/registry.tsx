import type { DashboardComponentRegistry } from "@sqx717/dashboard";
import { KpiStats, ScreenHeader, TrendChart } from "./widgets";

export const dashboardRegistry: DashboardComponentRegistry = {
  // 直接注册：选择器展示注册 key
  header: ScreenHeader,
  // 带展示名：label 用于组件选择器
  kpi: { component: KpiStats, label: "KPI 指标卡" },
  trend: { component: TrendChart, label: "趋势图（SVG）" },
};
