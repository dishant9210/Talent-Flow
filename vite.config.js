// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 🛑 Must be set to '/' for Vercel/Netlify hosting 🛑
  base: '/', 
  plugins: [react()],
});