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
 * - `compact`: Tighter spacing (130px wide matches) for admin dashboards
 * - `logo`: Larger cards (200px wide matches) with room for team logos
 * - `ultrawide`: Extra-wide layout (220px wide matches) optimized for ultrawide monitors
 */
export type ViewMode = 'default' | 'compact' | 'logo' | 'ultrawide';

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
     * Whether to show connector lines between matches.
     *
     * @default true
     */
    showConnectors?: boolean,

    /**
     * Whether to show participant images/avatars in matches.
     *
     * @default false
     */
    showParticipantImages?: boolean,

    /**
     * Visual style for connector lines between matches.
     * - `default`: Standard connector lines
     * - `minimal`: Thinner, more subtle lines
     * - `bold`: Thicker, more prominent lines
     * - `rounded`: Smooth curved connectors
     *
     * @default 'default'
     */
    connectorStyle?: 'default' | 'minimal' | 'bold' | 'rounded',

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
     * View mode for elimination brackets (single/double elimination only).
     *
     * Provides quick sizing presets optimized for different use cases:
     * - `default`: Standard sizing (150px wide matches) - balanced for most displays
     * - `compact`: Tighter spacing (130px wide matches) - fits more on screen for admin dashboards
     * - `logo`: Larger cards (200px wide matches) - room for team logos and broadcasts
     * - `ultrawide`: Extra-wide layout (220px wide matches) - optimized for ultrawide monitors
     *
     * Note: Only applies to single_elimination and double_elimination stages.
     * Swiss and round-robin stages are unaffected.
     *
     * This parameter works alongside viewModelId - viewMode adjusts sizing while
     * viewModelId controls the full preset (layout + theme + DE mode).
     *
     * @example
     * // Quick sizing for logos
     * viewer.render(data, { viewMode: 'logo' });
     *
     * @example
     * // Ultrawide mode for large displays
     * viewer.render(data, { viewMode: 'ultrawide' });
     *
     * @example
     * // Combine with view model
     * viewer.render(data, {
     *   viewModelId: 'de-spacious',
     *   viewMode: 'compact'
     * });
     *
     * @default undefined (uses layout from viewModelId or default)
     */
    viewMode?: ViewMode,
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
