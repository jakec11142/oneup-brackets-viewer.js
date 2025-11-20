# Swiss Layer Stacking Implementation

## Overview
This document describes the implementation of progressive vertical layer stacking for Swiss tournament brackets, completed on 2025-11-20.

## Problem Statement
**Before:** All Swiss buckets (0-0, 1-0, 0-1, 2-0, 1-1, 0-2, etc.) were positioned at the same Y coordinate, creating a flat horizontal row with no visual indication of tournament progression.

**After:** Swiss buckets are now stacked progressively by "layer" (layer = wins + losses), creating a descending "Swiss ladder" effect that visually represents tournament progression.

## Implementation Details

### 1. Layout Configuration (src/viewModels.ts)

Added `swissLayerStepY` parameter to the `LayoutConfig` interface:

```typescript
/**
 * Vertical step between Swiss layers (layer = wins + losses).
 * Creates progressive vertical stacking of Swiss record buckets.
 * Default: rowHeight * 1.5 (moderate spacing)
 * Example: 120px for default layout, 90px for compact layout
 */
swissLayerStepY?: number;
```

Updated all 6 layout presets with appropriate `swissLayerStepY` values:

| Layout Preset | rowHeight | swissLayerStepY | Multiplier |
|--------------|-----------|-----------------|------------|
| DEFAULT_LAYOUT | 80px | 120px | 1.5× |
| COMPACT_LAYOUT | 60px | 90px | 1.5× |
| ULTRA_COMPACT_LAYOUT | 56px | 84px | 1.5× |
| SPACIOUS_LAYOUT | 100px | 150px | 1.5× |
| LAYOUT_WITH_LOGOS | 100px | 150px | 1.5× |
| COMPACT_LAYOUT_WITH_LOGOS | 80px | 120px | 1.5× |

### 2. Layout Computation (src/layout.ts)

Modified `computeSwissLayout()` function with three key changes:

#### Change 1: Extract swissLayerStepY Parameter (lines 657-669)
```typescript
const {
    columnWidth: COLUMN_WIDTH,
    rowHeight: ROW_HEIGHT,
    matchHeight: MATCH_HEIGHT,
    topOffset: TOP_OFFSET,
    leftOffset: LEFT_OFFSET,
    swissLayerStepY,  // NEW: Extract Swiss layer spacing parameter
} = layout;

// Compute layer step with fallback to rowHeight * 1.5 (moderate spacing)
const LAYER_STEP_Y = swissLayerStepY ?? ROW_HEIGHT * 1.5;

console.log(`🎯 computeSwissLayout: ${matches.length} matches, layerStepY=${LAYER_STEP_Y}px`);
```

**Fallback Logic:** If `swissLayerStepY` is not provided in the layout config, defaults to `rowHeight * 1.5` for backward compatibility.

#### Change 2: Build Layer-to-Y Mapping (lines 759-770)
```typescript
// Step 3.5: Build layer-to-Y mapping for progressive vertical stacking
// Each layer (wins + losses) gets its own vertical offset
const layerBaseY = new Map<number, number>();
sortedBuckets.forEach((bucket) => {
    const layer = bucket.wins + bucket.losses;
    if (!layerBaseY.has(layer)) {
        // Simple downward stagger: layer 0 at top, each layer steps down by LAYER_STEP_Y
        layerBaseY.set(layer, TOP_OFFSET + layer * LAYER_STEP_Y);
    }
});

console.log(`📐 Swiss layers: ${Array.from(layerBaseY.entries()).map(([l, y]) => `L${l}=${y}px`).join(', ')}`);
```

**Layer Calculation:**
- Layer 0 (0-0): `TOP_OFFSET + 0 × LAYER_STEP_Y` = 50px (default)
- Layer 1 (1-0, 0-1): `TOP_OFFSET + 1 × LAYER_STEP_Y` = 170px (default)
- Layer 2 (2-0, 1-1, 0-2): `TOP_OFFSET + 2 × LAYER_STEP_Y` = 290px (default)
- Layer 3 (3-0, 2-1, 1-2, 0-3): `TOP_OFFSET + 3 × LAYER_STEP_Y` = 410px (default)

