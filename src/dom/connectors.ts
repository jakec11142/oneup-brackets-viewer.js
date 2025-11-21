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
export function createConnectorSVG(connectors: ConnectorLine[], width: number, height: number): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'bracket-connectors');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());

    for (const conn of connectors) {
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        const pointsStr = conn.points.map(p => `${p.x},${p.y}`).join(' ');
        polyline.setAttribute('points', pointsStr);
        polyline.setAttribute('fill', 'none');

        // Apply styling based on connector type
        polyline.setAttribute('class', `connector-${conn.connectorType}`);

        switch (conn.connectorType) {
            case 'cross-bracket':
                // Cross-bracket connectors: lower opacity, dashed, thinner
                polyline.setAttribute('stroke', 'var(--bv-connector-cross-bracket)');
                polyline.setAttribute('stroke-width', '1.5');
                polyline.setAttribute('opacity', '0.3');
                polyline.setAttribute('stroke-dasharray', '4,3');
                break;

            case 'grand-final':
                // Grand final connectors: bold, full opacity, distinct color
                polyline.setAttribute('stroke', 'var(--bv-connector-grand-final)');
                polyline.setAttribute('stroke-width', '3');
                polyline.setAttribute('opacity', '1');
                break;

            case 'internal':
            default:
                // Internal connectors: standard styling
                polyline.setAttribute('stroke', 'var(--bv-connector-internal)');
                polyline.setAttribute('stroke-width', '2');
                polyline.setAttribute('opacity', '0.8');
                break;
        }

        svg.appendChild(polyline);
    }

    return svg;
}
