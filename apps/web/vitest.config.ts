import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3000"
      }
    },
    globals: true,
    setupFiles: ["./vitest.setup.ts"]
  },
  resolve: {
    alias: {
      "@pmx/api-client": new URL("../../libs/api-client/src/index.ts", import.meta.url).pathname,
      "@pmx/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname
    }
  }
});
