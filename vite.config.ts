import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import nodePolyfills from 'rollup-plugin-node-polyfills';

// Determine if we're in a pure client context
const isClientContext = !process.env.SERVER_CONTEXT;

export default defineConfig({
  plugins: [
    react(),
    // Only apply the error overlay in client contexts
    ...(isClientContext ? [runtimeErrorOverlay()] : []),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Add Buffer polyfill aliases
      "buffer": "buffer",
    },
  },
  server: {
    allowedHosts: true, // Allows any host
  },
  define: {
    // Add global Buffer definition
    global: "globalThis",
  },
  optimizeDeps: {
    esbuildOptions: {
      // Enable Node.js global polyfills
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
        }),
      ],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      plugins: [
        // Enable Rollup polyfills
        nodePolyfills(),
      ],
    },
  },
});
