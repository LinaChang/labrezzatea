// 風玥茶研所 La'Brezza 靜態網站產生器
// 用法：node site/build.mjs
// 讀取 content/ 的資料，輸出完整網站到 dist/（不需安裝任何套件）。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');

// ---------- 網站設定 ----------
const CONFIG = {
  siteUrl: 'https://www.labrezzatea.com',
  // 表單服務的送出網址（例如 Formspree、Web3Forms）。留空時表單會改開使用者的郵件程式寄信。
  formEndpoint: '',
  // 網站所在的路徑；放在 GitHub Pages 專案網址時為 /儲存庫名稱/，用自己的網域時為 /
  basePath: (process.env.BASE_PATH || '/').replace(/\/?$/, '/'),
  year: new Date().getFullYear()
};

// ---------- 讀取資料 ----------
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'content/data.js'), 'utf8'), sandbox);
const D = sandbox.window.LBZ_DATA;
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/supplement.json'), 'utf8'));
const C = S.contact;

const imgName = f => f.replace(/\.(jpg|png)$/, '');
const imageFix = { news: { 3: 'news-3', 19: 'news-19' } };
const fixImg = (kind, id, img) => (imageFix[kind] && imageFix[kind][id]) || imgName(img);

const articles = {};
for (const kind of ['news', 'blog']) {
  articles[kind] = D[kind].map(a => {
    const extra = S.articles[kind][a.id] || {};
    return { ...a, kind, img: fixImg(kind, a.id, a.img), lines: extra.lines || a.lead.split(/\s+/), links: extra.links || [] };
  });
}
const newsById = Object.fromEntries(articles.news.map(n => [n.id, n]));

// 依新聞內文修正的獲獎年份（見 design-supplement/README.md）
const yearFix = { 19: '2019' };
const awards = D.awards
  .map(w => ({ ...w, year: yearFix[w.news] || w.year, img: newsById[w.news] ? newsById[w.news].img : imgName(w.img) }))
  .sort((a, b) => b.year - a.year);
const homeAwards = [42, 37, 23, 14, 16].map(id => awards.find(w => w.news === id)).filter(Boolean);

const cats = D.cats;
const catOf = k => cats.find(c => c.key === k);
const products = D.products;
const code = id => 'NO.' + String(id).padStart(2, '0');

// ---------- 工具 ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SITE = "風玥茶研所La'Brezza";

/** 產生 <img>；name 為 assets/ 內不含尺寸與副檔名的檔名 */
const pic = (p, name, { sizes = '100vw', alt = '', eager = false, attrs = '' } = {}) =>
  `<img src="${p}assets/${name}-1920.jpg" srcset="${p}assets/${name}-800.jpg 800w, ${p}assets/${name}-1920.jpg 1920w" sizes="${sizes}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${attrs ? ' ' + attrs : ''}>`;

const reveal = d => `data-reveal="${d}"`;

// ---------- 版型 ----------
const NAV = [
  { label: '揭幕', href: 'about/', key: 'about', children: [['關於風玥', 'about/', 'about'], ['服務項目', 'services/', 'services'], ['獲獎經歷', 'award/', 'award']] },
  { label: '茶品意境', href: 'teas/', key: 'teas' },
  { label: '茶學語錄', href: 'faq/', key: 'faq' },
  { label: '茶文記事', href: 'news/', key: 'journey', children: [['茶語新聞錄', 'news/', 'news'], ['茶旅人文撰', 'blog/', 'blog']] },
  { label: '聯絡資訊', href: 'contact/', key: 'contact' }
];

function header(p, active) {
  const cur = k => (k === active ? ' aria-current="page"' : '');
  const items = NAV.map(n => {
    if (!n.children) return `<a href="${p}${n.href}"${cur(n.key)}>${n.label}</a>`;
    const on = n.children.some(c => c[2] === active);
    return `<div class="dd${on ? ' is-active' : ''}"><a href="${p}${n.href}">${n.label}</a><div class="dd-menu">${n.children.map(c => `<a href="${p}${c[1]}"${cur(c[2])}>${c[0]}</a>`).join('')}</div></div>`;
  }).join('\n    ');
  return `<div class="progress" aria-hidden="true"></div>
<header class="site-header">
  <a class="logo" href="${p || './'}" aria-label="風玥茶研所 首頁"><img src="${p}assets/logo.png" alt="La'Brezza Tea" width="160" height="22"></a>
  <button class="nav-toggle" type="button" aria-label="開啟選單" aria-expanded="false" aria-controls="site-nav"><span></span><span></span><span></span></button>
  <nav class="site-nav" id="site-nav" aria-label="主選單">
    ${items}
  </nav>
</header>`;
}

