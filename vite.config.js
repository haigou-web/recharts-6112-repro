import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  server: { port: 5199, strictPort: true },
  resolve: {
    alias: {
      'recharts-pr7894': root + 'node_modules/recharts-pr7894/es6/index.js'
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client']
  }
});
