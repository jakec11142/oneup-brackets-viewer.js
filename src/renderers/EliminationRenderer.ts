/**
 * EliminationRenderer - Renders Single and Double Elimination tournament brackets.
 *
 * Handles both unified (single canvas) and split (legacy) rendering modes.
 */

import * as dom from '../dom';
import * as lang from '../lang';
import { splitBy, sortBy } from '../helpers';
import { computeLayout } from '../layout';
import { detectFormatSize, getDEProfile } from '../profiles/deProfiles';
import { debug } from '../debug';
import { VirtualBracketManager } from '../rendering/VirtualBracket';
import type { GroupType } from 'brackets-model';
import type { MatchWithMetadata, Config, RoundNameGetter, DoubleElimMode } from '../types';
import type { ViewerStage } from '../models';
import type { LayoutConfig } from '../viewModels';
import type { BracketEdgeResponse } from '../dto/types';
import type { ConnectorLine } from '../layout';

/**
 * Render context for elimination rendering.
 */
export interface EliminationRenderContext {
    config: Config;
    layoutConfig: LayoutConfig;
    edges: BracketEdgeResponse[];
    stage: ViewerStage;
    createBracketMatch: (match: MatchWithMetadata, roundNumber?: number, roundCount?: number) => HTMLElement;
    createConnectorSVG: (connectors: ConnectorLine[], width: number, height: number) => SVGElement;
}

/**
 * Helper to map group_id to matchLocation.
 */
function getMatchLocation(groupId: string): GroupType {
    const normalized = groupId.toLowerCase();
    if (normalized.includes('winners-bracket')) return 'winner_bracket';
    if (normalized.includes('losers-bracket')) return 'loser_bracket';
    if (normalized.includes('grand-final')) return 'final_group';
    if (normalized.includes('placement') || normalized.includes('third') || normalized.includes('3rd'))
        return 'final_group';
    return 'winner_bracket';
}

/**
 * Renders a unified double elimination stage with all bracket groups on one canvas.
 */
export function renderUnifiedDoubleElimination(
    container: HTMLElement,
    matchesByGroup: MatchWithMetadata[][],
    context: EliminationRenderContext,
): void {
    // Organize and prepare ALL matches with required metadata
    const allMatchesWithMetadata: MatchWithMetadata[] = [];

    Object.values(matchesByGroup).forEach(groupMatches => {
        if (!Array.isArray(groupMatches) || groupMatches.length === 0) return;

        const matchLocation = getMatchLocation(String(groupMatches[0].group_id));
        const matchesByRound = splitBy(groupMatches, 'round_id').map(matches => sortBy(matches, 'number'));
        const roundCount = matchesByRound.length;

        matchesByRound.forEach((roundMatches, roundIndex) => {
            const roundNumber = roundIndex + 1;
            const connectFinal = matchLocation === 'winner_bracket' && roundNumber === roundCount;

            roundMatches.forEach(match => {
                allMatchesWithMetadata.push({
                    ...match,
                    metadata: {
                        ...match.metadata,
                        roundNumber,
                        roundCount,
                        matchLocation,
                        connectFinal,
                    },
                });
            });
        });
    });

    const allEdges = context.edges;
    debug.log(`🔧 Unified DE: ${allMatchesWithMetadata.length} matches, ${allEdges.length} edges`);

    // Detect tournament format and get layout profile
    const formatSize = detectFormatSize(allMatchesWithMetadata);
    const deProfile = formatSize ? getDEProfile(formatSize) : undefined;

    if (deProfile) {
        debug.log(`📊 Using DE profile: ${deProfile.id} (${deProfile.formatSize}-team format)`);
    }

    // Compute layout
    const layout = computeLayout(allMatchesWithMetadata, allEdges, 'winner_bracket', context.layoutConfig, deProfile);

    // Create bracket container
    const groupId = allMatchesWithMetadata[0]?.group_id ?? 'unified-de';
    const bracketContainer = dom.createBracketContainer(groupId, lang.getBracketName(context.stage, 'winner_bracket'));
    const roundsContainer = dom.createRoundsContainer();

    // Render matches with absolute positioning
    let renderedCount = 0;
    for (const match of allMatchesWithMetadata) {
        const pos = layout.matchPositions.get(String(match.id));
        if (!pos) continue;

        const matchEl = context.createBracketMatch(match);
        matchEl.style.position = 'absolute';
        matchEl.style.left = `${pos.xPx}px`;
        matchEl.style.top = `${pos.yPx}px`;
        roundsContainer.append(matchEl);
        renderedCount++;
    }

    debug.log(`✅ Rendered ${renderedCount} matches`);

    // Render round headers
    if (context.config.showRoundHeaders !== false) {
        renderRoundHeaders(roundsContainer, layout, allMatchesWithMetadata, context.layoutConfig);
    }

    // Add bracket section titles for split-horizontal layout
    if (context.layoutConfig.bracketAlignment === 'split-horizontal' && layout.groupOffsetY) {
        renderBracketSectionTitles(roundsContainer, layout, context.layoutConfig);
    }

    // Set container size
    roundsContainer.style.width = `${layout.totalWidth}px`;
    roundsContainer.style.height = `${layout.totalHeight}px`;

    // Add connectors
    if (context.config.showConnectors !== false) {
        const svg = context.createConnectorSVG(layout.connectors, layout.totalWidth, layout.totalHeight);
        roundsContainer.prepend(svg);
        debug.log(`🔗 Generated ${layout.connectors.length} connectors`);
    }

    bracketContainer.append(roundsContainer);
    container.append(bracketContainer);

    // Initialize virtual scrolling for large brackets
    const enableVirtualization = context.config.enableVirtualization ?? 'auto';
    const threshold = context.config.virtualizationThreshold ?? 50;
    const shouldVirtualize =
        enableVirtualization === true ||
        (enableVirtualization === 'auto' && allMatchesWithMetadata.length >= threshold);

    if (shouldVirtualize) {
        debug.log(`🚀 Initializing virtual scrolling for ${allMatchesWithMetadata.length} matches`);
        const virtualManager = new VirtualBracketManager({
            enabled: true,
            autoThreshold: threshold,
            viewportHeight: container.offsetHeight || 600,
            viewportWidth: container.offsetWidth || 800,
            debug: false
        });

        // Initialize virtual scrolling with match render function
        virtualManager.initialize(
            container,
            layout,
            allMatchesWithMetadata,
            (match: MatchWithMetadata) => context.createBracketMatch(match)
        );
    }
}

