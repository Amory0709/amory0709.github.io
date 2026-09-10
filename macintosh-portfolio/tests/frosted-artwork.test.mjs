import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blurPixels, paintFrostedArtwork } from '../frosted-artwork.mjs';

test('frosted blur preserves uniform colors and opaque edges', () => {
  const pixels = new Uint8ClampedArray(Array.from({ length: 12 * 8 }, () => [32, 80, 200, 255]).flat());
  assert.deepEqual(blurPixels(pixels, 12, 8), pixels);
});

test('blur softens a hard edge without changing the original artwork', () => {
  const pixels = new Uint8ClampedArray(Array.from({ length: 24 * 8 }, (_, i) => [i % 24 < 12 ? 0 : 255, 0, 0, 255]).flat());
  const original = pixels.slice();
  const blurred = blurPixels(pixels, 24, 8, 2);
  assert.deepEqual(pixels, original);
  assert.ok(blurred[(4 * 24 + 11) * 4] > 0);
  assert.ok(blurred[(4 * 24 + 12) * 4] < 255);
  for (let i = 3; i < blurred.length; i += 4) assert.equal(blurred[i], 255);
});

test('raster-safe glass paints the same cover crop and writes real blurred pixels', () => {
  const calls = [];
  const pixels = new Uint8ClampedArray(Array.from({ length: 12 * 8 }, () => [32, 80, 200, 255]).flat());
  const ctx = { clearRect: (...args) => calls.push(['clear', ...args]),
    drawImage: (...args) => calls.push(['draw', ...args]),
    getImageData: () => ({ data: pixels }), putImageData: (...args) => calls.push(['pixels', ...args]) };
  const canvas = { getContext: () => ctx, hidden: true };
  const image = { style: { left: '-2px', top: '0px', width: '16px', height: '8px' } };
  paintFrostedArtwork(canvas, image, { clientWidth: 12, clientHeight: 8 });
  assert.equal(canvas.width, 12); assert.equal(canvas.height, 8);
  assert.deepEqual(calls[1], ['draw', image, -2, 0, 16, 8]);
  assert.equal(calls[2][0], 'pixels');
  assert.equal(canvas.hidden, false);
});

test('intro layers fill the CRT with crisp content above the glass', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const markup = html.slice(html.indexOf('<div class="project-card"'));
  const layers = ['class="pc-background"', 'id="projectFrost"', 'class="pc-glass"', 'class="pc-content"', 'id="pcCta"'];
  const order = layers.map(layer => markup.indexOf(layer));
  assert.ok(order.every((value, index) => value >= 0 && (!index || value > order[index - 1])));
  assert.ok(html.includes('data-presentation="fullscreen"'));
  assert.ok(html.includes('.project-card { inset: 0; padding: 0;'));
  assert.ok(html.includes('.pc-content { position: relative; z-index: 3;'));
});
