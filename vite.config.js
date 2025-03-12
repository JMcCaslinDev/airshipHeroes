import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd());
  
  // Get port from env or use default
  const serverPort = parseInt(env.PORT || '3001');
  const vitePort = parseInt(env.VITE_PORT || '3000');
  const wsHost = env.VITE_WS_HOST || 'localhost';
  
  return {
    server: {
      port: vitePort,
      strictPort: true, // Don't try other ports if this one is in use
      open: true,
      proxy: {
        '/socket.io': {
          target: `ws://${wsHost}:${serverPort}`,
          ws: true,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    optimizeDeps: {
      include: ['three', 'socket.io-client']
    }
  };
}); 