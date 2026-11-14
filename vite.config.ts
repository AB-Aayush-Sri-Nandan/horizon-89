import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    allowedHosts:
      process.env.CODESPACE_NAME &&
      process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
        ? [
            `${process.env.CODESPACE_NAME}-5173.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`,
          ]
        : [],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        // Preserve the browser's public host so same-origin checks also work
        // through the Codespaces HTTPS port forwarder.
        changeOrigin: false,
      },
    },
  },
});
