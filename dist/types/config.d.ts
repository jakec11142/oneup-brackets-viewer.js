/**
 * Config Types - Configuration options for brackets-viewer.js
 */
import type { ToI18nKey, TFunction } from '../lang';
import type { LayoutConfig } from '../viewModels';
import type { MatchWithMetadata } from './match';
/**
 * The possible placements of a participant's origin.
 */
export type Placement = 'none' | 'before' | 'after';
/**
 * The rendering mode for double elimination brackets.
 */
export type DoubleElimMode = 'unified' | 'split';
/**
 * Info associated to a round in order to name its header.
 */
export type RoundNameInfo = {
    groupType: Exclude<ToI18nKey<import('brackets-model').GroupType>, 'final-group'>;
    roundNumber: number;
    roundCount: number;
    /**
     * `1` = final, `1/2` = semi finals, `1/4` = quarter finals, etc.
     */
    fractionOfFinal: number;
} | {
    groupType: 'round-robin';
    roundNumber: number;
    roundCount: number;
} | {
    groupType: 'swiss';
    roundNumber: number;
    roundCount: number;
} | {
    groupType: 'final-group';
    finalType: ToI18nKey<import('brackets-model').FinalType>;
    roundNumber: number;
    roundCount: number;
};
/**
 * A function returning a round name based on its number and the count of rounds.
 */
export type RoundNameGetter = (info: RoundNameInfo, t: TFunction) => string;
/**
 * A function called when a match is clicked.
 */
export type MatchClickCallback = (match: MatchWithMetadata) => void;
/**
 * An optional config to provide to `brackets-viewer.js`
 */
