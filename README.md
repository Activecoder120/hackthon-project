# AIT Campus Guide

A mobile-first directory for Army Institute of Technology, Dighi, Alandi Road, Pune 411015. Built with plain TypeScript, Vite and CSS to keep a single-page campus guide small and maintainable. No application server or database is required. Zod validates the shared JSON at build time; Google Maps is requested only after the user opens the map.

## Run

Use Node.js 22 or 24 and npm. From this directory:

```sh
npm install
cp .env.example .env.local
# Optionally enter NEXT_PUBLIC_GOOGLE_MAPS_KEY in .env.local
npm run dev
```

Enable Maps JavaScript API and billing for your Google Cloud project. **Restrict the browser key to your site's HTTP referrers and to the Maps JavaScript API**; allow local development referrers separately. A browser key is public and must not be treated as a server secret. Vite exposes only the requested `NEXT_PUBLIC_` prefix and `VITE_` variables. Missing keys never fail a build: the directory, search and guides work without a map. Keyed map, clustering, satellite/terrain and Google interactions need a real authorized key and online access.

```sh
npm run validate-data # Zod validation + regenerate DATA_GAPS.md
npm test              # unit tests
npm run lint
npm run build         # validates, typechecks, builds dist/
npx playwright install chromium
npm run test:e2e      # fallback smoke, hostel card, persistence, axe
npm run preview      # production build on port 4173
```

If the default npm cache is unwritable, add `--cache /workspace/.npm-cache` to install commands. Tests automatically use `/usr/bin/chromium` when available; alternatively set `CHROMIUM_PATH` to a browser executable. The cloud browser download was blocked by network policy, so validation uses the installed system Chromium. The Playwright test exercises the missing-key path; a live Google map is intentionally not mocked or claimed to be validated. See validation results below.

## Behavior and privacy

Search covers English/Marathi names, building, category and description; exact English names rank first. Category chips are multi-select. Known coordinates get markers with category symbols and labels; staff placeholders remain in the directory. All entries carry a campus-verification warning until checked. Accessible routes are unconfirmed initially.

Quick guides link to place cards, including entries with pending locations. Checklist progress lives in local storage on this device. Native modal dialogs constrain keyboard focus and support Escape. The mobile directory is a nonmodal sheet below the map, so it intentionally allows focus to other page controls. Language switching translates primary controls and uses Marathi place names when present; names and factual content remain English when no checked translation exists. Some factual details, source descriptions and technical error messages remain English.

Location permission is requested only by “Use my location”. Coordinates stay in browser memory and are used for straight-line distances and the blue dot. The map library sends map-view requests to Google. Directions opens Google Maps and includes the current origin if available, so Google receives that route. There is no analytics, account system, or first-party location collection. The nearest listed place is an approximate straight-line result within 600 m of campus center, not a verified campus boundary or walking route. Location updates while walking after explicit permission.

Production service-worker caching supports previously visited list/checklist use without internet. Google map tiles are never cached by this app. First use requires connectivity; private browsing/storage restrictions may prevent persistence. The list data is bundled into the app shell and remains available offline. The map carries “Approximate, not for navigation”.

## Data maintenance

See [CONTENT_GUIDE.md](CONTENT_GUIDE.md) for non-developer instructions and [DATA_GAPS.md](DATA_GAPS.md) for generated verification needs. No supplied coordinates were changed. Initial sources:

- Google-sourced coordinates: Army Institute of Technology (main campus), Aryabhatta Center – AIT Library, Car Parking – AIT, Old Boys Hostel.
- On-campus confirmed locations: none supplied. All four have `verified: false`; a Google listing alone does not satisfy the schema's campus-confirmation rule.
- 28 staff placeholders: departments, administrative desks, hostels, food, gates, medical, sports, auditorium, labs, transport, visitor parking and utilities. Coordinates remain null. Listed facilities require confirmation of existence and location.
- `accessible: false` means no accessible route has yet been confirmed, and the UI explicitly says so. Hours are Google-sourced and should be checked before visiting.

Phone and hours come exclusively from JSON. The main institute number is not represented as a dedicated emergency number. The library's description mentions its auditorium, but the separate auditorium pin is left pending rather than assuming a specific entrance.

## Deployment

Deploy `dist/` to any HTTPS static host after `npm ci && npm run build`. Supply the browser Maps key at build time. Serve at the origin root (the worker paths assume `/`). Use HTTPS for geolocation, sharing, service workers, and clipboard. Do not cache `sw.js` or `index.html` indefinitely; Vite's hashed assets can be cached immutably. Google Maps also needs access to maps.googleapis.com and maps.gstatic.com; imagery may use other Google hosts. Configure CSP and network access for the APIs actually used. No backend credentials are needed.

## Validation results

Measured on the production missing-key build, 15 October 2026, using system Chromium and Lighthouse 13.5.0 with simulated mobile throttling:

| Check                                                         | Result                                                                |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| Lighthouse Performance                                        | 99 (target ≥90)                                                       |
| Lighthouse Accessibility                                      | 100 (target ≥95)                                                      |
| Lighthouse Best Practices                                     | 100 (target ≥95)                                                      |
| Largest Contentful Paint / Total Blocking Time / Layout Shift | 1.3 s / 130 ms / 0                                                    |
| Vitest                                                        | 6 tests passed                                                        |
| Playwright                                                    | 2 tests passed                                                        |
| axe (home, modal card, mobile dark mode)                      | 0 violations; 1 review-needed color-contrast check on home/dark views |
| Build, TypeScript, data validation, ESLint                    | Passed                                                                |
| Frozen install (`npm ci`)                                     | Passed                                                                |
| Development startup / local HTTP readiness                    | Passed                                                                |

The browser tests exercise missing-key map fallback, hostel filtering, a direction link, info card, checklist persistence, mobile width, dark mode and a production offline reload/search/card. Saved summaries are in `reports/`; full axe JSON and the mobile screenshot are generated under `test-results/`, and the HTML runner report is under `playwright-report/` (both ignored).

Reproduce the mobile audit against a running production preview:

```sh
CHROME_PATH=/usr/bin/chromium npx lighthouse http://127.0.0.1:4173 \
  --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
  --output=html --output-path=/tmp/ait-lighthouse.html
```

Scores reflect the list/fallback workflow, not the cost of a loaded Google map, and vary with hardware and load. A real authorized Maps key is still needed to validate live map, clustering, location dot, satellite/terrain, and third-party map accessibility. A human keyboard/screen-reader and real campus route review remain necessary before a public launch. Automated axe coverage does not establish full WCAG 2.2 AA conformance.
