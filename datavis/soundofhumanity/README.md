# The sound of life

Static simulation restored from the portfolio reference image at `../../img/SoundOfHumanity.png`. The portfolio preview also reuses that preserved reference image.

## Run and verify

From the repository root:

```sh
python3 -m http.server 4177 --bind 127.0.0.1
node --test datavis/soundofhumanity/tests/simulation.test.cjs
```

Open `http://127.0.0.1:4177/datavis/soundofhumanity/`. No build or remote runtime assets are required.

- **about** explains the simulation and provides a sound toggle.
- **table** shows elapsed time, birth/death type, county and state, and population after each event. Filter by event type. It retains the latest 1,000 records; headline totals include all events.
- Both dialogs pause the simulation and physics, support Escape and backdrop dismissal, and return focus to the opening button.
- A filled pulse expands and fades at a county location. After 1.8 seconds, the same-sized dot is released from that exact position into gravity. The label fades after the release. Simultaneous labels avoid each other; a thin leader connects a displaced label to its unchanged map location.
- Invisible left, right and floor boundaries catch the dots. Matter.js resolves contacts and puts resting bodies to sleep, so the dots support one another and form a stable pile. No container outline is drawn and no dots are relocated to a separate box.
- Falling motion preserves the previous sketch's 60 Hz parameters: 0.5 px/frame² gravity (1,800 px/s²), random horizontal release velocity from −2 to +2 px/frame, and 0.6 restitution. There is no air braking; low contact friction and free rotation allow bouncing and rolling before settling. These parameters come from the version in this repository, not the unavailable historical WashU source.
- Resizing reprojects the map and active events, rescales the existing pile and in-flight velocities, and rebuilds its bounds. Simulation speed changes event frequency; physics runs at a fixed 240 Hz time step with tolerance for fractional frame durations.
- Desktop composition uses the reference's 1440 × 737 proportions. Its vertical layout is capped at that aspect ratio so a tall window does not spread the header, controls, statistics and map apart. Phone layouts keep the controls above the map. The invisible floor remains attached to the viewport.
- The about/table buttons match the reference rectangles at 1440 × 737: left 1166 px; top 50.5/114.5 px; width 101/94 px; height 46 px. Desktop button dimensions, padding, text and gap scale together; the outline stays 2 px. Compact screens retain horizontal buttons with a 46 px minimum height.
- Ramaraja is bundled locally after comparing the reference's title, numbers and small text against serif font samples. Font size, weight, line height and number spacing are tuned separately; the percent sign uses the original's smaller scale. This is a visual match, not recovered original font metadata.

## Data and restoration limits

This is a historical simulation, not live demographic data. The main page labels the counter “simulated population,” identifies the 2020 setting, and points to **about** for sources. The table explicitly identifies its rows as generated events.

Sources checked September 13, 2026:

- **Birth/death intervals (8 and 11 seconds):** retained from the previous implementation and consistent with the U.S. Census Bureau’s projections for **January 2020**, published **December 31, 2019** in [its New Year population article](https://www.census.gov/library/stories/2019/12/happy-new-year-330-million-plus-people-in-united-states.html). This verifies a contemporary official reference for these values, not the unavailable original author’s citation. They are rounded national projected averages, not 2020 annual observations or current rates.
- **Starting population (328,731,186) and simulation timestamp (April 8, 2020):** retained from the [previous implementation](https://github.com/Amory0709/amory0709.github.io/blob/e55f856/datavis/soundofhumanity/js/main.js); the [preserved project image](../../img/SoundOfHumanity.png) is the visual reference. The exact population’s original statistical source and reference date remain unverified. The simulation timestamp does not establish a statistical vintage, and the Census article above is not a source for this starting population.
- **Geography:** displayed state outlines use [US Atlas 1.0.2](https://github.com/topojson/us-atlas/tree/v1.0.2), based on 2015 Census boundaries. County names and event origins use [US Atlas 3.0.1](https://github.com/topojson/us-atlas/tree/v3.0.1), based on 2017 Census boundaries. These are geographic inputs, not county-level birth/death counts.
- **Current reference:** the [U.S. Census Bureau Population Clock](https://www.census.gov/popclock/) provides current official projections. It is linked for context; this simulation does not fetch or import its changing figures.

The counter is starting population + simulated births − simulated deaths. Migration is omitted. County locations are uniformly sampled from counties with valid projected locations; they are not population-weighted estimates. Dots and table rows are illustrative generated events, not historical or live individual records.

The original `washuvis.github.io/soundofhumanity/draft-v4/` and its source repository were unavailable during restoration. Dialog content and animation timing are reconstructed from the surviving image and requested behavior, rather than claimed to be recovered original source. The static reference contains different event counts, positions and timing; those are not hard-coded into the running simulation.

## Bundled dependencies

- D3 5.16.0 — BSD-3-Clause, `vendor/d3-LICENSE`
- TopoJSON Client 3.1.0 — ISC, `vendor/topojson-LICENSE`
- Matter.js 0.20.0 — MIT, `vendor/matter-LICENSE`
- US Atlas 3.0.1 county names and event locations (2017 Census geometry) — ISC, `data/LICENSE`; https://github.com/topojson/us-atlas/tree/v3.0.1
- US Atlas 1.0.2 state outlines (2015 Census geometry) — BSD-3-Clause, `data/us-atlas-v1-LICENSE`. `data/states-reference.json` is derived from https://d3js.org/us-10m.v1.json: state polygons were extracted, unprojected with `d3.geoAlbersUsa().scale(1280).translate([480, 300]).invert`, and rounded to six decimal places. These older simplified coastlines more closely match the preserved screenshot; event names and geographic origins still use the county data above.
- Ramaraja — SIL Open Font License, `fonts/ramaraja-OFL.txt`; https://fonts.google.com/specimen/Ramaraja

Only data geometry and simulation graphics are drawn in SVG/canvas. Fonts, dependencies and geography are served locally, so an unavailable CDN does not leave the page blank.
