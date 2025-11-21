/**
 * RoundRobinRenderer - Renders Round Robin tournament brackets.
 *
 * Round Robin displays matches in a grid format organized by groups and rounds.
 */
import type { MatchWithMetadata, Config } from '../types';
import type { ViewerStage } from '../models';
/**
 * Render context for round robin rendering.
 */
export interface RoundRobinRenderContext {
    config: Config;
    createMatch: (match: MatchWithMetadata, useCompactView?: boolean) => HTMLElement;
}
/**
 * Renders a Round Robin stage into the container.
 *
 * @param root - The root element to render into
 * @param stage - The stage being rendered
 * @param matchesByGroup - Matches grouped by their group_id
 * @param context - Render context with dependencies
 */
export declare function renderRoundRobin(root: DocumentFragment | HTMLElement, stage: ViewerStage, matchesByGroup: MatchWithMetadata[][], context: RoundRobinRenderContext): void;
