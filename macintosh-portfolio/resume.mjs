const copy = {
  zh: { title: '简历', close: '关闭', download: '下载 PDF', open: '独立打开', loading: '正在加载中文版简历…', missing: '中文版简历尚未提供。', error: '暂时无法预览这份简历，请尝试独立打开。', ready: '如果浏览器不支持 PDF 预览，可以下载或独立打开。' },
  en: { title: 'Resume', close: 'Close', download: 'Download PDF', open: 'Open separately', loading: 'Loading English resume…', missing: 'The English resume is not available yet.', error: 'Unable to preview this resume. Try opening it separately.', ready: 'If PDF preview is unavailable, download the file or open it separately.' }
};

export async function fetchResumePDF(src, signal, fetcher = fetch) {
  const response = await fetcher(src, { signal });
  if (!response.ok) throw new Error(`Resume HTTP ${response.status}`);
  const blob = await response.blob();
  if (blob.size > 20 * 1024 * 1024) throw new Error('Resume exceeds 20 MB');
  if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('Resume must be a PDF');
  return new Blob([blob], { type: 'application/pdf' });
}

export class ResumeView {
  constructor(config, doc = document, fetcher = fetch, urls = URL) {
    this.config = config; this.doc = doc; this.fetcher = fetcher; this.urls = urls;
    this.language = config.defaultLanguage; this.revision = 0;
    this.button = doc.getElementById('resumeButton');
    this.dialog = doc.getElementById('resumeDialog');
    this.frame = doc.getElementById('resumePreview');
    this.download = doc.getElementById('resumeDownload');
    this.external = doc.getElementById('resumeExternal');
    this.status = doc.getElementById('resumeStatus');
    this.button.setAttribute('aria-label', config.label);
    this.button.title = config.label; this.button.hidden = !config.enabled;
    const desktopFile = doc.getElementById('desktopResume');
    if (desktopFile) {
      desktopFile.hidden = !config.enabled;
      desktopFile.setAttribute('aria-label', config.label);
    }
    this.button.addEventListener('click', () => { this.dialog.showModal(); this.select(this.language); });
    for (const language of ['zh', 'en']) doc.getElementById(`resume-${language}`).addEventListener('click', () => this.select(language));
    doc.getElementById('resumeClose').addEventListener('click', () => this.dialog.close());
    // Escape closes the dialog without ejecting a disk in the scene behind it.
    this.dialog.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
    this.dialog.addEventListener('close', () => { this.clear(); this.button.focus({ preventScroll: true }); });
  }

  clear() {
    ++this.revision;
    this.controller?.abort();
    this.frame.removeAttribute('src'); this.frame.hidden = true;
    this.download.removeAttribute('href'); this.download.hidden = true;
    this.external.removeAttribute('href'); this.external.hidden = true;
    if (this.blobURL) this.urls.revokeObjectURL(this.blobURL);
    this.blobURL = null;
  }

  async select(language) {
    this.clear(); this.language = language;
    const revision = this.revision, labels = copy[language], file = this.config[language];
    this.dialog.lang = language === 'zh' ? 'zh-CN' : 'en';
    this.doc.getElementById('resumeTitle').textContent = labels.title;
    this.doc.getElementById('resumeClose').textContent = labels.close;
    this.download.textContent = labels.download; this.external.textContent = labels.open;
    this.frame.title = language === 'zh' ? '中文版简历 PDF' : 'English resume PDF';
    for (const value of ['zh', 'en']) this.doc.getElementById(`resume-${value}`).setAttribute('aria-pressed', String(value === language));
    if (!file.src) { this.status.textContent = labels.missing; return; }
    this.status.textContent = labels.loading;
    this.external.href = file.src; this.external.hidden = false;
    this.controller = new AbortController();
    try {
      const blob = await fetchResumePDF(file.src, this.controller.signal, this.fetcher);
      if (revision !== this.revision || !this.dialog.open) return;
      this.blobURL = this.urls.createObjectURL(blob);
      this.frame.src = `./resume-preview.html?file=${encodeURIComponent(this.blobURL)}&lang=${language}`; this.frame.hidden = false;
      this.download.href = this.blobURL; this.download.download = file.filename; this.download.hidden = false;
      this.status.textContent = labels.ready;
    } catch (error) {
      if (revision !== this.revision || error.name === 'AbortError') return;
      this.status.textContent = labels.error;
    }
  }
}
