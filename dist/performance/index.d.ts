/**
 * Performance Module - Exports all performance optimization utilities.
 *
 * This module provides:
 * - Layout caching for faster re-renders
 * - SVG connector pooling for reduced memory churn
 * - Performance monitoring utilities
 */
export { LayoutCache, globalLayoutCache, cachedComputeLayout, type LayoutCacheConfig, } from '../cache/LayoutCache';
export { SVGConnectorPool, globalConnectorPool, createPooledConnectorSVG, type SVGPoolConfig, } from '../rendering/SVGConnectorPool';
export { PerformanceMonitor, globalPerfMonitor } from './PerformanceMonitor';
/**
 * Performance configuration for BracketsViewer.
 */
export interface PerformanceConfig {
    /**
     * Enable layout caching.
     * @default true
     */
    enableCache?: boolean;
    /**
     * Enable SVG connector pooling.
     * @default true
     */
    enableSVGPooling?: boolean;
    /**
     * Enable performance monitoring.
     * @default false
     */
    enableMonitoring?: boolean;
}
/**
 * Default performance configuration.
 */
export declare const DEFAULT_PERF_CONFIG: Required<PerformanceConfig>;
/**
 * Applies performance configuration globally.
 */
export declare function configurePerformance(config: PerformanceConfig): void;
