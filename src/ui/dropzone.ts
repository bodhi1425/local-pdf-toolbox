import { icons } from '../lib/icons';

export interface DropzoneOptions {
  accept: string;
  multiple: boolean;
  title: string;
  hint: string;
  /** 额外过滤（在 accept 之外再校验，例如按扩展名/类型） */
  filter?: (file: File) => boolean;
  onFiles: (files: File[]) => void;
}

export function createDropzone(opts: DropzoneOptions): HTMLElement {
  const zone = document.createElement('label');
  zone.className = 'dropzone';
  zone.innerHTML = `
    <span class="dz-icon">${icons.upload}</span>
    <div class="dz-title">${opts.title}</div>
    <div class="dz-hint">${opts.hint}</div>
    <input type="file" accept="${opts.accept}" ${opts.multiple ? 'multiple' : ''} />
  `;
  const input = zone.querySelector('input') as HTMLInputElement;

  const emit = (list: FileList | null) => {
    if (!list) return;
    let files = Array.from(list);
    if (opts.filter) files = files.filter(opts.filter);
    if (files.length) opts.onFiles(files);
    input.value = ''; // 允许重复选择同一文件
  };

  input.addEventListener('change', () => emit(input.files));

  ['dragenter', 'dragover'].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      zone.classList.add('drag');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === 'dragleave' && zone.contains((e as DragEvent).relatedTarget as Node)) return;
      zone.classList.remove('drag');
    }),
  );
  zone.addEventListener('drop', (e) => {
    const dt = (e as DragEvent).dataTransfer;
    if (dt?.files?.length) emit(dt.files);
  });

  return zone;
}
