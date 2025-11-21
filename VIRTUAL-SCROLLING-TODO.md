# Virtual Scrolling Implementation TODO

## Current Status
Virtual scrolling is DISABLED due to matches not rendering when enabled.

## The Problem
When virtual scrolling activates (for 50+ matches):
- Only connector lines (SVG) are visible
- Match elements are not rendered at all
- Double elimination (63 matches) shows no matches

## What We've Tried

### 1. Custom VirtualBracketManager
- Only rendered matches on scroll, not initially
- Fixed by calling `updateVisibility()` in `initialize()`
- Still didn't work properly

### 2. TanStack Virtual Implementation
- Installed `@tanstack/virtual-core`
- Created `TanStackVirtualManager`
- Properly initialized virtualizer
- Called `_willUpdate()` to force initial render
- Still no matches rendered

## Issues to Debug

1. **Container Dimensions**
   - Check if container has proper height/width when virtualizer initializes
   - The scrollable element might not be the right one

2. **Virtual Items**
   - TanStack's `getVirtualItems()` might return empty array initially
   - Need to debug why virtual items aren't calculated

3. **DOM Structure**
   - Virtual scrolling creates inner container
   - Matches might be rendering in wrong element

## How to Test

1. Enable virtual scrolling:
```javascript
viewer.render(data, {
  enableVirtualization: true,  // Force on
});
```

2. Check browser console for debug logs:
   - `[TanStackVirtual]` prefix shows virtual scrolling activity
   - Look for "Virtual items from TanStack" count

3. Inspect DOM:
   - Look for elements with `data-virtual="true"` attribute
   - Check if inner container has proper dimensions

## Temporary Solution
Virtual scrolling is disabled by default:
- `enableVirtualization` defaults to `false`
- `virtualizationThreshold` set to 500 (won't auto-enable)
- Double elimination (63 matches) renders normally

## Next Steps

1. **Debug Container Setup**
   - Ensure correct scrollable element is passed
   - Verify container has dimensions on init

2. **Debug TanStack Virtualizer**
   - Log virtualizer state
   - Check if observers are working
   - Verify scroll element is correct

3. **Alternative: Simple Virtual Scrolling**
   - Implement basic viewport-based rendering
   - Skip TanStack if too complex
   - Use Intersection Observer API

## Files Involved
- `src/renderers/EliminationRenderer.ts` - Where virtual scrolling is used
- `src/rendering/VirtualBracket.ts` - Custom implementation (unused)
- `src/rendering/TanStackVirtualManager.ts` - TanStack implementation

## References
- TanStack Virtual docs: https://tanstack.com/virtual/latest
- StackBlitz vanilla example: https://stackblitz.com/edit/js-yc7vby