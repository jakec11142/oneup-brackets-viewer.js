/**
 * SwissRenderer - Renders Swiss tournament brackets.
 *
 * Swiss format displays matches in record-bucket columns organized by wins/losses.
 */

import * as dom from '../dom';
import * as lang from '../lang';
import { splitBy, sortBy } from '../helpers';
import { computeSwissLayout } from '../layout';
import type { MatchWithMetadata, Config } from '../types';
import type { ViewerStage } from '../models';
import type { LayoutConfig } from '../viewModels';

/**
 * Render context for Swiss rendering.
 */
export interface SwissRenderContext {
    config: Config;
    layoutConfig: LayoutConfig;
    createBracketMatch: (match: MatchWithMetadata) => HTMLElement;
}

/**
 * Renders a Swiss stage into the container.
 *
 * @param root - The root element to render into
 * @param stage - The stage being rendered
 * @param matchesByGroup - Matches grouped by their group_id
 * @param context - Render context with dependencies
 */
export function renderSwiss(
    root: DocumentFragment | HTMLElement,
    stage: ViewerStage,
    matchesByGroup: MatchWithMetadata[][],
    context: SwissRenderContext,
): void {
    const container = dom.createEliminationContainer(stage.id);
    container.append(dom.createTitle(stage.name));

    let groupNumber = 1;

    for (const groupMatches of matchesByGroup) {
        if (!groupMatches?.length)
            continue;

        const groupId = groupMatches[0].group_id;
        const bracket = dom.createBracketContainer(groupId, lang.getGroupName(groupNumber++));
        const roundsContainer = dom.createRoundsContainer();

        // Organize matches with metadata
        const matchesByRound = splitBy(groupMatches, 'round_id').map(matches => sortBy(matches, 'number'));
        const roundCount = matchesByRound.length;

        // Prepare matches with round metadata
        const allMatchesWithMetadata: MatchWithMetadata[] = [];
        matchesByRound.forEach((roundMatches, roundIndex) => {
            const roundNumber = roundIndex + 1;
            roundMatches.forEach(match => {
                allMatchesWithMetadata.push({
                    ...match,
                    metadata: {
                        ...match.metadata,
                        roundNumber,
                        roundCount,
                        matchLocation: 'single_bracket',
                        // Transfer Swiss-specific round data from Match object to metadata
                        roundDate: (match as any).swissRoundDate,
                        roundBestOf: (match as any).swissRoundBestOf,
                        swissWins: (match as any).swissWins,
                        swissLosses: (match as any).swissLosses,
                    },
                });
            });
        });

        // Use computeSwissLayout for record-bucket positioning
        const swissLayout = computeSwissLayout(allMatchesWithMetadata, context.layoutConfig);

        // Group matches by record bucket for panel rendering
        const matchesByRecord = new Map<string, MatchWithMetadata[]>();
        allMatchesWithMetadata.forEach(match => {
            const wins = match.metadata.swissWins ?? 0;
            const losses = match.metadata.swissLosses ?? 0;
            const key = `${wins}-${losses}`;
            if (!matchesByRecord.has(key)) {
                matchesByRecord.set(key, []);
            }
            matchesByRecord.get(key)!.push(match);
        });

        // Group panels by round number for visual grouping
        const panelsByRound = new Map<number, typeof swissLayout.panelPositions>();
        swissLayout.panelPositions?.forEach(panel => {
            const roundNum = panel.roundNumber ?? 1;
            if (!panelsByRound.has(roundNum)) {
                panelsByRound.set(roundNum, []);
            }
            panelsByRound.get(roundNum)!.push(panel);
        });

        // Render Swiss round groups
        panelsByRound.forEach((panels, roundNumber) => {
            if (!panels || !panels.length) return;

            // Calculate group bounds (leftmost x, topmost y, total width/height)
            const minX = Math.min(...panels.map(p => p!.xPx));
            const minY = Math.min(...panels.map(p => p!.yPx));
            const maxX = Math.max(...panels.map(p => p!.xPx + p!.width));
            const maxY = Math.max(...panels.map(p => p!.yPx + p!.height));
            const groupWidth = maxX - minX;
            const groupHeaderHeight = 36;
            const groupHeight = maxY - minY + groupHeaderHeight;

            // Create round group wrapper
            const groupDiv = document.createElement('div');
            groupDiv.className = 'swiss-round-group';
            groupDiv.style.position = 'absolute';
            groupDiv.style.left = `${minX}px`;
            groupDiv.style.top = `${minY}px`;
            groupDiv.style.width = `${groupWidth}px`;
            groupDiv.style.height = `${groupHeight}px`;
            groupDiv.dataset.round = String(roundNumber);

            // Shared round title
            const titleDiv = document.createElement('div');
            titleDiv.className = 'swiss-round-group__title';
            titleDiv.textContent = `Round ${roundNumber}`;
            groupDiv.appendChild(titleDiv);

            // Columns container
            const columnsDiv = document.createElement('div');
            columnsDiv.className = 'swiss-round-group__columns';

            // Render each panel/column within this round group
            panels.forEach(panel => {
                const panelDiv = document.createElement('div');
                panelDiv.className = 'round-column';
                panelDiv.style.position = 'absolute';
                panelDiv.style.left = `${panel.xPx - minX}px`;
                panelDiv.style.top = `${(panel.yPx - minY) + groupHeaderHeight}px`;
                panelDiv.style.width = `${panel.width}px`;
                panelDiv.dataset.key = panel.key;

                // Apply zone styling via data attribute (CSS handles colors)
                if (panel.zone === 'advancing' || panel.zone === 'eliminated') {
                    panelDiv.setAttribute('data-zone', panel.zone);
                }

                // Column header shows only record (round title is at group level)
                const headerDiv = document.createElement('div');
                headerDiv.className = 'round-column__header';

                const recordSpan = document.createElement('span');
                recordSpan.className = 'record';
                recordSpan.textContent = panel.record;
                headerDiv.appendChild(recordSpan);

                panelDiv.appendChild(headerDiv);

                // Create panel body for matches
                const bodyDiv = document.createElement('div');
                bodyDiv.className = 'round-column__matches';

                // Calculate body height for proper panel sizing
                const bodyHeight = panel.height - (context.layoutConfig.swissConfig?.panelHeaderHeight ?? 40);
                bodyDiv.style.height = `${bodyHeight}px`;

                // Render matches within this panel
                const panelMatches = matchesByRecord.get(panel.key) ?? [];
                const rowHeight = context.layoutConfig.swissConfig?.rowHeight ?? context.layoutConfig.rowHeight;
                const innerGap = context.layoutConfig.swissConfig?.panelInnerGap ?? 14;

                panelMatches.forEach((match, idx) => {
                    const matchEl = context.createBracketMatch(match);
                    matchEl.classList.add('round-column__match');
                    matchEl.style.top = `${idx * (rowHeight + innerGap)}px`;
                    bodyDiv.appendChild(matchEl);
                });

                panelDiv.appendChild(bodyDiv);
                columnsDiv.appendChild(panelDiv);
            });

            groupDiv.appendChild(columnsDiv);
            roundsContainer.appendChild(groupDiv);
        });

        // Set explicit size on rounds container
        roundsContainer.style.width = `${swissLayout.totalWidth}px`;
        roundsContainer.style.height = `${swissLayout.totalHeight}px`;

        bracket.append(roundsContainer);
        container.append(bracket);
    }

    root.append(container);
}
