// 根据 site.config.mjs 生成中英双语静态多页：
//   /          + /<tool>/        (中文)
//   /en/       + /en/<tool>/     (英文)
//   public/sitemap.xml (含两种语言)
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SITE, HOME, TOOLS, SHARED_FAQS } from './site.config.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const dirOf = (p) => p.replace(/^\/|\/$/g, '');
const LANGS = ['zh', 'en'];

// 按语言取字段(英文取 xxxEn, 回退中文)
const tx = (o, k, lang) => (lang === 'en' ? (o[k + 'En'] ?? o[k]) : o[k]);
const pref = (lang) => (lang === 'en' ? '/en' : '');
const toolFaqs = (tool, lang) => (lang === 'en' ? tool.faqsEn : tool.faqs);
const sharedFaqs = (lang) => SHARED_FAQS.map((f) => ({ q: lang === 'en' ? f.qEn : f.q, a: lang === 'en' ? f.aEn : f.a }));

// 硬编码 UI 文案
const UI = {
  zh: {
    badges: ['文件零上传', '无水印', '不限次数', '无需注册'],
    trustFull: '文件不上传 · ', trustShort: '100% 本地处理',
    nav: ['隐私', '原理', '常见问题'], faqTitle: '常见问题', allTools: '全部 PDF 工具',
    footerDesc: '一个把隐私放在第一位的免费 PDF 工具集，所有处理都在你的浏览器本地完成。',
    source: '源代码',
    homeName: '首页', langLabel: 'EN', noscript: '本工具需开启 JavaScript 才能运行——这正是文件能在你本地处理、无需上传的原因。',
    heroKicker: 'FREE · NO UPLOAD · NO WATERMARK',
    heroLead: '合并、拆分、压缩、加水印、PDF 与图片互转、提取文字。全部在浏览器本地完成——文件不上传任何服务器，免费、无水印、不限次数。',
    sealMain: '本地',
    whyKicker: 'WHY LOCAL', whyTitle: '为什么“本地处理”对 PDF 这么重要',
    whyLede: '合同、证件、报表、简历——PDF 往往是最敏感的文件。多数“在线 PDF 工具”会把文件上传到它们的服务器再处理，你无法知道文件被存了多久、被谁看过。这个工具不一样。',
    why: [
      ['文件不上传', '所有操作通过浏览器内置能力在你的设备上完成。打开开发者工具的网络面板，看不到任何文件上传请求。'],
      ['无水印 · 不限量', '不加水印、不限文件大小和处理次数、不要求登录注册，处理完即可直接下载。'],
      ['断网也能用', '页面加载完成后，整套工具甚至可以离线运行——因为根本不需要和服务器交换你的文件。'],
    ],
    howKicker: 'HOW IT WORKS', howTitle: '三步搞定，无需安装',
    how: [
      ['选择工具与文件', '挑一个工具，把 PDF 或图片拖进去。文件只会进入当前这个网页。'],
      ['本地完成处理', '全部在浏览器里运行，速度取决于你的电脑，不受网速影响。'],
      ['下载结果', '处理好的文件直接保存到本地。关闭网页，一切痕迹随之消失。'],
    ],
  },
  en: {
    badges: ['No upload', 'No watermark', 'Unlimited', 'No signup'],
    trustFull: 'Files never uploaded · ', trustShort: '100% local',
    nav: ['Privacy', 'How', 'FAQ'], faqTitle: 'FAQ', allTools: 'All PDF tools',
    footerDesc: 'A privacy-first free PDF toolkit — everything runs locally in your browser.',
    source: 'Source code',
    homeName: 'Home', langLabel: '中文', noscript: 'This tool needs JavaScript — which is exactly why files can be processed locally without uploading.',
    heroKicker: 'FREE · NO UPLOAD · NO WATERMARK',
    heroLead: 'Merge, split, compress, watermark, PDF ↔ image, extract text. All in your browser — files never uploaded to any server. Free, no watermark, unlimited.',
    sealMain: 'LOCAL',
    whyKicker: 'WHY LOCAL', whyTitle: 'Why "local processing" matters so much for PDFs',
    whyLede: 'Contracts, IDs, reports, résumés — PDFs are often your most sensitive files. Most "online PDF tools" upload them to their servers first, and you never know how long they\'re kept or who sees them. This tool is different.',
    why: [
      ['Files never uploaded', 'Everything runs on your device via built-in browser capabilities. Open the DevTools Network panel — you won\'t see any file upload request.'],
      ['No watermark · unlimited', 'No watermark, no size or count limits, no signup — just download when done.'],
      ['Works offline', 'Once the page loads, the whole toolkit can even run offline — because it never needs to exchange your files with a server.'],
    ],
    howKicker: 'HOW IT WORKS', howTitle: 'Three steps, no install',
    how: [
      ['Pick a tool & file', 'Choose a tool and drop in a PDF or image. The file only enters this page.'],
      ['Process locally', 'Everything runs in your browser; speed depends on your computer, not your network.'],
      ['Download', 'The result saves straight to your device. Close the tab and nothing is left behind.'],
    ],
  },
};

