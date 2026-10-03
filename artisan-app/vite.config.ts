import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

export default defineConfig({
  root: fs.realpathSync(process.cwd()),
  plugins: [react()],
  server: {
    port: 5175,
    host: true,
  },
});
