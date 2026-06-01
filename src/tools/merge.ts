import { PDFDocument } from 'pdf-lib';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { createFileList } from '../ui/filelist';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, nextFrame } from '../lib/format';
import { T } from '../lib/i18n';

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

export function mountMerge(container: HTMLElement): void {
  const M = T.merge;
  const panel = createPanel(M.title, M.desc);
  const list = createFileList({ reorder: true, onChange: update });

  const dz = createDropzone({
    accept: 'application/pdf',
    multiple: true,
    title: M.dzTitle,
    hint: M.dzHint,
    filter: isPdf,
    onFiles: (fs) => {
      list.add(fs);
      panel.clearResult();
    },
  });
  panel.body.append(dz, list.el);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.innerHTML = `${icons.merge}${M.btn}`;
  panel.actions.appendChild(btn);

  function update() {
    btn.disabled = list.count() < 2;
    panel.setStatus(list.count() < 2 ? M.need2 : M.pending(list.count()));
  }
  update();

  btn.addEventListener('click', async () => {
    const files = list.getFiles();
    if (files.length < 2) return;
    btn.disabled = true;
    panel.clearResult();
    panel.setStatus(M.merging);
    panel.setProgress(0);
    try {
      const out = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].arrayBuffer();
        let src: PDFDocument;
        try {
          src = await PDFDocument.load(bytes);
        } catch {
          throw new Error(M.loadErr(files[i].name));
        }
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        panel.setProgress((i + 1) / files.length);
        await nextFrame();
      }
      const data = await out.save();
      const blob = new Blob([data as BlobPart], { type: 'application/pdf' });
      panel.setProgress(null);
      panel.setStatus(M.done, 'ok');
      panel.showResult({
        title: M.result(files.length, out.getPageCount()),
        detail: formatBytes(blob.size),
        onDownload: () => downloadBlob(blob, 'merged.pdf'),
      });
    } catch (e) {
      panel.setProgress(null);
      panel.setStatus((e as Error).message || M.fail, 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
