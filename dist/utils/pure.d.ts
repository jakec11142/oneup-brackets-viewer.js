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
export declare function splitBy<T extends Record<string, unknown>, K extends keyof T, U extends Record<K, string | number>>(objects: U[], key: K): U[][];
/**
 * Splits an array of objects based on their values at a given key.
 * Objects without a value at the given key will be set under a `-1` index.
 */
export declare function splitByWithLeftovers<T extends Record<string, unknown>, K extends keyof T, U extends Record<K, string | number>>(objects: U[], key: K): U[][];
/**
 * Sorts the objects in the given array by a given key.
 * Returns a new array (does not mutate input).
 */
export declare function sortBy<T extends Record<string, unknown>, K extends keyof T, U extends Record<K, number>>(array: U[], key: K): U[];
/**
 * Completes a list of matches with blank matches based on the next matches.
 */
export declare function completeWithBlankMatches(bracketType: GroupType, matches: MatchWithMetadata[], nextMatches?: MatchWithMetadata[]): {
    matches: (MatchWithMetadata | null)[];
    fromToornament: boolean;
};
/**
 * Type guard: is this a Match (not a MatchGame)?
 */
export declare function isMatch(input: Match | MatchGame): input is Match;
/**
 * Type guard: is this a MatchGame (not a Match)?
 */
export declare function isMatchGame(input: Match | MatchGame): input is MatchGame;
