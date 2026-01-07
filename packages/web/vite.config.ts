import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
  },
  optimizeDeps: {
    // Don't pre-bundle @xyflow/svelte - it has SSR issues
    exclude: ['@xyflow/svelte'],
  },
  ssr: {
    // Don't process @xyflow/svelte on the server
    noExternal: [],
  },
});

