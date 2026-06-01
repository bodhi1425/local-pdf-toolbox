import { PDFDocument, type PDFImage } from 'pdf-lib';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { createFileList } from '../ui/filelist';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, canvasToBlob, nextFrame } from '../lib/format';
import { L } from '../lib/i18n';

const TX = {
  zh: {
    decodeErr: '无法解码图片',
    title: '图片转 PDF',
    desc: '把多张图片合成一个 PDF，可调整顺序、页面尺寸与边距。',
    dzTitle: '拖入图片，或点击选择',
    dzHint: '支持 PNG / JPG / WebP / GIF / BMP · 文件不会上传',
    sizeLabel: '页面尺寸',
    sizeFit: '适应图片大小',
    orientLabel: '方向',
    portrait: '纵向',
    landscape: '横向',
    marginLabel: '页边距',
    marginNone: '无',
    marginSmall: '小',
    marginLarge: '大',
    btn: '合成 PDF',
    need1: '请添加至少一张图片',
    pending: (n: number) => `${n} 张图片待合成`,
    merging: '正在合成…',
    done: '合成完成',
    result: (n: number) => `已合成 ${n} 页 PDF`,
    fail: '合成失败，请检查图片是否损坏',
  },
  en: {
    decodeErr: "Couldn't decode image",
    title: 'Images to PDF',
    desc: 'Combine multiple images into one PDF — adjust order, page size and margins.',
    dzTitle: 'Drop images, or click to choose',
    dzHint: 'PNG / JPG / WebP / GIF / BMP · never uploaded',
    sizeLabel: 'Page size',
    sizeFit: 'Fit to image',
    orientLabel: 'Orientation',
    portrait: 'Portrait',
    landscape: 'Landscape',
    marginLabel: 'Margin',
    marginNone: 'None',
    marginSmall: 'Small',
    marginLarge: 'Large',
    btn: 'Create PDF',
    need1: 'Add at least one image',
    pending: (n: number) => `${n} image(s) ready`,
    merging: 'Creating…',
    done: 'Done',
    result: (n: number) => `Created a ${n}-page PDF`,
    fail: 'Failed to create — check whether the images are corrupted',
  },
}[L];

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
  if (!ctx) throw new Error(TX.decodeErr);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0);
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.92);
  return pdf.embedJpg(await jpeg.arrayBuffer());
}

export function mountImagesToPdf(container: HTMLElement): void {
  const panel = createPanel(TX.title, TX.desc);
  const list = createFileList({ reorder: true, onChange: update });

  const dz = createDropzone({
    accept: 'image/*',
    multiple: true,
    title: TX.dzTitle,
    hint: TX.dzHint,
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
        <label>${TX.sizeLabel}</label>
        <select id="size">
          <option value="fit" selected>${TX.sizeFit}</option>
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
      </div>
      <div class="field" id="orientField">
        <label>${TX.orientLabel}</label>
        <div class="segmented" id="orient">
          <button type="button" data-o="portrait" aria-pressed="true">${TX.portrait}</button>
          <button type="button" data-o="landscape" aria-pressed="false">${TX.landscape}</button>
        </div>
      </div>
      <div class="field" id="marginField">
        <label>${TX.marginLabel}</label>
        <select id="margin">
          <option value="0">${TX.marginNone}</option>
          <option value="24" selected>${TX.marginSmall}</option>
          <option value="48">${TX.marginLarge}</option>
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
  btn.innerHTML = `${icons.toPdf}${TX.btn}`;
  panel.actions.appendChild(btn);

  function update() {
    btn.disabled = list.count() < 1;
    panel.setStatus(list.count() < 1 ? TX.need1 : TX.pending(list.count()));
  }
  update();

  btn.addEventListener('click', async () => {
    const files = list.getFiles();
    if (!files.length) return;
    btn.disabled = true;
    panel.clearResult();
    panel.setStatus(TX.merging);
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
      panel.setStatus(TX.done, 'ok');
      panel.showResult({
        title: TX.result(files.length),
        detail: formatBytes(blob.size),
        onDownload: () => downloadBlob(blob, 'images.pdf'),
      });
    } catch (e) {
      panel.setProgress(null);
      panel.setStatus((e as Error).message || TX.fail, 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
