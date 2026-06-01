import { PDFDocument } from 'pdf-lib';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, canvasToBlob, nextFrame, stripExt } from '../lib/format';
import { L } from '../lib/i18n';

const TX = {
  zh: {
    title: 'PDF 加水印',
    desc: '给每一页加上文字水印，支持中文，可调透明度与版式。全部本地完成。',
    dzTitle: '拖入一个 PDF，或点击选择',
    dzHint: '仅支持 PDF · 文件不会上传',
    loaded: (name: string) => `已载入「${name}」`,
    labelText: '水印文字',
    defaultText: '样本 · 请勿外传',
    labelColor: '颜色',
    colorGray: '灰',
    colorRed: '红',
    colorBlue: '蓝',
    labelLayout: '版式',
    layoutTile: '平铺',
    layoutCenter: '居中',
    labelOpacity: '透明度',
    btn: '添加水印',
    needText: '请填写水印文字',
    working: '正在添加水印…',
    canvasErr: '无法创建画布',
    loadErr: '无法读取：该 PDF 可能已加密或文件已损坏',
    done: '水印添加完成',
    result: (n: number) => `已为 ${n} 页添加水印`,
    fail: '添加失败',
  },
  en: {
    title: 'Watermark PDF',
    desc: 'Stamp a text watermark on every page (Unicode supported), with adjustable opacity and layout. All done locally.',
    dzTitle: 'Drop a PDF, or click to choose',
    dzHint: 'PDF only · never uploaded',
    loaded: (name: string) => `Loaded "${name}"`,
    labelText: 'Watermark text',
    defaultText: 'SAMPLE · CONFIDENTIAL',
    labelColor: 'Color',
    colorGray: 'Gray',
    colorRed: 'Red',
    colorBlue: 'Blue',
    labelLayout: 'Layout',
    layoutTile: 'Tile',
    layoutCenter: 'Center',
    labelOpacity: 'Opacity',
    btn: 'Add watermark',
    needText: 'Enter the watermark text',
    working: 'Adding watermark…',
    canvasErr: 'Failed to create canvas',
    loadErr: "Can't read: this PDF may be encrypted or corrupted",
    done: 'Watermark added',
    result: (n: number) => `Watermarked ${n} page(s)`,
    fail: 'Failed to add watermark',
  },
}[L];

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

const COLORS: Record<string, string> = {
  gray: '#8A867A',
  red: '#C0402E',
  blue: '#2C5C8F',
};

/** 用 canvas 渲染斜向水印文字（支持中文），返回 PNG bytes 与像素尺寸 */
async function makeStamp(text: string, color: string): Promise<{ bytes: ArrayBuffer; w: number; h: number }> {
  const fontPx = 60;
  const angle = (-30 * Math.PI) / 180;
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error(TX.canvasErr);
  measure.font = `bold ${fontPx}px sans-serif`;
  const textW = Math.max(1, measure.measureText(text).width);
  const pad = 30;
  const boxW = textW + pad * 2;
  const boxH = fontPx + pad * 2;
  // 旋转后的外接矩形
  const w = Math.ceil(Math.abs(boxW * Math.cos(angle)) + Math.abs(boxH * Math.sin(angle)));
  const h = Math.ceil(Math.abs(boxW * Math.sin(angle)) + Math.abs(boxH * Math.cos(angle)));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  if (!x) throw new Error(TX.canvasErr);
  x.translate(w / 2, h / 2);
  x.rotate(angle);
  x.font = `bold ${fontPx}px sans-serif`;
  x.fillStyle = color;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 0, 0);
  const blob = await canvasToBlob(c, 'image/png');
  return { bytes: await blob.arrayBuffer(), w, h };
}

