// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 🔽 Add this block 🔽
  optimizeDeps: {
    include: [
      'react-window', // Explicitly include it for optimization
    ],
    // The main export is sometimes under a 'default' property in Vite's cache
    // You can try excluding it, which forces resolution at runtime
    // exclude: ['react-window'], 
  },
});