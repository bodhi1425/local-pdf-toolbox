import { PDFDocument } from 'pdf-lib';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { createFileList } from '../ui/filelist';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, nextFrame } from '../lib/format';

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

export function mountMerge(container: HTMLElement): void {
  const panel = createPanel('PDF 合并', '把多个 PDF 按顺序合并为一个文件，可上下调整顺序。');
  const list = createFileList({ reorder: true, onChange: update });

  const dz = createDropzone({
    accept: 'application/pdf',
    multiple: true,
    title: '拖入多个 PDF，或点击选择',
    hint: '仅支持 PDF · 文件不会上传',
    filter: isPdf,
    onFiles: (fs) => {
      list.add(fs);
      panel.clearResult();
    },
  });
  panel.body.append(dz, list.el);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.innerHTML = `${icons.merge}合并 PDF`;
  panel.actions.appendChild(btn);

  function update() {
    btn.disabled = list.count() < 2;
    panel.setStatus(list.count() < 2 ? '至少需要 2 个 PDF 文件' : `${list.count()} 个文件待合并`);
  }
  update();

  btn.addEventListener('click', async () => {
    const files = list.getFiles();
    if (files.length < 2) return;
    btn.disabled = true;
    panel.clearResult();
    panel.setStatus('正在合并…');
    panel.setProgress(0);
    try {
      const out = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].arrayBuffer();
        let src: PDFDocument;
        try {
          src = await PDFDocument.load(bytes);
        } catch {
          throw new Error(`无法读取「${files[i].name}」：可能已加密或文件已损坏`);
        }
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        panel.setProgress((i + 1) / files.length);
        await nextFrame();
      }
      const data = await out.save();
      const blob = new Blob([data as BlobPart], { type: 'application/pdf' });
      panel.setProgress(null);
      panel.setStatus('合并完成', 'ok');
      panel.showResult({
        title: `已合并 ${files.length} 个文件，共 ${out.getPageCount()} 页`,
        detail: formatBytes(blob.size),
        onDownload: () => downloadBlob(blob, 'merged.pdf'),
      });
    } catch (e) {
      panel.setProgress(null);
      panel.setStatus((e as Error).message || '合并失败', 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
