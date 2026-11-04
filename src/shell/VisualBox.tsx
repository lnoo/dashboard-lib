import React, { useRef } from "react";
import Draggable, { DraggableBounds } from "react-draggable";
import { Button } from "../primitives/Button";
import { cn } from "../utils/cn";
import { X, Lock, Unlock, Edit } from "lucide-react";
import { Resizable } from "re-resizable";

export interface VisualBoxProps {
  id: string;
  children: React.ReactNode;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onDragStart: (id: string) => void;
  onDragStop: (id: string, newPosition: { x: number; y: number }) => void;
  onResizeStop: (id: string, newSize: { width: number; height: number }) => void;
  onSelectComponent: (id: string, componentType: string | null) => void;
  onDelete: (id: string) => void;
  onToggleLock: (id: string, isLocked: boolean) => void;
  onEditComponent: (id: string, currentType: string | null) => void;
  isEditing: boolean;
  isLocked: boolean;
  zIndex: number;
  bounds: DraggableBounds;
  selectedComponentType: string | null;
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
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (_e: unknown, _data: unknown) => {
    onDragStart(id);
  };

  const handleDragStop = (_e: unknown, data: { x: number; y: number }) => {
    onDragStop(id, { x: data.x, y: data.y });
  };

  const handleResizeStop = (
    _e: unknown,
    _direction: unknown,
    _ref: HTMLElement,
    d: { width: number; height: number },
  ) => {
    onResizeStop(id, {
      width: size.width + d.width,
      height: size.height + d.height,
    });
  };

  return (
    <Draggable
      handle=".drag-handle"
      position={position}
      onStart={handleDragStart}
      onStop={handleDragStop}
      nodeRef={nodeRef}
      bounds={bounds}
      disabled={isLocked}
    >
      <div ref={nodeRef} style={{ zIndex: zIndex, position: "absolute" }}>
        <Resizable
          size={size}
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
