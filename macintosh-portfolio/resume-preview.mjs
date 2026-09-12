import { getDocument, GlobalWorkerOptions } from './vendor/pdfjs/pdf.mjs';
import { renderResumePages } from './resume-pages.mjs?v=1';
GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.mjs';
const params = new URLSearchParams(location.search), zh = params.get('lang') === 'zh';
document.documentElement.lang = zh ? 'zh-CN' : 'en';
const status = document.getElementById('status');
status.textContent = zh ? '正在加载 PDF…' : 'Loading PDF…';
try {
  // Only preview the parent page's already-validated, same-origin PDF blob.
  const source = new URL(params.get('file'));
  if (source.protocol !== 'blob:' || source.origin !== location.origin) throw new Error('Invalid PDF source');
  const pdf = await getDocument({ url: source.href, isEvalSupported: false,
    cMapUrl: './vendor/pdfjs/cmaps/', cMapPacked: true,
    standardFontDataUrl: './vendor/pdfjs/standard_fonts/', wasmUrl: './vendor/pdfjs/wasm/' }).promise;
  await renderResumePages(pdf, document, { zh, pixelRatio: devicePixelRatio || 1 });
} catch {
  status.textContent = zh ? '无法预览 PDF，请使用上方的下载或独立打开。' : 'PDF preview unavailable. Use Download or Open separately above.';
  document.body.dataset.ready = 'error';
}
