import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // For the dev-server proxy we need the runtime environment variable set by
  // Docker (process.env), not the .env-file value loaded by Vite (loadEnv).
  // loadEnv only reads .env files and ignores system/container env vars.
  const proxyTarget = process.env.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
    ],
    server: {
      allowedHosts: ['identity.monkeys.support'],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/.well-known': {
          target: proxyTarget,
          changeOrigin: true,
        },
      }
    }
  };
});
