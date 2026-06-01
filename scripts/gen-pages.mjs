// 根据 site.config.mjs 生成静态多页：首页 + 每个工具一页 + sitemap.xml
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SITE, HOME, TOOLS, SHARED_FAQS } from './site.config.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const dirOf = (p) => p.replace(/^\/|\/$/g, '');

const badges = `
  <div class="badges">
    <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 6v6c0 5 3.5 7.5 8 10 4.5-2.5 8-5 8-10V6l-8-4Z"/></svg>文件零上传</span>
    <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>无水印</span>
    <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>不限次数</span>
    <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2M4 7h16M4 7v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7"/></svg>无需注册</span>
  </div>`;

const head = ({ title, description, keywords, canonical, jsonld }) => `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#F5F2EA" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="keywords" content="${keywords}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta name="twitter:card" content="summary" />
  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "4338726b0b084af88125b1047cb29bdf"}'></script>
${jsonld.map((o) => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}`;

const header = () => `
  <header class="topbar">
    <div class="wrap">
      <a class="brand" href="/" aria-label="${SITE.name} 首页">
        <span class="seal-mark" aria-hidden="true"><span>本</span></span>
        <span><b>${SITE.name}</b><span class="sub mono">LOCAL · PDF · TOOLKIT</span></span>
      </a>
      <span class="trust" title="所有处理均在你的设备本地完成">
        <span class="dot" aria-hidden="true"></span>
        <span><span class="t-full">文件不上传 · </span>100% 本地处理</span>
      </span>
      <nav class="links" aria-label="页面导航">
        <a href="/#privacy">隐私</a><a href="/#how">原理</a><a href="/#faq">常见问题</a>
      </nav>
    </div>
  </header>`;

const navHtml = (currentId) => `
  <nav class="tools-nav" aria-label="PDF 工具">
    ${TOOLS.map(
      (t) =>
        `<a class="tn-item" href="${t.path}"${t.id === currentId ? ' aria-current="page"' : ''}>${t.icon}<span>${t.name}</span></a>`,
    ).join('\n    ')}
  </nav>`;

const toolCards = (heading) => `
  <section class="block">
    ${heading ? `<span class="kicker">ALL TOOLS</span><h2>${heading}</h2>` : ''}
    <div class="tool-cards">
      ${TOOLS.map(
        (t) =>
          `<a class="tool-card" href="${t.path}"><span class="tc-ic">${t.icon}</span><span class="tc-tx"><b>${t.name}</b><span class="tc-d">${t.card}</span></span></a>`,
      ).join('\n      ')}
    </div>
  </section>`;

const faqSection = (faqs) => `
  <section class="block" id="faq">
    <span class="kicker">FAQ</span>
    <h2>常见问题</h2>
    <div class="faq">
      ${faqs
        .map(
          (f, i) =>
            `<details${i === 0 ? ' open' : ''}><summary>${f.q}</summary><div class="ans">${f.a}</div></details>`,
        )
        .join('\n      ')}
    </div>
  </section>`;

const adSlot = `<aside class="ad" aria-label="广告"><span class="ad-tag">广告位 · Ad Slot</span></aside>`;

const footer = () => `
  <footer class="site">
    <div class="wrap">
      <div class="f-brand">
        <b>${SITE.name}</b>
        <p>一个把隐私放在第一位的免费 PDF 工具集，所有处理都在你的浏览器本地完成。</p>
      </div>
      <nav aria-label="工具导航">
        ${TOOLS.map((t) => `<a href="${t.path}">${t.h1}</a>`).join('\n        ')}
      </nav>
      <div class="copy mono">© <span id="year"></span> ${SITE.name} · 文件不上传 · No file leaves your device.</div>
    </div>
  </footer>`;

const faqJsonLd = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

const appJsonLd = (name, description) => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
  description,
});

const breadcrumbJsonLd = (tool) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首页', item: SITE.domain + '/' },
    { '@type': 'ListItem', position: 2, name: tool.h1, item: SITE.domain + tool.path },
  ],
});

