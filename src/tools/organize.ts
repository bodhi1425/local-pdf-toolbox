import { PDFDocument, degrees } from 'pdf-lib';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { openWithPdfJs, renderPageToCanvas } from '../lib/pdfjs';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, nextFrame, stripExt } from '../lib/format';
import { L } from '../lib/i18n';

const TX = {
  zh: {
    title: '页面整理',
    desc: '旋转或删除页面，缩略图所见即所得，导出为新的 PDF。',
    dzTitle: '拖入一个 PDF，或点击选择',
    dzHint: '仅支持 PDF · 文件不会上传',
    btn: '导出 PDF',
    kept: (kept: number, total: number) => `保留 ${kept} / ${total} 页`,
    thumbing: '正在生成缩略图…',
    rotate: '旋转 90°',
    del: '删除',
    restore: '恢复',
    loadErr: '无法读取：该 PDF 可能已加密或文件已损坏',
    exporting: '正在导出…',
    exportDone: '导出完成',
    resultTitle: (n: number) => `已导出 ${n} 页`,
    resultDetail: (deleted: number, rotated: number, size: string) =>
      `${deleted} 页删除 · ${rotated} 页旋转 · ${size}`,
    exportFail: '导出失败',
  },
  en: {
    title: 'Organize Pages',
    desc: 'Rotate or delete pages with live thumbnails, then export a new PDF.',
    dzTitle: 'Drop a PDF, or click to choose',
    dzHint: 'PDF only · never uploaded',
    btn: 'Export PDF',
    kept: (kept: number, total: number) => `Keeping ${kept} / ${total} pages`,
    thumbing: 'Generating thumbnails…',
    rotate: 'Rotate 90°',
    del: 'Delete',
    restore: 'Restore',
    loadErr: "Can't read this PDF: it may be encrypted or corrupted",
    exporting: 'Exporting…',
    exportDone: 'Exported',
    resultTitle: (n: number) => `Exported ${n} pages`,
    resultDetail: (deleted: number, rotated: number, size: string) =>
      `${deleted} deleted · ${rotated} rotated · ${size}`,
    exportFail: 'Export failed',
  },
}[L];

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

interface PageState {
  rotation: number;
  deleted: boolean;
}

export function mountOrganize(container: HTMLElement): void {
  const panel = createPanel(TX.title, TX.desc);

  let file: File | null = null;
  let base = 'document';
  let states: PageState[] = [];

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
      void loadThumbs();
    },
  });

  const grid = document.createElement('div');
  grid.className = 'page-grid';
  panel.body.append(dz, grid);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.disabled = true;
  btn.innerHTML = `${icons.pages}${TX.btn}`;
  panel.actions.appendChild(btn);

  const refreshCount = () => {
    const kept = states.filter((s) => !s.deleted).length;
    panel.setStatus(TX.kept(kept, states.length), kept ? 'ok' : 'err');
    btn.disabled = kept === 0;
  };

  async function loadThumbs(): Promise<void> {
    grid.innerHTML = '';
    states = [];
    btn.disabled = true;
    panel.setStatus(TX.thumbing);
    panel.setProgress(0);
    try {
      const buf = await file!.arrayBuffer();
      const doc = await openWithPdfJs(buf);
      const n = doc.numPages;
      for (let i = 1; i <= n; i++) {
        states.push({ rotation: 0, deleted: false });
        const idx = i - 1;
        const canvas = await renderPageToCanvas(doc, i, 0.4);
        canvas.className = 'pi-img';

        const item = document.createElement('div');
        item.className = 'page-item';
        const frame = document.createElement('div');
        frame.className = 'pi-frame';
        frame.appendChild(canvas);
        const badge = document.createElement('span');
        badge.className = 'pi-badge mono';
        badge.textContent = String(i);
        const ops = document.createElement('div');
        ops.className = 'pi-ops';
        ops.innerHTML = `<button type="button" class="iconbtn rot" title="${TX.rotate}">${icons.rotate}</button><button type="button" class="iconbtn danger del" title="${TX.del}">${icons.trash}</button>`;
        item.append(frame, ops, badge);
        grid.appendChild(item);

        ops.querySelector('.rot')!.addEventListener('click', () => {
          states[idx].rotation = (states[idx].rotation + 90) % 360;
          canvas.style.transform = `rotate(${states[idx].rotation}deg)`;
        });
        ops.querySelector('.del')!.addEventListener('click', () => {
          states[idx].deleted = !states[idx].deleted;
          item.classList.toggle('deleted', states[idx].deleted);
          (ops.querySelector('.del') as HTMLElement).title = states[idx].deleted ? TX.restore : TX.del;
          refreshCount();
        });

        panel.setProgress(i / n);
        await nextFrame();
      }
      panel.setProgress(null);
      refreshCount();
    } catch {
      panel.setProgress(null);
      grid.innerHTML = '';
      panel.setStatus(TX.loadErr, 'err');
    }
  }

  btn.addEventListener('click', async () => {
    if (!file) return;
    const kept = states.map((s, i) => ({ s, i })).filter((o) => !o.s.deleted);
    if (!kept.length) return;
    btn.disabled = true;
    panel.clearResult();
    panel.setStatus(TX.exporting);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer());
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, kept.map((o) => o.i));
      copied.forEach((pg, k) => {
        const add = kept[k].s.rotation;
        if (add) pg.setRotation(degrees((pg.getRotation().angle + add) % 360));
        out.addPage(pg);
      });
      const data = await out.save();
      const blob = new Blob([data as BlobPart], { type: 'application/pdf' });
      const rotated = kept.filter((o) => o.s.rotation).length;
      panel.setStatus(TX.exportDone, 'ok');
      panel.showResult({
        title: TX.resultTitle(kept.length),
        detail: TX.resultDetail(states.length - kept.length, rotated, formatBytes(blob.size)),
        onDownload: () => downloadBlob(blob, `${base}_organized.pdf`),
      });
    } catch (e) {
      panel.setStatus((e as Error).message || TX.exportFail, 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
