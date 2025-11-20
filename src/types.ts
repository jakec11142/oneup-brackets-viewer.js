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
 * View mode for elimination brackets (SE/DE only).
 * Controls match card sizing and spacing optimized for different use cases.
 *
 * - `default`: Standard sizing (150px wide matches)
 * - `compact`: Tighter spacing (130px wide matches)
 * - `ultra-compact`: Maximum density (120px wide matches)
 * - `spacious`: Extra room (170px wide matches)
 * - `logo`: Larger cards (200px wide matches) with room for team logos
 * - `logo-compact`: Medium cards (180px wide matches) with logos in compact layout
 * - `ultrawide`: Extra-wide layout (300px wide matches) optimized for ultrawide monitors
 */
export type ViewMode = 'default' | 'compact' | 'ultra-compact' | 'spacious' | 'logo' | 'logo-compact' | 'ultrawide';

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
     * Whether to show the child count of a BoX match separately in the match label.
     * - If `false`, the match label and the child count are in the same place. (Example: "M1.1, Bo3")
     * - If `true`, the match label and the child count are in an opposite place. (Example: "M1.1   (right-->) Bo3")
     * 
     * @default false
     */
    separatedChildCountLabel?: boolean,

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
     * Whether to show a ranking table in each group of a round-robin stage.
     * 
     * @default true
     */
    showRankingTable?: boolean,

    /**
     * A formula to compute the ranking of the participants on round-robin stages.
     *
     * See {@link RankingItem} for the possible properties on `item`.
     *
     * @default (item) => 3 * item.wins + 1 * item.draws + 0 * item.losses
     */
    rankingFormula?: RankingFormula,

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
     * Whether to show status badges on matches (LIVE, upcoming, completed).
     *
     * @default true
     */
    showStatusBadges?: boolean,

    /**
     * Whether to show semantic round headers (Finals, Semi-Finals, etc).
     *
     * @default true
     */
    showRoundHeaders?: boolean,

    /**
     * View model preset ID for bracket layout and theme.
     *
     * View models provide preset configurations for:
     * - Layout density (normal, compact, ultra-compact, spacious)
     * - Theme (default, admin-compact, etc.)
     * - Double elimination mode (unified/split)
     *
     * Available presets:
     * - Single Elimination: 'se-default', 'se-compact', 'se-ultra-compact', 'se-spacious'
     * - Double Elimination: 'de-default', 'de-compact', 'de-admin-compact', 'de-split', 'de-spacious'
     * - Generic: 'default', 'compact', 'admin'
     *
     * If not specified, an appropriate default is chosen based on the stage type.
     *
     * @example
     * // Use compact view for admin dashboard
     * viewer.render(data, { viewModelId: 'de-admin-compact' });
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

    /**
     * Sizing preset for elimination brackets (single/double elimination only).
     *
     * Provides quick sizing presets optimized for different use cases:
     * - `default`: Standard sizing (150px wide matches) - balanced for most displays
     * - `compact`: Tighter spacing (130px wide matches) - fits more on screen for admin dashboards
     * - `logo`: Larger cards (200px wide matches) - room for team logos and broadcasts
     * - `ultrawide`: Extra-wide layout (300px wide matches) - optimized for 21:9 ultrawide monitors
     *
     * Note: Only applies to single_elimination and double_elimination stages.
     * Swiss and round-robin stages are unaffected.
     *
     * This parameter works alongside viewModelId - sizing adjusts dimensions while
     * viewModelId controls the full preset (layout + theme + DE mode).
     *
     * @example
     * // Quick sizing for logos
     * viewer.render(data, { sizing: 'logo' });
     *
     * @example
     * // Ultrawide mode for 21:9 displays
     * viewer.render(data, { sizing: 'ultrawide' });
     *
     * @example
     * // Combine with view model
     * viewer.render(data, {
     *   viewModelId: 'de-spacious',
     *   sizing: 'compact'
     * });
     *
     * @default undefined (uses layout from viewModelId or default)
     */
    sizing?: ViewMode,

    /**
     * @deprecated Use `sizing` instead. This parameter will be removed in a future version.
     *
     * View mode for elimination brackets (single/double elimination only).
     * Alias for `sizing` - kept for backward compatibility.
     *
     * @default undefined (uses layout from viewModelId or default)
     */
    viewMode?: ViewMode,

    // ===== GRANULAR LAYOUT DIMENSION CONTROLS =====
    // Character-creator-style customization - direct control over all layout properties
    // These override values from viewModelId, sizing, and layoutOverrides if provided

    /**
     * Width of each match element in pixels.
     * Controls the horizontal size of match cards.
     *
     * @example 150 (default), 200 (logos), 300 (ultrawide)
     * @default undefined (uses value from viewModelId or sizing)
     */
    matchWidth?: number,

    /**
     * Height of each match element in pixels.
     * Controls the vertical size of match cards.
     *
     * @example 60 (default), 80 (logos), 44 (ultra-compact)
     * @default undefined (uses value from viewModelId or sizing)
     */
    matchHeight?: number,

    /**
     * Width of each column in pixels (includes match width + gap between rounds).
     * Controls horizontal spacing between rounds.
     *
     * @example 190 (default), 340 (ultrawide)
     * @default undefined (uses value from viewModelId or sizing)
     */
    columnWidth?: number,

    /**
     * Height of each row in pixels (includes match height + vertical gap between matches).
     * Controls vertical spacing between matches in the same round.
     *
     * @example 80 (default), 100 (spacious), 56 (ultra-compact)
     * @default undefined (uses value from viewModelId or sizing)
     */
    rowHeight?: number,

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

    /**
     * Font weight for team names and primary text.
     *
     * - `normal`: Standard weight (400)
     * - `medium`: Semi-bold (500)
     * - `bold`: Bold text (600)
     *
     * @example 'normal' (default)
     * @default 'normal'
     */
    fontWeight?: 'normal' | 'medium' | 'bold',

    /**
     * Border radius for match cards in pixels.
     * Controls the roundness of match box corners.
     *
     * @example 4 (default - subtle rounding), 0 (sharp corners), 8 (more rounded)
     * @default 4
     */
    borderRadius?: number,

    /**
     * Inner padding for match cards in pixels.
     * Controls spacing between match card edges and content.
     *
     * @example 8 (default), 4 (compact), 12 (spacious)
     * @default 8
     */
    matchPadding?: number,
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
