import { Match, MatchGame, Participant, GroupType, FinalType, StageType, RankingItem, RankingFormula } from 'brackets-model';
import { CallbackFunction, FormConfiguration } from './form';
import { InMemoryDatabase } from 'brackets-memory-db';
import { BracketsViewer } from './main';
import { BracketsManager } from 'brackets-manager';
import { ToI18nKey, TFunction } from './lang';
import type { StageStructureResponse, StageStandingsResponse, StageStructureConversionOptions, BracketEdgeResponse } from './dto/types';
import { ViewerStage, ViewerStageType } from './models';
import type { LayoutConfig } from './viewModels';

export type { ToI18nKey, TFunction };
export { ViewerStage, ViewerStageType };

/**
 * Swiss zone classification for visual hierarchy
 * - 'neutral': Normal state (still in tournament)
 * - 'advancing': Close to or at advancing threshold (maxWins reached)
 * - 'eliminated': Close to or at elimination threshold (maxLosses reached)
 */
export type SwissZone = 'neutral' | 'advancing' | 'eliminated';

declare global {
    interface Window {
        bracketsViewer: BracketsViewer,
        bracketsViewerDTO: {
            convertStageStructureToViewerData: (
                structure: StageStructureResponse,
                standings?: StageStandingsResponse,
                options?: StageStructureConversionOptions
            ) => ViewerData
        },
        inMemoryDatabase: InMemoryDatabase,
        bracketsManager: BracketsManager,
        stageFormCreator: (configuration: FormConfiguration, submitCallable: CallbackFunction) => void,
        updateFormCreator: (configuration: FormConfiguration, changeCallable: CallbackFunction) => void,
    }

    interface HTMLElement {
        togglePopover: (options?: boolean) => boolean
    }
}

// https://developer.mozilla.org/en-US/docs/Web/API/ToggleEvent
export interface ToggleEvent extends Event {
    oldState: 'open' | 'closed'
    newState: 'open' | 'closed'
}

/**
 * A match with metadata constructed by the viewer.
 */
export interface MatchWithMetadata extends Match {
    metadata: {
        // Information known since the beginning

        /** Type of the stage this match is in. */
        stageType: ViewerStageType
        /** The list of child games of this match. */
        games: MatchGame[]

        // Positional information

        /** Label as shown in the UI */
        label?: string,
        /** Number of the round this match is in. */
        roundNumber?: number,
        /** Count of rounds in the group this match is in. */
        roundCount?: number,
        /** Group type this match is in. */
        matchLocation?: GroupType

        // Swiss-specific information

        /** Number of wins for teams in this match (Swiss only) */
        swissWins?: number,
        /** Number of losses for teams in this match (Swiss only) */
        swissLosses?: number,
        /** Date of the round this match is in (Swiss only) */
        roundDate?: string,
        /** Best-of format for this match's round (Swiss only, e.g., "BO1", "BO3") */
        roundBestOf?: string,

        // Other information

        /** Whether to connect this match to the final if it happens to be the last one of the bracket. */
        connectFinal?: boolean
        /** Whether to connect this match with previous or next matches. */
        connection?: Connection
        /** Function returning an origin hint based on a participant's position for this match. */
        originHint?: OriginHint
    }
}

export interface MatchGameWithMetadata extends MatchGame {
    metadata: {
        /** Label as shown in the UI */
        label?: string
    }
}

/**
 * The data to display with `brackets-viewer.js`
 */
export interface ViewerData {
    /** The stages to display. */
    stages: ViewerStage[],

    /** The matches of the stage to display. */
    matches: Match[],

    /** The games of the matches to display. */
    matchGames: MatchGame[],

    /** The participants who play in the stage to display. */
    participants: Participant[],

    /** The edges defining connections between matches in bracket stages. */
    edges?: BracketEdgeResponse[],
}

/**
 * The data to display with `brackets-viewer.js`
 */
export interface InternalViewerData {
    /** The stages to display. */
    stages: ViewerStage[],

    /** The matches of the stage to display. */
    matches: MatchWithMetadata[],

    /** The participants who play in the stage to display. */
    participants: Participant[],

    /** The edges defining connections between matches in bracket stages. */
    edges?: BracketEdgeResponse[],
}

/**
 * The possible placements of a participant's origin.
 */
export type Placement = 'none' | 'before' | 'after';

/**
 * The possible sides of a participant.
 */
export type Side = 'opponent1' | 'opponent2';

/**
 * The rendering mode for double elimination brackets.
 */
