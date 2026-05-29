import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { openWithPdfJs } from '../lib/pdfjs';
import { icons } from '../lib/icons';
import { downloadBlob, nextFrame, stripExt } from '../lib/format';

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

export function mountExtractText(container: HTMLElement): void {
  const panel = createPanel('提取文字', '从 PDF 提取可选中的文字，导出 TXT 或一键复制。全部本地完成。');

  let file: File | null = null;
  let base = 'document';

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
      outWrap.style.display = 'none';
      btn.disabled = false;
      panel.setStatus(`已载入「${file.name}」`, 'ok');
    },
  });

  const notice = document.createElement('p');
  notice.className = 'notice';
  notice.textContent = '若是扫描件（图片型 PDF）将提取不到文字——那类需要 OCR 识别。';

  const outWrap = document.createElement('div');
  outWrap.style.display = 'none';
  outWrap.innerHTML = `
    <textarea class="text-out mono" readonly placeholder="提取的文字会显示在这里"></textarea>
    <div class="text-toolbar"><button type="button" class="btn btn-ghost copy">${icons.copy}复制全部</button></div>
  `;
  const textarea = outWrap.querySelector('textarea') as HTMLTextAreaElement;
  const copyBtn = outWrap.querySelector('.copy') as HTMLButtonElement;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      copyBtn.innerHTML = `${icons.check}已复制`;
      setTimeout(() => (copyBtn.innerHTML = `${icons.copy}复制全部`), 1600);
    } catch {
      textarea.select();
      document.execCommand('copy');
    }
  });

  panel.body.append(dz, notice, outWrap);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.disabled = true;
  btn.innerHTML = `${icons.text}提取文字`;
  panel.actions.appendChild(btn);

  btn.addEventListener('click', async () => {
    if (!file) return;
    btn.disabled = true;
    panel.clearResult();
    panel.setStatus('正在提取…');
    panel.setProgress(0);
    try {
      const buf = await file.arrayBuffer();
      const doc = await openWithPdfJs(buf);
      const n = doc.numPages;
      const parts: string[] = [];
      for (let i = 1; i <= n; i++) {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        let pageText = '';
        for (const it of tc.items) {
          if ('str' in it) {
            pageText += it.str;
            if (it.hasEOL) pageText += '\n';
          }
        }
        parts.push(`【第 ${i} 页】\n${pageText.trim()}`);
        panel.setProgress(i / n);
        await nextFrame();
      }
      const text = parts.join('\n\n');
      panel.setProgress(null);
      outWrap.style.display = 'block';
      textarea.value = text;
      const chars = text.replace(/【第 \d+ 页】/g, '').replace(/\s/g, '').length;
      if (chars === 0) {
        panel.setStatus('未提取到文字——该 PDF 可能是扫描件，需要 OCR', 'err');
        return;
      }
      panel.setStatus(`提取完成，约 ${chars} 个字符`, 'ok');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      panel.showResult({
        title: `已提取 ${n} 页文字`,
        detail: `约 ${chars} 个字符`,
        onDownload: () => downloadBlob(blob, `${base}.txt`),
        btnLabel: '下载 TXT',
      });
    } catch (e) {
      panel.setProgress(null);
      panel.setStatus((e as Error).message || '提取失败，文件可能已加密或损坏', 'err');
    } finally {
      btn.disabled = false;
    }
  });

  container.appendChild(panel.root);
}
