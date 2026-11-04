import { useState } from "react";
import { Toaster, toast } from "sonner";
import { Dashboard } from "@sqx717/dashboard";
import type { DashboardLayout } from "@sqx717/dashboard";
import { dashboardRegistry } from "./registry";
import { defaultLayout, layoutStorageKey } from "./layouts";
import { LayoutJsonPanel, copyText } from "./LayoutJsonPanel";

function loadSavedLayout(): DashboardLayout | undefined {
  try {
    const raw = localStorage.getItem(layoutStorageKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as DashboardLayout;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 消费方视角的完整数据回路演示：
 * - layout：初始布局（localStorage 读回 → 缺省用默认布局）
 * - onLayoutChange：实时同步到本地状态（库保证回灌 layout 不会成环）
 * - onSave：写 localStorage + 复制布局 JSON 到剪贴板，sonner toast 展示链路结果
 * - 「布局 JSON」面板：手动编辑并应用，替换 layout 观察种子重置
 */
export default function App() {
  const [layout, setLayout] = useState<DashboardLayout>(() => loadSavedLayout() ?? defaultLayout);
  const [panelOpen, setPanelOpen] = useState(false);

  const resetLayout = () => {
    localStorage.removeItem(layoutStorageKey);
    setLayout(defaultLayout);
    toast("已重置为默认布局");
  };

  return (
    <div className="relative h-dvh w-full">
      <Dashboard
        mode="edit"
        layout={layout}
        registry={dashboardRegistry}
        onLayoutChange={setLayout}
        onSave={async (next) => {
          localStorage.setItem(layoutStorageKey, JSON.stringify(next));
          // 链路可视化：持久化 + 剪贴板复制，结果经 toast 反馈
          const copied = await copyText(JSON.stringify(next, null, 2));
          if (copied) {
            toast.success("保存链路完成：localStorage 已写入，JSON 已复制到剪贴板");
          } else {
            toast.warning("localStorage 已写入（剪贴板写入失败）");
          }
        }}
      />

      <div className="fixed right-4 bottom-4 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow hover:text-foreground"
        >
          布局 JSON
        </button>
        <button
          type="button"
          onClick={resetLayout}
          className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow hover:text-foreground"
        >
          重置布局
        </button>
      </div>

      {panelOpen && (
        <LayoutJsonPanel
          layout={layout}
          onApply={(next) => {
            setLayout(next);
            setPanelOpen(false);
          }}
          onClose={() => setPanelOpen(false)}
        />
      )}

      <Toaster position="top-center" />
    </div>
  );
}