export interface Config {
    /**
     * A callback to be called when a match is clicked.
     *
     * @default undefined
     */
    onMatchClick?: MatchClickCallback;
    /**
     * A callback to be called when a match's label is clicked.
     *
     * @default undefined
     */
    onMatchLabelClick?: MatchClickCallback;
    /**
     * A function to deeply customize the names of the rounds.
     * If you just want to **translate some words**, please use `addLocale()` instead.
     *
     * @default undefined
     */
    customRoundName?: RoundNameGetter;
    /**
     * An optional selector to select the root element.
     *
     * @default '.brackets-viewer'
     */
    selector?: string;
    /**
     * Theme identifier. Applies a `.bv-theme-{theme}` class to the container so CSS variables can be overridden.
     *
     * @default undefined
     */
    theme?: string;
    /**
     * Where the position of a participant is placed relative to its name.
     * - If `none`, the position is not added.
     * - If `before`, the position is prepended before the participant name. "#1 Team"
     * - If `after`, the position is appended after the participant name, in parentheses. "Team (#1)"
     *
     * @default 'before'
     */
    participantOriginPlacement?: Placement;
    /**
     * Whether to show the origin of a slot (wherever possible).
     *
     * @default true
     */
    showSlotsOrigin?: boolean;
    /**
     * Whether to show the origin of a slot (in the lower bracket of an elimination stage).
     *
     * @default true
     */
    showLowerBracketSlotsOrigin?: boolean;
    /**
     * Display a popover when the label of a match with child games is clicked.
     *
     * @default true
     */
    showPopoverOnMatchLabelClick?: boolean;
    /**
     * Whether to highlight every instance of a participant on hover.
     *
     * @default true
     */
    highlightParticipantOnHover?: boolean;
    /**
     * Number of teams that qualify (advance) from each Round Robin group.
     * Used to color-code standings rows with green zone styling.
     *
     * @default undefined (no zone coloring)
     * @example 2 // Top 2 teams advance
     */
    qualifyingCount?: number;
    /**
     * Number of teams that are eliminated from each Round Robin group.
     * Used to color-code standings rows with red zone styling.
     * Teams in between qualifying and eliminated are shown in amber "bubble" zone.
     *
     * @default undefined (no zone coloring)
     * @example 2 // Bottom 2 teams eliminated
     */
    eliminatedCount?: number;
    /**
     * The rendering mode for double elimination brackets.
     * - If `unified`, all bracket groups (winners, losers, grand final) are rendered on a single canvas with cross-bracket edges visible.
     * - If `split`, bracket groups are rendered separately (backwards compatible with legacy behavior).
     *
     * @default 'unified'
     */
    doubleElimMode?: DoubleElimMode;
    /**
     * Whether to clear any previously displayed data.
     *
     * @default false
     */
    clear?: boolean;
    /**
     * Whether to show semantic round headers (Finals, Semi-Finals, etc).
     *
     * @default true
     */
    showRoundHeaders?: boolean;
    /**
     * Whether to show connector lines between matches in bracket stages.
     *
     * Connector lines visually link matches to show tournament progression:
     * - Internal connectors: Standard lines within same bracket
     * - Cross-bracket connectors: Dashed lines between Winners/Losers brackets
     * - Grand final connectors: Bold lines to Grand Finals
     *
     * Note: Swiss tournaments do not use connectors.
     *
     * @default true
     */
    showConnectors?: boolean;
    /**
     * Whether to show inline match metadata above each match.
     *
     * Match metadata appears as a strip above match participants showing:
     * - Round number (e.g., "R1", "R2")
     * - Best-of format (e.g., "BO1", "BO3")
     * - Date (if provided)
     *
     * @default true
     */
    showMatchMetadata?: boolean;
    /**
     * View model preset ID for bracket layout and theme.
     *
     * View models provide preset configurations for:
     * - Layout density (normal, compact, ultra-compact, spacious)
     * - Theme (default, dark, etc.)
     * - Double elimination mode (unified/split)
     *
     * Available presets:
     * - Generic: 'default', 'broadcast', 'de-split-horizontal'
     *
     * If not specified, an appropriate default is chosen based on the stage type.
     *
     * @example
     * // Use broadcast view with logos
     * viewer.render(data, { viewModelId: 'broadcast' });
     *
     * @default undefined (auto-selects based on stage type)
     */
    viewModelId?: string;
    /**
     * Layout configuration overrides.
     *
     * Allows fine-tuning specific layout parameters on top of the selected view model preset.
     * Useful for custom adjustments without creating a new view model.
     *
     * @example
     * // Use compact preset but with custom column width
     * viewer.render(data, {
     *   viewModelId: 'de-compact',
     *   layoutOverrides: { columnWidth: 180 }
     * });
     *
     * @default undefined (no overrides)
     */
    layoutOverrides?: Partial<LayoutConfig>;
    /**
     * Width of each match element in pixels.
     * Controls the horizontal size of match cards.
     *
     * @example 150 (default), 200 (logos), 300 (ultrawide)
     * @default undefined (uses value from viewModelId)
     */
    matchWidth?: number;
    /**
     * Height of each match element in pixels.
     * Controls the vertical size of match cards.
     *
     * @example 60 (default), 80 (logos), 44 (ultra-compact)
     * @default undefined (uses value from viewModelId)
     */
    matchHeight?: number;
    /**
     * Width of each column in pixels (includes match width + gap between rounds).
     * Controls horizontal spacing between rounds.
     *
     * @example 190 (default), 340 (ultrawide)
     * @default undefined (uses value from viewModelId)
     */
    columnWidth?: number;
    /**
     * Height of each row in pixels (includes match height + vertical gap between matches).
     * Controls vertical spacing between matches in the same round.
     *
     * @example 80 (default), 100 (spacious), 56 (ultra-compact)
     * @default undefined (uses value from viewModelId)
     */
    rowHeight?: number;
    /**
     * Row height specifically for the lower bracket when using split-horizontal alignment.
     * Allows compressing the lower bracket vertically to reduce scrolling.
     * Only applies when bracketAlignment is 'split-horizontal'.
     * If undefined, uses rowHeight for all brackets.
     *
     * @example 48 (40% reduction from default 80px), 44 (45% reduction)
     * @default undefined (uses rowHeight)
     */
    lowerBracketRowHeight?: number;
    /**
     * Row height specifically for the upper bracket when using split-horizontal alignment.
     * Allows compressing the upper bracket vertically to reduce scrolling.
     * Only applies when bracketAlignment is 'split-horizontal'.
     * If undefined, uses rowHeight for all brackets.
     *
     * @example 48 (40% reduction from default 80px), 44 (45% reduction)
     * @default undefined (uses rowHeight)
     */
    upperBracketRowHeight?: number;
    /**
     * Top padding/offset for the bracket in pixels.
     * Controls spacing from the top edge of the container.
     *
     * @example 50 (default), 32 (ultra-compact), 60 (spacious)
     * @default undefined (uses value from viewModelId)
     */
    topOffset?: number;
    /**
     * Left padding/offset for the bracket in pixels.
     * Controls spacing from the left edge of the container.
     *
     * @example 0 (default for all presets)
     * @default undefined (uses value from viewModelId)
     */
    leftOffset?: number;
    /**
     * Horizontal gap between bracket groups (winner/loser/grand final) in columns.
     * For double elimination: gap between Winners → Losers → Grand Finals.
     *
     * @example 1 (default - minimal gap)
     * @default undefined (uses value from viewModelId)
     */
    groupGapX?: number;
    /**
     * Vertical gap between bracket groups in pixels.
     * For double elimination: vertical spacing between Winners and Losers brackets.
     *
     * @example 100 (default), 60 (compact), 120 (spacious)
     * @default undefined (uses value from viewModelId)
     */
    groupGapY?: number;
    /**
     * Vertical alignment strategy for bracket groups in double elimination.
     * Controls how Winners, Losers, and Grand Finals brackets are aligned vertically.
     *
     * - `bottom`: Winners top, Losers bottom, Finals right (industry standard)
     * - `top`: All brackets start from same Y position
     * - `center`: Center brackets within max height
     * - `finals-top`: Grand Finals at top with Winners/Losers below
     *
     * @example 'bottom' (default - industry standard)
     * @default undefined (uses value from viewModelId)
     */
    bracketAlignment?: 'top' | 'center' | 'bottom' | 'finals-top';
    /**
     * Horizontal offset for Losers bracket when using 'finals-top' alignment (in columns).
     * Prevents visual overlap with Winners bracket.
     *
     * @example 0 (default - aligned), 2 (offset by 2 columns)
     * @default undefined (uses value from viewModelId)
     */
    losersBracketOffsetX?: number;
    /**
     * Vertical step between Swiss layers in pixels.
     * A layer is wins + losses (e.g., 2-0 and 1-1 are both layer 2).
     * Creates progressive vertical stacking of Swiss record buckets.
     *
     * @example 120 (default), 90 (compact), 150 (spacious)
     * @default undefined (uses value from viewModelId)
     */
    swissLayerStepY?: number;
    /**
     * Vertical gap between Swiss panels in the same column (round) in pixels.
     * For round-based stacking where multiple buckets appear in one column.
     *
     * @example 24 (default), 16 (ultra-compact), 32 (spacious)
     * @default undefined (uses value from viewModelId)
     */
    swissBucketGapY?: number;
    /**
     * Font size preset for all text in the bracket.
     * Controls the base font size for team names, scores, and labels.
     *
     * - `small`: Compact text for dense layouts (11px base)
     * - `medium`: Standard readable size (13px base)
     * - `large`: Larger text for presentations (15px base)
     *
     * @example 'medium' (default)
     * @default 'medium'
     */
    fontSize?: 'small' | 'medium' | 'large';
    /**
     * Enable layout caching for faster re-renders.
     * Cached layouts are reused when match data hasn't changed.
     *
     * @default true
     */
    enableLayoutCache?: boolean;
    /**
     * Enable SVG connector element pooling.
     * Reduces memory churn by reusing SVG elements instead of recreating them.
     *
     * @default true
     */
    enableSVGPooling?: boolean;
    /**
     * Enable virtual scrolling for large brackets.
     * Only renders visible matches + buffer zone for optimal performance.
     *
     * - `true`: Always enabled
     * - `false`: Always disabled
     * - `'auto'`: Enabled for 50+ matches (recommended)
     *
     * @default 'auto'
     */
    enableVirtualization?: boolean | 'auto';
    /**
     * Threshold for auto-enabling virtualization.
     * Only applies when enableVirtualization is 'auto'.
     *
     * @default 50
     */
    virtualizationThreshold?: number;
}
