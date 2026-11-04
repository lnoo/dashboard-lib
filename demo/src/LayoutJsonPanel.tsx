import { useState } from "react";
import type { DashboardLayout } from "@sqx717/dashboard";
import { toast } from "sonner";

/** 剪贴板写入（localhost 安全上下文可用；失败由调用方决定提示方式）。 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

interface LayoutJsonPanelProps {
  layout: DashboardLayout;
  /** 应用（替换 layout 种子）；由父级关闭面板。 */
  onApply: (layout: DashboardLayout) => void;
  onClose: () => void;
}

/** 布局 JSON 面板：复制 / 编辑 / 应用，演示「读回 → layout 种子替换」链路。 */
export function LayoutJsonPanel({ layout, onApply, onClose }: LayoutJsonPanelProps) {
  // 草稿独立于实时布局：面板打开时载入一次，编辑中不被 onLayoutChange 冲掉。
  const [draft, setDraft] = useState(() => JSON.stringify(layout, null, 2));

  const apply = () => {
    try {
      const parsed = JSON.parse(draft) as DashboardLayout;
      if (!Array.isArray(parsed) || parsed.some((box) => typeof box?.id !== "string")) {
        throw new Error("需要 VisualBoxData[]：数组且每项含 string id");
      }
      onApply(parsed);
      toast.success(`已替换 layout（${parsed.length} 个格子）：种子引用变化将重置编辑`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "JSON 解析失败");
    }
  };

  const copyDraft = async () => {
    const ok = await copyText(draft);
    if (ok) {
      toast.success("已复制到剪贴板");
    } else {
      toast.error("剪贴板写入失败");
    }
  };

  return (
    <div className="fixed right-4 bottom-16 z-40 w-[22rem] rounded-lg border border-border bg-card p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          布局 JSON（{layout.length} 个格子）
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        className="h-48 w-full resize-none rounded-md border border-input bg-background p-2 font-mono text-xs outline-none"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDraft(JSON.stringify(layout, null, 2))}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          载入当前布局
        </button>
        <button
          type="button"
          onClick={copyDraft}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          复制
        </button>
        <button
          type="button"
          onClick={apply}
          className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/80"
        >
          应用（替换 layout）
        </button>
      </div>
    </div>
  );
}
