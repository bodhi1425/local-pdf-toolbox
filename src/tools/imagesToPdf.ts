import { PDFDocument, type PDFImage } from 'pdf-lib';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { createFileList } from '../ui/filelist';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, canvasToBlob, nextFrame } from '../lib/format';

const isImage = (f: File) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name);

const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

async function embedImage(pdf: PDFDocument, file: File): Promise<PDFImage> {
  const type = file.type.toLowerCase();
  const buf = await file.arrayBuffer();
  if (type.includes('png')) return pdf.embedPng(buf);
  if (type.includes('jpeg') || type.includes('jpg')) return pdf.embedJpg(buf);
  // 其他格式（webp/gif/bmp 等）：先解码再转 JPEG
  const bmp = await createImageBitmap(new Blob([buf], { type: file.type || 'image/*' }));
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法解码图片');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0);
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.92);
  return pdf.embedJpg(await jpeg.arrayBuffer());
}

export function mountImagesToPdf(container: HTMLElement): void {
  const panel = createPanel('图片转 PDF', '把多张图片合成一个 PDF，可调整顺序、页面尺寸与边距。');
  const list = createFileList({ reorder: true, onChange: update });

  const dz = createDropzone({
    accept: 'image/*',
    multiple: true,
    title: '拖入图片，或点击选择',
    hint: '支持 PNG / JPG / WebP / GIF / BMP · 文件不会上传',
    filter: isImage,
    onFiles: (fs) => {
      list.add(fs);
      panel.clearResult();
    },
  });

  const opts = document.createElement('div');
  opts.innerHTML = `
    <div class="options">
      <div class="field">
        <label>页面尺寸</label>
        <select id="size">
          <option value="fit" selected>适应图片大小</option>
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
      </div>
      <div class="field" id="orientField">
        <label>方向</label>
        <div class="segmented" id="orient">
          <button type="button" data-o="portrait" aria-pressed="true">纵向</button>
          <button type="button" data-o="landscape" aria-pressed="false">横向</button>
        </div>
      </div>
      <div class="field" id="marginField">
        <label>页边距</label>
        <select id="margin">
          <option value="0">无</option>
          <option value="24" selected>小</option>
          <option value="48">大</option>
        </select>
      </div>
    </div>
  `;
  panel.body.append(dz, list.el, opts);

  let orient: 'portrait' | 'landscape' = 'portrait';
  const sizeSel = opts.querySelector('#size') as HTMLSelectElement;
  const orientField = opts.querySelector('#orientField') as HTMLElement;
  const marginField = opts.querySelector('#marginField') as HTMLElement;
  const syncFixedOnly = () => {
    const dim = sizeSel.value === 'fit';
    orientField.style.opacity = dim ? '.4' : '1';
    marginField.style.opacity = dim ? '.4' : '1';
    orientField.style.pointerEvents = dim ? 'none' : '';
    marginField.style.pointerEvents = dim ? 'none' : '';
  };
  sizeSel.addEventListener('change', syncFixedOnly);
  syncFixedOnly();
  opts.querySelectorAll('#orient button').forEach((b) =>
    b.addEventListener('click', () => {
      orient = (b as HTMLElement).dataset.o as 'portrait' | 'landscape';
      opts.querySelectorAll('#orient button').forEach((x) =>
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false'),
      );
    }),
  );

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.innerHTML = `${icons.toPdf}合成 PDF`;
  panel.actions.appendChild(btn);

  function update() {
    btn.disabled = list.count() < 1;
    panel.setStatus(list.count() < 1 ? '请添加至少一张图片' : `${list.count()} 张图片待合成`);
  }
  update();

  btn.addEventListener('click', async () => {
    const files = list.getFiles();
    if (!files.length) return;
    btn.disabled = true;
    panel.clearResult();
    panel.setStatus('正在合成…');
    panel.setProgress(0);
    try {
      const pdf = await PDFDocument.create();
      const size = sizeSel.value;
      const margin = parseInt((opts.querySelector('#margin') as HTMLSelectElement).value, 10);
      for (let i = 0; i < files.length; i++) {
        const img = await embedImage(pdf, files[i]);
        if (size === 'fit') {
          const page = pdf.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        } else {
          let [pw, ph] = PAGE_SIZES[size];
          if (orient === 'landscape') [pw, ph] = [ph, pw];
          const page = pdf.addPage([pw, ph]);
          const boxW = pw - margin * 2;
          const boxH = ph - margin * 2;
          const scale = Math.min(boxW / img.width, boxH / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
        }
        panel.setProgress((i + 1) / files.length);
        await nextFrame();
      }
      const data = await pdf.save();
      const blob = new Blob([data as BlobPart], { type: 'application/pdf' });
      panel.setProgress(null);
      panel.setStatus('合成完成', 'ok');
      panel.showResult({
        title: `已合成 ${files.length} 页 PDF`,
        detail: formatBytes(blob.size),
        onDownload: () => downloadBlob(blob, 'images.pdf'),
      });
    } catch (e) {
      panel.setProgress(null);
      panel.setStatus((e as Error).message || '合成失败，请检查图片是否损坏', 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