const badges = (lang) => `
  <div class="badges">
    <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 6v6c0 5 3.5 7.5 8 10 4.5-2.5 8-5 8-10V6l-8-4Z"/></svg>${UI[lang].badges[0]}</span>
    <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>${UI[lang].badges[1]}</span>
    <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${UI[lang].badges[2]}</span>
    <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2M4 7h16M4 7v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7"/></svg>${UI[lang].badges[3]}</span>
  </div>`;

const hreflangTags = (path) => `
  <link rel="alternate" hreflang="zh-CN" href="${SITE.domain}${path}" />
  <link rel="alternate" hreflang="en" href="${SITE.domain}/en${path}" />
  <link rel="alternate" hreflang="x-default" href="${SITE.domain}/en${path}" />`;

const head = ({ title, description, keywords, canonical, jsonld, path }) => `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#F5F2EA" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="keywords" content="${keywords}" />
  <link rel="canonical" href="${canonical}" />${hreflangTags(path)}
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta name="twitter:card" content="summary" />
  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "4338726b0b084af88125b1047cb29bdf"}'></script>
${jsonld.map((o) => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}`;

// 语言切换:中文页 path → /en+path;英文页 → 去掉 /en
const langSwitchHref = (lang, path) => (lang === 'en' ? path : '/en' + path);

const header = (lang, path) => `
  <header class="topbar">
    <div class="wrap">
      <a class="brand" href="${pref(lang)}/" aria-label="${tx(SITE, 'name', lang)}">
        <span class="seal-mark" aria-hidden="true"><span>本</span></span>
        <span><b>${tx(SITE, 'name', lang)}</b><span class="sub mono">LOCAL · PDF · TOOLKIT</span></span>
      </a>
      <span class="trust" title="${lang === 'en' ? 'Everything runs locally on your device' : '所有处理均在你的设备本地完成'}">
        <span class="dot" aria-hidden="true"></span>
        <span><span class="t-full">${UI[lang].trustFull}</span>${UI[lang].trustShort}</span>
      </span>
      <nav class="links" aria-label="nav">
        <a href="${pref(lang)}/#privacy">${UI[lang].nav[0]}</a><a href="${pref(lang)}/#how">${UI[lang].nav[1]}</a><a href="${pref(lang)}/#faq">${UI[lang].nav[2]}</a><a href="${langSwitchHref(lang, path)}" class="lang-switch">${UI[lang].langLabel}</a>
      </nav>
    </div>
  </header>`;

const navHtml = (currentId, lang) => `
  <nav class="tools-nav" aria-label="PDF tools">
    ${TOOLS.map(
      (t) =>
        `<a class="tn-item" href="${pref(lang)}${t.path}"${t.id === currentId ? ' aria-current="page"' : ''}>${t.icon}<span>${tx(t, 'name', lang)}</span></a>`,
    ).join('\n    ')}
  </nav>`;

const toolCards = (heading, lang) => `
  <section class="block">
    ${heading ? `<span class="kicker">ALL TOOLS</span><h2>${heading}</h2>` : ''}
    <div class="tool-cards">
      ${TOOLS.map(
        (t) =>
          `<a class="tool-card" href="${pref(lang)}${t.path}"><span class="tc-ic">${t.icon}</span><span class="tc-tx"><b>${tx(t, 'name', lang)}</b><span class="tc-d">${tx(t, 'card', lang)}</span></span></a>`,
      ).join('\n      ')}
    </div>
  </section>`;

const faqSection = (faqs, lang) => `
  <section class="block" id="faq">
    <span class="kicker">FAQ</span>
    <h2>${UI[lang].faqTitle}</h2>
    <div class="faq">
      ${faqs
        .map(
          (f, i) =>
            `<details${i === 0 ? ' open' : ''}><summary>${f.q}</summary><div class="ans">${f.a}</div></details>`,
        )
        .join('\n      ')}
    </div>
  </section>`;

const footer = (lang) => `
  <footer class="site">
    <div class="wrap">
      <div class="f-brand">
        <b>${tx(SITE, 'name', lang)}</b>
        <p>${UI[lang].footerDesc}</p>
      </div>
      <nav aria-label="tools">
        ${TOOLS.map((t) => `<a href="${pref(lang)}${t.path}">${tx(t, 'h1', lang)}</a>`).join('\n        ')}
        <a href="https://github.com/bodhi1425/local-pdf-toolbox">${UI[lang].source}</a>
      </nav>
      <div class="copy mono">© <span id="year"></span> ${tx(SITE, 'name', lang)} · No file leaves your device.</div>
    </div>
  </footer>`;

const faqJsonLd = (faqs) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});
const appJsonLd = (name, description) => ({
  '@context': 'https://schema.org', '@type': 'WebApplication', name,
  applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, description,
});
const breadcrumbJsonLd = (tool, lang) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: UI[lang].homeName, item: SITE.domain + pref(lang) + '/' },
    { '@type': 'ListItem', position: 2, name: tx(tool, 'h1', lang), item: SITE.domain + pref(lang) + tool.path },
  ],
});

