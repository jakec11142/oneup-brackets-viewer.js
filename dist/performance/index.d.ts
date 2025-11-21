/**
 * Performance Module - Exports all performance optimization utilities.
 *
 * This module provides:
 * - Layout caching for faster re-renders
 * - SVG connector pooling for reduced memory churn
 * - Virtual scrolling for large brackets
 * - Performance monitoring utilities
 */
export { LayoutCache, globalLayoutCache, cachedComputeLayout, type LayoutCacheConfig, } from '../cache/LayoutCache';
export { SVGConnectorPool, globalConnectorPool, createPooledConnectorSVG, type SVGPoolConfig, } from '../rendering/SVGConnectorPool';
export { VirtualBracketManager, globalVirtualBracket, shouldUseVirtualization, type VirtualBracketConfig, } from '../rendering/VirtualBracket';
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
     * Enable virtual scrolling for large brackets.
     * @default 'auto' (enabled for 50+ matches)
     */
    enableVirtualization?: boolean | 'auto';
    /**
     * Threshold for auto-enabling virtualization.
     * @default 50
     */
    virtualizationThreshold?: number;
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
