/**
 * View Model System for Bracket Viewer
 *
 * Provides preset-based configuration for layout density, theming, and display modes.
 * Similar to Tailwind presets - allows choosing different visual presentations without
 * modifying the underlying bracket data.
 */

/**
 * Vertical alignment strategy for bracket groups in double elimination
 * - 'bottom': Stack naturally (Winners, Losers, Finals) - default
 * - 'top': All brackets start from same Y position
 * - 'center': Center brackets within max height
 * - 'finals-top': Grand Finals at top with Winners, Losers below
 */
export type BracketAlignment = 'top' | 'center' | 'bottom' | 'finals-top';

/**
 * Layout configuration parameters that control spacing and sizing of bracket elements
 */
export interface LayoutConfig {
  /** Width of each column (includes match width + gap) */
  columnWidth: number;
  /** Height of each row (includes match height + vertical gap) */
  rowHeight: number;
  /** Actual match element height */
  matchHeight: number;
  /** Actual match element width (for rendering, separate from columnWidth) */
  matchWidth: number;
  /** Top padding/offset for the bracket */
  topOffset: number;
  /** Left padding/offset for the bracket */
  leftOffset: number;
  /** Horizontal gap between bracket groups (winner/loser/grand final) */
  groupGapX: number;
  /** Vertical gap between bracket groups */
  groupGapY: number;
  /** Vertical alignment strategy for bracket groups (double elim only) */
  bracketAlignment: BracketAlignment;
  /**
   * Horizontal offset (in columns) for Losers bracket when using 'finals-top' alignment.
   * Prevents visual overlap with Winners bracket.
   * Default: 0 (aligned with Winners)
   * Example: 2 = offset by 2 columns (380px with default column width)
   */
  losersBracketOffsetX?: number;
  /**
   * Vertical step between Swiss layers (layer = wins + losses).
   * Creates progressive vertical stacking of Swiss record buckets.
   * Default: rowHeight * 1.5 (moderate spacing)
   * Example: 120px for default layout, 90px for compact layout
   */
  swissLayerStepY?: number;
  /**
   * Vertical gap between Swiss panels stacked in the same column (round).
   * Used for round-based vertical stacking where multiple buckets (e.g., 1-0, 0-1)
   * appear in the same column.
   * Default: 24px
   * Example: 24px for default, 16px for compact
   */
  swissBucketGapY?: number;
  /**
   * Swiss-specific layout configuration.
   * When provided, overrides generic layout values for Swiss bracket rendering.
   * Provides fine-grained control over Swiss panel spacing, sizing, and column modes.
   */
  swissConfig?: SwissLayoutConfig;
}

/**
 * Theme configuration for visual styling
 */
export interface ThemeConfig {
  /** CSS class to apply to bracket root element */
  rootClassName: string;
}

/**
 * Bracket type identifiers
 */
export type BracketKind = 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss';

/**
 * Double elimination display modes
 */
export type DoubleElimMode = 'unified' | 'split';

/**
 * Swiss view mode presets
 */
export type SwissViewMode = 'default' | 'compact-admin';

/**
 * Swiss column assignment strategy
 * - 'round-based': One column per round (wins + losses + 1) - matches industry convention
 * - 'layer-based': Columns grouped by layer (wins + losses) with optional gap columns
 */
export type SwissColumnMode = 'round-based' | 'layer-based';

/**
 * Swiss-specific layout configuration
 * Provides fine-grained control over Swiss bracket rendering
 */
export interface SwissLayoutConfig {
  /** Height per match row within a panel */
  rowHeight: number;
  /** Width of each panel/column */
  columnWidth: number;
  /** Horizontal gap between columns */
  columnGapX: number;
  /** Vertical spacing multiplier between layers (actual spacing = rowHeight * layerGapFactor) */
  layerGapFactor: number;
  /** Minimum vertical gap between layers in pixels (overrides layerGapFactor if larger) */
  minLayerGapPx: number;
  /** Gap between matches inside a panel */
  panelInnerGap: number;
  /** Height of panel header (record label, date, bestOf) */
  panelHeaderHeight: number;
  /** Vertical padding within panel body */
  panelPadding: number;
  /** Column assignment strategy: round-based or layer-based */
  columnMode: SwissColumnMode;
  /** Number of empty columns to insert between layers (only used in layer-based mode) */
  layerGapColumns: number;
}

