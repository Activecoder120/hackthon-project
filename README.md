# AIT Campus Guide

**[Open the live campus guide](https://activecoder120.github.io/hackthon-project/)**

A mobile-first campus directory for Army Institute of Technology, Dighi, Alandi Road, Pune 411015. Built with TypeScript, Vite, and CSS to keep a single-page guide small and maintainable. No application server, database, API key, billing account, or credit card is required.

The interactive map uses **Leaflet + OpenStreetMap** with `leaflet.markercluster`. Map code, styles, and tiles load only when someone taps **Open map**. Google Maps is used only for optional outbound directions links, which need no JavaScript API key. Location data remains the single JSON source of truth and is checked with Zod at build time.

## Run

Use Node.js 22 or 24 and npm. From this directory:

```sh
npm install
npm run dev
```

No `.env.local` is necessary. `.env.example` documents that no credentials are required. Old `NEXT_PUBLIC_GOOGLE_MAPS_KEY` settings are unused and may be removed.

```sh
npm run validate-data # validate JSON and regenerate DATA_GAPS.md
npm test              # unit tests for search, filtering, distance, validation
npm run lint
npm run build         # data validation, TypeScript, Vite build
npx playwright install chromium # omit if system Chromium is available
npm run test:e2e       # real Leaflet with local tile fixtures, guides and offline tests
npm run preview       # serve dist/ on port 4173
```

If the default npm cache is unwritable, add `--cache /workspace/.npm-cache` to install commands. Playwright automatically uses `/usr/bin/chromium` where available; alternatively set `CHROMIUM_PATH`. The cloud image's browser is used because browser downloads are restricted.

For GitHub Pages path regression checks:

```sh
DEPLOY_BASE_PATH=/hackthon-project/ npm run test:e2e
# To preview a subdirectory build manually, use the same base:
DEPLOY_BASE_PATH=/hackthon-project/ npm run preview
```

## Map, usage limits, and privacy

- The map starts at the supplied campus center and zoom 17. Colored markers have category symbols, text labels, and keyboard access. Unknown coordinates are never plotted. Filter chips update both markers and the list. Clusters expand when selected; the expanded map view closes with Escape.
- The default layer is OpenStreetMap's street map. Satellite and terrain imagery are not included. Google directions links remain available in location cards.
- The standard tile URL is `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Keep the visible **© OpenStreetMap contributors** attribution and send the normal browser Referer. Requests are limited to the viewport; browser caching follows server headers. Do not add tile prefetching, bulk download, or a “download map for offline” feature. See the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
- Community-hosted tiles are free to access under that policy, have limited capacity and no service guarantee. For heavy traffic, switch the tile layer in `src/campus-map.ts` to a provider with suitable terms or self-host tiles, and update attribution and privacy information accordingly. [Report a basemap issue](https://www.openstreetmap.org/fixthemap); for errors in campus pins, maintain the campus JSON instead.
- Third-party tiles load directly from OpenStreetMap, which receives normal request metadata such as IP address, browser information, Referer, and the viewed tile area. See the [OSMF privacy policy](https://osmfoundation.org/wiki/Privacy_Policy). Campus location facts labeled Google-sourced remain attributed to their original listing source; the basemap attribution is separate.
- Location permission is requested only by **Use my location**. Coordinates stay in browser memory for the blue dot and straight-line distance calculations; they are never submitted to an application server. Opening a directions link sends the selected destination and, if permission was granted, the origin to Google Maps. There is no analytics or account system.
- Nearest-place estimates update while walking after explicit permission. The 600 m distance from campus center is an approximate proximity threshold, not a surveyed campus boundary or walking route. All maps carry **Approximate, not for navigation**.

## Directory, language, and offline behavior

Search covers English/Marathi names, building, category, and description, with exact names ranked first within category groups. Filters are multi-select. Staff placeholders appear as **Being verified** rather than broken map pins. Cards show sources and pending campus/accessibility verification.

Fresher and parent guides include entries with pending locations. Checklist progress is stored in local storage on this device only. Native modal cards constrain keyboard focus and support Escape. The mobile directory is a nonmodal sheet below the map. English/Marathi controls use checked Marathi place names when present and fall back to English. Source descriptions and some factual/technical messages remain English.

The production service worker caches the app shell and bundled location data for previously visited list/checklist use. It handles **same-origin assets only** and never caches or prefetches OpenStreetMap tiles. Offline map use is not provided; the list remains available with an offline banner. First use requires connectivity; restricted browser storage may prevent persistence. A tile error keeps the directory usable and offers a retry via **Open map**. Offline-to-online reconnection retries the currently viewed map.

## Data maintenance

See [CONTENT_GUIDE.md](CONTENT_GUIDE.md) and [DATA_GAPS.md](DATA_GAPS.md). No supplied coordinates were changed when switching map providers:

- Google-sourced coordinates: **Army Institute of Technology (main campus)**, **Aryabhatta Center – AIT Library**, **Car Parking – AIT**, and **Old Boys Hostel**.
- On-campus confirmed locations: none supplied. All four have `verified: false`; a Google listing alone does not establish campus confirmation.
- 28 staff placeholders: departments, administrative desks, hostels, food, gates, medical, sports, auditorium, labs, transport, visitor parking, and utilities. Coordinates remain null. Staff must confirm facility existence and location.
- `accessible: false` means no accessible route has been confirmed. Supplied hours are Google-sourced and should be checked before visiting.

Phone and hours are read from JSON. The institute phone is not a dedicated emergency number. The library's description mentions an auditorium, but the separate auditorium pin remains pending rather than assuming an entrance.

## GitHub Pages and other deployment

Every push to `main` runs `.github/workflows/deploy.yml`, validates and builds with `DEPLOY_BASE_PATH=/hackthon-project/`, and publishes with GitHub's official Pages actions. Pages is already enabled using **GitHub Actions** as the repository's Pages source. No repository variables or secrets are required for maps. To deploy manually, use **Actions → Deploy campus guide to GitHub Pages → Run workflow → main**.

For any other HTTPS static host, run `npm ci && npm run build` and publish `dist/`. Set `DEPLOY_BASE_PATH` for a subdirectory; default is `/`. HTTPS is required for location, service worker, share, and clipboard APIs. Do not cache `index.html` and `sw.js` indefinitely; hashed Vite assets can be cached immutably. The service worker version must change for a deliberate shell release.

Permit `tile.openstreetmap.org` in browser/network image policies. The map library is bundled locally: it does not depend on a third-party JavaScript CDN. Google directions links use `www.google.com` only when selected. No paid Google Maps API calls are made.

## Validation

- Build, TypeScript, JSON validation, lint: passed.
- Vitest: 6 tests passed.
- Playwright: 3 tests passed under `/hackthon-project/`. Tests cover lazy map loading without a key, real Leaflet marker/filter/card behavior, map expansion, language switching, directions, checklist persistence, offline reload/search/card, and tile failure/retry.
- Automated map tests use tiny local tile image fixtures. They do not fetch or scrape community tiles and do not establish remote tile availability.
- axe scans cover the loaded map/card, home directory, and mobile dark mode with **zero violations**. Contrast over gradients/images remains flagged for human review. Summaries are in `reports/`; full JSON and screenshots are generated under ignored `test-results/`, with an HTML runner report in `playwright-report/`.
- Lighthouse mobile scores for the unopened map: **99 Performance, 100 Accessibility, 100 Best Practices** (15 October 2026). Targets are Performance ≥90, Accessibility ≥95, Best Practices ≥95. See `reports/lighthouse-summary.json` for the latest measured scope and scores. An unopened map does not include the cost of loading Leaflet or external imagery. Scores vary with load and hardware.

Reproduce a mobile audit against a running production preview (which loads no map tiles until selected):

```sh
CHROME_PATH=/usr/bin/chromium npx lighthouse http://127.0.0.1:4173/hackthon-project/ \
  --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
  --output=html --output-path=/tmp/ait-lighthouse.html
```

Use `/` instead when building without `DEPLOY_BASE_PATH`. Automated results do not establish full WCAG 2.2 AA conformance or safe campus routes; human keyboard/screen-reader and campus checks remain necessary.
