export { Dashboard } from "./shell/Dashboard";
export type { DashboardProps } from "./shell/Dashboard";

export { ComponentSelector } from "./shell/ComponentSelector";
export type { ComponentSelectorProps } from "./shell/ComponentSelector";

export { VisualBox } from "./shell/VisualBox";
export type { VisualBoxProps } from "./shell/VisualBox";

export type {
  DashboardComponentProps,
  DashboardComponentEntry,
  DashboardComponentRegistryEntry,
  DashboardComponentRegistry,
  VisualBoxData,
  DashboardLayout,
} from "./shell/types";
export { toComponentOptions, resolveRegistryEntry } from "./shell/types";

export { Button, Switch, Empty } from "./primitives";
export type { ButtonProps, ButtonVariant, ButtonSize, SwitchProps, EmptyProps } from "./primitives";

export { cn } from "./utils/cn";
