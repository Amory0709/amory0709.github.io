/** Keep the first-paint loading illustration in sync with actual model readiness. */
export function setSceneLoadState(doc, state) {
  const canvas = doc.getElementById('hero3d');
  if (canvas) canvas.dataset.loadState = state;
  const loader = doc.getElementById('sceneLoader');
  if (!loader) return;
  loader.dataset.state = state;
  loader.setAttribute('aria-hidden', state === 'ready' ? 'true' : 'false');
  const title = doc.getElementById('loaderTitle');
  const note = doc.getElementById('loaderNote');
  if (title) title.textContent = state === 'error' ? 'The Macintosh couldn’t wake up.' : 'Waking up the Macintosh';
  if (note) note.textContent = state === 'error' ? 'Please reload to try again.' : 'A little retro magic is on its way.';
}
