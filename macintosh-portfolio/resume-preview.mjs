import { getDocument, GlobalWorkerOptions } from './vendor/pdfjs/pdf.mjs';
GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.mjs';
const params = new URLSearchParams(location.search), zh = params.get('lang') === 'zh';
document.documentElement.lang = zh ? 'zh-CN' : 'en';
const status = document.getElementById('status'), pages = document.getElementById('pages');
status.textContent = zh ? '正在加载 PDF…' : 'Loading PDF…';
try {
  // Only preview the parent page's already-validated, same-origin PDF blob.
  const source = new URL(params.get('file'));
  if (source.protocol !== 'blob:' || source.origin !== location.origin) throw new Error('Invalid PDF source');
  const pdf = await getDocument({ url: source.href, isEvalSupported: false,
    cMapUrl: './vendor/pdfjs/cmaps/', cMapPacked: true,
    standardFontDataUrl: './vendor/pdfjs/standard_fonts/', wasmUrl: './vendor/pdfjs/wasm/' }).promise;
  for (let index = 1; index <= pdf.numPages; index++) {
    const page = await pdf.getPage(index), original = page.getViewport({scale:1});
    const width = Math.min(900, Math.max(200, document.documentElement.clientWidth - 32));
    const viewport = page.getViewport({scale:width / original.width * Math.min(devicePixelRatio || 1, 2)});
    const figure = document.createElement('figure'), canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    canvas.setAttribute('role','img'); canvas.setAttribute('aria-label',zh ? `简历第 ${index} 页` : `Resume page ${index}`);
    figure.append(canvas); pages.append(figure);
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    const text = await page.getTextContent(), transcript = document.createElement('p');
    transcript.className = 'accessible-text'; transcript.textContent = text.items.map(item=>item.str || '').join(' ');
    figure.append(transcript); page.cleanup();
  }
  status.hidden = true; document.body.dataset.ready = 'true';
} catch {
  status.textContent = zh ? '无法预览 PDF，请使用上方的下载或独立打开。' : 'PDF preview unavailable. Use Download or Open separately above.';
  document.body.dataset.ready = 'error';
}
