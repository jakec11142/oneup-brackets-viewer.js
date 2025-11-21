/**
 * Connector DOM utilities - SVG connector creation for bracket visualization.
 */
import type { ConnectorLine } from '../layout';
/**
 * Creates an SVG element containing all bracket connector lines.
 *
 * @param connectors Array of connector line definitions
 * @param width Total width of the SVG canvas
 * @param height Total height of the SVG canvas
 */
export declare function createConnectorSVG(connectors: ConnectorLine[], width: number, height: number): SVGElement;
