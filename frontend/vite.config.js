import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? "/",
  server: {
    host: "127.0.0.1",
    proxy: {
      // Route /api/* to the local FastAPI backend (avoids CORS on backend)
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Route /lc-graphql to LeetCode GraphQL (avoids browser CORS)
      "/lc-graphql": {
        target: "https://leetcode.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lc-graphql/, "/graphql"),
        secure: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            // Convert x-lc-session header → Cookie so LeetCode auth works in dev
            const session = req.headers["x-lc-session"];
            if (session) {
              proxyReq.setHeader("Cookie", `LEETCODE_SESSION=${session}`);
              proxyReq.removeHeader("x-lc-session");
            }
          });
        },
      },
    },
  },
});
