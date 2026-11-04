/**
 * 拖拽 / 缩放的吸附对齐（draw.io 式 smart guides）。
 *
 * 全部为纯函数、以容器内像素为单位：Dashboard 把 0..1 的布局坐标换算成 px 后调用，
 * 得到校正后的矩形与应当显示的参考线，再换算回百分比提交布局。
 */

/** re-resizable 的 8 个方向手柄（与其内部 Direction 联合类型保持一致）。 */
export type ResizeDirection =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "topRight"
  | "bottomRight"
  | "bottomLeft"
  | "topLeft";

/** 吸附参考线：axis "x" 为纵向线（取 x 坐标），axis "y" 为横向线（取 y 坐标），position 为容器内 px。 */
export interface SnapGuide {
  axis: "x" | "y";
  position: number;
}

/** 参与吸附计算的矩形（容器内 px）。 */
export interface SnapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 吸附上下文：容器尺寸（容器边缘 / 中心线参与吸附）、吸附目标（其它格子）、触发距离。 */
export interface SnapContext {
  container: { width: number; height: number };
  targets: SnapRect[];
  threshold: number;
}

/** 吸附结果：校正后的矩形 + 当前应当显示的参考线。 */
export interface SnapResult extends SnapRect {
  guides: SnapGuide[];
}

/** 把矩形位置钳制回容器内（吸附线可能把左 / 上边缘推到容器外；宽高不变，guides 等附加字段保留）。 */
export function clampRectToContainer<T extends SnapRect>(
  rect: T,
  container: { width: number; height: number },
): T {
  const maxX = Math.max(0, container.width - rect.width);
  const maxY = Math.max(0, container.height - rect.height);
  return {
    ...rect,
    x: Math.min(Math.max(rect.x, 0), maxX),
    y: Math.min(Math.max(rect.y, 0), maxY),
  };
}

/** 与 re-resizable 的 minWidth/minHeight 默认下限（10px）保持一致，吸附不得把尺寸推得更小。 */
const MIN_SIZE = 10;

/** 浮点比较容差：吸附命中判定与参考线去重都用它。 */
const EPSILON = 1e-6;

/** 单轴候选线：目标格子的起点 / 中点 / 终点，加上容器边缘与中心。 */
function collectLines(
  targets: SnapRect[],
  containerSize: number,
  pick: (rect: SnapRect) => [number, number, number],
): number[] {
  const lines: number[] = [0, containerSize / 2, containerSize];
  for (const rect of targets) {
    const [start, center, end] = pick(rect);
    lines.push(start, center, end);
  }
  return lines;
}

/**
 * 拖拽单轴吸附：整框平移量一致，用「起点 / 中点 / 终点」三个探针去贴近候选线。
 * 距离并列时按探针顺序（起、中、终）与线的出现顺序先到先得，保证结果确定。
 * 与最佳平移完全重合的所有线都作为参考线返回（例如等宽格子完全重叠时，起、中、终三线齐亮）。
 */
function snapDragAxis(
  tentative: number,
  size: number,
  lines: number[],
  threshold: number,
): { position: number; lines: number[] } {
  let bestOffset: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let probeIndex = 0; probeIndex <= 2; probeIndex++) {
    const probe = tentative + (probeIndex * size) / 2;
    for (const line of lines) {
      const distance = Math.abs(probe - line);
      if (distance <= threshold && distance < bestDistance - EPSILON) {
        bestDistance = distance;
        bestOffset = line - probe;
      }
    }
  }

  if (bestOffset === null) return { position: tentative, lines: [] };

  const position = tentative + bestOffset;
  const aligned: number[] = [];
  for (let probeIndex = 0; probeIndex <= 2; probeIndex++) {
    const probe = position + (probeIndex * size) / 2;
    for (const line of lines) {
      if (Math.abs(probe - line) <= EPSILON && !aligned.includes(line)) {
        aligned.push(line);
      }
    }
  }
  return { position, lines: aligned };
}

