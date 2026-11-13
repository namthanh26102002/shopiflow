import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "supabase/functions/_shared/**/*.test.ts"],
    // Vitest blanks CSS files by default. The Shopify theme's stylesheets are
    // imported ?raw as theme content (rendered and zipped), so keep them real.
    css: { include: [/shopify-theme[\\/]base[\\/]assets[\\/].*\.css/] },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
