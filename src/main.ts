import './style.css';
import { TOOL_MOUNTS } from './tools/registry';

// 每个工具页的 HTML 里有 <section id="app" data-tool="ID">，据此挂载对应工具。
// 首页没有该容器，则只更新页脚年份。
const app = document.getElementById('app');
const toolId = app?.dataset.tool;
if (app && toolId && TOOL_MOUNTS[toolId]) {
  TOOL_MOUNTS[toolId](app);
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
