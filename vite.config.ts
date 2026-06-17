import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // permite acesso via túneis (localtunnel, cloudflared etc.)
    allowedHosts: true,
  },
});