function footer(p) {
  return `<footer class="site-footer">
  <div class="top">
    <div class="brand"><img src="${p}assets/logo.png" alt="La'Brezza Tea" width="131" height="18"><span>${esc(C.address)}<br>捷運復興崗站 1 號出口 · 步行 3~5 分鐘<br>${esc(C.phone)} · <a href="mailto:${C.email}">${C.email}</a></span></div>
    <div class="cols">
      <div><span class="h">揭幕</span><a href="${p}about/">關於風玥</a><a href="${p}services/">服務項目</a><a href="${p}award/">獲獎經歷</a></div>
      <div><span class="h">茶品</span><a href="${p}teas/">茶品意境</a><a href="${p}faq/">茶學語錄</a></div>
      <div><span class="h">記事</span><a href="${p}news/">茶語新聞錄</a><a href="${p}blog/">茶旅人文撰</a><a href="${p}contact/">聯絡資訊</a></div>
    </div>
  </div>
  <div class="bottom"><span>© ${CONFIG.year} 風玥茶研所 La'Brezza</span><a href="${C.facebook}" target="_blank" rel="noopener">Facebook</a></div>
</footer>`;
}

function layout({ route, title, description = S.seo.description, active = '', image = 's7', body, type = 'website' }) {
  const depth = route ? route.split('/').filter(Boolean).length : 0;
  const p = '../'.repeat(depth);
  const fullTitle = title ? `${title} - ${SITE}` : `風玥茶研所 - ${SITE}`;
  const url = CONFIG.siteUrl + '/' + route;
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc(S.seo.keywords)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(SITE)}">
<meta property="og:title" content="${esc(title || '風玥茶研所')}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${CONFIG.siteUrl}/assets/${image}-1920.jpg">
<meta property="og:locale" content="zh_TW">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0c0d0c">
<link rel="icon" href="${p}assets/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@300;400;600&family=Noto+Sans+TC:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap">
<link rel="stylesheet" href="${p}styles.css">
<script>document.documentElement.classList.add('js')</script>
<script src="${p}main.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">跳到主要內容</a>
${header(p, active)}
<main id="main">
${body(p)}
</main>
${footer(p)}
</body>
</html>
`;
}

function banner(p, { img, label, title, sub = '', extra = '' }) {
  return `<section class="banner">
  <div class="fill" data-kb>${pic(p, img, { eager: true })}</div>
  <div class="shade"></div>
  <div class="content">
    <div class="label" ${reveal(100)}>${label}</div>
    <h1 ${reveal(250)}>${title}</h1>
    ${sub ? `<p ${reveal(400)}>${sub}</p>` : ''}${extra}
  </div>
</section>`;
}

const teaCard = (p, t, i) => {
  const c = catOf(t.cat);
  return `<a class="tea-card" href="${p}tea/${t.id}/" data-cat="${t.cat}" ${reveal((i % 4) * 90)}>
      <div class="media zoom ratio-3-2">${pic(p, t.img, { sizes: '(max-width: 640px) 100vw, 400px' })}</div>
      <div class="meta mono-sm"><span>${c.roman} · ${c.label}</span><span>${code(t.id)}</span></div>
      <div class="name">${esc(t.name)}</div>${t.maker ? `\n      <div class="maker">${esc(t.maker)}</div>` : ''}
    </a>`;
};

const roastScale = full => `<div class="roast-scale mono-sm">${(full ? ['淺焙 LIGHT', '中焙 MEDIUM', '深焙 DEEP', '競賽級 AWARD'] : ['淺焙', '中焙', '深焙', '競賽級']).map(s => `<span>${s}</span>`).join('')}</div>`;

// ---------- 各頁 ----------
const pages = [];
const page = (route, opts) => pages.push({ route, html: layout({ route, ...opts }) });

// 首頁
page('', {
  image: 's7',
  body: p => `<section class="hero">
  <div class="fill" data-kb>${pic(p, 's7', { eager: true })}</div>
  <div class="shade"></div>
  <div class="embers" data-embers></div>
  <div class="content">
    <div class="since" ${reveal(200)}>Since 2011 · Taipei</div>
    <h1><span ${reveal(350)}>重現臺灣</span><span ${reveal(500)}>傳統茶葉工藝</span></h1>
    <p ${reveal(700)}>致力以科學與化學的角度融入傳統製茶技術及茶葉烘焙，將台灣茶產業文化推向國際市場。</p>
  </div>
  <a class="scroll-hint" href="#chapter-1" data-scroll-down data-bob>SCROLL ↓</a>
</section>

<div class="marquee" aria-hidden="true">
  <div class="marquee-track" data-marquee>${Array(2).fill(['傳統龍眼木炭焙', '合歡山茶園', '青心烏龍・鐵觀音', 'Charcoal Roasted Oolong', 'Since 2011'].map(s => `<span>${s}</span><span class="star">✦</span>`).join('')).join('')}</div>
</div>

<section class="split chapter1" id="chapter-1">
  <div class="media-col"><div class="parallax" data-parallax>${pic(p, 's3', { sizes: '(max-width: 840px) 100vw, 50vw' })}</div></div>
  <div class="text-col">
    <div class="label" ${reveal(0)}>第一章 · 茶園</div>
    <h2 class="h2" ${reveal(120)}>自家經營<br>合歡山茶園</h2>
    <p class="body-text" ${reveal(240)}>栽種青心烏龍、鐵觀音品種<br>秉持茶葉精緻化技術本位的核心價值<br>更為茶產業的多樣豐富性進行推廣<br>持續為「優質茶」創新定義</p>
  </div>
