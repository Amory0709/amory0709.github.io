# Macintosh Portfolio

An interactive, single-scene Three.js portfolio built around the supplied Macintosh 128K and floppy-disk GLB assets.

Published preview: https://amory0709.github.io/macintosh-portfolio/

This self-contained folder is deployed by the repository's existing GitHub Pages workflow. The root homepage and other project folders are unchanged. Local QA captures, the excluded second concept image, scratch tools, and raw video recordings are not part of this publication.

## Run locally

```bash
cd macintosh-portfolio
python3 -m http.server 4173
```

Then open `http://localhost:4173`. Click a colored floppy to insert it into the Mac and reveal its project card; click it again or press Escape to eject it.

After insertion, the camera smoothly moves closer to the CRT and holds that view. Ejecting returns to the overview. Use Previous / Next below the canvas to switch projects while zoomed in. Camera motion is interruptible, survives responsive resize, and becomes immediate when reduced motion is enabled. The demo recorder now reuses this same interaction instead of applying its own zoom choreography.

Scroll over the 3D canvas to zoom: wheel up moves closer, wheel down moves farther away. Mouse wheels and trackpads share a smooth, bounded range (desktop camera Z: 3.45–5.10; mobile: 4.20–5.85). At either limit, continued scrolling in that direction scrolls the page normally; outside the canvas, scrolling is unaffected. Browser zoom shortcuts and horizontal gestures are not intercepted. Manual input takes over an automatic camera move without a jump. Escape restores the overview even when no disk is inserted; insertion/ejection still restore their usual framing.

Do not open `index.html` directly with `file://`: browsers restrict loading GLB assets and ES modules there. Runtime libraries are vendored locally; no CDN or build step is required.

## Scene fixes (2026-09-08)

- The screen is a texture on the supplied model's original curved CRT mesh, not a floating HTML overlay. It follows the camera and model and is naturally occluded by the casing.
- Floppy meshes are baked into the plastic shell's coordinate frame. The shutter is at the top in the row, and the disk becomes horizontal with its shutter leading into the drive.
- Imported GLB lights are not duplicated. The selected concept's unlabelled shells omit the source paper label; the optional labelled variant also has a measured positive surface gap and polygon offset to avoid coplanar depth conflict.
- Each disk owns its own interrupted/switching animation; Escape and responsive resize preserve correct return positions. Static disks do not continuously wiggle.
- Inserted disk size is measured from the actual drive: 94% of its opening width, with 42% of the disk depth remaining visible. Scale interpolates during approach/ejection; foreground sizes are unchanged, and viewport changes cannot shrink an inserted disk.
- References: first image (`reference/ui-mockup.png`) for the main layout; third (`reference/ui-mockup-inserted.png`) for the inserted-state direction and its existing illustration. The second image is explicitly excluded. Source GLBs are unchanged.

## Verification

```bash
npm test
```

Twenty geometry/animation tests cover real GLB transforms, inserted width, scale interpolation, rapid switching, camera focus/reversal, reduced motion, responsive resize, project navigation, wheel normalization, zoom limits, manual takeover, and scroll handoff. Browser QA captures remain in the original local development workspace.

## Personalize

Edit `index.html` to replace the template `Alex Morgan` details, social links, and the `projects` array. Each project needs a title, description, destination link, and display color. The project-card illustration currently reuses the selected concept artwork. Projects without a real destination hide their outbound CTA.

The geometry adapter is specific to the supplied assets and named material/mesh landmarks; replacing either GLB requires recalibrating those landmarks in `scene-geometry.mjs` and `hero.mjs`.

## Attribution

The included footer preserves the original model credits and licenses.
