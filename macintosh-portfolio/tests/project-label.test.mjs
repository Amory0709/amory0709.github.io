import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createProjectLabelTexture, labelPalette, labelTitleLayout } from '../project-label.mjs';
import { SRGBColorSpace } from '../vendor/three/three.module.js';

const { projects } = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf8'));

function canvasStub() {
  const text = [], fills = [];
  const ctx = {
    font: '', measureText(value) { return { width: value.length * Number(this.font.match(/(\d+)px/)[1]) * 0.55 }; },
    fillText(value) { text.push(value); }, fillRect() { fills.push(this.fillStyle); },
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, strokeRect() {}
  };
  return { text, fills, ctx, canvas: { getContext: () => ctx } };
}

test('label palette uses each real project color and readable ink for shaded paper', () => {
  assert.equal(projects.length, 7);
  for (const project of projects) assert.equal(labelPalette(project.color).accent, project.color);
  assert.equal(labelPalette('#fdd835').ink, '#000000');
  for (const color of ['#e53935', '#fb8c00', '#507aba', '#785489', '#c56699', '#2a2a2a', '#66bb6a']) {
    assert.equal(labelPalette(color).ink, '#ffffff');
  }
  assert.equal(labelPalette('invalid').accent, '#2a2a2a');
});

test('all real project names wrap fully into the label title area', () => {
  for (const { title } of projects) {
    const { ctx } = canvasStub();
    const layout = labelTitleLayout(ctx, title);
    assert.equal(layout.lines.join(' '), title);
    assert.ok(layout.lines.every(line => ctx.measureText(line).width <= 928));
    assert.ok(layout.lines.length * layout.lineHeight <= 304);
  }
});

test('each disk owns a unique texture containing its real title, color and number', () => {
  const textures = projects.map((project, index) => {
    const stub = canvasStub();
    const texture = createProjectLabelTexture(project, index, stub.canvas);
    assert.equal(texture.colorSpace, SRGBColorSpace);
    assert.equal(texture.flipY, true, 'canvas texture matches the bottom-to-top UV projection');
    assert.equal(texture.image.width, 1024); assert.equal(texture.image.height, 768);
    assert.equal(texture.userData.title, project.title);
    assert.equal(texture.userData.color, project.color);
    assert.equal(stub.text.slice(0, -2).join(' '), project.title);
    assert.ok(stub.text.includes(`PROJECT ${String(index + 1).padStart(2, '0')}`));
    assert.ok(stub.fills.includes(project.color));
    return texture;
  });
  assert.equal(new Set(textures.map(t => t.uuid)).size, projects.length);
  assert.equal(new Set(textures.map(t => t.image)).size, projects.length);
  textures.forEach(t => t.dispose());
});

test('label generation fails clearly when the drawing context is unavailable', () => {
  assert.throws(() => createProjectLabelTexture(projects[0], 0, { getContext: () => null }), /Canvas 2D/);
});
