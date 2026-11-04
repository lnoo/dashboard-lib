import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "../shell/Dashboard";
import type { DashboardComponentRegistry, DashboardLayout } from "../shell/types";

/**
 * 覆盖 setup.ts 的空 ResizeObserver：observe 时立即以 1000×800 回调，
 * 让容器完成测量——吸附换算与 px 断言才有意义。
 */
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private cb: ResizeObserverCallback) {}
      observe() {
        this.cb(
          [
            { contentBoxSize: [{ inlineSize: 1000, blockSize: 800 }] },
          ] as unknown as ResizeObserverEntry[],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
});

// box-1: (100,80) 400×280；box-2: (500,440) 100×80 —— box-2 左边缘 500（同时是容器中心线）
// 是吸附线；布局刻意避开其它静止重合（box-1 中心 y=220 / 底边 y=360 不落在任何线上）。
const layout: DashboardLayout = [
  {
    id: "box-1",
    position: { x: 0.1, y: 0.1 },
    size: { width: 0.4, height: 0.35 },
    componentType: "kpi",
    isLocked: false,
  },
  {
    id: "box-2",
    position: { x: 0.5, y: 0.55 },
    size: { width: 0.1, height: 0.1 },
    componentType: "kpi",
    isLocked: false,
  },
];

const registry: DashboardComponentRegistry = {
  kpi: function Kpi() {
    return <div>KPI 组件</div>;
  },
};

/** 参考线以 CSS 变量上色，按该变量统计当前渲染的参考线数量。 */
const getGuideCount = () =>
  Array.from(document.querySelectorAll("div")).filter((el) =>
    (el as HTMLElement).style.backgroundColor.includes("--dashboard-snap-guide-color"),
  ).length;

/** transform 可能由多段 translate（自身位移 + 吸附偏移）组成，取各段之和。 */
const sumTranslate = (transform: string | undefined): [number, number] =>
  (transform?.match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/g) ?? []).reduce<[number, number]>(
    ([x, y], segment) => {
      const values = segment.match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/);
      return [x + Number(values?.[1] ?? 0), y + Number(values?.[2] ?? 0)];
    },
    [0, 0],
  );

describe("<Dashboard /> 吸附对齐（真实拖拽事件流）", () => {
  it("拖拽中实时吸附并在松手后提交吸附后的布局", async () => {
    const onLayoutChange = vi.fn();
    const { container } = render(
      <Dashboard layout={layout} registry={registry} mode="edit" onLayoutChange={onLayoutChange} />,
    );

    const handle = container.querySelector<HTMLElement>(".drag-handle");
    if (!handle) throw new Error("drag handle not found");
    // 拖拽把手 → 内容层 → re-resizable 根节点 → Draggable 包裹层（transform 应用处）
    const wrapper = handle.parentElement?.parentElement?.parentElement;
    expect(wrapper).toBeTruthy();

    // React 19 的 act 为 async-first：必须 await 才会在断言前 flush 渲染
    // （真实浏览器里渲染发生在下一次鼠标事件前的任务间隙，这里只是测试环境的时序差异）。
    await act(async () => {
      // 从 (150,150) 开始拖动
      fireEvent.mouseDown(handle, { clientX: 150, clientY: 150 });
    });
    await act(async () => {
      // 拖到 (547,150)：tentative x = 497，距 box-2 左边缘 / 容器中心线（500）3px
      fireEvent.mouseMove(document, { clientX: 547, clientY: 150 });
    });

    // 拖拽中视觉位置已被吸附为 x=500（而非 497），y 不变；transform 由
    // 「react-draggable 自身位移 + 吸附偏移」两段 translate 组成，取和校验。
    // 参考线一条：纵向线 500（box-1 左边缘贴合 box-2 左边缘 / 容器中心线，两线同位去重）。
    expect(sumTranslate(wrapper?.style.transform)).toEqual([500, 80]);
    expect(getGuideCount()).toBe(1);

    // mouseup 坐标 = 最后一次 mousemove 的位置（真实浏览器行为），否则差值会被当成位移
    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 547, clientY: 150 });
    });

    // 松手提交：与所见一致的吸附结果写回布局（百分比），参考线消失
    const committed = onLayoutChange.mock.calls.at(-1)?.[0] as DashboardLayout;
    expect(committed.find((box) => box.id === "box-1")?.position).toEqual({ x: 0.5, y: 0.1 });
    expect(getGuideCount()).toBe(0);
  });

  it("拖拽远离吸附线时不吸附、不显示参考线", async () => {
    const onLayoutChange = vi.fn();
    const { container } = render(
      <Dashboard layout={layout} registry={registry} mode="edit" onLayoutChange={onLayoutChange} />,
    );

    const handle = container.querySelector<HTMLElement>(".drag-handle");
    if (!handle) throw new Error("drag handle not found");
    await act(async () => {
      fireEvent.mouseDown(handle, { clientX: 150, clientY: 150 });
    });
    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 230, clientY: 250 });
    });

    expect(getGuideCount()).toBe(0);

    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 230, clientY: 250 });
    });

    const committed = onLayoutChange.mock.calls.at(-1)?.[0] as DashboardLayout;
    // dx=80、dy=100：tentative (180,180)，均不在任何吸附线阈值内
    expect(committed.find((box) => box.id === "box-1")?.position).toEqual({ x: 0.18, y: 0.225 });
  });
});
