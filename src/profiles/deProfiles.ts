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
export const DE_32_INTERLEAVED: DoubleElimLayoutProfile = {
  id: 'de-32-interleaved',
  formatSize: 32,
  winnersRoundColumns: {
    1: 0,   // WB R1: 16 matches
    2: 1,   // WB R2: 8 matches
    3: 2,   // WB R3: 4 matches
    4: 3,   // WB R4: 2 matches (WB Semifinals)
    5: 4,   // WB R5: 1 match (WB Finals)
  },
  losersRoundColumns: {
    1: 0,   // LB R1: 8 matches (losers from WB R1)
    2: 1,   // LB R2: 8 matches (LB R1 winners + WB R2 losers)
    3: 2,   // LB R3: 4 matches
    4: 3,   // LB R4: 4 matches (LB R3 winners + WB R3 losers)
    5: 4,   // LB R5: 2 matches
    6: 5,   // LB R6: 2 matches (LB R5 winners + WB R4 losers)
    7: 6,   // LB R7: 1 match (LB Semifinals)
    8: 7,   // LB R8: 1 match (LB Finals)
  },
  finalsColumns: {
    9: 8,   // Grand Final Game 1
    10: 9,  // Grand Final Game 2 (bracket reset if necessary)
  },
  label: '32-Team Interleaved',
  description: 'Temporally aligned layout where WB and LB rounds are horizontally positioned by when they occur',
};

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
export const DE_16_INTERLEAVED: DoubleElimLayoutProfile = {
  id: 'de-16-interleaved',
  formatSize: 16,
  winnersRoundColumns: {
    1: 0,   // WB R1: 8 matches
    2: 1,   // WB R2: 4 matches
    3: 2,   // WB R3: 2 matches
    4: 3,   // WB R4: 1 match (WB Finals)
  },
  losersRoundColumns: {
    1: 0,   // LB R1: 4 matches
    2: 1,   // LB R2: 4 matches
    3: 2,   // LB R3: 2 matches
    4: 3,   // LB R4: 2 matches
    5: 4,   // LB R5: 1 match
    6: 5,   // LB R6: 1 match (LB Finals)
  },
  finalsColumns: {
    7: 6,   // Grand Final Game 1
    8: 7,   // Grand Final Game 2 (bracket reset if necessary)
  },
  label: '16-Team Interleaved',
  description: 'Compact interleaved layout for 16-team double elimination',
};

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
export const DE_8_COMPACT: DoubleElimLayoutProfile = {
  id: 'de-8-compact',
  formatSize: 8,
  winnersRoundColumns: {
    1: 0,   // WB R1: 4 matches
    2: 1,   // WB R2: 2 matches
    3: 2,   // WB R3: 1 match (WB Finals)
  },
  losersRoundColumns: {
    1: 0,   // LB R1: 2 matches
    2: 1,   // LB R2: 2 matches
    3: 2,   // LB R3: 1 match
    4: 3,   // LB R4: 1 match (LB Finals)
  },
  finalsColumns: {
    5: 4,   // Grand Final Game 1
    6: 5,   // Grand Final Game 2 (bracket reset if necessary)
  },
  label: '8-Team Compact',
  description: 'Minimal interleaved layout for 8-team double elimination',
};

/**
 * Generic fallback profile for non-standard tournament sizes.
 * Uses simple sequential column assignment without interleaving.
 */
export const DE_GENERIC_FALLBACK: DoubleElimLayoutProfile = {
  id: 'de-generic-fallback',
  formatSize: 0,
  winnersRoundColumns: {},
  losersRoundColumns: {},
  finalsColumns: {},
  label: 'Generic Fallback',
  description: 'Fallback profile for non-standard tournament sizes',
};

/**
 * Profile registry mapping format sizes to layout profiles
 */
export const DE_PROFILES: Record<number, DoubleElimLayoutProfile> = {
  8: DE_8_COMPACT,
  16: DE_16_INTERLEAVED,
  32: DE_32_INTERLEAVED,
};

/**
 * Detect tournament format size from match data
 *
 * @param matches - All matches in the tournament
 * @returns Tournament size (8, 16, 32, etc.) or null if can't detect
 */
export function detectFormatSize(matches: Match[]): number | null {
  // Find Winners Bracket Round 1 matches
  const wbR1Matches = matches.filter(m => {
    const groupId = String(m.group_id).toLowerCase();
    const roundId = String(m.round_id).toLowerCase();

    return (groupId.includes('winner') || groupId.includes('upper'))
        && roundId.includes('round-1');
  });

  if (wbR1Matches.length === 0) {
    return null; // Can't detect format
  }

  // Tournament size is typically 2x the number of WB R1 matches
  const teamCount = wbR1Matches.length * 2;

  // Only return if it's a standard size we have a profile for
  return DE_PROFILES[teamCount] ? teamCount : null;
}

/**
 * Get the appropriate DE layout profile for a given tournament size
 *
 * @param formatSize - Tournament size (8, 16, 32, etc.)
 * @returns Layout profile, or fallback for unknown sizes
 */
export function getDEProfile(formatSize: number): DoubleElimLayoutProfile {
  return DE_PROFILES[formatSize] || DE_GENERIC_FALLBACK;
}

/**
 * Check if a profile is valid (not the fallback/empty profile)
 *
 * @param profile - Profile to check
 * @returns true if profile has valid column mappings
 */
export function isValidProfile(profile: DoubleElimLayoutProfile): boolean {
  return Object.keys(profile.winnersRoundColumns).length > 0
      && Object.keys(profile.losersRoundColumns).length > 0
      && Object.keys(profile.finalsColumns).length > 0;
}