</section>

<section class="section" style="padding-bottom:120px;display:flex;flex-direction:column;gap:64px">
  <div class="section-head">
    <div>
      <div class="label" ${reveal(0)}>第二章 · 焙火</div>
      <h2 class="h2" ${reveal(120)}>茶品意境，依火候而分</h2>
    </div>
    <a class="link" href="${p}teas/" ${reveal(200)}>瀏覽全部 ${products.length} 款茶品 →</a>
  </div>
  <div class="cat-grid">
    ${cats.map((c, i) => `<a class="cat-card" href="${p}teas/${c.key}/" ${reveal(i * 120)}>
      <div class="media zoom ratio-4-5">${pic(p, { light: 'light-01', mid: 'mid-01', deep: 'deep-010', award: 'award-04' }[c.key], { sizes: '(max-width: 640px) 100vw, 25vw' })}</div>
      <div class="body"><div class="mono-sm">${c.roman} · ${c.en}</div><div class="name">${c.label}</div><div class="teas">${{ light: '梨山・阿里山・杉林溪・合歡山高冷茶', mid: '蜜香冬片・傳統凍頂・高冷正欉鐵觀音', deep: '東方美人・炭焙鐵觀音・傳統炭焙烏龍', award: '凍頂蜜香貴妃・台灣陳年烏龍茶' }[c.key]}</div></div>
    </a>`).join('\n    ')}
  </div>
</section>

<section class="craft">
  <div class="parallax parallax--lg" data-parallax>${pic(p, 's1')}</div>
  <div class="shade"></div>
  <div class="embers" data-embers></div>
  <div class="content">
    <div class="label" ${reveal(0)}>第三章 · 匠心</div>
    <h2 class="h2" ${reveal(120)}>傳統龍眼木炭焙<br>復刻經典焙火工藝</h2>
    <p class="body-text" style="line-height:2" ${reveal(240)}>以實作取得數據歸納產品系統化，在理性科學與精心製茶過程中，融入感性的生活茶藝。</p>
    <a class="link" href="${p}services/" ${reveal(360)}>烘焙代工與服務項目 →</a>
  </div>
</section>

<section class="section two-col">
  <div style="display:flex;flex-direction:column;gap:24px">
    <div class="label" ${reveal(0)}>第四章 · 榮耀</div>
    <h2 class="h2" ${reveal(120)}>台灣陳年<br>烏龍茶三冠王</h2>
    <div class="media ratio-3-2" style="margin-top:24px" ${reveal(240)}><div class="fill" data-kb>${pic(p, 'aged', { sizes: '(max-width: 840px) 100vw, 50vw', alt: '台灣陳年烏龍茶' })}</div></div>
  </div>
  <div class="honor-list">
    ${homeAwards.map((w, i) => `<a class="honor-row" href="${p}news/${w.news}/" ${reveal(i * 90)}>
      <div class="year">${w.year}</div>
      <div><div class="title">${esc(w.title)}</div><div class="tea">${esc(w.tea)}</div></div>
      <div class="arrow" aria-hidden="true">→</div>
    </a>`).join('\n    ')}
    <a class="link" href="${p}award/" style="margin-top:32px">完整獲獎經歷 →</a>
  </div>
</section>

<section class="invite">
  <p class="quote" ${reveal(0)}>品味台灣茶的內涵、歷史脈絡與茶匠之心<br>放眼新世代，茶美學優雅的無限領域</p>
  <a class="btn" href="${p}contact/" ${reveal(200)}>邀您一同探索與開創</a>
</section>`
});

// 關於風玥
page('about/', {
  title: '關於風玥', active: 'about', image: 'about',
  description: '風玥茶研所創立於 2011 年，致力以科學與化學的角度融入傳統製茶技術及茶葉烘焙，自家經營合歡山茶園，將台灣茶產業文化推向國際市場。',
  body: p => `${banner(p, { img: 'about', label: '揭幕 · ABOUT US', title: '關於風玥' })}
<section class="about-intro">
  <div class="latin-italic" ${reveal(0)}>創立於 2011 年</div>
  <p>
    <span ${reveal(100)}>致力以科學與化學的角度融入傳統製茶技術及茶葉烘焙</span>
    <span ${reveal(200)}>並以實作取得數據歸納產品系統化，用以專注推廣茶葉的專業知識</span>
    <span class="dim" ${reveal(300)}>更秉持著為重現臺灣傳統茶葉工藝的創新精神</span>
    <span class="dim" ${reveal(400)}>將台灣茶產業文化推向國際市場</span>
  </p>
</section>
<div class="stats">
  <div class="stat" ${reveal(0)}><span class="num" data-count="2011">2011</span><span class="cap">創立年份</span></div>
  <div class="stat" ${reveal(120)}><span class="num" data-count="${products.length}">${products.length}</span><span class="cap">款精緻茶品</span></div>
  <div class="stat" ${reveal(240)}><span class="num" data-count="${cats.length}">${cats.length}</span><span class="cap">焙度系列</span></div>
