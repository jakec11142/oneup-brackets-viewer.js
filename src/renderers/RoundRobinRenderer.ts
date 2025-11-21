/**
 * RoundRobinRenderer - Renders Round Robin tournament brackets.
 *
 * Round Robin displays matches in a grid format organized by groups and rounds.
 */

import * as dom from '../dom';
import * as lang from '../lang';
import { splitBy, sortBy } from '../helpers';
import type { MatchWithMetadata, Config } from '../types';
import type { ViewerStage } from '../models';

/**
 * Render context for round robin rendering.
 */
export interface RoundRobinRenderContext {
    config: Config;
    createMatch: (match: MatchWithMetadata, useCompactView?: boolean) => HTMLElement;
}

/**
 * Renders a Round Robin stage into the container.
 *
 * @param root - The root element to render into
 * @param stage - The stage being rendered
 * @param matchesByGroup - Matches grouped by their group_id
 * @param context - Render context with dependencies
 */
export function renderRoundRobin(
    root: DocumentFragment | HTMLElement,
    stage: ViewerStage,
    matchesByGroup: MatchWithMetadata[][],
    context: RoundRobinRenderContext,
): void {
    const container = dom.createRoundRobinContainer(stage.id);
    container.append(dom.createTitle(stage.name));

    let groupNumber = 1;

    for (const groupMatches of matchesByGroup) {
        if (!groupMatches?.length) continue;

        const groupId = groupMatches[0].group_id;

        // Create card-style wrapper for the entire group
        const groupSection = dom.createRoundRobinGroupSection();
        const groupContainer = dom.createGroupContainer(groupId, lang.getGroupName(groupNumber++));
        const matchesByRound = splitBy(groupMatches, 'round_id').map(matches => sortBy(matches, 'number'));

        // Create horizontal scroll container for rounds
        const roundsContainer = document.createElement('div');
        roundsContainer.classList.add('rounds-container');

        let roundNumber = 1;

        for (const roundMatches of matchesByRound) {
            if (!roundMatches?.length) continue;

            const roundId = roundMatches[0].round_id;
            // Use simple "Round N" format for Round Robin (not semantic elimination naming)
            const roundName = context.config.customRoundName?.({
                roundNumber,
                roundCount: 0,
                groupType: lang.toI18nKey('round_robin'),
            }, lang.t) || lang.t('common.round-name', { roundNumber });

            const roundContainer = dom.createRoundContainer(roundId, roundName);

            // Create vertical match stack container
            const matchGrid = document.createElement('div');
            matchGrid.classList.add('round-matches');
            for (const match of roundMatches)
                matchGrid.append(context.createMatch(match, true));

            roundContainer.append(matchGrid);
            roundsContainer.append(roundContainer);
            roundNumber++;
        }

        // Add the rounds container to the group
        groupContainer.append(roundsContainer);

        // Wrap the group container in the card-style section
        groupSection.append(groupContainer);
        container.append(groupSection);
    }

    root.append(container);
}
