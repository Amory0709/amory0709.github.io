/** Render every page in the scroll area and keep explicit page controls in sync. */
export async function renderResumePages(pdf, doc = document, { zh = false, pixelRatio = 1 } = {}) {
  const pages = doc.getElementById('pages'), status = doc.getElementById('status');
  const navigation = doc.getElementById('navigation'), select = doc.getElementById('pageNumber');
  const previous = doc.getElementById('previousPage'), next = doc.getElementById('nextPage');
  const label = index => zh ? `第 ${index} / ${pdf.numPages} 页` : `Page ${index} of ${pdf.numPages}`;
  const figures = [], canvases = [];
  pages.replaceChildren(); select.replaceChildren();
  pages.setAttribute('aria-label', zh ? '简历全部页面' : 'All resume pages');
  navigation.setAttribute('aria-label', zh ? '简历翻页' : 'Resume page navigation');
  select.setAttribute('aria-label', zh ? '选择页码' : 'Choose page');
  previous.textContent = zh ? '上一页' : 'Previous';
  next.textContent = zh ? '下一页' : 'Next';
  // A failure on one page must never prevent later pages from being displayed.
  for (let index = 1; index <= pdf.numPages; index++) {
    const figure = doc.createElement('figure'), caption = doc.createElement('figcaption');
    const canvas = doc.createElement('canvas'), option = doc.createElement('option');
    figure.id = `page-${index}`; figure.dataset.pageNumber = String(index);
    caption.textContent = label(index);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', zh ? `简历第 ${index} 页` : `Resume page ${index}`);
    canvas.width = 595; canvas.height = 842;
    figure.append(caption, canvas); pages.append(figure);
    option.value = String(index); option.textContent = label(index); select.append(option);
    figures.push(figure); canvases.push(canvas);
  }
  let current = 1;
  const update = index => {
    current = Math.max(1, Math.min(pdf.numPages, index));
    select.value = String(current); previous.disabled = current === 1; next.disabled = current === pdf.numPages;
  };
  const go = index => {
    update(index);
    figures[current - 1].scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  previous.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  select.addEventListener('change', () => go(Number(select.value)));
  pages.addEventListener('scroll', () => {
    const boundary = pages.getBoundingClientRect().top + pages.clientHeight / 3;
    let index = 1;
    figures.forEach((figure, i) => { if (figure.getBoundingClientRect().top <= boundary) index = i + 1; });
    update(index);
  }, { passive: true });
  pages.addEventListener('keydown', event => {
    const targets = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 1, End: pdf.numPages };
    if (event.target !== pages || event.ctrlKey || event.metaKey || event.altKey || !(event.key in targets)) return;
    event.preventDefault(); go(targets[event.key]);
  });
  update(1); navigation.hidden = false;
  let rendered = 0;
  for (let index = 1; index <= pdf.numPages; index++) {
    let page;
    try {
      status.textContent = zh ? `正在加载第 ${index} / ${pdf.numPages} 页…` : `Loading page ${index} of ${pdf.numPages}…`;
      page = await pdf.getPage(index);
      const original = page.getViewport({ scale: 1 });
      const width = Math.min(900, Math.max(200, pages.clientWidth - 32));
      const viewport = page.getViewport({ scale: width / original.width * Math.min(pixelRatio || 1, 2) });
      const canvas = canvases[index - 1];
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      rendered++;
      // Text extraction is optional and cannot interrupt the remaining pages.
      try {
        const text = await page.getTextContent(), transcript = doc.createElement('p');
        transcript.className = 'accessible-text'; transcript.textContent = text.items.map(item => item.str || '').join(' ');
        figures[index - 1].append(transcript);
      } catch { /* Keep rendering the next page. */ }
    } catch {
      canvases[index - 1].hidden = true;
      const message = doc.createElement('p'); message.className = 'page-error';
      message.textContent = zh ? `第 ${index} 页加载失败，请下载 PDF 查看。` : `Page ${index} could not load. Download the PDF to view it.`;
      figures[index - 1].append(message);
    } finally { page?.cleanup(); }
  }
  status.textContent = rendered === pdf.numPages
    ? (zh ? `共 ${pdf.numPages} 页 · 向下滚动或使用上方翻页` : `${pdf.numPages} pages · Scroll or use the page controls above`)
    : (zh ? `已显示 ${rendered} / ${pdf.numPages} 页，请下载查看完整简历。` : `${rendered} of ${pdf.numPages} pages displayed. Download for the complete resume.`);
  doc.body.dataset.ready = rendered === pdf.numPages ? 'true' : 'error';
  doc.body.dataset.pageCount = String(pdf.numPages);
  return { total: pdf.numPages, rendered };
}