/**
 * Complete view model combining layout, theme, and metadata
 */
export interface ViewModel {
  /** Unique identifier for this view model */
  id: string;
  /** Human-readable name */
  label: string;
  /** Which bracket types this view model is designed for */
  stageTypes: BracketKind[];
  /** Layout configuration */
  layout: LayoutConfig;
  /** Theme configuration */
  theme: ThemeConfig;
  /** Preferred double elimination mode (if applicable) */
  doubleElimMode?: DoubleElimMode;
}

/**
 * Default layout configuration matching current hardcoded constants
 * These values preserve the existing visual behavior
 */
export const DEFAULT_LAYOUT: LayoutConfig = {
  columnWidth: 190,   // 150px match width + 40px round gap
  rowHeight: 80,      // 60px match height + 20px vertical gap
  matchHeight: 60,    // Actual match min-height
  matchWidth: 150,    // Actual match width
  topOffset: 50,      // Top padding
  leftOffset: 0,      // Left padding
  groupGapX: 1,       // Minimal horizontal gap between groups
  groupGapY: 100,     // Vertical gap between winner/loser brackets
  bracketAlignment: 'bottom', // Standard industry alignment: Winners top, Losers bottom, Finals right
  losersBracketOffsetX: 0, // Natural left-alignment for both brackets
  swissLayerStepY: 120, // Swiss layer spacing (rowHeight * 1.5 = 80 * 1.5)
  swissBucketGapY: 24, // Vertical gap between Swiss panels in same column
};

/**
 * Compact layout for admin dashboards and dense views
 * Reduces whitespace while maintaining readability
 */
export const COMPACT_LAYOUT: LayoutConfig = {
  columnWidth: 160,   // 130px match width + 30px round gap
  rowHeight: 60,      // 48px match height + 12px vertical gap
  matchHeight: 48,    // Smaller match height
  matchWidth: 130,    // Smaller match width
  topOffset: 40,      // Reduced top padding
  leftOffset: 0,
  groupGapX: 1,
  groupGapY: 60,      // Reduced vertical gap between brackets
  bracketAlignment: 'bottom', // Standard industry alignment: Winners top, Losers bottom, Finals right
  losersBracketOffsetX: 0, // Natural left-alignment for both brackets
  swissLayerStepY: 90, // Swiss layer spacing (rowHeight * 1.5 = 60 * 1.5)
  swissBucketGapY: 20, // Vertical gap between Swiss panels in same column (compact)
};

/**
 * Ultra-compact layout for maximum density
 * Ideal for large tournaments (32+ teams) in limited space
 */
export const ULTRA_COMPACT_LAYOUT: LayoutConfig = {
  columnWidth: 150,   // 120px match width + 30px round gap
  rowHeight: 56,      // 44px match height + 12px vertical gap
  matchHeight: 44,    // Minimal match height
  matchWidth: 120,    // Minimal match width
  topOffset: 32,      // Minimal top padding
  leftOffset: 0,
  groupGapX: 1,
  groupGapY: 48,      // Tight vertical gap
  bracketAlignment: 'bottom', // Standard industry alignment: Winners top, Losers bottom, Finals right
  losersBracketOffsetX: 0, // Natural left-alignment for both brackets
  swissLayerStepY: 84, // Swiss layer spacing (rowHeight * 1.5 = 56 * 1.5)
  swissBucketGapY: 16, // Vertical gap between Swiss panels in same column (ultra-compact)
};

/**
 * Spacious layout for presentations and large displays
 * Increases whitespace for better visual hierarchy
 */
export const SPACIOUS_LAYOUT: LayoutConfig = {
  columnWidth: 220,   // 170px match width + 50px round gap
  rowHeight: 100,     // 72px match height + 28px vertical gap
  matchHeight: 72,    // Larger match height
  matchWidth: 170,    // Larger match width
  topOffset: 60,      // More top padding
  leftOffset: 0,
  groupGapX: 1,
  groupGapY: 120,     // More vertical gap between brackets
  bracketAlignment: 'bottom', // Standard industry alignment: Winners top, Losers bottom, Finals right
  losersBracketOffsetX: 0, // Natural left-alignment for both brackets
  swissLayerStepY: 150, // Swiss layer spacing (rowHeight * 1.5 = 100 * 1.5)
  swissBucketGapY: 32, // Vertical gap between Swiss panels in same column (spacious)
};

