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

### View Model Presets

View models provide preset configurations that bundle layout density, visual theme, and double elimination mode together. They're the easiest way to get a consistent look without manual configuration.

**Usage:**

```ts
await renderBracket('#tournament-bracket', viewerData, {
  viewModelId: 'broadcast',  // Broadcast preset with room for logos
});
```

**Available Presets:**

| Preset ID | Description | Stage Types | Layout |
| --------- | ----------- | ----------- | ------ |
| `default` | Standard layout for all stages | All | 150px × 60px |
| `broadcast` | Broadcast/streaming with room for logos | SE, DE | 200px × 80px |
| `de-split-horizontal` | VCT-style split layout | DE | 150px × 60px |

**Default mappings by stage type:**
- Single/Double Elimination → `broadcast`
- Round Robin/Swiss → `default`

**When to use:**
- Public broadcasts with logos: `broadcast`
- VCT/esports-style double elimination: `de-split-horizontal` (upper bracket top, lower bracket below, finals to the right)
- Compact admin dashboards: `default`

#### Split Horizontal Layout (VCT Style)

The `de-split-horizontal` preset renders double elimination in the classic esports broadcast style:

```ts
await renderBracket('#tournament-bracket', viewerData, {
  viewModelId: 'de-split-horizontal',
});
```

**Layout characteristics:**
- **Upper bracket (Winners)**: Positioned at top, flows left → right
- **Lower bracket (Losers)**: Positioned below upper bracket, flows left → right
- **Grand Finals**: Positioned to the right, vertically centered between upper and lower brackets
- **Visual connections**: Lower bracket final connects visibly to Grand Finals

This layout matches major esports broadcasts like Valorant Champions Tour (VCT), League of Legends Worlds, and other professional tournaments.

### Granular Layout Customization

For fine-grained control beyond presets, use `layoutOverrides` to customize specific dimensions:

```ts
await renderBracket('#tournament-bracket', viewerData, {
  viewModelId: 'default',
  layoutOverrides: {
    matchWidth: 180,      // Match card width in pixels
    matchHeight: 64,      // Match card height in pixels
    columnWidth: 220,     // Total column width (match + gap)
    rowHeight: 72,        // Row height for vertical spacing
    topOffset: 50,        // Top padding
    groupGapY: 80,        // Vertical gap between bracket groups
  },
});
```

**Available Layout Options:**

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `matchWidth` | `number` | 150 | Match card width in pixels |
| `matchHeight` | `number` | 60 | Match card height in pixels |
| `columnWidth` | `number` | 190 | Total column width (match + round gap) |
| `rowHeight` | `number` | 64 | Row height for vertical spacing |
| `topOffset` | `number` | 50 | Top padding for the bracket |
| `leftOffset` | `number` | 0 | Left padding for the bracket |
| `groupGapX` | `number` | 1 | Horizontal gap between bracket groups |
| `groupGapY` | `number` | 60 | Vertical gap between bracket groups |
| `bracketAlignment` | `string` | `'bottom'` | Vertical alignment: `'top'`, `'center'`, `'bottom'`, `'finals-top'` |

---

## Participant Images

Display team logos or avatars to the left of participant names using the `setParticipantImages()` method.

### Usage

Call `setParticipantImages()` **before** rendering the bracket:

```typescript
const viewer = new BracketsViewer();

// Set participant images
viewer.setParticipantImages([
  { participantId: 1, imageUrl: 'https://example.com/team1-logo.png' },
  { participantId: 2, imageUrl: 'https://example.com/team2-logo.png' },
  { participantId: 3, imageUrl: 'https://example.com/team3-logo.png' },
  // ... more participants
]);

// Then render
await viewer.render(viewerData, {
  selector: '.brackets-viewer',
});
```

### API

```typescript
setParticipantImages(images: ParticipantImage[]): void

interface ParticipantImage {
  participantId: number;  // Must match a participant ID from your data
  imageUrl: string;       // URL to the image (can be relative or absolute)
}
```

### Customization

**Image Size:**

Control the image size using the CSS variable `--bv-participant-image-size`:

```css
.brackets-viewer {
  --bv-participant-image-size: 1.5em; /* Default is 1em */
}
```

**Recommended View Models:**

For best results with logos/images, use the `broadcast` preset which provides 200px × 80px matches with plenty of room for logos. For compact displays, use `default` with custom `layoutOverrides`.

**Image Guidelines:**
- Square images (1:1 aspect ratio) work best due to `object-fit: cover`
- Recommended minimum size: 64px × 64px
- Supported formats: PNG, JPG, SVG, GIF
- Images are rendered with 2px border-radius and 4px right margin

### Example with Generated Avatars

You can use services like ui-avatars.com to generate placeholder avatars:

```typescript
const participantImages = participants.map(p => ({
  participantId: p.id,
  imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=64&background=random&color=fff`,
}));

viewer.setParticipantImages(participantImages);
```

---

## CSS Variables Reference

The viewer uses CSS custom properties for theming. Override these in your stylesheet:

### Core Colors

```css
.brackets-viewer {
  --bv-bg-color: #fff;              /* Background color */
  --bv-surface-color: #eceff1;      /* Surface/card background */
  --bv-match-bg-color: #fff;        /* Match card background */
  --bv-text-color: #212529;         /* Primary text */
  --bv-heading-color: #6b6b6b;      /* Headings */
  --bv-hint-color: #a7a7a7;         /* Secondary text */
  --bv-border-color: #d9d9d9;       /* Borders */
  --bv-win-color: #50b649;          /* Winner highlight */
  --bv-lose-color: #e61a1a;         /* Loser highlight */
}
```

### Typography Scale

```css
.brackets-viewer {
  --bv-font-family: 'Roboto', sans-serif;
  --bv-font-size-xs: 0.6875rem;     /* 11px */
  --bv-font-size-sm: 0.75rem;       /* 12px */
  --bv-font-size-base: 0.875rem;    /* 14px */
  --bv-font-size-lg: 1rem;          /* 16px */
  --bv-font-size-xl: 1.25rem;       /* 20px */
  --bv-font-size-2xl: 1.5rem;       /* 24px */
}
```

### Connector Colors

```css
.brackets-viewer {
  --bv-connector-internal: #9e9e9e;      /* Standard bracket lines */
  --bv-connector-cross-bracket: #b0b0b0; /* Cross-bracket connections */
  --bv-connector-grand-final: #5c7cfa;   /* Grand finals connector */
}
```

### Zone Colors (Round Robin / Swiss)

```css
.brackets-viewer {
  --bv-zone-advancing-bg: #ecfdf5;       /* Advancing zone background */
  --bv-zone-advancing-border: #10b981;   /* Advancing zone border */
  --bv-zone-bubble-bg: #fffbeb;          /* Bubble zone background */
  --bv-zone-bubble-border: #f59e0b;      /* Bubble zone border */
  --bv-zone-eliminated-bg: #fef2f2;      /* Eliminated zone background */
  --bv-zone-eliminated-border: #ef4444;  /* Eliminated zone border */
}
```

### Dark Theme

Apply the dark theme by adding `bv-theme-dark` class or setting `theme: 'dark'` in config:

```css
.brackets-viewer.bv-theme-dark {
  --bv-bg-color: #1e1e1e;
  --bv-surface-color: #2a2a2a;
  --bv-text-color: #f5f5f5;
  /* ... other dark overrides */
}
```

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