</div>
<section class="two-col about-garden">
  <div class="media portrait" ${reveal(0)}><div class="fill" data-kb>${pic(p, 'about-us-2', { sizes: '(max-width: 840px) 100vw, 50vw', alt: '合歡山茶園' })}</div></div>
  <div style="display:flex;flex-direction:column;gap:32px">
    <div class="label" ${reveal(0)}>茶園 · 理念</div>
    <h2 class="h2" ${reveal(120)}>風玥茶研所<br>自家經營合歡山茶園</h2>
    <p class="body-text" ${reveal(240)}>栽種青心烏龍、鐵觀音品種<br>秉持茶葉精緻化技術本位的核心價值<br>更為茶產業的多樣豐富性進行推廣<br>持續為「優質茶」創新定義<br>亦為風玥茶研所的理念</p>
  </div>
</section>
<section class="closing">
  <div class="parallax parallax--lg" data-parallax>${pic(p, 's3')}</div>
  <div class="shade"></div>
  <div class="content quote">
    <span ${reveal(0)}>品味台灣茶的內涵、歷史脈絡與茶匠之心</span>
    <span ${reveal(150)}>茶境的詮釋，任何人皆可以有獨特見解</span>
    <span ${reveal(300)}>放眼新世代，茶美學優雅的無限領域</span>
    <span class="accent" ${reveal(450)}>風玥茶研所 邀您一同探索與開創</span>
  </div>
</section>`
});

// 服務項目
const serviceBlocks = [
  { img: 'news-34', title: '茶葉精緻烘焙', tag: '精選珍藏。品鑑體驗 - 茶匠人心締造完美價值', lines: ['透過品鑑茶葉的過程中，您可以了解和發現自己的品味喜好', '風玥茶研所 亦可為您提供從茶品的選購原料、烘焙製作、包裝存放…等諮詢服務', '更可依照您的喜好，為您量身製作獨具風味的卓越茶品，屆時享受珍藏茶品的樂趣'] },
  { img: 'news-42', title: '茶品企劃行銷', tag: '茶品規劃。獨家批發 - 茶飲創意風華再現', lines: ['將台灣高品質茶葉導入精工製程走向世界', '復興台灣茶葉傳統工藝，是 風玥茶研所 推廣台灣茶業的理念', '在理性科學與精心製茶過程中，融入感性的生活茶藝', '風玥茶研所 將帶領您深入了解茶產業', '並協助您做茶業品牌規劃及茶品訂製，打造專屬您的獨家風格茶品'] },
  { img: 'faq', title: '茶學產業教育', tag: '', lines: ['總讓人感覺神秘的茶領域', '想進一步理解，卻發現茶葉的世界是豐富萬千而不得要領', '風玥茶研所 使用系統化、科學化的角度分享理念', '佐以競賽標準的評鑑方式，沖泡嚴選的「極緻品」茶葉，讓您快步邁向茶葉世界'] }
];
const serviceItems = ['台灣各產區競賽級茶葉的零售和批發', '獨家特色茶品精製加工', '茶葉複火乾燥烘焙代工', '傳統龍眼木炭焙工藝烘焙代工', '客製化茶品生產製作', '茶產業教育講堂'];
page('services/', {
  title: '服務項目', active: 'services', image: 'services',
  description: '風玥茶研所為國內外知名茶商與品牌提供茶品原料、烘焙代工與產品企劃服務，營業項目包含茶葉精緻烘焙、茶品企劃行銷與茶學產業教育。',
  body: p => `${banner(p, { img: 'services', label: '揭幕 · SERVICES', title: '服務項目' })}
<section class="services-intro">
  <h2 ${reveal(0)}>除了堅持精緻茶葉技術本位外<br>更於推廣茶業教育及傳承技藝過程中<br>展現台灣茶的極緻工藝</h2>
  <div class="body-text" ${reveal(150)}>
    <p>新星之姿躍上國際舞台的風玥茶研所</p>
    <p>多年來是為國內外知名茶商與品牌提供茶品原料、烘焙代工與產品企劃服務的巧匠</p>
    <p>並積極參與全球茶葉品質評鑑，於眾多競賽中屢獲佳績，展現精製烘焙實力</p>
    <p class="lead-in">營業項目分為三大區塊：</p>
  </div>
</section>
${serviceBlocks.map((b, i) => {
    const media = `<div class="media-col"><div class="parallax" data-parallax>${pic(p, b.img, { sizes: '(max-width: 840px) 100vw, 50vw' })}</div></div>`;
    const text = `<div class="text-col">
    <div class="no" ${reveal(0)}>0${i + 1}</div>
    <h3 ${reveal(100)}>${b.title}</h3>
    ${b.tag ? `<div class="tagline" ${reveal(180)}>${b.tag}</div>` : ''}
    <div class="body-text" ${reveal(260)}>${b.lines.map(l => `<p>${l}</p>`).join('')}</div>
  </div>`;
    return `<section class="split service-block">
  ${i % 2 ? text + '\n  ' + media : media + '\n  ' + text}
</section>`;
  }).join('\n')}
