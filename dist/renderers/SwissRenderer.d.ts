/**
 * SwissRenderer - Renders Swiss tournament brackets.
 *
 * Swiss format displays matches in record-bucket columns organized by wins/losses.
 */
import type { MatchWithMetadata, Config } from '../types';
import type { ViewerStage } from '../models';
import type { LayoutConfig } from '../viewModels';
/**
 * Render context for Swiss rendering.
 */
export interface SwissRenderContext {
    config: Config;
    layoutConfig: LayoutConfig;
    createBracketMatch: (match: MatchWithMetadata) => HTMLElement;
}
/**
 * Renders a Swiss stage into the container.
 *
 * @param root - The root element to render into
 * @param stage - The stage being rendered
 * @param matchesByGroup - Matches grouped by their group_id
 * @param context - Render context with dependencies
 */
export declare function renderSwiss(root: DocumentFragment | HTMLElement, stage: ViewerStage, matchesByGroup: MatchWithMetadata[][], context: SwissRenderContext): void;
