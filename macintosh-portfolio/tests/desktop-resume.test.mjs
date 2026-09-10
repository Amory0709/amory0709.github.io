import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DesktopResume, hitsDesktopFile } from '../desktop-resume.mjs';

function fixture() {
  const classes = new Set();
  const root = { getBoundingClientRect: () => ({ left: -10000, top: 0, width: 640, height: 480 }) };
  const file = { hidden: false, classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
    getBoundingClientRect: () => ({ left: -9948, right: -9844, top: 78, bottom: 174, width: 104, height: 96 }) };
  let opens = 0, repaints = 0;
  const controller = new DesktopResume(root, file, () => opens++, () => repaints++);
  return { root, file, classes, controller, counts: () => ({ opens, repaints }), uv: { x: 100 / 640, y: 1 - 120 / 480 } };
}

test('desktop file raycast uses CRT UVs and the offscreen source bounds', () => {
  const { root, file, uv } = fixture();
  assert.equal(hitsDesktopFile(uv, root, file), true);
  assert.equal(hitsDesktopFile({ x: .9, y: .5 }, root, file), false);
  file.hidden = true;
  assert.equal(hitsDesktopFile(uv, root, file), false);
});

test('one click selects, two clicks open the same existing resume dialog once', () => {
  const { controller, uv, classes, counts } = fixture();
  assert.equal(controller.click(uv, 1000), true);
  assert.ok(classes.has('is-selected'));
  assert.deepEqual(counts(), { opens: 0, repaints: 1 });
  controller.click(uv, 1200, 2);
  assert.equal(counts().opens, 1);
  assert.equal(controller.lastTap, null);
});

test('mobile double taps open even when both synthetic clicks have detail one', () => {
  const { controller, uv, counts } = fixture();
  controller.click(uv, 1000, 1); controller.click(uv, 1400, 1);
  assert.equal(counts().opens, 1);
});

test('slow taps and clicks elsewhere cannot accidentally become a file double click', () => {
  const { controller, uv, counts } = fixture();
  controller.click(uv, 1000); controller.click(uv, 1700);
  assert.equal(counts().opens, 0);
  controller.click({ x: .9, y: .5 }, 1800);
  assert.equal(controller.selected, false);
  controller.click(uv, 1900, 2);
  assert.equal(counts().opens, 0);
  controller.click(uv, 2600, 2); // OS-configured desktop double-click interval.
  assert.equal(counts().opens, 1);
});

test('keyboard activation and disabled resumes reuse the same visibility contract', () => {
  const { controller, file, uv, counts } = fixture();
  controller.click(uv, 1000);
  controller.open();
  assert.equal(counts().opens, 1);
  file.hidden = true;
  controller.open(); controller.click(uv, 1200);
  assert.equal(counts().opens, 1);
});

test('desktop icon is inside the CRT source and keeps the original header trigger', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('id="desktopResume"') > html.indexOf('class="os-desktop"'));
  assert.ok(html.indexOf('id="desktopResume"') < html.indexOf('id="projectCard"'));
  assert.ok(html.includes('Resume.pdf'));
  assert.equal((html.match(/id="resumeDialog"/g) || []).length, 1);
  const hero = readFileSync(new URL('../hero.mjs', import.meta.url), 'utf8');
  assert.ok(hero.includes("document.getElementById('resumeButton').click()"));
  assert.ok(hero.includes('this.active === -1 && this.desktopResume.selected'));
});