<section class="service-items">
  <div class="label" ${reveal(0)}>營業項目</div>
  <div class="item-grid">
    ${serviceItems.map((s, i) => `<div ${reveal((i % 3) * 100)}><span class="n">0${i + 1}</span><span class="t">${s}</span></div>`).join('\n    ')}
  </div>
  <a class="btn" href="${p}contact/" ${reveal(0)}>洽詢合作</a>
</section>`
});

// 獲獎經歷
page('award/', {
  title: '獲獎經歷', active: 'award', image: 'award_banner',
  description: '風玥茶研所積極參與全球茶葉品質評鑑，榮獲 Monde Selection 金獎、iTi 國際水晶獎、亞太茶茗大賽特別金獎與台灣陳年烏龍茶三冠王等獎項。',
  body: p => `${banner(p, { img: 'award_banner', label: '揭幕 · AWARDS', title: '獲獎經歷', sub: '積極參與全球茶葉品質評鑑，於眾多競賽中屢獲佳績，展現精製烘焙實力' })}
<section class="timeline">
  <div class="axis" data-grow aria-hidden="true"></div>
  <ol>
    ${awards.map(w => `<li><a class="award" href="${p}news/${w.news}/" ${reveal(0)}>
      <div class="year">${w.year}</div>
      <div class="dot" aria-hidden="true"></div>
      <div class="info">
        <div class="title">${esc(w.title)}</div>
        <div class="tea">${esc(w.tea)}</div>
        <div class="detail">${esc(w.detail)}</div>
      </div>
      <div class="media zoom ratio-3-2">${pic(p, w.img, { sizes: '(max-width: 1024px) 420px, 280px' })}</div>
    </a></li>`).join('\n    ')}
  </ol>
</section>`
});

// 茶品意境（全部＋各分類）
const tabs = [{ key: 'all', label: '全部', pos: 50 }, ...cats];
const teaTitles = Object.fromEntries(tabs.map(t => [t.key, `${t.key === 'all' ? '茶品意境' : t.full} - ${SITE}`]));
for (const t of tabs) {
  const isAll = t.key === 'all';
  page(isAll ? 'teas/' : `teas/${t.key}/`, {
    title: isAll ? '茶品意境' : t.full, active: 'teas', image: 's2',
    description: isAll ? `風玥茶研所 ${products.length} 款精緻茶品，依焙火程度分為淺焙清香、中焙韻香、深焙濃香與競賽級四大系列。` : `風玥茶研所${t.full}：${products.filter(x => x.cat === t.key).map(x => x.name).join('、')}。`,
    body: p => `${banner(p, { img: 's2', label: '精緻茶品 · TEAS', title: '茶品意境', sub: '茶境的詮釋，任何人皆可以有獨特見解' })}
<div class="tea-filter" data-tea-filter data-initial="${t.key}" data-titles="${esc(JSON.stringify(teaTitles))}">
  <nav class="tea-tabs" aria-label="茶品分類">
    ${tabs.map(c => `<a href="${p}teas/${c.key === 'all' ? '' : c.key + '/'}" data-cat="${c.key}" data-pos="${c.pos}" aria-current="${c.key === t.key}">${c.label}<span class="count">${c.key === 'all' ? products.length : products.filter(x => x.cat === c.key).length}</span></a>`).join('\n    ')}
  </nav>
  <div class="roast-bar" aria-hidden="true"><div class="marker" style="left:${t.pos}%"></div></div>
  ${roastScale(true)}
</div>
<div class="tea-grid" data-tea-grid>
  ${products.map((x, i) => teaCard(p, x, i).replace('class="tea-card"', `class="tea-card"${isAll || x.cat === t.key ? '' : ' hidden'}`)).join('\n  ')}
