import { Match } from 'brackets-model';
import { BracketEdgeResponse } from './dto/types';
import type { LayoutConfig } from './viewModels';
import type { MatchWithMetadata, SwissZone } from './types';
import type { DoubleElimLayoutProfile } from './profiles/deProfiles';

/**
 * Bracket group types in display order
 */
type BracketGroup = 'WINNERS_BRACKET' | 'LOSERS_BRACKET' | 'GRAND_FINAL_BRACKET' | 'PLACEMENT_BRACKET';

const GROUP_ORDER: BracketGroup[] = [
    'WINNERS_BRACKET',
    'LOSERS_BRACKET',
    'GRAND_FINAL_BRACKET',
    // PLACEMENT_BRACKET is positioned separately after other brackets to ensure correct ordering
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

    // Check for losers/lower bracket (handle both "loser" and "lower" terminology)
    if (normalized.includes('loser') || normalized.includes('lower'))
        return 'LOSERS_BRACKET';

    // Check for grand finals (check 'grand-final' or 'grand final' before 'final' to avoid ambiguity)
    if (normalized.includes('grand-final') || normalized.includes('grand') ||
        (normalized.includes('grand') && normalized.includes('final')))
        return 'GRAND_FINAL_BRACKET';

    // Check for finals bracket (but only if not already caught by grand finals)
    if (normalized.includes('final'))
        return 'GRAND_FINAL_BRACKET';

    // Check for winners/upper bracket (handle both "winner" and "upper" terminology)
    if (normalized.includes('winner') || normalized.includes('upper'))
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
 * @param deProfile Optional DE layout profile for per-format column mappings (unified DE only)
 * @returns Complete layout with positions and connectors
 */
export function computeLayout(
    matches: Match[],
    edges: BracketEdgeResponse[],
    bracketType: string,
    layout: LayoutConfig,
    deProfile?: DoubleElimLayoutProfile,
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

    // Check if we should use profile-based column mapping (unified DE only)
    const useProfile = deProfile
        && Object.keys(deProfile.winnersRoundColumns).length > 0
        && Object.keys(deProfile.losersRoundColumns).length > 0;

    console.log(`📐 Column assignment (${useProfile ? `profile: ${deProfile?.id}` : `alignment: ${layout.bracketAlignment}`}):`);

    // For 'finals-top' alignment, use old behavior (for backward compatibility)
    if (layout.bracketAlignment === 'finals-top') {
        const columnOrder: BracketGroup[] = ['WINNERS_BRACKET', 'GRAND_FINAL_BRACKET', 'LOSERS_BRACKET', 'PLACEMENT_BRACKET'];

        for (const group of columnOrder) {
            const rounds = roundsByGroup.get(group);
            if (!rounds || rounds.size === 0) continue;

            const sortedRounds = Array.from(rounds).sort((a, b) => a - b);

            // Special case: For 'finals-top', Losers starts with configurable offset
            if (group === 'LOSERS_BRACKET') {
                const offset = layout.losersBracketOffsetX ?? 0;
                groupOffsetsX.set(group, offset);
                console.log(`  ${group}: ${sortedRounds.length} rounds → columns ${offset} to ${offset + sortedRounds.length - 1} (offset by ${offset} columns)`);
            } else {
                groupOffsetsX.set(group, currentColumn);
                console.log(`  ${group}: ${sortedRounds.length} rounds → columns ${currentColumn} to ${currentColumn + sortedRounds.length - 1}`);
                currentColumn += sortedRounds.length + GROUP_GAP_X;
            }
        }
    } else {
        // Standard alignment: Winners and Losers both start at column 0,
        // Grand Finals positioned after both brackets complete (right-convergence)

        // First, calculate column counts for Winners and Losers
        const winnersRounds = roundsByGroup.get('WINNERS_BRACKET');
        const losersRounds = roundsByGroup.get('LOSERS_BRACKET');
        const winnersColumns = winnersRounds ? winnersRounds.size : 0;
        const losersColumns = losersRounds ? losersRounds.size : 0;

        // Both brackets start at column 0
        if (winnersColumns > 0) {
            groupOffsetsX.set('WINNERS_BRACKET', 0);
            console.log(`  WINNERS_BRACKET: ${winnersColumns} rounds → columns 0 to ${winnersColumns - 1}`);
        }

        if (losersColumns > 0) {
            // Apply losersBracketOffsetX ONLY for split-horizontal alignment
            const offset = (layout.bracketAlignment === 'split-horizontal' && layout.losersBracketOffsetX)
                ? layout.losersBracketOffsetX
                : 0;
            groupOffsetsX.set('LOSERS_BRACKET', offset);
            console.log(`  LOSERS_BRACKET: ${losersColumns} rounds → columns ${offset} to ${offset + losersColumns - 1}${offset > 0 ? ` (offset by ${offset})` : ''}`);
        }

        // Grand Finals appears after both brackets complete
        // Calculate the rightmost column occupied by either bracket (accounting for offsets)
        const losersOffset = (layout.bracketAlignment === 'split-horizontal' && layout.losersBracketOffsetX)
            ? layout.losersBracketOffsetX
            : 0;
        const winnersEndColumn = winnersColumns > 0 ? (0 + winnersColumns - 1) : -1;
        const losersEndColumn = losersColumns > 0 ? (losersOffset + losersColumns - 1) : -1;
        const maxBracketEndColumn = Math.max(winnersEndColumn, losersEndColumn);
        const finalsColumn = maxBracketEndColumn + 1 + GROUP_GAP_X;

        const finalsRounds = roundsByGroup.get('GRAND_FINAL_BRACKET');
        if (finalsRounds && finalsRounds.size > 0) {
            groupOffsetsX.set('GRAND_FINAL_BRACKET', finalsColumn);
            console.log(`  GRAND_FINAL_BRACKET: ${finalsRounds.size} rounds → columns ${finalsColumn} to ${finalsColumn + finalsRounds.size - 1} (right-convergence)`);
        }

        // Placement bracket positioning (3rd/4th place match)
        // Position below the finals in the same column
        const placementRounds = roundsByGroup.get('PLACEMENT_BRACKET');
        if (placementRounds && placementRounds.size > 0) {
            let placementColumn: number;

            // Check if we have a separate Grand Finals bracket (Double Elimination)
            const hasGrandFinals = finalsRounds && finalsRounds.size > 0;

            if (hasGrandFinals) {
                // Double Elimination: align with Grand Finals column (same column, below it)
                placementColumn = finalsColumn;
                console.log(`  PLACEMENT_BRACKET: ${placementRounds.size} rounds → columns ${placementColumn} to ${placementColumn + placementRounds.size - 1} (aligned with Grand Finals - DE)`);
            } else {
                // Single Elimination: align with Finals column (same column, below it)
                placementColumn = winnersColumns > 0 ? winnersColumns - 1 : 0;
                console.log(`  PLACEMENT_BRACKET: ${placementRounds.size} rounds → columns ${placementColumn} to ${placementColumn + placementRounds.size - 1} (aligned with Finals - SE)`);
            }

            groupOffsetsX.set('PLACEMENT_BRACKET', placementColumn);
        }
    }

    const matchPositions = new Map<string, MatchPosition>();
    let maxXRound = 0;

    // Assign positions for all groups based on calculated offsets or profile
    for (const group of GROUP_ORDER) {
        const groupRounds = matchesByGroupRound.get(group);
        if (!groupRounds) continue;

        const sortedRounds = Array.from(groupRounds.keys()).sort((a, b) => a - b);

        sortedRounds.forEach((roundNumber, roundIdx) => {
            let col: number;

            // Use profile-based column mapping if available
            if (useProfile && deProfile) {
                if (group === 'WINNERS_BRACKET') {
                    col = deProfile.winnersRoundColumns[roundNumber];
                } else if (group === 'LOSERS_BRACKET') {
                    col = deProfile.losersRoundColumns[roundNumber];
                } else if (group === 'GRAND_FINAL_BRACKET') {
                    col = deProfile.finalsColumns[roundNumber];
                } else {
                    // Fallback for PLACEMENT_BRACKET or other groups
                    const baseCol = groupOffsetsX.get(group);
                    col = baseCol !== undefined ? baseCol + roundIdx : roundIdx;
                }

                // Check if profile provided a valid column
                if (col === undefined) {
                    console.warn(`⚠️ Profile ${deProfile.id} missing column for ${group} round ${roundNumber}, using fallback`);
                    const baseCol = groupOffsetsX.get(group);
                    col = baseCol !== undefined ? baseCol + roundIdx : roundIdx;
                }
            } else {
                // Use block-based offset logic
                const baseCol = groupOffsetsX.get(group);
                if (baseCol === undefined) return; // Skip groups without position
                col = baseCol + roundIdx;
            }

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

    // Process PLACEMENT_BRACKET separately (after main brackets)
    const placementGroupRounds = matchesByGroupRound.get('PLACEMENT_BRACKET');
    if (placementGroupRounds) {
        const sortedRounds = Array.from(placementGroupRounds.keys()).sort((a, b) => a - b);

        sortedRounds.forEach((roundNumber, roundIdx) => {
            const baseCol = groupOffsetsX.get('PLACEMENT_BRACKET');
            if (baseCol === undefined) return; // Skip if no position assigned

            const col = baseCol + roundIdx;
            const idsInRound = placementGroupRounds.get(roundNumber) ?? [];

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
        // Also build outbound edges to know where matches feed into
        const outEdgesByFromId = new Map<string, BracketEdgeResponse[]>();
        for (const edge of edges) {
            const toNode = matchesById.get(String(edge.toMatchId ?? ''));
            const fromNode = matchesById.get(String(edge.fromMatchId ?? ''));
            if (!toNode || !fromNode) continue;

            // Only consider internal edges (same bracketGroup)
            if (fromNode.bracketGroup !== group || toNode.bracketGroup !== group) continue;

            const toId = String(edge.toMatchId ?? '');
            const fromId = String(edge.fromMatchId ?? '');
            if (!inEdgesByToId.has(toId))
                inEdgesByToId.set(toId, []);
            if (!outEdgesByFromId.has(fromId))
                outEdgesByFromId.set(fromId, []);

            inEdgesByToId.get(toId)!.push(edge);
            outEdgesByFromId.get(fromId)!.push(edge);
        }

        // Process rounds in order
        const sortedRounds = Array.from(groupRounds.keys()).sort((a, b) => a - b);

        // For LOSERS_BRACKET: use convergence-aware lane assignment
        // Only create step-downs when 2+ matches converge into 1
        // Matches with single input stay on the same lane (horizontal connection)
        if (group === 'LOSERS_BRACKET') {
            // Process all rounds forward, assigning lanes
            let currentLane = 0;
            for (const roundNumber of sortedRounds) {
                const idsInRound = groupRounds.get(roundNumber) ?? [];
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

                    if (childLanes.length >= 2) {
                        // CONVERGENCE: center between children
                        const avgLane = childLanes.reduce((sum, lane) => sum + lane, 0) / childLanes.length;
                        laneFloatById.set(matchId, avgLane);
                    } else if (childLanes.length === 1) {
                        // Single internal child: SAME lane (horizontal connection)
                        laneFloatById.set(matchId, childLanes[0]);
                    } else {
                        // No internal children: assign sequential lane
                        laneFloatById.set(matchId, currentLane);
                        currentLane++;
                    }
                }
            }
            nextLane = currentLane;
        } else {
            // Original algorithm for other brackets (WINNERS, GRAND_FINAL, etc.)
            for (const roundNumber of sortedRounds) {
                const idsInRound = groupRounds.get(roundNumber) ?? [];

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
                        const avgLane = childLanes.reduce((sum, lane) => sum + lane, 0) / childLanes.length;
                        laneFloatById.set(matchId, avgLane);
                    } else {
                        laneFloatById.set(matchId, nextLane);
                        nextLane += 1;
                    }
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
        

        // For LOSERS_BRACKET: use float lanes but ensure minimum spacing to prevent overlap
        // For other brackets: normalize to integer indices
        if (group === 'LOSERS_BRACKET') {
            // Get unique lanes sorted
            const uniqueLanes = [...new Set(laneFloatById.values())].sort((a, b) => a - b);

            // Remap lanes to ensure minimum gap between adjacent unique lanes
            // Min gap 0.5 = 56px with 112px row height (compact like reference)
            const MIN_LANE_GAP = 0.5;
            const laneRemap = new Map<number, number>();
            let currentLane = 0;

            for (let i = 0; i < uniqueLanes.length; i++) {
                laneRemap.set(uniqueLanes[i], currentLane);
                if (i < uniqueLanes.length - 1) {
                    const originalGap = uniqueLanes[i + 1] - uniqueLanes[i];
                    // Preserve larger gaps (natural grouping), enforce minimum for smaller
                    currentLane += Math.max(originalGap, MIN_LANE_GAP);
                }
            }

            // Apply remapping
            const normalized = new Map<string, number>();
            for (const [matchId, lf] of laneFloatById.entries()) {
                normalized.set(matchId, laneRemap.get(lf) ?? lf);
            }

            laneIndicesByGroup.set(group, normalized);
            const maxRemappedLane = Math.max(...normalized.values());
            laneCountByGroup.set(group, Math.ceil(maxRemappedLane) + 1);

            console.log(`🎯 ${group}: ${laneFloatById.size} matches, ${uniqueLanes.length} unique lanes → remapped max=${maxRemappedLane.toFixed(2)} (${collisionCount} ties resolved)`);
        } else {
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
    }

    // Process PLACEMENT_BRACKET lanes separately
    if (placementGroupRounds) {
        const laneFloatById = new Map<string, number>();
        let nextLane = 0;

        // Simple lane assignment for placement bracket (typically just 1 match)
        const sortedRounds = Array.from(placementGroupRounds.keys()).sort((a, b) => a - b);
        sortedRounds.forEach((roundNumber) => {
            const idsInRound = placementGroupRounds.get(roundNumber) ?? [];
            for (const id of idsInRound) {
                laneFloatById.set(id, nextLane++);
            }
        });

        // Normalize to indices
        const uniqueFloats = Array.from(new Set(laneFloatById.values())).sort((a, b) => a - b);
        const floatToIdx = new Map(uniqueFloats.map((f, i) => [f, i]));
        const normalized = new Map<string, number>();
        for (const [id, lf] of laneFloatById.entries()) {
            normalized.set(id, floatToIdx.get(lf) ?? 0);
        }

        laneIndicesByGroup.set('PLACEMENT_BRACKET', normalized);
        laneCountByGroup.set('PLACEMENT_BRACKET', uniqueFloats.length || 1);

        console.log(`🎯 PLACEMENT_BRACKET: ${laneFloatById.size} matches, ${uniqueFloats.length} unique lanes`);
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

        // Use bracket-specific row heights in split-horizontal mode
        let effectiveRowHeight = ROW_HEIGHT;
        if (bracketAlignment === 'split-horizontal') {
            if (group === 'LOSERS_BRACKET' && layout.lowerBracketRowHeight) {
                effectiveRowHeight = layout.lowerBracketRowHeight;
            } else if (group === 'WINNERS_BRACKET' && layout.upperBracketRowHeight) {
                effectiveRowHeight = layout.upperBracketRowHeight;
            }
        }

        const height = lanesCount * effectiveRowHeight;
        groupHeights.set(group, height);
        maxGroupHeight = Math.max(maxGroupHeight, height);
    }

    // Calculate PLACEMENT_BRACKET height separately
    const placementLanesCount = laneCountByGroup.get('PLACEMENT_BRACKET');
    if (placementLanesCount) {
        const placementHeight = placementLanesCount * ROW_HEIGHT;
        groupHeights.set('PLACEMENT_BRACKET', placementHeight);
        // Don't update maxGroupHeight as placement is positioned separately
    }

    // Apply alignment strategy
    if (bracketAlignment === 'finals-top') {
        // Grand Finals at top with Winners, Losers below
        // This puts the most important matches at the top of the page
        let currentY = TOP_OFFSET;

        // Position Grand Finals and Winners side-by-side at top
        const winnersHeight = groupHeights.get('WINNERS_BRACKET') || 0;
        const finalsHeight = groupHeights.get('GRAND_FINAL_BRACKET') || 0;
        const placementHeight = groupHeights.get('PLACEMENT_BRACKET') || 0;

        if (winnersHeight > 0) {
            groupOffsetY.set('WINNERS_BRACKET', currentY);
        }
        if (finalsHeight > 0) {
            // Position Grand Finals at same Y level as Winners (top aligned)
            groupOffsetY.set('GRAND_FINAL_BRACKET', currentY);
        }

        // Position Placement bracket directly below Grand Finals (championship matches grouped)
        if (placementHeight > 0 && finalsHeight > 0) {
            const placementY = currentY + finalsHeight + (GROUP_GAP_Y * 0.5);
            groupOffsetY.set('PLACEMENT_BRACKET', placementY);
        }

        // Move Y down past the tallest of Winners, Finals, or Finals+Placement stack
        const finalsAndPlacementHeight = finalsHeight + (placementHeight > 0 ? (GROUP_GAP_Y * 0.5) + placementHeight : 0);
        currentY += Math.max(winnersHeight, finalsAndPlacementHeight) + GROUP_GAP_Y;

        // Position Losers below
        const losersHeight = groupHeights.get('LOSERS_BRACKET') || 0;
        if (losersHeight > 0) {
            groupOffsetY.set('LOSERS_BRACKET', currentY);
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

        // Position PLACEMENT_BRACKET below GRAND_FINAL_BRACKET (processed separately)
        const placementHeight = groupHeights.get('PLACEMENT_BRACKET');
        if (placementHeight) {
            const finalsY = groupOffsetY.get('GRAND_FINAL_BRACKET');
            const finalsHeight = groupHeights.get('GRAND_FINAL_BRACKET') || 0;
            if (finalsY !== undefined && finalsHeight > 0) {
                groupOffsetY.set('PLACEMENT_BRACKET', finalsY + finalsHeight + (GROUP_GAP_Y * 0.5));
            } else {
                // Fallback: position at end if no finals
                groupOffsetY.set('PLACEMENT_BRACKET', currentY);
            }
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

        // Position PLACEMENT_BRACKET below GRAND_FINAL_BRACKET (processed separately)
        const placementHeight = groupHeights.get('PLACEMENT_BRACKET');
        if (placementHeight) {
            const finalsY = groupOffsetY.get('GRAND_FINAL_BRACKET');
            const finalsHeight = groupHeights.get('GRAND_FINAL_BRACKET') || 0;
            if (finalsY !== undefined && finalsHeight > 0) {
                groupOffsetY.set('PLACEMENT_BRACKET', finalsY + finalsHeight + (GROUP_GAP_Y * 0.5));
            } else {
                // Fallback: position at end if no finals
                const centerOffset = (maxGroupHeight - placementHeight) / 2;
                groupOffsetY.set('PLACEMENT_BRACKET', currentY + centerOffset);
            }
        }
    } else if (bracketAlignment === 'split-horizontal') {
        // Split horizontal: Upper bracket top, Lower bracket below, Finals to the right (VCT/industry standard)
        // This is the classic double elimination layout seen in major esports broadcasts
        const winnersHeight = groupHeights.get('WINNERS_BRACKET') || 0;
        const losersHeight = groupHeights.get('LOSERS_BRACKET') || 0;
        const finalsHeight = groupHeights.get('GRAND_FINAL_BRACKET') || 0;
        const placementHeight = groupHeights.get('PLACEMENT_BRACKET') || 0;

        // Position Winners at top-left
        if (winnersHeight > 0) {
            groupOffsetY.set('WINNERS_BRACKET', TOP_OFFSET);
        }

        // Position Losers below Winners with gap
        if (losersHeight > 0) {
            const losersY = TOP_OFFSET + winnersHeight + GROUP_GAP_Y;
            groupOffsetY.set('LOSERS_BRACKET', losersY);
        }

        // Position Grand Finals vertically centered between Winners and Losers
        // Grand Finals will be positioned to the right via X offset (handled in column assignment)
        if (finalsHeight > 0 && winnersHeight > 0 && losersHeight > 0) {
            const totalHeight = winnersHeight + GROUP_GAP_Y + losersHeight;
            const finalsY = TOP_OFFSET + (totalHeight - finalsHeight) / 2;
            groupOffsetY.set('GRAND_FINAL_BRACKET', finalsY);

            // Position Placement bracket directly below Grand Finals (championship matches grouped)
            if (placementHeight > 0) {
                const placementY = finalsY + finalsHeight + (GROUP_GAP_Y * 0.5);
                groupOffsetY.set('PLACEMENT_BRACKET', placementY);
            }
        } else if (finalsHeight > 0) {
            // Fallback: center vertically if only one bracket exists
            groupOffsetY.set('GRAND_FINAL_BRACKET', TOP_OFFSET);

            // Position Placement below if exists
            if (placementHeight > 0) {
                const placementY = TOP_OFFSET + finalsHeight + (GROUP_GAP_Y * 0.5);
                groupOffsetY.set('PLACEMENT_BRACKET', placementY);
            }
        }
    } else {
        // Bottom-aligned (default): Stack brackets naturally with gaps
        // Grand Finals positioned vertically centered between Winners and Losers for better visibility
        let currentY = TOP_OFFSET;

        const winnersHeight = groupHeights.get('WINNERS_BRACKET') || 0;
        const losersHeight = groupHeights.get('LOSERS_BRACKET') || 0;
        const finalsHeight = groupHeights.get('GRAND_FINAL_BRACKET') || 0;
        const placementHeight = groupHeights.get('PLACEMENT_BRACKET') || 0;

        // Position Winners at top
        if (winnersHeight > 0) {
            groupOffsetY.set('WINNERS_BRACKET', currentY);
            currentY += winnersHeight + GROUP_GAP_Y;
        }

        // Store position where Losers will start
        const losersStartY = currentY;

        // Position Losers below Winners
        if (losersHeight > 0) {
            groupOffsetY.set('LOSERS_BRACKET', currentY);
            currentY += losersHeight + GROUP_GAP_Y;
        }

        // Position Grand Finals vertically centered between Winners and Losers
        if (finalsHeight > 0 && winnersHeight > 0 && losersHeight > 0) {
            const winnersBottom = TOP_OFFSET + winnersHeight;
            const finalsY = (winnersBottom + losersStartY) / 2 - finalsHeight / 2;
            groupOffsetY.set('GRAND_FINAL_BRACKET', finalsY);

            // Position Placement bracket directly below Grand Finals (championship matches grouped)
            if (placementHeight > 0) {
                const placementY = finalsY + finalsHeight + (GROUP_GAP_Y * 0.5);
                groupOffsetY.set('PLACEMENT_BRACKET', placementY);
            }
        } else if (finalsHeight > 0) {
            // Fallback: position after other brackets
            groupOffsetY.set('GRAND_FINAL_BRACKET', currentY);

            // Position Placement below if exists
            if (placementHeight > 0) {
                const placementY = currentY + finalsHeight + (GROUP_GAP_Y * 0.5);
                groupOffsetY.set('PLACEMENT_BRACKET', placementY);
            }
        } else {
            // Fallback for no Grand Finals (e.g., Single Elimination)
            // Position PLACEMENT_BRACKET after Winners/Losers brackets
            if (placementHeight > 0) {
                groupOffsetY.set('PLACEMENT_BRACKET', currentY);
                console.log(`📍 PLACEMENT_BRACKET positioned at Y=${currentY} (no Grand Finals bracket)`);
            }
        }
    }

    // Fill in xPx, yPx, and lane on matchPositions
    let maxX = 0;
    let maxY = 0;

    for (const [id, pos] of matchPositions.entries()) {
        const node = matchesById.get(id);
        if (!node) continue;

        const group = node.bracketGroup;
        let laneIdx = laneIndicesByGroup.get(group)?.get(id) ?? 0;

        // For LOSERS_BRACKET: invert lanes so bracket works UPWARD
        // R1 matches go to bottom, later rounds trend toward top
        if (group === 'LOSERS_BRACKET') {
            const losersLanes = laneIndicesByGroup.get('LOSERS_BRACKET');
            if (losersLanes && losersLanes.size > 0) {
                const maxLane = Math.max(...losersLanes.values());
                laneIdx = maxLane - laneIdx;
            }
        }

        // Use bracket-specific row heights in split-horizontal mode
        let effectiveRowHeight = ROW_HEIGHT;
        if (bracketAlignment === 'split-horizontal') {
            if (group === 'LOSERS_BRACKET' && layout.lowerBracketRowHeight) {
                effectiveRowHeight = layout.lowerBracketRowHeight;
            } else if (group === 'WINNERS_BRACKET' && layout.upperBracketRowHeight) {
                effectiveRowHeight = layout.upperBracketRowHeight;
            }
        }

        const xPx = LEFT_OFFSET + pos.xRound * COLUMN_WIDTH;
        const yPx = (groupOffsetY.get(group) ?? TOP_OFFSET) + laneIdx * effectiveRowHeight;

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
        groupOffsetY, // Y offsets for bracket groups (for section titles)
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
 * Auto-detects max wins and losses from match data
 * Scans all matches to find the highest swissWins and swissLosses values
 */
function detectMaxWinsLosses(matches: MatchWithMetadata[]): { maxWins: number; maxLosses: number } {
    let maxWins = 0;
    let maxLosses = 0;

    for (const match of matches) {
        const wins = match.metadata.swissWins ?? 0;
        const losses = match.metadata.swissLosses ?? 0;
        maxWins = Math.max(maxWins, wins);
        maxLosses = Math.max(maxLosses, losses);
    }

    // Default to 3-0 advancing and 0-3 elimination if no data found
    return {
        maxWins: maxWins || 3,
        maxLosses: maxLosses || 3,
    };
}

/**
 * Classifies a Swiss record into a zone for visual hierarchy
 */
function classifyZone(wins: number, losses: number, maxWins: number, maxLosses: number): SwissZone {
    if (wins >= maxWins) return 'advancing';
    if (losses >= maxLosses) return 'eliminated';
    return 'neutral';
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
    // Use Swiss-specific config if provided, otherwise fall back to generic layout values
    const swissConfig = layout.swissConfig;

    // Extract configuration values (Swiss config takes precedence)
    const ROW_HEIGHT = swissConfig?.rowHeight ?? layout.rowHeight;
    const COLUMN_WIDTH = swissConfig?.columnWidth ?? layout.columnWidth;
    const COLUMN_GAP_X = swissConfig?.columnGapX ?? 24; // Fixed gap between columns (was double-counting)
    const PANEL_HEADER_HEIGHT = swissConfig?.panelHeaderHeight ?? 40; // Reduced from 60 (simplified header)
    const PANEL_PADDING = swissConfig?.panelPadding ?? 14; // Reduced from 20
    const PANEL_INNER_GAP = swissConfig?.panelInnerGap ?? 14; // Match CSS gap
    const LAYER_GAP_FACTOR = swissConfig?.layerGapFactor ?? 1.2; // Reduced from 1.5
    const MIN_LAYER_GAP_PX = swissConfig?.minLayerGapPx ?? (layout.swissLayerStepY ?? ROW_HEIGHT * 1.2);
    const COLUMN_MODE = swissConfig?.columnMode ?? 'layer-based';
    const LAYER_GAP_COLUMNS = swissConfig?.layerGapColumns ?? 0;
    const TOP_OFFSET = layout.topOffset;
    const LEFT_OFFSET = layout.leftOffset;
    const MATCH_HEIGHT = layout.matchHeight;
    const PANEL_GAP = 16; // Gap between panels in same column

    // Calculate effective layer step Y (vertical spacing between layers)
    const layerStepY = Math.max(MIN_LAYER_GAP_PX, ROW_HEIGHT * LAYER_GAP_FACTOR);

    console.log(`🎯 computeSwissLayout: ${matches.length} matches, mode=${COLUMN_MODE}, layerStep=${layerStepY}px`);

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

    // Step 3: Detect max wins/losses for zone classification
    const { maxWins, maxLosses } = detectMaxWinsLosses(matchesWithRecords.map(m => m.match));
    console.log(`🎯 Max wins=${maxWins}, max losses=${maxLosses}`);

    // Step 4: Order buckets in Swiss progression
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

    // Step 5: Determine column assignment based on mode
    const bucketColumnMap = new Map<string, number>();

    if (COLUMN_MODE === 'layer-based') {
        // Layer-based: Group by layer (wins + losses), optionally add gap columns between layers
        const bucketsByLayer = new Map<number, SwissRecordBucket[]>();
        sortedBuckets.forEach((bucket) => {
            const layer = bucket.wins + bucket.losses;
            if (!bucketsByLayer.has(layer)) {
                bucketsByLayer.set(layer, []);
            }
            bucketsByLayer.get(layer)!.push(bucket);
        });

        // Sort buckets within each layer by wins descending
        bucketsByLayer.forEach(layerBuckets => {
            layerBuckets.sort((a, b) => b.wins - a.wins);
        });

        const sortedLayers = Array.from(bucketsByLayer.keys()).sort((a, b) => a - b);
        let currentCol = 0;

        sortedLayers.forEach(layer => {
            const layerBuckets = bucketsByLayer.get(layer)!;
            // Each layer gets its own column, buckets within layer share the column
            layerBuckets.forEach(bucket => {
                bucketColumnMap.set(bucket.key, currentCol);
            });
            currentCol++;
        });
    } else {
        // Round-based: Group by round number (wins + losses + 1)
        const bucketsByRound = new Map<number, SwissRecordBucket[]>();
        sortedBuckets.forEach((bucket) => {
            const roundNum = bucket.wins + bucket.losses + 1;
            if (!bucketsByRound.has(roundNum)) {
                bucketsByRound.set(roundNum, []);
            }
            bucketsByRound.get(roundNum)!.push(bucket);
        });

        // Sort buckets within each round by wins descending
        bucketsByRound.forEach(roundBuckets => {
            roundBuckets.sort((a, b) => b.wins - a.wins);
        });

        const sortedRounds = Array.from(bucketsByRound.keys()).sort((a, b) => a - b);
        let currentCol = 0;

        sortedRounds.forEach(roundNum => {
            // Each bucket in this round gets its own column
            const roundBuckets = bucketsByRound.get(roundNum)!;
            roundBuckets.forEach(bucket => {
                bucketColumnMap.set(bucket.key, currentCol++);
            });
        });
    }

    // Step 6: Compute max matches per round for panel centering
    const matchCountByRound = new Map<number, number>();
    sortedBuckets.forEach(bucket => {
        const roundNum = bucket.wins + bucket.losses + 1;
        const bucketMatches = bucketMap.get(bucket.key) ?? [];
        const currentMax = matchCountByRound.get(roundNum) ?? 0;
        matchCountByRound.set(roundNum, Math.max(currentMax, bucketMatches.length));
    });

    // Step 7: Position buckets with layer-based Y positioning and centering
    const matchPositions = new Map<string, MatchPosition>();
    const panelPositions: SwissPanelPosition[] = [];
    let maxHeight = 0;
    let maxColumnIndex = 0;

    // Track Y position per column for vertical stacking
    const columnYPositions = new Map<number, number>();

    sortedBuckets.forEach((bucket) => {
        const bucketMatches = bucketMap.get(bucket.key) ?? [];

        // Sort matches within bucket by match number
        bucketMatches.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

        // Extract metadata from first match
        const firstMatch = bucketMatches[0];
        const roundDate = firstMatch?.metadata?.roundDate;
        const roundBestOf = firstMatch?.metadata?.roundBestOf;

        // Get column assignment
        const columnIndex = bucketColumnMap.get(bucket.key) ?? 0;
        maxColumnIndex = Math.max(maxColumnIndex, columnIndex);

        // Get current Y position for this column (or start at TOP_OFFSET)
        const currentY = columnYPositions.get(columnIndex) ?? TOP_OFFSET;

        // Calculate this panel's height (must match match positioning formula)
        const panelHeight = PANEL_HEADER_HEIGHT + bucketMatches.length * (ROW_HEIGHT + PANEL_INNER_GAP) - PANEL_INNER_GAP + PANEL_PADDING;

        // Use column-specific Y for vertical stacking within each column
        const panelY = currentY;

        // Track layer for metadata
        const layer = bucket.wins + bucket.losses;
        const roundNum = bucket.wins + bucket.losses + 1;

        // Classify zone for visual hierarchy
        const zone = classifyZone(bucket.wins, bucket.losses, maxWins, maxLosses);

        // Position each match within this panel
        bucketMatches.forEach((match, matchIndex) => {
            const xPx = LEFT_OFFSET + columnIndex * (COLUMN_WIDTH + COLUMN_GAP_X);
            const yPx = panelY + PANEL_HEADER_HEIGHT + matchIndex * (ROW_HEIGHT + PANEL_INNER_GAP);

            matchPositions.set(String(match.id), {
                xRound: columnIndex,
                yLane: matchIndex,
                xPx,
                yPx,
            });

            maxHeight = Math.max(maxHeight, yPx + MATCH_HEIGHT);
        });

        // Create panel for this bucket
        panelPositions.push({
            key: bucket.key,
            record: bucket.key,
            roundNumber: roundNum,
            date: roundDate,
            bestOf: roundBestOf,
            xPx: LEFT_OFFSET + columnIndex * (COLUMN_WIDTH + COLUMN_GAP_X),
            yPx: panelY,
            width: COLUMN_WIDTH,
            height: panelHeight,
            matchCount: bucketMatches.length,
            layer,
            zone,
        });

        maxHeight = Math.max(maxHeight, panelY + panelHeight);

        // Update Y position for this column (add gap between panels)
        columnYPositions.set(columnIndex, panelY + panelHeight + PANEL_GAP);
    });

    const totalWidth = LEFT_OFFSET + (maxColumnIndex + 1) * (COLUMN_WIDTH + COLUMN_GAP_X) + layout.matchWidth;
    const totalHeight = maxHeight + 50; // Add bottom padding

    console.log(`✅ Swiss layout: ${maxColumnIndex + 1} columns, ${panelPositions.length} panels, ${matchPositions.size} matches, mode=${COLUMN_MODE}`);

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
