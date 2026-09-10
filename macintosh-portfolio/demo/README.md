# Macintosh Portfolio — demo video

Silent 22-second capture of the actual Three.js application, exported as a 1920 × 1080 H.264 MP4. No desktop, other windows, system audio, microphone or camera is captured.

Export verified: exactly 22.000 seconds, 660 frames at 30 fps, H.264 High / yuv420p, 1,642,281 bytes, fast-start metadata. Full decode completed without errors; the browser player reported 1920 × 1080, duration 22, readyState 4 and no playback error. Key frames were visually reviewed in `contact-sheet.jpg`. The local playback page is `watch.html`.

Sequence:

- 0–3 s: overview and red floppy hover.
- 3–10 s: insert red disk; move closer to the actual curved CRT and return to the overview.
- 10–15 s: switch to the blue disk and show its project.
- 15–19 s: switch to the green disk and show its project.
- 19–22 s: eject and return to the classic desktop.

`recorder.mjs` is only loaded with `?demo=record`. It composites the actual WebGL output with the page's header, records with browser MediaRecorder, and sends the WebM solely to the loopback recording server. The saved MP4 above predates the live zoom feature and contains its original camera choreography. Future recordings use the normal application's insertion/ejection camera focus; the recorder no longer overrides the camera separately.

To record again from the workspace root, run `node work/demo-server.mjs`, open `http://localhost:4175/?demo=record` at 1536 × 1024, and use the Record button. The server accepts only a fixed WebM destination from its same-origin page.

## Credits to retain when sharing

- Macintosh 128K Computer (1984), Daz: https://skfb.ly/6SLnE — CC BY-NC 4.0: https://creativecommons.org/licenses/by-nc/4.0/
- Floppy Disk 3.5", Kyan0s: https://skfb.ly/Jnrs — CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
- Portfolio concept: https://github.com/Amory0709/MyPortfolioTemplates/tree/main/macintosh-portfolio

The model licenses are unchanged; in particular the Macintosh asset is noncommercial. This demo does not establish permission for commercial use.
