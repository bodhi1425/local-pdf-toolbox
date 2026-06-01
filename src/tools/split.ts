import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, nextFrame, stripExt } from '../lib/format';
import { L } from '../lib/i18n';

const TX = {
  zh: {
    title: 'PDF 拆分 / 提取页面',
    desc: '提取指定页码生成新 PDF，或把每一页拆成单独文件。',
    dzTitle: '拖入一个 PDF，或点击选择',
    dzHint: '仅支持 PDF · 文件不会上传',
    reading: '正在读取…',
    loaded: (name: string, n: number) => `已载入「${name}」，共 ${n} 页`,
    readErr: '无法读取：该 PDF 可能已加密或文件已损坏',
    btnExtract: '提取页面',
    btnEach: '拆成单页并打包',
    fieldMode: '拆分方式',
    optExtract: '提取指定页面',
    optEach: '每页拆成单独文件',
    fieldRange: (n: number) => `页码范围（共 ${n} 页）`,
    rangePlaceholder: '例如 1-3,5,8-10',
    rangeHint: '逗号分隔、连字符表示区间',
    extracting: '正在提取…',
    extractDone: '提取完成',
    extractResult: (n: number) => `已提取 ${n} 页`,
    splitting: '正在拆分…',
    splitDone: '拆分完成',
    splitResult: (n: number) => `已拆成 ${n} 个单页 PDF`,
    splitDetail: (size: string) => `打包为 ZIP · ${size}`,
    downloadZip: '下载 ZIP',
    fail: '处理失败',
    badPage: (part: string) => `无法识别的页码：「${part}」`,
    pageOutOfRange: (max: number, part: string) => `页码超出范围（共 ${max} 页）：「${part}」`,
    emptyRange: '请填写要提取的页码',
  },
  en: {
    title: 'Split / Extract PDF Pages',
    desc: 'Extract specific pages into a new PDF, or split every page into a separate file.',
    dzTitle: 'Drop a PDF, or click to choose',
    dzHint: 'PDF only · never uploaded',
    reading: 'Reading…',
    loaded: (name: string, n: number) => `Loaded "${name}", ${n} pages`,
    readErr: "Can't read this PDF: it may be encrypted or corrupted",
    btnExtract: 'Extract Pages',
    btnEach: 'Split & Zip',
    fieldMode: 'Split mode',
    optExtract: 'Extract pages',
    optEach: 'One file per page',
    fieldRange: (n: number) => `Page range (${n} pages total)`,
    rangePlaceholder: 'e.g. 1-3,5,8-10',
    rangeHint: 'Comma-separated, hyphen for ranges',
    extracting: 'Extracting…',
    extractDone: 'Extracted',
    extractResult: (n: number) => `Extracted ${n} pages`,
    splitting: 'Splitting…',
    splitDone: 'Split done',
    splitResult: (n: number) => `Split into ${n} single-page PDFs`,
    splitDetail: (size: string) => `Zipped · ${size}`,
    downloadZip: 'Download ZIP',
    fail: 'Processing failed',
    badPage: (part: string) => `Unrecognized page number: "${part}"`,
    pageOutOfRange: (max: number, part: string) => `Page out of range (${max} pages total): "${part}"`,
    emptyRange: 'Enter the pages to extract',
  },
}[L];

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

function parseRanges(input: string, max: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const raw of input.split(/[,，\s]+/)) {
    const part = raw.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)(?:[-－~](\d+))?$/);
    if (!m) throw new Error(TX.badPage(part));
    let a = parseInt(m[1], 10);
    let b = m[2] ? parseInt(m[2], 10) : a;
    if (a < 1 || b < 1 || a > max || b > max) throw new Error(TX.pageOutOfRange(max, part));
    if (a > b) [a, b] = [b, a];
    for (let p = a; p <= b; p++) {
      if (!seen.has(p)) {
        seen.add(p);
        out.push(p - 1);
      }
    }
  }
  if (!out.length) throw new Error(TX.emptyRange);
  return out;
}

