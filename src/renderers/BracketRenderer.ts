/**
 * BracketRenderer Interface - Strategy pattern for rendering different bracket types.
 *
 * Each bracket type (Round Robin, Swiss, Single Elimination, Double Elimination)
 * implements this interface to provide specialized rendering logic.
 */

import type { Id } from 'brackets-model';
import type { InternalViewerData, MatchWithMetadata, Config } from '../types';
import type { LayoutConfig } from '../viewModels';
import type { BracketEdgeResponse } from '../dto/types';

/**
 * Context provided to renderers with all necessary dependencies.
 */
export interface RenderContext {
    /** The resolved configuration */
    config: Config;
    /** Layout configuration */
    layoutConfig: LayoutConfig;
    /** Edges for bracket connections */
    edges: BracketEdgeResponse[];
    /** Function to create a match element */
    createMatch: (match: MatchWithMetadata, useCompactView?: boolean) => HTMLElement;
    /** Function to create a bracket match with absolute positioning */
    createBracketMatch: (match: MatchWithMetadata, roundNumber: number, roundCount: number) => HTMLElement;
    /** Function to get round name */
    getRoundName: (info: any, fallbackGetter: any) => string;
    /** Function to create connector SVG */
    createConnectorSVG: (connectors: any[], width: number, height: number) => SVGElement;
}

/**
 * Interface for bracket renderers.
 *
 * Implementations provide specialized rendering for each bracket type.
 */
export interface BracketRenderer {
    /**
     * Renders the bracket into the container.
     *
     * @param container - The container element to render into
     * @param data - The viewer data containing matches, participants, etc.
     * @param context - Render context with dependencies
     */
    render(
        container: DocumentFragment | HTMLElement,
        data: InternalViewerData,
        context: RenderContext,
    ): void;
}

/**
 * Base class for bracket renderers with common utilities.
 */
export abstract class BaseBracketRenderer implements BracketRenderer {
    abstract render(
        container: DocumentFragment | HTMLElement,
        data: InternalViewerData,
        context: RenderContext,
    ): void;

    /**
     * Groups matches by their group_id.
     */
    protected groupMatchesByGroup(matches: MatchWithMetadata[]): Map<Id, MatchWithMetadata[]> {
        const groups = new Map<Id, MatchWithMetadata[]>();

        for (const match of matches) {
            const groupId = match.group_id;
            if (!groups.has(groupId)) {
                groups.set(groupId, []);
            }
            groups.get(groupId)!.push(match);
        }

        return groups;
    }

    /**
     * Groups matches by their round_id.
     */
    protected groupMatchesByRound(matches: MatchWithMetadata[]): Map<Id, MatchWithMetadata[]> {
        const rounds = new Map<Id, MatchWithMetadata[]>();

        for (const match of matches) {
            const roundId = match.round_id;
            if (!rounds.has(roundId)) {
                rounds.set(roundId, []);
            }
            rounds.get(roundId)!.push(match);
        }

        return rounds;
    }

    /**
     * Sorts matches by their number within a round.
     */
    protected sortMatchesByNumber(matches: MatchWithMetadata[]): MatchWithMetadata[] {
        return [...matches].sort((a, b) => a.number - b.number);
    }
}