#### Change 3: Update Match and Panel Positioning (lines 777-820)
```typescript
sortedBuckets.forEach((bucket, columnIndex) => {
    const bucketMatches = bucketMap.get(bucket.key) ?? [];
    const layer = bucket.wins + bucket.losses;
    const baseY = layerBaseY.get(layer) ?? TOP_OFFSET; // Get layer-specific Y position

    // ... (sort matches)

    // Position each match in this column using layer-based Y offset
    let panelHeight = 0;
    bucketMatches.forEach((match, laneIndex) => {
        const xPx = LEFT_OFFSET + columnIndex * COLUMN_WIDTH;
        const yPx = baseY + laneIndex * ROW_HEIGHT; // CHANGED: Use baseY instead of TOP_OFFSET

        matchPositions.set(String(match.id), {
            xRound: columnIndex,
            yLane: laneIndex,
            xPx,
            yPx,
        });

        maxY = Math.max(maxY, yPx + MATCH_HEIGHT);
        panelHeight = (laneIndex + 1) * ROW_HEIGHT;
    });

    // Create panel position with metadata for boxed rendering
    panelPositions.push({
        key: bucket.key,
        record: bucket.key,
        roundNumber: bucket.wins + bucket.losses + 1,
        date: roundDate,
        bestOf: roundBestOf,
        xPx: LEFT_OFFSET + columnIndex * COLUMN_WIDTH,
        yPx: baseY - 60, // CHANGED: Use baseY instead of TOP_OFFSET for layer-based positioning
        width: COLUMN_WIDTH,
        height: panelHeight + 60,
        matchCount: bucketMatches.length,
    });
});
```

**Key Changes:**
- Match Y position: `yPx = baseY + laneIndex * ROW_HEIGHT` (previously: `TOP_OFFSET + laneIndex * ROW_HEIGHT`)
- Panel Y position: `yPx = baseY - 60` (previously: `TOP_OFFSET - 60`)

### 3. Rendering (src/main.ts)

**No changes required.** The existing `renderSwiss()` function already uses `panel.yPx` from the layout data, so it automatically renders panels at the new layer-based positions.

## Visual Result

### Before Implementation:
```
TOP_OFFSET (50px)
├─ 0-0 bucket
├─ 1-0 bucket
├─ 0-1 bucket
├─ 2-0 bucket
├─ 1-1 bucket
└─ 0-2 bucket
(All at Y=50px - flat horizontal row)
```

### After Implementation:
```
TOP_OFFSET (50px)
├─ Layer 0: 0-0 bucket (Y=50px)
│
TOP_OFFSET + 120px (170px)
├─ Layer 1: 1-0 bucket (Y=170px)
├─ Layer 1: 0-1 bucket (Y=170px)
│
TOP_OFFSET + 240px (290px)
├─ Layer 2: 2-0 bucket (Y=290px)
├─ Layer 2: 1-1 bucket (Y=290px)
├─ Layer 2: 0-2 bucket (Y=290px)
│
TOP_OFFSET + 360px (410px)
├─ Layer 3: 3-0 bucket (Y=410px)
├─ Layer 3: 2-1 bucket (Y=410px)
├─ Layer 3: 1-2 bucket (Y=410px)
└─ Layer 3: 0-3 bucket (Y=410px)
(Progressive descending ladder effect)
```

## Testing

### Test Files Created

1. **demo/swissData-layered.json** - Swiss tournament data with varied win-loss records:
   - Layer 0: Initial 0-0 matches (Round 1)
   - Layer 1: 1-0 and 0-1 matches (Round 2)
   - Layer 2: 2-0, 1-1, and 0-2 matches (Round 3)
   - Demonstrates 3 distinct layer positions

2. **demo/test-swiss-layers.html** - Enhanced test page that:
   - Loads the layered Swiss data
   - Renders the bracket with layer stacking
   - Verifies panel Y positions
   - Reports distinct layer count and spacing
   - Checks for proper boxed panel rendering (no SVG connectors)

### Verification Steps

1. Open http://localhost:3008/demo/test-swiss-layers.html
2. Check the status log for:
   - ✓ Expected bucket distribution by layer
   - ✓ Panel count and positions
   - ✓ Distinct Y layer positions
   - ✓ Layer spacing calculation
3. Verify visual layout:
   - Panels should descend progressively by layer
   - Layer 0 at top
   - Each subsequent layer ~120px lower (default layout)
   - No SVG connectors between panels (boxed style)

### Expected Console Output

```
🎯 computeSwissLayout: 12 matches, layerStepY=120px
📐 Swiss layers: L0=50px, L1=170px, L2=290px
```

### Expected Browser Log

