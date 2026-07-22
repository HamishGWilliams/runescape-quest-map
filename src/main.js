import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as XLSX from "xlsx";
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
const pointerReadout = document.querySelector("#pointer-readout");
const pointReadout = document.querySelector("#point-readout");
const areaReadout = document.querySelector("#area-readout");
const pickPointButton = document.querySelector("#pick-point");
const selectAreaButton = document.querySelector("#select-area");
const clearSelectionButton = document.querySelector("#clear-selection");
const copyPointButton = document.querySelector("#copy-point");
const copyAreaButton = document.querySelector("#copy-area");
const questSelect = document.querySelector("#quest-select");
const stepIdInput = document.querySelector("#step-id");
const questIdInput = document.querySelector("#quest-id");
const sourceStepNumberInput = document.querySelector("#source-step-number");
const stepTypeInput = document.querySelector("#step-type");
const objectiveInput = document.querySelector("#objective");
const locationIdInput = document.querySelector("#location-id");
const npcObjectInput = document.querySelector("#npc-object");
const sourceIdInput = document.querySelector("#source-id");
const stepStatusInput = document.querySelector("#step-status");
const captureHint = document.querySelector("#capture-hint");
const copyStepRowButton = document.querySelector("#copy-step-row");
const resetStepFormButton = document.querySelector("#reset-step-form");
const questCatalogueInput = document.querySelector("#quest-catalogue-input");
const questCatalogueStatus = document.querySelector("#quest-catalogue-status");
const workbookInput = document.querySelector("#workbook-input");
const workbookStatus = document.querySelector("#workbook-status");
const copyLinkButton = document.querySelector("#copy-link");
const addMarkerButton = document.querySelector("#add-marker");
const featureList = document.querySelector("#feature-list");
const mapShell = document.querySelector(".map-shell");

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

const workbookLayer = L.geoJSON(null, {
  pointToLayer: (feature, latlng) =>
    L.circleMarker(latlng, {
      radius: 6,
      weight: 2,
      color: "#7C2D12",
      fillColor: "#FB923C",
      fillOpacity: 0.92,
    }),
  style: () => ({
    color: "#FB923C",
    weight: 3,
    opacity: 0.9,
    fillColor: "#FB923C",
    fillOpacity: 0.16,
  }),
  onEachFeature: (feature, layer) => {
    const title = feature.properties?.title ?? "Workbook step";
    const description = feature.properties?.description ?? "";
    layer.bindPopup(`<strong>${escapeHtml(title)}</strong>${description ? `<p>${escapeHtml(description)}</p>` : ""}`);
    layer.bindTooltip(title, { direction: "top", sticky: true });
  },
}).addTo(map);

const selectionLayer = L.layerGroup().addTo(map);

let basemaps = [];
let markerCounter = 0;
let pickerMode = null;
let selectedPoint = null;
let selectedArea = null;
let selectionStart = null;
let selectionRectangle = null;
let workbookFeatures = [];
let workbookRows = [];
let questCatalogue = [];
let sessionRows = [];

init();

