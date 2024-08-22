import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  if (env.VITE_BASE_URL) {
    console.log("Using base URL", env.VITE_BASE_URL);
  }

  return {
    plugins: [react()],
    base: env.VITE_BASE_URL || "/",
  };
});
