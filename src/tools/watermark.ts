import { PDFDocument } from 'pdf-lib';
import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { icons } from '../lib/icons';
import { downloadBlob, formatBytes, canvasToBlob, nextFrame, stripExt } from '../lib/format';

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
  if (!measure) throw new Error('无法创建画布');
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
  if (!x) throw new Error('无法创建画布');
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
  const panel = createPanel('PDF 加水印', '给每一页加上文字水印，支持中文，可调透明度与版式。全部本地完成。');

  let file: File | null = null;
  let base = 'document';
  let color = 'gray';
  let layout: 'tile' | 'center' = 'tile';

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
      btn.disabled = false;
      panel.setStatus(`已载入「${file.name}」`, 'ok');
    },
  });

  const opts = document.createElement('div');
  opts.innerHTML = `
    <div class="options">
      <div class="field" style="flex:1 1 240px">
        <label>水印文字</label>
        <input type="text" id="wtext" value="样本 · 请勿外传" maxlength="40" />
      </div>
      <div class="field">
        <label>颜色</label>
        <div class="segmented" id="color">
          <button type="button" data-c="gray" aria-pressed="true">灰</button>
          <button type="button" data-c="red" aria-pressed="false">红</button>
          <button type="button" data-c="blue" aria-pressed="false">蓝</button>
        </div>
      </div>
      <div class="field">
        <label>版式</label>
        <div class="segmented" id="layout">
          <button type="button" data-l="tile" aria-pressed="true">平铺</button>
          <button type="button" data-l="center" aria-pressed="false">居中</button>
        </div>
      </div>
      <div class="field">
        <label>透明度</label>
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
  btn.innerHTML = `${icons.watermark}添加水印`;
  panel.actions.appendChild(btn);

  btn.addEventListener('click', async () => {
    if (!file) return;
    const text = (opts.querySelector('#wtext') as HTMLInputElement).value.trim();
    if (!text) {
      panel.setStatus('请填写水印文字', 'err');
      return;
    }
    btn.disabled = true;
    panel.clearResult();
    panel.setStatus('正在添加水印…');
    panel.setProgress(0);
    try {
      const opacity = parseInt(opacityInput.value, 10) / 100;
      const stamp = await makeStamp(text, COLORS[color]);
      const bytes = await file.arrayBuffer();
      let pdf: PDFDocument;
      try {
        pdf = await PDFDocument.load(bytes);
      } catch {
        throw new Error('无法读取：该 PDF 可能已加密或文件已损坏');
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
      panel.setStatus('水印添加完成', 'ok');
      panel.showResult({
        title: `已为 ${pages.length} 页添加水印`,
        detail: formatBytes(blob.size),
        onDownload: () => downloadBlob(blob, `${base}_watermarked.pdf`),
      });
    } catch (e) {
      panel.setProgress(null);
      panel.setStatus((e as Error).message || '添加失败', 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
