# Changelog

遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [SemVer](https://semver.org/lang/zh-CN/)。

## 1.0.0 - 2026-11-04

首个稳定版：Vite + React 大屏外壳库。可拖拽 / 缩放 / 锁定 / 删除 / 换组件的可视格子，业务组件由注册表注入，CSS / 主题 / 持久化完全由消费方负责。

### 新增

- `<Dashboard />` 外壳：`view` / `edit` 双模式，内置工具栏与组件选择弹层
- 数据流三件套（库只管编辑态，数据进出归消费方）：
  - `layout` — 种子注入（引用变化即重置编辑）
  - `onLayoutChange` — 实时布局回调（仅用户变更触发，回灌 `layout` 不成环）
  - `onSave` — 保存委托（pending 期间防连点、按钮禁用态）
- registry 支持 `{ component, label }` 注册项（组件选择器展示名）
- 单格错误边界：业务组件抛错只影响本格，不击穿整屏
- 轻量原语 `Button` / `Switch` / `Empty`；工具 `cn` / `toComponentOptions` / `resolveRegistryEntry`

### 平台

- React 18 / 19 双支持（peer：`^18.0.0 || ^19.0.0`）

### 工程化

- oxlint + oxfmt（含 react-hooks / exhaustive-deps 检查）
- Vitest + Testing Library 测试套件（jsdom）
- `bun run check`：format:check + lint + test + build + publint 一键发布冒烟