export function mountWatermark(container: HTMLElement): void {
  const panel = createPanel(TX.title, TX.desc);

  let file: File | null = null;
  let base = 'document';
  let color = 'gray';
  let layout: 'tile' | 'center' = 'tile';

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
      panel.setStatus(TX.loaded(file.name), 'ok');
    },
  });

  const opts = document.createElement('div');
  opts.innerHTML = `
    <div class="options">
      <div class="field" style="flex:1 1 240px">
        <label>${TX.labelText}</label>
        <input type="text" id="wtext" value="${TX.defaultText}" maxlength="40" />
      </div>
      <div class="field">
        <label>${TX.labelColor}</label>
        <div class="segmented" id="color">
          <button type="button" data-c="gray" aria-pressed="true">${TX.colorGray}</button>
          <button type="button" data-c="red" aria-pressed="false">${TX.colorRed}</button>
          <button type="button" data-c="blue" aria-pressed="false">${TX.colorBlue}</button>
        </div>
      </div>
      <div class="field">
        <label>${TX.labelLayout}</label>
        <div class="segmented" id="layout">
          <button type="button" data-l="tile" aria-pressed="true">${TX.layoutTile}</button>
          <button type="button" data-l="center" aria-pressed="false">${TX.layoutCenter}</button>
        </div>
      </div>
      <div class="field">
        <label>${TX.labelOpacity}</label>
        <div class="range-row">
          <input type="range" id="opacity" min="5" max="60" value="18" />
          <span class="val mono" id="opacityVal">18%</span>
        </div>
      </div>
    </div>
  `;
  panel.body.append(dz, opts);

  opts.querySelectorAll('#color button').forEach((b) =>
    b.addEventListener('click', () => {
      color = (b as HTMLElement).dataset.c as string;
      opts.querySelectorAll('#color button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    }),
  );
  opts.querySelectorAll('#layout button').forEach((b) =>
    b.addEventListener('click', () => {
      layout = (b as HTMLElement).dataset.l as 'tile' | 'center';
      opts.querySelectorAll('#layout button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    }),
  );
  const opacityInput = opts.querySelector('#opacity') as HTMLInputElement;
  const opacityVal = opts.querySelector('#opacityVal') as HTMLElement;
  opacityInput.addEventListener('input', () => (opacityVal.textContent = `${opacityInput.value}%`));

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.disabled = true;
  btn.innerHTML = `${icons.watermark}${TX.btn}`;
  panel.actions.appendChild(btn);

  btn.addEventListener('click', async () => {
    if (!file) return;
    const text = (opts.querySelector('#wtext') as HTMLInputElement).value.trim();
    if (!text) {
      panel.setStatus(TX.needText, 'err');
      return;
    }
    btn.disabled = true;
    panel.clearResult();
    panel.setStatus(TX.working);
    panel.setProgress(0);
    try {
      const opacity = parseInt(opacityInput.value, 10) / 100;
      const stamp = await makeStamp(text, COLORS[color]);
      const bytes = await file.arrayBuffer();
      let pdf: PDFDocument;
      try {
        pdf = await PDFDocument.load(bytes);
      } catch {
        throw new Error(TX.loadErr);
      }
      const wmImg = await pdf.embedPng(stamp.bytes);
      const pages = pdf.getPages();
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width: pw, height: ph } = page.getSize();
        if (layout === 'center') {
          const target = pw * 0.6;
          const scale = target / stamp.w;
          const w = stamp.w * scale;
          const h = stamp.h * scale;
          page.drawImage(wmImg, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h, opacity });
        } else {
          const scale = (pw * 0.32) / stamp.w;
          const w = stamp.w * scale;
          const h = stamp.h * scale;
          const stepX = w * 1.15;
          const stepY = h * 2.2;
          for (let y = -h; y < ph + h; y += stepY) {
            for (let xx = -w; xx < pw + w; xx += stepX) {
              page.drawImage(wmImg, { x: xx, y, width: w, height: h, opacity });
            }
          }
        }
        panel.setProgress((i + 1) / pages.length);
        await nextFrame();
      }
      const data = await pdf.save();
      const blob = new Blob([data as BlobPart], { type: 'application/pdf' });
      panel.setProgress(null);
      panel.setStatus(TX.done, 'ok');
      panel.showResult({
        title: TX.result(pages.length),
        detail: formatBytes(blob.size),
        onDownload: () => downloadBlob(blob, `${base}_watermarked.pdf`),
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
