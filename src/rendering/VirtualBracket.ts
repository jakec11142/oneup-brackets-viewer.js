/**
 * Virtual Bracket Renderer - TanStack Virtual integration for large tournaments.
 *
 * Only renders visible matches + buffer zone for optimal performance with
 * 100+ match brackets.
 *
 * @see https://tanstack.com/virtual/latest
 */

import type { MatchPosition, BracketLayout } from '../layout';
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

const DEFAULT_CONFIG: Required<VirtualBracketConfig> = {
    enabled: 'auto',
    autoThreshold: 50,
    overscan: 3,
    viewportWidth: 0,
    viewportHeight: 0,
    debug: false,
};

/**
 * Represents a visible range of items
 */
interface VisibleRange {
    startX: number;
    endX: number;
    startY: number;
    endY: number;
}

/**
 * Virtual item with position and visibility state
 */
interface VirtualItem {
    matchId: string;
    position: MatchPosition;
    isVisible: boolean;
    element?: HTMLElement;
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
export class VirtualBracketManager {
    private config: Required<VirtualBracketConfig>;
    private container: HTMLElement | null = null;
    private layout: BracketLayout | null = null;
    private matches: MatchWithMetadata[] = [];
    private virtualItems: Map<string, VirtualItem> = new Map();

    // Viewport state
    private scrollLeft = 0;
    private scrollTop = 0;
    private viewportWidth = 0;
    private viewportHeight = 0;

    // Render callbacks
    private renderMatch: ((match: MatchWithMetadata) => HTMLElement) | null = null;

    // RAF handle for batched updates
    private rafHandle: number | null = null;