async function init() {
  await Promise.all([loadBasemaps(), loadQuestOverlay()]);
  setPlane(state.plane);
  setMapId(state.mapId, false);
  updateReadout();
  updateSelectionReadouts();
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
  map.on("mousemove", (event) => {
    pointerReadout.value = formatPoint(latLngToPoint(event.latlng));
  });

  map.on("click", (event) => {
    if (pickerMode !== "point") return;
    selectPoint(latLngToPoint(event.latlng));
  });

  map.on("mousedown", (event) => {
    if (pickerMode !== "area" || event.originalEvent.button !== 0) return;
    L.DomEvent.stop(event.originalEvent);
    map.dragging.disable();
    selectionStart = event.latlng;
    selectionRectangle?.remove();
    selectionRectangle = L.rectangle(L.latLngBounds(selectionStart, selectionStart), {
      className: "coordinate-selection",
    }).addTo(selectionLayer);
  });

  map.on("mousemove", (event) => {
    if (!selectionStart || pickerMode !== "area") return;
    const bounds = L.latLngBounds(selectionStart, event.latlng);
    selectionRectangle.setBounds(bounds);
    selectedArea = boundsToArea(bounds);
    updateSelectionReadouts();
  });

  map.on("mouseup", (event) => {
    if (!selectionStart || pickerMode !== "area") return;
    L.DomEvent.stop(event.originalEvent);
    const bounds = L.latLngBounds(selectionStart, event.latlng);
    selectionRectangle.setBounds(bounds);
    selectedArea = boundsToArea(bounds);
    selectedPoint = {
      mapId: getMapId(),
      x: Math.round((selectedArea.minX + selectedArea.maxX) / 2),
      y: Math.round((selectedArea.minY + selectedArea.maxY) / 2),
      z: getPlane(),
    };
    selectionStart = null;
    map.dragging.enable();
    updateSelectionReadouts();
  });

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
      workbookLayer.addTo(map);
    } else {
      overlayLayer.remove();
      workbookLayer.remove();
    }
  });

  pickPointButton.addEventListener("click", () => {
    setPickerMode(pickerMode === "point" ? null : "point");
  });

  selectAreaButton.addEventListener("click", () => {
    setPickerMode(pickerMode === "area" ? null : "area");
  });

  clearSelectionButton.addEventListener("click", clearSelection);

  copyStepRowButton.addEventListener("click", () => {
    if (!selectedPoint && !selectedArea) {
      captureHint.textContent = "Pick a point or area before copying a row.";
      return;
    }
    if (!getSelectedQuest()) {
      captureHint.textContent = "Load the quest catalogue and select a quest before copying a row.";
      return;
    }
    const row = getStepRow();
    copyText(row.join("\t"), copyStepRowButton);
    sessionRows.push({
      "Step ID": row[0],
      "Quest ID": row[1],
      "Source Step No.": row[3],
      "Location ID": row[6],
    });
    refreshGeneratedFields();
  });

  resetStepFormButton.addEventListener("click", resetStepForm);

  questSelect.addEventListener("change", () => {
    applySelectedQuest();
    refreshGeneratedFields();
  });

  questCatalogueInput.addEventListener("change", async () => {
    const file = questCatalogueInput.files?.[0];
    if (!file) return;
    await loadQuestCatalogue(file);
  });

  copyPointButton.addEventListener("click", () => {
    if (!selectedPoint) return;
    copyText(formatPointForSpreadsheet(selectedPoint), copyPointButton);
  });

  copyAreaButton.addEventListener("click", () => {
    if (!selectedArea) return;
    copyText(formatAreaForSpreadsheet(selectedArea, selectedPoint), copyAreaButton);
  });

  workbookInput.addEventListener("change", async () => {
    const file = workbookInput.files?.[0];
    if (!file) return;
    await loadWorkbook(file);
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
  syncWorkbookLayer();
}

function setPlane(plane) {
  baseTiles.setPlane(plane);
  iconTiles.setPlane(plane);
  planeButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.plane) === plane);
  });
  updateReadout();
  updateSelectionReadouts();
  writeStateToUrl(getCurrentState());
  syncWorkbookLayer();
}

function getMapId() {
  return baseTiles.options.mapId;
}

function getPlane() {
  return baseTiles.options.plane;
}

function getCurrentState() {
  const center = map.getCenter();
  return {
    mapId: getMapId(),
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
  addLayerRows(overlayLayer, rows);
  addLayerRows(workbookLayer, rows);

  featureList.replaceChildren(
    ...rows.map((row) => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = `<strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.detail)}</span>`;
      button.addEventListener("click", () => {
        const { x, y, plane = getPlane() } = row.target;
        setPlane(Number(plane));
        map.flyTo([y, x], Math.max(map.getZoom(), 3), { duration: 0.8 });
        row.layer.openPopup();
      });
      return button;
    })
  );
}

