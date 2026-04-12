import { defineConfig } from "vite";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: "./frontend/src/__tests__/setup.js",
        include: ["frontend/src/__tests__/**/*.test.{js,ts,jsx,tsx}"],
    },
});

