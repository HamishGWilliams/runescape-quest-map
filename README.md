# RuneScape Quest Map

Custom RuneScape 3 map workspace for building a fastest quest cape route tool.

This starts as a small, editable Leaflet app that uses public RS3 map tiles and map metadata, then layers project-specific quest route data over the top.

Repository-hosted static map: https://htmlpreview.github.io/?https://github.com/HamishGWilliams/runescape-quest-map/blob/main/docs/index.html

GitHub Pages target, after Pages is enabled in the repository settings: https://hamishgwilliams.github.io/runescape-quest-map/

## Current Features

- RuneScape surface map using RS3 tile images.
- Map ID selector from `basemaps.json`.
- Plane selector for floors 0 to 3.
- Optional icon tile layer.
- Seed GeoJSON overlay for early quest-route experimentation.
- Coordinate picker for point capture and rectangular area capture.
- Quest-step composer that combines a captured location with guide metadata and copies a full, tab-separated workbook row.
- Local quest-catalogue import with a searchable-style selector that fills the quest, quest/source IDs, next global step ID, next guide step number, and next location ID.
- Local `.xlsx` quest-step workbook import for previewing mapped rows.
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

Until Pages is enabled, the Obsidian iframe can use the committed, self-contained `docs/` build through HTMLPreview.

## Data Sources

See [project-docs/map-data-sources.md](project-docs/map-data-sources.md).

## Development Direction

1. Convert quest-step rows into GeoJSON point features.
2. Convert route segments into GeoJSON line features.
3. Add an import/append workflow for committed, reviewed rows after they have been pasted into the project workbook.
4. Add a route-layer editor that writes data back to a durable project format.
5. Add teleport and transport overlays after their upstream schemas are inspected.

## Notes

No license has been selected yet. Decide whether this will remain private, use an open-source license, or use a source-available personal license before publishing widely.
