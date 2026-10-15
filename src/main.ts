import "./style.css";
import raw from "../data/campus-locations.json";
import {
  dataSchema,
  categories,
  search,
  distance,
  type Place,
  type Category,
} from "../lib/data";
import { labels, categoryMr } from "../lib/i18n";
import { Loader } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
const places = dataSchema.parse(raw),
  main = places.find((p) => p.id === "main-campus")!;
const icons: Record<Category, string> = {
  department: "⌘",
  hostel: "⌂",
  canteen: "♨",
  admin: "▤",
  library: "▥",
  academic: "◇",
  sports: "⚑",
  medical: "✚",
  parking: "P",
  gate: "⇥",
  transport: "↔",
  utility: "⚙",
  other: "•",
};
let lang: "en" | "mr" = "en",
  query = "",
  filters: Category[] = [],
  user: { lat: number; lng: number } | null = null,
  map: google.maps.Map | undefined,
  cluster: MarkerClusterer | undefined,
  markers: google.maps.Marker[] = [],
  userMarker: google.maps.Marker | undefined,
  mapAttempted = false;
let locationWatch: number | undefined;
let completed: string[] = [];
try {
  completed = JSON.parse(localStorage.getItem("ait-checklist") || "[]");
  if (!Array.isArray(completed)) completed = [];
} catch {
  completed = [];
}
const t = () => labels[lang];
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const title = (p: Place) => (lang === "mr" ? p.nameMr || p.name : p.name);
const cat = (c: Category) =>
  lang === "mr" ? categoryMr[c] : c[0].toUpperCase() + c.slice(1);
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<header><a class="brand" href="/"><span class="crest">AIT<span>PUNE</span></span><span>Campus Guide<small>ARMY INSTITUTE OF TECHNOLOGY</small></span></a><div class="header-right"><span class="edition">DIGHI · PUNE, MAHARASHTRA</span><button id="language" aria-label="Switch language to Marathi">मराठी <span aria-hidden="true">⇄</span></button></div></header><main><section class="intro"><div><span class="eyebrow">A NEW PLACE. A FAMILIAR FEELING.</span><h1>Find your way.<br><em>Make yourself at home.</em></h1><p>Your pocket guide to AIT Pune. Find a place, plan your first day,<br class="desktop"> and take campus one step at a time.</p></div><div class="campus-stamp" aria-hidden="true"><span>18.6069° N / 73.8751° E</span><svg viewBox="0 0 220 110"><path d="M15 95h190M35 95V52h150v43M25 52l85-34 85 34H25M90 95V65h40v30M45 64h22v15H45m108-15h22v15h-22M110 18V3h30v12h-30" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>YOUR CAMPUS, CONNECTED</span></div></section><nav class="quick" aria-label="Campus quick guides"><button id="fresher"><span class="quick-icon">→</span><span id="fresher-label"></span><span>→</span></button><button id="parents"><span class="quick-icon">♧</span><span id="parents-label"></span><span>→</span></button></nav><section class="explorer" aria-labelledby="explore-title"><aside><div class="sidebar-top"><span class="eyebrow">THE CAMPUS DIRECTORY</span><h2 id="explore-title"></h2><label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search"><kbd>/</kbd></label><div class="filters" id="filters" aria-label="Category filters"></div><div class="result-header"><span id="count" role="status"></span><span>AIT · PUNE</span></div></div><div id="results" class="results"></div></aside><div class="map-panel"><div class="map-toolbar"><div><span class="live-dot"></span><strong>AIT, Dighi</strong><span class="muted"> Pune, Maharashtra</span></div><button id="open-map"></button></div><div id="map" role="region" aria-label="Campus map"><div class="map-placeholder"><div class="map-art" aria-hidden="true"><span>AIT</span><i></i><i></i><i></i></div><span class="eyebrow">GET TO KNOW YOUR CAMPUS</span><h2>A place for every<br>part of your journey.</h2><p>Explore the directory or open the interactive map<br>to see Google-sourced campus locations.</p><button id="open-map-center" class="primary"></button></div></div><div id="map-status" role="status"></div><div class="map-bottom"><span id="disclaimer"></span><button id="locate"></button></div><p id="nearest" role="status"></p></div></section><section class="note"><span>ⓘ</span><p><strong>A guide that grows with you.</strong> Four Google-sourced places are on the map. More campus locations are being verified by staff. Accessibility and routes need campus confirmation.</p><a href="https://www.aitpune.com/" target="_blank" rel="noopener noreferrer">Visit AIT website →</a></section></main><footer><span>AIT <strong>Campus Guide</strong><small>Dighi, Alandi Road, Pune 411015</small></span><p id="privacy"></p></footer><button class="emergency" id="emergency"></button><dialog id="card" aria-labelledby="dialog-title"><div id="dialog-content"></div><button id="close-dialog"></button></dialog>`;
const el = (id: string) => document.getElementById(id)!;
function translateStatic() {
  const mr = lang === "mr";
  const set = (selector: string, en: string, marathi: string) => {
    const node = document.querySelector<HTMLElement>(selector);
    if (node) node.innerHTML = mr ? marathi : en;
  };
  set(
    ".intro .eyebrow",
    "A NEW PLACE. A FAMILIAR FEELING.",
    "नवीन परिसर. आपुलकीची भावना.",
  );
  set(
    ".intro h1",
    "Find your way.<br><em>Make yourself at home.</em>",
    "तुमचा मार्ग शोधा.<br><em>आपलेसे वाटू द्या.</em>",
  );
  set(
    ".intro p",
    'Your pocket guide to AIT Pune. Find a place, plan your first day,<br class="desktop"> and take campus one step at a time.',
    "AIT पुणेसाठी तुमचा मार्गदर्शक. ठिकाण शोधा, पहिल्या दिवसाची तयारी करा आणि कॅम्पस जाणून घ्या.",
  );
  set(
    ".sidebar-top>.eyebrow",
    "THE CAMPUS DIRECTORY",
    "कॅम्पसमधील ठिकाणांची यादी",
  );
  set(
    ".map-placeholder .eyebrow",
    "GET TO KNOW YOUR CAMPUS",
    "तुमचा कॅम्पस जाणून घ्या",
  );
  set(
    ".map-placeholder h2",
    "A place for every<br>part of your journey.",
    "तुमच्या प्रवासातील<br>प्रत्येक टप्प्यासाठी एक ठिकाण.",
  );
  set(
    ".map-placeholder p",
    "Explore the directory or open the interactive map<br>to see Google-sourced campus locations.",
    "यादी शोधा किंवा Google-स्रोत असलेली ठिकाणे पाहण्यासाठी नकाशा उघडा.",
  );
  set(
    ".note p",
    "<strong>A guide that grows with you.</strong> Four Google-sourced places are on the map. More campus locations are being verified by staff. Accessibility and routes need campus confirmation.",
    "<strong>तुमच्यासोबत वाढणारा मार्गदर्शक.</strong> नकाशावर Google-स्रोत असलेली चार ठिकाणे आहेत. इतर ठिकाणे, सुलभता आणि मार्ग यांची कर्मचाऱ्यांकडून पडताळणी आवश्यक आहे.",
  );
  set(".note a", "Visit AIT website →", "AIT संकेतस्थळाला भेट द्या →");
  if (!navigator.onLine) el("map-status").textContent = t().offline;
  else if (!import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY)
    el("map-status").textContent = t().setup;
}
function render() {
  translateStatic();
  document.documentElement.lang = lang;
  el("explore-title").textContent = t().explore;
  el("fresher-label").textContent = t().fresher;
  el("parents-label").textContent = t().parents;
  el("privacy").textContent = t().privacy;
  el("emergency").textContent = "✚ " + t().emergency;
  el("locate").textContent = "◎ " + t().locate;
  el("disclaimer").textContent = "ⓘ " + t().approx;
  el("open-map").textContent = t().map + " →";
  const centerButton = document.getElementById("open-map-center");
  if (centerButton) centerButton.textContent = t().map + " →";
  el("close-dialog").textContent = t().close;
  const input = el("search") as HTMLInputElement;
  input.placeholder = t().search;
  input.setAttribute("aria-label", t().search);
  el("language").textContent = lang === "en" ? "मराठी ⇄" : "English ⇄";
  el("language").setAttribute(
    "aria-label",
    lang === "en" ? "मराठी ⇄ — Switch language to Marathi" : "English ⇄ — इंग्रजी भाषा निवडा",
  );
  el("filters").innerHTML =
    `<button data-cat="" aria-pressed="${!filters.length}">${t().all}</button>` +
    categories
      .map(
        (c) =>
          `<button data-cat="${c}" aria-pressed="${filters.includes(c)}"><span aria-hidden="true">${icons[c]}</span> ${cat(c)}</button>`,
      )
      .join("");
  el("filters")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const c = b.dataset.cat as Category;
          if (!c) filters = [];
          else
            filters = filters.includes(c)
              ? filters.filter((v) => v !== c)
              : [...filters, c];
          render();
          updateMarkers();
        }),
    );
  renderResults();
}
function renderResults() {
  const found = search(places, query, filters);
  el("count").textContent =
    `${found.length} ${lang === "en" ? "places" : "ठिकाणे"}`;
  el("results").innerHTML = found.length
    ? categories
        .map((c) => {
          const rows = found.filter((p) => p.category === c);
          return rows.length
            ? `<section class="result-group"><h3>${cat(c)} <span>${rows.length}</span></h3>${rows.map((p) => `<button class="place" data-place="${p.id}"><span class="place-icon category-${p.category}" aria-hidden="true">${icons[p.category]}</span><span><strong>${esc(title(p))}</strong><small>${p.lat === null ? t().pending : user ? `${Math.round(distance(user, { lat: p.lat, lng: p.lng! }))} m · Google Maps` : esc(p.building || "Google Maps · Campus confirmation pending")}</small></span><span class="row-arrow" aria-hidden="true">→</span></button>`).join("")}</section>`
            : "";
        })
        .join("")
    : `<p class="empty">${t().empty}</p>`;
  bindPlaces(el("results"));
}
function bindPlaces(root: HTMLElement) {
  root
    .querySelectorAll<HTMLButtonElement>("[data-place]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          showPlace(places.find((p) => p.id === b.dataset.place)!)),
    );
}
const dialog = el("card") as HTMLDialogElement;
function openDialog(content: string) {
  el("dialog-content").innerHTML = content;
  if (!dialog.open) dialog.showModal();
  bindPlaces(el("dialog-content"));
}
function showPlace(p: Place) {
  if (map && p.lat !== null) {
    map.panTo({ lat: p.lat, lng: p.lng! });
    map.setZoom(18);
  }
  openDialog(
    `<span class="eyebrow">${icons[p.category]} ${cat(p.category)}</span><h2 id="dialog-title">${esc(title(p))}</h2>${p.nameMr && lang === "en" ? `<p>${esc(p.nameMr)}</p>` : ""}<p class="badge">${p.lat === null ? t().locationPending : "Google-sourced · Campus confirmation pending"}</p><dl><dt>${lang === "mr" ? "इमारत / मजला" : "Building / Floor"}</dt><dd>${esc([p.building, p.floor].filter(Boolean).join(" / ") || t().locationPending)}</dd>${p.hours ? `<dt>${lang === "mr" ? "वेळ" : "Hours"}</dt><dd>${esc(p.hours)}</dd>` : ""}${p.contact ? `<dt>${lang === "mr" ? "संपर्क" : "Contact"}</dt><dd><a href="tel:${esc(p.contact.replace(/\s/g, ""))}">${esc(p.contact)}</a></dd>` : ""}<dt>♿ ${lang === "mr" ? "सुलभता" : "Accessibility"}</dt><dd>${p.accessible ? "Confirmed accessible" : "Access not confirmed — contact the institute"}</dd><dt>${lang === "mr" ? "स्रोत" : "Source"}</dt><dd>${esc(p.source)}</dd></dl>${p.description ? `<p>${esc(p.description)}</p>` : ""}<div class="actions">${p.lat !== null ? `<a class="primary button" href="${directions(p)}" target="_blank" rel="noopener noreferrer">${t().directions} →</a>` : `<span>${t().locationPending}</span>`}<button id="share">${t().share}</button></div><p id="share-status" role="status"></p>`,
  );
  el("share").onclick = async () => {
    const url = new URL(location.href);
    url.hash = p.id;
    try {
      if (navigator.share)
        await navigator.share({ title: p.name, url: url.href });
      else {
        await navigator.clipboard.writeText(url.href);
        el("share-status").textContent = "Link copied";
      }
    } catch {
      el("share-status").textContent = "Copy this link: " + url.href;
    }
  };
}
function directions(p: Place) {
  const params = new URLSearchParams({
    api: "1",
    destination: `${p.lat},${p.lng}`,
  });
  if (user) params.set("origin", `${user.lat},${user.lng}`);
  return "https://www.google.com/maps/dir/?" + params;
}
const checklist = [
  "admissions",
  "accounts",
  "library-card",
  "hostel-allotment",
  "id-card",
  "medical",
];
function quick(kind: "fresher" | "parents" | "emergency") {
  const ids =
    kind === "fresher"
      ? checklist
      : kind === "parents"
        ? ["main-gate", "visitor-parking", "admin", "canteen", "medical"]
        : ["medical", "main-gate"];
  openDialog(
    `<span class="eyebrow">YOUR CAMPUS COMPANION</span><h2 id="dialog-title">${kind === "fresher" ? t().checklist : kind === "parents" ? t().visitor : t().emergency}</h2>${kind === "fresher" ? `<p>${lang === "en" ? "Progress is saved on this device only." : "प्रगती फक्त या उपकरणावर जतन होते."}</p>` : ""}<div class="guide-list">${ids
      .map((id) => {
        const p = places.find((p) => p.id === id)!;
        return `<div>${kind === "fresher" ? `<label class="check"><input type="checkbox" data-done="${id}" ${completed.includes(id) ? "checked" : ""}><span class="sr-only">${t().done}: ${esc(title(p))}</span></label>` : ""}<button data-place="${id}">${esc(title(p))}<small>${p.lat === null ? t().locationPending : "Google Maps"}</small></button></div>`;
      })
      .join(
        "",
      )}</div>${kind === "emergency" ? `<p>Institute main phone (not a dedicated emergency line):</p><a class="button primary" href="tel:${main.contact!.replace(/\s/g, "")}">${main.contact}</a><p>Medical and security locations are pending confirmation.</p>` : ""}`,
  );
  dialog.querySelectorAll<HTMLInputElement>("[data-done]").forEach(
    (input) =>
      (input.onchange = () => {
        completed = input.checked
          ? [...new Set([...completed, input.dataset.done!])]
          : completed.filter((id) => id !== input.dataset.done);
        try {
          localStorage.setItem("ait-checklist", JSON.stringify(completed));
        } catch {
          input.checked = false;
          completed = completed.filter((id) => id !== input.dataset.done);
          const msg = document.createElement("p");
          msg.textContent =
            "Storage unavailable. Progress cannot be saved on this device.";
          el("dialog-content").append(msg);
        }
      }),
  );
}
async function loadMap() {
  if (map) {
    el("map").scrollIntoView({ block: "center" });
    return;
  }
  if (mapAttempted) return;
  const key = import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!navigator.onLine) {
    el("map-status").textContent = t().offline;
    return;
  }
  if (!key) {
    el("map-status").textContent = t().setup;
    return;
  }
  mapAttempted = true;
  el("map-status").textContent = "Loading map…";
  try {
    const loader = new Loader({ apiKey: key, version: "weekly" });
    await Promise.race([loader.load(), new Promise((_,reject)=>setTimeout(()=>reject(new Error("Map load timed out")),20000))]);
    map = new google.maps.Map(el("map"), {
      center: { lat: main.lat!, lng: main.lng! },
      zoom: 17,
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: ["roadmap", "satellite", "terrain"],
      },
      streetViewControl: false,
      fullscreenControl: true,
    });
    updateMarkers();
    if (user) showUser();
    el("map-status").textContent = "";
  } catch {
    el("map-status").textContent = t().offline;
    mapAttempted = false;
  }
}
function updateMarkers() {
  if (!map) return;
  cluster?.clearMarkers();
  markers.forEach((m) => m.setMap(null));
  markers = search(places, query, filters)
    .filter((p) => p.lat !== null)
    .map((p) => {
      const marker = new google.maps.Marker({
        position: { lat: p.lat!, lng: p.lng! },
        title: title(p) + " · " + cat(p.category),
        optimized: false,
        label: { text: icons[p.category], color: "#ffffff" },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor:
            (
              {
                hostel: "#7c4c35",
                parking: "#3d5e85",
                library: "#645087",
              } as Partial<Record<Category, string>>
            )[p.category] || "#24543f",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 18,
        },
      });
      marker.addListener("click", () => showPlace(p));
      return marker;
    });
  cluster = new MarkerClusterer({ map, markers });
}
function showUser() {
  if (!map || !user) return;
  userMarker?.setMap(null);
  userMarker = new google.maps.Marker({
    map,
    position: user,
    title: "Your location",
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: "#1769df",
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 3,
      scale: 9,
    },
  });
}
el("search").addEventListener("input", (e) => {
  query = (e.target as HTMLInputElement).value;
  renderResults();
  updateMarkers();
});
el("language").onclick = () => {
  lang = lang === "en" ? "mr" : "en";
  render();
  updateMarkers();
};
el("fresher").onclick = () => quick("fresher");
el("parents").onclick = () => quick("parents");
el("emergency").onclick = () => quick("emergency");
el("open-map").onclick = loadMap;
el("open-map-center").onclick = loadMap;
el("close-dialog").onclick = () => dialog.close();
el("locate").onclick = () => {
  if (!navigator.geolocation) {
    el("nearest").textContent = "Geolocation is unavailable.";
    return;
  }
  if (locationWatch !== undefined)
    navigator.geolocation.clearWatch(locationWatch);
  locationWatch = navigator.geolocation.watchPosition(
    (pos) => {
      user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      showUser();
      renderResults();
      const ranked = places
        .filter((p) => p.lat !== null)
        .map((p) => ({ p, d: distance(user!, { lat: p.lat!, lng: p.lng! }) }))
        .sort((a, b) => a.d - b.d);
      el("nearest").textContent =
        distance(user, { lat: main.lat!, lng: main.lng! }) < 600
          ? `Nearest listed place: ${title(ranked[0].p)} · approximately ${Math.round(ranked[0].d)} m. Straight-line distance; routes unverified.`
          : "You appear to be outside campus. Distances are straight-line estimates.";
    },
    (err) => {
      el("nearest").textContent =
        err.code === 1
          ? "Location permission denied. You can still browse every place."
          : "Location unavailable. Please try again.";
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
  );
};
window.addEventListener("offline", () => {
  el("map-status").textContent = t().offline;
});
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !(e.target instanceof HTMLInputElement) &&
    !dialog.open
  ) {
    e.preventDefault();
    el("search").focus();
  }
});
render();
if (!navigator.onLine) el("map-status").textContent = t().offline;
else if (!import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY)
  el("map-status").textContent = t().setup;
const shared = places.find(
  (p) => p.id === decodeURIComponent(location.hash.slice(1)),
);
if (shared) showPlace(shared);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register("/sw.js").catch(() => {
    el("map-status").textContent =
      "Offline cache unavailable. Keep this tab open to use the list.";
  });
