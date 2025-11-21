/**
 * TanStack Virtual Manager - Proper virtualization for large brackets.
 *
 * Uses @tanstack/virtual-core for efficient rendering of large tournament brackets.
 */

import {
    Virtualizer,
    observeElementRect,
    observeElementOffset,
    elementScroll,
    type VirtualizerOptions,
} from '@tanstack/virtual-core';
import type { MatchPosition, BracketLayout } from '../layout';
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

const DEFAULT_CONFIG: Required<TanStackVirtualConfig> = {
    enabled: 'auto',
    autoThreshold: 50,
    overscan: 3,
    debug: false,
};

/**
 * TanStack Virtual Manager for efficient large bracket rendering.
 */
export class TanStackVirtualManager {
    private config: Required<TanStackVirtualConfig>;
    private container: HTMLElement | null = null;
    private layout: BracketLayout | null = null;
    private matches: MatchWithMetadata[] = [];
    private virtualizer: Virtualizer<HTMLElement, HTMLElement> | null = null;
    private renderMatch: ((match: MatchWithMetadata) => HTMLElement) | null = null;
    private renderedElements: Map<string, HTMLElement> = new Map();

    constructor(config: TanStackVirtualConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Initializes the virtual bracket with container, layout, and render callback.
     */
    initialize(
        scrollContainer: HTMLElement,  // The element with scrollbars (.brackets-viewer)
        layout: BracketLayout,
        matches: MatchWithMetadata[],
        renderMatch: (match: MatchWithMetadata) => HTMLElement,
        renderTarget?: HTMLElement  // Where to render matches (roundsContainer)
    ): void {
        this.container = scrollContainer;
        this.layout = layout;
        this.matches = matches;
        this.renderMatch = renderMatch;

        // Use existing render target or create inner container
        const innerContainer = renderTarget || (() => {
            const inner = document.createElement('div');
            inner.style.position = 'relative';
            inner.style.width = '100%';
            inner.style.height = '100%';
            scrollContainer.appendChild(inner);
            return inner;
        })();

        // Get match positions as an array sorted by Y position
        const matchItems = matches.map(match => {
            const pos = layout.matchPositions.get(String(match.id));
            return {
                match,
                position: pos,
                id: String(match.id)
            };
        }).filter(item => item.position !== undefined);

        // Sort by Y position for vertical virtualization
        matchItems.sort((a, b) => (a.position?.yPx || 0) - (b.position?.yPx || 0));

        // Log container dimensions for debugging
        console.log(`[TanStackVirtual] Scroll container dimensions: ${scrollContainer.offsetWidth}x${scrollContainer.offsetHeight}`);
        console.log(`[TanStackVirtual] Layout total: ${layout.totalWidth}x${layout.totalHeight}`);
        console.log(`[TanStackVirtual] Match items to virtualize: ${matchItems.length}`);
        console.log(`[TanStackVirtual] Scroll container element:`, scrollContainer.className || scrollContainer.tagName);

        // Create the virtualizer with the scrollable container
        this.virtualizer = new Virtualizer({
            count: matchItems.length,
            getScrollElement: () => scrollContainer,  // The element with scrollbars
            estimateSize: () => 80, // Estimated match height
            overscan: this.config.overscan,
            observeElementRect: observeElementRect,
            observeElementOffset: observeElementOffset,
            scrollToFn: elementScroll,
        });

        // Force initial render BEFORE setting up listeners
        this.virtualizer._willUpdate();

        // Initial update to render visible items
        console.log(`[TanStackVirtual] Calling initial updateVirtualItems...`);
        this.updateVirtualItems(innerContainer, matchItems);

        // Set up scroll listener for updates on the SCROLLABLE container
        scrollContainer.addEventListener('scroll', () => {
            console.log(`[TanStackVirtual] Scroll event triggered`);
            this.updateVirtualItems(innerContainer, matchItems);
        }, { passive: true });

        this.log(`Initialized TanStack Virtual with ${matches.length} matches`);
    }

    /**
     * Updates the virtual items based on current scroll position.
     */
    private updateVirtualItems(innerContainer: HTMLElement, matchItems: any[]): void {
        if (!this.virtualizer || !this.renderMatch) return;

        const virtualItems = this.virtualizer.getVirtualItems();
        console.log(`[TanStackVirtual] Virtual items from TanStack:`, virtualItems.length);
        console.log(`[TanStackVirtual] Virtual items details:`, virtualItems.map(vi => ({
            index: vi.index,
            start: vi.start,
            end: vi.end,
            size: vi.size
        })));

        // Remove items that are no longer visible
        const visibleIds = new Set(virtualItems.map(vi => matchItems[vi.index].id));
        for (const [id, element] of this.renderedElements) {
            if (!visibleIds.has(id)) {
                element.remove();
                this.renderedElements.delete(id);
            }
        }

        // Render visible items
        for (const virtualItem of virtualItems) {
            const item = matchItems[virtualItem.index];
            if (!item) {
                console.warn(`[TanStackVirtual] No item at index ${virtualItem.index}`);
                continue;
            }
            if (this.renderedElements.has(item.id)) continue;

            console.log(`[TanStackVirtual] Rendering match ${item.id} at position:`, item.position);
            const element = this.renderMatch(item.match);
            element.style.position = 'absolute';
            element.style.left = `${item.position.xPx}px`;
            element.style.top = `${item.position.yPx}px`;
            element.setAttribute('data-virtual', 'true');

            innerContainer.appendChild(element);
            this.renderedElements.set(item.id, element);
        }

        // Don't set height on inner container - matches are absolutely positioned
        // Setting height would defeat virtualization by making everything "visible"
        // innerContainer.style.height is left auto
        innerContainer.style.width = `${this.layout?.totalWidth || 0}px`;

        const stats = this.getStats();
        this.log(`Updated: ${stats.renderedMatches}/${stats.totalMatches} matches visible`);
    }

    /**
     * Returns current visibility statistics.
     */
    getStats(): {
        totalMatches: number;
        renderedMatches: number;
    } {
        return {
            totalMatches: this.matches.length,
            renderedMatches: this.renderedElements.size,
        };
    }

    /**
     * Cleans up resources.
     */
    destroy(): void {
        this.renderedElements.forEach(el => el.remove());
        this.renderedElements.clear();
        this.virtualizer = null;
        this.container = null;
        this.layout = null;
        this.renderMatch = null;
    }

    private log(message: string): void {
        if (this.config.debug) {
            console.log(`[TanStackVirtual] ${message}`);
        }
    }
}