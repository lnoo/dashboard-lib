# @sqx717/dashboard

可复用的 **Vite + React 大屏（Dashboard）外壳库**。

可拖拽/缩放的格子布局、业务组件注册表。**业务组件由消费方注入。**

## 特性

- 大屏外壳 `<Dashboard />`：拖拽 / 缩放 / 锁定 / 删除 / 编辑组件的可视格子，支持 `view` / `edit` 双模式
- 业务组件通过**注册表**注入，库不关心组件实现（懒加载由消费方在组装时决定）
- 布局与持久化完全由消费方负责：`layout` 注入初始布局，`onLayoutChange` 抛实时布局，`onSave` 抛「保存」定稿
- **CSS / 主题完全交给消费方**：库只使用标准 Tailwind 工具类，不打包、不注入、不处理主题

## 安装

```bash
bun add @sqx717/dashboard
```

**peerDependencies**（消费方需自行安装）：

`react`（18 / 19 均支持）、`react-dom`、`react-draggable`、`re-resizable`、`lucide-react`、`clsx`、`tailwind-merge`

### 本地开发 / 联调

若在本地联调未发布的版本，可直接用目录依赖：

```bash
bun add ../path/to/dashboard-lib
```

## 快速上手

### 1. 组装业务组件注册表

```tsx
// src/features/dashboard/registry.tsx
import type { DashboardComponentRegistry } from "@sqx717/dashboard";
import ScreenHeader from "./instances/screenHeader";
import KpiStats from "./instances/kpiStats";

export const dashboardRegistry: DashboardComponentRegistry = {
  // 直接注册：选择器展示注册 key（camelCase 自动拆词）
  header: ScreenHeader,
  // 带展示名：label 用于组件选择器
  kpi: { component: KpiStats, label: "KPI 指标卡" },
};
```

### 2. 提供布局数据

布局是纯数据（`DashboardLayout = VisualBoxData[]`），由消费方自行提供：`import.meta.glob`、远端接口、state 均可。

```ts
// src/features/dashboard/config.ts —— 按需查表；需要懒加载时改成异步拉取即可
import type { DashboardLayout } from "@sqx717/dashboard";
import layoutModules from "@/features/dashboard/layout"; // 现有 import.meta.glob 逻辑不变

export const getLayout = (id: string): DashboardLayout | undefined => layoutModules[id];
```

### 3. 渲染大屏

```tsx
import { Dashboard } from "@sqx717/dashboard";
import { getLayout } from "@/features/dashboard/config";
import { dashboardRegistry } from "@/features/dashboard/registry";

export function Screen({ id }: { id: string }) {
  return <Dashboard key={id} layout={getLayout(id)} registry={dashboardRegistry} mode="view" />;
}
```

## `<Dashboard />` Props

| Prop             | 类型                                                    | 说明                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mode`           | `'edit' \| 'view'`                                      | 大屏模式，默认 `view`                                                                                                                                                                                        |
| `layout`         | `DashboardLayout?`                                      | 初始布局，缺省以空布局起步（编辑尚不存在的新大屏）。**引用变化会以新布局重置编辑**——请传稳定引用（useMemo / state / 拉取结果）；多屏切换建议 `key={id}` 重挂载                                               |
| `registry`       | `DashboardComponentRegistry`                            | 业务组件注册表（消费方配置）：值为组件，或 `{ component, label }`（`label` 用于组件选择器展示，缺省用注册 key）                                                                                              |
| `className`      | `string?`                                               | 追加到根容器的命名空间 class                                                                                                                                                                                 |
| `rootClassName`  | `string?`                                               | 根容器基础类，默认 `relative h-dvh w-full bg-background overflow-hidden`                                                                                                                                     |
| `onSave`         | `(layout: DashboardLayout) => void \| Promise<unknown>` | 保存委托：点击「保存」时把当前布局（`VisualBoxData[]`）整体抛出，持久化（localStorage / 远程）与提示完全由消费方决定。返回 Promise 时 pending 期间忽略重复点击、「保存」按钮禁用；不传则工具栏不显示「保存」 |
| `onLayoutChange` | `(layout: DashboardLayout) => void`                     | 实时布局回调：增删格子 / 拖停 / 缩停 / 换组件 / 锁定 / 置顶后抛出当前布局。初始 `layout` 注入不触发，回调结果回灌 `layout` 也不会成环。用于「未保存更改」标记、URL 同步、防抖自动保存等                      |

「保存」把定稿布局抛给消费方，持久化与提示完全由消费方决定（以远程保存 + [sonner](https://sonner.emilkowal.ski/) 为例）：

```tsx
<Dashboard
  key={id}
  layout={getLayout(id)}
  registry={dashboardRegistry}
  onSave={async (next) => {
    await saveLayout(id, next); // 存哪、怎么存由消费方决定：远程接口 / localStorage 均可
    toast.success("布局已成功保存");
  }}
