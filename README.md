# OneUp Brackets Viewer

A lightweight viewer for tournament brackets that consumes the exact DTOs exposed by the OneUp public API. It renders single elimination, double elimination (including losers bracket feeds), round-robin, and Swiss stages without requiring the legacy `StageResponse` structure — you only need a `StageStructureResponse` plus the stage format.

## Highlights

- Supports every structure the public API returns: `SINGLE_ELIMINATION`, `DOUBLE_ELIMINATION`, `ROUND_ROBIN`, `SWISS` (FFA is not rendered).
- Accepts backend DTOs directly. No manual mapping or custom wiring is required; just pass the API response into `convertStageStructureToViewerData`.
- Bundled demo and data-generation script so you can preview all four formats using the same seed sizes as the default tournaments.

---

## Quick Start

1. **Install** (from your local checkout or git reference – the package exposes a `prepare` script that builds `dist/`):

   ```bash
   npm install brackets-viewer   # replace with file: or git+https dependency as needed
   ```

2. **Include the bundle** wherever you render the viewer (either import from your bundler or drop the built files on the page):

   ```html
   <link rel="stylesheet" href="/node_modules/brackets-viewer/dist/brackets-viewer.min.css" />
   <script type="text/javascript" src="/node_modules/brackets-viewer/dist/brackets-viewer.min.js"></script>
   ```

3. **Render a stage** using the structure and standings returned by the OneUp API:

   ```ts
   import {
     renderBracket,
     convertStageStructureToViewerData,
     type StageStructureResponse,
     type StageStandingsResponse,
   } from 'brackets-viewer';

   const structure: StageStructureResponse = await getStageStructure(slug, stageId);
   const standings: StageStandingsResponse | undefined = await getStageStandings(slug, stageId);

   const viewerData = convertStageStructureToViewerData(structure, standings, {
     stageName: 'Playoffs',
     stageNumber: 1,
   });

   await renderBracket('#tournament-bracket', viewerData, {
     selector: '#tournament-bracket',
     clear: true,
   });
   ```

   The global build exposes the same API at `window.bracketsViewer.render(...)` and `window.bracketsViewerDTO.convertStageStructureToViewerData(...)`.

---

## DTO Requirements

All the models live under `src/api/models`. The viewer only needs a `StageStructureResponse` and an optional `StageStandingsResponse`. The structure DTO mirrors the backend OpenAPI schema:

| Field | Description |
| ----- | ----------- |
| `stageId` | UUID of the stage. |
| `stageType` | One of `SINGLE_ELIMINATION`, `DOUBLE_ELIMINATION`, `ROUND_ROBIN`, `SWISS`. |
| `stageItems[]` | Each item maps to a group/bracket (winners bracket, losers bracket, finals, Swiss groups, etc.). |
| `stageItems[].rounds[]` | Ordered rounds per group. |
| `rounds[].matches[]` | Matches belonging to the round; each match includes `id`, `matchIndex`, `status`, `slots[]`. |
| `matches[].slots[]` | Participant slots, seed metadata, and `sourceRank`/`sourceStageItemId`. |
| `stageItems[].edges[]` | `fromMatchId` → `toMatchId` advancement links. Required for double elimination. |

The converter ignores everything else. If you send the backend response verbatim, it already includes populated `sourceRank` values and `edges`, so losers bracket feeds and Swiss pairings render automatically.

### Minimal Example

```json
{
  "stageId": "4cfe40e7-50f5-4c16-9ee3-da4211fde700",
  "stageType": "SINGLE_ELIMINATION",
  "stageItems": [
    {
      "id": "a71fd9d2-0435-4fe7-9e7d-023605623f8a",
      "groupIndex": 1,
      "rounds": [
        {
          "number": 1,
          "bracketGroup": "WINNERS_BRACKET",
          "matches": [
            {
              "id": "af599158-f292-4302-9e2d-4f31d67d9a5b",
              "matchIndex": 0,
              "status": "UNSCHEDULED",
              "slots": [
                { "slot": 1, "teamName": "Team 1", "sourceRank": 1 },
                { "slot": 2, "teamName": "Team 16", "sourceRank": 16 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Give that structure (plus optional standings) to the converter and the viewer takes care of everything else.

---

## Demo & Sample Data

The repository ships with demo fixtures that mirror the four default tournaments (16-team SE, 32-team DE, 10-team RR, 12-team Swiss). Regenerate them whenever you need a fresh snapshot:

```bash
node scripts/generate-demo-data.js
```

Then open the showcase/demo pages:

```bash
npm run watch-demo   # serves demo/ and watches dist/
```

- `demo/with-showcase.html` cycles through all formats using the DTO converter.
- `demo/with-api.html` renders the Swiss sample via `demo/api-data.json`.

---

## Development

- `npm run build` – bundles JS/CSS to `dist/`.
- `npm test` – type-checks the DTO models used in the converter and exercises the Swiss sample.
- `npm run start` – watch mode for the core bundle.

When consuming the viewer from another project, make sure you run `npm run build` (or rely on the `prepare` hook) so the `dist/` artifacts exist before installing.

---

## Stage Type Reference

| Stage type | Description |
| ---------- | ----------- |
| `SINGLE_ELIMINATION` | One bracket + optional consolation final. |
| `DOUBLE_ELIMINATION` | Winners bracket, losers bracket, finals group (grand + reset). Requires populated `edges`. |
| `ROUND_ROBIN` | Multiple groups; viewer automatically renders a ranking table per group when standings are provided. |
| `SWISS` | Single group of Swiss rounds; supports ranking tables when standings are present. |
| `FFA` | Not supported by the viewer. The converter will throw an error if you pass this type. |

Send exactly these enum values in `StageStructureResponse.stageType` and the converter handles the rest.

---

## Need Help?

If you need the viewer to render a new format (e.g., FFA) or you run into data mismatches, make sure the backend is returning `sourceRank` values and `edges`. Those two fields drive all bracket connections. Otherwise, file an issue or update `scripts/generate-demo-data.js` to match the structure you expect.***
