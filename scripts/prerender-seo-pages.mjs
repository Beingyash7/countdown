import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const distIndexPath = path.join(distDir, 'index.html');

const defaultSiteUrl = 'https://countdown-84q.pages.dev';
const siteUrl = (process.env.VITE_SITE_URL || defaultSiteUrl).replace(/\/$/, '');

const routes = [
  {
    route: '/',
    title: '10th SSC Exam Countdown (Maharashtra Board)',
    description:
      '10th SSC preparation dashboard for Maharashtra Board students with a live SSC exam countdown 2026, revision plans, and progress tracking.',
  },
  {
    route: '/about',
    title: 'About 10th SSC Exam Countdown | Maharashtra Board',
    description:
      'Learn how this 10th SSC exam countdown helps Maharashtra Board students stay focused with practical planning and revision structure.',
  },
  {
    route: '/revision-plan',
    title: '10th SSC Revision Plan | Maharashtra Board 2026',
    description:
      'A clear 10-day 10th SSC revision plan for Maharashtra Board students with practical checkpoints before the SSC exam countdown 2026 ends.',
  },
  {
    route: '/math-plan',
    title: '10th SSC Math Revision Plan | Maharashtra Board',
    description:
      'Math checklist for 10th SSC Maharashtra Board: formulas, practice sets, and timed problem solving for exam readiness.',
  },
  {
    route: '/science-plan',
    title: '10th SSC Science Revision Plan | Maharashtra Board',
    description:
      'Science revision checklist for Maharashtra Board 10th SSC with diagrams, concepts, and question practice.',
  },
  {
    route: '/english-plan',
    title: '10th SSC English Revision Plan | Maharashtra Board',
    description:
      'English revision plan for 10th SSC Maharashtra Board with grammar drills, writing formats, and comprehension practice.',
  },
  {
    route: '/faq',
    title: '10th SSC Countdown FAQ | Maharashtra Board',
    description:
      'Frequently asked questions on 10th SSC exam countdown 2026, revision flow, and practical Maharashtra Board preparation.',
  },
  {
    route: '/privacy',
    title: 'Privacy Policy | 10th SSC Exam Countdown',
    description:
      'Privacy details for the 10th SSC exam countdown website, including what analytics telemetry is collected and why.',
  },
];

const escapeAttr = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const replaceTag = (html, pattern, replacement) => {
  if (!pattern.test(html)) {
    return html;
  }
  return html.replace(pattern, replacement);
};

const replaceMetaByName = (html, name, content) => {
  const pattern = new RegExp(`<meta[^>]*name="${name}"[^>]*>`, 'i');
  return replaceTag(html, pattern, `<meta name="${name}" content="${content}">`);
};

const replaceMetaByProperty = (html, property, content) => {
  const pattern = new RegExp(`<meta[^>]*property="${property}"[^>]*>`, 'i');
  return replaceTag(html, pattern, `<meta property="${property}" content="${content}">`);
};

const buildOrganizationSchema = () =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '10th SSC Exam Countdown',
    url: siteUrl,
    logo: `${siteUrl}/logo-ssc-countdown.png`,
  });

const updateHtmlForRoute = (template, routeData) => {
  const routePath = routeData.route === '/' ? '' : routeData.route;
  const absoluteUrl = `${siteUrl}${routePath}`;
  const title = escapeAttr(routeData.title);
  const description = escapeAttr(routeData.description);

  let html = template;
  html = replaceTag(html, /<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  html = replaceMetaByName(html, 'description', description);
  html = replaceTag(
    html,
    /<link\s+rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${escapeAttr(absoluteUrl)}">`,
  );
  html = replaceMetaByProperty(html, 'og:title', title);
  html = replaceMetaByProperty(html, 'og:description', description);
  html = replaceMetaByProperty(html, 'og:url', escapeAttr(absoluteUrl));
  html = replaceMetaByProperty(html, 'og:image', escapeAttr(`${siteUrl}/og-ssc-countdown.png`));
  html = replaceMetaByName(html, 'twitter:title', title);
  html = replaceMetaByName(html, 'twitter:description', description);
  html = replaceMetaByName(html, 'twitter:image', escapeAttr(`${siteUrl}/og-ssc-countdown.png`));

  const schemaJson = buildOrganizationSchema();
  html = replaceTag(
    html,
    /<script\s+type="application\/ld\+json"\s+id="org-schema"><\/script>/i,
    `<script type="application/ld+json" id="org-schema">${schemaJson}</script>`,
  );

  return html;
};

const writeRouteHtml = async (routeData, html) => {
  if (routeData.route === '/') {
    await writeFile(distIndexPath, html, 'utf8');
    return;
  }

  const routeDir = path.join(distDir, routeData.route.replace(/^\//, ''));
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, 'index.html'), html, 'utf8');
};

const main = async () => {
  const template = await readFile(distIndexPath, 'utf8');
  for (const route of routes) {
    const routeHtml = updateHtmlForRoute(template, route);
    await writeRouteHtml(route, routeHtml);
  }
  const routeList = routes.map((route) => route.route).join(', ');
  console.log(`SEO prerender completed for routes: ${routeList}`);
};

main().catch((error) => {
  console.error('SEO prerender failed:', error);
  process.exit(1);
});
