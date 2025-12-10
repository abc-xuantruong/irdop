import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    assetsInclude: ["**/*.png", "**/*.jpg", "**/*.svg"], // file ảnh
    define: {
        __WS_TOKEN__: JSON.stringify("abc"),
        global: "globalThis", // Định nghĩa `global` thành `globalThis`
    },
    resolve: {
        alias: {
            "@": "/src",
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    tinymce: ["tinymce/tinymce"],
                },
            },
        },
        esbuild: {
            jsxFactory: "React.createElement", // Chỉ định JSX factory cho React
            jsxFragment: "React.Fragment", // Chỉ định JSX Fragment cho React
        },
    },
    server: {
        host: true,
        allowedHosts: ["prev.irdop.org", ".irdop.org", "0ca0b64924cf.ngrok-free.app"],
    },
    preview: {
        host: true, // or '0.0.0.0' for all interfaces
        port: 4173,
        allowedHosts: ["prev.irdop.org", ".irdop.org", "0ca0b64924cf.ngrok-free.app"],
    },
});
