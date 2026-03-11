/**
 * computeBracketLayout — Headless layout computation.
 *
 * Runs the full layout pipeline (config resolution, match enrichment, position computation)
 * WITHOUT touching the DOM. Returns a serializable BracketLayoutResult that a React Flow
 * frontend (or any other renderer) can consume.
 *
 * SSR-safe: no window, document, or navigator dependencies.
 */

import type { Participant, ParticipantResult } from 'brackets-model';
import { splitByWithLeftovers } from './utils/pure';
import { computeLayout, computeSwissLayout } from './layout';
import { detectFormatSize, getDEProfile } from './profiles/deProfiles';
import { resolveConfig, validateViewerData } from './config/ConfigResolver';
import {
    enrichForDoubleElimination,
    enrichForSingleElimination,
    enrichForSwiss,
} from './preparation/enrichMatches';

import type { Config, ViewerData, MatchWithMetadata } from './types';
import type { BracketLayout } from './layout/types';
import type { BracketEdgeResponse } from './dto/types';
import type {
    BracketLayoutResult,
    BracketMatchNode,
    ResolvedOpponent,
} from './layout/BracketLayoutResult';

// Re-export types for consumer convenience
export type { BracketLayoutResult, BracketMatchNode, ResolvedOpponent } from './layout/BracketLayoutResult';

/**
 * Computes the bracket layout without rendering to the DOM.
 *
 * Returns match positions, connector lines, round headers, and resolved participant data
 * in a serializable format suitable for React Flow or any custom renderer.
 *
 * @param data - The viewer data (stages, matches, participants, edges)
 * @param config - Optional configuration (layout, theme, display toggles)
 * @returns Layout result for the first stage, or null if no supported stage found
 *
 * @example
 * ```typescript
 * import { computeBracketLayout, convertStageStructureToViewerData } from 'brackets-viewer';
 *
 * const viewerData = convertStageStructureToViewerData(apiResponse);
 * const layout = computeBracketLayout(viewerData, { matchWidth: 200 });
 *
 * // layout.matches → React Flow nodes
 * // layout.connectors → React Flow edges
 * // layout.headers → annotation nodes
 * ```
 */
export function computeBracketLayout(
    data: ViewerData,
    config?: Partial<Config>,
): BracketLayoutResult | null {
    // Validate input
    validateViewerData(data);

    // Resolve configuration (pure — no DOM)
    const resolved = resolveConfig(config, data);
    const { layoutConfig } = resolved;
    // Process the first stage
    const stage = data.stages[0];
    if (!stage) return null;

    // Pre-enrich matches with initial metadata (replicates main.ts lines 122-134)
    const stageMatches: MatchWithMetadata[] = data.matches
        .filter(match => match.stage_id === stage.id)
        .map(match => ({
            ...match,
            metadata: {
                stageType: stage.type,
                games: data.matchGames?.filter(game => game.parent_id === match.id) ?? [],
            },
        }));

    if (!stageMatches.length) return null;

    // Group by group_id (replicates main.ts renderStage)
    const matchesByGroup = splitByWithLeftovers(stageMatches, 'group_id');
    const edges: BracketEdgeResponse[] = data.edges ?? [];

    // Compute layout based on stage type
    let layout: BracketLayout;
    let enrichedMatches: MatchWithMetadata[];

    switch (stage.type) {
        case 'double_elimination': {
            enrichedMatches = enrichForDoubleElimination(matchesByGroup);
            const formatSize = detectFormatSize(enrichedMatches);
            const deProfile = formatSize ? getDEProfile(formatSize) : undefined;
            layout = computeLayout(enrichedMatches, edges, 'winner_bracket', layoutConfig, deProfile);
            break;
        }

        case 'single_elimination': {
            enrichedMatches = enrichForSingleElimination(matchesByGroup);
            layout = computeLayout(enrichedMatches, edges, 'single_bracket', layoutConfig);
            break;
        }

        case 'swiss': {
            enrichedMatches = enrichForSwiss(matchesByGroup);
            // Deep clone to avoid computeSwissLayout mutating input metadata
            const clonedMatches = enrichedMatches.map(m => ({
                ...m,
                metadata: { ...m.metadata },
            }));
            layout = computeSwissLayout(clonedMatches as MatchWithMetadata[], layoutConfig);
            // Use cloned matches (which now have inferred swissWins/Losses filled in)
            enrichedMatches = clonedMatches as MatchWithMetadata[];
            break;
        }

        case 'round_robin': {
            // Round-robin uses CSS flow layout, not absolute positioning.
            // Return matches grouped but without pixel positions.
            enrichedMatches = stageMatches;
            return {
                stage: { id: stage.id, type: stage.type, name: stage.name },
                layoutConfig,
                matches: resolveParticipants(enrichedMatches, data.participants, layoutConfig),
                headers: [],
                connectors: [],
                totalWidth: 0,
                totalHeight: 0,
            };
        }

        default:
            return null;
    }

    // Convert BracketLayout (Map-based) → BracketLayoutResult (plain objects)
    const matchNodes = convertToMatchNodes(enrichedMatches, layout, data.participants, layoutConfig);

    // Convert groupOffsetY Map → Record
    const groupOffsets: Record<string, number> | undefined = layout.groupOffsetY
        ? Object.fromEntries(layout.groupOffsetY.entries())
        : undefined;

    return {
        stage: { id: stage.id, type: stage.type, name: stage.name },
        layoutConfig,
        matches: matchNodes,
        headers: layout.headerPositions,
        connectors: layout.connectors,
        panels: layout.panelPositions,
        groupOffsets,
        totalWidth: layout.totalWidth,
        totalHeight: layout.totalHeight,
    };
}

