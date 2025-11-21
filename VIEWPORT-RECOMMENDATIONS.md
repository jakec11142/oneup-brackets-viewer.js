# Viewport & Zoom Behavior Recommendations

## Current Issues

1. **Virtual Scrolling Not Active**: The `VirtualBracketManager` was created but never integrated into the main rendering pipeline
2. **Unit Mismatch**: Using `rem` for fonts (zoom-responsive) but `px` for layout (zoom-fixed) causes spacing issues
3. **No Fixed Container Height**: Container expands to content, making scrolling unpredictable

## Best Practices Recommendation

### 1. Fixed Height Container (RECOMMENDED)

For tournament brackets, a **fixed viewport with scrolling** is the industry standard:

```scss
.brackets-viewer {
  height: 600px; // or 80vh for responsive
  max-width: 100%;
  overflow: auto;
  position: relative;
}
```

**Why:**
- Predictable scroll behavior
- Better performance with virtual scrolling
- Consistent experience across devices
- Used by major tournament sites (Challonge, Battlefy, start.gg)

### 2. Consistent Unit Strategy

Choose ONE approach:

#### Option A: All Pixels (Simple, Predictable)
```scss
// Zoom handled by browser's built-in scaling
--bv-font-size: 12px;
--bv-match-width: 150px;
--bv-round-gap: 40px;
```

#### Option B: All Relative Units (Zoom-Friendly)
```scss
// Everything scales together with zoom
--bv-font-size: 0.75rem;
--bv-match-width: 9.375rem;
--bv-round-gap: 2.5rem;
```

### 3. Implement Virtual Scrolling

The virtual scrolling code exists but needs activation:

```typescript
// In main.ts renderUnifiedDoubleElimination()
import { VirtualBracketManager } from './rendering/VirtualBracket';

// After layout computation
if (config.enableVirtualization !== false && matches.length > 50) {
  const virtualManager = new VirtualBracketManager({
    enabled: true,
    viewportHeight: 600,
    viewportWidth: container.offsetWidth
  });
  virtualManager.initialize(container, layout, matches);
}
```

### 4. Zoom-Safe Layout

Instead of absolute positioning, use CSS Grid or Flexbox:

```scss
.bracket {
  display: grid;
  grid-auto-flow: column;
  gap: var(--bv-round-gap);

  .round {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}
```

## Quick Fix (Minimal Changes)

Add this to your main stylesheet:

```scss
.brackets-viewer {
  // Fix container height
  height: min(600px, 80vh);
  max-width: 100vw;

  // Consistent units (choose one)
  zoom: 1; // Reset any zoom

  // Better scroll
  overflow: auto;
  scroll-behavior: smooth;
}

// Fix zoom scaling issues
@media screen and (min--moz-device-pixel-ratio: 0) {
  .brackets-viewer {
    // Firefox-specific fixes
    transform-origin: top left;
  }
}
```

## Testing Checklist

- [ ] Test at 100% zoom
- [ ] Test at 50%, 150%, 200% zoom
- [ ] Test on 1080p, 1440p, 4K displays
- [ ] Test on mobile devices
- [ ] Test with 10, 50, 100+ matches
- [ ] Test horizontal & vertical scrolling

## Examples from Industry Leaders

- **Challonge**: Fixed 600px height, horizontal scroll
- **Start.gg**: 80vh height, both scrolls, virtual rendering
- **Battlefy**: Fixed aspect ratio container
- **ESL**: Viewport-based with min/max constraints