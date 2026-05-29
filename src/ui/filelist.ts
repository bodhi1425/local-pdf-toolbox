import { icons } from '../lib/icons';
import { formatBytes } from '../lib/format';

export interface FileListEditor {
  el: HTMLElement;
  add(files: File[]): void;
  getFiles(): File[];
  count(): number;
  clear(): void;
}

export function createFileList(opts: { onChange?: () => void; reorder?: boolean } = {}): FileListEditor {
  const ul = document.createElement('ul');
  ul.className = 'filelist';
  let files: File[] = [];

  const render = () => {
    ul.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.className = 'filerow';
      const reorderBtns = opts.reorder
        ? `<button class="iconbtn up" title="上移" ${i === 0 ? 'disabled' : ''}>${icons.up}</button>
           <button class="iconbtn down" title="下移" ${i === files.length - 1 ? 'disabled' : ''}>${icons.down}</button>`
        : '';
      li.innerHTML = `
        <span class="idx mono">${String(i + 1).padStart(2, '0')}</span>
        <span class="fi">${icons.file}</span>
        <span class="meta">
          <div class="name" title="${f.name}">${f.name}</div>
          <div class="size mono">${formatBytes(f.size)}</div>
        </span>
        <span class="ops">${reorderBtns}<button class="iconbtn danger del" title="移除">${icons.trash}</button></span>
      `;
      li.querySelector('.del')?.addEventListener('click', () => {
        files.splice(i, 1);
        render();
        opts.onChange?.();
      });
      li.querySelector('.up')?.addEventListener('click', () => {
        [files[i - 1], files[i]] = [files[i], files[i - 1]];
        render();
        opts.onChange?.();
      });
      li.querySelector('.down')?.addEventListener('click', () => {
        [files[i + 1], files[i]] = [files[i], files[i + 1]];
        render();
        opts.onChange?.();
      });
      ul.appendChild(li);
    });
  };

  return {
    el: ul,
    add(newFiles) {
      files = files.concat(newFiles);
      render();
      opts.onChange?.();
    },
    getFiles: () => files.slice(),
    count: () => files.length,
    clear() {
      files = [];
      render();
      opts.onChange?.();
    },
  };
}
