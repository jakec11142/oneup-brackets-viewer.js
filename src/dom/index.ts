/**
 * DOM Module - DOM creation utilities for brackets-viewer.js
 *
 * Re-exports all DOM utilities from their respective modules.
 */

// Connector utilities
export { createConnectorSVG } from './connectors';

// Re-export everything from main dom.ts (will be gradually migrated)
export * from '../dom';