/** 缩放单轴吸附：只贴齐正在移动的那条边（固定边不动）。 */
function snapEdge(
  movingEdge: number,
  lines: number[],
  threshold: number,
): { position: number; lines: number[] } {
  let best = movingEdge;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    const distance = Math.abs(movingEdge - line);
    if (distance <= threshold && distance < bestDistance - EPSILON) {
      bestDistance = distance;
      best = line;
    }
  }
  if (bestDistance === Number.POSITIVE_INFINITY) return { position: movingEdge, lines: [] };
  return { position: best, lines: [best] };
}

/** 拖拽吸附：整框平移，宽高不变。 */
export function snapDrag(rect: SnapRect, ctx: SnapContext): SnapResult {
  const xLines = collectLines(ctx.targets, ctx.container.width, (r) => [
    r.x,
    r.x + r.width / 2,
    r.x + r.width,
  ]);
  const yLines = collectLines(ctx.targets, ctx.container.height, (r) => [
    r.y,
    r.y + r.height / 2,
    r.y + r.height,
  ]);

  const snapX = snapDragAxis(rect.x, rect.width, xLines, ctx.threshold);
  const snapY = snapDragAxis(rect.y, rect.height, yLines, ctx.threshold);

  return {
    x: snapX.position,
    y: snapY.position,
    width: rect.width,
    height: rect.height,
    guides: [
      ...snapX.lines.map((position) => ({ axis: "x" as const, position })),
      ...snapY.lines.map((position) => ({ axis: "y" as const, position })),
    ],
  };
}

/**
 * 缩放吸附：按方向贴齐移动中的边。left / top 方向的边移动会同时改变原点，
 * 因此返回值包含校正后的 x / y（右 / 下边缘保持不动）。
 */
export function snapResize(
  rect: SnapRect,
  direction: ResizeDirection,
  ctx: SnapContext,
): SnapResult {
  const xLines = collectLines(ctx.targets, ctx.container.width, (r) => [
    r.x,
    r.x + r.width / 2,
    r.x + r.width,
  ]);
  const yLines = collectLines(ctx.targets, ctx.container.height, (r) => [
    r.y,
    r.y + r.height / 2,
    r.y + r.height,
  ]);

  // 方向名是驼峰（topLeft / bottomRight…），先归一小写再匹配关键字；
  // 同一轴的 left/right、top/bottom 互斥。
  const dir = direction.toLowerCase();
  const hasLeft = dir.includes("left");
  const hasRight = dir.includes("right");
  const hasTop = dir.includes("top");
  const hasBottom = dir.includes("bottom");

  const result: SnapResult = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    guides: [],
  };

  if (hasLeft) {
    const snapped = snapEdge(rect.x, xLines, ctx.threshold);
    result.x = snapped.position;
    result.width = rect.x + rect.width - snapped.position;
    result.guides.push(...snapped.lines.map((position) => ({ axis: "x" as const, position })));
  } else if (hasRight) {
    const snapped = snapEdge(rect.x + rect.width, xLines, ctx.threshold);
    result.width = snapped.position - rect.x;
    result.guides.push(...snapped.lines.map((position) => ({ axis: "x" as const, position })));
  }

  if (hasTop) {
    const snapped = snapEdge(rect.y, yLines, ctx.threshold);
    result.y = snapped.position;
    result.height = rect.y + rect.height - snapped.position;
    result.guides.push(...snapped.lines.map((position) => ({ axis: "y" as const, position })));
  } else if (hasBottom) {
    const snapped = snapEdge(rect.y + rect.height, yLines, ctx.threshold);
    result.height = snapped.position - rect.y;
    result.guides.push(...snapped.lines.map((position) => ({ axis: "y" as const, position })));
  }

  result.width = Math.max(result.width, MIN_SIZE);
  result.height = Math.max(result.height, MIN_SIZE);
  return result;
}
