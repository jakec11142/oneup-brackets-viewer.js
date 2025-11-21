/**
 * Virtual Bracket Renderer - TanStack Virtual integration for large tournaments.
 *
 * Only renders visible matches + buffer zone for optimal performance with
 * 100+ match brackets.
 *
 * @see https://tanstack.com/virtual/latest
 */
import type { BracketLayout } from '../layout';
import type { MatchWithMetadata } from '../types';
/**
 * Configuration for virtual bracket rendering
 */
export interface VirtualBracketConfig {
    /** Enable virtualization (default: auto - enabled for 50+ matches) */
    enabled?: boolean | 'auto';
    /** Threshold for auto-enabling virtualization (default: 50) */
    autoThreshold?: number;
    /** Number of items to render outside visible area (default: 3) */
    overscan?: number;
    /** Viewport width in pixels (default: container width) */
    viewportWidth?: number;
    /** Viewport height in pixels (default: container height) */
    viewportHeight?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
}
/**
 * Virtual Bracket Manager for efficient large bracket rendering.
 *
 * Key features:
 * - Only renders matches within the visible viewport + overscan buffer
 * - Supports both horizontal (rounds) and vertical (matches) virtualization
 * - Smooth scrolling with momentum
 * - Placeholder elements for off-screen matches
 */
export declare class VirtualBracketManager {
    private config;
    private container;
    private layout;
    private matches;
    private virtualItems;
    private scrollLeft;
    private scrollTop;
    private viewportWidth;
    private viewportHeight;
    private renderMatch;
    private rafHandle;
    constructor(config?: VirtualBracketConfig);
    /**
     * Checks if virtualization should be enabled based on config and match count.
     */
    shouldVirtualize(matchCount: number): boolean;
    /**
     * Initializes the virtual bracket with container, layout, and render callback.
     */
    initialize(container: HTMLElement, layout: BracketLayout, matches: MatchWithMetadata[], renderMatch: (match: MatchWithMetadata) => HTMLElement): void;
    /**
     * Forces a full re-render of visible items.
     */
    refresh(): void;
    /**
     * Updates viewport dimensions (e.g., on resize).
     */
    setViewport(width: number, height: number): void;
    /**
     * Scrolls to a specific match.
     */
    scrollToMatch(matchId: string, behavior?: ScrollBehavior): void;
    /**
     * Returns current visibility statistics.
     */
    getStats(): {
        totalMatches: number;
        visibleMatches: number;
        renderedMatches: number;
    };
    /**
     * Cleans up resources.
     */
    destroy(): void;
    private initializeVirtualItems;
    private setupScrollListener;
    private handleScroll;
    private scheduleUpdate;
    private updateVisibility;
    private getVisibleRange;
    private isInRange;
    private renderItem;
    private unmountItem;
    private log;
}
/**
 * Singleton instance for global virtual bracket management.
 */
export declare const globalVirtualBracket: VirtualBracketManager;
/**
 * Helper to check if virtualization should be used.
 */
export declare function shouldUseVirtualization(matchCount: number, config?: VirtualBracketConfig): boolean;
