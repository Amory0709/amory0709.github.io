import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { normalizeConfig, loadConfig, safeLink, applyConfig } from '../configuration.mjs';
import { diskPlacement } from '../scene-layout.mjs';

// Template contract tests use the reusable example, independent of live works.
const raw = JSON.parse(readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
// Exercise optional navigation independently of the navigation-free defaults.
const copy = () => ({ ...structuredClone(raw), navigation: [
  { label: 'About', href: '#about', screen: true },
  { label: 'Work', href: '#work', screen: true },
  { label: 'Services', href: '#services' },
  { label: 'Blog', href: '#blog' },
  { label: 'Contact', href: '$email', screen: true }
] });

test('live disks and next/previous navigation follow newest-to-oldest project order', () => {
  const live = normalizeConfig(JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf8')));
  assert.deepEqual(live.projects.map(p => p.title), [
    'WhatIf Studio', 'SLB 100 Family Day', 'MeshBVH X-Ray', 'High Performance Points',
    '2024 IDPwD', 'Sound of Humanity', 'Electoral Map', 'BLUEbikes Availability'
  ]);
  assert.equal(live.projects.find(p => p.title === 'SLB 100 Family Day').color, '#66bb6a');
  assert.equal(live.projects.find(p => p.title === 'WhatIf Studio').color, '#0014dc');
});

test('the shipped configuration preserves all eight projects and resolves shared email', () => {
  const config = normalizeConfig(raw);
  assert.equal(config.projects.length, 8);
  assert.equal(config.projects[0].title, 'Sound of Humanity');
  assert.equal(config.projects[0].embed.width, 1300);
  assert.equal(config.projects[0].embed.height, 980);
  assert.deepEqual(config.navigation, []);
  assert.equal(config.socials.at(-1).href, `mailto:${config.profile.email}`);
  assert.equal(config.site.pageTitle, `${config.profile.name} · ${config.profile.title}`);
  assert.equal(config.projects.at(-1).link, '#');
});

test('one profile edit drives derived branding; optional empty links disappear', () => {
  const source = copy();
  source.profile = { name: '林 海', title: '创意开发者', email: '', initials: '' };
  source.socials[0].href = '';
  const config = normalizeConfig(source);
  assert.equal(config.profile.initials, '林海');
  assert.equal(config.site.pageTitle, '林 海 · 创意开发者');
  assert.equal(config.socials.length, 1);
  assert.equal(config.navigation.length, 4);
  source.site.pageTitle = 'My custom title';
  assert.equal(normalizeConfig(source).site.pageTitle, 'My custom title');
});

test('real projects own local preview images and the introduction has no initials badge', () => {
  const config=normalizeConfig(raw);
  for (const project of config.projects.slice(0,5)) {
    assert.match(project.screen.image.src,/^\.\/assets\/projects\//);
    assert.ok(existsSync(new URL(`../${project.screen.image.src}`,import.meta.url)));
    assert.equal(project.screen.image.fit,'cover');
  }
  assert.equal(new Set(config.projects.slice(0,5).map(p=>p.screen.image.src)).size,5);
  assert.ok(config.projects.slice(5).every(p=>p.screen.image.src===''));
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(!html.includes('id="profileInitials"'));
});

test('bad fields fail with a precise configuration path', () => {
  for (const [mutate, expected] of [
    [x => { x.profile.name = ''; }, /profile.name/],
    [x => { x.profile.email = 'not an email'; }, /profile.email/],
    [x => { x.projects[0].color = 'red'; }, /projects\[0\].color/],
    [x => { x.projects = []; }, /projects/],
    [x => { x.projects.push(x.projects[0]); }, /projects/],
    [x => { x.navigation[0].href = 'javascript:alert(1)'; }, /navigation\[0\].href/]
  ]) {
    const source = copy(); mutate(source); assert.throws(() => normalizeConfig(source), expected);
  }
});

test('links reject executable schemes and preserve safe relative paths', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'java\nscript:alert(1)']) {
    assert.throws(() => safeLink(href));
  }
  for (const href of ['./work/', '#work', 'https://example.com/', 'mailto:a@example.com', 'tel:+12345']) {
    assert.equal(safeLink(href), href);
  }
});

