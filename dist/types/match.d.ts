/**
 * Match Types - Match-related type definitions for brackets-viewer.js
 */
import type { Match, MatchGame, GroupType } from 'brackets-model';
import type { ViewerStageType } from '../models';
/**
 * The possible types of connection between matches.
 */
export type ConnectionType = 'square' | 'straight' | false;
/**
 * A function returning an origin hint based on a participant's position.
 */
export type OriginHint = (position: number) => string;
/**
 * Contains the information about the connections of a match.
 */
export interface Connection {
    connectPrevious?: ConnectionType;
    connectNext?: ConnectionType;
}
/**
 * A match with metadata constructed by the viewer.
 */
export interface MatchWithMetadata extends Match {
    metadata: {
        /** Type of the stage this match is in. */
        stageType: ViewerStageType;
        /** The list of child games of this match. */
        games: MatchGame[];
        /** Label as shown in the UI */
        label?: string;
        /** Number of the round this match is in. */
        roundNumber?: number;
        /** Count of rounds in the group this match is in. */
        roundCount?: number;
        /** Group type this match is in. */
        matchLocation?: GroupType;
        /** Number of wins for teams in this match (Swiss only) */
        swissWins?: number;
        /** Number of losses for teams in this match (Swiss only) */
        swissLosses?: number;
        /** Date of the round this match is in (Swiss only) */
        roundDate?: string;
        /** Best-of format for this match's round (Swiss only, e.g., "BO1", "BO3") */
        roundBestOf?: string;
        /** Whether to connect this match to the final if it happens to be the last one of the bracket. */
        connectFinal?: boolean;
        /** Whether to connect this match with previous or next matches. */
        connection?: Connection;
        /** Function returning an origin hint based on a participant's position for this match. */
        originHint?: OriginHint;
    };
}
export interface MatchGameWithMetadata extends MatchGame {
    metadata: {
        /** Label as shown in the UI */
        label?: string;
    };
}