</div>`
  });
}

// 茶品內頁
products.forEach((t, i) => {
  const c = catOf(t.cat);
  const prev = products[(i - 1 + products.length) % products.length];
  const next = products[(i + 1) % products.length];
  const related = products.filter(q => q.cat === t.cat && q.id !== t.id).slice(0, 4);
  page(`tea/${t.id}/`, {
    title: t.name, active: 'teas', image: t.img,
    description: `${t.name}｜${c.full}。${t.lines.join('').replace(/\s+/g, '')}`.slice(0, 150),
    body: p => `<div class="tea-detail">
  <nav class="crumbs" aria-label="麵包屑"><a href="${p}teas/">茶品意境</a><span>/</span><a href="${p}teas/${t.cat}/">${c.full}</a><span>/</span><span class="here" aria-current="page">${esc(t.name)}</span></nav>
  <section class="tea-main">
    <div class="media ratio-3-2" ${reveal(0)}><div class="fill" data-kb>${pic(p, t.img, { eager: true, sizes: '(max-width: 960px) 100vw, 50vw', alt: t.name })}</div></div>
    <div class="info">
      <div class="label" ${reveal(100)}>${c.roman} · ${c.en} · ${code(t.id)}</div>
      <h1 ${reveal(200)}>${esc(t.name)}</h1>
      ${t.maker ? `<div class="maker" ${reveal(250)}>${esc(t.maker)}</div>` : ''}
      <div class="desc body-text" ${reveal(300)}>${t.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>
      <div class="roast" ${reveal(400)} role="img" aria-label="焙度：${c.label}">
        <div class="roast-bar"><div class="marker" style="left:${c.pos}%"></div></div>
        ${roastScale(false)}
      </div>
      <a class="btn" href="${p}contact/?tea=${encodeURIComponent(t.name)}" ${reveal(500)}>聯繫我們瞭解詳細訊息</a>
    </div>
  </section>
  <nav class="pager" aria-label="上一款與下一款">
    <a href="${p}tea/${prev.id}/"><span class="dir">← 上一款</span><span class="t">${esc(prev.name)}</span></a>
    <a href="${p}tea/${next.id}/"><span class="dir">下一款 →</span><span class="t">${esc(next.name)}</span></a>
  </nav>
  <section class="related">
    <h2 ${reveal(0)}>同系列茶品</h2>
    <div class="related-grid">
      ${related.map((q, j) => `<a href="${p}tea/${q.id}/" ${reveal((j % 4) * 90)}>
        <div class="media zoom ratio-3-2">${pic(p, q.img, { sizes: '(max-width: 640px) 100vw, 320px' })}</div>
        <div class="name">${esc(q.name)}</div>
      </a>`).join('\n      ')}
    </div>
  </section>
</div>`
  });
});

// 茶學語錄
const blockClass = { p: '', li: 'li', step: 'step', h: 'h', h2: 'h2s', note: 'note' };
page('faq/', {
  title: '茶學語錄', active: 'faq', image: 'faq',
  description: '風玥茶研所茶學語錄：台灣烏龍茶的歷史、製茶工藝、競賽茶、藏茶方法與台灣六大特色茶品。',
  body: p => `${banner(p, { img: 'faq', label: '茶語藏心 · KNOWLEDGE', title: '茶知識語錄' })}
<div class="faq-layout">
  <nav class="faq-toc" aria-label="主題目錄">
    ${D.faq.map((g, gi) => `<a href="#faq-${gi + 1}"><span class="n">0${gi + 1}</span>${esc(g.title)}</a>`).join('\n    ')}
  </nav>
  <div class="faq-groups">
    ${D.faq.map((g, gi) => `<section class="faq-group" id="faq-${gi + 1}">
      <div class="head" ${reveal(0)}><span class="n">0${gi + 1}</span><h2>${esc(g.title)}</h2></div>
      <div class="faq-items">
        ${g.items.map((it, ii) => {
    const id = `faq-${gi + 1}-${ii + 1}`, open = gi === 0 && ii === 0;
    return `<div class="faq-item">
          <h3 style="margin:0;font-weight:inherit"><button class="faq-q" type="button" aria-expanded="${open}" aria-controls="${id}"><span class="n">${gi + 1}.${ii + 1}</span><span class="q">${esc(it.q)}</span><span class="plus" aria-hidden="true">+</span></button></h3>
          <div class="faq-a" id="${id}"${open ? '' : ' hidden'}>
            ${it.a.map(([type, text]) => `<${type === 'p' ? 'p' : 'div'}${blockClass[type] ? ` class="${blockClass[type]}"` : ''}>${esc(text)}</${type === 'p' ? 'p' : 'div'}>`).join('\n            ')}
          </div>
        </div>`;
  }).join('\n        ')}
      </div>
    </section>`).join('\n    ')}
  </div>
</div>`
});

// 新聞／部落格列表與內頁
const KIND = {
  news: { title: '茶語新聞錄', en: 'NEWS', banner: 'news-38', more: '點此進入閱讀詳細新聞內容', description: '風玥茶研所最新消息、媒體報導與國際茶葉競賽獲獎紀錄。' },
  blog: { title: '茶旅人文撰', en: 'JOURNEY', banner: 'blog-26', more: '點此進入閱讀詳細文章', description: '風玥茶研所的茶旅記事、生活茶藝與人文分享。' }
};
for (const kind of ['news', 'blog']) {
  const K = KIND[kind], list = articles[kind], [first, ...rest] = list;
  page(`${kind}/`, {
    title: K.title, active: kind, image: K.banner, description: K.description,
    body: p => `${banner(p, {
      img: K.banner, label: `茶文記事 · ${K.en}`, title: K.title,
      extra: `\n    <nav class="list-tabs" ${reveal(400)} aria-label="茶文記事分類"><a href="${p}news/"${kind === 'news' ? ' aria-current="page"' : ''}>茶語新聞錄</a><a href="${p}blog/"${kind === 'blog' ? ' aria-current="page"' : ''}>茶旅人文撰</a></nav>`
    })}
<a class="featured" href="${p}${kind}/${first.id}/">
  <div class="media zoom ratio-16-10" ${reveal(0)}>${pic(p, first.img, { sizes: '(max-width: 960px) 100vw, 50vw' })}</div>
  <div class="info">
    <div class="date" ${reveal(100)}>最新 · ${first.date}</div>
    <h2 ${reveal(200)}>${esc(first.title)}</h2>
    <p ${reveal(300)}>${esc(first.lines.join(' '))}</p>
    <span class="more" ${reveal(400)}>閱讀全文 →</span>
  </div>
</a>
<div class="post-grid">
  ${rest.map((n, i) => `<a class="post-card" href="${p}${kind}/${n.id}/" ${reveal((i % 3) * 100)}>
    <div class="media zoom ratio-3-2">${pic(p, n.img, { sizes: '(max-width: 640px) 100vw, 420px' })}</div>
    <span class="date">${n.date}</span>
    <div class="title">${esc(n.title)}</div>
  </a>`).join('\n  ')}
</div>`
  });

  list.forEach((n, i) => {
    const newer = list[i - 1], older = list[i + 1];
    page(`${kind}/${n.id}/`, {
      title: n.title, active: kind, image: n.img, type: 'article',
      description: n.lines.join(' ').slice(0, 150),
      body: p => `<article class="article">
  <div class="article-head">
    <nav class="crumbs" aria-label="麵包屑"><a href="${p}${kind}/">${K.title}</a><span>/</span><time class="here" datetime="${n.date.replace(/\./g, '-')}">${n.date}</time></nav>
    <h1 ${reveal(100)}>${esc(n.title)}</h1>
  </div>
  <div class="article-cover" ${reveal(200)}><div class="media ratio-16-9"><div class="fill" data-kb>${pic(p, n.img, { eager: true, sizes: '(max-width: 1280px) 100vw, 1280px', alt: n.title })}</div></div></div>
  <div class="article-body">
    ${n.lines.map(l => `<span ${reveal(0)}>${esc(l)}</span>`).join('\n    ')}
    ${n.links.length ? `<div class="article-links" ${reveal(0)}>
      ${n.links.map((l, j) => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${j === 0 ? K.more : '延伸閱讀'}</a><span class="src">${esc(l.source)}</span>`).join('\n      ')}
    </div>` : ''}
  </div>
  <nav class="pager pager--article" aria-label="較新與較舊文章">
    <a href="${p}${kind}/${newer ? newer.id + '/' : ''}"><span class="dir">← 較新文章</span><span class="t">${newer ? esc(newer.title) : '回到列表'}</span></a>
    <a href="${p}${kind}/${older ? older.id + '/' : ''}"><span class="dir">較舊文章 →</span><span class="t">${older ? esc(older.title) : '回到列表'}</span></a>
  </nav>
</article>`
    });
  });
}

