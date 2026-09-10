# Mengyu Han — Macintosh Portfolio

Live homepage: https://amory0709.github.io/

Interactive Macintosh portfolio based on [MyPortfolioTemplates](https://github.com/Amory0709/MyPortfolioTemplates). Click a floppy to explore a project, then open its interactive page inside the CRT. Scroll to zoom; the résumé icon supports configurable Chinese and English PDFs (currently placeholders).

On phones, waiting disks appear in a single horizontally scrollable tray below the computer. Swipe to reach more projects, then tap to insert. The tray stays available while viewing introductions and live projects; its scrolling does not zoom the computer or create page-level overflow. Desktop disk arrangements are unchanged.

## Update the homepage

Edit [`macintosh-portfolio/config.json`](macintosh-portfolio/config.json) to change profile details, links, résumé files, project descriptions, thumbnails and floppy colors. See the [template documentation](macintosh-portfolio/README.md) for all options.

The root `index.html` shares runtime files with `/macintosh-portfolio/` through a base URL. Keep the two HTML entries synchronized when changing markup, retaining the root base tag. GitHub Actions deploys the repository from `master` with Git LFS enabled.

The eight featured works are Sound of Humanity, Electoral Map, BLUEbikes Availability, SLB 100 Family Day, MeshBVH X-Ray, WhatIf Studio, High Performance Points and 2024 IDPwD. 3D Editor is no longer featured. Existing project directories and historical assets remain intact so earlier project links continue to work.

## WhatIf Studio frontend preview

Preview: https://amory0709.github.io/what-if-studio/

This is a static frontend export of [WhatIfStudio](https://github.com/Amory0709/WhatIfStudio), not a deployed AI backend. The portrait gallery and detail navigation work; photo upload, camera capture and face-swap generation are intentionally disabled and labeled as unavailable. No photos are collected by this preview.

Source revision: `c584fff340b6e71f8ea6fda10cfcce21bb6c0f65`. The deployment adaptation is saved in [`deployment/whatif-pages.patch`](deployment/whatif-pages.patch): subpath-safe assets and navigation, static route exports, offline-preview safeguards, bundled fonts and Next.js 14.2.35.

To rebuild in a separate clone of WhatIfStudio at that revision:

```sh
git apply /absolute/path/to/whatif-pages.patch
npm ci --ignore-scripts
NEXT_PUBLIC_BASE_PATH=/what-if-studio NEXT_PUBLIC_STATIC_DEMO=true NEXT_TELEMETRY_DISABLED=1 npm run build:web
```

Copy only `apps/web/out/` into this repository's `what-if-studio/` directory, review the changes, then commit. Do not publish server credentials, private uploads or model storage. Re-enabling generation requires separately hosting the Python/AI service; GitHub Pages cannot run it.

## Local verification

Serve this repository root with `python3 -m http.server 4177 --bind 127.0.0.1` and open http://localhost:4177/. Run the template tests with `npm --prefix macintosh-portfolio test`.
