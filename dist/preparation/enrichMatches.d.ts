/**
 * Match enrichment — pure functions that attach layout metadata to matches.
 *
 * SSR-safe: imports only from utils/pure.ts, NOT from helpers.ts or lang.ts.
 * Used by both the DOM renderers and the headless computeBracketLayout().
 */
import type { GroupType } from 'brackets-model';
import type { MatchWithMetadata } from '../types';
/**
 * Maps a group_id string to a bracket GroupType.
 */
export declare function getMatchLocation(groupId: string): GroupType;
/**
 * Enriches matches for double elimination.
 * Assigns roundNumber, roundCount, matchLocation, and connectFinal to each match's metadata.
 */
export declare function enrichForDoubleElimination(matchesByGroup: MatchWithMetadata[][]): MatchWithMetadata[];
/**
 * Enriches matches for single elimination.
 * Assigns roundNumber, roundCount, and matchLocation to each match's metadata.
 */
export declare function enrichForSingleElimination(matchesByGroup: MatchWithMetadata[][]): MatchWithMetadata[];
/**
 * Enriches matches for Swiss format.
 * Assigns roundNumber, roundCount, matchLocation, and Swiss-specific metadata.
 */
export declare function enrichForSwiss(matchesByGroup: MatchWithMetadata[][]): MatchWithMetadata[];
