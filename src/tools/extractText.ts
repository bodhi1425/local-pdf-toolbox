import { createPanel } from '../ui/panel';
import { createDropzone } from '../ui/dropzone';
import { openWithPdfJs } from '../lib/pdfjs';
import { icons } from '../lib/icons';
import { downloadBlob, nextFrame, stripExt } from '../lib/format';
import { L } from '../lib/i18n';

const TX = {
  zh: {
    title: '提取文字',
    desc: '从 PDF 提取可选中的文字，导出 TXT 或一键复制。全部本地完成。',
    dzTitle: '拖入一个 PDF，或点击选择',
    dzHint: '仅支持 PDF · 文件不会上传',
    notice: '若是扫描件（图片型 PDF）将提取不到文字——那类需要 OCR 识别。',
    placeholder: '提取的文字会显示在这里',
    copyAll: '复制全部',
    copied: '已复制',
    btn: '提取文字',
    loaded: (name: string) => `已载入「${name}」`,
    extracting: '正在提取…',
    pageMark: (i: number) => `【第 ${i} 页】`,
    pageMarkRe: /【第 \d+ 页】/g,
    noText: '未提取到文字——该 PDF 可能是扫描件，需要 OCR',
    done: (chars: number) => `提取完成，约 ${chars} 个字符`,
    resultTitle: (n: number) => `已提取 ${n} 页文字`,
    resultDetail: (chars: number) => `约 ${chars} 个字符`,
    download: '下载 TXT',
    fail: '提取失败，文件可能已加密或损坏',
  },
  en: {
    title: 'Extract text',
    desc: 'Extract selectable text from a PDF and export to TXT or copy in one click. All done locally.',
    dzTitle: 'Drop a PDF, or click to choose',
    dzHint: 'PDF only · never uploaded',
    notice: "Scanned (image-based) PDFs have no selectable text — those need OCR.",
    placeholder: 'Extracted text will appear here',
    copyAll: 'Copy all',
    copied: 'Copied',
    btn: 'Extract text',
    loaded: (name: string) => `Loaded "${name}"`,
    extracting: 'Extracting…',
    pageMark: (i: number) => `[Page ${i}]`,
    pageMarkRe: /\[Page \d+\]/g,
    noText: 'No text found — this PDF may be scanned and needs OCR',
    done: (chars: number) => `Done — about ${chars} characters`,
    resultTitle: (n: number) => `Extracted text from ${n} page(s)`,
    resultDetail: (chars: number) => `About ${chars} characters`,
    download: 'Download TXT',
    fail: 'Extraction failed — the file may be encrypted or corrupted',
  },
}[L];

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

export function mountExtractText(container: HTMLElement): void {
  const panel = createPanel(TX.title, TX.desc);

  let file: File | null = null;
  let base = 'document';

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
      outWrap.style.display = 'none';
      btn.disabled = false;
      panel.setStatus(TX.loaded(file.name), 'ok');
    },
  });

  const notice = document.createElement('p');
  notice.className = 'notice';
  notice.textContent = TX.notice;

  const outWrap = document.createElement('div');
  outWrap.style.display = 'none';
  outWrap.innerHTML = `
    <textarea class="text-out mono" readonly placeholder="${TX.placeholder}"></textarea>
    <div class="text-toolbar"><button type="button" class="btn btn-ghost copy">${icons.copy}${TX.copyAll}</button></div>
  `;
  const textarea = outWrap.querySelector('textarea') as HTMLTextAreaElement;
  const copyBtn = outWrap.querySelector('.copy') as HTMLButtonElement;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      copyBtn.innerHTML = `${icons.check}${TX.copied}`;
      setTimeout(() => (copyBtn.innerHTML = `${icons.copy}${TX.copyAll}`), 1600);
    } catch {
      textarea.select();
      document.execCommand('copy');
    }
  });

  panel.body.append(dz, notice, outWrap);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.disabled = true;
  btn.innerHTML = `${icons.text}${TX.btn}`;
  panel.actions.appendChild(btn);

  btn.addEventListener('click', async () => {
    if (!file) return;
    btn.disabled = true;
    panel.clearResult();
    panel.setStatus(TX.extracting);
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
        parts.push(`${TX.pageMark(i)}\n${pageText.trim()}`);
        panel.setProgress(i / n);
        await nextFrame();
      }
      const text = parts.join('\n\n');
      panel.setProgress(null);
      outWrap.style.display = 'block';
      textarea.value = text;
      const chars = text.replace(TX.pageMarkRe, '').replace(/\s/g, '').length;
      if (chars === 0) {
        panel.setStatus(TX.noText, 'err');
        return;
      }
      panel.setStatus(TX.done(chars), 'ok');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      panel.showResult({
        title: TX.resultTitle(n),
        detail: TX.resultDetail(chars),
        onDownload: () => downloadBlob(blob, `${base}.txt`),
        btnLabel: TX.download,
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
