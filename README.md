# OneUp Brackets Viewer

A lightweight bracket viewer that consumes OneUp `StageStructureResponse` DTOs directly. It renders single elimination, double elimination (with cross-bracket edges), round-robin, and Swiss stages without legacy mapping.

## What it does
- Accepts OneUp API shapes: call `convertStageStructureToViewerData(structure, standings?)` and render
- Supports SE, DE, RR, Swiss; FFA is rejected
- Renders status badges (live/upcoming/completed), semantic round headers, and connector SVGs (connectors disabled for Swiss panels)
- Optional presets for density/theme/double-elim layout; granular layout knobs for everything else
- Ships a browser build: `window.bracketsViewer`, `window.bracketsViewerDTO`, `window.bracketsManager`, `window.inMemoryDatabase`

## Supported stage formats
- `SINGLE_ELIMINATION`
- `DOUBLE_ELIMINATION`
- `ROUND_ROBIN`
- `SWISS`
- `FFA` → not supported (converter throws)

## Install
```bash
npm install brackets-viewer   # or file:/git+https to your fork
```
The package ships a `prepare` hook that builds `dist/` for consumers.

## Render from OneUp DTOs
```ts
import {
  renderBracket,                 // small helper around BracketsViewer.render
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
  showStatusBadges: true,
  showRoundHeaders: true,
});
```

Browser build APIs:
- `window.bracketsViewer.render(data, config?)`
- `window.bracketsViewerDTO.convertStageStructureToViewerData(structure, standings?, options?)`
- `window.bracketsManager`, `window.inMemoryDatabase` (from `brackets-manager` / `brackets-memory-db`)

## Data contract (StageStructureResponse + Standings)
- `stageType` must be `SINGLE_ELIMINATION`, `DOUBLE_ELIMINATION`, `ROUND_ROBIN`, or `SWISS`
- `stageItems[].rounds[].bracketGroup` should describe grouping (e.g., `WINNERS_BRACKET`, `LOSERS_BRACKET`, `FINALS`, `SWISS`); the viewer maps these into winners/losers/finals/placement groups
- `stageItems[].edges[]` are required for DE cross-bracket feeds (`fromMatchId` → `toMatchId`)
- `slots[]` should include `teamName` and `sourceRank` / `sourceStageItemId` for proper labels
- Optional `standings` are consumed for round-robin rankings and Swiss record metadata
- Status mapping: `LIVE/RUNNING/IN_PROGRESS`→Running, `COMPLETE/COMPLETED/FINISHED`→Completed, `UNSCHEDULED/INCOMPLETE/PENDING`→Locked; badges use the numeric status from `brackets-model`

See `demo/api-data.json` for a full Swiss sample and `scripts/generate-demo-data.js` for SE/DE/RR fixtures.

## Configuration quick view
The `config` passed to `renderBracket`/`BracketsViewer.render` controls visuals and behavior. Highlights (defaults in parentheses):
- Selection/clearing: `selector` (auto-assigned if missing), `clear` (true)
- Visibility: `showStatusBadges` (true), `showRoundHeaders` (true), `showConnectors` (true), `showMatchMetadata` (true), `showRankingTable` (false)
- Interaction: `onMatchClick`, `onMatchLabelClick`, `showPopoverOnMatchLabelClick` (true), `highlightParticipantOnHover` (true)
- Slot labels: `participantOriginPlacement` ('before'), `showSlotsOrigin`/`showLowerBracketSlotsOrigin` (true)
- Ranking: `rankingFormula` (3/1/0), `qualifyingCount`, `eliminatedCount`
- Layout & display: `doubleElimMode` ('unified' | 'split', default 'unified'), `viewModelId`, `layoutOverrides`, granular sizing (`matchWidth`, `matchHeight`, `columnWidth`, `rowHeight`, `groupGapX`, `groupGapY`, `bracketAlignment`, `losersBracketOffsetX`, `topOffset`, `leftOffset`, `swissLayerStepY`, `swissBucketGapY`) and `fontSize` ('small' | 'medium' | 'large')
- Theming: `theme` adds `.bv-theme-{theme}` to the root. Built-ins: `bv-theme-default`, `bv-theme-dark` (see `src/style.scss` tokens). The root also gets `.bv-root` plus your `.brackets-viewer` container.

Full option list: `docs/configuration.md`.

## View models (presets)
- `default` – balanced layout, default theme, unified DE
- `broadcast` – wider/taller matches for logos, unified DE
- `de-split-horizontal` – VCT-style split (upper above, lower below, finals to the right) using `bracketAlignment: 'split-horizontal'`

All view models are defined in `src/viewModels.ts` and can be overridden with granular layout controls.

## Participant images
```ts
const viewer = new BracketsViewer();
viewer.setParticipantImages([
  { participantId: 1, imageUrl: '/logos/team1.png' },
]);
await viewer.render(viewerData);
```
Set `--bv-participant-image-size` in CSS if you need larger logos. Use the `broadcast` preset for more room.

## Internationalization
`lang.ts` ships `en`/`fr` bundles. Add more at runtime:
```ts
await viewer.addLocale('de', deLocaleJson);
```

## Swiss layout notes
- Swiss rounds render in boxed “record buckets” with vertical stacking; connectors are intentionally omitted
- Round headers can be hidden per config; records/date/best-of can be surfaced via round metadata
- Swiss records can come from match IDs (`match-{wins}-{losses}-...`) or standings entries

## Demo & sample data
- Generate fixtures: `node scripts/generate-demo-data.js`
- Serve/watch demo: `npm run watch-demo`
- Pages: `demo/with-showcase.html` (all formats), `demo/with-api.html` (Swiss API sample), `demo/test-swiss.html` (Swiss panel regression)

## Development & tests
- `npm run build` – bundle JS/CSS + declarations
- `npm run start` – dev watch (webpack)
- `npm test` – DTO conversion test + Swiss sample type-check (`tsc -p tsconfig.tests.json`)
- `npm run lint` – eslint
Volta pins Node 14.21.3 / npm 7.24.2.

## Need help?
Check that `edges` and `sourceRank` are present (they drive connectors and labels). If you need another format or see mismatches, open an issue or adjust `scripts/generate-demo-data.js` to match your data.