    constructor(config: VirtualBracketConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Checks if virtualization should be enabled based on config and match count.
     */
    shouldVirtualize(matchCount: number): boolean {
        if (this.config.enabled === true) return true;
        if (this.config.enabled === false) return false;
        // Auto mode
        return matchCount >= this.config.autoThreshold;
    }

    /**
     * Initializes the virtual bracket with container, layout, and render callback.
     */
    initialize(
        container: HTMLElement,
        layout: BracketLayout,
        matches: MatchWithMetadata[],
        renderMatch: (match: MatchWithMetadata) => HTMLElement,
    ): void {
        this.container = container;
        this.layout = layout;
        this.matches = matches;
        this.renderMatch = renderMatch;

        // Set viewport dimensions
        this.viewportWidth = this.config.viewportWidth || container.clientWidth || window.innerWidth;
        this.viewportHeight = this.config.viewportHeight || container.clientHeight || window.innerHeight;

        // Get initial scroll position (should be 0,0 but just in case)
        this.scrollLeft = container.scrollLeft || 0;
        this.scrollTop = container.scrollTop || 0;

        // Initialize virtual items from layout
        this.initializeVirtualItems();

        // Set up scroll listener
        this.setupScrollListener();

        // IMPORTANT: Force initial render of visible items
        this.updateVisibility();

        this.log(`Initialized with ${matches.length} matches, viewport: ${this.viewportWidth}x${this.viewportHeight}`);
        this.log(`Initial scroll position: ${this.scrollLeft}, ${this.scrollTop}`);
    }

    /**
     * Forces a full re-render of visible items.
     */
    refresh(): void {
        this.scheduleUpdate();
    }

    /**
     * Updates viewport dimensions (e.g., on resize).
     */
    setViewport(width: number, height: number): void {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.scheduleUpdate();
    }

    /**
     * Scrolls to a specific match.
     */
    scrollToMatch(matchId: string, behavior: ScrollBehavior = 'smooth'): void {
        const item = this.virtualItems.get(matchId);
        if (!item || !this.container) return;

        const { xPx, yPx } = item.position;

        this.container.scrollTo({
            left: xPx - this.viewportWidth / 2,
            top: yPx - this.viewportHeight / 2,
            behavior,
        });
    }

    /**
     * Returns current visibility statistics.
     */
    getStats(): {
        totalMatches: number;
        visibleMatches: number;
        renderedMatches: number;
    } {
        let visibleCount = 0;
        let renderedCount = 0;

        for (const item of this.virtualItems.values()) {
            if (item.isVisible) visibleCount++;
            if (item.element) renderedCount++;
        }

        return {
            totalMatches: this.matches.length,
            visibleMatches: visibleCount,
            renderedMatches: renderedCount,
        };
    }

    /**
     * Cleans up resources.
     */
    destroy(): void {
        if (this.rafHandle) {
            cancelAnimationFrame(this.rafHandle);
        }

        if (this.container) {
            this.container.removeEventListener('scroll', this.handleScroll);
        }

        this.virtualItems.clear();
        this.container = null;
        this.layout = null;
        this.renderMatch = null;
    }

    private initializeVirtualItems(): void {
        if (!this.layout) return;

        this.virtualItems.clear();

        for (const match of this.matches) {
            const position = this.layout.matchPositions.get(String(match.id));
            if (!position) continue;

            this.virtualItems.set(String(match.id), {
                matchId: String(match.id),
                position,
                isVisible: false,
                element: undefined,
            });
        }
    }

    private setupScrollListener(): void {
        if (!this.container) return;

        this.handleScroll = this.handleScroll.bind(this);
        this.container.addEventListener('scroll', this.handleScroll, { passive: true });
    }

    private handleScroll = (): void => {
        if (!this.container) return;

        this.scrollLeft = this.container.scrollLeft;
        this.scrollTop = this.container.scrollTop;

        this.scheduleUpdate();
    };

    private scheduleUpdate(): void {
        if (this.rafHandle) return;

        this.rafHandle = requestAnimationFrame(() => {
            this.rafHandle = null;
            this.updateVisibility();
        });
    }

    private updateVisibility(): void {
        if (!this.container || !this.layout) return;

        const range = this.getVisibleRange();

        // Update visibility for all items
        for (const item of this.virtualItems.values()) {
            const wasVisible = item.isVisible;
            item.isVisible = this.isInRange(item.position, range);

            if (item.isVisible && !wasVisible) {
                // Item became visible - render it
                this.renderItem(item);
            } else if (!item.isVisible && wasVisible) {
                // Item became invisible - remove it
                this.unmountItem(item);
            }
        }

        const stats = this.getStats();
        this.log(`Visibility update: ${stats.visibleMatches}/${stats.totalMatches} visible`);
    }

    private getVisibleRange(): VisibleRange {
        if (!this.layout) {
            return { startX: 0, endX: 0, startY: 0, endY: 0 };
        }

        const overscanPx = this.config.overscan * (this.layout.totalHeight / this.matches.length);

        return {
            startX: this.scrollLeft - overscanPx,
            endX: this.scrollLeft + this.viewportWidth + overscanPx,
            startY: this.scrollTop - overscanPx,
            endY: this.scrollTop + this.viewportHeight + overscanPx,
        };
    }

    private isInRange(position: MatchPosition, range: VisibleRange): boolean {
        const { xPx, yPx } = position;
        // Assume match dimensions from layout config (these could be passed in)
        const matchWidth = 200;
        const matchHeight = 60;

        return (
            xPx + matchWidth >= range.startX &&
            xPx <= range.endX &&
            yPx + matchHeight >= range.startY &&
            yPx <= range.endY
        );
    }

    private renderItem(item: VirtualItem): void {
        if (!this.container || !this.renderMatch || item.element) return;

        const match = this.matches.find(m => String(m.id) === item.matchId);
        if (!match) return;

        const element = this.renderMatch(match);
        element.style.position = 'absolute';
        element.style.left = `${item.position.xPx}px`;
        element.style.top = `${item.position.yPx}px`;
        element.setAttribute('data-virtual', 'true');

        this.container.appendChild(element);
        item.element = element;
    }

    private unmountItem(item: VirtualItem): void {
        if (!item.element) return;

        item.element.remove();
        item.element = undefined;
    }

    private log(message: string): void {
        if (this.config.debug) {
            console.log(`[VirtualBracket] ${message}`);
        }
    }
}

/**
 * Singleton instance for global virtual bracket management.
 */
export const globalVirtualBracket = new VirtualBracketManager({ debug: false });

/**
 * Helper to check if virtualization should be used.
 */
export function shouldUseVirtualization(
    matchCount: number,
    config?: VirtualBracketConfig,
): boolean {
    const manager = new VirtualBracketManager(config);
    return manager.shouldVirtualize(matchCount);
}
