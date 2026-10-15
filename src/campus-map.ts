import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { Category, Place } from "../lib/data";

export interface CampusMapOptions {
  center: [number, number];
  title: (place: Place) => string;
  category: (category: Category) => string;
  icons: Record<Category, string>;
  onSelect: (place: Place) => void;
  onTilesReady: () => void;
  onTilesError: () => void;
}
const colors: Record<Category, string> = {
  department: "#375e77",
  hostel: "#7c4c35",
  canteen: "#865415",
  admin: "#525a80",
  library: "#645087",
  academic: "#24543f",
  sports: "#596b25",
  medical: "#a3343b",
  parking: "#3d5e85",
  gate: "#6f4c64",
  transport: "#385f64",
  utility: "#745929",
  other: "#535c55",
};
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export function createCampusMap(
  container: HTMLElement,
  options: CampusMapOptions,
) {
  const map = L.map(container, {
    scrollWheelZoom: false,
    zoomControl: true,
  }).setView(options.center, 17);
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    minZoom: 3,
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    // Only request tiles currently in view. Browser caching follows OSM headers.
    updateWhenIdle: true,
    keepBuffer: 0,
  });
  tiles.on("tileload", options.onTilesReady);
  tiles.on("tileerror", options.onTilesError);
  tiles.addTo(map);
  const cluster = L.markerClusterGroup({
    maxClusterRadius: 42,
    disableClusteringAtZoom: 18,
    animate: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    showCoverageOnHover: false,
    iconCreateFunction: (group) =>
      L.divIcon({
        className: "campus-cluster",
        iconSize: [44, 44],
        html: `<span aria-hidden="true">${group.getChildCount()}</span><span class="sr-only">${group.getChildCount()} campus locations. Zoom in</span>`,
      }),
  }).addTo(map);
  let userMarker: L.Marker | undefined;
  const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  resize.observe(container);

  return {
    setPlaces(places: Place[]) {
      cluster.clearLayers();
      for (const place of places) {
        if (place.lat === null || place.lng === null) continue;
        const label = `${options.title(place)} · ${options.category(place.category)}`;
        const marker = L.marker([place.lat, place.lng], {
          title: label,
          alt: label,
          keyboard: true,
          icon: L.divIcon({
            className: "campus-pin",
            iconSize: [44, 44],
            iconAnchor: [22, 40],
            html: `<span class="pin-body" style="background:${colors[place.category]}" aria-hidden="true">${options.icons[place.category]}</span><span class="sr-only">${escape(label)}</span>`,
          }),
        });
        marker.on("add", () =>
          marker.getElement()?.setAttribute("aria-label", label),
        );
        marker.on("click", () => options.onSelect(place));
        cluster.addLayer(marker);
      }
    },
    focus(place: Place) {
      if (place.lat !== null && place.lng !== null)
        map.setView([place.lat, place.lng], 18, { animate: false });
    },
    showUser(position: { lat: number; lng: number }) {
      userMarker?.remove();
      userMarker = L.marker([position.lat, position.lng], {
        title: "Your location",
        alt: "Your location",
        interactive: false,
        icon: L.divIcon({
          className: "user-position",
          iconSize: [20, 20],
          html: '<span class="sr-only">Your location</span>',
        }),
      }).addTo(map);
    },
    refresh(retryTiles = false) {
      map.invalidateSize({ pan: false });
      if (retryTiles) tiles.redraw();
    },
    destroy() {
      resize.disconnect();
      map.remove();
    },
  };
}
export type CampusMap = ReturnType<typeof createCampusMap>;
