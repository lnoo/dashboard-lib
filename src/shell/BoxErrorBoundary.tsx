import React from "react";
import { Empty } from "../primitives/Empty";

interface BoxErrorBoundaryProps {
  children: React.ReactNode;
}

interface BoxErrorBoundaryState {
  error: Error | null;
}

/**
 * 单格错误边界：业务组件抛错只影响本格（显示占位 Empty），不击穿整个大屏。
 * 在 BoxContent 内以 key={componentType} 挂载：切换组件时重置错误态。
 * 库内部使用，不进公共导出。
 */
export class BoxErrorBoundary extends React.Component<
  BoxErrorBoundaryProps,
  BoxErrorBoundaryState
> {
  state: BoxErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoxErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 留调试痕迹；是否提示用户由消费方决定。
    console.error("Dashboard box component crashed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <Empty className="h-full" description="组件加载失败" />;
    }
    return this.props.children;
  }
}
