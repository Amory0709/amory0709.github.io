import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOBILE_PAN_QUERY, DESKTOP_SCENE_ASPECT, sceneStageWidth, resizedScrollLeft } from '../mobile-pan.mjs';
import { pointerNDC } from '../scene-geometry.mjs';

test('phones retain the reference desktop scene proportions instead of wrapping disks', () => {
  for (const [width, height] of [[296, 384], [366, 624], [406, 712]]) {
    const stage = sceneStageWidth(width, height, true);
    assert.ok(stage > width);
    assert.ok(Math.abs(stage / height - DESKTOP_SCENE_ASPECT) <= .5 / height);
  }
  assert.equal(sceneStageWidth(1222, 780, false), 1222);
  assert.equal(sceneStageWidth(794, 265, false), 794);
  assert.equal(sceneStageWidth(760, 220, true), 760, 'never narrower than the visible viewport');
});

test('initial mobile view is centered and resize preserves the viewed section', () => {
  assert.equal(resizedScrollLeft(0, undefined, 612), 306);
  assert.equal(resizedScrollLeft(0, 612, 400), 0);
  assert.equal(resizedScrollLeft(306, 612, 400), 200);
  assert.equal(resizedScrollLeft(612, 612, 400), 400);
  assert.equal(resizedScrollLeft(-20, 612, 400), 0);
  assert.equal(resizedScrollLeft(900, 612, 400), 400);
  assert.equal(resizedScrollLeft(306, 612, 0), 0);
});

test('raycasting follows the actual scrolled canvas rather than the phone viewport', () => {
  for (const scrollLeft of [0, 306, 612]) {
    const rect = { left: 12 - scrollLeft, top: 55, width: 978, height: 624 };
    const point = pointerNDC({ clientX: 195, clientY: 367 }, rect);
    assert.ok(Math.abs(point.x - ((183 + scrollLeft) / 978 * 2 - 1)) < 1e-10);
    assert.equal(point.y, 0);
  }
});

test('root and subdirectory share a clipped 3D stage inside a native horizontal scroller', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const root = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.equal(root.replace('  <base href="/macintosh-portfolio/" />\n', ''), html);
  assert.ok(html.includes(`@media ${MOBILE_PAN_QUERY}`));
  assert.ok(html.includes('overflow-x: auto; overflow-y: hidden; touch-action: pan-x'));
  assert.ok(html.includes('id="sceneViewport"'));
  assert.ok(html.includes('id="sceneStage"'));
  assert.ok(!html.includes('disk-tray') && !html.includes('disk-thumbnail'));
});
