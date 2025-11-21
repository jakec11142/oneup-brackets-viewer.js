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

import { globalLayoutCache } from '../cache/LayoutCache';
import { globalConnectorPool } from '../rendering/SVGConnectorPool';

/**
 * Performance measurement entry
 */
interface PerfEntry {
    name: string;
    startTime: number;
    duration: number;
    metadata?: Record<string, unknown>;
}

/**
 * Comprehensive performance statistics
 */
export interface PerformanceStats {
    // Render timing
    lastRenderDuration: number;
    averageRenderDuration: number;
    minRenderDuration: number;
    maxRenderDuration: number;

    // Cache metrics
    cacheHitRate: number;
    cacheSize: number;

    // SVG pool metrics
    svgPoolSize: number;
    svgActiveCount: number;

    // Match metrics
    totalMatches: number;
    renderedMatches: number;

    // Frame metrics
    currentFPS: number;
    droppedFrames: number;

    // Memory (if available)
    memoryUsedMB: number | null;
}

/**
 * Performance Monitor for tracking bracket rendering performance.
 */
export class PerformanceMonitor {
    private enabled = false;
    private entries: PerfEntry[] = [];
    private renderDurations: number[] = [];
    private frameTimestamps: number[] = [];
    private rafHandle: number | null = null;

    // Targets for performance budgets
    private targets = {
        maxRenderTime: 100, // ms
        targetFPS: 60,
        maxMemoryMB: 50,
    };

    /**
     * Enables performance monitoring.
     */
    enable(): void {
        this.enabled = true;
        this.startFrameTracking();
        console.log('[PerfMonitor] Enabled');
    }

    /**
     * Disables performance monitoring.
     */
    disable(): void {
        this.enabled = false;
        this.stopFrameTracking();
        console.log('[PerfMonitor] Disabled');
    }

    /**
     * Marks the start of a performance measurement.
     */
    mark(name: string): void {
        if (!this.enabled) return;
        performance.mark(`bv-${name}-start`);
    }

    /**
     * Measures duration since the mark.
     */
    measure(name: string, metadata?: Record<string, unknown>): number {
        if (!this.enabled) return 0;

        const startMark = `bv-${name}-start`;
        const endMark = `bv-${name}-end`;
        const measureName = `bv-${name}`;

        performance.mark(endMark);

        try {
            performance.measure(measureName, startMark, endMark);
            const measure = performance.getEntriesByName(measureName).pop();

            if (measure) {
                const entry: PerfEntry = {
                    name,
                    startTime: measure.startTime,
                    duration: measure.duration,
                    metadata,
                };

                this.entries.push(entry);

                // Track render durations specifically
                if (name === 'render') {
                    this.renderDurations.push(measure.duration);
                    if (this.renderDurations.length > 100) {
                        this.renderDurations.shift();
                    }
                }

                // Warn if over budget
                if (measure.duration > this.targets.maxRenderTime) {
                    console.warn(`[PerfMonitor] ${name} took ${measure.duration.toFixed(2)}ms (budget: ${this.targets.maxRenderTime}ms)`);
                }

                return measure.duration;
            }
        } catch (e) {
            // Mark might not exist
        }

        return 0;
    }

    /**
     * Gets comprehensive performance statistics.
     */
    getStats(): PerformanceStats {
        const cacheStats = globalLayoutCache.getStats();
        const svgStats = globalConnectorPool.getStats();

        const durations = this.renderDurations;
        const avgDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;

        return {
            // Render timing
            lastRenderDuration: durations[durations.length - 1] ?? 0,
            averageRenderDuration: avgDuration,
            minRenderDuration: durations.length > 0 ? Math.min(...durations) : 0,
            maxRenderDuration: durations.length > 0 ? Math.max(...durations) : 0,

            // Cache metrics
            cacheHitRate: cacheStats.hitRate,
            cacheSize: cacheStats.size,

            // SVG pool metrics
            svgPoolSize: svgStats.poolSize,
            svgActiveCount: svgStats.activeCount,

            // Match metrics (placeholder - would need integration)
            totalMatches: 0,
            renderedMatches: 0,

            // Frame metrics
            currentFPS: this.calculateFPS(),
            droppedFrames: this.countDroppedFrames(),

            // Memory
            memoryUsedMB: this.getMemoryUsage(),
        };
    }

    /**
     * Logs a summary of performance stats to console.
     */
    logSummary(): void {
        const stats = this.getStats();

        console.group('[PerfMonitor] Summary');
        console.log(`Render: avg=${stats.averageRenderDuration.toFixed(2)}ms, max=${stats.maxRenderDuration.toFixed(2)}ms`);
        console.log(`Cache: hit rate=${(stats.cacheHitRate * 100).toFixed(1)}%, size=${stats.cacheSize}`);
        console.log(`SVG Pool: active=${stats.svgActiveCount}, pooled=${stats.svgPoolSize}`);
        console.log(`FPS: ${stats.currentFPS.toFixed(1)}, dropped frames: ${stats.droppedFrames}`);
        if (stats.memoryUsedMB !== null) {
            console.log(`Memory: ${stats.memoryUsedMB.toFixed(2)} MB`);
        }
        console.groupEnd();
    }

    /**
     * Clears all collected metrics.
     */
    clear(): void {
        this.entries = [];
        this.renderDurations = [];
        this.frameTimestamps = [];
    }

    private startFrameTracking(): void {
        const trackFrame = (timestamp: number): void => {
            if (!this.enabled) return;

            this.frameTimestamps.push(timestamp);
            if (this.frameTimestamps.length > 120) {
                this.frameTimestamps.shift();
            }

            this.rafHandle = requestAnimationFrame(trackFrame);
        };

        this.rafHandle = requestAnimationFrame(trackFrame);
    }

    private stopFrameTracking(): void {
        if (this.rafHandle) {
            cancelAnimationFrame(this.rafHandle);
            this.rafHandle = null;
        }
    }

    private calculateFPS(): number {
        if (this.frameTimestamps.length < 2) return 0;

        const recent = this.frameTimestamps.slice(-60);
        const duration = recent[recent.length - 1] - recent[0];

        return duration > 0 ? ((recent.length - 1) / duration) * 1000 : 0;
    }

    private countDroppedFrames(): number {
        if (this.frameTimestamps.length < 2) return 0;

        let dropped = 0;
        const targetFrameTime = 1000 / this.targets.targetFPS;

        for (let i = 1; i < this.frameTimestamps.length; i++) {
            const delta = this.frameTimestamps[i] - this.frameTimestamps[i - 1];
            if (delta > targetFrameTime * 1.5) {
                dropped += Math.floor(delta / targetFrameTime) - 1;
            }
        }

        return dropped;
    }

    private getMemoryUsage(): number | null {
        // @ts-ignore - Non-standard API
        const memory = performance.memory;
        if (memory && typeof memory.usedJSHeapSize === 'number') {
            return memory.usedJSHeapSize / (1024 * 1024);
        }
        return null;
    }
}

/**
 * Singleton instance for global performance monitoring.
 */
export const globalPerfMonitor = new PerformanceMonitor();

/**
 * Decorator-style helper for timing a function.
 */
export function withTiming<T extends (...args: any[]) => any>(
    name: string,
    fn: T,
): T {
    return ((...args: Parameters<T>) => {
        globalPerfMonitor.mark(name);
        const result = fn(...args);

        // Handle promises
        if (result instanceof Promise) {
            return result.finally(() => {
                globalPerfMonitor.measure(name);
            });
        }

        globalPerfMonitor.measure(name);
        return result;
    }) as T;
}
