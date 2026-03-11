/**
 * BracketLayoutResult — Serializable output from computeBracketLayout().
 *
 * This is the data structure a React Flow frontend (or any other renderer)
 * consumes to render a tournament bracket.
 * All types use plain objects (no Map) for JSON serializability and SSR safety.
 */
import type { Match } from 'brackets-model';
import type { LayoutConfig } from '../viewModels';
import type { RoundHeader, ConnectorLine, SwissPanelPosition } from './types';
import type { SwissZone } from '../types';
/**
 * The complete layout result for one stage.
 */
export interface BracketLayoutResult {
    /** Stage metadata */
    stage: {
        id: string | number;
        type: string;
        name: string;
    };
    /** The resolved layout config that produced these positions */
    layoutConfig: LayoutConfig;
    /** All matches with pixel positions and resolved participant data */
    matches: BracketMatchNode[];
    /** Round/column headers with pixel positions */
    headers: RoundHeader[];
    /** Connector lines between matches (polyline points) */
    connectors: ConnectorLine[];
    /** Swiss panel boxes (only present for Swiss stages) */
    panels?: SwissPanelPosition[];
    /** Y offset per bracket group label (e.g., "Upper Bracket": 0, "Lower Bracket": 400) */
    groupOffsets?: Record<string, number>;
    /** Total canvas dimensions in pixels */
    totalWidth: number;
    totalHeight: number;
}
/**
 * A match node with its computed position and resolved data.
 */
export interface BracketMatchNode {
    /** Match ID (string) */
    id: string;
    /** Pixel position (top-left corner) */
    position: {
        x: number;
        y: number;
    };
    /** Grid position (column/lane indices) */
    gridPosition: {
        column: number;
        lane: number;
    };
    /** Node dimensions from layout config */
    width: number;
    height: number;
    /** The original match data (status, round_id, group_id, etc.) */
    match: Match;
    /** Enriched metadata from the layout pipeline */
    metadata: {
        label?: string;
        roundNumber?: number;
        roundCount?: number;
        matchLocation?: string;
        connectFinal?: boolean;
        swissWins?: number;
        swissLosses?: number;
        swissZone?: SwissZone;
        roundDate?: string;
        roundBestOf?: string;
    };
    /** Resolved opponent data — consumer does not need to cross-reference participants */
    opponents: {
        opponent1: ResolvedOpponent | null;
        opponent2: ResolvedOpponent | null;
    };
}
/**
 * A resolved opponent with participant name and match result.
 */
export interface ResolvedOpponent {
    participantId: number | null;
    name: string | null;
    score: number | undefined;
    result: string | undefined;
    isWinner: boolean;
}