/**
 * Renders a unified single elimination stage.
 */
export function renderUnifiedSingleElimination(
    container: HTMLElement,
    matchesByGroup: MatchWithMetadata[][],
    context: EliminationRenderContext,
): void {
    const allMatchesWithMetadata: MatchWithMetadata[] = [];

    Object.values(matchesByGroup).forEach(groupMatches => {
        if (!Array.isArray(groupMatches) || groupMatches.length === 0) return;

        const matchLocation = getMatchLocation(String(groupMatches[0].group_id));
        const matchesByRound = splitBy(groupMatches, 'round_id').map(matches => sortBy(matches, 'number'));
        const roundCount = matchesByRound.length;

        matchesByRound.forEach((roundMatches, roundIndex) => {
            const roundNumber = roundIndex + 1;
            roundMatches.forEach(match => {
                allMatchesWithMetadata.push({
                    ...match,
                    metadata: {
                        ...match.metadata,
                        roundNumber,
                        roundCount,
                        matchLocation,
                    },
                });
            });
        });
    });

    const allEdges = context.edges;
    debug.log(`🔧 Unified SE: ${allMatchesWithMetadata.length} matches, ${allEdges.length} edges`);

    const layout = computeLayout(allMatchesWithMetadata, allEdges, 'single_bracket', context.layoutConfig);

    const groupId = allMatchesWithMetadata[0]?.group_id ?? 'unified-se';
    const bracketContainer = dom.createBracketContainer(groupId, lang.getBracketName(context.stage, 'single_bracket'));
    const roundsContainer = dom.createRoundsContainer();

    let renderedCount = 0;
    for (const match of allMatchesWithMetadata) {
        const pos = layout.matchPositions.get(String(match.id));
        if (!pos) continue;

        const matchEl = context.createBracketMatch(match);
        matchEl.style.position = 'absolute';
        matchEl.style.left = `${pos.xPx}px`;
        matchEl.style.top = `${pos.yPx}px`;
        roundsContainer.append(matchEl);
        renderedCount++;
    }

    debug.log(`✅ Rendered ${renderedCount} matches`);

    if (context.config.showRoundHeaders !== false) {
        renderRoundHeaders(roundsContainer, layout, allMatchesWithMetadata, context.layoutConfig);
    }

    roundsContainer.style.width = `${layout.totalWidth}px`;
    roundsContainer.style.height = `${layout.totalHeight}px`;

    if (context.config.showConnectors !== false) {
        const svg = context.createConnectorSVG(layout.connectors, layout.totalWidth, layout.totalHeight);
        roundsContainer.prepend(svg);
    }

    bracketContainer.append(roundsContainer);
    container.append(bracketContainer);

    // Initialize virtual scrolling for large brackets
    const enableVirtualization = context.config.enableVirtualization ?? 'auto';
    const threshold = context.config.virtualizationThreshold ?? 50;
    const shouldVirtualize =
        enableVirtualization === true ||
        (enableVirtualization === 'auto' && allMatchesWithMetadata.length >= threshold);

    if (shouldVirtualize) {
        debug.log(`🚀 Initializing virtual scrolling for ${allMatchesWithMetadata.length} matches`);
        const virtualManager = new VirtualBracketManager({
            enabled: true,
            autoThreshold: threshold,
            viewportHeight: container.offsetHeight || 600,
            viewportWidth: container.offsetWidth || 800,
            debug: false
        });

        virtualManager.initialize(
            container,
            layout,
            allMatchesWithMetadata,
            (match: MatchWithMetadata) => context.createBracketMatch(match)
        );
    }
}