// 聯絡資訊
page('contact/', {
  title: '聯絡資訊', active: 'contact', image: 'contact',
  description: `風玥茶研所聯絡資訊：${C.address}，電話 ${C.phone}，Email ${C.email}，營業時間${C.hours}。`,
  body: p => `${banner(p, { img: 'contact', label: 'CONTACT', title: '聯絡資訊' })}
<section class="two-col contact-main">
  <div class="left">
    <h2 ${reveal(0)}>放眼新世代，茶美學的疆域，<br>如何傳承傳統再創新，等您來《風玥茶研所》一同探索與開創。</h2>
    <div class="info-list">
      ${[
    ['地址', esc(C.address)],
    ['電話', `<a href="tel:+886-2-2898-2982">${C.phone}</a>`],
    ['Email', `<a href="mailto:${C.email}">${C.email}</a>`],
    ['營業時段', esc(C.hours)],
    ['交通', esc(C.transit)],
    ['社群', `<a href="${C.facebook}" target="_blank" rel="noopener">Facebook / labrezzatea</a><br><a href="${C.blog}" target="_blank" rel="noopener">痞客邦 / labrezza2011</a>`]
  ].map(([k, v], i) => `<div class="info-row" ${reveal((i + 1) * 80)}><span class="k">${k}</span><span class="v">${v}</span></div>`).join('\n      ')}
    </div>
  </div>
  <div ${reveal(150)}>
    <form class="contact-form" data-contact-form data-endpoint="${esc(CONFIG.formEndpoint)}" data-mailto="${C.email}" action="${esc(CONFIG.formEndpoint)}" method="post">
      <div class="title">發送一封電子郵件</div>
      <label>姓名<input name="name" autocomplete="name" required></label>
      <label>Email<input name="email" type="email" autocomplete="email" required></label>
      <label>主旨<input name="subject" required></label>
      <label>訊息<textarea name="message" rows="5" required></textarea></label>
      <label class="hp" aria-hidden="true">請勿填寫<input name="website" tabindex="-1" autocomplete="off"></label>
      <p class="error" role="alert" hidden>訊息未能送出，請稍後再試，或直接來信 ${C.email}。</p>
      <button class="btn" type="submit">發送電子郵件</button>
    </form>
    <div class="form-done" data-form-done role="status" hidden>
      <div class="ty">Thank you</div>
      <div class="t">訊息已送出</div>
      <div class="d">感謝您的來信，我們會盡快與您聯繫。</div>
    </div>
  </div>
</section>
<div class="map"><iframe src="${C.mapEmbed}" title="風玥茶研所地圖：${esc(C.address)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
<script>
  // 從茶品頁帶入主旨
  (function () {
    var tea = new URLSearchParams(location.search).get('tea');
    if (tea) document.querySelector('[name=subject]').value = '茶品詢問：' + tea;
  })();
</script>`
});

