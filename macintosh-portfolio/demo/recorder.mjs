import html2canvas from '../vendor/html2canvas.esm.js';

// Explicit opt-in recording mode. Captures only this site's own canvases/DOM,
// never the desktop, other windows, microphone, camera or system audio.
export async function installRecorder(hero) {
  const panel = document.createElement('aside');
  panel.dataset.html2canvasIgnore = 'true';
  panel.style.cssText = 'position:fixed;right:20px;top:110px;z-index:100;padding:14px 18px;background:white;border:1px solid #bbb;border-radius:8px;font:13px system-ui;box-shadow:0 4px 24px #0001';
  const button = document.createElement('button');
  button.textContent = 'Record 22-second demo';
  button.style.cssText = 'padding:8px 12px;border:1px solid #222;border-radius:4px;background:#111;color:white;cursor:pointer';
  button.disabled = true;
  const status = document.createElement('p');
  status.id = 'recordingStatus';
  status.textContent = 'Waiting for the scene…';
  status.style.marginTop = '8px';
  panel.append(button, status); document.body.append(panel);
  await document.fonts.ready;
  await new Promise((resolve, reject) => {
    const check = () => {
      if (hero.canvas.dataset.loadState === 'ready') resolve();
      else if (hero.canvas.dataset.loadState === 'error') reject(new Error('Scene failed to load'));
      else requestAnimationFrame(check);
    };
    check();
  });
  button.disabled = false; status.textContent = 'Ready · 1920 × 1080 · silent';

  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Preparing clean capture…';
    let stream, recorder;
    const render = hero.renderer.render.bind(hero.renderer);
    const oldReducedMotion = hero.reducedMotion;
    try {
      if (innerWidth !== 1536 || innerHeight !== 1024) throw new Error('Set the recording viewport to 1536 × 1024.');
      hero.eject(); hero.setHovered(-1);
      hero.targetPointer.set(0, 0); hero.pointer.set(0, 0);
      hero.reducedMotion = false;
      await new Promise(resolve => setTimeout(resolve, 800));
      const page = await html2canvas(document.querySelector('.page'), {
        scale: 2, backgroundColor: '#fafafa', logging: false,
        ignoreElements: element => element === hero.canvas || element.id === 'screenOverlay',
        scrollX: 0, scrollY: 0, windowWidth: 1536, windowHeight: 1024
      });
      const output = document.createElement('canvas');
      output.width = 1920; output.height = 1080;
      const context = output.getContext('2d', { alpha: false });
      context.imageSmoothingQuality = 'high';
      const rect = hero.canvas.getBoundingClientRect();
      const scale = 1080 / 1024, offset = (1920 - 1536 * scale) / 2;
      const draw = () => {
        context.fillStyle = '#fafafa'; context.fillRect(0, 0, 1920, 1080);
        context.drawImage(page, 0, 0, 1536 * 2, 1024 * 2, offset, 0, 1536 * scale, 1080);
        context.drawImage(hero.canvas, offset + rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale);
      };
      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('This browser cannot record WebM.');
      stream = output.captureStream(30);
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12000000 });
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      const recorded = new Promise((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        recorder.onerror = event => reject(event.error || new Error('Recording failed'));
      });
      let red = false, blue = false, green = false, ejected = false, finishing = false;
      const start = performance.now();
      hero.renderer.render = (scene, camera) => {
        render(scene, camera);
        if (finishing) return;
        draw();
        const t = (performance.now() - start) / 1000;
        status.textContent = `Recording ${Math.min(22, t).toFixed(1)} / 22 s`;
        // Reuse the real application's hover, insertion, switching and ejection.
        if (t > 1.5 && t < 3.1) hero.setHovered(0);
        if (t >= 3.1 && !red) { red = true; hero.setHovered(-1); hero.insert(0); }
        if (t >= 10.3 && !blue) { blue = true; hero.insert(4); }
        if (t >= 14.8 && !green) { green = true; hero.insert(3); }
        if (t >= 18.7 && !ejected) { ejected = true; hero.eject(); }
        // Camera focus now comes entirely from the normal app interaction.
        hero.targetPointer.set(t < 19 ? Math.sin(t * 0.33) * 0.32 : 0, Math.sin(t * 0.22) * 0.1);
        if (t >= 22) { finishing = true; recorder.stop(); }
      };
      recorder.start(500);
      const blob = await recorded;
      hero.renderer.render = render;
      stream.getTracks().forEach(track => track.stop());
      status.textContent = 'Saving capture…';
      const response = await fetch('/__demo_capture', { method: 'POST', headers: { 'Content-Type': 'video/webm' }, body: blob });
      if (!response.ok) throw new Error(`Save failed: ${response.status}`);
      status.textContent = `Saved · ${(blob.size / 1024 / 1024).toFixed(1)} MB · ready for MP4 export`;
      document.body.dataset.demoRecording = 'saved';
    } catch (error) {
      status.textContent = error.message;
      document.body.dataset.demoRecording = 'error';
      console.error(error);
    } finally {
      hero.renderer.render = render;
      if (recorder?.state === 'recording') recorder.stop();
      stream?.getTracks().forEach(track => track.stop());
      hero.targetPointer.set(0, 0); hero.reducedMotion = oldReducedMotion;
      button.disabled = false;
    }
  });
}
