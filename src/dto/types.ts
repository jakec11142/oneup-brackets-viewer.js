import type { Id } from 'brackets-model';

export type StageStructureFormat = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS' | 'FFA';

export interface StageStructureResponse {
    stageId?: string;
    stageType?: StageStructureFormat;
    stageItems?: StageItemStructureResponse[];
}

export interface StageItemStructureResponse {
    id?: string;
    groupIndex?: number;
    rounds?: RoundStructureResponse[];
    edges?: BracketEdgeResponse[];
}

export interface RoundStructureResponse {
    number?: number;
    bracketGroup?: string;
    matches?: MatchStructureResponse[];
}

export type MatchLifecycleStatus = 'UNSCHEDULED' | 'SCHEDULED' | 'LIVE' | 'COMPLETED';

export interface MatchStructureResponse {
    id?: string;
    matchIndex?: number;
    status?: MatchLifecycleStatus;
    scheduledTime?: string | Date;
    completed?: boolean;
    slots?: MatchSlotResponse[];
}

export interface MatchSlotResponse {
    slot?: number;
    teamName?: string;
    gamesWon?: number;
    winner?: boolean;
    sourceStageName?: string;
    sourceGroupIndex?: number;
    sourceRank?: number;
    sourceStageItemId?: string;
}

export interface BracketEdgeResponse {
    fromMatchId?: string;
    fromRank?: number;
    toMatchId?: string;
    toSlot?: number;
}

export interface StageStandingsResponse {
    stageId?: string;
    stageType?: StageStructureFormat;
    groups?: GroupStandingsResponse[];
}

export interface GroupStandingsResponse {
    groupIndex?: number;
    entries?: StandingEntryResponse[];
}

export interface StandingEntryResponse {
    rank?: number;
    teamName?: string;
    wins?: number;
    losses?: number;
    draws?: number;
    points?: number;
    scoreFor?: number;
    scoreAgainst?: number;
}

export interface StageStructureConversionOptions {
    stageName?: string;
    tournamentId?: Id;
    stageNumber?: number;
}
