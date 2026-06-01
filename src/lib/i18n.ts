// pdf 工具前端 UI 文案 i18n —— 按页面 html lang 切(中文页 / + 英文页 /en/)。
export const L: 'zh' | 'en' =
  (document.documentElement.lang || 'zh').toLowerCase().startsWith('en') ? 'en' : 'zh';

const DICT = {
  zh: {
    // 通用 UI
    up: '上移', down: '下移', remove: '移除', downloadResult: '下载结果',
    // merge
    merge: {
      title: 'PDF 合并', desc: '把多个 PDF 按顺序合并为一个文件，可上下调整顺序。',
      dzTitle: '拖入多个 PDF，或点击选择', dzHint: '仅支持 PDF · 文件不会上传',
      btn: '合并 PDF', need2: '至少需要 2 个 PDF 文件',
      pending: (n: number) => `${n} 个文件待合并`,
      merging: '正在合并…', done: '合并完成', fail: '合并失败',
      result: (n: number, p: number) => `已合并 ${n} 个文件，共 ${p} 页`,
      loadErr: (name: string) => `无法读取「${name}」：可能已加密或文件已损坏`,
    },
  },
  en: {
    up: 'Move up', down: 'Move down', remove: 'Remove', downloadResult: 'Download',
    merge: {
      title: 'Merge PDF', desc: 'Combine multiple PDFs into one in the order you set — drag to reorder.',
      dzTitle: 'Drop multiple PDFs, or click to choose', dzHint: 'PDF only · never uploaded',
      btn: 'Merge PDF', need2: 'Need at least 2 PDF files',
      pending: (n: number) => `${n} file(s) ready to merge`,
      merging: 'Merging…', done: 'Merged', fail: 'Merge failed',
      result: (n: number, p: number) => `Merged ${n} files, ${p} pages total`,
      loadErr: (name: string) => `Can't read "${name}": it may be encrypted or corrupted`,
    },
  },
};

export const T = DICT[L];
