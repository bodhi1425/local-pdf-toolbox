import { PDFDocument } from 'pdf-lib';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { openWithPdfJs, renderPageToCanvas, pagePointSize } from '../lib/pdfjs';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, canvasToBlob, nextFrame, stripExt } from '../lib/format';

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

const PRESETS: Record<string, { scale: number; q: number }> = {
  low: { scale: 2.0, q: 0.82 },
  medium: { scale: 1.5, q: 0.65 },
  high: { scale: 1.0, q: 0.5 },
};

export function mountCompress(container: HTMLElement): void {
  const panel = createPanel('PDF 压缩', '通过重新编码页面图像为 PDF 瘦身，扫描件、图片型 PDF 效果最佳。');

  let file: File | null = null;
  let base = 'document';
  let preset = 'medium';

  const dz = createDropzone({
    accept: 'application/pdf',
    multiple: false,
    title: '拖入一个 PDF，或点击选择',
    hint: '仅支持 PDF · 文件不会上传',
    filter: isPdf,
    onFiles: (fs) => {
      file = fs[0];
      base = stripExt(file.name);
      panel.clearResult();
      btn.disabled = false;
      panel.setStatus(`已载入「${file.name}」（${formatBytes(file.size)}）`, 'ok');
    },
  });

  const opts = document.createElement('div');
  opts.innerHTML = `
    <div class="options">
      <div class="field">
        <label>压缩强度</label>
        <div class="segmented" id="preset">
          <button type="button" data-p="low" aria-pressed="false">轻度</button>
          <button type="button" data-p="medium" aria-pressed="true">推荐</button>
          <button type="button" data-p="high" aria-pressed="false">强力</button>
        </div>
        <span class="hint">强力体积最小、清晰度略降</span>
      </div>
    </div>
    <p class="notice">压缩会把每一页转成图片重新编码，原本可选中、可搜索的文字将变为图片。如需保留文字图层，请改用其它工具或保留原文件。</p>
  `;
  panel.body.append(dz, opts);

  opts.querySelectorAll('#preset button').forEach((b) =>
    b.addEventListener('click', () => {
      preset = (b as HTMLElement).dataset.p as string;
      opts.querySelectorAll('#preset button').forEach((x) =>
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false'),
      );
    }),
  );

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.disabled = true;
  btn.innerHTML = `${icons.compress}开始压缩`;
  panel.actions.appendChild(btn);

  btn.addEventListener('click', async () => {
    if (!file) return;
    btn.disabled = true;
    panel.clearResult();
    const { scale, q } = PRESETS[preset];
    const origSize = file.size;
    panel.setStatus('正在压缩…');
    panel.setProgress(0);
    try {
      const buf = await file.arrayBuffer();
      const doc = await openWithPdfJs(buf);
      const n = doc.numPages;
      const out = await PDFDocument.create();
      for (let i = 1; i <= n; i++) {
        const { w, h } = await pagePointSize(doc, i);
        const canvas = await renderPageToCanvas(doc, i, scale);
        const jpeg = await canvasToBlob(canvas, 'image/jpeg', q);
        const img = await out.embedJpg(await jpeg.arrayBuffer());
        const page = out.addPage([w, h]);
        page.drawImage(img, { x: 0, y: 0, width: w, height: h });
        panel.setProgress((i + 1) / n);
        await nextFrame();
      }
      const data = await out.save();
      const blob = new Blob([data as BlobPart], { type: 'application/pdf' });
      panel.setProgress(null);
      const saved = origSize - blob.size;
      const pct = Math.round((saved / origSize) * 100);
      if (saved > 0) {
        panel.setStatus(`压缩完成，体积减少 ${pct}%`, 'ok');
        panel.showResult({
          title: `${formatBytes(origSize)} → ${formatBytes(blob.size)}`,
          detail: `减少 ${pct}% · 共 ${n} 页`,
          onDownload: () => downloadBlob(blob, `${base}_compressed.pdf`),
        });
      } else {
        panel.setStatus('该 PDF 已较为精简，压缩后体积未减小', 'err');
        panel.showResult({
          title: `原文件 ${formatBytes(origSize)} 已很精简`,
          detail: `压缩后约 ${formatBytes(blob.size)}，建议保留原文件`,
          onDownload: () => downloadBlob(blob, `${base}_compressed.pdf`),
          btnLabel: '仍要下载',
        });
      }
    } catch (e) {
      panel.setProgress(null);
      panel.setStatus((e as Error).message || '压缩失败，文件可能已加密或损坏', 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
