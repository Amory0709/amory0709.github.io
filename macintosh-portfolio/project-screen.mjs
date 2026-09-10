export const SCREEN_DEFAULTS = Object.freeze({
  titleSize: 40, descriptionSize: 17, buttonSize: 18, buttonText: 'View project',
  image: { src: '', alt: '', fit: 'contain' }
});

/** Apply editable text/artwork before rasterizing the real CRT surface. */
export async function projectScreen(project, doc = document) {
  const settings = project.screen || SCREEN_DEFAULTS;
  const card = doc.getElementById('projectCard');
  for (const [name, value] of [['title', settings.titleSize], ['description', settings.descriptionSize], ['button', settings.buttonSize]]) {
    card.style.setProperty(`--screen-${name}-size`, `${value}px`);
  }
  doc.getElementById('pcTitle').textContent = project.title;
  doc.getElementById('pcDesc').textContent = project.desc;
  const button = doc.getElementById('pcCta');
  button.textContent = `${settings.buttonText} →`;
  button.hidden = project.link === '#' && !(project.embed?.enabled && project.embed.url);
  const artwork = doc.getElementById('projectArtwork');
  const fallback = doc.getElementById('artworkFallback');
  const image = settings.image;
  for (const property of ['position', 'width', 'height', 'left', 'top']) artwork.style[property] = '';
  card.classList.toggle('without-artwork', !image.src);
  doc.getElementById('pcCover').dataset.fit = image.fit;
  artwork.alt = image.alt; artwork.hidden = false; fallback.hidden = true;
  if (!image.src) { artwork.removeAttribute('src'); return; }
  artwork.crossOrigin = 'anonymous';
  artwork.src = image.src;
  let timeout;
  try {
    await Promise.race([artwork.decode(), new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Preview image timed out')), 6000);
    })]);
    if (artwork.getAttribute('src') !== image.src) return;
    if (image.fit !== 'concept') {
      // html2canvas does not implement object-fit. Resolve its geometry before
      // rasterizing the CRT so custom landscape/portrait images never stretch.
      const cover = doc.getElementById('pcCover');
      const scale = (image.fit === 'cover' ? Math.max : Math.min)(
        cover.clientWidth / artwork.naturalWidth, cover.clientHeight / artwork.naturalHeight);
      const width = artwork.naturalWidth * scale, height = artwork.naturalHeight * scale;
      Object.assign(artwork.style, { position: 'absolute', width: `${width}px`, height: `${height}px`,
        left: `${(cover.clientWidth-width)/2}px`, top: `${(cover.clientHeight-height)/2}px` });
    }
  } catch {
    // Do not silently drop a CORS-blocked or missing preview from the texture.
    if (artwork.getAttribute('src') !== image.src) return;
    artwork.hidden = true; fallback.hidden = false;
    fallback.textContent = image.alt || 'Preview unavailable';
  } finally {
    clearTimeout(timeout);
  }
}