function addLayerRows(layerGroup, rows) {
  layerGroup.eachLayer((layer) => {
    const feature = layer.feature;
    const title = feature?.properties?.title ?? "Untitled feature";
    const target = getFeatureTarget(feature);
    if (!target) return;
    rows.push({
      title,
      target,
      detail: target ? formatPoint(target) : "No coordinates",
      layer,
    });
  });
}

function getFeatureTarget(feature) {
  const geometry = feature?.geometry;
  if (!geometry) return null;

  if (geometry.type === "Point") {
    const [x, y, plane = getPlane()] = geometry.coordinates ?? [];
    return { x: Math.round(x), y: Math.round(y), z: Number(plane), plane: Number(plane) };
  }

  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates?.[0] ?? [];
    const xs = ring.map((coord) => Number(coord[0])).filter(Number.isFinite);
    const ys = ring.map((coord) => Number(coord[1])).filter(Number.isFinite);
    if (!xs.length || !ys.length) return null;
    const plane = Number(feature.properties?.plane ?? getPlane());
    return {
      x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
      y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2),
      z: plane,
      plane,
    };
  }

  if (geometry.type === "LineString") {
    return coordsToTarget(geometry.coordinates);
  }

  return null;
}

function coordsToTarget(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [x, y, plane = getPlane()] = Array.isArray(coords[0]) ? coords[0] : coords;
  return { x: Math.round(x), y: Math.round(y), z: Number(plane), plane: Number(plane) };
}

function setPickerMode(mode) {
  pickerMode = mode;
  pickPointButton.classList.toggle("active", mode === "point");
  selectAreaButton.classList.toggle("active", mode === "area");
  mapShell.classList.toggle("picking-point", mode === "point");
  mapShell.classList.toggle("selecting-area", mode === "area");
  if (mode !== "area") {
    selectionStart = null;
    map.dragging.enable();
  }
  if (mode === "area") {
    map.dragging.disable();
  }
}

function selectPoint(point) {
  selectedPoint = point;
  selectionLayer.clearLayers();
  L.circleMarker([point.y, point.x], {
    radius: 7,
    weight: 2,
    color: "#FACC15",
    fillColor: "#FDE68A",
    fillOpacity: 0.96,
  }).addTo(selectionLayer);
  if (selectedArea) {
    selectionRectangle = areaToRectangle(selectedArea).addTo(selectionLayer);
  }
  updateSelectionReadouts();
}

function clearSelection() {
  selectedPoint = null;
  selectedArea = null;
  selectionStart = null;
  selectionRectangle = null;
  selectionLayer.clearLayers();
  updateSelectionReadouts();
}

function latLngToPoint(latlng) {
  return {
    mapId: getMapId(),
    x: Math.round(latlng.lng),
    y: Math.round(latlng.lat),
    z: getPlane(),
  };
}

function boundsToArea(bounds) {
  const west = Math.round(bounds.getWest());
  const east = Math.round(bounds.getEast());
  const south = Math.round(bounds.getSouth());
  const north = Math.round(bounds.getNorth());
  return {
    mapId: getMapId(),
    minX: Math.min(west, east),
    minY: Math.min(south, north),
    maxX: Math.max(west, east),
    maxY: Math.max(south, north),
    z: getPlane(),
  };
}

function areaToRectangle(area) {
  return L.rectangle(
    L.latLngBounds([area.minY, area.minX], [area.maxY, area.maxX]),
    { className: "coordinate-selection" }
  );
}

function updateSelectionReadouts() {
  pointReadout.value = selectedPoint ? formatPoint(selectedPoint) : "not selected";
  areaReadout.value = selectedArea ? formatArea(selectedArea) : "not selected";
  captureHint.textContent = selectedArea
    ? "Area captured. The row will use its centre point and bounds."
    : selectedPoint
      ? "Point captured. Complete the fields and copy the workbook row."
      : "Pick a point or area, then add the step details.";
}

function formatPoint(point) {
  if (!point) return "not selected";
  return `m: ${point.mapId ?? getMapId()}, x: ${point.x}, y: ${point.y}, z: ${point.z ?? getPlane()}`;
}

