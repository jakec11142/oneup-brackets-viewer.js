/**
 * Layout Module - Bracket layout computation and positioning.
 *
 * This module provides:
 * - computeLayout: Main elimination bracket layout algorithm
 * - computeSwissLayout: Swiss bracket layout algorithm
 * - computeLowerBracketLayout: Lower bracket specific layout
 * - Types for positions, connectors, and layout results
 */

// Re-export types from dedicated types module
export {
    type BracketGroup,
    GROUP_ORDER,
    type Point,
    type ConnectorType,
    type ConnectorLine,
    type RoundHeader,
    type MatchPosition,
    type SwissPanelPosition,
    type BracketLayout,
    extractBracketGroup,
} from './types';

// Re-export layout functions from original layout module
// These will be gradually migrated to separate files
export {
    computeLayout,
    computeLowerBracketLayout,
    computeSwissLayout,
} from '../layout';