/**
 * Converts enriched matches + layout positions into BracketMatchNode[] with resolved participants.
 */
function convertToMatchNodes(
    matches: MatchWithMetadata[],
    layout: BracketLayout,
    participants: Participant[],
    layoutConfig: { matchWidth: number; matchHeight: number },
): BracketMatchNode[] {
    const nodes: BracketMatchNode[] = [];

    for (const match of matches) {
        const pos = layout.matchPositions.get(String(match.id));
        if (!pos) continue;

        nodes.push({
            id: String(match.id),
            position: { x: pos.xPx, y: pos.yPx },
            gridPosition: { column: pos.xRound, lane: pos.yLane },
            width: layoutConfig.matchWidth,
            height: layoutConfig.matchHeight,
            match,
            metadata: {
                label: match.metadata?.label,
                roundNumber: match.metadata?.roundNumber,
                roundCount: match.metadata?.roundCount,
                matchLocation: match.metadata?.matchLocation as string | undefined,
                connectFinal: match.metadata?.connectFinal,
                swissWins: match.metadata?.swissWins,
                swissLosses: match.metadata?.swissLosses,
                swissZone: (match.metadata as any)?.swissZone,
                roundDate: match.metadata?.roundDate,
                roundBestOf: match.metadata?.roundBestOf,
            },
            opponents: {
                opponent1: resolveOpponent(match.opponent1, participants),
                opponent2: resolveOpponent(match.opponent2, participants),
            },
        });
    }

    return nodes;
}

/**
 * Resolves matches into BracketMatchNode[] without position data (for round-robin).
 */
function resolveParticipants(
    matches: MatchWithMetadata[],
    participants: Participant[],
    layoutConfig: { matchWidth: number; matchHeight: number },
): BracketMatchNode[] {
    return matches.map(match => ({
        id: String(match.id),
        position: { x: 0, y: 0 },
        gridPosition: { column: 0, lane: 0 },
        width: layoutConfig.matchWidth,
        height: layoutConfig.matchHeight,
        match,
        metadata: {
            roundNumber: match.metadata?.roundNumber,
            roundCount: match.metadata?.roundCount,
        },
        opponents: {
            opponent1: resolveOpponent(match.opponent1, participants),
            opponent2: resolveOpponent(match.opponent2, participants),
        },
    }));
}

/**
 * Resolves a ParticipantResult to a ResolvedOpponent with participant name.
 */
function resolveOpponent(
    result: ParticipantResult | null | undefined,
    participants: Participant[],
): ResolvedOpponent | null {
    if (!result) return null;

    const participant = result.id != null
        ? participants.find(p => p.id === result.id)
        : undefined;

    return {
        participantId: (result.id as number) ?? null,
        name: participant?.name ?? null,
        score: result.score,
        result: result.result,
        isWinner: result.result === 'win',
    };
}