function formatArea(area) {
  if (!area) return "not selected";
  return `m: ${area.mapId ?? getMapId()}, x: ${area.minX}-${area.maxX}, y: ${area.minY}-${area.maxY}, z: ${area.z}`;
}

function formatPointForSpreadsheet(point) {
  return [point.mapId ?? getMapId(), point.z ?? getPlane(), point.x, point.y, point.z ?? getPlane()].join("\t");
}

function formatAreaForSpreadsheet(area, point) {
  const centerPoint =
    point ??
    {
      mapId: area.mapId,
      x: Math.round((area.minX + area.maxX) / 2),
      y: Math.round((area.minY + area.maxY) / 2),
      z: area.z,
    };
  return [
    area.mapId ?? getMapId(),
    area.z ?? getPlane(),
    centerPoint.x,
    centerPoint.y,
    centerPoint.z ?? area.z ?? getPlane(),
    area.minX,
    area.minY,
    area.maxX,
    area.maxY,
    area.z ?? getPlane(),
  ].join("\t");
}

function getStepRow() {
  const point = selectedPoint ?? areaCenterPoint(selectedArea);
  const area = selectedArea;
  const mapUrl = writeStateToUrl(getCurrentState()).toString();
  const quest = getSelectedQuest();
  return [
    stepIdInput.value,
    questIdInput.value,
    quest?.questName ?? "",
    sourceStepNumberInput.value,
    stepTypeInput.value,
    objectiveInput.value.trim(),
    locationIdInput.value.trim(),
    point.mapId ?? getMapId(),
    point.z ?? getPlane(),
    point.x,
    point.y,
    point.z ?? getPlane(),
    area?.minX ?? "",
    area?.minY ?? "",
    area?.maxX ?? "",
    area?.maxY ?? "",
    area?.z ?? "",
    "",
    "",
    "",
    "",
    npcObjectInput.value.trim(),
    "",
    "",
    "",
    "",
    sourceIdInput.value.trim(),
    stepStatusInput.value,
    "",
    mapUrl,
  ];
}

function areaCenterPoint(area) {
  return {
    mapId: area.mapId,
    x: Math.round((area.minX + area.maxX) / 2),
    y: Math.round((area.minY + area.maxY) / 2),
    z: area.z,
  };
}