test('config fetch bypasses cache and exposes missing files or invalid JSON', async () => {
  await loadConfig(async (url, options) => {
    assert.equal(url, './config.json'); assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => raw };
  });
  await assert.rejects(loadConfig(async () => ({ ok: false, status: 404 })), /404/);
  await assert.rejects(loadConfig(async () => ({ ok: true, json: async () => { throw Error('bad'); } })), /not valid JSON/);
});

test('project presentation inherits defaults and accepts independent artwork/type settings', () => {
  const source=copy();
  source.screen={descriptionSize:22,buttonText:'Explore'};
  source.projects[0].screen={titleSize:44,image:{src:'./assets/project.png',alt:'Project screenshot',fit:'contain'}};
  source.projects[0].embed={url:'https://example.com/embed',width:1024,height:768};
  const config=normalizeConfig(source);
  assert.equal(config.projects[0].screen.titleSize,44);
  assert.equal(config.projects[0].screen.descriptionSize,22);
  assert.equal(config.projects[0].screen.image.src,'./assets/project.png');
  assert.equal(config.projects[1].screen.image.fit,'cover');
  assert.equal(config.projects[0].embed.url,'https://example.com/embed');
  assert.equal(config.projects[1].embed.url,config.projects[1].link);
  source.projects[0].embed.url='javascript:alert(1)';
  assert.throws(()=>normalizeConfig(source),/embed.url/);
  delete source.projects[0].embed;
  source.projects[0].screen.descriptionSize=200;
  assert.throws(()=>normalizeConfig(source),/descriptionSize/);
  source.projects[0].screen={image:{src:'mailto:a@example.com'}};
  assert.throws(()=>normalizeConfig(source),/image.src/);
});

test('one to eight projects have distinct, finite home positions in every layout', () => {
  for (let count = 1; count <= 8; count++) for (const mode of ['portrait', 'row', 'wide']) {
    const points = Array.from({ length: count }, (_, i) => diskPlacement(i, mode, count).position.toArray());
    assert.ok(points.flat().every(Number.isFinite));
    assert.equal(new Set(points.map(p => p.join(','))).size, count);
  }
});

test('branding, footer, navigation and safe text rendering share the normalized config', () => {
  const nodes = new Map();
  const node = () => ({ textContent: '', setAttribute(k, v) { this[k] = v; }, replaceChildren(...items) { this.children = items; } });
  const doc = {
    documentElement: {},
    getElementById(id) { if (id.startsWith('icon-')) return null; if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); },
    querySelector() { return this.getElementById('description'); }, createElement: node
  };
  const source = copy(); source.profile.name = '<img src=x onerror=alert(1)>';
  source.footer.text = '';
  const config = normalizeConfig(source); applyConfig(config, doc);
  assert.equal(doc.getElementById('profileName').textContent, source.profile.name);
  assert.ok(doc.getElementById('copyright').textContent.includes(source.profile.name));
  assert.equal(doc.title, config.site.pageTitle);
  assert.equal(doc.getElementById('screenNav').children.length, 3);
  assert.equal(doc.getElementById('projectNavigation').hidden, false);
  assert.equal(doc.getElementById('socialLinks').children[0].rel, 'noopener noreferrer');
  assert.equal(doc.getElementById('socialLinks').children.at(-1).href, `mailto:${source.profile.email}`);
  applyConfig(normalizeConfig(raw), doc);
  assert.equal(doc.getElementById('copyright').textContent, `© ${raw.profile.name} · ${raw.footer.note}`);
  assert.equal(doc.getElementById('mainNav').children.length, 0);
  assert.equal(doc.getElementById('screenNav').children.length, 0);
  assert.equal(doc.getElementById('projectNavigation').hidden, true);
});
