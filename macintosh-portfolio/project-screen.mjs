export const SCREEN_DEFAULTS = Object.freeze({
  titleSize: 40, descriptionSize: 17, buttonSize: 18, buttonText: 'View project',
  image: { src: '', alt: '', fit: 'contain' }
});

const artworkRequests = new WeakMap();

/** Render promptly on slow connections, then repaint when the image arrives. */
export async function projectScreen(project, doc = document, { onArtworkReady = () => {}, imageTimeout = 6000 } = {}) {
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
  const request = {};
  artworkRequests.set(artwork, request);
  const isCurrent = () => artworkRequests.get(artwork) === request;
  for (const property of ['position', 'width', 'height', 'left', 'top']) artwork.style[property] = '';
  card.classList.toggle('without-artwork', !image.src);
  doc.getElementById('pcCover').dataset.fit = image.fit;
  artwork.alt = image.alt; artwork.hidden = false; fallback.hidden = true;
  if (!image.src) { artwork.removeAttribute('src'); return; }
  artwork.crossOrigin = 'anonymous';
  // Keep the URL stable when html2canvas clones a root page using a base tag.
  artwork.src = doc.baseURI ? new URL(image.src, doc.baseURI).href : image.src;
  let timeout;
  const showArtwork = () => {
    if (!isCurrent()) return;
    artwork.hidden = false; fallback.hidden = true;
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
  };
  const showFallback = (loading = false) => {
    if (!isCurrent()) return;
    artwork.hidden = true; fallback.hidden = false;
    fallback.textContent = loading ? 'Loading preview…' : image.alt || 'Preview unavailable';
  };
  const decoded = artwork.decode();
  try {
    const ready = await Promise.race([decoded.then(() => true), new Promise(resolve => {
      timeout = setTimeout(() => resolve(false), imageTimeout);
    })]);
    if (!isCurrent()) return;
    if (ready) showArtwork();
    else {
      showFallback(true);
      // A timeout is not a failed image. Recover without requiring reinsertion.
      decoded.then(() => {
        if (!isCurrent()) return;
        showArtwork(); onArtworkReady();
      }, () => {
        if (!isCurrent()) return;
        showFallback(); onArtworkReady();
      });
    }
  } catch {
    showFallback();
  } finally {
    clearTimeout(timeout);
  }
}
