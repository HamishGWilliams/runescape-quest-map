# RuneScape Quest Map

Custom RuneScape 3 map workspace for building a fastest quest cape route tool.

This starts as a small, editable Leaflet app that uses public RS3 map tiles and map metadata, then layers project-specific quest route data over the top.

Repository-hosted static map: https://cdn.jsdelivr.net/gh/HamishGWilliams/runescape-quest-map@main/docs/index.html

GitHub Pages target, after Pages is enabled in the repository settings: https://hamishgwilliams.github.io/runescape-quest-map/

## Current Features

- RuneScape surface map using RS3 tile images.
- Map ID selector from `basemaps.json`.
- Plane selector for floors 0 to 3.
- Optional icon tile layer.
- Seed GeoJSON overlay for early quest-route experimentation.
- URL state for map ID, zoom, plane, x, and y.
- Copyable map permalink.
- Temporary "add marker at center" tool for quick route exploration.

## Install

```bash
pnpm install
```

## Run

```bash
pnpm dev
```

Open the local URL printed by Vite.

## Build

```bash
pnpm build
```

Refresh the committed repository-hosted copy:

```bash
pnpm build:docs
```

## Deploy

The repository includes a manual GitHub Pages workflow in `.github/workflows/pages.yml`. GitHub Pages must be enabled for the repository before that workflow can deploy.

Until Pages is enabled, the Obsidian iframe can use the committed `docs/` build through jsDelivr.

## Data Sources

See [project-docs/map-data-sources.md](project-docs/map-data-sources.md).

## Development Direction

1. Convert quest-step rows into GeoJSON point features.
2. Convert route segments into GeoJSON line features.
3. Add import/export helpers for the project Excel workbook or Markdown tables.
4. Add a route-layer editor that writes data back to a durable project format.
5. Add teleport and transport overlays after their upstream schemas are inspected.

## Notes

No license has been selected yet. Decide whether this will remain private, use an open-source license, or use a source-available personal license before publishing widely.
