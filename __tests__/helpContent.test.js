import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FAQ, HOW_TO_PLAY } from '../src/content/help';

// public/index.html and public/llms.txt carry a copy of the help text for crawlers that
// don't run JavaScript. If this fails, run `npm run build:help`.
const html = readFileSync(join(__dirname, '..', 'public', 'index.html'), 'utf8');
const llms = readFileSync(join(__dirname, '..', 'public', 'llms.txt'), 'utf8');
const escapeHtml = (t) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

describe('help text copies', () => {
  it('index.html has every FAQ entry in its structured data and static text', () => {
    const block = html.slice(html.indexOf('faq-jsonld:start'), html.indexOf('faq-jsonld:end'));
    const json = JSON.parse(block.slice(block.indexOf('{'), block.lastIndexOf('}') + 1));
    expect(json.mainEntity.map((e) => [e.name, e.acceptedAnswer.text])).toEqual(
      FAQ.map(({ q, a }) => [q, a]),
    );
    for (const { q, a } of FAQ) {
      expect(html).toContain(`<h3>${escapeHtml(q)}</h3>`);
      expect(html).toContain(`<p>${escapeHtml(a)}</p>`);
    }
  });

  it('index.html and llms.txt have every how-to-play section', () => {
    for (const { body } of HOW_TO_PLAY) {
      const text = body.charAt(0).toUpperCase() + body.slice(1);
      expect(html).toContain(escapeHtml(text));
      expect(llms).toContain(text);
    }
    for (const { q } of FAQ) expect(llms).toContain(`### ${q}`);
  });
});

describe('toUiCase', () => {
  it('lowercases words but keeps capitalised letter examples', () => {
    const { toUiCase } = require('../src/content/help');
    expect(toUiCase('You get a few letters, like ON. Type PROTON in English on iPhone.')).toBe(
      'you get a few letters, like ON. type PROTON in english on iPhone.',
    );
  });
});
