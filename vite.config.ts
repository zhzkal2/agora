import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [fresh(), tailwindcss()],
  resolve: {
    alias: {
      "isexe": resolve("utils/isexe-shim.ts"),
      "gray-matter": resolve("utils/gray-matter-shim.ts"),
    },
  },
  ssr: {
    noExternal: true,
  },
});
