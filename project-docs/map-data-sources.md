# Map Data Sources

This project begins from public RuneScape Wiki cartography data and Mej's RS3 map repositories.

## Primary Sources

| Source | URL | Use |
| --- | --- | --- |
| RuneScape Wiki map project | https://runescape.wiki/w/RuneScape:Map | Architecture notes, tile path model, GeoJSON overlay examples, and project links. |
| Creating maps | https://runescape.wiki/w/RuneScape:Map/Creating_maps | GeoJSON feature conventions for pins, lines, polygons, text, titles, and descriptions. |
| Map IDs | https://runescape.wiki/w/RuneScape:Map/mapIDs | Human-readable map ID index. |
| RS3 basemaps JSON | https://raw.githubusercontent.com/mejrs/data_rs3/master/basemaps.json | Machine-readable map ID, name, bounds, and center metadata. |
| RS3 tile layers | https://github.com/mejrs/layers_rs3 | Map and icon tile images. |
| RS3 data repository | https://github.com/mejrs/data_rs3 | Candidate source for labels, NPCs, objects, teleports, transports, and clue data. |

## Current Tile URL Contracts

Map tiles:

```text
https://raw.githubusercontent.com/mejrs/layers_rs3/master/map_squares/{mapId}/{zoom}/{plane}_{x}_{y}.png
```

Icon tiles:

```text
https://raw.githubusercontent.com/mejrs/layers_rs3/master/icon_squares/{mapId}/{zoom}/{plane}_{x}_{y}.png
```

The app's custom `RsTileLayer` follows the same y-axis conversion used by the upstream map code:

```js
rsY = -(leafletTileY + 1)
```

## Candidate Future Imports

| Dataset | URL | Possible Use | Caution |
| --- | --- | --- | --- |
| `teleport_data.json` | https://raw.githubusercontent.com/mejrs/data_rs3/master/teleport_data.json | Seed teleport destinations and requirements. | Inspect schema before import. |
| `transport_data.json` | https://raw.githubusercontent.com/mejrs/data_rs3/master/transport_data.json | Seed boats, shortcuts, portals, and other movement links. | Large file; filter before use. |
| `map_label_locations.json` | https://raw.githubusercontent.com/mejrs/data_rs3/master/map_label_locations.json | Searchable map labels and region names. | May need reconciliation with quest route location IDs. |
| `map_npcs.json` | https://raw.githubusercontent.com/mejrs/data_rs3/master/map_npcs.json | NPC location candidates for quest steps. | NPC IDs/names need validation against quest state. |
| `object_name_collection.json` | https://raw.githubusercontent.com/mejrs/data_rs3/master/object_name_collection.json | Object lookup for quest interaction points. | Very broad; import only scoped subsets. |

## Project Rule

Keep the route source of truth in editable project data first: quest catalogue, quest-step rows, location rows, item/source rows, teleport rows, and route segment rows. Generate map overlays from that data rather than manually drawing the final route on the map.
