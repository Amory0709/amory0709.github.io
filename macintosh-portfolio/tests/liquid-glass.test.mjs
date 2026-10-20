import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture, Vector2 } from '../vendor/three/three.module.js';
import { LiquidGlassMaterial, captureGlassArtwork } from '../liquid-glass.mjs';
import * as glassReadability from '../liquid-glass.mjs';

test('glass refracts the complete existing project crop instead of replacing it with a thumbnail', () => {
  const draws = [];
  const ctx = { fillRect() {}, drawImage(...args) { draws.push(args); } };
  const canvas = { getContext: () => ctx };
  const image = { hidden: false, complete: true, naturalWidth: 1300,
    style: { left: '-8px', top: '0px', width: '656px', height: '480px' } };
  const doc = { createElement: () => canvas,
    getElementById: id => id === 'pcCover' ? { clientWidth: 640, clientHeight: 480 } : image };
  assert.equal(captureGlassArtwork(doc), canvas);
  assert.deepEqual([canvas.width, canvas.height], [640, 480]);
  assert.deepEqual(draws, [[image, -8, 0, 656, 480]]);
});

test('opening and closing an embedded project can dim and restore the CRT material', () => {
  const glass = new LiquidGlassMaterial(new Texture(), new Texture());
  glass.color.set('#151615');
  assert.ok(glass.uniforms.tint.value.r < .02);
  glass.color.set('#ffffff');
  assert.deepEqual(glass.uniforms.tint.value.toArray(), [1, 1, 1]);
  glass.dispose();
});

test('reduced motion freezes the material clock and pointer response', () => {
  const glass = new LiquidGlassMaterial(new Texture(), new Texture());
  glass.update(1000, new Vector2(.8, -.4), false);
  assert.notEqual(glass.uniforms.time.value, 0);
  glass.update(9000, new Vector2(-.6, 1), true);
  assert.equal(glass.uniforms.time.value, 0);
  assert.deepEqual(glass.uniforms.pointer.value.toArray(), [0, 0]);
  glass.update(18000, new Vector2(1, 1), true);
  assert.equal(glass.uniforms.time.value, 0);
  assert.deepEqual(glass.uniforms.pointer.value.toArray(), [0, 0]);
  glass.dispose();
});

test('replacing the card releases both artwork and foreground GPU textures', () => {
  const foreground = new Texture(), artwork = new Texture(), released = [];
  foreground.addEventListener('dispose', () => released.push('foreground'));
  artwork.addEventListener('dispose', () => released.push('artwork'));
  const glass = new LiquidGlassMaterial(foreground, artwork);
  glass.addEventListener('dispose', () => released.push('material'));
  glass.dispose();
  assert.deepEqual(released.sort(), ['artwork', 'foreground', 'material']);
});

// Catch reversed polarity and brightness calculations that treat blue as green.
test('copy uses light ink on dark or blue artwork and dark ink on light or green artwork', () => {
  for (const [background, expected] of [
    [[16, 24, 42, 255, 28, 36, 55, 255], 'light'],
    [[240, 244, 248, 255, 255, 255, 255, 255], 'dark'],
    [[0, 0, 255, 255], 'light'],
    [[0, 255, 0, 255], 'dark']
  ]) assert.equal(glassReadability.glassTextPolarity(new Uint8ClampedArray(background)), expected);
});
