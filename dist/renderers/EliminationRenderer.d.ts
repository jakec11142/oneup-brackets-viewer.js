/**
 * EliminationRenderer - Renders Single and Double Elimination tournament brackets.
 *
 * Handles both unified (single canvas) and split (legacy) rendering modes.
 */
import type { MatchWithMetadata, Config } from '../types';
import type { ViewerStage } from '../models';
import type { LayoutConfig } from '../viewModels';
import type { BracketEdgeResponse } from '../dto/types';
import type { ConnectorLine } from '../layout';
/**
 * Render context for elimination rendering.
 */
export interface EliminationRenderContext {
    config: Config;
    layoutConfig: LayoutConfig;
    edges: BracketEdgeResponse[];
    stage: ViewerStage;
    createBracketMatch: (match: MatchWithMetadata, roundNumber?: number, roundCount?: number) => HTMLElement;
    createConnectorSVG: (connectors: ConnectorLine[], width: number, height: number) => SVGElement;
}
/**
 * Renders a unified double elimination stage with all bracket groups on one canvas.
 */
export declare function renderUnifiedDoubleElimination(container: HTMLElement, matchesByGroup: MatchWithMetadata[][], context: EliminationRenderContext): void;
/**
 * Renders a unified single elimination stage.
 */
export declare function renderUnifiedSingleElimination(container: HTMLElement, matchesByGroup: MatchWithMetadata[][], context: EliminationRenderContext): void;
