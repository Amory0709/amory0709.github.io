import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';

// Browser-level release check for the public Engineering profile.
// Keep the interactive 3D home page outside this smoke test: its WebGL
// performance cannot be evaluated reliably on shared CI hardware.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const screenshots = join(repoRoot, 'macintosh-portfolio', 'artifacts', 'engineering-smoke');
const address = 'http://127.0.0.1:4177/macintosh-portfolio/engineering.html';
const server = spawn('python3', ['-m', 'http.server', '4177', '--bind', '127.0.0.1'], {
  cwd: repoRoot,
  stdio: 'ignore'
});
let browser;

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error('Local static server exited unexpectedly');
    try {
      const response = await fetch(address);
      if (response.ok) { ready = true; break; }
    } catch { /* server not ready yet */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, 'Local profile page did not become available');
  await mkdir(screenshots, { recursive: true });
  browser = await chromium.launch({ headless: true });

  for (const { name, width, height } of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'small-mobile', width: 320, height: 680 }
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const response = await page.goto(address, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 200, name + ': profile page should load');
    assert.match(await page.locator('h1').innerText(), /I build systems,/);
    assert.equal(await page.locator('main#main').count(), 1);
    assert.equal(await page.locator('a[href*="3d-editor/pull/25"]').count(), 1);
    assert.equal(await page.locator('a[href*="reservoir-volume-lab/pull/1"]').count(), 1);

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    assert.ok(
      dimensions.document <= dimensions.viewport + 2 && dimensions.body <= dimensions.viewport + 2,
      name + ': horizontal overflow ' + JSON.stringify(dimensions)
    );

    await page.locator('a.skip').focus();
    assert.equal(await page.locator('a.skip').evaluate(el => el === document.activeElement), true);
    await page.screenshot({
      path: join(screenshots, name + '.png'),
      fullPage: true,
      animations: 'disabled'
    });
    console.log(name + ': loaded; content, navigation, focus and width checks passed');
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
