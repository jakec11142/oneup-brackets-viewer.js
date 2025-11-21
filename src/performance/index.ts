/**
 * Performance Module - Exports all performance optimization utilities.
 *
 * This module provides:
 * - Layout caching for faster re-renders
 * - SVG connector pooling for reduced memory churn
 * - Virtual scrolling for large brackets
 * - Performance monitoring utilities
 */

// Import for internal use
import { globalLayoutCache as _layoutCache } from '../cache/LayoutCache';
import { globalPerfMonitor as _perfMonitor } from './PerformanceMonitor';

// Layout caching
export {
    LayoutCache,
    globalLayoutCache,
    cachedComputeLayout,
    type LayoutCacheConfig,
} from '../cache/LayoutCache';

// SVG connector pooling
export {
    SVGConnectorPool,
    globalConnectorPool,
    createPooledConnectorSVG,
    type SVGPoolConfig,
} from '../rendering/SVGConnectorPool';

// Virtual scrolling
export {
    VirtualBracketManager,
    globalVirtualBracket,
    shouldUseVirtualization,
    type VirtualBracketConfig,
} from '../rendering/VirtualBracket';

// Performance monitoring
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
export const DEFAULT_PERF_CONFIG: Required<PerformanceConfig> = {
    enableCache: true,
    enableSVGPooling: true,
    enableVirtualization: 'auto',
    virtualizationThreshold: 50,
    enableMonitoring: false,
};

/**
 * Applies performance configuration globally.
 */
export function configurePerformance(config: PerformanceConfig): void {
    const merged = { ...DEFAULT_PERF_CONFIG, ...config };

    // Configure cache
    if (!merged.enableCache) {
        _layoutCache.clear();
    }

    // Configure monitoring
    if (merged.enableMonitoring) {
        _perfMonitor.enable();
    } else {
        _perfMonitor.disable();
    }

    console.log('[Performance] Configuration applied:', merged);
}
