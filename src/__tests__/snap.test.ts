import { describe, expect, it } from "vitest";
import { snapDrag, snapResize, type SnapContext, type SnapRect } from "../shell/snap";

/** 默认画布 1000×800、阈值 6px；用例里只关心与目标格子的相对关系。 */
const ctx = (targets: SnapRect[], overrides: Partial<SnapContext> = {}): SnapContext => ({
  container: { width: 1000, height: 800 },
  targets,
  threshold: 6,
  ...overrides,
});

describe("snapDrag", () => {
  const target: SnapRect = { x: 200, y: 100, width: 300, height: 200 };

  it("左边缘在阈值内吸附到目标左边缘，并给出纵向参考线", () => {
    const result = snapDrag({ x: 203, y: 420, width: 100, height: 80 }, ctx([target]));
    expect(result.x).toBe(200);
    expect(result.y).toBe(420);
    expect(result.width).toBe(100);
    expect(result.height).toBe(80);
    expect(result.guides).toEqual([{ axis: "x", position: 200 }]);
  });

  it("拖拽中心吸附目标中心线", () => {
    // 目标中心 x = 350；中心探针 353 距其 3px
    const result = snapDrag({ x: 303, y: 523, width: 100, height: 50 }, ctx([target]));
    expect(result.x).toBe(300);
    expect(result.guides).toEqual([{ axis: "x", position: 350 }]);
  });

  it("右边缘吸附容器右边缘（无目标时容器边缘 / 中心仍参与吸附）", () => {
    const result = snapDrag({ x: 897, y: 100, width: 100, height: 50 }, ctx([]));
    expect(result.x).toBe(900);
    expect(result.guides).toEqual([{ axis: "x", position: 1000 }]);
  });

  it("y 轴独立吸附并给出横向参考线", () => {
    // 目标下边缘 y = 300
    const result = snapDrag({ x: 620, y: 303, width: 100, height: 50 }, ctx([target]));
    expect(result.y).toBe(300);
    expect(result.guides).toEqual([{ axis: "y", position: 300 }]);
  });

  it("超出阈值不吸附，返回原矩形且无参考线", () => {
    const rect: SnapRect = { x: 210, y: 210, width: 100, height: 50 };
    const result = snapDrag(rect, ctx([target]));
    expect(result).toEqual({ ...rect, guides: [] });
  });

  it("等宽格子完全重合时，起 / 中 / 终三条参考线同时显示", () => {
    const same: SnapRect = { x: 200, y: 100, width: 100, height: 80 };
    const result = snapDrag({ x: 203, y: 420, width: 100, height: 50 }, ctx([same]));
    expect(result.x).toBe(200);
    expect(result.guides).toEqual([
      { axis: "x", position: 200 },
      { axis: "x", position: 250 },
      { axis: "x", position: 300 },
    ]);
  });

  it("距离并列时按探针顺序（起、中、终）确定吸附，重合线一并显示", () => {
    // 目标 {150..250}，中心 200：中心探针 153 与右探针 203 距离同为 3，取先出现的中心探针
    const result = snapDrag(
      { x: 103, y: 500, width: 100, height: 50 },
      ctx([{ x: 150, y: 0, width: 100, height: 100 }]),
    );
    expect(result.x).toBe(100);
    expect(result.guides).toEqual([
      { axis: "x", position: 150 },
      { axis: "x", position: 200 },
    ]);
  });
});

describe("snapResize", () => {
  const target: SnapRect = { x: 200, y: 100, width: 300, height: 200 };

  it("right 方向：右边缘吸附目标左边缘，宽高与原点相应校正", () => {
    const result = snapResize({ x: 100, y: 500, width: 103, height: 50 }, "right", ctx([target]));
    expect(result).toEqual({
      x: 100,
      y: 500,
      width: 100,
      height: 50,
      guides: [{ axis: "x", position: 200 }],
    });
  });

  it("left 方向：左边缘吸附、右边缘固定（x 与 width 同时改变）", () => {
    // 原始矩形 {197..297}，左边缘贴 200 后宽度 = 297 - 200
    const result = snapResize({ x: 197, y: 0, width: 100, height: 50 }, "left", ctx([target]));
    expect(result).toEqual({
      x: 200,
      y: 0,
      width: 97,
      height: 50,
      guides: [{ axis: "x", position: 200 }],
    });
  });

  it("bottom 方向：下边缘吸附容器中心线", () => {
    // 容器高 800，中心线 y = 400；下边缘 403 距其 3px
    const result = snapResize({ x: 500, y: 297, width: 100, height: 106 }, "bottom", ctx([target]));
    expect(result).toEqual({
      x: 500,
      y: 297,
      width: 100,
      height: 103,
      guides: [{ axis: "y", position: 400 }],
    });
  });

  it("top 方向：上边缘吸附、下边缘固定（y 与 height 同时改变）", () => {
    const result = snapResize({ x: 0, y: 97, width: 100, height: 103 }, "top", ctx([target]));
    expect(result).toEqual({
      x: 0,
      y: 100,
      width: 100,
      height: 100,
      guides: [{ axis: "y", position: 100 }],
    });
  });

  it("角落方向（topLeft）：两轴同时吸附", () => {
    // 左边缘贴 200（宽 97）、上边缘贴 100：下边缘固定在 147，高 = 147 - 100
    const result = snapResize({ x: 197, y: 97, width: 100, height: 50 }, "topLeft", ctx([target]));
    expect(result).toEqual({
      x: 200,
      y: 100,
      width: 97,
      height: 47,
      guides: [
        { axis: "x", position: 200 },
        { axis: "y", position: 100 },
      ],
    });
  });

  it("超出阈值不吸附，返回原矩形且无参考线", () => {
    const rect: SnapRect = { x: 100, y: 0, width: 115, height: 50 };
    const result = snapResize(rect, "right", ctx([target]));
    expect(result).toEqual({ ...rect, guides: [] });
  });

  it("吸附不会把尺寸推到最小尺寸（10px）以下", () => {
    // 右边缘 7 距目标左边缘 5 仅 2px，吸附后宽度只有 5px，应被钳制到 10px
    const result = snapResize(
      { x: 0, y: 0, width: 7, height: 50 },
      "right",
      ctx([{ x: 5, y: 0, width: 10, height: 10 }]),
    );
    expect(result.x).toBe(0);
    expect(result.width).toBe(10);
  });
});
