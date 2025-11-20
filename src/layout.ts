import { Match } from 'brackets-model';
import { BracketEdgeResponse } from './dto/types';
import type { LayoutConfig } from './viewModels';
import type { MatchWithMetadata } from './types';

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
}

/**
 * Complete layout result.
 */
export interface BracketLayout {
    matchPositions: Map<string, MatchPosition>;
    headerPositions: RoundHeader[];
    connectors: ConnectorLine[];
    panelPositions?: SwissPanelPosition[]; // Swiss-specific: boxed panel positions
    totalWidth: number;
    totalHeight: number;
}

/**
 * Extracts bracket group from group_id.
 * Examples:
 * - "group-1-winners-bracket" -> "WINNERS_BRACKET"
 * - "group-1-losers-bracket" -> "LOSERS_BRACKET"
 * - "group-1-grand-final-bracket" -> "GRAND_FINAL_BRACKET"
 * - "group-1-placement-bracket" -> "PLACEMENT_BRACKET"
 * - "stage-1-third-place" -> "PLACEMENT_BRACKET"
 *
 * @param groupId The group_id from a match
 * @returns BracketGroup type
 */
function extractBracketGroup(groupId: string): BracketGroup {
    const normalized = groupId.toLowerCase();

    // Check placement/third-place matches first
    if (normalized.includes('placement') || normalized.includes('third') || normalized.includes('3rd')) 
        return 'PLACEMENT_BRACKET';
    
    // Check for losers bracket
    if (normalized.includes('loser')) 
        return 'LOSERS_BRACKET';
    
    // Check for grand finals (check 'grand-final' before 'final' to avoid ambiguity)
    if (normalized.includes('grand-final') || normalized.includes('final')) 
        return 'GRAND_FINAL_BRACKET';
    
    // Check for winners bracket explicitly
    if (normalized.includes('winner')) 
        return 'WINNERS_BRACKET';
    
    // Default to winners bracket (includes single elimination without group suffix)
    return 'WINNERS_BRACKET';
}

/**
 * Computes the complete layout for a bracket.
 *
 * @param matches All matches in the bracket
 * @param edges All edges defining connections between matches
 * @param bracketType Type of bracket (winner_bracket, loser_bracket, etc.)
 * @param layout Layout configuration parameters (column width, spacing, etc.)
 * @returns Complete layout with positions and connectors
 */
