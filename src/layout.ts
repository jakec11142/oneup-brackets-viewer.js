import { Match, GroupType } from 'brackets-model';
import { BracketEdgeResponse } from './dto/types';

// Layout constants (should match CSS variables)
// --bv-match-width: 150px, --bv-round-gap: 40px
const COLUMN_WIDTH = 190;  // 150 (match width) + 40 (round gap)
const ROW_HEIGHT = 80;     // Match height + vertical gap
const MATCH_HEIGHT = 60;   // Actual match min-height for connector anchoring
const TOP_OFFSET = 50;     // Top padding to ensure first round is visible
const LEFT_OFFSET = 0;     // Left padding (none needed, container has padding)
const GROUP_GAP_Y = 100;   // Vertical gap between bracket groups (winners/losers/finals)
const GROUP_GAP_X = 1;     // Column gap between bracket groups

/**
 * Bracket group types in display order
 */
type BracketGroup = 'WINNERS_BRACKET' | 'LOSERS_BRACKET' | 'GRAND_FINAL_BRACKET' | 'PLACEMENT_BRACKET';

const GROUP_ORDER: BracketGroup[] = [
    'WINNERS_BRACKET',
    'LOSERS_BRACKET',
    'GRAND_FINAL_BRACKET',
    'PLACEMENT_BRACKET',
];

/**
 * A point in 2D space.
 */
export interface Point {
    x: number;
    y: number;
}

/**
 * A connector line between two matches.
 */
