import type { ComponentType } from "react";

/**
 * 大屏业务组件 props 契约（库 → 业务组件）。
 * 库只保证透传 `className`；`theme` 等业务相关 props 由消费方自行注入/包一层。
 * `[key: string]: unknown` 兜底：业务组件可额外定义自己的 props。
 */
export interface DashboardComponentProps {
  className?: string;
  [key: string]: unknown;
}

/** 注册表条目（带展示信息）：label 用于组件选择器展示，缺省用注册 key。 */
export interface DashboardComponentEntry {
  component: ComponentType<DashboardComponentProps>;
  label?: string;
}

/** 注册表条目：直接给组件，或 `{ component, label }`。 */
export type DashboardComponentRegistryEntry =
  | ComponentType<DashboardComponentProps>
  | DashboardComponentEntry;

/** 业务组件注册表：组件名 → 条目。消费方组装后交给 <Dashboard />。 */
export type DashboardComponentRegistry = Record<string, DashboardComponentRegistryEntry>;

/** 归一化注册表条目：两种注册写法收敛为同一形状。 */
export function resolveRegistryEntry(
  entry: DashboardComponentRegistryEntry,
): DashboardComponentEntry {
  return typeof entry === "function" ? { component: entry } : entry;
}

/** 单个可视格子的布局数据（position/size 均为 0..1 百分比）。id 为唯一字符串（crypto.randomUUID）。 */
export interface VisualBoxData {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  componentType: string | null;
  isLocked: boolean;
  /** 叠放层级。缺省按数组顺序兜底；拖拽置顶时自增，不改变存储数组顺序。 */
  zIndex?: number;
}

/** 一份布局 = 格子数组。 */
export type DashboardLayout = VisualBoxData[];

/** 由注册表生成组件选择器下拉选项：label 优先取条目配置，缺省由注册 key 兜底（camelCase 拆词）。 */
export function toComponentOptions(registry: DashboardComponentRegistry) {
  return Object.entries(registry).map(([key, entry]) => ({
    value: key,
    label: resolveRegistryEntry(entry).label ?? key.replace(/([A-Z])/g, " $1").trim(),
  }));
}
