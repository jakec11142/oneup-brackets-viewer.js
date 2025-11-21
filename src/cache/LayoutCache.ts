/**
 * Layout caching system for bracket rendering optimization.
 *
 * Uses content-based hashing to cache computed layouts and avoid
 * expensive recalculations when data hasn't changed.
 */

import type { BracketLayout, MatchPosition } from '../layout';
import type { LayoutConfig } from '../viewModels';
import type { Match } from 'brackets-model';
import type { BracketEdgeResponse } from '../dto/types';

/**
 * Cache entry with layout data and metadata
 */
interface CacheEntry {
    layout: BracketLayout;
    timestamp: number;
    hits: number;
}

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

const DEFAULT_CONFIG: Required<LayoutCacheConfig> = {
    maxEntries: 50,
    ttlMs: 5 * 60 * 1000, // 5 minutes
    debug: false,
};

/**
 * Generates a hash key from layout inputs for cache lookup.
 * Uses a fast string-based hash for performance.
 */
function generateCacheKey(
    matches: Match[],
    edges: BracketEdgeResponse[],
    bracketType: string,
    layoutConfig: LayoutConfig,
): string {
    // Create a deterministic string representation of inputs
    const matchIds = matches.map(m => `${m.id}:${m.status}:${m.opponent1?.score ?? '-'}:${m.opponent2?.score ?? '-'}`).sort().join('|');
    const edgeIds = edges.map(e => `${e.fromMatchId}->${e.toMatchId}`).sort().join('|');

    // Include key layout config properties that affect output
    const configKey = [
        layoutConfig.matchWidth,
        layoutConfig.matchHeight,
        layoutConfig.columnWidth,
        layoutConfig.rowHeight,
        layoutConfig.bracketAlignment,
        layoutConfig.topOffset,
        layoutConfig.leftOffset,
    ].join(':');

    // Fast string hash (djb2 algorithm)
    const str = `${bracketType}|${matchIds}|${edgeIds}|${configKey}`;
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash.toString(36);
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
export class LayoutCache {
    private cache = new Map<string, CacheEntry>();
    private config: Required<LayoutCacheConfig>;

    // Statistics
    private hits = 0;
    private misses = 0;

    constructor(config: LayoutCacheConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Gets a cached layout or returns undefined if not found/expired.
     */
    get(
        matches: Match[],
        edges: BracketEdgeResponse[],
        bracketType: string,
        layoutConfig: LayoutConfig,
    ): BracketLayout | undefined {
        const key = generateCacheKey(matches, edges, bracketType, layoutConfig);
        const entry = this.cache.get(key);

        if (!entry) {
            this.misses++;
            this.log(`Cache MISS: ${key.substring(0, 8)}...`);
            return undefined;
        }

        // Check TTL
        if (Date.now() - entry.timestamp > this.config.ttlMs) {
            this.cache.delete(key);
            this.misses++;
            this.log(`Cache EXPIRED: ${key.substring(0, 8)}...`);
            return undefined;
        }

        // Update hit count and return
        entry.hits++;
        this.hits++;
        this.log(`Cache HIT: ${key.substring(0, 8)}... (hits: ${entry.hits})`);
        return entry.layout;
    }

    /**
     * Stores a computed layout in the cache.
     */
    set(
        matches: Match[],
        edges: BracketEdgeResponse[],
        bracketType: string,
        layoutConfig: LayoutConfig,
        layout: BracketLayout,
    ): void {
        const key = generateCacheKey(matches, edges, bracketType, layoutConfig);

        // Evict if at capacity (LRU based on hits)
        if (this.cache.size >= this.config.maxEntries) {
            this.evictLRU();
        }

        this.cache.set(key, {
            layout,
            timestamp: Date.now(),
            hits: 0,
        });

        this.log(`Cache SET: ${key.substring(0, 8)}... (size: ${this.cache.size})`);
    }

    /**
     * Clears the entire cache.
     */
    clear(): void {
        this.cache.clear();
        this.log('Cache CLEARED');
    }

    /**
     * Invalidates cache entries for specific match IDs.
     * Useful for selective invalidation when only some matches update.
     */
    invalidateMatches(matchIds: Set<string | number>): number {
        let invalidated = 0;

        // Since we use content-based keys, we can't easily identify
        // which entries contain specific matches. For selective invalidation,
        // we'd need to store match IDs with each entry.
        // For now, clear all entries (conservative approach).
        if (matchIds.size > 0) {
            invalidated = this.cache.size;
            this.cache.clear();
            this.log(`Cache INVALIDATED: ${invalidated} entries`);
        }

        return invalidated;
    }

    /**
     * Returns cache statistics.
     */
    getStats(): { hits: number; misses: number; size: number; hitRate: number } {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            size: this.cache.size,
            hitRate: total > 0 ? this.hits / total : 0,
        };
    }

    /**
     * Evicts the least recently used entry (lowest hit count).
     */
    private evictLRU(): void {
        let minHits = Infinity;
        let minKey: string | null = null;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.hits < minHits) {
                minHits = entry.hits;
                minKey = key;
            }
        }

        if (minKey) {
            this.cache.delete(minKey);
            this.log(`Cache EVICTED: ${minKey.substring(0, 8)}... (hits: ${minHits})`);
        }
    }

    private log(message: string): void {
        if (this.config.debug) {
            console.log(`[LayoutCache] ${message}`);
        }
    }
}

/**
 * Singleton instance for global layout caching.
 */
export const globalLayoutCache = new LayoutCache({ debug: false });

/**
 * Wrapper function that adds caching to computeLayout.
 * Use this instead of calling computeLayout directly.
 */
export function cachedComputeLayout(
    computeLayout: (
        matches: Match[],
        edges: BracketEdgeResponse[],
        bracketType: string,
        layoutConfig: LayoutConfig,
    ) => BracketLayout,
    matches: Match[],
    edges: BracketEdgeResponse[],
    bracketType: string,
    layoutConfig: LayoutConfig,
    options?: { bypassCache?: boolean },
): BracketLayout {
    // Check cache first (unless bypassed)
    if (!options?.bypassCache) {
        const cached = globalLayoutCache.get(matches, edges, bracketType, layoutConfig);
        if (cached) {
            return cached;
        }
    }

    // Compute layout
    const layout = computeLayout(matches, edges, bracketType, layoutConfig);

    // Store in cache
    globalLayoutCache.set(matches, edges, bracketType, layoutConfig, layout);

    return layout;
}