const page = (bodyInner, headOpts) => `<!doctype html>
<html lang="zh-CN">
<head>${head(headOpts)}
</head>
<body>
${header()}
  <a href="https://bodhi.tools" class="home-fab" aria-label="返回 bodhi.tools 主页">← bodhi.tools</a>
${bodyInner}
${footer()}
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;

// ---------- 首页 ----------
function buildHome() {
  const hero = `
  <main class="wrap">
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="kicker">FREE · NO UPLOAD · NO WATERMARK</span>
          <h1>处理 PDF，<br><em>文件不离开你的电脑</em></h1>
          <p class="lead">合并、拆分、压缩、加水印、PDF 与图片互转、提取文字。全部在浏览器本地完成——文件不上传任何服务器，免费、无水印、不限次数。</p>
          ${badges}
        </div>
        <div class="seal" aria-hidden="true">
          <div><div class="s-top">PROCESSED</div><div class="s-main">本地</div><div class="s-bot">100% ON-DEVICE</div></div>
        </div>
      </div>
    </section>
    ${toolCards('')}
    ${adSlot}
    <section class="block" id="privacy">
      <span class="kicker">WHY LOCAL</span>
      <h2>为什么“本地处理”对 PDF 这么重要</h2>
      <p class="lede">合同、证件、报表、简历——PDF 往往是最敏感的文件。多数“在线 PDF 工具”会把文件上传到它们的服务器再处理，你无法知道文件被存了多久、被谁看过。这个工具不一样。</p>
      <div class="cards3">
        <div class="card"><div class="c-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 6v6c0 5 3.5 7.5 8 10 4.5-2.5 8-5 8-10V6l-8-4Z"/></svg></div><h3>文件不上传</h3><p>所有操作通过浏览器内置能力在你的设备上完成。打开开发者工具的网络面板，看不到任何文件上传请求。</p></div>
        <div class="card"><div class="c-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14"/></svg></div><h3>无水印 · 不限量</h3><p>不加水印、不限文件大小和处理次数、不要求登录注册，处理完即可直接下载。</p></div>
        <div class="card"><div class="c-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.2-8.5"/><path d="M22 4 12 14l-3-3"/></svg></div><h3>断网也能用</h3><p>页面加载完成后，整套工具甚至可以离线运行——因为根本不需要和服务器交换你的文件。</p></div>
      </div>
    </section>
    <section class="block" id="how">
      <span class="kicker">HOW IT WORKS</span>
      <h2>三步搞定，无需安装</h2>
      <div class="steps">
        <div class="step"><h3>选择工具与文件</h3><p>挑一个工具，把 PDF 或图片拖进去。文件只会进入当前这个网页。</p></div>
        <div class="step"><h3>本地完成处理</h3><p>全部在浏览器里运行，速度取决于你的电脑，不受网速影响。</p></div>
        <div class="step"><h3>下载结果</h3><p>处理好的文件直接保存到本地。关闭网页，一切痕迹随之消失。</p></div>
      </div>
    </section>
    ${faqSection(SHARED_FAQS)}
    ${adSlot}
  </main>`;
  return page(hero, {
    title: HOME.title,
    description: HOME.description,
    keywords: HOME.keywords,
    canonical: SITE.domain + '/',
    jsonld: [appJsonLd(SITE.name, HOME.description), faqJsonLd(SHARED_FAQS)],
  });
}

// ---------- 工具页 ----------
function buildTool(tool) {
  const pageFaqs = [...tool.faqs, SHARED_FAQS[0], SHARED_FAQS[1]];
  const body = `
  <main class="wrap">
    <section class="hero hero-tool">
      <span class="kicker">${tool.kicker}</span>
      <h1>${tool.h1}</h1>
      <p class="lead">${tool.lead}</p>
      ${badges}
    </section>
    ${navHtml(tool.id)}
    <section id="app" data-tool="${tool.id}" aria-label="${tool.h1}工具">
      <noscript><div class="workspace">本工具需开启 JavaScript 才能运行——这正是文件能在你本地处理、无需上传的原因。</div></noscript>
    </section>
    ${adSlot}
    ${faqSection(pageFaqs)}
    ${toolCards('全部 PDF 工具')}
    ${adSlot}
  </main>`;
  return page(body, {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    canonical: SITE.domain + tool.path,
    jsonld: [appJsonLd(tool.h1, tool.description), faqJsonLd(pageFaqs), breadcrumbJsonLd(tool)],
  });
}

// ---------- sitemap ----------
function buildSitemap() {
  const urls = [
    { loc: SITE.domain + '/', priority: '1.0' },
    ...TOOLS.map((t) => ({ loc: SITE.domain + t.path, priority: '0.9' })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`)
  .join('\n')}
</urlset>
`;
}

// ---------- 写入 ----------
writeFileSync(resolve(ROOT, 'index.html'), buildHome());
for (const tool of TOOLS) {
  const dir = resolve(ROOT, dirOf(tool.path));
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), buildTool(tool));
}
mkdirSync(resolve(ROOT, 'public'), { recursive: true });
writeFileSync(resolve(ROOT, 'public/sitemap.xml'), buildSitemap());

console.log(`generated: index.html + ${TOOLS.length} tool pages + sitemap.xml`);