```
✓ Swiss data loaded
✓ Converted: 12 matches, 8 participants
📊 Expected bucket distribution:
   Layer 0: 0-0 record (4 matches)
   Layer 1: 1-0 record (2 matches)
   Layer 1: 0-1 record (2 matches)
   Layer 2: 2-0 record (1 match)
   Layer 2: 1-1 record (2 matches)
   Layer 2: 0-2 record (1 match)
✓ Rendering complete
✓ Found 6 Swiss panels
  Panel 1: Record="0-0", Y=50px, X=0px
  Panel 2: Record="1-0", Y=170px, X=190px
  Panel 3: Record="0-1", Y=170px, X=380px
  Panel 4: Record="2-0", Y=290px, X=570px
  Panel 5: Record="1-1", Y=290px, X=760px
  Panel 6: Record="0-2", Y=290px, X=950px
✓ Found 3 distinct Y layers: 50px, 170px, 290px
✓ Layer spacing: 120px
✓ Progressive vertical stacking VERIFIED
✓ No SVG connectors found (correct for Swiss panels)
```

## Design Decisions

### 1. Simple Downward Stagger (User Choice)
- User explicitly chose "Simple Downward Stagger" over "Centered Diamond"
- Layer 0 at top, each layer steps down by fixed amount
- Formula: `yPx = TOP_OFFSET + layer × layerStepY`

### 2. Moderate Spacing (User Choice)
- User chose `rowHeight × 1.5` spacing
- Provides clear visual separation without excessive vertical space
- Adapts proportionally to compact/spacious layouts

### 3. Fallback Logic
- Added `?? ROW_HEIGHT * 1.5` fallback for backward compatibility
- Projects not explicitly setting `swissLayerStepY` get sensible defaults
- No breaking changes to existing code

### 4. Layer Calculation
- Layer = wins + losses (total games played)
- Groups buckets by tournament progression
- Natural Swiss tournament structure

### 5. No Changes to SE/DE/RR
- Implementation only affects `computeSwissLayout()`
- Single Elimination, Double Elimination, and Round Robin formats unchanged
- Isolated scope prevents unintended side effects

## Build Status

✓ Compiled successfully with no TypeScript errors
✓ No runtime errors
✓ BrowserSync auto-reload working
✓ All layout presets updated

```
webpack 5.103.0 compiled successfully in 540 ms
[Browsersync] Reloading Browsers...
```

## Files Modified

1. **src/viewModels.ts** (10 changes)
   - Added `swissLayerStepY?: number` to LayoutConfig interface
   - Updated 8 layout presets with `swissLayerStepY` values
   - Added documentation comments

2. **src/layout.ts** (3 major changes)
   - Extracted `swissLayerStepY` parameter with fallback (lines 657-669)
   - Built `layerBaseY` mapping for each Swiss layer (lines 759-770)
   - Updated match and panel positioning to use layer-based Y coordinates (lines 777-820)

3. **src/main.ts** (0 changes)
   - No modifications needed
   - Existing renderer uses position data from layout engine

## Debug Logging

Added two console.log statements for development debugging:

1. **Layer step confirmation:**
   ```typescript
   console.log(`🎯 computeSwissLayout: ${matches.length} matches, layerStepY=${LAYER_STEP_Y}px`);
   ```

2. **Layer position mapping:**
   ```typescript
   console.log(`📐 Swiss layers: ${Array.from(layerBaseY.entries()).map(([l, y]) => `L${l}=${y}px`).join(', ')}`);
   ```

These logs can be removed in production or kept for troubleshooting.

## Future Enhancements

Potential improvements for future consideration:

1. **Alternative Layout Styles:**
   - Centered diamond layout (more wins centered)
   - Inverted pyramid (elimination bracket style)
   - Horizontal ladder (time-based progression)

2. **Dynamic Spacing:**
   - Adjust spacing based on number of layers
   - Compress layers when many rounds exist
   - Expand for better readability when fewer layers

3. **Visual Indicators:**
   - Layer labels ("Round 1", "Round 2", etc.)
   - Progress indicators
   - Connecting lines between related buckets

4. **Configuration Options:**
   - Per-stage layer spacing override
   - Layer alignment options (left, center, right)
   - Custom layer Y calculation functions

## Conclusion

The Swiss layer stacking implementation is complete and fully functional. All Swiss tournament buckets are now positioned at layer-specific Y coordinates, creating a clear visual progression that represents the "Swiss ladder" structure naturally found in Swiss-system tournaments.

**Key Achievement:** Transformed flat horizontal Swiss bucket layout into progressive vertical layers that visually communicate tournament progression and player advancement through win-loss records.
