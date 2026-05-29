import { PDFDocument, degrees } from 'pdf-lib';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { openWithPdfJs, renderPageToCanvas } from '../lib/pdfjs';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, nextFrame, stripExt } from '../lib/format';

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

interface PageState {
  rotation: number;
  deleted: boolean;
}

export function mountOrganize(container: HTMLElement): void {
  const panel = createPanel('页面整理', '旋转或删除页面，缩略图所见即所得，导出为新的 PDF。');

  let file: File | null = null;
  let base = 'document';
  let states: PageState[] = [];

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
      void loadThumbs();
    },
  });

  const grid = document.createElement('div');
  grid.className = 'page-grid';
  panel.body.append(dz, grid);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.disabled = true;
  btn.innerHTML = `${icons.pages}导出 PDF`;
  panel.actions.appendChild(btn);

  const refreshCount = () => {
    const kept = states.filter((s) => !s.deleted).length;
    panel.setStatus(`保留 ${kept} / ${states.length} 页`, kept ? 'ok' : 'err');
    btn.disabled = kept === 0;
  };

  async function loadThumbs(): Promise<void> {
    grid.innerHTML = '';
    states = [];
    btn.disabled = true;
    panel.setStatus('正在生成缩略图…');
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
        ops.innerHTML = `<button type="button" class="iconbtn rot" title="旋转 90°">${icons.rotate}</button><button type="button" class="iconbtn danger del" title="删除">${icons.trash}</button>`;
        item.append(frame, ops, badge);
        grid.appendChild(item);

        ops.querySelector('.rot')!.addEventListener('click', () => {
          states[idx].rotation = (states[idx].rotation + 90) % 360;
          canvas.style.transform = `rotate(${states[idx].rotation}deg)`;
        });
        ops.querySelector('.del')!.addEventListener('click', () => {
          states[idx].deleted = !states[idx].deleted;
          item.classList.toggle('deleted', states[idx].deleted);
          (ops.querySelector('.del') as HTMLElement).title = states[idx].deleted ? '恢复' : '删除';
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
      panel.setStatus('无法读取：该 PDF 可能已加密或文件已损坏', 'err');
    }
  }

  btn.addEventListener('click', async () => {
    if (!file) return;
    const kept = states.map((s, i) => ({ s, i })).filter((o) => !o.s.deleted);
    if (!kept.length) return;
    btn.disabled = true;
    panel.clearResult();
    panel.setStatus('正在导出…');
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
      panel.setStatus('导出完成', 'ok');
      panel.showResult({
        title: `已导出 ${kept.length} 页`,
        detail: `${states.length - kept.length} 页删除 · ${rotated} 页旋转 · ${formatBytes(blob.size)}`,
        onDownload: () => downloadBlob(blob, `${base}_organized.pdf`),
      });
    } catch (e) {
      panel.setStatus((e as Error).message || '导出失败', 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
