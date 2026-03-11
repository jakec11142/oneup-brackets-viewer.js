/**
 * Match enrichment — pure functions that attach layout metadata to matches.
 *
 * SSR-safe: imports only from utils/pure.ts, NOT from helpers.ts or lang.ts.
 * Used by both the DOM renderers and the headless computeBracketLayout().
 */

import { splitBy, sortBy } from '../utils/pure';
import type { GroupType } from 'brackets-model';
import type { MatchWithMetadata } from '../types';

/**
 * Maps a group_id string to a bracket GroupType.
 */
export function getMatchLocation(groupId: string): GroupType {
    const normalized = String(groupId).toLowerCase();
    if (normalized.includes('winners-bracket')) return 'winner_bracket';
    if (normalized.includes('losers-bracket')) return 'loser_bracket';
    if (normalized.includes('grand-final')) return 'final_group';
    if (normalized.includes('placement') || normalized.includes('third') || normalized.includes('3rd'))
        return 'final_group';
    return 'winner_bracket';
}

/**
 * Enriches matches for double elimination.
 * Assigns roundNumber, roundCount, matchLocation, and connectFinal to each match's metadata.
 */
export function enrichForDoubleElimination(
    matchesByGroup: MatchWithMetadata[][],
): MatchWithMetadata[] {
    const allMatches: MatchWithMetadata[] = [];

    Object.values(matchesByGroup).forEach(groupMatches => {
        if (!Array.isArray(groupMatches) || groupMatches.length === 0) return;

        const matchLocation = getMatchLocation(String(groupMatches[0].group_id));
        const matchesByRound = splitBy(groupMatches, 'round_id').map(matches => sortBy(matches, 'number'));
        const roundCount = matchesByRound.length;

        matchesByRound.forEach((roundMatches, roundIndex) => {
            const roundNumber = roundIndex + 1;
            const connectFinal = matchLocation === 'winner_bracket' && roundNumber === roundCount;

            roundMatches.forEach(match => {
                allMatches.push({
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

    return allMatches;
}

/**
 * Enriches matches for single elimination.
 * Assigns roundNumber, roundCount, and matchLocation to each match's metadata.
 */
export function enrichForSingleElimination(
    matchesByGroup: MatchWithMetadata[][],
): MatchWithMetadata[] {
    const allMatches: MatchWithMetadata[] = [];

    Object.values(matchesByGroup).forEach(groupMatches => {
        if (!Array.isArray(groupMatches) || groupMatches.length === 0) return;

        const matchLocation = getMatchLocation(String(groupMatches[0].group_id));
        const matchesByRound = splitBy(groupMatches, 'round_id').map(matches => sortBy(matches, 'number'));
        const roundCount = matchesByRound.length;

        matchesByRound.forEach((roundMatches, roundIndex) => {
            const roundNumber = roundIndex + 1;
            roundMatches.forEach(match => {
                allMatches.push({
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

    return allMatches;
}

/**
 * Enriches matches for Swiss format.
 * Assigns roundNumber, roundCount, matchLocation, and Swiss-specific metadata.
 */
export function enrichForSwiss(
    matchesByGroup: MatchWithMetadata[][],
): MatchWithMetadata[] {
    const allMatches: MatchWithMetadata[] = [];

    for (const groupMatches of matchesByGroup) {
        if (!groupMatches?.length) continue;

        const matchesByRound = splitBy(groupMatches, 'round_id').map(matches => sortBy(matches, 'number'));
        const roundCount = matchesByRound.length;

        matchesByRound.forEach((roundMatches, roundIndex) => {
            const roundNumber = roundIndex + 1;
            roundMatches.forEach(match => {
                allMatches.push({
                    ...match,
                    metadata: {
                        ...match.metadata,
                        roundNumber,
                        roundCount,
                        matchLocation: 'single_bracket',
                        // Transfer Swiss-specific data from Match to metadata
                        roundDate: (match as any).swissRoundDate,
                        roundBestOf: (match as any).swissRoundBestOf,
                        swissWins: (match as any).swissWins,
                        swissLosses: (match as any).swissLosses,
                    },
                });
            });
        });
    }

    return allMatches;
}
