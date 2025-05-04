// vite.config.ts
import { defineConfig } from 'vite';

const proxyConf = {
  target: 'http://localhost:5000',
  changeOrigin: true,
};

export default defineConfig({
  root: '.', // your project root
  server:{
    proxy:{
      '/save':proxyConf,
      '/load':proxyConf,
      '/login':proxyConf,
      '/register':proxyConf,
      '/check':proxyConf,
      '/toc':proxyConf,
    }
  }
});