export function mountSplit(container: HTMLElement): void {
  const panel = createPanel(TX.title, TX.desc);

  let srcBytes: ArrayBuffer | null = null;
  let pageCount = 0;
  let base = 'document';

  const dz = createDropzone({
    accept: 'application/pdf',
    multiple: false,
    title: TX.dzTitle,
    hint: TX.dzHint,
    filter: isPdf,
    onFiles: async (fs) => {
      const f = fs[0];
      base = stripExt(f.name);
      panel.clearResult();
      panel.setStatus(TX.reading);
      try {
        const bytes = await f.arrayBuffer();
        const d = await PDFDocument.load(bytes);
        pageCount = d.getPageCount();
        srcBytes = bytes;
        showOptions();
        panel.setStatus(TX.loaded(f.name, pageCount), 'ok');
      } catch {
        srcBytes = null;
        opts.innerHTML = '';
        btn.disabled = true;
        panel.setStatus(TX.readErr, 'err');
      }
    },
  });

  const opts = document.createElement('div');
  panel.body.append(dz, opts);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.disabled = true;
  panel.actions.appendChild(btn);

  let mode: 'extract' | 'each' = 'extract';

  function setBtnLabel() {
    btn.innerHTML = `${icons.split}${mode === 'extract' ? TX.btnExtract : TX.btnEach}`;
  }
  setBtnLabel(); // 初始就显示文字(禁用态也要看得见,不能是空按钮)

  function showOptions() {
    opts.innerHTML = `
      <div class="options">
        <div class="field">
          <label>${TX.fieldMode}</label>
          <div class="segmented" id="mode">
            <button type="button" data-m="extract" aria-pressed="true">${TX.optExtract}</button>
            <button type="button" data-m="each" aria-pressed="false">${TX.optEach}</button>
          </div>
        </div>
        <div class="field" id="rangeField">
          <label>${TX.fieldRange(pageCount)}</label>
          <input type="text" id="range" value="1-${pageCount}" placeholder="${TX.rangePlaceholder}" />
          <span class="hint">${TX.rangeHint}</span>
        </div>
      </div>
    `;
    const seg = opts.querySelector('#mode') as HTMLElement;
    const rangeField = opts.querySelector('#rangeField') as HTMLElement;
    seg.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        mode = (b as HTMLElement).dataset.m as 'extract' | 'each';
        seg.querySelectorAll('button').forEach((x) =>
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false'),
        );
        rangeField.style.display = mode === 'extract' ? '' : 'none';
        setBtnLabel();
      }),
    );
    btn.disabled = false;
    setBtnLabel();
  }

  btn.addEventListener('click', async () => {
    if (!srcBytes) return;
    btn.disabled = true;
    panel.clearResult();
    try {
      const src = await PDFDocument.load(srcBytes);
      if (mode === 'extract') {
        const rangeStr = (opts.querySelector('#range') as HTMLInputElement).value;
        const indices = parseRanges(rangeStr, pageCount);
        panel.setStatus(TX.extracting);
        const d = await PDFDocument.create();
        const pages = await d.copyPages(src, indices);
        pages.forEach((p) => d.addPage(p));
        const data = await d.save();
        const blob = new Blob([data as BlobPart], { type: 'application/pdf' });
        panel.setStatus(TX.extractDone, 'ok');
        panel.showResult({
          title: TX.extractResult(indices.length),
          detail: formatBytes(blob.size),
          onDownload: () => downloadBlob(blob, `${base}_提取${indices.length}页.pdf`),
        });
      } else {
        panel.setStatus(TX.splitting);
        panel.setProgress(0);
        const zip = new JSZip();
        const pad = String(pageCount).length;
        for (let i = 0; i < pageCount; i++) {
          const d = await PDFDocument.create();
          const [pg] = await d.copyPages(src, [i]);
          d.addPage(pg);
          const data = await d.save();
          zip.file(`${base}_第${String(i + 1).padStart(pad, '0')}页.pdf`, data);
          panel.setProgress((i + 1) / pageCount);
          await nextFrame();
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        panel.setProgress(null);
        panel.setStatus(TX.splitDone, 'ok');
        panel.showResult({
          title: TX.splitResult(pageCount),
          detail: TX.splitDetail(formatBytes(blob.size)),
          onDownload: () => downloadBlob(blob, `${base}_单页拆分.zip`),
          btnLabel: TX.downloadZip,
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
