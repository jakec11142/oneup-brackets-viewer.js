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
  bracketAlignment: 'finals-top', // Grand Finals positioned at top with Winners
  losersBracketOffsetX: 2, // Offset Losers by 2 columns (380px) for clear separation
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
  bracketAlignment: 'finals-top', // Grand Finals positioned at top with Winners
  losersBracketOffsetX: 2, // Offset Losers by 2 columns for clear separation
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
  bracketAlignment: 'finals-top', // Grand Finals positioned at top with Winners
  losersBracketOffsetX: 2, // Offset Losers by 2 columns for clear separation
};

/**
 * Aggressive compact layout - optimized for minimal vertical scrolling
 * Respects CSS 60px min-height constraint while maximizing density
 * Ideal for 16+ team double elimination tournaments
 * - Vertical density: 1.10 (10% overhead) - professional standard
 * - Inter-bracket spacing: 36px (64% reduction from default)
 * - Estimated space savings: 25-35%
 */
export const AGGRESSIVE_COMPACT_LAYOUT: LayoutConfig = {
  columnWidth: 145,   // 120px match width + 25px round gap
  rowHeight: 66,      // 60px match height + 6px vertical gap
  matchHeight: 60,    // Matches CSS min-height constraint
  matchWidth: 120,    // Maintains readability
  topOffset: 24,      // Minimal but sufficient
  leftOffset: 0,
  groupGapX: 1,
  groupGapY: 36,      // 🎯 KEY: Dramatically reduced inter-bracket spacing
  bracketAlignment: 'finals-top', // Grand Finals positioned at top with Winners
  losersBracketOffsetX: 2, // Offset Losers by 2 columns for clear separation
};

/**
 * Super compact layout - maximum density with CSS constraint
 * Even tighter than aggressive compact for extreme space optimization
 * Best for large tournaments (32+ teams) where scrolling is most problematic
 * - Vertical density: 1.10 (10% overhead)
 * - Inter-bracket spacing: 32px (68% reduction from default)
 * - Estimated space savings: 30-40%
 */
export const SUPER_COMPACT_LAYOUT: LayoutConfig = {
  columnWidth: 142,   // 116px match width + 26px round gap
  rowHeight: 66,      // 60px match height + 6px vertical gap
  matchHeight: 60,    // Matches CSS min-height constraint
  matchWidth: 116,    // Minimal width for readability
  topOffset: 20,      // Minimal padding
  leftOffset: 0,
  groupGapX: 1,
  groupGapY: 32,      // 🎯 KEY: Maximum inter-bracket compaction
  bracketAlignment: 'finals-top', // Grand Finals positioned at top with Winners
  losersBracketOffsetX: 2, // Offset Losers by 2 columns for clear separation
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
  bracketAlignment: 'finals-top', // Grand Finals positioned at top with Winners
  losersBracketOffsetX: 2, // Offset Losers by 2 columns for clear separation
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
  bracketAlignment: 'finals-top', // Grand Finals at top with Winners
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
  bracketAlignment: 'finals-top', // Grand Finals at top with Winners
};

/**
 * Registry of all available view models
 */
