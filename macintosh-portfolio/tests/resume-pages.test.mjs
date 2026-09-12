import test from 'node:test';
import assert from 'node:assert/strict';
import { renderResumePages } from '../resume-pages.mjs';

function fixture({ count = 2, failText = 0, failPage = 0 } = {}) {
  const nodes = new Map(), rendered = [], cleaned = [];
  const element = tag => ({ tag, children: [], dataset: {}, events: {}, clientWidth: 932, clientHeight: 600,
    setAttribute(key, value) { this[key] = value; },
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    addEventListener(name, fn) { this.events[name] = fn; },
    getContext() { return {}; },
    scrollIntoView() { this.scrolled = true; },
    getBoundingClientRect() { return { top: this.top || 0 }; }
  });
  const doc = { body: { dataset: {} }, createElement: element,
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, element(id)); return nodes.get(id); }
  };
  const pdf = { numPages: count, async getPage(index) {
    if (index === failPage) throw Error('Page unavailable');
    return {
      getViewport: ({ scale }) => ({ width: 595 * scale, height: 842 * scale }),
      render: () => ({ promise: Promise.resolve().then(() => rendered.push(index)) }),
      async getTextContent() { if (index === failText) throw Error('Text unavailable'); return { items: [{ str: `Content ${index}` }] }; },
      cleanup: () => cleaned.push(index)
    };
  } };
  return { doc, pdf, nodes, rendered, cleaned };
}

test('all pages render and next/previous/select controls can reach every page', async () => {
  const { doc, pdf, nodes, rendered, cleaned } = fixture({ count: 3 });
  assert.deepEqual(await renderResumePages(pdf, doc, { zh: true }), { total: 3, rendered: 3 });
  assert.deepEqual(rendered, [1, 2, 3]); assert.deepEqual(cleaned, [1, 2, 3]);
  const figures = nodes.get('pages').children, select = nodes.get('pageNumber');
  assert.equal(figures.length, 3); assert.equal(select.children.length, 3);
  assert.equal(nodes.get('navigation').hidden, false);
  assert.equal(nodes.get('previousPage').disabled, true);
  nodes.get('nextPage').events.click();
  assert.equal(select.value, '2'); assert.equal(figures[1].scrolled, true);
  select.value = '3'; select.events.change();
  assert.equal(figures[2].scrolled, true); assert.equal(nodes.get('nextPage').disabled, true);
  nodes.get('previousPage').events.click(); assert.equal(select.value, '2');
  assert.equal(doc.body.dataset.ready, 'true'); assert.equal(doc.body.dataset.pageCount, '3');
});

test('first-page text extraction failure does not leave a first-page-only preview', async () => {
  const { doc, pdf, rendered } = fixture({ failText: 1 });
  assert.deepEqual(await renderResumePages(pdf, doc), { total: 2, rendered: 2 });
  assert.deepEqual(rendered, [1, 2]);
  assert.equal(doc.body.dataset.ready, 'true');
  assert.equal(doc.getElementById('pages').children[1].children.at(-1).textContent, 'Content 2');
});

test('a failed page leaves later pages available and reports partial loading honestly', async () => {
  const { doc, pdf, rendered } = fixture({ count: 3, failPage: 1 });
  assert.deepEqual(await renderResumePages(pdf, doc), { total: 3, rendered: 2 });
  assert.deepEqual(rendered, [2, 3]);
  assert.equal(doc.body.dataset.ready, 'error');
  assert.match(doc.getElementById('status').textContent, /2 of 3 pages/);
  doc.getElementById('nextPage').events.click();
  assert.equal(doc.getElementById('pages').children[1].scrolled, true);
});

test('scrolling updates the page selector and keyboard navigation reaches the final page', async () => {
  const { doc, pdf, nodes } = fixture(); await renderResumePages(pdf, doc);
  const pages = nodes.get('pages');
  pages.children[0].top = -900; pages.children[1].top = 20; pages.events.scroll();
  assert.equal(nodes.get('pageNumber').value, '2');
  let prevented = false;
  pages.events.keydown({ target: pages, key: 'Home', preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(nodes.get('pageNumber').value, '1');
  pages.events.keydown({ target: pages, key: 'End', preventDefault() {} });
  assert.equal(pages.children[1].scrolled, true); assert.equal(nodes.get('pageNumber').value, '2');
});
