// vite.config.ts
import { defineConfig } from 'vite';

const proxyConf = {
  target: 'http://localhost:5000',
  changeOrigin: true,
};

export default defineConfig({
  root: '.', // your project root
  base: '/SinglePageProjectEditor/', // base path for the project
});