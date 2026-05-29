// 站点与各工具 SEO 文案的单一数据源。
// gen-pages.mjs（生成静态页面）与 vite.config.ts（多入口）都从这里读取。
// 注意：这里的 icon 需与 src/lib/icons.ts 中对应工具保持一致。

const svg = (p) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

const ICON = {
  merge: svg('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M11 7h4a2 2 0 0 1 2 2v4"/>'),
  split: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 12h16" stroke-dasharray="2 2"/>'),
  pages: svg('<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>'),
  compress: svg('<path d="M9 9 4 4m0 0v4m0-4h4"/><path d="m15 15 5 5m0 0v-4m0 4h-4"/><path d="M15 9l5-5m0 0v4m0-4h-4"/><path d="M9 15l-5 5m0 0v-4m0 4h4"/>'),
  watermark: svg('<path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3Z"/>'),
  toImg: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  toPdf: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>'),
  text: svg('<path d="M5 5h14M5 10h14M5 15h9"/>'),
};

export const SITE = {
  name: '本地 PDF 工具箱',
  // 部署前改成你的真实域名（无结尾斜杠）
  domain: 'https://pdf.bodhi.tools',
};

// 全站通用 FAQ
export const SHARED_FAQS = [
  {
    q: '我的文件真的不会被上传吗？',
    a: '是的。本工具使用浏览器内置能力在你的设备本地处理文件，全程不向任何服务器发送文件内容。你可以打开浏览器开发者工具的“网络（Network）”面板验证：处理过程中不会出现上传你文件的请求。',
  },
  {
    q: '需要收费或注册吗？有次数限制吗？',
    a: '完全免费，不限处理次数，也不要求注册登录。文件大小仅受设备内存限制，超大文件建议在电脑上处理。',
  },
  {
    q: '处理后的文件会被加水印吗？',
    a: '不会。除“加水印”工具外，所有输出文件均干净无水印，可直接用于正式用途。',
  },
  {
    q: '加密（带密码）的 PDF 能处理吗？',
    a: '受密码保护的 PDF 通常无法直接处理，需要你先用已知密码解除保护后再使用本工具。',
  },
];

export const HOME = {
  title: '免费在线 PDF 工具箱 — 文件不上传、无水印（合并/拆分/压缩/转图片）',
  description:
    '免费的在线 PDF 工具集：合并、拆分、压缩、加水印、PDF 与图片互转、提取文字。所有处理 100% 在浏览器本地完成，文件绝不上传服务器，无水印、不限次数、保护隐私。',
  keywords: 'PDF工具,在线PDF,免费PDF,PDF合并,PDF拆分,PDF压缩,PDF转图片,PDF不上传,本地PDF工具,无水印PDF',
  h1: '处理 PDF，文件不离开你的电脑',
};

