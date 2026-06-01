export interface Panel {
  root: HTMLElement;
  body: HTMLElement;
  actions: HTMLElement;
  setStatus(msg: string, kind?: 'ok' | 'err' | ''): void;
  setProgress(ratio: number | null): void;
  showResult(opts: { title: string; detail?: string; onDownload: () => void; btnLabel?: string }): void;
  clearResult(): void;
}

import { icons } from '../lib/icons';
import { T } from '../lib/i18n';

export function createPanel(title: string, desc: string): Panel {
  const root = document.createElement('div');
  root.className = 'workspace';
  root.innerHTML = `
    <div class="ws-head">
      <h2>${title}</h2>
      <p>${desc}</p>
    </div>
    <div class="ws-body"></div>
    <div class="ws-actions actions"></div>
    <div class="progress"><i></i></div>
    <div class="statusline" role="status" aria-live="polite"></div>
    <div class="result"></div>
  `;
  const body = root.querySelector('.ws-body') as HTMLElement;
  const actions = root.querySelector('.ws-actions') as HTMLElement;
  const progress = root.querySelector('.progress') as HTMLElement;
  const bar = progress.querySelector('i') as HTMLElement;
  const status = root.querySelector('.statusline') as HTMLElement;
  const result = root.querySelector('.result') as HTMLElement;

  return {
    root,
    body,
    actions,
    setStatus(msg, kind = '') {
      status.textContent = msg;
      status.className = 'statusline' + (kind ? ' ' + kind : '');
    },
    setProgress(ratio) {
      if (ratio === null) {
        progress.classList.remove('show');
        bar.style.width = '0';
        return;
      }
      progress.classList.add('show');
      bar.style.width = `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
    },
    showResult({ title: t, detail, onDownload, btnLabel = T.downloadResult }) {
      result.innerHTML = `
        <span class="r-icon">${icons.check}</span>
        <div class="r-text"><b>${t}</b>${detail ? `<div class="r-detail">${detail}</div>` : ''}</div>
        <button class="btn btn-primary r-dl">${icons.download}${btnLabel}</button>
      `;
      result.classList.add('show');
      (result.querySelector('.r-dl') as HTMLButtonElement).addEventListener('click', onDownload);
    },
    clearResult() {
      result.classList.remove('show');
      result.innerHTML = '';
    },
  };
}
