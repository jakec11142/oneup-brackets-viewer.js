/**
 * Layout caching system for bracket rendering optimization.
 *
 * Uses content-based hashing to cache computed layouts and avoid
 * expensive recalculations when data hasn't changed.
 */
import type { BracketLayout } from '../layout';
import type { LayoutConfig } from '../viewModels';
import type { Match } from 'brackets-model';
import type { BracketEdgeResponse } from '../dto/types';
/**
 * Configuration for the layout cache
 */
export interface LayoutCacheConfig {
    /** Maximum number of entries to cache (default: 50) */
    maxEntries?: number;
    /** Time-to-live in milliseconds (default: 5 minutes) */
    ttlMs?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
}
/**
 * Layout cache for storing and retrieving computed bracket layouts.
 *
 * Features:
 * - Content-based cache keys (only recalculates when data changes)
 * - LRU eviction when cache is full
 * - TTL-based expiration
 * - Hit/miss statistics for monitoring
 */
export declare class LayoutCache {
    private cache;
    private config;
    private hits;
    private misses;
    constructor(config?: LayoutCacheConfig);
    /**
     * Gets a cached layout or returns undefined if not found/expired.
     */
    get(matches: Match[], edges: BracketEdgeResponse[], bracketType: string, layoutConfig: LayoutConfig): BracketLayout | undefined;
    /**
     * Stores a computed layout in the cache.
     */
    set(matches: Match[], edges: BracketEdgeResponse[], bracketType: string, layoutConfig: LayoutConfig, layout: BracketLayout): void;
    /**
     * Clears the entire cache.
     */
    clear(): void;
    /**
     * Invalidates cache entries for specific match IDs.
     * Useful for selective invalidation when only some matches update.
     */
    invalidateMatches(matchIds: Set<string | number>): number;
    /**
     * Returns cache statistics.
     */
    getStats(): {
        hits: number;
        misses: number;
        size: number;
        hitRate: number;
    };
    /**
     * Evicts the least recently used entry (lowest hit count).
     */
    private evictLRU;
    private log;
}
/**
 * Singleton instance for global layout caching.
 */
export declare const globalLayoutCache: LayoutCache;
/**
 * Wrapper function that adds caching to computeLayout.
 * Use this instead of calling computeLayout directly.
 */
export declare function cachedComputeLayout(computeLayout: (matches: Match[], edges: BracketEdgeResponse[], bracketType: string, layoutConfig: LayoutConfig) => BracketLayout, matches: Match[], edges: BracketEdgeResponse[], bracketType: string, layoutConfig: LayoutConfig, options?: {
    bypassCache?: boolean;
}): BracketLayout;
