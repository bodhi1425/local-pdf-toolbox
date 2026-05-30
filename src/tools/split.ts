import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, nextFrame, stripExt } from '../lib/format';

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

function parseRanges(input: string, max: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const raw of input.split(/[,，\s]+/)) {
    const part = raw.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)(?:[-－~](\d+))?$/);
    if (!m) throw new Error(`无法识别的页码：「${part}」`);
    let a = parseInt(m[1], 10);
    let b = m[2] ? parseInt(m[2], 10) : a;
    if (a < 1 || b < 1 || a > max || b > max) throw new Error(`页码超出范围（共 ${max} 页）：「${part}」`);
    if (a > b) [a, b] = [b, a];
    for (let p = a; p <= b; p++) {
      if (!seen.has(p)) {
        seen.add(p);
        out.push(p - 1);
      }
    }
  }
  if (!out.length) throw new Error('请填写要提取的页码');
  return out;
}

export function mountSplit(container: HTMLElement): void {
  const panel = createPanel('PDF 拆分 / 提取页面', '提取指定页码生成新 PDF，或把每一页拆成单独文件。');

  let srcBytes: ArrayBuffer | null = null;
  let pageCount = 0;
  let base = 'document';

  const dz = createDropzone({
    accept: 'application/pdf',
    multiple: false,
    title: '拖入一个 PDF，或点击选择',
    hint: '仅支持 PDF · 文件不会上传',
    filter: isPdf,
    onFiles: async (fs) => {
      const f = fs[0];
      base = stripExt(f.name);
      panel.clearResult();
      panel.setStatus('正在读取…');
      try {
        const bytes = await f.arrayBuffer();
        const d = await PDFDocument.load(bytes);
        pageCount = d.getPageCount();
        srcBytes = bytes;
        showOptions();
        panel.setStatus(`已载入「${f.name}」，共 ${pageCount} 页`, 'ok');
      } catch {
        srcBytes = null;
        opts.innerHTML = '';
        btn.disabled = true;
        panel.setStatus('无法读取：该 PDF 可能已加密或文件已损坏', 'err');
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
    btn.innerHTML = `${icons.split}${mode === 'extract' ? '提取页面' : '拆成单页并打包'}`;
  }
  setBtnLabel(); // 初始就显示文字(禁用态也要看得见,不能是空按钮)

  function showOptions() {
    opts.innerHTML = `
      <div class="options">
        <div class="field">
          <label>拆分方式</label>
          <div class="segmented" id="mode">
            <button type="button" data-m="extract" aria-pressed="true">提取指定页面</button>
            <button type="button" data-m="each" aria-pressed="false">每页拆成单独文件</button>
          </div>
        </div>
        <div class="field" id="rangeField">
          <label>页码范围（共 ${pageCount} 页）</label>
          <input type="text" id="range" value="1-${pageCount}" placeholder="例如 1-3,5,8-10" />
          <span class="hint">逗号分隔、连字符表示区间</span>
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
        panel.setStatus('正在提取…');
        const d = await PDFDocument.create();
        const pages = await d.copyPages(src, indices);
        pages.forEach((p) => d.addPage(p));
        const data = await d.save();
        const blob = new Blob([data as BlobPart], { type: 'application/pdf' });
        panel.setStatus('提取完成', 'ok');
        panel.showResult({
          title: `已提取 ${indices.length} 页`,
          detail: formatBytes(blob.size),
          onDownload: () => downloadBlob(blob, `${base}_提取${indices.length}页.pdf`),
        });
      } else {
        panel.setStatus('正在拆分…');
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
        panel.setStatus('拆分完成', 'ok');
        panel.showResult({
          title: `已拆成 ${pageCount} 个单页 PDF`,
          detail: `打包为 ZIP · ${formatBytes(blob.size)}`,
          onDownload: () => downloadBlob(blob, `${base}_单页拆分.zip`),
          btnLabel: '下载 ZIP',
        });
      }
    } catch (e) {
      panel.setProgress(null);
      panel.setStatus((e as Error).message || '处理失败', 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
