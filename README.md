# OneUp Brackets Viewer

A lightweight viewer for tournament brackets that consumes the exact DTOs exposed by the OneUp public API. It renders single elimination, double elimination (including losers bracket feeds), round-robin, and Swiss stages without requiring the legacy `StageResponse` structure — you only need a `StageStructureResponse` plus the stage format.

## Features

- **Full Format Support**: Renders `SINGLE_ELIMINATION`, `DOUBLE_ELIMINATION`, `ROUND_ROBIN`, and `SWISS` tournament formats
- **Zero Mapping Required**: Accepts OneUp API DTOs directly—just pass `StageStructureResponse` to `convertStageStructureToViewerData`
- **Automatic Bracket Connections**: Handles losers bracket feeds, consolation finals, and Swiss pairings automatically via `sourceRank` and `edges`
- **Theme Support**: Includes light and dark mode tokens for seamless integration
- **Live Demo**: Bundled examples with data generation scripts for all four supported formats

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

## Configuration Options

The `renderBracket` function accepts an optional configuration object to customize the viewer's appearance and behavior:

```ts
await renderBracket('#tournament-bracket', viewerData, {
  selector: '#tournament-bracket',
  clear: true,
  showStatusBadges: true,      // Show match status badges (LIVE, completed, upcoming)
  showRoundHeaders: true,       // Show semantic round labels (Finals, Semi-Finals, etc.)
  doubleElimMode: 'unified',    // 'unified' or 'split' mode for double elimination
  theme: 'dark',                // Apply a theme class for CSS variable overrides
});
```

### Available Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `selector` | `string` | `'.brackets-viewer'` | CSS selector for the root element |
| `clear` | `boolean` | `false` | Clear any previously displayed data before rendering |
| `showStatusBadges` | `boolean` | `true` | Display color-coded status badges on matches (LIVE with pulse animation, completed with checkmark, upcoming with clock icon) |
| `showRoundHeaders` | `boolean` | `true` | Show semantic round labels calculated from position (e.g., "Finals", "Semi-Finals", "Quarter-Finals", "Round of 16"). For double elimination, labels are prefixed with WB/LB (e.g., "WB Finals", "LB Semi-Finals") |
| `doubleElimMode` | `'unified' \| 'split'` | `'unified'` | Rendering mode for double elimination: `unified` displays all brackets on a single canvas with cross-bracket connectors visible, `split` renders brackets separately (legacy behavior) |
| `theme` | `string` | `undefined` | Theme identifier that applies a `.bv-theme-{theme}` class to the container. Use `'dark'` for the built-in dark theme or provide your own theme with CSS variables |
| `highlightParticipantOnHover` | `boolean` | `true` | Highlight every instance of a participant across all matches on hover |
| `showSlotsOrigin` | `boolean` | `true` | Show the origin of slots (e.g., "Seed #1", "Loser of WB 2.1") |
| `showLowerBracketSlotsOrigin` | `boolean` | `true` | Show slot origins specifically in the loser bracket |
| `showRankingTable` | `boolean` | `true` | Display ranking tables in round-robin and Swiss stages |
| `showPopoverOnMatchLabelClick` | `boolean` | `true` | Display a popover when clicking match labels that have child games |
| `participantOriginPlacement` | `'before' \| 'after' \| 'none'` | `'before'` | Position of participant seed/origin relative to name: `before` = "#1 Team", `after` = "Team (#1)", `none` = hidden |
| `separatedChildCountLabel` | `boolean` | `false` | Separate match label and child count (Bo3) into opposite corners of the match box |
| `onMatchClick` | `(match: Match) => void` | `undefined` | Callback fired when a match is clicked |
| `onMatchLabelClick` | `(match: Match) => void` | `undefined` | Callback fired when a match label is clicked |
| `customRoundName` | `function` | `undefined` | Custom function to override round names. Use `addLocale()` for simple translations instead |
| `rankingFormula` | `function` | `(item) => 3 * item.wins + 1 * item.draws + 0 * item.losses` | Formula to compute participant rankings in round-robin/Swiss stages |

### Status Badges

When `showStatusBadges: true` (default), matches display visual indicators:

- **LIVE**: Green badge with pulsing animation
- **Completed**: Gray checkmark badge
- **Upcoming**: Blue clock icon badge
- **Pending**: No badge displayed

### Semantic Round Headers

When `showRoundHeaders: true` (default), round labels are automatically calculated based on the round's position from the end:

- **Single Elimination**: "Finals", "Semi-Finals", "Quarter-Finals", "Round of 16", etc.
- **Double Elimination (Winner Bracket)**: "WB Finals", "WB Semi-Finals", "WB Quarter-Finals", etc.
- **Double Elimination (Loser Bracket)**: "LB Finals", "LB Semi-Finals", "LB Quarter-Finals", etc.
- **Grand Finals**: "Grand Finals" or "Grand Finals - Match 1/2" for bracket reset scenarios

This feature supports internationalization through the `addLocale()` function.

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

If you need the viewer to render a new format (e.g., FFA) or you run into data mismatches, make sure the backend is returning `sourceRank` values and `edges`. Those two fields drive all bracket connections. Otherwise, file an issue or update `scripts/generate-demo-data.js` to match the structure you expect.
