import { Match } from 'brackets-model';
/**
 * Double Elimination Layout Profile
 *
 * Maps (BracketGroup, roundNumber) → global column index for proper visual alignment.
 * This enables interleaved layouts where Winners and Losers brackets are temporally aligned,
 * rather than laid out as separate horizontal blocks.
 */
export interface DoubleElimLayoutProfile {
    /** Profile identifier (e.g., 'de-32-interleaved') */
    id: string;
    /** Tournament format size (number of starting teams) */
    formatSize: number;
    /** Winners Bracket: round number → column index */
    winnersRoundColumns: Record<number, number>;
    /** Losers Bracket: round number → column index */
    losersRoundColumns: Record<number, number>;
    /** Grand Finals: round number → column index */
    finalsColumns: Record<number, number>;
    /** Human-readable label */
    label: string;
    /** Description of the layout strategy */
    description: string;
}
/**
 * 32-Team Double Elimination - Interleaved Layout
 *
 * Visual structure:
 * Col:  0    1    2    3    4    5    6    7    8    9
 * WB:  [R1] [R2] [R3] [R4] [R5]                     [GF1][GF2]
 *      (16) (8)  (4)  (2)  (1)                      (1)  (1)
 *
 * LB:  [R1] [R2] [R3] [R4] [R5] [R6] [R7] [R8]
 *      (8)  (8)  (4)  (4)  (2)  (2)  (1)  (1)
 *
 * Rationale: WB and LB rounds that share losers are aligned horizontally
 */
export declare const DE_32_INTERLEAVED: DoubleElimLayoutProfile;
/**
 * 16-Team Double Elimination - Interleaved Layout
 *
 * Visual structure:
 * Col:  0    1    2    3    4    5    6
 * WB:  [R1] [R2] [R3] [R4]              [GF1][GF2]
 *      (8)  (4)  (2)  (1)               (1)  (1)
 *
 * LB:  [R1] [R2] [R3] [R4] [R5] [R6]
 *      (4)  (4)  (2)  (2)  (1)  (1)
 */
export declare const DE_16_INTERLEAVED: DoubleElimLayoutProfile;
/**
 * 8-Team Double Elimination - Compact Layout
 *
 * Visual structure:
 * Col:  0    1    2    3    4    5
 * WB:  [R1] [R2] [R3]              [GF1][GF2]
 *      (4)  (2)  (1)               (1)  (1)
 *
 * LB:  [R1] [R2] [R3] [R4]
 *      (2)  (2)  (1)  (1)
 */
export declare const DE_8_COMPACT: DoubleElimLayoutProfile;
/**
 * Generic fallback profile for non-standard tournament sizes.
 * Uses simple sequential column assignment without interleaving.
 */
export declare const DE_GENERIC_FALLBACK: DoubleElimLayoutProfile;
/**
 * Profile registry mapping format sizes to layout profiles
 */
export declare const DE_PROFILES: Record<number, DoubleElimLayoutProfile>;
/**
 * Detect tournament format size from match data
 *
 * @param matches - All matches in the tournament
 * @returns Tournament size (8, 16, 32, etc.) or null if can't detect
 */
export declare function detectFormatSize(matches: Match[]): number | null;
/**
 * Get the appropriate DE layout profile for a given tournament size
 *
 * @param formatSize - Tournament size (8, 16, 32, etc.)
 * @returns Layout profile, or fallback for unknown sizes
 */
export declare function getDEProfile(formatSize: number): DoubleElimLayoutProfile;
/**
 * Check if a profile is valid (not the fallback/empty profile)
 *
 * @param profile - Profile to check
 * @returns true if profile has valid column mappings
 */
export declare function isValidProfile(profile: DoubleElimLayoutProfile): boolean;
