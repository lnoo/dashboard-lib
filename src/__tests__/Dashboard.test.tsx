import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "../shell/Dashboard";
import type { DashboardComponentRegistry, DashboardLayout } from "../shell/types";

const layout: DashboardLayout = [
  {
    id: "box-1",
    position: { x: 0.1, y: 0.1 },
    size: { width: 0.4, height: 0.4 },
    componentType: "kpi",
    isLocked: false,
  },
];

const registry: DashboardComponentRegistry = {
  kpi: function Kpi() {
    return <div>KPI 组件</div>;
  },
  labeled: {
    component: function Labeled() {
      return <div>B 屏组件</div>;
    },
    label: "指标卡",
  },
  broken: function Broken() {
    throw new Error("boom");
  },
};

describe("<Dashboard />", () => {
  it("view 模式渲染种子布局的业务组件，且不显示工具栏", () => {
    render(<Dashboard layout={layout} registry={registry} mode="view" />);
    expect(screen.getByText("KPI 组件")).toBeTruthy();
    expect(screen.queryByText("新增可视框")).toBeNull();
  });

  it("edit 模式新增格子并抛出 onLayoutChange", () => {
    const onLayoutChange = vi.fn();
    render(<Dashboard registry={registry} mode="edit" onLayoutChange={onLayoutChange} />);
    expect(screen.queryByText("请点击编辑按钮选择组件")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "新增可视框" }));

    expect(screen.getByText("请点击编辑按钮选择组件")).toBeTruthy();
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    expect(onLayoutChange.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it("layout 种子引用变化会重置为该布局", () => {
    const layoutB: DashboardLayout = [
      {
        id: "box-b",
        position: { x: 0.2, y: 0.2 },
        size: { width: 0.3, height: 0.3 },
        componentType: "labeled",
        isLocked: false,
      },
    ];
    const { rerender } = render(<Dashboard layout={layout} registry={registry} mode="view" />);
    expect(screen.getByText("KPI 组件")).toBeTruthy();

    rerender(<Dashboard layout={layoutB} registry={registry} mode="view" />);

    expect(screen.queryByText("KPI 组件")).toBeNull();
    expect(screen.getByText("B 屏组件")).toBeTruthy();
  });

  it("未传 onSave 时工具栏不显示保存按钮", () => {
    render(<Dashboard registry={registry} mode="edit" />);
    expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
  });

  it("保存：onSave 收到当前布局", async () => {
    const onSave = vi.fn();
    render(<Dashboard layout={layout} registry={registry} mode="edit" onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]?.[0]).toEqual(layout);
  });

  it("保存 pending 期间按钮禁用、忽略重复点击", async () => {
    const onSave = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 30)));
    render(<Dashboard layout={layout} registry={registry} mode="edit" onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByText("保存中…")).toBeTruthy();
    // 按钮处于禁用态，重复点击不触发第二次保存
    fireEvent.click(screen.getByText("保存中…"));

    await waitFor(() => expect(screen.getByRole("button", { name: "保存" })).toBeTruthy());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("换组件：弹层选择写入 componentType，label 生效，占位项归一为 null", () => {
    const onLayoutChange = vi.fn();
    render(
      <Dashboard layout={layout} registry={registry} mode="edit" onLayoutChange={onLayoutChange} />,
    );

    const calls = onLayoutChange.mock.calls as DashboardLayout[][];

    fireEvent.click(screen.getByTitle("编辑组件"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("指标卡")).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "labeled" } });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(calls.at(-1)?.[0]?.[0]?.componentType).toBe("labeled");

    // 重新打开并选择占位项：'' 归一为 null，而不是把空串写进布局数据
    fireEvent.click(screen.getByTitle("编辑组件"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    expect(calls.at(-1)?.[0]?.[0]?.componentType).toBeNull();
  });

  it("弹层支持 Esc 关闭", () => {
    render(<Dashboard layout={layout} registry={registry} mode="edit" />);
    fireEvent.click(screen.getByTitle("编辑组件"));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("业务组件抛错只击穿本格（错误边界），其余格子不受影响", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const brokenLayout: DashboardLayout = [
      {
        id: "box-x",
        position: { x: 0, y: 0 },
        size: { width: 0.5, height: 0.5 },
        componentType: "broken",
        isLocked: false,
      },
      {
        id: "box-y",
        position: { x: 0.5, y: 0 },
        size: { width: 0.5, height: 0.5 },
        componentType: "kpi",
        isLocked: false,
      },
    ];

    render(<Dashboard layout={brokenLayout} registry={registry} mode="view" />);

    expect(screen.getByText("组件加载失败")).toBeTruthy();
    expect(screen.getByText("KPI 组件")).toBeTruthy();
    errorSpy.mockRestore();
  });
});