function getSuggestedStepId() {
  const highestId = getAllStepRows().reduce((highest, row) => {
    const match = String(row["Step ID"] ?? "").match(/^QS-(\d+)$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `QS-${String(highestId + 1).padStart(4, "0")}`;
}

function getSuggestedGuideStepNumber(questId) {
  const highestStep = getAllStepRows().reduce((highest, row) => {
    if (String(row["Quest ID"] ?? "") !== questId) return highest;
    const value = Number(row["Source Step No."]);
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);
  return String(highestStep + 1);
}

function getSuggestedLocationId() {
  const highestId = getAllStepRows().reduce((highest, row) => {
    const match = String(row["Location ID"] ?? "").match(/^LOC-(\d+)$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `LOC-${String(highestId + 1).padStart(4, "0")}`;
}

function getAllStepRows() {
  return [...workbookRows, ...sessionRows];
}

function getSelectedQuest() {
  return questCatalogue.find((quest) => quest.questId === questSelect.value) ?? null;
}

function applySelectedQuest() {
  const quest = getSelectedQuest();
  questIdInput.value = quest?.questId ?? "";
  sourceIdInput.value = quest?.sourceId ?? "";
}

function refreshGeneratedFields() {
  const quest = getSelectedQuest();
  stepIdInput.value = getSuggestedStepId();
  locationIdInput.value = getSuggestedLocationId();
  sourceStepNumberInput.value = quest ? getSuggestedGuideStepNumber(quest.questId) : "";
  applySelectedQuest();
}

function resetStepForm() {
  [
    objectiveInput,
    npcObjectInput,
  ].forEach((input) => {
    input.value = "";
  });
  stepTypeInput.value = "";
  stepStatusInput.value = "to collect";
  refreshGeneratedFields();
  objectiveInput.focus();
}

async function loadQuestCatalogue(file) {
  questCatalogueStatus.value = "Loading...";
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  questCatalogue = rows
    .map((row) => ({
      questId: readRowText(row, ["Quest ID"]),
      questName: readRowText(row, ["Quest"]),
      sourceId: readRowText(row, ["Source ID"]),
    }))
    .filter((quest) => quest.questId && quest.questName)
    .sort((a, b) => a.questName.localeCompare(b.questName));

  questSelect.replaceChildren(
    new Option("Choose a quest", ""),
    ...questCatalogue.map((quest) => new Option(`${quest.questName} (${quest.questId})`, quest.questId))
  );
  questSelect.disabled = !questCatalogue.length;
  questCatalogueStatus.value = `${questCatalogue.length} quests loaded`;
  applySelectedQuest();
  refreshGeneratedFields();
}

async function copyText(text, button) {
  await navigator.clipboard.writeText(text);
  const original = button.textContent;
  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

async function loadWorkbook(file) {
  workbookStatus.value = "Loading...";
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames.includes("Quest Steps") ? "Quest Steps" : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  workbookRows = rows;
  workbookFeatures = rows.map(rowToFeature).filter(Boolean);
  syncWorkbookLayer();
  refreshGeneratedFields();
  workbookStatus.value = `${rows.length} steps loaded; ${workbookFeatures.length} mapped`;
}

function syncWorkbookLayer() {
  workbookLayer.clearLayers();
  const currentMapId = getMapId();
  const currentPlane = getPlane();
  const visibleFeatures = workbookFeatures.filter((feature) => {
    const mapId = Number(feature.properties?.mapID ?? currentMapId);
    const plane = Number(feature.properties?.plane ?? currentPlane);
    return mapId === currentMapId && plane === currentPlane;
  });
  workbookLayer.addData({
    type: "FeatureCollection",
    features: visibleFeatures,
  });
  renderFeatureList();
}

function rowToFeature(row) {
  const mapId = readRowNumber(row, ["Map ID", "mapID", "MapID"]) ?? SURFACE_MAP_ID;
  const x = readRowNumber(row, ["X"]);
  const y = readRowNumber(row, ["Y"]);
  const z = readRowNumber(row, ["Z", "Area Z", "Map Plane"]) ?? 0;
  const minX = readRowNumber(row, ["Area Min X"]);
  const minY = readRowNumber(row, ["Area Min Y"]);
  const maxX = readRowNumber(row, ["Area Max X"]);
  const maxY = readRowNumber(row, ["Area Max Y"]);
  const hasPoint = Number.isFinite(x) && Number.isFinite(y);
  const hasArea = [minX, minY, maxX, maxY].every(Number.isFinite);

  if (!hasPoint && !hasArea) return null;

  const stepId = readRowText(row, ["Step ID"]) || "Quest step";
  const quest = readRowText(row, ["Quest"]);
  const objective = readRowText(row, ["Objective"]);
  const title = quest ? `${stepId} - ${quest}` : stepId;
  const description = objective || readRowText(row, ["Notes"]);

  if (hasArea) {
    return {
      type: "Feature",
      properties: { title, description, type: "quest-area", mapID: mapId, plane: z },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [minX, minY, z],
            [maxX, minY, z],
            [maxX, maxY, z],
            [minX, maxY, z],
            [minX, minY, z],
          ],
        ],
      },
    };
  }

  return {
    type: "Feature",
    properties: { title, description, type: "quest-step", mapID: mapId, plane: z },
    geometry: { type: "Point", coordinates: [x, y, z] },
  };
}

function readRowNumber(row, names) {
  for (const name of names) {
    const value = row[name];
    if (value === "" || value === undefined || value === null) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readRowText(row, names) {
  for (const name of names) {
    const value = row[name];
    if (value !== "" && value !== undefined && value !== null) return String(value);
  }
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
