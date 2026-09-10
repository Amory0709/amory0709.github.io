import { loadConfig, applyConfig } from './configuration.mjs?v=6';
import { HeroView } from './hero.mjs?v=26';
import { ResumeView } from './resume.mjs?v=4';
import { setSceneLoadState } from './scene-loading.mjs';

try {
  const config = await loadConfig();
  applyConfig(config);
  new ResumeView(config.resume);
  const hero = new HeroView(document.getElementById('hero3d'), config.projects);
  if (new URLSearchParams(location.search).get('demo') === 'record') {
    const { installRecorder } = await import('./demo/recorder.mjs');
    await installRecorder(hero);
  }
} catch (error) {
  document.getElementById('sceneStatus').textContent = `Configuration / startup error: ${error.message}`;
  setSceneLoadState(document, 'error');
  console.error(error);
}
