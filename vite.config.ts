import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      // 这些依赖作为 peerDependency 由消费方提供，不打进产物
      external: [
        "react",
        "react/jsx-runtime",
        "react-dom",
        "react-draggable",
        "re-resizable",
        "lucide-react",
        "clsx",
        "tailwind-merge",
      ],
    },
    sourcemap: true,
  },
});