export interface ConnectorLine {
    id: string;
    fromMatchId: string;
    toMatchId: string;
    points: Point[];
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
 * Complete layout result.
 */
export interface BracketLayout {
    matchPositions: Map<string, MatchPosition>;
    headerPositions: RoundHeader[];
    connectors: ConnectorLine[];
    totalWidth: number;
    totalHeight: number;
}

/**
 * Extracts bracket group from group_id.
 * Examples:
 * - "stage-1-winners-bracket" -> "WINNERS_BRACKET"
 * - "stage-1-losers-bracket" -> "LOSERS_BRACKET"
 * - "stage-1-finals" -> "GRAND_FINAL_BRACKET"
 * - "stage-1-placement-finals" -> "PLACEMENT_BRACKET"
 * - "stage-1-third-place" -> "PLACEMENT_BRACKET"
 *
 * @param groupId The group_id from a match
 * @returns BracketGroup type
 */
function extractBracketGroup(groupId: string): BracketGroup {
    const normalized = groupId.toLowerCase();

    if (normalized.includes('placement') || normalized.includes('third') || normalized.includes('3rd')) {
        return 'PLACEMENT_BRACKET';
    }
    if (normalized.includes('loser')) {
        return 'LOSERS_BRACKET';
    }
    if (normalized.includes('final')) {
        return 'GRAND_FINAL_BRACKET';
    }
    // Default to winners bracket (includes single elimination)
    return 'WINNERS_BRACKET';
}

/**
 * Computes the complete layout for a bracket.
 *
 * @param matches All matches in the bracket
 * @param edges All edges defining connections between matches
 * @param bracketType Type of bracket (winner_bracket, loser_bracket, etc.)
 * @returns Complete layout with positions and connectors
 */
export function computeLayout(
    matches: Match[],
    edges: BracketEdgeResponse[],
    bracketType: GroupType
): BracketLayout {
    console.log(`🔧 computeLayout called: ${matches.length} matches, ${edges.length} edges, type=${bracketType}`);

    if (matches.length === 0) {
        console.error('❌ ERROR: No matches to layout!');
        return {
            matchPositions: new Map(),
            headerPositions: [],
            connectors: [],
            totalWidth: 0,
            totalHeight: 0,
        };
    }

    // --- 1. Group matches by bracketGroup and round ---
    interface MatchNode {
        match: Match;
        bracketGroup: BracketGroup;
        roundNumber: number;
    }

    const matchesById = new Map<string, MatchNode>();
    const matchesByGroupRound = new Map<BracketGroup, Map<number, string[]>>();
    const roundsByGroup = new Map<BracketGroup, Set<number>>();

    console.log(`📊 Analyzing ${matches.length} matches...`);
    matches.forEach(match => {
        const matchId = String(match.id);
        const bracketGroup = extractBracketGroup(String(match.group_id));

        // Extract round number from round_id (e.g., "group-1-round-3" -> 3)
        const roundMatch = String(match.round_id).match(/round-(\d+)/);
        const roundNumber = roundMatch ? parseInt(roundMatch[1], 10) : 1;

        if (matches.length <= 20) { // Only log for small brackets to avoid spam
            console.log(`  Match ${matchId}: group_id="${match.group_id}" → ${bracketGroup}, round=${roundNumber}`);
        }

        matchesById.set(matchId, { match, bracketGroup, roundNumber });

        // Track rounds per group
        if (!roundsByGroup.has(bracketGroup)) {
            roundsByGroup.set(bracketGroup, new Set());
        }
        roundsByGroup.get(bracketGroup)!.add(roundNumber);

        // Track matches by group/round
        if (!matchesByGroupRound.has(bracketGroup)) {
            matchesByGroupRound.set(bracketGroup, new Map());
        }
        const groupRounds = matchesByGroupRound.get(bracketGroup)!;
        if (!groupRounds.has(roundNumber)) {
            groupRounds.set(roundNumber, []);
        }
        groupRounds.get(roundNumber)!.push(matchId);
    });

    // --- 2. Assign xRound columns per (group, round) with group separation ---
    const groupOffsetsX = new Map<BracketGroup, number>();
    let currentColumn = 0;

    console.log(`📐 Column assignment:`);
    for (const group of GROUP_ORDER) {
        const rounds = roundsByGroup.get(group);
        if (!rounds || rounds.size === 0) continue;

        const sortedRounds = Array.from(rounds).sort((a, b) => a - b);
        groupOffsetsX.set(group, currentColumn);
        console.log(`  ${group}: ${sortedRounds.length} rounds → columns ${currentColumn} to ${currentColumn + sortedRounds.length - 1}`);
        currentColumn += sortedRounds.length + GROUP_GAP_X; // Add gap between groups
    }

    const matchPositions = new Map<string, MatchPosition>();
    let maxXRound = 0;

    for (const group of GROUP_ORDER) {
        const groupRounds = matchesByGroupRound.get(group);
        if (!groupRounds) continue;

        const baseCol = groupOffsetsX.get(group) ?? 0;
        const sortedRounds = Array.from(groupRounds.keys()).sort((a, b) => a - b);

        sortedRounds.forEach((roundNumber, roundIdx) => {
            const col = baseCol + roundIdx;
            const idsInRound = groupRounds.get(roundNumber) ?? [];

            for (const id of idsInRound) {
                matchPositions.set(id, {
                    xRound: col,
                    yLane: 0, // Will be filled later
                    xPx: 0,   // Will be filled later
                    yPx: 0,   // Will be filled later
                });
                maxXRound = Math.max(maxXRound, col);
            }
        });
    }

    // --- 3. Compute lane floats per group using internal edges only ---
    const laneIndicesByGroup = new Map<BracketGroup, Map<string, number>>();
    const laneCountByGroup = new Map<BracketGroup, number>();

    for (const group of GROUP_ORDER) {
        const groupRounds = matchesByGroupRound.get(group);
        if (!groupRounds) continue;

        const laneFloatById = new Map<string, number>();
        let nextLane = 0;

        // Build inbound edges for this group (internal edges only)
        const inEdgesByToId = new Map<string, BracketEdgeResponse[]>();
        for (const edge of edges) {
            const toNode = matchesById.get(String(edge.toMatchId ?? ''));
            const fromNode = matchesById.get(String(edge.fromMatchId ?? ''));
            if (!toNode || !fromNode) continue;

            // Only consider internal edges (same bracketGroup)
            if (fromNode.bracketGroup !== group || toNode.bracketGroup !== group) continue;

            const toId = String(edge.toMatchId ?? '');
            if (!inEdgesByToId.has(toId)) {
                inEdgesByToId.set(toId, []);
            }
            inEdgesByToId.get(toId)!.push(edge);
        }

        // Process rounds in order
        const sortedRounds = Array.from(groupRounds.keys()).sort((a, b) => a - b);

        for (const roundNumber of sortedRounds) {
            const idsInRound = groupRounds.get(roundNumber) ?? [];

            // Sort by match number for deterministic ordering
            idsInRound.sort((a, b) => {
                const matchA = matchesById.get(a)?.match;
                const matchB = matchesById.get(b)?.match;
                return (matchA?.number ?? 0) - (matchB?.number ?? 0);
            });

            for (const matchId of idsInRound) {
                const inboundEdges = inEdgesByToId.get(matchId) ?? [];
                const childLanes: number[] = [];

                for (const edge of inboundEdges) {
                    const childId = String(edge.fromMatchId ?? '');
                    const lane = laneFloatById.get(childId);
                    if (lane !== undefined) {
                        childLanes.push(lane);
                    }
                }

                if (childLanes.length > 0) {
                    // Has children: center between them (average)
                    const avgLane = childLanes.reduce((sum, lane) => sum + lane, 0) / childLanes.length;
                    laneFloatById.set(matchId, avgLane);
                } else {
                    // No internal children: assign next sequential lane
                    laneFloatById.set(matchId, nextLane);
                    nextLane += 1;
                }
            }
        }

        // --- Tie-breaking: Resolve collisions where multiple matches share same lane float ---
        // This happens when matches share identical parent sets (e.g., final + 3rd place,
        // GF1 + GF2 both taking WB winner + LB winner)

        const buckets = new Map<number, string[]>();
        for (const [matchId, lf] of laneFloatById.entries()) {
            const key = Math.round(lf * 1000) / 1000; // Round to avoid fp noise
            if (!buckets.has(key)) {
                buckets.set(key, []);
            }
            buckets.get(key)!.push(matchId);
        }

        // Spread apart matches with identical lane floats
        let collisionCount = 0;
        for (const [lf, ids] of buckets.entries()) {
            if (ids.length <= 1) continue;

            collisionCount += ids.length - 1;

            // Stable order: by roundNumber then matchIndex
            ids.sort((a, b) => {
                const ma = matchesById.get(a);
                const mb = matchesById.get(b);
                if (!ma || !mb) return 0;
                return (
                    ma.roundNumber - mb.roundNumber ||
                    ma.match.number - mb.match.number
                );
            });

            // Spread them around the original center
            const base = lf;
            const step = 0.25; // Small offset to keep them visually close
            const offsetStart = -((ids.length - 1) * step) / 2;

            ids.forEach((id, idx) => {
                laneFloatById.set(id, base + offsetStart + idx * step);
            });
        }

        if (collisionCount > 0) {
            console.log(`   ⚠️ Resolved ${collisionCount} lane collisions via tie-breaking`);
        }

        // Normalize float lanes to sorted integer indices 0..N-1
        const uniqueFloats = Array.from(new Set(laneFloatById.values())).sort((a, b) => a - b);
        const floatToIndex = new Map<number, number>();
        uniqueFloats.forEach((val, idx) => floatToIndex.set(val, idx));

        const normalized = new Map<string, number>();
        for (const [matchId, lf] of laneFloatById.entries()) {
            const idx = floatToIndex.get(lf);
            if (idx !== undefined) {
                normalized.set(matchId, idx);
            }
        }

        laneIndicesByGroup.set(group, normalized);
        laneCountByGroup.set(group, uniqueFloats.length || 1);

        console.log(`🎯 ${group}: ${laneFloatById.size} matches, ${uniqueFloats.length} unique lanes (${collisionCount} ties resolved)`);
    }

    // --- 4. Compute Y offsets per group and final pixel positions ---
    let currentY = TOP_OFFSET;
    const groupOffsetY = new Map<BracketGroup, number>();

    for (const group of GROUP_ORDER) {
        const lanesCount = laneCountByGroup.get(group);
        if (!lanesCount) continue;

        groupOffsetY.set(group, currentY);
        const groupHeight = lanesCount * ROW_HEIGHT;
        currentY += groupHeight + GROUP_GAP_Y;
    }

    // Fill in xPx, yPx, and lane on matchPositions
    let maxX = 0;
    let maxY = 0;

    for (const [id, pos] of matchPositions.entries()) {
        const node = matchesById.get(id);
        if (!node) continue;

        const group = node.bracketGroup;
        const laneIdx = laneIndicesByGroup.get(group)?.get(id) ?? 0;

        const xPx = LEFT_OFFSET + pos.xRound * COLUMN_WIDTH;
        const yPx = (groupOffsetY.get(group) ?? TOP_OFFSET) + laneIdx * ROW_HEIGHT;

        pos.yLane = laneIdx;
        pos.xPx = xPx;
        pos.yPx = yPx;

        matchPositions.set(id, pos);

        maxX = Math.max(maxX, xPx + 150); // Match width
        maxY = Math.max(maxY, yPx + MATCH_HEIGHT);
    }

    // --- 5. Calculate header positions ---
    const headerPositions: RoundHeader[] = [];
    const uniqueColumns = new Set<number>();

    matchPositions.forEach(pos => uniqueColumns.add(pos.xRound));

    Array.from(uniqueColumns).sort((a, b) => a - b).forEach(colIndex => {
        headerPositions.push({
            roundNumber: colIndex + 1,
            roundName: '', // Will be set by renderer with proper name
            columnIndex: colIndex,
            xPx: LEFT_OFFSET + (colIndex * COLUMN_WIDTH),
            yPx: TOP_OFFSET - 40, // Position headers above first bracket
        });
    });

    // --- 6. Generate connectors ---
    const connectors = generateConnectors(edges, matchPositions);

    console.log(`🔗 Generated ${connectors.length} connectors from ${edges.length} edges`);
    if (connectors.length > 0 && connectors.length < edges.length) {
        console.warn(`⚠️ Some connectors were skipped! Generated ${connectors.length} of ${edges.length} edges`);
    }

    return {
        matchPositions,
        headerPositions,
        connectors,
        totalWidth: maxX + 50, // Add right padding
        totalHeight: maxY + 50, // Add bottom padding
    };
}


/**
 * Generates connector polylines between matches based on edges.
 *
 * @param edges All edges defining connections
 * @param positions Match positions with pixel coordinates
 * @returns Array of connector lines
 */
function generateConnectors(
    edges: BracketEdgeResponse[],
    positions: Map<string, MatchPosition>
): ConnectorLine[] {
    const connectors: ConnectorLine[] = [];

    edges.forEach((edge, index) => {
        const fromPos = positions.get(String(edge.fromMatchId ?? ''));
        const toPos = positions.get(String(edge.toMatchId ?? ''));

        if (!fromPos || !toPos) {
            console.warn('Skipping connector - missing position:', {
                edge,
                fromPos: !!fromPos,
                toPos: !!toPos,
            });
            return;
        }

        // Calculate anchor points at vertical center of matches
        const centerY = MATCH_HEIGHT / 2; // 30px for 60px height

        // Source point: right side of source match at vertical center
        const fromY = fromPos.yPx + centerY;
        const fromX = fromPos.xPx + 150; // Match width

        // Target point: left side of target match at vertical center
        const toY = toPos.yPx + centerY;
        const toX = toPos.xPx;

        // Generate Z-shaped connector
        const midX = (fromX + toX) / 2;

        const points: Point[] = [
            { x: fromX, y: fromY },
            { x: midX, y: fromY },
            { x: midX, y: toY },
            { x: toX, y: toY },
        ];

        connectors.push({
            id: `connector-${index}`,
            fromMatchId: String(edge.fromMatchId ?? ''),
            toMatchId: String(edge.toMatchId ?? ''),
            points,
        });
    });

    return connectors;
}
