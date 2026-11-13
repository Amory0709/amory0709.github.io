import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

// Guard the public professional profile without requiring a browser or new dependencies.
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const config = JSON.parse(read('../config.json'));
const rootHtml = read('../../index.html');
const nestedHtml = read('../index.html');
const engineeringHtml = read('../engineering.html');

test('both portfolio entry points expose the same descriptive identity', () => {
  for (const html of [rootHtml, nestedHtml]) {
    assert.ok(html.includes(`<title>${config.site.pageTitle}</title>`));
    assert.ok(html.includes(`content="${config.site.description}"`));
    assert.match(html, /<link rel="canonical" href="https:\/\/amory0709\.github\.io\/"\s*\/>/);
    assert.match(html, /<meta property="og:title"/);
    assert.match(html, /<meta name="twitter:card"/);
  }
});

test('engineering navigation resolves to an actual local page', () => {
  const engineering = config.navigation.filter(item => item.label === 'Engineering');
  assert.equal(engineering.length, 1);
  assert.equal(engineering[0].href, './engineering.html');
  assert.ok(existsSync(new URL(engineering[0].href, new URL('../', import.meta.url))));
});

test('engineering page offers readable structure and inspectable evidence', () => {
  assert.match(engineeringHtml, /<html lang="en">/);
  assert.match(engineeringHtml, /href="#main"/);
  assert.match(engineeringHtml, /<main id="main"/);
  assert.match(engineeringHtml, /<h1>/);
  assert.match(engineeringHtml, /@media \(max-width:680px\)/);
  assert.match(engineeringHtml, /prefers-reduced-motion/);
  for (const repo of ['3d-editor', 'reservoir-volume-lab', 'Agile-Thinking-Prompt']) {
    assert.ok(engineeringHtml.includes(`https://github.com/Amory0709/${repo}`));
  }
});

test('README featured-project summary agrees with the portfolio config', () => {
  const readme = read('../../README.md');
  const order = config.projects.map(project => project.title).join(', ');
  assert.ok(readme.includes(`Featured projects, in display order: ${order}.`));
});

test('cross-industry positioning preserves every original featured project', () => {
  assert.deepEqual(config.projects.map(project => project.title), [
    'Web History', 'WhatIf Studio', 'SLB 100 Family Day', 'MeshBVH X-Ray',
    '2024 IDPwD', 'Sound of Humanity', 'Electoral Map', 'BLUEbikes Availability'
  ]);
});
