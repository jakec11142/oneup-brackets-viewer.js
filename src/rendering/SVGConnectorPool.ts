/**
 * SVG Connector Pool - Object pooling for SVG connector elements.
 *
 * Reduces memory churn and improves performance by reusing SVG elements
 * instead of creating/destroying them on each render.
 */

import type { ConnectorLine, Point } from '../layout';

/**
 * Configuration for the SVG connector pool
 */
export interface SVGPoolConfig {
    /** Initial pool size (default: 100) */
    initialSize?: number;
    /** Maximum pool size (default: 500) */
    maxSize?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
}

const DEFAULT_CONFIG: Required<SVGPoolConfig> = {
    initialSize: 100,
    maxSize: 500,
    debug: false,
};

/**
 * Object pool for SVG polyline elements.
 *
 * Features:
 * - Pre-allocated pool of SVG elements
 * - Automatic expansion up to maxSize
 * - Efficient acquire/release operations
 * - Batch rendering with requestAnimationFrame
 */
export class SVGConnectorPool {
    private pool: SVGPolylineElement[] = [];
    private active = new Set<SVGPolylineElement>();
    private config: Required<SVGPoolConfig>;
    private svg: SVGSVGElement | null = null;

    // Statistics
    private totalCreated = 0;
    private peakActive = 0;

    constructor(config: SVGPoolConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Initializes or updates the SVG container.
     */
    setSVGContainer(svg: SVGSVGElement): void {
        this.svg = svg;

        // Pre-populate pool if empty
        if (this.pool.length === 0) {
            this.expandPool(this.config.initialSize);
        }
    }

    /**
     * Acquires a polyline element from the pool.
     */
    acquire(): SVGPolylineElement | null {
        // Try to get from pool
        let element = this.pool.pop();

        // Create new if pool empty and under max
        if (!element && this.totalCreated < this.config.maxSize) {
            element = this.createElement();
        }

        if (element) {
            this.active.add(element);
            this.peakActive = Math.max(this.peakActive, this.active.size);

            // Ensure element is in the SVG
            if (this.svg && !element.parentNode) {
                this.svg.appendChild(element);
            }

            return element;
        }

        this.log(`Pool exhausted! (max: ${this.config.maxSize})`);
        return null;
    }

    /**
     * Releases a polyline element back to the pool.
     */
    release(element: SVGPolylineElement): void {
        if (!this.active.has(element)) {
            return; // Not from our pool
        }

        this.active.delete(element);

        // Reset element state
        element.setAttribute('points', '');
        element.setAttribute('class', '');
        element.removeAttribute('style');

        // Hide but keep in DOM for faster reuse
        element.setAttribute('visibility', 'hidden');

        this.pool.push(element);
    }

    /**
     * Releases all active elements back to the pool.
     */
    releaseAll(): void {
        for (const element of this.active) {
            element.setAttribute('points', '');
            element.setAttribute('class', '');
            element.removeAttribute('style');
            element.setAttribute('visibility', 'hidden');
            this.pool.push(element);
        }
        this.active.clear();
    }

    /**
     * Renders connectors using pooled elements with RAF batching.
     */
    renderConnectors(
        connectors: ConnectorLine[],
        width: number,
        height: number,
    ): SVGSVGElement {
        // Create or update SVG container
        if (!this.svg) {
            this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svg.setAttribute('class', 'bracket-connectors');
        }

        this.svg.setAttribute('width', width.toString());
        this.svg.setAttribute('height', height.toString());

        // Release all currently active elements
        this.releaseAll();

        // Use RAF for smooth rendering
        requestAnimationFrame(() => {
            this.batchRenderConnectors(connectors);
        });

        return this.svg;
    }

    /**
     * Synchronous render for immediate display.
     */
    renderConnectorsSync(
        connectors: ConnectorLine[],
        width: number,
        height: number,
    ): SVGSVGElement {
        // Create or update SVG container
        if (!this.svg) {
            this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svg.setAttribute('class', 'bracket-connectors');
        }

        this.svg.setAttribute('width', width.toString());
        this.svg.setAttribute('height', height.toString());

        // Release all currently active elements
        this.releaseAll();

        // Render immediately
        this.batchRenderConnectors(connectors);

        return this.svg;
    }

    /**
     * Returns pool statistics.
     */
    getStats(): {
        poolSize: number;
        activeCount: number;
        totalCreated: number;
        peakActive: number;
    } {
        return {
            poolSize: this.pool.length,
            activeCount: this.active.size,
            totalCreated: this.totalCreated,
            peakActive: this.peakActive,
        };
    }

    /**
     * Clears the pool and removes all elements.
     */
    destroy(): void {
        this.releaseAll();

        // Remove all elements from DOM
        for (const element of this.pool) {
            element.remove();
        }

        this.pool = [];
        this.active.clear();
        this.svg = null;
        this.totalCreated = 0;
        this.peakActive = 0;
    }

    private batchRenderConnectors(connectors: ConnectorLine[]): void {
        for (const conn of connectors) {
            const polyline = this.acquire();
            if (!polyline) continue;

            // Set points
            const pointsStr = conn.points.map(p => `${p.x},${p.y}`).join(' ');
            polyline.setAttribute('points', pointsStr);
            polyline.setAttribute('fill', 'none');
            polyline.setAttribute('visibility', 'visible');

            // Apply connector type styling
            polyline.setAttribute('class', `connector-${conn.connectorType}`);

            switch (conn.connectorType) {
                case 'cross-bracket':
                    polyline.setAttribute('stroke', 'var(--bv-connector-cross-bracket)');
                    polyline.setAttribute('stroke-width', '1.5');
                    polyline.setAttribute('opacity', '0.3');
                    polyline.setAttribute('stroke-dasharray', '4,3');
                    break;

                case 'grand-final':
                    polyline.setAttribute('stroke', 'var(--bv-connector-grand-final)');
                    polyline.setAttribute('stroke-width', '3');
                    polyline.setAttribute('opacity', '1');
                    break;

                case 'internal':
                default:
                    polyline.setAttribute('stroke', 'var(--bv-connector-internal)');
                    polyline.setAttribute('stroke-width', '2');
                    polyline.setAttribute('opacity', '0.8');
                    break;
            }
        }
    }

    private createElement(): SVGPolylineElement {
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        element.setAttribute('visibility', 'hidden');
        this.totalCreated++;
        this.log(`Created element #${this.totalCreated}`);
        return element;
    }

    private expandPool(count: number): void {
        const toCreate = Math.min(count, this.config.maxSize - this.totalCreated);

        for (let i = 0; i < toCreate; i++) {
            this.pool.push(this.createElement());
        }

        this.log(`Pool expanded by ${toCreate} elements (total: ${this.totalCreated})`);
    }

    private log(message: string): void {
        if (this.config.debug) {
            console.log(`[SVGConnectorPool] ${message}`);
        }
    }
}

/**
 * Singleton instance for global SVG connector pooling.
 */
export const globalConnectorPool = new SVGConnectorPool({ debug: false });

/**
 * Creates an optimized SVG element using the connector pool.
 * Drop-in replacement for dom.createConnectorSVG.
 */
export function createPooledConnectorSVG(
    connectors: ConnectorLine[],
    width: number,
    height: number,
    options?: { async?: boolean },
): SVGSVGElement {
    if (options?.async) {
        return globalConnectorPool.renderConnectors(connectors, width, height);
    }
    return globalConnectorPool.renderConnectorsSync(connectors, width, height);
}
