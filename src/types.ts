import { Match, MatchGame, Participant, RankingItem } from 'brackets-model';
import { CallbackFunction, FormConfiguration } from './form';
import { InMemoryDatabase } from 'brackets-memory-db';
import { BracketsViewer } from './main';
import { BracketsManager } from 'brackets-manager';
import { ToI18nKey, TFunction } from './lang';
import type { StageStructureResponse, StageStandingsResponse, StageStructureConversionOptions, BracketEdgeResponse } from './dto/types';
import { ViewerStage, ViewerStageType } from './models';

// Re-export from new type modules
export {
    type ConnectionType,
    type OriginHint,
    type Connection,
    type MatchWithMetadata,
    type MatchGameWithMetadata,
} from './types/match';

export {
    type Placement,
    type DoubleElimMode,
    type RoundNameInfo,
    type RoundNameGetter,
    type MatchClickCallback,
    type Config,
} from './types/config';

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

// Import MatchWithMetadata for InternalViewerData
import type { MatchWithMetadata } from './types/match';

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
 * The possible sides of a participant.
 */
export type Side = 'opponent1' | 'opponent2';

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
