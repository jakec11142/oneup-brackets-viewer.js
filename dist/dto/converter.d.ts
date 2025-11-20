import { ViewerData } from '../types';
import { StageStructureResponse, StageStandingsResponse, StageStructureConversionOptions } from './types';
/**
 * Converts a structured stage response returned by the API to the shape required by the viewer.
 *
 * @param structure
 * @param standings
 * @param options
 */
export declare function convertStageStructureToViewerData(structure: StageStructureResponse, standings?: StageStandingsResponse, options?: StageStructureConversionOptions): ViewerData;
