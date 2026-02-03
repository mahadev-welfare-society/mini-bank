import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    plugins: [
      react(),
      // Add compression plugin for production builds (gzip/brotli)
      isProduction &&
        compression({
          algorithm: "brotliCompress",
          ext: ".br",
          threshold: 1024, // Only compress files larger than 1kb
        }),
      isProduction &&
        compression({
          algorithm: "gzip",
          ext: ".gz",
          threshold: 1024,
        }),
    ].filter(Boolean), // Remove false values from array
    base: "/",
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: false,
      minify: isProduction ? "esbuild" : false, // Only minify in production
      target: "esnext", // Modern JS syntax for smaller output
      chunkSizeWarningLimit: 1000, // Increase chunk size warning limit to 1000kb
      rollupOptions: {
        output: {
          // Only apply manual chunks in production to avoid HMR issues
          ...(isProduction && {
            manualChunks: (id) => {
              // Split vendor chunks for better caching
              if (id.includes("node_modules")) {
                // React and React DOM
                if (id.includes("react") || id.includes("react-dom")) {
                  return "vendor-react";
                }
                // React Router
                if (id.includes("react-router")) {
                  return "vendor-router";
                }
                // Axios
                if (id.includes("axios")) {
                  return "vendor-axios";
                }
                // Lucide icons (can be large)
                if (id.includes("lucide-react")) {
                  return "vendor-icons";
                }
                // Other node_modules
                return "vendor";
              }
            },
          }),
          // Optimize chunk file names
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
        },
      },
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Optimize asset inlining threshold
      assetsInlineLimit: 4096, // 4kb
    },
    server: {
      port: 3000,
      host: true,
      hmr: {
        overlay: true, // Show error overlay in browser
      },
    },
  };
});
