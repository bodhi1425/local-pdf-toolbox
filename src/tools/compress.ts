import { PDFDocument } from 'pdf-lib';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { openWithPdfJs, renderPageToCanvas, pagePointSize } from '../lib/pdfjs';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, canvasToBlob, nextFrame, stripExt } from '../lib/format';
import { L } from '../lib/i18n';

const TX = {
  zh: {
    title: 'PDF 压缩',
    desc: '通过重新编码页面图像为 PDF 瘦身，扫描件、图片型 PDF 效果最佳。',
    dzTitle: '拖入一个 PDF，或点击选择',
    dzHint: '仅支持 PDF · 文件不会上传',
    loaded: (name: string, size: string) => `已载入「${name}」（${size}）`,
    strengthLabel: '压缩强度',
    presetLow: '轻度',
    presetMedium: '推荐',
    presetHigh: '强力',
    strengthHint: '强力体积最小、清晰度略降',
    notice:
      '压缩会把每一页转成图片重新编码，原本可选中、可搜索的文字将变为图片。如需保留文字图层，请改用其它工具或保留原文件。',
    btn: '开始压缩',
    compressing: '正在压缩…',
    done: (pct: number) => `压缩完成，体积减少 ${pct}%`,
    resultTitle: (from: string, to: string) => `${from} → ${to}`,
    resultDetail: (pct: number, n: number) => `减少 ${pct}% · 共 ${n} 页`,
    alreadySmall: '该 PDF 已较为精简，压缩后体积未减小',
    alreadySmallTitle: (size: string) => `原文件 ${size} 已很精简`,
    alreadySmallDetail: (size: string) => `压缩后约 ${size}，建议保留原文件`,
    downloadAnyway: '仍要下载',
    fail: '压缩失败，文件可能已加密或损坏',
  },
  en: {
    title: 'Compress PDF',
    desc: 'Shrink a PDF by re-encoding its page images — works best for scans and image-based PDFs.',
    dzTitle: 'Drop a PDF, or click to choose',
    dzHint: 'PDF only · never uploaded',
    loaded: (name: string, size: string) => `Loaded "${name}" (${size})`,
    strengthLabel: 'Compression level',
    presetLow: 'Light',
    presetMedium: 'Recommended',
    presetHigh: 'Strong',
    strengthHint: 'Strong gives the smallest size with slightly lower quality',
    notice:
      'Compression re-encodes every page as an image, so selectable, searchable text becomes a picture. To keep the text layer, use another tool or keep the original file.',
    btn: 'Compress',
    compressing: 'Compressing…',
    done: (pct: number) => `Done — size reduced by ${pct}%`,
    resultTitle: (from: string, to: string) => `${from} → ${to}`,
    resultDetail: (pct: number, n: number) => `${pct}% smaller · ${n} pages`,
    alreadySmall: 'This PDF is already lean — compression did not reduce its size',
    alreadySmallTitle: (size: string) => `Original ${size} is already lean`,
    alreadySmallDetail: (size: string) => `Compressed to about ${size} — keeping the original is recommended`,
    downloadAnyway: 'Download anyway',
    fail: 'Compression failed — the file may be encrypted or corrupted',
  },
}[L];

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

const PRESETS: Record<string, { scale: number; q: number }> = {
  low: { scale: 2.0, q: 0.82 },
  medium: { scale: 1.5, q: 0.65 },
  high: { scale: 1.0, q: 0.5 },
};

export function mountCompress(container: HTMLElement): void {
  const panel = createPanel(TX.title, TX.desc);

  let file: File | null = null;
  let base = 'document';
  let preset = 'medium';

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
      btn.disabled = false;
      panel.setStatus(TX.loaded(file.name, formatBytes(file.size)), 'ok');
    },
  });

  const opts = document.createElement('div');
  opts.innerHTML = `
    <div class="options">
      <div class="field">
        <label>${TX.strengthLabel}</label>
        <div class="segmented" id="preset">
          <button type="button" data-p="low" aria-pressed="false">${TX.presetLow}</button>
          <button type="button" data-p="medium" aria-pressed="true">${TX.presetMedium}</button>
          <button type="button" data-p="high" aria-pressed="false">${TX.presetHigh}</button>
        </div>
        <span class="hint">${TX.strengthHint}</span>
      </div>
    </div>
    <p class="notice">${TX.notice}</p>
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
  btn.innerHTML = `${icons.compress}${TX.btn}`;
  panel.actions.appendChild(btn);

  btn.addEventListener('click', async () => {
    if (!file) return;
    btn.disabled = true;
    panel.clearResult();
    const { scale, q } = PRESETS[preset];
    const origSize = file.size;
    panel.setStatus(TX.compressing);
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
        panel.setStatus(TX.done(pct), 'ok');
        panel.showResult({
          title: TX.resultTitle(formatBytes(origSize), formatBytes(blob.size)),
          detail: TX.resultDetail(pct, n),
          onDownload: () => downloadBlob(blob, `${base}_compressed.pdf`),
        });
      } else {
        panel.setStatus(TX.alreadySmall, 'err');
        panel.showResult({
          title: TX.alreadySmallTitle(formatBytes(origSize)),
          detail: TX.alreadySmallDetail(formatBytes(blob.size)),
          onDownload: () => downloadBlob(blob, `${base}_compressed.pdf`),
          btnLabel: TX.downloadAnyway,
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