export function computeLayout(
    matches: Match[],
    edges: BracketEdgeResponse[],
    bracketType: string,
    layout: LayoutConfig,
): BracketLayout {
    // Destructure layout parameters for use throughout the function
    const {
        columnWidth: COLUMN_WIDTH,
        rowHeight: ROW_HEIGHT,
        matchHeight: MATCH_HEIGHT,
        topOffset: TOP_OFFSET,
        leftOffset: LEFT_OFFSET,
        groupGapX: GROUP_GAP_X,
        groupGapY: GROUP_GAP_Y,
    } = layout;

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
        if (!roundsByGroup.has(bracketGroup)) 
            roundsByGroup.set(bracketGroup, new Set());
        
        roundsByGroup.get(bracketGroup)!.add(roundNumber);

        // Track matches by group/round
        if (!matchesByGroupRound.has(bracketGroup)) 
            matchesByGroupRound.set(bracketGroup, new Map());
        
        const groupRounds = matchesByGroupRound.get(bracketGroup)!;
        if (!groupRounds.has(roundNumber)) 
            groupRounds.set(roundNumber, []);
        
        groupRounds.get(roundNumber)!.push(matchId);
    });

    // --- 2. Assign xRound columns per (group, round) with group separation ---
    const groupOffsetsX = new Map<BracketGroup, number>();
    let currentColumn = 0;

    // For 'finals-top' alignment, position Grand Finals to the right of Winners,
    // and Losers aligned with Winners start (X=0)
    const columnOrder: BracketGroup[] = layout.bracketAlignment === 'finals-top'
        ? ['WINNERS_BRACKET', 'GRAND_FINAL_BRACKET', 'LOSERS_BRACKET', 'PLACEMENT_BRACKET']
        : GROUP_ORDER;

    console.log(`📐 Column assignment (alignment: ${layout.bracketAlignment}):`);
    for (const group of columnOrder) {
        const rounds = roundsByGroup.get(group);
        if (!rounds || rounds.size === 0) continue;

        const sortedRounds = Array.from(rounds).sort((a, b) => a - b);

        // Special case: For 'finals-top', Losers starts with configurable offset
        if (layout.bracketAlignment === 'finals-top' && group === 'LOSERS_BRACKET') {
            const offset = layout.losersBracketOffsetX ?? 0; // Default to 0 for backward compatibility
            groupOffsetsX.set(group, offset);
            console.log(`  ${group}: ${sortedRounds.length} rounds → columns ${offset} to ${offset + sortedRounds.length - 1} (offset by ${offset} columns)`);
        } else {
            groupOffsetsX.set(group, currentColumn);
            console.log(`  ${group}: ${sortedRounds.length} rounds → columns ${currentColumn} to ${currentColumn + sortedRounds.length - 1}`);
            currentColumn += sortedRounds.length + GROUP_GAP_X; // Add gap between groups
        }
    }

    const matchPositions = new Map<string, MatchPosition>();
    let maxXRound = 0;

    // Use same column order for position assignment
    for (const group of columnOrder) {
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
            if (!inEdgesByToId.has(toId)) 
                inEdgesByToId.set(toId, []);
            
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
                    if (lane !== undefined) 
                        childLanes.push(lane);
                    
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
            if (!buckets.has(key)) 
                buckets.set(key, []);
            
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

                const aNum = ma.match.number ?? 0;
                const bNum = mb.match.number ?? 0;

                return ma.roundNumber - mb.roundNumber || aNum - bNum;
            });

            // Spread them around the original center
            const base = lf;
            const step = 0.25; // Small offset to keep them visually close
            const offsetStart = -((ids.length - 1) * step) / 2;

            ids.forEach((id, idx) => {
                laneFloatById.set(id, base + offsetStart + idx * step);
            });
        }

        if (collisionCount > 0) 
            console.log(`   ⚠️ Resolved ${collisionCount} lane collisions via tie-breaking`);
        

        // Normalize float lanes to sorted integer indices 0..N-1
        const uniqueFloats = Array.from(new Set(laneFloatById.values())).sort((a, b) => a - b);
        const floatToIndex = new Map<number, number>();
        uniqueFloats.forEach((val, idx) => floatToIndex.set(val, idx));

        const normalized = new Map<string, number>();
        for (const [matchId, lf] of laneFloatById.entries()) {
            const idx = floatToIndex.get(lf);
            if (idx !== undefined) 
                normalized.set(matchId, idx);
            
        }

        laneIndicesByGroup.set(group, normalized);
        laneCountByGroup.set(group, uniqueFloats.length || 1);

        console.log(`🎯 ${group}: ${laneFloatById.size} matches, ${uniqueFloats.length} unique lanes (${collisionCount} ties resolved)`);
    }

    // --- 4. Compute Y offsets per group and final pixel positions ---
    const groupOffsetY = new Map<BracketGroup, number>();
    const bracketAlignment = layout.bracketAlignment || 'bottom';

    // Calculate heights for each group first
    const groupHeights = new Map<BracketGroup, number>();
    let maxGroupHeight = 0;
    for (const group of GROUP_ORDER) {
        const lanesCount = laneCountByGroup.get(group);
        if (!lanesCount) continue;
        const height = lanesCount * ROW_HEIGHT;
        groupHeights.set(group, height);
        maxGroupHeight = Math.max(maxGroupHeight, height);
    }

    // Apply alignment strategy
    if (bracketAlignment === 'finals-top') {
        // Grand Finals at top with Winners, Losers below
        // This puts the most important matches at the top of the page
        let currentY = TOP_OFFSET;

        // Position Grand Finals and Winners side-by-side at top
        const winnersHeight = groupHeights.get('WINNERS_BRACKET') || 0;
        const finalsHeight = groupHeights.get('GRAND_FINAL_BRACKET') || 0;

        if (winnersHeight > 0) {
            groupOffsetY.set('WINNERS_BRACKET', currentY);
        }
        if (finalsHeight > 0) {
            // Position Grand Finals at same Y level as Winners (top aligned)
            groupOffsetY.set('GRAND_FINAL_BRACKET', currentY);
        }

        // Move Y down past the taller of Winners or Finals
        currentY += Math.max(winnersHeight, finalsHeight) + GROUP_GAP_Y;

        // Position Losers and Placement below
        const losersHeight = groupHeights.get('LOSERS_BRACKET') || 0;
        if (losersHeight > 0) {
            groupOffsetY.set('LOSERS_BRACKET', currentY);
            currentY += losersHeight + GROUP_GAP_Y;
        }

        const placementHeight = groupHeights.get('PLACEMENT_BRACKET') || 0;
        if (placementHeight > 0) {
            groupOffsetY.set('PLACEMENT_BRACKET', currentY);
        }

    } else if (bracketAlignment === 'top') {
        // Top-aligned: All brackets start from the same Y position (better for Finals visibility)
        let currentY = TOP_OFFSET;
        for (const group of GROUP_ORDER) {
            const height = groupHeights.get(group);
            if (!height) continue;
            groupOffsetY.set(group, currentY);
            currentY += height + GROUP_GAP_Y;
        }
    } else if (bracketAlignment === 'center') {
        // Center-aligned: Center each bracket group within the maximum height
        let currentY = TOP_OFFSET;
        for (const group of GROUP_ORDER) {
            const height = groupHeights.get(group);
            if (!height) continue;
            const centerOffset = (maxGroupHeight - height) / 2;
            groupOffsetY.set(group, currentY + centerOffset);
            currentY += maxGroupHeight + GROUP_GAP_Y;
        }
    } else {
        // Bottom-aligned (default): Stack brackets naturally with gaps
        let currentY = TOP_OFFSET;
        for (const group of GROUP_ORDER) {
            const height = groupHeights.get(group);
            if (!height) continue;
            groupOffsetY.set(group, currentY);
            currentY += height + GROUP_GAP_Y;
        }
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

        maxX = Math.max(maxX, xPx + layout.matchWidth);
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
    const connectors = generateConnectors(edges, matchPositions, matchesById, MATCH_HEIGHT, layout.matchWidth);

    console.log(`🔗 Generated ${connectors.length} connectors from ${edges.length} edges`);
    if (connectors.length > 0 && connectors.length < edges.length) 
        console.warn(`⚠️ Some connectors were skipped! Generated ${connectors.length} of ${edges.length} edges`);
    

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
 * @param matchesById Map of match IDs to match nodes with bracket group info
 * @param matchHeight Height of match elements for calculating connector anchor points
 * @param matchWidth Width of match elements for calculating connector anchor points
 * @returns Array of connector lines
 */
function generateConnectors(
    edges: BracketEdgeResponse[],
    positions: Map<string, MatchPosition>,
    matchesById: Map<string, { match: Match; bracketGroup: BracketGroup; roundNumber: number }>,
    matchHeight: number,
    matchWidth: number,
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

        // Classify connector type based on bracket groups
        const fromNode = matchesById.get(String(edge.fromMatchId ?? ''));
        const toNode = matchesById.get(String(edge.toMatchId ?? ''));

        let connectorType: ConnectorType = 'internal';

        if (fromNode && toNode) {
            if (fromNode.bracketGroup !== toNode.bracketGroup) {
                // Cross-bracket connection
                if (toNode.bracketGroup === 'GRAND_FINAL_BRACKET') {
                    connectorType = 'grand-final';
                } else {
                    connectorType = 'cross-bracket';
                }
            }
        }

        // Calculate anchor points at vertical center of matches
        const centerY = matchHeight / 2; // e.g. 30px for 60px height

        // Source point: right side of source match at vertical center
        const fromY = fromPos.yPx + centerY;
        const fromX = fromPos.xPx + matchWidth;

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
            connectorType,
        });
    });

    return connectors;
}