// 404
pages.push({
  route: '404.html',
  html: layout({
    route: '', title: '找不到頁面',
    body: p => `<section class="not-found">
  <div class="code">404</div>
  <h1 class="h2">找不到這個頁面</h1>
  <p class="body-text">網址可能已變更。您可以回到首頁，或從上方選單繼續瀏覽。</p>
  <a class="btn" href="${CONFIG.basePath}">回到首頁</a>
</section>`
  }).replace(/(href|src)="(?!https?:|\/|#|mailto:|tel:)/g, `$1="${CONFIG.basePath}`).replace(/(srcset="|, )(?=assets\/)/g, `$1${CONFIG.basePath}`)
});

// ---------- 舊網址轉址 ----------
const redirects = {
  'index.html': '',
  'about/about-us.html': 'about/',
  'about/services.html': 'services/',
  'about/award.html': 'award/',
  'projects.html': 'teas/',
  'projects/category/12-light.html': 'teas/light/',
  'projects/category/13-mid.html': 'teas/mid/',
  'projects/category/14-deep.html': 'teas/deep/',
  'projects/category/15-award-tea.html': 'teas/award/',
  'faq.html': 'faq/',
  'journey/news.html': 'news/',
  'journey/blog.html': 'blog/',
  'contact-us.html': 'contact/'
};
for (const t of products) {
  redirects[`projects/product/${t.id}-${t.img}.html`] = `tea/${t.id}/`;
  redirects[`projects/product/contact/cid-${t.id}.html`] = `contact/?tea=${encodeURIComponent(t.name)}`;
}
// 舊文章網址的檔名含中文標題，從原站網站地圖讀取
const sitemapMd = path.join(ROOT, '../SITEMAP.md');
if (fs.existsSync(sitemapMd)) {
  for (const [, kind, file] of fs.readFileSync(sitemapMd, 'utf8').matchAll(/labrezzatea\.com\/journey\/(news|blog)\/([^\s)]+\.html)/g)) {
    const id = parseInt(file, 10);
    if (articles[kind].some(a => a.id === id)) redirects[`journey/${kind}/${decodeURIComponent(file)}`] = `${kind}/${id}/`;
  }
}
const redirectPage = to => `<!DOCTYPE html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><title>${esc(SITE)}</title><link rel="canonical" href="${CONFIG.siteUrl}/${to}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${CONFIG.basePath}${to}"></head><body><a href="${CONFIG.basePath}${to}">${CONFIG.siteUrl}/${to}</a></body></html>\n`;

// ---------- 輸出 ----------
fs.rmSync(DIST, { recursive: true, force: true });
const write = (rel, content) => {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};
for (const pg of pages) write(pg.route.endsWith('.html') ? pg.route : pg.route + 'index.html', pg.html);
for (const [from, to] of Object.entries(redirects)) if (from !== 'index.html') write(from, redirectPage(to));
// Netlify／Cloudflare Pages 會優先使用 _redirects 做 301 轉址
write('_redirects', Object.entries(redirects).filter(([f]) => f !== 'index.html').map(([f, t]) => `${CONFIG.basePath}${encodeURI(f)} ${CONFIG.basePath}${t} 301`).join('\n') + '\n');

write('styles.css', fs.readFileSync(path.join(ROOT, 'src/styles.css')));
write('main.js', fs.readFileSync(path.join(ROOT, 'src/main.js')));
fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });

const urls = pages.filter(pg => !pg.route.endsWith('.html')).map(pg => `  <url><loc>${CONFIG.siteUrl}/${pg.route}</loc></url>`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${CONFIG.siteUrl}/sitemap.xml\n`);

// ---------- 檢查：所有站內連結與圖片都指向存在的檔案 ----------
let missing = 0;
for (const pg of pages) {
  const dir = path.dirname(path.join(DIST, pg.route.endsWith('.html') ? pg.route : pg.route + 'index.html'));
  for (const [, ref] of pg.html.matchAll(/(?:href|src)="([^"#?]+)[^"]*"/g)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    let target = ref.startsWith(CONFIG.basePath) ? path.join(DIST, ref.slice(CONFIG.basePath.length)) : path.join(dir, ref);
    if (ref.endsWith('/')) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) { missing++; console.warn(`缺少檔案：${pg.route || '/'} → ${ref}`); }
  }
  for (const [, set] of pg.html.matchAll(/srcset="([^"]+)"/g)) {
    for (const ref of set.split(',').map(s => s.trim().split(' ')[0])) {
      const target = ref.startsWith(CONFIG.basePath) ? path.join(DIST, ref.slice(CONFIG.basePath.length)) : path.join(dir, ref);
      if (!fs.existsSync(target)) { missing++; console.warn(`缺少圖片：${pg.route || '/'} → ${ref}`); }
    }
  }
}
console.log(`完成：${pages.length} 頁、${Object.keys(redirects).length - 1} 個舊網址轉址，輸出到 ${path.relative(process.cwd(), DIST) || 'dist'}${missing ? `；${missing} 個參照找不到檔案` : '；站內連結檢查通過'}`);
if (missing) process.exitCode = 1;
