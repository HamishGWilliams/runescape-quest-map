import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/runescape-quest-map/" : "/",
}));
