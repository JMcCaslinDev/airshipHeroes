# Ship designs

Bundled hull JSON lives under `public/assets/ships/`.

| Path | Kind | Notes |
|------|------|--------|
| `default.json` | player | Default player hull |
| `npc/raider-compact-1.json` … `3.json` | npc-compact | Original small AI layouts (kept) |
| `npc/sky-reaver.json` | npc | Large arena bot |
| `npc/storm-finch.json` | npc | Large arena bot |
| `npc/iron-gale.json` | npc | Large arena bot |

Catalog index: `src/ships/shipCatalog.js` (`SHIP_CATALOG`, `listShipDesigns()`).

Arena bots load the large `npc` designs via `resolveNpcShipDefinition`. Compact files remain for reference / fallback.