export type DoubleElimMode = 'unified' | 'split';


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
    customRoundName?: RoundNameGetter,

    /**
     * An optional selector to select the root element.
     * 
     * @default '.brackets-viewer'
     */
    selector?: string,
    /**
     * Theme identifier. Applies a `.bv-theme-{theme}` class to the container so CSS variables can be overridden.
     * 
     * @default undefined
     */
    theme?: string,

    /**
     * Where the position of a participant is placed relative to its name.
     * - If `none`, the position is not added.
     * - If `before`, the position is prepended before the participant name. "#1 Team"
     * - If `after`, the position is appended after the participant name, in parentheses. "Team (#1)"
     * 
     * @default 'before'
     */
    participantOriginPlacement?: Placement,

    /**
     * Whether to show the origin of a slot (wherever possible).
     * 
     * @default true
     */
    showSlotsOrigin?: boolean,

    /**
     * Whether to show the origin of a slot (in the lower bracket of an elimination stage).
     * 
     * @default true
     */
    showLowerBracketSlotsOrigin?: boolean,

    /** 
     * Display a popover when the label of a match with child games is clicked.
     * 
     * @default true
     */
    showPopoverOnMatchLabelClick?: boolean,

    /**
     * Whether to highlight every instance of a participant on hover.
     * 
     * @default true
     */
    highlightParticipantOnHover?: boolean,

    /**
     * Number of teams that qualify (advance) from each Round Robin group.
     * Used to color-code standings rows with green zone styling.
     *
     * @default undefined (no zone coloring)
     * @example 2 // Top 2 teams advance
     */
    qualifyingCount?: number,

    /**
     * Number of teams that are eliminated from each Round Robin group.
     * Used to color-code standings rows with red zone styling.
     * Teams in between qualifying and eliminated are shown in amber "bubble" zone.
     *
     * @default undefined (no zone coloring)
     * @example 2 // Bottom 2 teams eliminated
     */
    eliminatedCount?: number,

    /**
     * The rendering mode for double elimination brackets.
     * - If `unified`, all bracket groups (winners, losers, grand final) are rendered on a single canvas with cross-bracket edges visible.
     * - If `split`, bracket groups are rendered separately (backwards compatible with legacy behavior).
     *
     * @default 'unified'
     */
    doubleElimMode?: DoubleElimMode,

    /**
     * Whether to clear any previously displayed data.
     *
     * @default false
     */
    clear?: boolean

    /**
     * Whether to show semantic round headers (Finals, Semi-Finals, etc).
     *
     * @default true
     */
    showRoundHeaders?: boolean,

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
    showConnectors?: boolean,

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
    showMatchMetadata?: boolean,

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
    viewModelId?: string,

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
    layoutOverrides?: Partial<LayoutConfig>,

    // ===== GRANULAR LAYOUT DIMENSION CONTROLS =====
    // Character-creator-style customization - direct control over all layout properties
    // These override values from viewModelId and layoutOverrides if provided

    /**
     * Width of each match element in pixels.
     * Controls the horizontal size of match cards.
     *
     * @example 150 (default), 200 (logos), 300 (ultrawide)
     * @default undefined (uses value from viewModelId)
     */
    matchWidth?: number,

    /**
     * Height of each match element in pixels.
     * Controls the vertical size of match cards.
     *
     * @example 60 (default), 80 (logos), 44 (ultra-compact)
     * @default undefined (uses value from viewModelId)
     */
    matchHeight?: number,

    /**
     * Width of each column in pixels (includes match width + gap between rounds).
     * Controls horizontal spacing between rounds.
     *
     * @example 190 (default), 340 (ultrawide)
     * @default undefined (uses value from viewModelId)
     */
    columnWidth?: number,

    /**
     * Height of each row in pixels (includes match height + vertical gap between matches).
     * Controls vertical spacing between matches in the same round.
     *
     * @example 80 (default), 100 (spacious), 56 (ultra-compact)
     * @default undefined (uses value from viewModelId)
     */
    rowHeight?: number,

    /**
     * Row height specifically for the lower bracket when using split-horizontal alignment.
     * Allows compressing the lower bracket vertically to reduce scrolling.
     * Only applies when bracketAlignment is 'split-horizontal'.
     * If undefined, uses rowHeight for all brackets.
     *
     * @example 48 (40% reduction from default 80px), 44 (45% reduction)
     * @default undefined (uses rowHeight)
     */
    lowerBracketRowHeight?: number,

    /**
     * Row height specifically for the upper bracket when using split-horizontal alignment.
     * Allows compressing the upper bracket vertically to reduce scrolling.
     * Only applies when bracketAlignment is 'split-horizontal'.
     * If undefined, uses rowHeight for all brackets.
     *
     * @example 48 (40% reduction from default 80px), 44 (45% reduction)
     * @default undefined (uses rowHeight)
     */
    upperBracketRowHeight?: number,

    /**
     * Top padding/offset for the bracket in pixels.
     * Controls spacing from the top edge of the container.
     *
     * @example 50 (default), 32 (ultra-compact), 60 (spacious)
     * @default undefined (uses value from viewModelId)
     */
    topOffset?: number,

    /**
     * Left padding/offset for the bracket in pixels.
     * Controls spacing from the left edge of the container.
     *
     * @example 0 (default for all presets)
     * @default undefined (uses value from viewModelId)
     */
    leftOffset?: number,

    /**
     * Horizontal gap between bracket groups (winner/loser/grand final) in columns.
     * For double elimination: gap between Winners → Losers → Grand Finals.
     *
     * @example 1 (default - minimal gap)
     * @default undefined (uses value from viewModelId)
     */
    groupGapX?: number,

    /**
     * Vertical gap between bracket groups in pixels.
     * For double elimination: vertical spacing between Winners and Losers brackets.
     *
     * @example 100 (default), 60 (compact), 120 (spacious)
     * @default undefined (uses value from viewModelId)
     */
    groupGapY?: number,

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
    bracketAlignment?: 'top' | 'center' | 'bottom' | 'finals-top',

    /**
     * Horizontal offset for Losers bracket when using 'finals-top' alignment (in columns).
     * Prevents visual overlap with Winners bracket.
     *
     * @example 0 (default - aligned), 2 (offset by 2 columns)
     * @default undefined (uses value from viewModelId)
     */
    losersBracketOffsetX?: number,

    /**
     * Vertical step between Swiss layers in pixels.
     * A layer is wins + losses (e.g., 2-0 and 1-1 are both layer 2).
     * Creates progressive vertical stacking of Swiss record buckets.
     *
     * @example 120 (default), 90 (compact), 150 (spacious)
     * @default undefined (uses value from viewModelId)
     */
    swissLayerStepY?: number,

    /**
     * Vertical gap between Swiss panels in the same column (round) in pixels.
     * For round-based stacking where multiple buckets appear in one column.
     *
     * @example 24 (default), 16 (ultra-compact), 32 (spacious)
     * @default undefined (uses value from viewModelId)
     */
    swissBucketGapY?: number,

    // ===== THEME & VISUAL CUSTOMIZATION =====

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
    fontSize?: 'small' | 'medium' | 'large',

    // ===== PERFORMANCE OPTIONS =====

    /**
     * Enable layout caching for faster re-renders.
     * Cached layouts are reused when match data hasn't changed.
     *
     * @default true
     */
    enableLayoutCache?: boolean,

    /**
     * Enable SVG connector element pooling.
     * Reduces memory churn by reusing SVG elements instead of recreating them.
     *
     * @default true
     */
    enableSVGPooling?: boolean,

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
    enableVirtualization?: boolean | 'auto',

    /**
     * Threshold for auto-enabling virtualization.
     * Only applies when enableVirtualization is 'auto'.
     *
     * @default 50
     */
    virtualizationThreshold?: number,

}

