import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setSceneLoadState } from '../scene-loading.mjs';

function fixture() {
  const nodes = Object.fromEntries(['hero3d', 'sceneLoader', 'loaderTitle', 'loaderNote'].map(id => [id, {
    dataset: {}, setAttribute(name, value) { this[name] = value; }
  }]));
  return { nodes, doc: { getElementById: id => nodes[id] } };
}

test('loader reveals the scene only when explicitly marked ready', () => {
  const { nodes, doc } = fixture();
  setSceneLoadState(doc, 'loading');
  assert.equal(nodes.sceneLoader.dataset.state, 'loading');
  assert.equal(nodes.sceneLoader['aria-hidden'], 'false');
  setSceneLoadState(doc, 'ready');
  assert.equal(nodes.hero3d.dataset.loadState, 'ready');
  assert.equal(nodes.sceneLoader.dataset.state, 'ready');
  assert.equal(nodes.sceneLoader['aria-hidden'], 'true');
});

test('model and startup errors stop loading and offer a real recovery instruction', () => {
  const { nodes, doc } = fixture();
  setSceneLoadState(doc, 'error');
  assert.equal(nodes.hero3d.dataset.loadState, 'error');
  assert.equal(nodes.sceneLoader.dataset.state, 'error');
  assert.equal(nodes.sceneLoader['aria-hidden'], 'false');
  assert.ok(nodes.loaderTitle.textContent.includes('couldn’t'));
  assert.equal(nodes.loaderNote.textContent, 'Please reload to try again.');
});

test('state updates tolerate absent loading markup', () => {
  assert.doesNotThrow(() => setSceneLoadState({ getElementById: () => null }, 'ready'));
});

test('first-paint loader is local, nonblocking and respects reduced motion', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const hero = readFileSync(new URL('../hero.mjs', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../app.mjs', import.meta.url), 'utf8');
  assert.ok(html.indexOf('id="sceneLoader"') < html.indexOf('id="sceneStage"'));
  assert.ok(html.includes('data-state="loading"'));
  assert.ok(html.includes('stroke-dasharray: 6 7'));
  assert.ok(html.includes('.scene-loader * { animation: none !important; }'));
  assert.ok(html.includes(".scene-loader[data-state='error'] * { animation: none; }"));
  const ready = hero.indexOf("setSceneLoadState(document, 'ready')");
  assert.ok(hero.lastIndexOf('this.renderer.render(this.scene, this.camera)', ready) > hero.indexOf('await this.paintScreen()'));
  assert.ok(app.includes("setSceneLoadState(document, 'error')"));
});
