import { loadConfig, applyConfig } from './configuration.mjs?v=5';
import { HeroView } from './hero.mjs?v=19';
import { ResumeView } from './resume.mjs?v=3';

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
  document.getElementById('hero3d').dataset.loadState = 'error';
  console.error(error);
}