/**
 * Layout with logos - larger match boxes to accommodate team logos
 * Suitable for professional broadcasts and high-production displays
 */
export const LAYOUT_WITH_LOGOS: LayoutConfig = {
  columnWidth: 250,   // 200px match width + 50px round gap
  rowHeight: 100,     // 80px match height + 20px vertical gap
  matchHeight: 80,    // Taller for logo + name
  matchWidth: 200,    // Wider for logo next to name
  topOffset: 50,
  leftOffset: 0,
  groupGapX: 1,
  groupGapY: 100,
  bracketAlignment: 'bottom', // Standard industry alignment: Winners top, Losers bottom, Finals right
  losersBracketOffsetX: 0, // Natural left-alignment for both brackets
  swissLayerStepY: 150, // Swiss layer spacing (rowHeight * 1.5 = 100 * 1.5)
  swissBucketGapY: 32, // Vertical gap between Swiss panels in same column (spacious)
};

/**
 * Compact layout with logos - balance between space efficiency and logo display
 */
export const COMPACT_LAYOUT_WITH_LOGOS: LayoutConfig = {
  columnWidth: 220,   // 180px match width + 40px round gap
  rowHeight: 80,      // 64px match height + 16px vertical gap
  matchHeight: 64,    // Medium height for logos
  matchWidth: 180,    // Medium width for logos
  topOffset: 40,
  leftOffset: 0,
  groupGapX: 1,
  groupGapY: 70,
  bracketAlignment: 'bottom', // Standard industry alignment: Winners top, Losers bottom, Finals right
  losersBracketOffsetX: 0, // Natural left-alignment for both brackets
  swissLayerStepY: 120, // Swiss layer spacing (rowHeight * 1.5 = 80 * 1.5)
  swissBucketGapY: 24, // Vertical gap between Swiss panels in same column
};

/**
 * Ultrawide layout for 21:9 ultrawide monitors (3440x1440, 5120x2160, etc.)
 * Maximizes horizontal space to span across ultrawide displays
 * Maintains standard vertical spacing for comfortable viewing
 */
export const ULTRAWIDE_LAYOUT: LayoutConfig = {
  columnWidth: 340,   // 300px match width + 40px round gap - spans 21:9 ultrawide displays
  rowHeight: 80,      // Standard height (same as DEFAULT) - no extra vertical space
  matchHeight: 60,    // Standard height (same as DEFAULT) - no extra vertical space
  matchWidth: 300,    // Extra wide match width to utilize 21:9 ultrawide horizontal space
  topOffset: 50,      // Standard top padding
  leftOffset: 0,
  groupGapX: 1,
  groupGapY: 100,     // Standard vertical gap (same as DEFAULT)
  bracketAlignment: 'bottom', // Standard industry alignment: Winners top, Losers bottom, Finals right
  losersBracketOffsetX: 0, // Natural left-alignment for both brackets
  swissLayerStepY: 120, // Swiss layer spacing (rowHeight * 1.5 = 80 * 1.5)
  swissBucketGapY: 24, // Vertical gap between Swiss panels in same column
};

/**
 * View mode layout presets for elimination brackets
 * Provides quick sizing options for SE/DE brackets via the sizing config parameter
 *
 * These are dimension presets that users can combine with any view model or theme.
 * For even more control, use the granular config parameters (matchWidth, etc.)
 */
export const VIEW_MODE_LAYOUTS = {
  default: DEFAULT_LAYOUT,
  compact: COMPACT_LAYOUT,
  'ultra-compact': ULTRA_COMPACT_LAYOUT,
  spacious: SPACIOUS_LAYOUT,
  logo: LAYOUT_WITH_LOGOS,
  'logo-compact': COMPACT_LAYOUT_WITH_LOGOS,
  ultrawide: ULTRAWIDE_LAYOUT,
} as const;

/**
 * Swiss default layout configuration
 * Balanced spacing suitable for most Swiss tournament displays
 */
export const SWISS_DEFAULT_CONFIG: SwissLayoutConfig = {
  rowHeight: 56,
  columnWidth: 220,
  columnGapX: 24,
  layerGapFactor: 1.6,
  minLayerGapPx: 80,
  panelInnerGap: 10,
  panelHeaderHeight: 48,
  panelPadding: 12,
  columnMode: 'round-based',
  layerGapColumns: 0,
};

/**
 * Swiss compact admin layout configuration
 * Dense layout optimized for admin dashboards with many matches
 */