export const TOOLS = [
  {
    id: 'merge',
    path: '/merge/',
    name: '合并',
    icon: ICON.merge,
    card: '多个 PDF 合并成一个',
    kicker: 'MERGE PDF',
    h1: 'PDF 合并',
    title: 'PDF 合并 — 免费在线合并多个 PDF，文件不上传、无水印',
    description: '免费在线把多个 PDF 按顺序合并成一个文件。全部在浏览器本地完成，文件不上传服务器，无水印、不限数量、无需注册。',
    keywords: 'PDF合并,合并PDF,在线合并PDF,多个PDF合并成一个,PDF合并不上传,免费PDF合并',
    lead: '把多个 PDF 按你指定的顺序合并成一个文件，可拖拽调整顺序，处理完直接下载。',
    faqs: [
      { q: '合并 PDF 会降低清晰度吗？', a: '不会。合并是按页复制，不重新压缩，不降低任何一页的清晰度。' },
      { q: '一次可以合并几个文件？', a: '没有数量限制，仅受设备内存约束，几十个文件通常没问题。' },
    ],
  },
  {
    id: 'split',
    path: '/split/',
    name: '拆分 / 提取',
    icon: ICON.split,
    card: '提取页面或按页拆分',
    kicker: 'SPLIT PDF',
    h1: 'PDF 拆分 / 提取页面',
    title: 'PDF 拆分 / 提取页面 — 免费在线分割 PDF，文件不上传',
    description: '免费在线提取 PDF 指定页码生成新文件，或把每一页拆成单独 PDF 并打包下载。全部本地完成，文件不上传，无水印。',
    keywords: 'PDF拆分,PDF提取页面,PDF分割,在线拆分PDF,PDF按页拆分,提取PDF某几页',
    lead: '提取指定页码生成新 PDF，或把每一页拆成单独文件并打包为 ZIP。',
    faqs: [
      { q: '怎么只提取其中几页？', a: '在“提取指定页面”里填页码即可，例如 1-3,5,8-10，用逗号分隔、连字符表示区间。' },
      { q: '能把每页拆成单独 PDF 吗？', a: '可以，选“每页拆成单独文件”，会把每一页导出为独立 PDF 并打包成 ZIP。' },
    ],
  },
  {
    id: 'organize',
    path: '/organize/',
    name: '页面整理',
    icon: ICON.pages,
    card: '旋转、删除、调整页面',
    kicker: 'ORGANIZE PDF',
    h1: 'PDF 页面整理',
    title: 'PDF 删除页面 / 旋转页面 — 免费在线整理 PDF，文件不上传',
    description: '免费在线用缩略图直观地旋转、删除 PDF 页面，所见即所得，导出为新的 PDF。全部本地完成，文件不上传，无水印。',
    keywords: 'PDF删除页面,PDF旋转,PDF旋转页面,PDF调整页面顺序,删除PDF某页,PDF页面管理',
    lead: '用缩略图直观地旋转、删除页面，所见即所得，导出为新的 PDF。',
    faqs: [
      { q: '怎么删除 PDF 里的某一页？', a: '上传后在缩略图上点该页的删除按钮（可再次点击恢复），导出时会去掉被删除的页。' },
      { q: '旋转会永久保存到文件吗？', a: '会。导出的新 PDF 带上你设置的旋转角度。' },
    ],
  },
  {
    id: 'compress',
    path: '/compress/',
    name: '压缩',
    icon: ICON.compress,
    card: '给 PDF 瘦身变小',
    kicker: 'COMPRESS PDF',
    h1: 'PDF 压缩',
    title: 'PDF 压缩 — 免费在线给 PDF 瘦身变小，文件不上传',
    description: '免费在线压缩 PDF、减小文件体积，扫描件与图片型 PDF 效果最佳。全部在浏览器本地完成，文件不上传，无水印、不限次数。',
    keywords: 'PDF压缩,压缩PDF,PDF变小,PDF瘦身,在线压缩PDF,PDF文件太大怎么压缩',
    lead: '通过重新编码页面图像为 PDF 瘦身，扫描件、图片型 PDF 效果最好。',
    faqs: [
      { q: '为什么压缩后文字不能选中了？', a: '本工具采用页面栅格化重新编码，文字会变成图片。需要保留可选中文字请勿使用压缩。' },
      { q: '什么样的 PDF 压缩效果最好？', a: '扫描件、图片多的 PDF 最明显；纯文字/矢量为主的 PDF 可能压不动甚至变大。' },
    ],
  },
  {
    id: 'watermark',
    path: '/watermark/',
    name: '加水印',
    icon: ICON.watermark,
    card: '加中文文字水印',
    kicker: 'WATERMARK',
    h1: 'PDF 加水印',
    title: 'PDF 加水印 — 免费在线给 PDF 加文字水印（支持中文），文件不上传',
    description: '免费在线给 PDF 每一页添加文字水印，支持中文，可调颜色、透明度与平铺/居中。全部在浏览器本地完成，文件不上传。',
    keywords: 'PDF加水印,PDF水印,给PDF加水印,PDF中文水印,PDF批量水印,在线PDF水印',
    lead: '给每一页加上文字水印，支持中文，可调颜色、透明度与平铺/居中。',
    faqs: [
      { q: '支持中文水印吗？', a: '支持，可输入任意中文文字作为水印。' },
      { q: '加了水印还能去掉吗？', a: '水印会嵌入页面，无法简单去除，请务必保留原文件备份。' },
    ],
  },
  {
    id: 'pdf-to-image',
    path: '/pdf-to-image/',
    name: 'PDF 转图片',
    icon: ICON.toImg,
    card: '每页导出 JPG / PNG',
    kicker: 'PDF → IMAGE',
    h1: 'PDF 转图片',
    title: 'PDF 转图片 — 免费把 PDF 转成 JPG / PNG，文件不上传',
    description: '免费在线把 PDF 每一页导出为 PNG 或 JPG，可选清晰度，多页自动打包 ZIP。全部在浏览器本地完成，文件不上传，无水印。',
    keywords: 'PDF转图片,PDF转JPG,PDF转PNG,在线PDF转图片,PDF导出图片,PDF每页转图片',
    lead: '把 PDF 每一页导出为 PNG 或 JPG，可选清晰度，多页自动打包为 ZIP。',
    faqs: [
      { q: 'PDF 转 JPG 和 PNG 怎么选？', a: 'PNG 无损更清晰、体积大；JPG 体积小适合照片类。可按需切换。' },
      { q: '能调清晰度吗？', a: '可以选 1.5×/2×/3×，越高越清晰、文件越大。' },
    ],
  },
  {
    id: 'image-to-pdf',
    path: '/image-to-pdf/',
    name: '图片转 PDF',
    icon: ICON.toPdf,
    card: '多图合成一个 PDF',
    kicker: 'IMAGE → PDF',
    h1: '图片转 PDF',
    title: '图片转 PDF — 免费把 JPG / PNG 合成 PDF，文件不上传',
    description: '免费在线把多张图片合成一个 PDF，可调整顺序、页面尺寸（适应图片/A4/Letter）与边距。全部在浏览器本地完成，文件不上传。',
    keywords: '图片转PDF,JPG转PDF,PNG转PDF,多张图片合成PDF,照片转PDF,在线图片转PDF',
    lead: '把多张图片合成一个 PDF，可调整顺序、页面尺寸与边距。',
    faqs: [
      { q: '支持哪些图片格式？', a: '支持 PNG / JPG / WebP / GIF / BMP。' },
      { q: '可以让每张图都放进 A4 吗？', a: '把页面尺寸选 A4 即可，图片会按比例居中放入 A4 页面。' },
    ],
  },
  {
    id: 'extract-text',
    path: '/extract-text/',
    name: '提取文字',
    icon: ICON.text,
    card: '提取文字 / 转 TXT',
    kicker: 'EXTRACT TEXT',
    h1: 'PDF 提取文字',
    title: 'PDF 提取文字 — 免费把 PDF 转成文本，文件不上传',
    description: '免费在线从 PDF 提取可选中的文字，预览、一键复制或下载 TXT。全部在浏览器本地完成，文件不上传，无需注册。',
    keywords: 'PDF提取文字,PDF转文本,PDF复制文字,PDF转txt,提取PDF文字,PDF文字提取',
    lead: '从 PDF 提取可选中的文字，预览、一键复制或下载 TXT。',
    faqs: [
      { q: '扫描件能提取文字吗？', a: '不能直接提取——扫描件是图片、没有文字层，需要 OCR 识别（本工具暂不含 OCR）。' },
      { q: '提取的文字保留排版吗？', a: '会尽量按行还原，复杂排版（多栏、表格）顺序可能不完美，适合提取正文文字。' },
    ],
  },
];
