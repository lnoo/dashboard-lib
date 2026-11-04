import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages 项目站点部署在 /<repo>/ 子路径下：CI 传 DEMO_BASE=/dashboard-lib/
// 本地开发与其它托管环境默认根路径，无需设置。
const base = process.env.DEMO_BASE ?? "/";

export default defineConfig({
  base,
  root: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // 消费方视角直接使用库源码（热更新）；发布验证请构建后改指 dist
      "@sqx717/dashboard": path.resolve(__dirname, "../src/index.ts"),
    },
  },
});
