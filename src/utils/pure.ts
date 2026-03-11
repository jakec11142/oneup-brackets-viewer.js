/**
 * Pure utility functions — SSR-safe, no DOM or i18n dependencies.
 *
 * These are extracted from helpers.ts so that headless modules (like computeBracketLayout)
 * can use them without pulling in lang.ts → i18next-browser-languagedetector.
 */

import { Match, MatchGame, GroupType } from 'brackets-model';
import type { MatchWithMetadata } from '../types';

/**
 * Splits an array of objects based on their values at a given key.
 */
export function splitBy<
    T extends Record<string, unknown>,
    K extends keyof T,
    U extends Record<K, string | number>
>(objects: U[], key: K): U[][] {
    const map = {} as Record<string | number, U[]>;

    for (const obj of objects) {
        const commonValue = obj[key];

        if (!map[commonValue])
            map[commonValue] = [];

        map[commonValue].push(obj);
    }

    return Object.values(map);
}

/**
 * Splits an array of objects based on their values at a given key.
 * Objects without a value at the given key will be set under a `-1` index.
 */
export function splitByWithLeftovers<
    T extends Record<string, unknown>,
    K extends keyof T,
    U extends Record<K, string | number>
>(objects: U[], key: K): U[][] {
    const map = {} as Record<string | number, U[]>;

    for (const obj of objects) {
        const commonValue = obj[key] ?? '-1';

        if (!map[commonValue])
            map[commonValue] = [];

        map[commonValue].push(obj);
    }

    const withoutLeftovers = Object.entries(map)
        .filter(([key]) => key !== '-1')
        .map(([_, value]) => value);

    const result = [...withoutLeftovers];
    result[-1] = map[-1];
    return result;
}

/**
 * Sorts the objects in the given array by a given key.
 * Returns a new array (does not mutate input).
 */
export function sortBy<
    T extends Record<string, unknown>,
    K extends keyof T,
    U extends Record<K, number>
>(array: U[], key: K): U[] {
    return [...array].sort((a, b) => a[key] - b[key]);
}

/**
 * Completes a list of matches with blank matches based on the next matches.
 */
export function completeWithBlankMatches(bracketType: GroupType, matches: MatchWithMetadata[], nextMatches?: MatchWithMetadata[]): {
    matches: (MatchWithMetadata | null)[],
    fromToornament: boolean,
} {
    if (!nextMatches)
        return { matches, fromToornament: false };

    let sources: (number | null)[] = [];

    if (bracketType === 'single_bracket' || bracketType === 'winner_bracket')
        sources = nextMatches.map(match => [match.opponent1?.position || null, match.opponent2?.position || null]).flat();

    if (bracketType === 'loser_bracket')
        sources = nextMatches.map(match => match.opponent2?.position || null);

    if (sources.filter(source => source !== null).length === 0)
        return { matches, fromToornament: false };

    return {
        matches: sources.map(source => source && matches.find(match => match.number === source) || null),
        fromToornament: true,
    };
}

/**
 * Type guard: is this a Match (not a MatchGame)?
 */
export function isMatch(input: Match | MatchGame): input is Match {
    return 'child_count' in input;
}

/**
 * Type guard: is this a MatchGame (not a Match)?
 */
export function isMatchGame(input: Match | MatchGame): input is MatchGame {
    return !isMatch(input);
}
