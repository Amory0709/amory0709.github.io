# Mengyu Han — Macintosh Portfolio

Live homepage: https://amory0709.github.io/

Interactive Macintosh portfolio based on [MyPortfolioTemplates](https://github.com/Amory0709/MyPortfolioTemplates). Click a floppy to explore a project, then open its interactive page inside the CRT. Scroll to zoom; the résumé icon opens Mengyu Han's Chinese and English résumés with language switching, preview and download.

Phones preserve the desktop 3D composition: the computer stays centered and stationary while only the waiting row of real, tilted floppy disks slides horizontally. Swipe the disks to reach a project, then tap to insert it from its current position. There is no separate thumbnail tray or page-level overflow. Desktop layouts remain unchanged.

## Update the homepage

Edit [`macintosh-portfolio/config.json`](macintosh-portfolio/config.json) to change profile details, links, résumé files, project descriptions, thumbnails and floppy colors. See the [template documentation](macintosh-portfolio/README.md) for all options.

The root `index.html` shares runtime files with `/macintosh-portfolio/` through a base URL. Keep the two HTML entries synchronized when changing markup, retaining the root base tag. GitHub Actions deploys the repository from `master` with Git LFS enabled.

The eight featured works run newest to oldest: WhatIf Studio, SLB 100 Family Day, MeshBVH X-Ray, High Performance Points, 2024 IDPwD, Sound of Humanity, Electoral Map and BLUEbikes Availability. The `projects` array controls the disk order and previous/next navigation. 3D Editor is no longer featured. Existing project directories and historical assets remain intact so earlier project links continue to work.

Ordering uses repository creation or the earliest available project record, not recent maintenance/deployment dates: WhatIf Studio (2026-08-09), Family Day (2026-07-28), MeshBVH (2026-06-30), High Performance Points (2026-02-02), IDPwD (2024-11-30), Sound of Humanity (existing thumbnail added 2020-11-05), Electoral Map and BLUEbikes (both added 2020-02-21; original relative order retained). These are ordering references, not claimed completion dates.

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
