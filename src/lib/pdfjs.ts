import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// Vite 会把 worker 作为独立资源处理并返回其 URL
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/** 用 pdf.js 打开文档。注意：传入的 buffer 可能被 detach，调用方需自备副本。 */
export async function openWithPdfJs(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  return pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
}

/** 把某一页渲染到一个新建的 canvas 上并返回。scale 控制清晰度。 */
export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建画布上下文');
  // 白底，避免透明页渲染成黑色
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, viewport }).promise;
  return canvas;
}

/** 页面在 scale=1 时的 PDF 点尺寸（用于压缩时保持物理页面大小）。 */
export async function pagePointSize(doc: PDFDocumentProxy, pageNumber: number): Promise<{ w: number; h: number }> {
  const page = await doc.getPage(pageNumber);
  const vp = page.getViewport({ scale: 1 });
  return { w: vp.width, h: vp.height };
}
