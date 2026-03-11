import { GroupType, RankingItem } from 'brackets-model';
import { RankingHeader, Side } from './types';
import { t } from './lang';

// Re-export pure utilities from SSR-safe module for backward compatibility
export { splitBy, splitByWithLeftovers, sortBy, completeWithBlankMatches, isMatch, isMatchGame } from './utils/pure';

/**
 * Finds the root element
 *
 * @param selector An optional selector to select the root element.
 */
export function findRoot(selector?: string): HTMLElement {
    const queryResult = document.querySelectorAll(selector || '.brackets-viewer');

    if (queryResult.length === 0)
        throw Error('Root not found. You must have at least one root element.');

    if (queryResult.length > 1)
        throw Error('Multiple possible roots were found. Please use `config.selector` to choose a specific root.');

    const root = queryResult[0] as HTMLElement;

    if (!root.classList.contains('brackets-viewer'))
        throw Error('The selected root must have a `.brackets-viewer` class.');

    return root;
}

/**
 * Returns the abbreviation for a participant origin.
 *
 * @param matchLocation Location of the match.
 * @param skipFirstRound Whether to skip the first round.
 * @param roundNumber Number of the round.
 * @param side Side of the participant.
 */
export function getOriginAbbreviation(matchLocation: GroupType, skipFirstRound: boolean, roundNumber?: number, side?: Side): string | null {
    roundNumber = roundNumber || -1;

    if (skipFirstRound && matchLocation === 'loser_bracket' && roundNumber === 1)
        return t('abbreviations.seed');

    if (matchLocation === 'single_bracket' || matchLocation === 'winner_bracket' && roundNumber === 1)
        return t('abbreviations.seed');

    if (matchLocation === 'loser_bracket' && roundNumber % 2 === 0 && side === 'opponent1')
        return t('abbreviations.position');

    return null;
}

/**
 * Indicates whether a round is major.
 *
 * @param roundNumber Number of the round.
 */
export function isMajorRound(roundNumber: number): boolean {
    return roundNumber === 1 || roundNumber % 2 === 0;
}

/**
 * Returns the header for a ranking property.
 *
 * @param itemName Name of the ranking property.
 */
export function rankingHeader(itemName: keyof RankingItem): RankingHeader {
    return t(`ranking.${itemName}`, { returnObjects: true }) as RankingHeader;
}

/**
 * Display status type for UI rendering.
 */
export type DisplayStatus = 'pending' | 'upcoming' | 'live' | 'completed';

/**
 * Maps a match status to a display status for UI rendering.
 *
 * @param status The status from brackets-model (numeric enum).
 */
export function getDisplayStatus(status: number): DisplayStatus {
    // Status enum values from brackets-model:
    // Locked = 0, Waiting = 1, Ready = 2, Running = 3, Completed = 4, Archived = 5

    if (status === 3) return 'live';         // Running
    if (status === 4 || status === 5) return 'completed';  // Completed or Archived
    if (status === 2) return 'upcoming';     // Ready
    return 'pending';                         // Locked or Waiting
}
