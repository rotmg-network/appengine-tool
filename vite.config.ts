/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const proxy = {
  "/api": "http://127.0.0.1:8787"
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy
  },
  preview: {
    port: 4173,
    proxy
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"]
  }
});
