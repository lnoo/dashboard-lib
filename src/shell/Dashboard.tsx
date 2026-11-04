import React, { Suspense, useState, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import { VisualBox } from "./VisualBox";
import { Button } from "../primitives/Button";
import { Switch } from "../primitives/Switch";
import { Empty } from "../primitives/Empty";
import { Plus, Save } from "lucide-react";
import { ComponentSelector } from "./ComponentSelector";
import { BoxErrorBoundary } from "./BoxErrorBoundary";
import { cn } from "../utils/cn";
import {
  type DashboardLayout,
  type DashboardComponentRegistry,
  type VisualBoxData,
  resolveRegistryEntry,
} from "./types";
import {
  clampRectToContainer,
  snapDrag,
  snapResize,
  type ResizeDirection,
  type SnapContext,
  type SnapGuide,
  type SnapRect,
  type SnapResult,
} from "./snap";

export interface DashboardProps {
  mode?: "edit" | "view";
  /**
   * 初始布局；undefined 时以空布局起步（编辑尚不存在的新大屏）。
   * 引用变化会以新布局重置编辑：请传稳定引用（useMemo / state / 拉取结果），
   * 多屏切换建议用 `key={id}` 重挂载。
   */
  layout?: DashboardLayout;
  /** 业务组件注册表（消费方配置）。 */
  registry: DashboardComponentRegistry;
  /** 追加到大屏根容器的命名空间 class（消费方用它控制样式作用域）。 */
  className?: string;
  /** 根容器基础类，缺省提供默认（含全屏 h-dvh w-full）。 */
  rootClassName?: string;
  /**
   * 保存委托：点击「保存」时把当前布局整体抛给消费方。库不持久化——
   * 存 localStorage、写远程接口还是仅做提示，由消费方决定。
   * 返回 Promise 时，pending 期间忽略重复点击（防连点双写），「保存」按钮同步禁用。
   */
  onSave?: (layout: DashboardLayout) => void | Promise<unknown>;
  /**
   * 实时布局回调：增删格子 / 拖停 / 缩停 / 换组件 / 锁定 / 置顶后抛出当前布局。
   * 初始 `layout` 种子注入不触发；消费方把回调结果回灌 `layout` 也不会成环。
   * 用于「未保存更改」标记、URL 同步、防抖自动保存等。
   */
  onLayoutChange?: (layout: DashboardLayout) => void;
  /**
   * 是否启用拖拽 / 缩放的吸附对齐（draw.io 式 smart guides）：
   * 拖拽贴齐其它格子的边缘 / 中心与容器边缘 / 中心并显示参考线，缩放贴齐移动中的边。
   * 默认开启，仅编辑态交互中生效。
   */
  snapEnabled?: boolean;
  /** 吸附触发距离（容器内 px），默认 6。 */
  snapThreshold?: number;
}

const defaultContainerClassName = "relative h-dvh w-full bg-background overflow-hidden";

/**
 * 业务组件渲染隔离层。
 * props 只有 `componentType`（原始字符串）与 `registry`（消费方稳定引用），
 * 配合 React.memo：格子上的编辑交互（拖拽置顶 / 加框 / 锁定等）不会重渲染业务组件。
 */
const BoxContent = React.memo(function BoxContent({
  componentType,
  registry,
}: {
  componentType: string | null;
  registry: DashboardComponentRegistry;
}) {
  if (!componentType) return null;

  const entry = registry[componentType];
  if (!entry) {
    return <Empty description={`未注册组件：${componentType}`} />;
  }
  const { component: TargetComponent } = resolveRegistryEntry(entry);
  return (
    // key：切换组件时重置错误边界，避免上一组件的错误态卡在新组件上。
    <BoxErrorBoundary key={componentType}>
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            组件加载中…
          </div>
        }
      >
        <TargetComponent className="h-full w-full" />
      </Suspense>
    </BoxErrorBoundary>
  );
});

