import { defineConfig } from 'vite';
import { TOOLS } from './scripts/site.config.mjs';

// 多页入口：首页 + 每个工具一个独立 HTML（由 scripts/gen-pages.mjs 生成）
const input: Record<string, string> = { main: 'index.html' };
for (const t of TOOLS) {
  const dir = t.path.replace(/^\/|\/$/g, '');
  input[t.id] = `${dir}/index.html`;
}

export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input },
  },
});
