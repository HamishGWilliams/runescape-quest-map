import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import questOverlayUrl from "./data/quest-overlay.geojson?url";
import { RsTileLayer } from "./map/rsTileLayer.js";
import { getInitialState, writeStateToUrl } from "./map/urlState.js";

const DATA_BASE = "https://raw.githubusercontent.com/mejrs/data_rs3/master";
const TILE_BASE = "https://raw.githubusercontent.com/mejrs/layers_rs3/master";
const SURFACE_MAP_ID = 28;
const DEFAULT_CENTER = { x: 3232, y: 3232 };

const mapSelect = document.querySelector("#map-select");
const planeButtons = Array.from(document.querySelectorAll("[data-plane]"));
const iconToggle = document.querySelector("#icon-toggle");
const overlayToggle = document.querySelector("#overlay-toggle");
const coordinateReadout = document.querySelector("#coordinate-readout");
const copyLinkButton = document.querySelector("#copy-link");
const addMarkerButton = document.querySelector("#add-marker");
const featureList = document.querySelector("#feature-list");

const state = getInitialState({
  mapId: SURFACE_MAP_ID,
  zoom: 2,
  plane: 0,
  x: DEFAULT_CENTER.x,
  y: DEFAULT_CENTER.y,
});

const map = L.map("map", {
  crs: L.CRS.Simple,
  center: [state.y, state.x],
  zoom: state.zoom,
  minZoom: -4,
  maxZoom: 4,
  zoomSnap: 1,
  zoomDelta: 1,
  attributionControl: false,
});

const attribution = L.control.attribution({ prefix: false }).addTo(map);
attribution.addAttribution(
  'Map data from <a href="https://runescape.wiki/w/RuneScape:Map" target="_blank" rel="noreferrer">RuneScape Wiki cartography</a> and <a href="https://github.com/mejrs" target="_blank" rel="noreferrer">mejrs GitHub data</a>.'
);

const baseTiles = new RsTileLayer(`${TILE_BASE}/map_squares/{mapId}/{z}/{plane}_{x}_{rsY}.png`, {
  mapId: state.mapId,
  plane: state.plane,
  minZoom: -4,
  maxZoom: 4,
  maxNativeZoom: 3,
  tileSize: 256,
  className: "rs-map-tiles",
}).addTo(map);

const iconTiles = new RsTileLayer(`${TILE_BASE}/icon_squares/{mapId}/{z}/{plane}_{x}_{rsY}.png`, {
  mapId: state.mapId,
  plane: state.plane,
  minZoom: 0,
  maxZoom: 4,
  maxNativeZoom: 3,
  tileSize: 256,
  opacity: 0.9,
  className: "rs-icon-tiles",
}).addTo(map);

const overlayLayer = L.geoJSON(null, {
  pointToLayer: (feature, latlng) => {
    const type = feature.properties?.type ?? "quest";
    return L.circleMarker(latlng, {
      radius: type === "teleport" ? 7 : 6,
      weight: 2,
      color: feature.properties?.stroke ?? "#1F2937",
      fillColor: feature.properties?.fill ?? "#F59E0B",
      fillOpacity: 0.92,
    });
  },
  style: (feature) => ({
    color: feature.properties?.stroke ?? "#2563EB",
    weight: feature.properties?.["stroke-width"] ?? 3,
    opacity: feature.properties?.["stroke-opacity"] ?? 0.86,
    fillColor: feature.properties?.fill ?? "#38BDF8",
    fillOpacity: feature.properties?.["fill-opacity"] ?? 0.18,
  }),
  onEachFeature: (feature, layer) => {
    const title = feature.properties?.title ?? "Map feature";
    const description = feature.properties?.description ?? "";
    layer.bindPopup(`<strong>${escapeHtml(title)}</strong>${description ? `<p>${escapeHtml(description)}</p>` : ""}`);
    layer.bindTooltip(title, { direction: "top", sticky: true });
  },
}).addTo(map);

let basemaps = [];
let markerCounter = 0;

init();

async function init() {
  await Promise.all([loadBasemaps(), loadQuestOverlay()]);
  setPlane(state.plane);
  setMapId(state.mapId, false);
  updateReadout();
  bindEvents();
}

async function loadBasemaps() {
  const response = await fetch(`${DATA_BASE}/basemaps.json`);
  if (!response.ok) {
    throw new Error(`Unable to load basemaps: ${response.status}`);
  }

  basemaps = await response.json();
  const usefulMaps = basemaps
    .filter((item) => Number.isInteger(item.mapId) && item.mapId >= 0)
    .sort((a, b) => a.mapId - b.mapId);

  mapSelect.replaceChildren(
    ...usefulMaps.map((item) => {
      const option = document.createElement("option");
      option.value = item.mapId;
      option.textContent = `${item.mapId} - ${item.name}`;
      return option;
    })
  );
  mapSelect.value = String(state.mapId);
}