export const VIEW_MODELS: Record<string, ViewModel> = {
  // === Single Elimination Presets ===

  'se-default': {
    id: 'se-default',
    label: 'Single Elimination - Default',
    stageTypes: ['single_elimination'],
    layout: DEFAULT_LAYOUT,
    theme: { rootClassName: 'bv-theme-default' },
  },

  'se-compact': {
    id: 'se-compact',
    label: 'Single Elimination - Compact',
    stageTypes: ['single_elimination'],
    layout: COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-compact' },
  },

  'se-ultra-compact': {
    id: 'se-ultra-compact',
    label: 'Single Elimination - Ultra Compact',
    stageTypes: ['single_elimination'],
    layout: ULTRA_COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-compact' },
  },

  'se-aggressive-compact': {
    id: 'se-aggressive-compact',
    label: 'Single Elimination - Aggressive Compact',
    stageTypes: ['single_elimination'],
    layout: AGGRESSIVE_COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-compact' },
  },

  'se-super-compact': {
    id: 'se-super-compact',
    label: 'Single Elimination - Super Compact',
    stageTypes: ['single_elimination'],
    layout: SUPER_COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-admin-compact' },
  },

  'se-spacious': {
    id: 'se-spacious',
    label: 'Single Elimination - Spacious',
    stageTypes: ['single_elimination'],
    layout: SPACIOUS_LAYOUT,
    theme: { rootClassName: 'bv-theme-default' },
  },

  // === Double Elimination Presets ===

  'de-default': {
    id: 'de-default',
    label: 'Double Elimination - Default (Unified)',
    stageTypes: ['double_elimination'],
    layout: DEFAULT_LAYOUT,
    theme: { rootClassName: 'bv-theme-default' },
    doubleElimMode: 'unified',
  },

  'de-compact': {
    id: 'de-compact',
    label: 'Double Elimination - Compact (Unified)',
    stageTypes: ['double_elimination'],
    layout: COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-compact' },
    doubleElimMode: 'unified',
  },

  'de-admin-compact': {
    id: 'de-admin-compact',
    label: 'Double Elimination - Admin Compact',
    stageTypes: ['double_elimination'],
    layout: ULTRA_COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-admin-compact' },
    doubleElimMode: 'unified',
  },

  'de-aggressive-compact': {
    id: 'de-aggressive-compact',
    label: 'Double Elimination - Aggressive Compact',
    stageTypes: ['double_elimination'],
    layout: AGGRESSIVE_COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-compact' },
    doubleElimMode: 'unified',
  },

  'de-super-compact': {
    id: 'de-super-compact',
    label: 'Double Elimination - Super Compact',
    stageTypes: ['double_elimination'],
    layout: SUPER_COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-admin-compact' },
    doubleElimMode: 'unified',
  },

  'de-split': {
    id: 'de-split',
    label: 'Double Elimination - Split View',
    stageTypes: ['double_elimination'],
    layout: DEFAULT_LAYOUT,
    theme: { rootClassName: 'bv-theme-default' },
    doubleElimMode: 'split',
  },

  'de-spacious': {
    id: 'de-spacious',
    label: 'Double Elimination - Spacious (Unified)',
    stageTypes: ['double_elimination'],
    layout: SPACIOUS_LAYOUT,
    theme: { rootClassName: 'bv-theme-default' },
    doubleElimMode: 'unified',
  },

  'de-with-logos': {
    id: 'de-with-logos',
    label: 'Double Elimination - With Team Logos (Top-Aligned)',
    stageTypes: ['double_elimination'],
    layout: LAYOUT_WITH_LOGOS,
    theme: { rootClassName: 'bv-theme-default' },
    doubleElimMode: 'unified',
  },

  'de-compact-logos': {
    id: 'de-compact-logos',
    label: 'Double Elimination - Compact with Logos (Top-Aligned)',
    stageTypes: ['double_elimination'],
    layout: COMPACT_LAYOUT_WITH_LOGOS,
    theme: { rootClassName: 'bv-theme-default' },
    doubleElimMode: 'unified',
  },

  'de-top-aligned': {
    id: 'de-top-aligned',
    label: 'Double Elimination - Top-Aligned (Finals Visible)',
    stageTypes: ['double_elimination'],
    layout: { ...DEFAULT_LAYOUT, bracketAlignment: 'top' },
    theme: { rootClassName: 'bv-theme-default' },
    doubleElimMode: 'unified',
  },

  'de-separated-losers': {
    id: 'de-separated-losers',
    label: 'Double Elimination - Separated Losers (Max Clarity)',
    stageTypes: ['double_elimination'],
    layout: {
      ...DEFAULT_LAYOUT,
      bracketAlignment: 'finals-top',
      losersBracketOffsetX: 2, // Maximum separation
      groupGapY: 120, // Increased vertical gap
    },
    theme: { rootClassName: 'bv-theme-default' },
    doubleElimMode: 'unified',
  },

  'de-compact-separated': {
    id: 'de-compact-separated',
    label: 'Double Elimination - Compact with Clear Separation',
    stageTypes: ['double_elimination'],
    layout: {
      ...AGGRESSIVE_COMPACT_LAYOUT,
      losersBracketOffsetX: 2,
    },
    theme: { rootClassName: 'bv-theme-compact' },
    doubleElimMode: 'unified',
  },

  'de-traditional': {
    id: 'de-traditional',
    label: 'Double Elimination - Traditional Side-by-Side',
    stageTypes: ['double_elimination'],
    layout: {
      ...DEFAULT_LAYOUT,
      bracketAlignment: 'bottom', // Stack naturally, no overlap
      groupGapX: 2, // Wider horizontal gap
      groupGapY: 0, // No vertical gap
    },
    theme: { rootClassName: 'bv-theme-default' },
    doubleElimMode: 'unified',
  },

  // === Single Elimination with Logos ===

  'se-with-logos': {
    id: 'se-with-logos',
    label: 'Single Elimination - With Team Logos',
    stageTypes: ['single_elimination'],
    layout: LAYOUT_WITH_LOGOS,
    theme: { rootClassName: 'bv-theme-default' },
  },

  'se-compact-logos': {
    id: 'se-compact-logos',
    label: 'Single Elimination - Compact with Logos',
    stageTypes: ['single_elimination'],
    layout: COMPACT_LAYOUT_WITH_LOGOS,
    theme: { rootClassName: 'bv-theme-default' },
  },

  // === Generic Fallbacks ===

  'default': {
    id: 'default',
    label: 'Default View',
    stageTypes: ['single_elimination', 'double_elimination', 'round_robin', 'swiss'],
    layout: DEFAULT_LAYOUT,
    theme: { rootClassName: 'bv-theme-default' },
  },

  'compact': {
    id: 'compact',
    label: 'Compact View',
    stageTypes: ['single_elimination', 'double_elimination', 'round_robin', 'swiss'],
    layout: COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-compact' },
  },

  'admin': {
    id: 'admin',
    label: 'Admin Dashboard View',
    stageTypes: ['single_elimination', 'double_elimination', 'round_robin', 'swiss'],
    layout: ULTRA_COMPACT_LAYOUT,
    theme: { rootClassName: 'bv-theme-admin-compact' },
  },
};

/**
 * Default view model IDs by bracket type
 */
const DEFAULT_VIEW_MODEL_IDS: Record<BracketKind, string> = {
  single_elimination: 'se-default',
  double_elimination: 'de-default',
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
