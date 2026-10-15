# Maintaining the campus guide

Edit `data/campus-locations.json`, the single source of truth. Keep quotes and commas intact. Do not put comments inside JSON.

1. Copy an existing entry. Give it a unique lowercase ID with hyphens, such as `computer-lab`.
2. Enter the official English name. Add `nameMr` only when the Marathi name has been checked.
3. Choose a category: department, hostel, canteen, admin, library, academic, sports, medical, parking, gate, transport, utility, or other.
4. Fill in the building and, if known, floor, hours, contact and a short description. Use an empty building string when unknown.
5. For coordinates, open Google Maps on your phone, zoom to the actual entrance, and long-press the exact spot to drop a pin. Open the pin details and copy the two decimal numbers (latitude first, longitude second). On desktop, right-click the spot and click the coordinates. Check that they point to the intended building, not the campus center.
6. If the location is uncertain, keep both `lat` and `lng` as `null`. Never copy another building's coordinates. The entry remains available under “Being verified”.
7. Record the source. Google Maps is a listing source, not evidence of a campus survey. Set `verified` to `true` only after someone on campus confirms the location and facts. Add the survey date to `source`.
8. Set `accessible` to `true` only after a ramp or wheelchair route has been confirmed. `false` currently means unconfirmed, not proof of inaccessibility. Check entrances and routes with staff.
9. Run `npm run validate-data`. Fix any errors; it also updates `DATA_GAPS.md`. Then run `npm run build` and `npm test`.
10. Review and commit the JSON and generated gaps report together. Redeploy the site. When publishing app changes, bump the cache version in `public/sw.js` so old shell files are cleared.

All four initial coordinates, names, and supplied hours come from the request's Google Maps listings. No on-campus verification has been supplied. Pending facilities are a collection checklist, not confirmation that every facility exists. Staff must confirm other department offerings, secondary gates, hostel allocation, and utility availability before publishing them as verified facilities. Medical and security entries are not emergency service guarantees.
