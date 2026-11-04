import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom 没有 ResizeObserver：提供空实现（容器尺寸保持 0，测试不依赖精确布局）。
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(() => {
  cleanup();
});