/**
 * The possible types of connection between matches.
 */
export type ConnectionType = 'square' | 'straight' | false;

/**
 * A function returning an origin hint based on a participant's position.
 */
export type OriginHint = (position: number) => string;

/**
 * Info associated to a round in order to name its header.
 */
export type RoundNameInfo = {
    groupType: Exclude<ToI18nKey<GroupType>, 'final-group'>,
    roundNumber: number,
    roundCount: number,
    /**
     * `1` = final, `1/2` = semi finals, `1/4` = quarter finals, etc.
     */
    fractionOfFinal: number,
} | {
    groupType: 'round-robin',
    roundNumber: number,
    roundCount: number,
} | {
    groupType: 'swiss',
    roundNumber: number,
    roundCount: number,
} | {
    groupType: 'final-group',
    finalType: ToI18nKey<FinalType>,
    roundNumber: number,
    roundCount: number,
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
 * Contains the information about the connections of a match.
 */
export interface Connection {
    connectPrevious?: ConnectionType,
    connectNext?: ConnectionType,
}

/**
 * Contains information about a header of the ranking and its tooltip.
 */
export interface RankingHeader {
    text: string,
    tooltip: string,
}

/**
 * An object mapping ranking properties to their header.
 */
export type RankingHeaders = Record<keyof RankingItem, RankingHeader>;

/**
 * Structure containing all the containers for a participant.
 */
export interface ParticipantContainers {
    participant: HTMLElement,
    name: HTMLElement,
    result: HTMLElement,
}

/**
 * Image associated to a participant.
 */
export interface ParticipantImage {
    participantId: number,
    imageUrl: string,
}
