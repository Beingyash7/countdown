import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO_ROUTES, PRERENDER_CONTENT } from '../seoConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const distIndexPath = path.join(distDir, 'index.html');

const defaultSiteUrl = 'https://countdown-84q.pages.dev';
const siteUrl = (process.env.VITE_SITE_URL || defaultSiteUrl).replace(/\/$/, '');

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const replaceTag = (html, pattern, replacement) => (pattern.test(html) ? html.replace(pattern, replacement) : html);

const replaceMetaByName = (html, name, content) =>
  replaceTag(html, new RegExp(`<meta[^>]*name="${name}"[^>]*>`, 'i'), `<meta name="${name}" content="${content}">`);

const replaceMetaByProperty = (html, property, content) =>
  replaceTag(html, new RegExp(`<meta[^>]*property="${property}"[^>]*>`, 'i'), `<meta property="${property}" content="${content}">`);

const buildGlobalSchemaGraph = () =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: '10th SSC Exam Countdown',
        url: siteUrl,
        logo: `${siteUrl}/logo-ssc-countdown.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: '10th SSC Exam Countdown',
        inLanguage: 'en-IN',
      },
    ],
  });

const buildRouteSchemaGraph = (routePath, absoluteUrl, title, description) => {
  if (routePath === '/faq') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: title,
          description,
          url: absoluteUrl,
        },
      ],
    };
  }

  if (routePath === '/' || routePath === '/about' || routePath === '/privacy') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: title,
          description,
          url: absoluteUrl,
        },
      ],
    };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: title,
        description,
        mainEntityOfPage: absoluteUrl,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: title, item: absoluteUrl },
        ],
      },
    ],
  };
};

const buildRelatedLinks = (currentPath) =>
  SEO_ROUTES.filter((route) => route.path !== currentPath)
    .slice(0, 5)
    .map((route) => `<li><a href="${route.path}">${escapeHtml(route.primaryKeyword)}</a></li>`)
    .join('');

const buildStaticBodyHtml = (route) => {
  const content = PRERENDER_CONTENT[route.path];
  if (!content) {
    return '<div id="root"></div>';
  }

  const paragraphs = content.intro.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const extraParagraph =
    route.path === '/'
      ? ''
      : `<p>${escapeHtml(
          `For best results, pair this page with weekly mock-paper review and a simple progress tracker. Students preparing for 10th SSC board exams should keep revision focused on high-yield chapters, timed practice quality, and recurring mistake correction. This improves retention, answer speed, and confidence in real exam conditions. Use the related pages below to keep your plan connected across subjects and avoid topic-level preparation gaps. Keep a weekly summary note with three wins, three mistakes, and three next actions so your preparation remains measurable and stable over time. This method prevents last-minute syllabus panic and keeps your revision direction aligned with board exam scoring patterns.`,
        )}</p>`;
  const links = buildRelatedLinks(route.path);

  return `
<div id="root">
  <article class="seo-static-content" style="max-width:860px;margin:0 auto;padding:24px;color:#d2d9e2;line-height:1.7;">
    <h1 style="font-size:32px;line-height:1.2;color:#ffffff;">${escapeHtml(content.h1)}</h1>
    ${paragraphs}${extraParagraph}
    <section>
      <h2 style="font-size:22px;color:#ffffff;">Related SSC Resources</h2>
      <ul>${links}</ul>
    </section>
  </article>
</div>`.trim();
};

const updateHtmlForRoute = (template, route) => {
  const routePath = route.path === '/' ? '' : route.path;
  const absoluteUrl = `${siteUrl}${routePath}`;
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const keywords = escapeHtml(route.keywords.join(', '));

  let html = template;
  html = replaceTag(html, /<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  html = replaceMetaByName(html, 'description', description);
  html = replaceMetaByName(html, 'keywords', keywords);
  html = replaceMetaByName(html, 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  html = replaceTag(html, /<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escapeHtml(absoluteUrl)}">`);
  html = replaceMetaByProperty(html, 'og:title', title);
  html = replaceMetaByProperty(html, 'og:description', description);
  html = replaceMetaByProperty(html, 'og:url', escapeHtml(absoluteUrl));
  html = replaceMetaByProperty(html, 'og:type', route.ogType || 'website');
  html = replaceMetaByProperty(html, 'og:image', escapeHtml(`${siteUrl}/og-ssc-countdown.png`));
  html = replaceMetaByName(html, 'twitter:title', title);
  html = replaceMetaByName(html, 'twitter:description', description);
  html = replaceMetaByName(html, 'twitter:image', escapeHtml(`${siteUrl}/og-ssc-countdown.png`));

  html = replaceTag(
    html,
    /<script\s+type="application\/ld\+json"\s+id="org-schema">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json" id="org-schema">${buildGlobalSchemaGraph()}</script>`,
  );

  const routeSchema = JSON.stringify(buildRouteSchemaGraph(route.path, absoluteUrl, route.title, route.description));
  if (/<script\s+type="application\/ld\+json"\s+id="route-schema">[\s\S]*?<\/script>/i.test(html)) {
    html = replaceTag(
      html,
      /<script\s+type="application\/ld\+json"\s+id="route-schema">[\s\S]*?<\/script>/i,
      `<script type="application/ld+json" id="route-schema">${routeSchema}</script>`,
    );
  } else {
    html = html.replace('</head>', `  <script type="application/ld+json" id="route-schema">${routeSchema}</script>\n</head>`);
  }

  html = replaceTag(html, /<div id="root"><\/div>/i, buildStaticBodyHtml(route));
  return html;
};

const writeRouteHtml = async (route, html) => {
  if (route.path === '/') {
    await writeFile(distIndexPath, html, 'utf8');
    return;
  }

  const routeDir = path.join(distDir, route.path.replace(/^\//, ''));
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, 'index.html'), html, 'utf8');
};

const main = async () => {
  const template = await readFile(distIndexPath, 'utf8');
  for (const route of SEO_ROUTES) {
    const routeHtml = updateHtmlForRoute(template, route);
    await writeRouteHtml(route, routeHtml);
  }
  console.log(`SEO prerender completed for routes: ${SEO_ROUTES.map((route) => route.path).join(', ')}`);
};

main().catch((error) => {
  console.error('SEO prerender failed:', error);
  process.exit(1);
});