export const SWISS_COMPACT_ADMIN_CONFIG: SwissLayoutConfig = {
  rowHeight: 44,
  columnWidth: 210,
  columnGapX: 16,
  layerGapFactor: 1.2,
  minLayerGapPx: 60,
  panelInnerGap: 6,
  panelHeaderHeight: 40,
  panelPadding: 8,
  columnMode: 'round-based',
  layerGapColumns: 0,
};

/**
 * Swiss default layout (wrapper for compatibility with existing LayoutConfig)
 */
export const SWISS_DEFAULT_LAYOUT: LayoutConfig = {
  ...DEFAULT_LAYOUT,
  swissConfig: SWISS_DEFAULT_CONFIG,
};

/**
 * Swiss compact admin layout (wrapper for compatibility with existing LayoutConfig)
 */
export const SWISS_COMPACT_ADMIN_LAYOUT: LayoutConfig = {
  ...ULTRA_COMPACT_LAYOUT,
  swissConfig: SWISS_COMPACT_ADMIN_CONFIG,
};

/**
 * Registry of all available view models
 *
 * SIMPLIFIED PRESET SYSTEM:
 * Instead of 20+ format-specific presets, we now have just 3 quick-start options.
 * Users customize further using granular config parameters (matchWidth, fontSize, etc.)
 *
 * Philosophy: "Character Creator" approach - start with a base, then tune everything.
 */
export const VIEW_MODELS: Record<string, ViewModel> = {
  // === QUICK START PRESETS ===

  'default': {
    id: 'default',
    label: 'Default',
    stageTypes: ['single_elimination', 'double_elimination', 'round_robin', 'swiss'],
    layout: DEFAULT_LAYOUT,
    theme: { rootClassName: 'bv-theme-default' },
    doubleElimMode: 'unified',
  },

  'admin': {
    id: 'admin',
    label: 'Admin Dashboard',
    stageTypes: ['single_elimination', 'double_elimination', 'round_robin', 'swiss'],
    layout: ULTRA_COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-admin-compact' },
    doubleElimMode: 'unified',
  },

  'broadcast': {
    id: 'broadcast',
    label: 'Broadcast / Streaming',
    stageTypes: ['single_elimination', 'double_elimination', 'round_robin', 'swiss'],
    layout: LAYOUT_WITH_LOGOS,
    theme: { rootClassName: 'bv-theme-default' },
    doubleElimMode: 'unified',
  },
};

/**
 * Default view model IDs by bracket type
 * All formats now use 'default' as the starting point
 */
const DEFAULT_VIEW_MODEL_IDS: Record<BracketKind, string> = {
  single_elimination: 'default',
  double_elimination: 'default',
  round_robin: 'default',
  swiss: 'default',
};

/**
 * Resolves a view model by ID with intelligent fallback logic
 *
 * Resolution order:
 * 1. If viewModelId provided and exists → use it
 * 2. If viewModelId provided but doesn't exist → try stage-specific default
 * 3. If no viewModelId → use stage-specific default
 * 4. Final fallback → 'default' view model
 *
 * @param viewModelId - Optional view model ID to resolve
 * @param stageType - Type of bracket stage (for intelligent defaults)
 * @returns Resolved view model (never undefined)
 */
export function getViewModel(
  viewModelId: string | undefined,
  stageType: BracketKind,
): ViewModel {
  // If viewModelId provided and exists, use it
  if (viewModelId && VIEW_MODELS[viewModelId]) {
    return VIEW_MODELS[viewModelId];
  }

  // Fallback to stage-specific default
  const defaultId = DEFAULT_VIEW_MODEL_IDS[stageType] || 'default';

  // If viewModelId was provided but invalid, log warning
  if (viewModelId && !VIEW_MODELS[viewModelId]) {
    console.warn(
      `[BracketsViewer] Unknown viewModelId "${viewModelId}", falling back to "${defaultId}"`,
    );
  }

  return VIEW_MODELS[defaultId] || VIEW_MODELS['default'];
}

/**
 * Gets all available view model IDs
 */
export function getViewModelIds(): string[] {
  return Object.keys(VIEW_MODELS);
}

/**
 * Gets all view models for a specific bracket type
 */
export function getViewModelsForType(stageType: BracketKind): ViewModel[] {
  return Object.values(VIEW_MODELS).filter(vm =>
    vm.stageTypes.includes(stageType),
  );
}