/**
 * Renders round headers for the bracket.
 */
function renderRoundHeaders(
    roundsContainer: HTMLElement,
    layout: ReturnType<typeof computeLayout>,
    allMatches: MatchWithMetadata[],
    layoutConfig: LayoutConfig,
): void {
    layout.headerPositions.forEach(header => {
        const matchesInColumn = allMatches.filter(m => {
            const pos = layout.matchPositions.get(String(m.id));
            return pos && pos.xRound === header.columnIndex;
        });

        if (matchesInColumn.length === 0) return;

        const sampleMatch = matchesInColumn[0];
        const bracketType = sampleMatch.metadata?.matchLocation ?? 'winner_bracket';
        const roundCount = sampleMatch.metadata?.roundCount ?? header.roundNumber;

        const roundInfo = {
            roundNumber: header.roundNumber,
            roundCount,
        };

        let roundName: string;
        if (bracketType === 'winner_bracket') {
            roundName = lang.getWinnerBracketRoundName(roundInfo, lang.t);
        } else if (bracketType === 'loser_bracket') {
            roundName = lang.getLoserBracketRoundName(roundInfo, lang.t);
        } else if (bracketType === 'final_group') {
            roundName = 'Grand Finals';
        } else {
            roundName = lang.getRoundName(roundInfo, lang.t);
        }

        const h3 = document.createElement('h3');
        h3.innerText = roundName;
        h3.style.position = 'absolute';
        h3.style.left = `${header.xPx}px`;
        h3.style.top = `${header.yPx}px`;
        h3.style.width = `var(--bv-match-width)`;
        roundsContainer.append(h3);
    });
}

/**
 * Renders bracket section titles (Upper/Lower Bracket) for split-horizontal layout.
 */
function renderBracketSectionTitles(
    roundsContainer: HTMLElement,
    layout: ReturnType<typeof computeLayout>,
    layoutConfig: LayoutConfig,
): void {
    const winnersY = layout.groupOffsetY?.get('WINNERS_BRACKET');
    const losersY = layout.groupOffsetY?.get('LOSERS_BRACKET');

    if (winnersY !== undefined) {
        const upperTitle = dom.createBracketSectionTitle('Upper Bracket');
        upperTitle.style.position = 'absolute';
        upperTitle.style.left = `${layoutConfig.leftOffset}px`;
        upperTitle.style.top = `${Math.max(0, winnersY - 40)}px`;
        roundsContainer.append(upperTitle);
    }

    if (losersY !== undefined) {
        const lowerTitle = dom.createBracketSectionTitle('Lower Bracket');
        lowerTitle.style.position = 'absolute';
        lowerTitle.style.left = `${layoutConfig.leftOffset}px`;
        lowerTitle.style.top = `${Math.max(0, losersY - 40)}px`;
        roundsContainer.append(lowerTitle);
    }
}
