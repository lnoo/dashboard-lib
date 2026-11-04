import React, { useRef } from "react";
import Draggable, {
  type DraggableBounds,
  type DraggableData,
  type DraggableEvent,
} from "react-draggable";
import { Button } from "../primitives/Button";
import { cn } from "../utils/cn";
import { X, Lock, Unlock, Edit } from "lucide-react";
import { Resizable, type NumberSize } from "re-resizable";
import type { ResizeDirection, SnapRect } from "./snap";

export interface VisualBoxProps {
  id: string;
  children: React.ReactNode;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onDragStart: (id: string) => void;
  onDragStop: (id: string, newPosition: { x: number; y: number }) => void;
  onResizeStop: (id: string, direction: ResizeDirection, rawRect: SnapRect) => void;
  onSelectComponent: (id: string, componentType: string | null) => void;
  onDelete: (id: string) => void;
  onToggleLock: (id: string, isLocked: boolean) => void;
  onEditComponent: (id: string, currentType: string | null) => void;
  isEditing: boolean;
  isLocked: boolean;
  zIndex: number;
  bounds: DraggableBounds;
  selectedComponentType: string | null;
  /**
   * 交互中的实时原点（容器内 px）：仅缩放 left / top 方向（边移动改变原点）时由父级提供，
   * 用于移动外层；拖拽不用它（位移由 react-draggable 内部状态驱动）。空闲时回落到 position。
   */
  livePosition?: { x: number; y: number };
  /** 拖拽中的吸附偏移（px）：叠加在 react-draggable 自身位移之上实现实时吸附。 */
  snapOffset?: { x: number; y: number };
  /** 拖拽过程中的每帧回调（未吸附的原始坐标，容器内 px）。 */
  onDragMove?: (id: string, x: number, y: number) => void;
  /**
   * 缩放过程中的每帧回调：传入原始 tentative 矩形，返回吸附校正后的矩形。
   * 返回值用于在 re-resizable 写入原始尺寸后、同一事件内校正 DOM（绘制前生效）。
   */
  onResizeMove?: (id: string, direction: ResizeDirection, tentative: SnapRect) => SnapRect;
}

const VisualBox: React.FC<VisualBoxProps> = ({
  id,
  children,
  position,
  size,
  onDragStart,
  onDragStop,
  onResizeStop,
  onDelete,
  onToggleLock,
  onEditComponent,
  isEditing,
  isLocked,
  zIndex,
  bounds,
  selectedComponentType,
  livePosition,
  snapOffset,
  onDragMove,
  onResizeMove,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (_e: unknown, _data: unknown) => {
    onDragStart(id);
  };

  const handleDragMove = (_e: DraggableEvent, data: DraggableData): void => {
    // 不返回 false：react-draggable 会把 false 当作「取消拖拽」并合成 (0,0) 的 mouseup。
    // 位移仍由其内部状态驱动，吸附偏移经 snapOffset（positionOffset）叠加。
    onDragMove?.(id, data.x, data.y);
  };

  const handleDragStop = (_e: unknown, data: { x: number; y: number }) => {
    onDragStop(id, { x: data.x, y: data.y });
  };

  /**
   * 由「已提交尺寸 + 增量」还原缩放的原始 tentative 矩形。
   * left / top 方向的边在移动（re-resizable 只改宽高、不动原点），
   * 因此原点需按「固定边不动」反推：rawX = 固定右边缘 - 新宽度。
   * 基准始终用已提交的 position / size（缩放期间不变），逐帧绝对换算、不累积误差。
   */
  const computeRawRect = (direction: ResizeDirection, delta: NumberSize): SnapRect => {
    const rawWidth = size.width + delta.width;
    const rawHeight = size.height + delta.height;
    // 方向名是驼峰（topLeft…），先归一小写再匹配关键字
    const dir = direction.toLowerCase();
    const rawX = dir.includes("left") ? position.x + size.width - rawWidth : position.x;
    const rawY = dir.includes("top") ? position.y + size.height - rawHeight : position.y;
    return { x: rawX, y: rawY, width: rawWidth, height: rawHeight };
  };

  const handleResizeMove = (
    _e: unknown,
    direction: ResizeDirection,
    elementRef: HTMLElement,
    delta: NumberSize,
  ) => {
    if (!onResizeMove) return;
    const snapped = onResizeMove(id, direction, computeRawRect(direction, delta));
    // re-resizable 在 flushSync 写入原始尺寸之后才调用本回调：同一事件内改写 DOM，
    // 绘制前完成校正；下一次 mousemove 它先写回原始值，这里再吸附一次。
    elementRef.style.width = `${snapped.width}px`;
    elementRef.style.height = `${snapped.height}px`;
  };

  const handleResizeStop = (
    _e: unknown,
    direction: ResizeDirection,
    _ref: HTMLElement,
    d: NumberSize,
  ) => {
    onResizeStop(id, direction, computeRawRect(direction, d));
  };

  return (
    <Draggable
      handle=".drag-handle"
      position={livePosition ?? position}
      positionOffset={snapOffset}
      onStart={handleDragStart}
      onDrag={handleDragMove}
      onStop={handleDragStop}
      nodeRef={nodeRef}
      bounds={bounds}
      disabled={isLocked}
    >
      <div ref={nodeRef} style={{ zIndex: zIndex, position: "absolute" }}>
        <Resizable
          size={size}
          onResize={handleResizeMove}
          onResizeStop={handleResizeStop}
          style={{ position: "relative" }}
          enable={isEditing && !isLocked ? undefined : false}
        >
          <div
            className={cn(
              "relative h-full w-full flex flex-col",
              isEditing && "ring-2 ring-primary",
            )}
          >
            {isEditing && (
              <>
                <div
                  className="drag-handle absolute top-0 left-0 right-0 h-7 z-10 cursor-move"
                  style={{ cursor: isLocked ? "not-allowed" : "move" }}
                />
                <div className="absolute top-1 right-1 flex gap-1 z-10 bg-background/60 rounded-md p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(id)}
                    title="删除"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted"
                    onClick={() => onToggleLock(id, !isLocked)}
                    title={isLocked ? "解锁" : "锁定"}
                  >
                    {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted"
                    onClick={() => onEditComponent(id, selectedComponentType)}
                    title="编辑组件"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            <div className="flex-1 z-0" style={{ minHeight: 0 }}>
              {selectedComponentType ? (
                <div className="h-full w-full">{children}</div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  请点击编辑按钮选择组件
                </div>
              )}
            </div>
          </div>
        </Resizable>
      </div>
    </Draggable>
  );
};

export { VisualBox };