/**
 * Swiss record bucket identifier (wins-losses)
 */
interface SwissRecordBucket {
    wins: number;
    losses: number;
    key: string; // e.g., "0-0", "1-0", "2-1"
}

/**
 * Bucket header for Swiss layout (legacy, kept for compatibility)
 */
export interface SwissBucketHeader {
    record: string;
    xPx: number;
    yPx: number;
}

/**
 * Computes layout for a Swiss tournament with record-based column buckets.
 *
 * Swiss tournaments group matches by win-loss records:
 * - Column 0: 0-0 (Round 1)
 * - Columns 1-2: 1-0 and 0-1 (Round 2)
 * - Columns 3-5: 2-0, 1-1, 0-2 (Round 3)
 * - etc.
 *
 * @param matches All matches in the Swiss tournament with swissWins/swissLosses metadata
 * @param layout Layout configuration parameters
 * @returns Complete layout with positions, bucket headers, and connectors
 */
export function computeSwissLayout(
    matches: MatchWithMetadata[],
    layout: LayoutConfig,
): BracketLayout {
    const {
        columnWidth: COLUMN_WIDTH,
        rowHeight: ROW_HEIGHT,
        matchHeight: MATCH_HEIGHT,
        topOffset: TOP_OFFSET,
        leftOffset: LEFT_OFFSET,
    } = layout;

    console.log(`🎯 computeSwissLayout: ${matches.length} matches`);

    if (matches.length === 0) {
        return {
            matchPositions: new Map(),
            headerPositions: [],
            connectors: [],
            totalWidth: 0,
            totalHeight: 0,
        };
    }

    // Step 1: Infer Swiss records from round numbers
    // For matches without explicit swissWins/swissLosses, infer from round structure
    const matchesWithRecords = matches.map(match => {
        const roundNumber = match.metadata.roundNumber ?? 1;

        // For now, we'll create a simple inference:
        // Round 1 → all matches are 0-0
        // Round 2 → matches are split between 1-0 and 0-1 (we'll distribute evenly)
        // Round 3 → 2-0, 1-1, 0-2, etc.

        // If explicit metadata exists, use it
        if (match.metadata.swissWins !== undefined && match.metadata.swissLosses !== undefined) {
            return {
                match,
                wins: match.metadata.swissWins,
                losses: match.metadata.swissLosses,
            };
        }

        // Otherwise, infer from round (simplified approach)
        // This is a fallback for data without explicit records
        if (roundNumber === 1) {
            return { match, wins: 0, losses: 0 };
        }

        // For subsequent rounds, distribute matches across possible records
        // This is a placeholder - real Swiss data should have explicit records
        const totalGames = roundNumber - 1;
        const matchIndex = match.number ?? 0;
        const matchesInRound = matches.filter(m => (m.metadata.roundNumber ?? 1) === roundNumber).length;

        // Simple distribution: split matches evenly across possible records
        // For round 2 (totalGames=1): half 1-0, half 0-1
        // For round 3 (totalGames=2): 2-0, 1-1, 0-2
        const bucketsCount = totalGames + 1;
        const bucketSize = Math.ceil(matchesInRound / bucketsCount);
        const bucketIndex = Math.floor(matchIndex / bucketSize);
        const wins = Math.max(0, Math.min(totalGames - bucketIndex, totalGames));
        const losses = totalGames - wins;

        return { match, wins, losses };
    });

    // Step 2: Group matches by record buckets
    const bucketMap = new Map<string, MatchWithMetadata[]>();

    matchesWithRecords.forEach(({ match, wins, losses }) => {
        const key = `${wins}-${losses}`;
        if (!bucketMap.has(key)) {
            bucketMap.set(key, []);
        }
        bucketMap.get(key)!.push(match);

        // Store the computed record back into metadata for later use
        match.metadata.swissWins = wins;
        match.metadata.swissLosses = losses;
    });

    console.log(`📊 Swiss buckets: ${Array.from(bucketMap.keys()).join(', ')}`);

    // Step 3: Order buckets in Swiss progression
    // Primary sort: by total games (wins + losses)
    // Secondary sort: by wins (descending) within same total
    const sortedBuckets: SwissRecordBucket[] = Array.from(bucketMap.entries())
        .map(([key, matches]) => {
            const [wins, losses] = key.split('-').map(Number);
            return { wins, losses, key };
        })
        .sort((a, b) => {
            const totalA = a.wins + a.losses;
            const totalB = b.wins + b.losses;
            if (totalA !== totalB) return totalA - totalB;
            // Within same round, sort by wins descending (2-0 before 1-1 before 0-2)
            return b.wins - a.wins;
        });

    console.log(`📐 Bucket order: ${sortedBuckets.map(b => b.key).join(' → ')}`);

    // Step 4: Assign column positions and compute match positions
    const matchPositions = new Map<string, MatchPosition>();
    const panelPositions: SwissPanelPosition[] = [];
    let maxY = 0;

    sortedBuckets.forEach((bucket, columnIndex) => {
        const bucketMatches = bucketMap.get(bucket.key) ?? [];

        // Sort matches within bucket by match number for deterministic ordering
        bucketMatches.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

        // Extract date/bestOf from first match in bucket (all matches in same bucket share same round)
        const firstMatch = bucketMatches[0];
        const roundDate = firstMatch?.metadata?.roundDate;
        const roundBestOf = firstMatch?.metadata?.roundBestOf;

        // Position each match in this column
        let panelHeight = 0;
        bucketMatches.forEach((match, laneIndex) => {
            const xPx = LEFT_OFFSET + columnIndex * COLUMN_WIDTH;
            const yPx = TOP_OFFSET + laneIndex * ROW_HEIGHT;

            matchPositions.set(String(match.id), {
                xRound: columnIndex,
                yLane: laneIndex,
                xPx,
                yPx,
            });

            maxY = Math.max(maxY, yPx + MATCH_HEIGHT);
            panelHeight = (laneIndex + 1) * ROW_HEIGHT;
        });

        // Create panel position with metadata for boxed rendering
        panelPositions.push({
            key: bucket.key,
            record: bucket.key,
            roundNumber: bucket.wins + bucket.losses + 1, // Infer round from total games
            date: roundDate,
            bestOf: roundBestOf,
            xPx: LEFT_OFFSET + columnIndex * COLUMN_WIDTH,
            yPx: TOP_OFFSET - 60, // Position header above matches (increased from 40 for panel header)
            width: COLUMN_WIDTH,
            height: panelHeight + 60, // Panel height = matches + header space
            matchCount: bucketMatches.length,
        });
    });

    const totalWidth = LEFT_OFFSET + sortedBuckets.length * COLUMN_WIDTH + layout.matchWidth;
    const totalHeight = maxY + 50; // Add bottom padding

    console.log(`✅ Swiss layout: ${sortedBuckets.length} panels, ${matchPositions.size} matches (NO connectors)`);

    return {
        matchPositions,
        headerPositions: panelPositions.map((panel, idx) => ({
            roundNumber: panel.roundNumber ?? idx + 1,
            roundName: panel.record,
            columnIndex: idx,
            xPx: panel.xPx,
            yPx: panel.yPx + 20, // Position header text within panel
        })),
        panelPositions, // NEW: Return panel positions for boxed rendering
        connectors: [], // Swiss no longer uses connectors
        totalWidth,
        totalHeight,
    };
}

// generateSwissConnectors function removed - Swiss now uses boxed panels without connectors
