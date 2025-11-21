/**
 * TanStack Virtual Manager - Proper virtualization for large brackets.
 *
 * Uses @tanstack/virtual-core for efficient rendering of large tournament brackets.
 */
import type { BracketLayout } from '../layout';
import type { MatchWithMetadata } from '../types';
/**
 * Configuration for TanStack virtual bracket rendering
 */
export interface TanStackVirtualConfig {
    /** Enable virtualization (default: auto - enabled for 50+ matches) */
    enabled?: boolean | 'auto';
    /** Threshold for auto-enabling virtualization (default: 50) */
    autoThreshold?: number;
    /** Number of items to render outside visible area (default: 3) */
    overscan?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
}
/**
 * TanStack Virtual Manager for efficient large bracket rendering.
 */
export declare class TanStackVirtualManager {
    private config;
    private container;
    private layout;
    private matches;
    private virtualizer;
    private renderMatch;
    private renderedElements;
    constructor(config?: TanStackVirtualConfig);
    /**
     * Initializes the virtual bracket with container, layout, and render callback.
     */
    initialize(container: HTMLElement, layout: BracketLayout, matches: MatchWithMetadata[], renderMatch: (match: MatchWithMetadata) => HTMLElement): void;
    /**
     * Updates the virtual items based on current scroll position.
     */
    private updateVirtualItems;
    /**
     * Returns current visibility statistics.
     */
    getStats(): {
        totalMatches: number;
        renderedMatches: number;
    };
    /**
     * Cleans up resources.
     */
    destroy(): void;
    private log;
}