/>
```

> 布局的「读回」同样由消费方负责：把保存的布局经 `layout` 注入（或注入前异步拉取），刷新后即可恢复。

> **主题由消费方管理**：库不提供 `theme` / `themePreset` / `data-theme-preset` prop。明暗主题、主题预设、CSS 令牌全由消费方在 `<Dashboard />` 外层（或其自身样式）处理。若业务组件需要 `theme`，由消费方组装注册表时自行包一层传入。

## 业务组件 props 契约

| 字段                 | 说明                 |
| -------------------- | -------------------- |
| `className?: string` | 通用透传，与主题无关 |

`DashboardComponentProps` 其余字段以 `[key: string]: unknown` 兜底，业务组件可自行扩展。

## CSS / Tailwind 接入

库不打包 CSS。库产物里的 Tailwind 工具类需要消费方项目扫描到：

```css
/* 消费方 src/styles/index.css（Tailwind v4） */
@source "../node_modules/@sqx717/dashboard/dist";
```

若用本地目录依赖，`@source` 指向库源码即可（开发热更新）。

## 导出清单

**组件**

`Dashboard`、`ComponentSelector`、`VisualBox`、`Button`、`Switch`、`Empty`

**工具**

- `cn` — `clsx` + `tailwind-merge`
- `toComponentOptions` — 由注册表生成组件选择器下拉选项
- `resolveRegistryEntry` — 归一化注册表条目（组件 / `{ component, label }`）

## 开发 & 构建

```bash
bun install
bun run check    # format:check + lint + test + build + publint，发布前的本地冒烟
bun run build    # 产出 dist/index.js + dist/*.d.ts
bun run dev      # vite build --watch
bun run lint     # oxlint（含 react-hooks / exhaustive-deps）
bun run format   # oxfmt 全量格式化（format:check 只校验）
bun run test     # Vitest + Testing Library（jsdom）
```

## Demo 运行

**在线体验**：推送 `main` 后自动部署到 GitHub Pages → <https://lnoo.github.io/dashboard-lib/>

仓库内置一个独立的 `demo/` 应用，以**消费方视角**直接使用库源码（热更新），内含示例业务组件与布局，可体验拖拽 / 缩放 / 增删 / 换组件 / 保存布局等功能。

```bash
bun run demo          # 启动开发服务器，打开 http://localhost:5173
bun run demo:build    # 产出 demo/dist 静态构建
```

**GitHub Pages 部署**：`.github/workflows/deploy-demo.yml` 在 push 到 `main`（或手动 `workflow_dispatch`）时先跑 `check` 冒烟，再以 `DEMO_BASE=/dashboard-lib/` 构建 demo 并发布到 Pages。首次启用需在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，之后全自动。

demo 按上文「CSS / Tailwind 接入」的推荐路径用 Tailwind v4 接入（`@tailwindcss/vite` + `@theme` 设计令牌 + `@source` 扫描库源码），可作为消费方接入的参照实现。

> demo 演示完整数据回路：`onLayoutChange` 实时同步到 demo 状态；`onSave` 写入 localStorage 并把布局 JSON 复制到剪贴板，结果经 [sonner](https://sonner.emilkowal.ski/) toast 反馈（刷新后读回经 `layout` 注入恢复）；右下角「布局 JSON」面板可直接编辑并应用——替换 `layout` 亲眼看种子重置；「重置布局」一键清掉本地存储。

## 目录结构

```
demo/                        # 独立 demo 应用（消费方视角，热更新直用库源码）
├─ index.html
├─ vite.config.ts            # root 指向 demo；alias @sqx717/dashboard → ../src
└─ src/
   ├─ main.tsx               # React 入口
   ├─ App.tsx                # 渲染 <Dashboard /> + localStorage 读回 / 重置
   ├─ registry.tsx           # 示例业务组件注册表（含 { component, label } 用法）
   ├─ widgets.tsx            # 示例业务组件（标题栏 / KPI / SVG 趋势图）
   ├─ layouts.ts             # 示例布局数据
   └─ styles.css             # Tailwind v4 接入 + @theme 设计令牌

src/                         # 库源码
├─ index.ts                  # 公共出口
├─ shell/                    # 大屏外壳
│  ├─ Dashboard.tsx
│  ├─ VisualBox.tsx          # 可视格子（拖拽/缩放/编辑控制）——shell 层而非原语
│  ├─ ComponentSelector.tsx
│  ├─ BoxErrorBoundary.tsx   # 单格错误边界（内部使用，不进公共导出）
│  └─ types.ts               # 注册表 / 布局 / 格子类型
├─ primitives/               # 库内置轻量原语（不依赖 radix）
│  ├─ Button.tsx
│  ├─ Switch.tsx
│  └─ Empty.tsx
├─ __tests__/Dashboard.test.tsx
├─ test/setup.ts             # 测试环境（ResizeObserver stub 等）
└─ utils/
   └─ cn.ts                  # clsx + tailwind-merge
```

根目录另有 `vitest.config.ts`、`.oxlintrc.json`、`CHANGELOG.md`。

## 许可

MIT
