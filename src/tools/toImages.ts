import JSZip from 'jszip';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { openWithPdfJs, renderPageToCanvas } from '../lib/pdfjs';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, canvasToBlob, nextFrame, stripExt } from '../lib/format';

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

export function mountToImages(container: HTMLElement): void {
  const panel = createPanel('PDF 转图片', '把 PDF 每一页导出为 PNG 或 JPG，多页自动打包为 ZIP。');

  let file: File | null = null;
  let base = 'document';
  let fmt: 'png' | 'jpg' = 'png';
  let urls: string[] = [];

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
      thumbs.innerHTML = '';
      btn.disabled = false;
      panel.setStatus(`已载入「${file.name}」，设置好后点击转换`, 'ok');
    },
  });

  const opts = document.createElement('div');
  opts.innerHTML = `
    <div class="options">
      <div class="field">
        <label>输出格式</label>
        <div class="segmented" id="fmt">
          <button type="button" data-f="png" aria-pressed="true">PNG（无损）</button>
          <button type="button" data-f="jpg" aria-pressed="false">JPG（更小）</button>
        </div>
      </div>
      <div class="field">
        <label>清晰度</label>
        <select id="scale">
          <option value="1.5">标准（1.5×）</option>
          <option value="2" selected>清晰（2×）</option>
          <option value="3">高清（3×）</option>
        </select>
        <span class="hint">越高越清晰，文件也越大</span>
      </div>
    </div>
  `;
  const thumbs = document.createElement('div');
  thumbs.className = 'thumbs';
  panel.body.append(dz, opts, thumbs);

  opts.querySelectorAll('#fmt button').forEach((b) =>
    b.addEventListener('click', () => {
      fmt = (b as HTMLElement).dataset.f as 'png' | 'jpg';
      opts.querySelectorAll('#fmt button').forEach((x) =>
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false'),
      );
    }),
  );

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.disabled = true;
  btn.innerHTML = `${icons.toImg}转换为图片`;
  panel.actions.appendChild(btn);

  const clearUrls = () => {
    urls.forEach((u) => URL.revokeObjectURL(u));
    urls = [];
  };

  btn.addEventListener('click', async () => {
    if (!file) return;
    btn.disabled = true;
    panel.clearResult();
    clearUrls();
    thumbs.innerHTML = '';
    const scale = parseFloat((opts.querySelector('#scale') as HTMLSelectElement).value);
    const type = fmt === 'png' ? 'image/png' : 'image/jpeg';
    const ext = fmt === 'png' ? 'png' : 'jpg';
    panel.setStatus('正在转换…');
    panel.setProgress(0);
    try {
      const buf = await file.arrayBuffer();
      const doc = await openWithPdfJs(buf);
      const n = doc.numPages;
      const pad = String(n).length;
      const out: { name: string; blob: Blob }[] = [];
      for (let i = 1; i <= n; i++) {
        const canvas = await renderPageToCanvas(doc, i, scale);
        const blob = await canvasToBlob(canvas, type, fmt === 'jpg' ? 0.92 : undefined);
        const name = `${base}_${String(i).padStart(pad, '0')}.${ext}`;
        out.push({ name, blob });
        const url = URL.createObjectURL(blob);
        urls.push(url);
        const t = document.createElement('div');
        t.className = 'thumb';
        t.innerHTML = `<img src="${url}" alt="${name}" loading="lazy" /><div class="cap mono">第 ${i} 页 · ${formatBytes(blob.size)}</div>`;
        thumbs.appendChild(t);
        panel.setProgress(i / n);
        await nextFrame();
      }
      panel.setProgress(null);
      panel.setStatus(`已转换 ${n} 页`, 'ok');
      if (n === 1) {
        panel.showResult({
          title: '转换完成（1 页）',
          detail: `${ext.toUpperCase()} · ${formatBytes(out[0].blob.size)}`,
          onDownload: () => downloadBlob(out[0].blob, out[0].name),
        });
      } else {
        const zip = new JSZip();
        out.forEach((o) => zip.file(o.name, o.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        panel.showResult({
          title: `转换完成（${n} 页）`,
          detail: `打包 ZIP · ${formatBytes(zipBlob.size)}`,
          onDownload: () => downloadBlob(zipBlob, `${base}_图片.zip`),
          btnLabel: '下载 ZIP',
        });
      }
    } catch (e) {
      panel.setProgress(null);
      panel.setStatus((e as Error).message || '转换失败，文件可能已加密或损坏', 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
