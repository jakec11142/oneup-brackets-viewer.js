/**
 * Performance Monitoring - Tracks rendering performance metrics.
 *
 * Provides insights into:
 * - First Contentful Paint (FCP)
 * - Time to Interactive (TTI)
 * - Frame rate during scroll
 * - Memory usage
 * - Cache hit rates
 */
/**
 * Comprehensive performance statistics
 */
export interface PerformanceStats {
    lastRenderDuration: number;
    averageRenderDuration: number;
    minRenderDuration: number;
    maxRenderDuration: number;
    cacheHitRate: number;
    cacheSize: number;
    svgPoolSize: number;
    svgActiveCount: number;
    totalMatches: number;
    renderedMatches: number;
    currentFPS: number;
    droppedFrames: number;
    memoryUsedMB: number | null;
}
/**
 * Performance Monitor for tracking bracket rendering performance.
 */
export declare class PerformanceMonitor {
    private enabled;
    private entries;
    private renderDurations;
    private frameTimestamps;
    private rafHandle;
    private targets;
    /**
     * Enables performance monitoring.
     */
    enable(): void;
    /**
     * Disables performance monitoring.
     */
    disable(): void;
    /**
     * Marks the start of a performance measurement.
     */
    mark(name: string): void;
    /**
     * Measures duration since the mark.
     */
    measure(name: string, metadata?: Record<string, unknown>): number;
    /**
     * Gets comprehensive performance statistics.
     */
    getStats(): PerformanceStats;
    /**
     * Logs a summary of performance stats to console.
     */
    logSummary(): void;
    /**
     * Clears all collected metrics.
     */
    clear(): void;
    private startFrameTracking;
    private stopFrameTracking;
    private calculateFPS;
    private countDroppedFrames;
    private getMemoryUsage;
}
/**
 * Singleton instance for global performance monitoring.
 */
export declare const globalPerfMonitor: PerformanceMonitor;
/**
 * Decorator-style helper for timing a function.
 */
export declare function withTiming<T extends (...args: any[]) => any>(name: string, fn: T): T;