const page = (bodyInner, headOpts, lang) => `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'zh-CN'}">
<head>${head(headOpts)}
</head>
<body>
${header(lang, headOpts.path)}
  <a href="https://bodhi.tools" class="home-fab" aria-label="bodhi.tools">← bodhi.tools</a>
${bodyInner}
${footer(lang)}
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;

// ---------- 首页 ----------
function buildHome(lang) {
  const u = UI[lang];
  const hero = `
  <main class="wrap">
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="kicker">${u.heroKicker}</span>
          <h1>${tx(HOME, 'h1', lang)}</h1>
          <p class="lead">${u.heroLead}</p>
          ${badges(lang)}
        </div>
        <div class="seal" aria-hidden="true">
          <div><div class="s-top">PROCESSED</div><div class="s-main">${u.sealMain}</div><div class="s-bot">100% ON-DEVICE</div></div>
        </div>
      </div>
    </section>
    ${toolCards('', lang)}
    <section class="block" id="privacy">
      <span class="kicker">${u.whyKicker}</span>
      <h2>${u.whyTitle}</h2>
      <p class="lede">${u.whyLede}</p>
      <div class="cards3">
        <div class="card"><div class="c-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 6v6c0 5 3.5 7.5 8 10 4.5-2.5 8-5 8-10V6l-8-4Z"/></svg></div><h3>${u.why[0][0]}</h3><p>${u.why[0][1]}</p></div>
        <div class="card"><div class="c-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14"/></svg></div><h3>${u.why[1][0]}</h3><p>${u.why[1][1]}</p></div>
        <div class="card"><div class="c-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.2-8.5"/><path d="M22 4 12 14l-3-3"/></svg></div><h3>${u.why[2][0]}</h3><p>${u.why[2][1]}</p></div>
      </div>
    </section>
    <section class="block" id="how">
      <span class="kicker">${u.howKicker}</span>
      <h2>${u.howTitle}</h2>
      <div class="steps">
        <div class="step"><h3>${u.how[0][0]}</h3><p>${u.how[0][1]}</p></div>
        <div class="step"><h3>${u.how[1][0]}</h3><p>${u.how[1][1]}</p></div>
        <div class="step"><h3>${u.how[2][0]}</h3><p>${u.how[2][1]}</p></div>
      </div>
    </section>
    ${faqSection(sharedFaqs(lang), lang)}
  </main>`;
  return page(hero, {
    title: tx(HOME, 'title', lang), description: tx(HOME, 'description', lang), keywords: tx(HOME, 'keywords', lang),
    canonical: SITE.domain + pref(lang) + '/', path: '/',
    jsonld: [appJsonLd(tx(SITE, 'name', lang), tx(HOME, 'description', lang)), faqJsonLd(sharedFaqs(lang))],
  }, lang);
}

// ---------- 工具页 ----------
function buildTool(tool, lang) {
  const sf = sharedFaqs(lang);
  const pageFaqs = [...toolFaqs(tool, lang), sf[0], sf[1]];
  const h1 = tx(tool, 'h1', lang);
  const body = `
  <main class="wrap">
    <section class="hero hero-tool">
      <span class="kicker">${tx(tool, 'kicker', lang)}</span>
      <h1>${h1}</h1>
      <p class="lead">${tx(tool, 'lead', lang)}</p>
      ${badges(lang)}
    </section>
    ${navHtml(tool.id, lang)}
    <section id="app" data-tool="${tool.id}" aria-label="${h1}">
      <noscript><div class="workspace">${UI[lang].noscript}</div></noscript>
    </section>
    ${faqSection(pageFaqs, lang)}
    ${toolCards(UI[lang].allTools, lang)}
  </main>`;
  return page(body, {
    title: tx(tool, 'title', lang), description: tx(tool, 'description', lang), keywords: tx(tool, 'keywords', lang),
    canonical: SITE.domain + pref(lang) + tool.path, path: tool.path,
    jsonld: [appJsonLd(h1, tx(tool, 'description', lang)), faqJsonLd(pageFaqs), breadcrumbJsonLd(tool, lang)],
  }, lang);
}

// ---------- sitemap ----------
function buildSitemap() {
  const urls = [];
  for (const lang of LANGS) {
    urls.push({ loc: SITE.domain + pref(lang) + '/', priority: '1.0' });
    for (const t of TOOLS) urls.push({ loc: SITE.domain + pref(lang) + t.path, priority: '0.9' });
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`)
  .join('\n')}
</urlset>
`;
}

// ---------- 写入 ----------
let count = 0;
for (const lang of LANGS) {
  const base = resolve(ROOT, dirOf(pref(lang)));
  mkdirSync(base, { recursive: true });
  writeFileSync(resolve(base, 'index.html'), buildHome(lang));
  count++;
  for (const tool of TOOLS) {
    const dir = resolve(base, dirOf(tool.path));
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'index.html'), buildTool(tool, lang));
    count++;
  }
}
mkdirSync(resolve(ROOT, 'public'), { recursive: true });
writeFileSync(resolve(ROOT, 'public/sitemap.xml'), buildSitemap());

console.log(`generated: ${count} pages (zh + en) + sitemap.xml`);
