/**
 * SVG Connector Pool - Object pooling for SVG connector elements.
 *
 * Reduces memory churn and improves performance by reusing SVG elements
 * instead of creating/destroying them on each render.
 */
import type { ConnectorLine } from '../layout';
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
/**
 * Object pool for SVG polyline elements.
 *
 * Features:
 * - Pre-allocated pool of SVG elements
 * - Automatic expansion up to maxSize
 * - Efficient acquire/release operations
 * - Batch rendering with requestAnimationFrame
 */
export declare class SVGConnectorPool {
    private pool;
    private active;
    private config;
    private svg;
    private totalCreated;
    private peakActive;
    constructor(config?: SVGPoolConfig);
    /**
     * Initializes or updates the SVG container.
     */
    setSVGContainer(svg: SVGSVGElement): void;
    /**
     * Acquires a polyline element from the pool.
     */
    acquire(): SVGPolylineElement | null;
    /**
     * Releases a polyline element back to the pool.
     */
    release(element: SVGPolylineElement): void;
    /**
     * Releases all active elements back to the pool.
     */
    releaseAll(): void;
    /**
     * Renders connectors using pooled elements with RAF batching.
     */
    renderConnectors(connectors: ConnectorLine[], width: number, height: number): SVGSVGElement;
    /**
     * Synchronous render for immediate display.
     */
    renderConnectorsSync(connectors: ConnectorLine[], width: number, height: number): SVGSVGElement;
    /**
     * Returns pool statistics.
     */
    getStats(): {
        poolSize: number;
        activeCount: number;
        totalCreated: number;
        peakActive: number;
    };
    /**
     * Clears the pool and removes all elements.
     */
    destroy(): void;
    private batchRenderConnectors;
    private createElement;
    private expandPool;
    private log;
}
/**
 * Singleton instance for global SVG connector pooling.
 */
export declare const globalConnectorPool: SVGConnectorPool;
/**
 * Creates an optimized SVG element using the connector pool.
 * Drop-in replacement for dom.createConnectorSVG.
 */
export declare function createPooledConnectorSVG(connectors: ConnectorLine[], width: number, height: number, options?: {
    async?: boolean;
}): SVGSVGElement;
