import JSZip from 'jszip';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { openWithPdfJs, renderPageToCanvas } from '../lib/pdfjs';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, canvasToBlob, nextFrame, stripExt } from '../lib/format';
import { L } from '../lib/i18n';

const TX = {
  zh: {
    title: 'PDF 转图片',
    desc: '把 PDF 每一页导出为 PNG 或 JPG，多页自动打包为 ZIP。',
    dzTitle: '拖入一个 PDF，或点击选择',
    dzHint: '仅支持 PDF · 文件不会上传',
    loaded: (name: string) => `已载入「${name}」，设置好后点击转换`,
    fmtLabel: '输出格式',
    fmtPng: 'PNG（无损）',
    fmtJpg: 'JPG（更小）',
    scaleLabel: '清晰度',
    scaleStd: '标准（1.5×）',
    scaleSharp: '清晰（2×）',
    scaleHd: '高清（3×）',
    scaleHint: '越高越清晰，文件也越大',
    btn: '转换为图片',
    pageCap: (i: number, size: string) => `第 ${i} 页 · ${size}`,
    converting: '正在转换…',
    convertedN: (n: number) => `已转换 ${n} 页`,
    resultOne: '转换完成（1 页）',
    detailOne: (ext: string, size: string) => `${ext} · ${size}`,
    resultMany: (n: number) => `转换完成（${n} 页）`,
    detailZip: (size: string) => `打包 ZIP · ${size}`,
    btnZip: '下载 ZIP',
    zipSuffix: '_图片.zip',
    fail: '转换失败，文件可能已加密或损坏',
  },
  en: {
    title: 'PDF to Images',
    desc: 'Export every PDF page as PNG or JPG — multiple pages are bundled into a ZIP.',
    dzTitle: 'Drop a PDF, or click to choose',
    dzHint: 'PDF only · never uploaded',
    loaded: (name: string) => `Loaded "${name}" — set options, then convert`,
    fmtLabel: 'Output format',
    fmtPng: 'PNG (lossless)',
    fmtJpg: 'JPG (smaller)',
    scaleLabel: 'Resolution',
    scaleStd: 'Standard (1.5×)',
    scaleSharp: 'Sharp (2×)',
    scaleHd: 'HD (3×)',
    scaleHint: 'Higher is sharper but larger',
    btn: 'Convert to images',
    pageCap: (i: number, size: string) => `Page ${i} · ${size}`,
    converting: 'Converting…',
    convertedN: (n: number) => `Converted ${n} page(s)`,
    resultOne: 'Done (1 page)',
    detailOne: (ext: string, size: string) => `${ext} · ${size}`,
    resultMany: (n: number) => `Done (${n} pages)`,
    detailZip: (size: string) => `ZIP bundle · ${size}`,
    btnZip: 'Download ZIP',
    zipSuffix: '_images.zip',
    fail: 'Conversion failed — the file may be encrypted or corrupted',
  },
}[L];

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

export function mountToImages(container: HTMLElement): void {
  const panel = createPanel(TX.title, TX.desc);

  let file: File | null = null;
  let base = 'document';
  let fmt: 'png' | 'jpg' = 'png';
  let urls: string[] = [];

  const dz = createDropzone({
    accept: 'application/pdf',
    multiple: false,
    title: TX.dzTitle,
    hint: TX.dzHint,
    filter: isPdf,
    onFiles: (fs) => {
      file = fs[0];
      base = stripExt(file.name);
      panel.clearResult();
      thumbs.innerHTML = '';
      btn.disabled = false;
      panel.setStatus(TX.loaded(file.name), 'ok');
    },
  });

  const opts = document.createElement('div');
  opts.innerHTML = `
    <div class="options">
      <div class="field">
        <label>${TX.fmtLabel}</label>
        <div class="segmented" id="fmt">
          <button type="button" data-f="png" aria-pressed="true">${TX.fmtPng}</button>
          <button type="button" data-f="jpg" aria-pressed="false">${TX.fmtJpg}</button>
        </div>
      </div>
      <div class="field">
        <label>${TX.scaleLabel}</label>
        <select id="scale">
          <option value="1.5">${TX.scaleStd}</option>
          <option value="2" selected>${TX.scaleSharp}</option>
          <option value="3">${TX.scaleHd}</option>
        </select>
        <span class="hint">${TX.scaleHint}</span>
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
  btn.innerHTML = `${icons.toImg}${TX.btn}`;
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
    panel.setStatus(TX.converting);
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
        t.innerHTML = `<img src="${url}" alt="${name}" loading="lazy" /><div class="cap mono">${TX.pageCap(i, formatBytes(blob.size))}</div>`;
        thumbs.appendChild(t);
        panel.setProgress(i / n);
        await nextFrame();
      }
      panel.setProgress(null);
      panel.setStatus(TX.convertedN(n), 'ok');
      if (n === 1) {
        panel.showResult({
          title: TX.resultOne,
          detail: TX.detailOne(ext.toUpperCase(), formatBytes(out[0].blob.size)),
          onDownload: () => downloadBlob(out[0].blob, out[0].name),
        });
      } else {
        const zip = new JSZip();
        out.forEach((o) => zip.file(o.name, o.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        panel.showResult({
          title: TX.resultMany(n),
          detail: TX.detailZip(formatBytes(zipBlob.size)),
          onDownload: () => downloadBlob(zipBlob, `${base}${TX.zipSuffix}`),
          btnLabel: TX.btnZip,
        });
      }
    } catch (e) {
      panel.setProgress(null);
      panel.setStatus((e as Error).message || TX.fail, 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
