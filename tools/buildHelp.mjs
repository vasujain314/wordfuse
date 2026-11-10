// Copies the help text (src/content/help.js) into the places crawlers read without running
// JavaScript: static HTML and FAQ structured data in public/index.html, and public/llms.txt.
// Run with: npm run build:help (after editing src/content/help.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FAQ, HOW_TO_PLAY } from '../src/content/help.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'public', 'index.html');
const llmsPath = join(root, 'public', 'llms.txt');
const SITE = 'https://wordfuse.expo.app';

const escapeHtml = (t) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sentence = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** Replaces everything between `<!-- name:start ... -->` and `<!-- name:end -->`. */
function replaceBetween(html, name, content, indent) {
  const start = html.indexOf(`<!-- ${name}:start`);
  const startEnd = html.indexOf('-->', start) + 3;
  const end = html.indexOf(`<!-- ${name}:end -->`);
  if (start === -1 || end === -1) throw new Error(`Missing ${name} markers in index.html`);
  return `${html.slice(0, startEnd)}\n${content}\n${indent}${html.slice(end)}`;
}

export function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

function main() {
  let html = readFileSync(indexPath, 'utf8');
  const json = JSON.stringify(faqJsonLd(), null, 2)
    .split('\n')
    .map((l) => `      ${l}`)
    .join('\n');
  html = replaceBetween(
    html,
    'faq-jsonld',
    `    <script type="application/ld+json">\n${json}\n    </script>`,
    '    ',
  );
  const pad = '      ';
  const howTo = HOW_TO_PLAY.map(
    ({ heading, body }) =>
      `${pad}<h3>${escapeHtml(sentence(heading))}</h3>\n${pad}<p>${escapeHtml(sentence(body))}</p>`,
  ).join('\n');
  const faq = FAQ.map(
    ({ q, a }) => `${pad}<h3>${escapeHtml(q)}</h3>\n${pad}<p>${escapeHtml(a)}</p>`,
  ).join('\n');
  html = replaceBetween(
    html,
    'help',
    `${pad}<h2>How to play Word Fuse</h2>\n${howTo}\n${pad}<h2>Frequently asked questions</h2>\n${faq}`,
    pad,
  );
  writeFileSync(indexPath, html);

  const llms = [
    '# Word Fuse',
    '',
    '> A free, fast word game with a typewriter look. You get a few letters (like ON) and type a real English word that contains them (like PROTON) before the fuse burns out. Play solo, or online with up to 8 friends by sharing a link. No sign-up; works in any web browser and on Android.',
    '',
    '## Play',
    '',
    `- [Play in the browser](${SITE}/home): solo game, no install`,
    `- [Play with friends online](${SITE}/multiplayer): host a room and share the link; 2–8 players`,
    '- [Android app on Google Play](https://play.google.com/store/apps/details?id=com.vasuapps.wordfuse)',
    '',
    '## How to play',
    '',
    ...HOW_TO_PLAY.map(({ heading, body }) => `- **${sentence(heading)}:** ${sentence(body)}`),
    '',
    '## FAQ',
    '',
    ...FAQ.flatMap(({ q, a }) => [`### ${q}`, '', a, '']),
    '## Pages',
    '',
    `- [How to play](${SITE}/how-to-play)`,
    `- [FAQ](${SITE}/faq)`,
    `- [Privacy policy](${SITE}/privacy)`,
    '',
  ].join('\n');
  writeFileSync(llmsPath, llms);
  console.log(`index.html: ${HOW_TO_PLAY.length} how-to-play sections, ${FAQ.length} FAQ entries`);
  console.log(`llms.txt: ${llms.length} characters`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
