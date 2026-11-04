import type { DashboardLayout } from "@sqx717/dashboard";

/** demo 的 localStorage key：真实项目可换成远程接口。 */
export const layoutStorageKey = "demo:layout:default";

export const defaultLayout: DashboardLayout = [
  {
    id: "header",
    position: { x: 0.02, y: 0.02 },
    size: { width: 0.96, height: 0.14 },
    componentType: "header",
    isLocked: true,
    zIndex: 1,
  },
  {
    id: "kpi",
    position: { x: 0.02, y: 0.18 },
    size: { width: 0.47, height: 0.34 },
    componentType: "kpi",
    isLocked: false,
    zIndex: 2,
  },
  {
    id: "trend",
    position: { x: 0.51, y: 0.18 },
    size: { width: 0.47, height: 0.34 },
    componentType: "trend",
    isLocked: false,
    zIndex: 3,
  },
  {
    id: "trend-wide",
    position: { x: 0.02, y: 0.55 },
    size: { width: 0.96, height: 0.42 },
    componentType: "trend",
    isLocked: false,
    zIndex: 4,
  },
];
