import test from 'node:test';
import assert from 'node:assert/strict';
import { projectScreen, SCREEN_DEFAULTS } from '../project-screen.mjs';

function fixture() {
  const nodes = new Map();
  const doc = { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, {
      style: { setProperty(key, value) { this[key] = value; } },
      classList: { toggle(key, value) { this[key] = value; } },
      dataset: {}, decode: async () => {}, clientWidth: 200, clientHeight: 396,
      naturalWidth: 1300, naturalHeight: 980,
      getAttribute(key) { return this[key]; },
      removeAttribute(key) { delete this[key]; }
    });
    return nodes.get(id);
  } };
  const project = { title: 'My project', desc: 'Editable introduction', link: '#',
    screen: structuredClone(SCREEN_DEFAULTS), embed: { enabled: true, url: 'https://example.com/project' } };
  project.screen.image = { src: './preview.png', alt: 'My preview', fit: 'contain' };
  return { doc, project };
}

test('editable text, type and artwork are applied before screen rendering', async () => {
  const { doc, project } = fixture();
  project.screen.descriptionSize = 22;
  project.screen.buttonText = 'Try it';
  project.screen.image = { src: './preview.png', alt: 'My preview', fit: 'contain' };
  await projectScreen(project, doc);
  assert.equal(doc.getElementById('pcTitle').textContent, project.title);
  assert.equal(doc.getElementById('pcDesc').textContent, project.desc);
  assert.equal(doc.getElementById('projectCard').style['--screen-description-size'], '22px');
  assert.equal(doc.getElementById('pcCta').textContent, 'Try it →');
  assert.equal(doc.getElementById('pcCta').hidden, false);
  assert.equal(doc.getElementById('projectArtwork').src, './preview.png');
  assert.equal(doc.getElementById('pcCover').dataset.fit, 'contain');
  assert.equal(doc.getElementById('projectArtwork').style.width, '200px');
  assert.ok(Math.abs(parseFloat(doc.getElementById('projectArtwork').style.height)-200*980/1300)<1e-8);
});

test('portrait and cover previews have explicit undistorted dimensions for the CRT rasterizer', async () => {
  const { doc, project } = fixture();
  const image = doc.getElementById('projectArtwork');
  image.naturalWidth=400; image.naturalHeight=1000;
  await projectScreen(project,doc);
  assert.equal(image.style.height,'396px');
  assert.equal(image.style.width,'158.4px');
  project.screen.image.fit='cover';
  await projectScreen(project,doc);
  assert.equal(image.style.width,'200px');
  assert.equal(image.style.height,'500px');
  assert.equal(image.style.top,'-52px');
});

test('no artwork uses full-width text; a disabled embed alone does not show a dead button', async () => {
  const { doc, project } = fixture();
  project.screen.image.src = '';
  project.embed.enabled = false;
  await projectScreen(project, doc);
  assert.equal(doc.getElementById('projectCard').classList['without-artwork'], true);
  assert.equal(doc.getElementById('pcCta').hidden, true);
  project.link = 'https://example.com/project';
  await projectScreen(project, doc);
  assert.equal(doc.getElementById('pcCta').hidden, false);
});

test('missing or CORS-blocked artwork shows its description instead of a broken preview', async () => {
  const { doc, project } = fixture();
  doc.getElementById('projectArtwork').decode = async () => { throw new Error('Unavailable'); };
  await projectScreen(project, doc);
  assert.equal(doc.getElementById('projectArtwork').hidden, true);
  assert.equal(doc.getElementById('artworkFallback').hidden, false);
  assert.equal(doc.getElementById('artworkFallback').textContent, project.screen.image.alt);
});

test('root entry resolves image URLs against the template base before rasterization', async () => {
  const { doc, project } = fixture();
  doc.baseURI = 'https://portfolio.example/macintosh-portfolio/';
  await projectScreen(project, doc);
  assert.equal(doc.getElementById('projectArtwork').src, 'https://portfolio.example/macintosh-portfolio/preview.png');
  assert.equal(doc.getElementById('projectArtwork').hidden, false);
});

test('slow images recover after the loading deadline and repaint the CRT', async () => {
  const { doc, project } = fixture();
  const artwork = doc.getElementById('projectArtwork');
  let finish, repaints = 0;
  artwork.decode = () => new Promise(resolve => { finish = resolve; });
  await projectScreen(project, doc, { imageTimeout: 0, onArtworkReady: () => repaints++ });
  assert.equal(doc.getElementById('artworkFallback').textContent, 'Loading preview…');
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(artwork.hidden, false);
  assert.equal(doc.getElementById('artworkFallback').hidden, true);
  assert.equal(artwork.style.width, '200px');
  assert.equal(repaints, 1);
});

test('a late failure replaces the loading notice with the configured fallback', async () => {
  const { doc, project } = fixture();
  let fail, repaints = 0;
  doc.getElementById('projectArtwork').decode = () => new Promise((_, reject) => { fail = reject; });
  await projectScreen(project, doc, { imageTimeout: 0, onArtworkReady: () => repaints++ });
  fail(new Error('Network error'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(doc.getElementById('artworkFallback').textContent, project.screen.image.alt);
  assert.equal(repaints, 1);
});

test('late images cannot overwrite a newer project, even when the image URL is reused', async () => {
  const { doc, project } = fixture();
  const artwork = doc.getElementById('projectArtwork');
  let finish, repaints = 0;
  artwork.decode = () => new Promise(resolve => { finish = resolve; });
  await projectScreen(project, doc, { imageTimeout: 0, onArtworkReady: () => repaints++ });
  artwork.decode = async () => { throw new Error('Latest request failed'); };
  await projectScreen(project, doc);
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(artwork.hidden, true);
  assert.equal(repaints, 0);
});