export const Dashboard: React.FC<DashboardProps> = ({
  mode = "view",
  layout,
  registry,
  className,
  rootClassName,
  onSave,
  onLayoutChange,
  snapEnabled = true,
  snapThreshold = 6,
}) => {
  // 种子作为初始状态：首次挂载即应用 layout（后续引用变化由下方渲染期重置处理）。
  const [boxes, setBoxes] = useState<VisualBoxData[]>(layout ?? []);
  // 设计开关：编辑模式内可切「编辑中 / 预览中」，控制格子交互是否激活（与 mode 派生的 isEditMode 区分）。
  const [isDesigning, setIsDesigning] = useState<boolean>(mode === "edit");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentEditingBoxId, setCurrentEditingBoxId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const toolbarDragRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 拖拽中的吸附偏移（px）：位移由 react-draggable 内部状态驱动，偏移经 positionOffset 叠加，
  // 实现拖拽中实时吸附；松手后用同一套吸附逻辑提交，两者结果一致、不跳变。
  const [dragSnapOffset, setDragSnapOffset] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  // 缩放中的实时原点（仅 left / top 方向的边移动时非空），经 livePosition 移动外层。
  const [resizeLivePosition, setResizeLivePosition] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  // 当前显示的吸附参考线（容器内 px），只在拖拽 / 缩放贴合时非空。
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  const isEditMode = mode === "edit";
  // 首帧容器未测量完成前隐藏格子区，避免格子以 0×0 渲染一帧再弹出。
  const isMeasured = containerSize.width > 0 && containerSize.height > 0;

  // 布局种子「读回」由消费方负责（拉取 / 读取后经 layout 注入）。
  // 引用变化时重置编辑：用 React 官方推荐的「渲染期间调整状态」写法，替代 setState-in-effect。
  const [seedLayout, setSeedLayout] = useState(layout);
  if (seedLayout !== layout) {
    setSeedLayout(layout);
    setBoxes(layout ?? []);
  }

  // 组件选择弹层：Esc 关闭。
  useEffect(() => {
    if (!isModalVisible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalVisible(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isModalVisible]);

  // 容器尺寸观察与布局加载解耦：只在挂载时建立一次，避免 layout 变化时重复注册。
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!entry.contentBoxSize) continue;
        // noUncheckedIndexedAccess：数组分支取首项可能为 undefined，兜底跳过。
        const box = Array.isArray(entry.contentBoxSize)
          ? entry.contentBoxSize[0]
          : entry.contentBoxSize;
        if (!box) continue;
        setContainerSize({
          width: box.inlineSize,
          height: box.blockSize,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 所有变更统一「算出 next → setBoxes → onLayoutChange」：
  // 实时回调只在用户变更时触发（layout 种子注入不触发），回调结果回灌 layout 不会成环。
  const addVisualBox = () => {
    const newBox: VisualBoxData = {
      // crypto.randomUUID：避免 StrictMode 双调用下 Date.now() 撞 id。
      // 没有 crypto 的环境（非安全上下文）退回「时间戳-随机数」字符串。
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      position: { x: 0.05, y: 0.05 },
      size: { width: 0.3, height: 0.25 },
      componentType: null,
      isLocked: false,
      // 初始 zIndex 兜底为 1；保存/加载时若旧布局无该字段，渲染处按数组顺序兜底。
      zIndex: 1,
    };
    const next = [...boxes, newBox];
    setBoxes(next);
    onLayoutChange?.(next);
  };

  // 吸附上下文：其它格子（排除当前交互的格子）+ 容器边缘 / 中心线，均为容器内 px。
  const getSnapContext = (excludeId: string): SnapContext | null => {
    if (!snapEnabled || !containerSize.width || !containerSize.height) return null;
    return {
      container: { width: containerSize.width, height: containerSize.height },
      targets: boxes
        .filter((box) => box.id !== excludeId)
        .map((box) => ({
          x: box.position.x * containerSize.width,
          y: box.position.y * containerSize.height,
          width: box.size.width * containerSize.width,
          height: box.size.height * containerSize.height,
        })),
      threshold: snapThreshold,
    };
  };

  const handleDragStart = (id: string) => {
    // 置顶 = 只提升 zIndex，不重排数组——避免拖拽污染持久化的布局数组顺序。
    const maxZ = boxes.reduce((max, b) => Math.max(max, b.zIndex ?? 0), 0);
    const next = boxes.map((box) => (box.id === id ? { ...box, zIndex: maxZ + 1 } : box));
    setBoxes(next);
    onLayoutChange?.(next);
  };

  // 拖拽每帧回调：吸附校正量作为偏移叠加（视觉实时吸附），并同步参考线。
  const handleDragMove = (id: string, x: number, y: number) => {
    const dragged = boxes.find((box) => box.id === id);
    if (!dragged) return;
    const ctx = getSnapContext(id);
    const rect: SnapRect = {
      x,
      y,
      width: dragged.size.width * containerSize.width,
      height: dragged.size.height * containerSize.height,
    };
    const result: SnapResult = ctx ? snapDrag(rect, ctx) : { ...rect, guides: [] };
    // 吸附线可能把边缘推出容器（钳制回界内，与 react-draggable 的 bounds 行为一致）
    const snapped = clampRectToContainer(result, {
      width: containerSize.width,
      height: containerSize.height,
    });
    setDragSnapOffset({ id, x: snapped.x - x, y: snapped.y - y });
    setSnapGuides(snapped.guides);
  };

  const handleDragStop = (id: string, newPosition: { x: number; y: number }) => {
    setDragSnapOffset(null);
    setSnapGuides([]);
    // 容器尚未测量完成时丢弃本次结果（静默不更新，不发 onLayoutChange）。
    if (!containerSize.width || !containerSize.height) return;
    const dragged = boxes.find((box) => box.id === id);
    if (!dragged) return;
    // 与拖拽中同一套吸附逻辑：松手重算一次，保证提交值与所见一致。
    const ctx = getSnapContext(id);
    const rect: SnapRect = {
      x: newPosition.x,
      y: newPosition.y,
      width: dragged.size.width * containerSize.width,
      height: dragged.size.height * containerSize.height,
    };
    const result: SnapResult = ctx ? snapDrag(rect, ctx) : { ...rect, guides: [] };
    const snapped = clampRectToContainer(result, {
      width: containerSize.width,
      height: containerSize.height,
    });
    const next = boxes.map((box) => {
      if (box.id !== id) return box;
      return {
        ...box,
        position: {
          x: snapped.x / containerSize.width,
          y: snapped.y / containerSize.height,
        },
      };
    });
    setBoxes(next);
    onLayoutChange?.(next);
  };

  // 缩放每帧回调：返回吸附校正后的矩形（VisualBox 用它校正 DOM），原点变化经 livePosition 移动。
  const handleResizeMove = (
    id: string,
    direction: ResizeDirection,
    tentative: SnapRect,
  ): SnapRect => {
    const ctx = getSnapContext(id);
    const result: SnapResult = ctx
      ? snapResize(tentative, direction, ctx)
      : { ...tentative, guides: [] };
    setResizeLivePosition({ id, x: result.x, y: result.y });
    setSnapGuides(result.guides);
    return { x: result.x, y: result.y, width: result.width, height: result.height };
  };

  const handleResizeStop = (id: string, direction: ResizeDirection, rawRect: SnapRect) => {
    setResizeLivePosition(null);
    setSnapGuides([]);
    if (!containerSize.width || !containerSize.height) return;
    // 与缩放中同一套吸附逻辑：松手重算一次，保证提交值与所见一致。
    const ctx = getSnapContext(id);
    const result: SnapResult = ctx
      ? snapResize(rawRect, direction, ctx)
      : { ...rawRect, guides: [] };
    const next = boxes.map((box) => {
      if (box.id !== id) return box;
      return {
        ...box,
        position: {
          x: result.x / containerSize.width,
          y: result.y / containerSize.height,
        },
        size: {
          width: result.width / containerSize.width,
          height: result.height / containerSize.height,
        },
      };
    });
    setBoxes(next);
    onLayoutChange?.(next);
  };

  const handleSelectComponent = (id: string, componentType: string | null) => {
    const next = boxes.map((box) => (box.id === id ? { ...box, componentType } : box));
    setBoxes(next);
    onLayoutChange?.(next);
  };

  const handleDeleteBox = (id: string) => {
    const next = boxes.filter((box) => box.id !== id);
    setBoxes(next);
    onLayoutChange?.(next);
  };

  const handleToggleLock = (id: string, isLocked: boolean) => {
    const next = boxes.map((box) => (box.id === id ? { ...box, isLocked } : box));
    setBoxes(next);
    onLayoutChange?.(next);
  };

  // 库不持久化：保存 = 布局定稿并整体抛给消费方，成败与提示由消费方的持久化逻辑决定。
  const handleSaveLayout = async () => {
    if (isSaving || !onSave) return;
    setIsSaving(true);
    try {
      await onSave(boxes);
    } catch (error) {
      // 不吞掉消费方持久化的异常：保证按钮状态复位并留调试痕迹，处理方式由消费方决定。
      console.error("Dashboard onSave failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditComponent = (id: string) => {
    setCurrentEditingBoxId(id);
    setIsModalVisible(true);
  };

  const handleModalChange = (componentType: string) => {
    if (currentEditingBoxId !== null) {
      // 占位项（''）归一为 null，维持 componentType: string | null 契约，避免空串写进布局数据。
      handleSelectComponent(currentEditingBoxId, componentType || null);
      setIsModalVisible(false);
    }
  };

  return (
    <div className={cn(rootClassName ?? defaultContainerClassName, className)}>
      {isEditMode && (
        <Draggable handle=".toolbar-handle" nodeRef={toolbarDragRef}>
          <div
            className="toolbar fixed top-4 left-4 z-50 bg-card border border-border rounded-lg shadow-lg p-3"
            ref={toolbarDragRef}
          >
            <div
              className="toolbar-handle absolute top-0 left-0 right-0 h-6 cursor-move"
              style={{ cursor: "move" }}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="default" onClick={addVisualBox} className="gap-1">
                <Plus className="h-4 w-4" />
                新增可视框
              </Button>
              {onSave && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveLayout}
                  disabled={isSaving}
                  className="gap-1"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "保存中…" : "保存"}
                </Button>
              )}
              <Switch
                checked={isDesigning}
                onCheckedChange={setIsDesigning}
                aria-label={isDesigning ? "编辑模式" : "预览模式"}
              />
              <span className="text-sm text-muted-foreground ml-2">
                {isDesigning ? "编辑中" : "预览中"}
              </span>
            </div>
          </div>
        </Draggable>
      )}

      <div className={cn("relative h-full w-full", !isMeasured && "invisible")} ref={containerRef}>
        {boxes.map((box, index) => {
          const currentPosition = {
            x: box.position.x * containerSize.width,
            y: box.position.y * containerSize.height,
          };
          const currentSize = {
            width: box.size.width * containerSize.width,
            height: box.size.height * containerSize.height,
          };

          const bounds = {
            left: 0,
            top: 0,
            right: Math.max(0, containerSize.width - currentSize.width),
            bottom: Math.max(0, containerSize.height - currentSize.height),
          };

          return (
            <VisualBox
              key={box.id}
              id={box.id}
              position={currentPosition}
              size={currentSize}
              onDragStart={handleDragStart}
              onDragStop={handleDragStop}
              onResizeStop={handleResizeStop}
              onSelectComponent={handleSelectComponent}
              onDelete={handleDeleteBox}
              onToggleLock={handleToggleLock}
              onEditComponent={handleEditComponent}
              isEditing={isEditMode && isDesigning}
              isLocked={box.isLocked}
              // zIndex 独立存储，拖拽置顶不重排数组；旧布局无该字段时按数组顺序兜底。
              zIndex={box.zIndex ?? index + 1}
              bounds={bounds}
              selectedComponentType={box.componentType}
              livePosition={
                resizeLivePosition?.id === box.id
                  ? { x: resizeLivePosition.x, y: resizeLivePosition.y }
                  : undefined
              }
              snapOffset={
                dragSnapOffset?.id === box.id
                  ? { x: dragSnapOffset.x, y: dragSnapOffset.y }
                  : undefined
              }
              onDragMove={isEditMode && isDesigning ? handleDragMove : undefined}
              onResizeMove={isEditMode && isDesigning ? handleResizeMove : undefined}
            >
              <BoxContent componentType={box.componentType} registry={registry} />
            </VisualBox>
          );
        })}
        {/* 吸附参考线（draw.io 式）：仅在拖拽 / 缩放贴合时出现。
            颜色可经 CSS 变量 --dashboard-snap-guide-color 覆盖。 */}
        {snapGuides.map((guide, guideIndex) => (
          <div
            key={`${guide.axis}:${guide.position}:${guideIndex}`}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              backgroundColor: "var(--dashboard-snap-guide-color, #ec4899)",
              zIndex: 9999,
              ...(guide.axis === "x"
                ? { left: guide.position, top: 0, width: 1, height: "100%" }
                : { top: guide.position, left: 0, height: 1, width: "100%" }),
            }}
          />
        ))}
        {boxes.length === 0 && isEditMode && (
          <Empty
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            description="点击“新增可视框”开始构建你的大屏"
          />
        )}
      </div>

      {isModalVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsModalVisible(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="选择组件"
            className="bg-card rounded-lg shadow-xl max-w-md w-full m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-medium">选择组件</h3>
              <button
                type="button"
                autoFocus
                aria-label="关闭"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsModalVisible(false)}
              >
                ✕
              </button>
            </div>
            <ComponentSelector
              onChange={handleModalChange}
              value={boxes.find((box) => box.id === currentEditingBoxId)?.componentType || ""}
              registry={registry}
            />
          </div>
        </div>
      )}
    </div>
  );
};
