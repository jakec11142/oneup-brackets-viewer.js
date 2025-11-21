/**
 * Types Module - Re-exports all type definitions for brackets-viewer.js
 */

// Match types
export {
    type ConnectionType,
    type OriginHint,
    type Connection,
    type MatchWithMetadata,
    type MatchGameWithMetadata,
} from './match';

// Config types
export {
    type Placement,
    type DoubleElimMode,
    type RoundNameInfo,
    type RoundNameGetter,
    type MatchClickCallback,
    type Config,
} from './config';