async function loadQuestOverlay() {
  const response = await fetch(questOverlayUrl);
  if (!response.ok) {
    throw new Error(`Unable to load quest overlay: ${response.status}`);
  }

  const geojson = await response.json();
  overlayLayer.addData(geojson);
  renderFeatureList();
}

function bindEvents() {
  map.on("moveend zoomend", () => {
    updateReadout();
    writeStateToUrl(getCurrentState());
  });

  mapSelect.addEventListener("change", () => {
    setMapId(Number(mapSelect.value), true);
  });

  planeButtons.forEach((button) => {
    button.addEventListener("click", () => setPlane(Number(button.dataset.plane)));
  });

  iconToggle.addEventListener("change", () => {
    if (iconToggle.checked) {
      iconTiles.addTo(map);
    } else {
      iconTiles.remove();
    }
  });

  overlayToggle.addEventListener("change", () => {
    if (overlayToggle.checked) {
      overlayLayer.addTo(map);
    } else {
      overlayLayer.remove();
    }
  });

  copyLinkButton.addEventListener("click", async () => {
    const url = writeStateToUrl(getCurrentState());
    await navigator.clipboard.writeText(url.toString());
    copyLinkButton.textContent = "Copied";
    window.setTimeout(() => {
      copyLinkButton.textContent = "Copy map link";
    }, 1200);
  });

  addMarkerButton.addEventListener("click", () => {
    const center = map.getCenter();
    markerCounter += 1;
    const feature = {
      type: "Feature",
      properties: {
        title: `Draft marker ${markerCounter}`,
        description: "Temporary marker added during route planning.",
        type: "draft",
        fill: "#22C55E",
      },
      geometry: {
        type: "Point",
        coordinates: [Math.round(center.lng), Math.round(center.lat), getPlane()],
      },
    };
    overlayLayer.addData(feature);
    renderFeatureList();
  });
}

function setMapId(mapId, moveToCenter) {
  const basemap = basemaps.find((item) => item.mapId === mapId);
  baseTiles.setMapId(mapId);
  iconTiles.setMapId(mapId);
  mapSelect.value = String(mapId);

  if (basemap?.bounds) {
    const [[west, south], [east, north]] = basemap.bounds;
    const bounds = L.latLngBounds([south, west], [north, east]);
    map.setMaxBounds(bounds.pad(0.2));
    if (moveToCenter) {
      const [x, y] = basemap.center ?? [DEFAULT_CENTER.x, DEFAULT_CENTER.y];
      map.setView([y, x], Math.min(map.getZoom(), 2));
    }
  }

  updateReadout();
  writeStateToUrl(getCurrentState());
}

function setPlane(plane) {
  baseTiles.setPlane(plane);
  iconTiles.setPlane(plane);
  planeButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.plane) === plane);
  });
  updateReadout();
  writeStateToUrl(getCurrentState());
}

function getPlane() {
  return baseTiles.options.plane;
}

function getCurrentState() {
  const center = map.getCenter();
  return {
    mapId: baseTiles.options.mapId,
    zoom: map.getZoom(),
    plane: getPlane(),
    x: Math.round(center.lng),
    y: Math.round(center.lat),
  };
}

function updateReadout() {
  const center = map.getCenter();
  coordinateReadout.value = `x: ${Math.round(center.lng)}, y: ${Math.round(center.lat)}, z: ${getPlane()}`;
}

function renderFeatureList() {
  const rows = [];
  overlayLayer.eachLayer((layer) => {
    const item = layer.feature;
    const title = item?.properties?.title ?? "Untitled feature";
    const coords = item?.geometry?.coordinates ?? [];
    rows.push({ title, coords, layer });
  });

  featureList.replaceChildren(
    ...rows.map((row) => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = `<strong>${escapeHtml(row.title)}</strong><span>${formatCoords(row.coords)}</span>`;
      button.addEventListener("click", () => {
        const [x, y, plane = getPlane()] = row.coords;
        setPlane(Number(plane));
        map.flyTo([y, x], Math.max(map.getZoom(), 3), { duration: 0.8 });
        row.layer.openPopup();
      });
      return button;
    })
  );
}

function formatCoords(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return "No coordinates";
  return `${Math.round(coords[0])}, ${Math.round(coords[1])}, ${coords[2] ?? 0}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
