/**
 * Layout Types - Type definitions for bracket layout computation.
 */

import type { SwissZone } from '../types';

/**
 * Bracket group types in display order
 */
export type BracketGroup = 'WINNERS_BRACKET' | 'LOSERS_BRACKET' | 'GRAND_FINAL_BRACKET' | 'PLACEMENT_BRACKET';

export const GROUP_ORDER: BracketGroup[] = [
    'WINNERS_BRACKET',
    'LOSERS_BRACKET',
    'GRAND_FINAL_BRACKET',
];

/**
 * A point in 2D space.
 */
export interface Point {
    x: number;
    y: number;
}

/**
 * Type of connector based on bracket relationship.
 */
export type ConnectorType = 'internal' | 'cross-bracket' | 'grand-final';

/**
 * A connector line between two matches.
 */
export interface ConnectorLine {
    id: string;
    fromMatchId: string;
    toMatchId: string;
    points: Point[];
    connectorType: ConnectorType;
}

/**
 * Position information for a round header.
 */
export interface RoundHeader {
    roundNumber: number;
    roundName: string;
    columnIndex: number;
    xPx: number;
    yPx: number;
}

/**
 * Position information for a match.
 */
export interface MatchPosition {
    xRound: number;  // Column index
    yLane: number;   // Row/lane index
    xPx: number;     // Pixel X position
    yPx: number;     // Pixel Y position
}

/**
 * Panel position for boxed Swiss layout
 */
export interface SwissPanelPosition {
    /** Record key (e.g., "0-0", "1-0", "2-1") */
    key: string;
    /** Display label for the record */
    record: string;
    /** Optional round number associated with this bucket */
    roundNumber?: number;
    /** Date string for panel header (from round data if available) */
    date?: string;
    /** Best-of label (e.g., "BO1", "BO3") from round data if available */
    bestOf?: string;
    /** X position in pixels */
    xPx: number;
    /** Y position in pixels */
    yPx: number;
    /** Panel width in pixels */
    width: number;
    /** Panel height in pixels (based on match count) */
    height: number;
    /** Number of matches in this panel */
    matchCount: number;
    /** Layer index (wins + losses) for vertical positioning */
    layer?: number;
    /** Zone classification for visual hierarchy (advancing/neutral/eliminated) */
    zone: SwissZone;
}

/**
 * Complete layout result.
 */
export interface BracketLayout {
    matchPositions: Map<string, MatchPosition>;
    headerPositions: RoundHeader[];
    connectors: ConnectorLine[];
    panelPositions?: SwissPanelPosition[]; // Swiss-specific: boxed panel positions
    groupOffsetY?: Map<BracketGroup, number>; // Y offsets for bracket groups (for section titles)
    totalWidth: number;
    totalHeight: number;
}

/**
 * Extracts bracket group from group_id.
 */
export function extractBracketGroup(groupId: string): BracketGroup {
    const normalized = groupId.toLowerCase();

    if (normalized.includes('placement') || normalized.includes('third') || normalized.includes('3rd'))
        return 'PLACEMENT_BRACKET';

    if (normalized.includes('loser') || normalized.includes('lower'))
        return 'LOSERS_BRACKET';

    if (normalized.includes('grand-final') || normalized.includes('grand') ||
        (normalized.includes('grand') && normalized.includes('final')))
        return 'GRAND_FINAL_BRACKET';

    if (normalized.includes('final'))
        return 'GRAND_FINAL_BRACKET';

    if (normalized.includes('winner') || normalized.includes('upper'))
        return 'WINNERS_BRACKET';

    return 'WINNERS_BRACKET';
}
