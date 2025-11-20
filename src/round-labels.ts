import { GroupType, FinalType } from 'brackets-model';

/**
 * Semantic round information describing the significance of a round.
 */
export interface SemanticRoundInfo {
    /** Type of round significance */
    type: 'final' | 'semi-final' | 'quarter-final' | 'round-of-x' | 'generic';
    /** Number of teams remaining in this round */
    teamsRemaining: number;
    /** Display label for the round */
    label: string;
    /** What happens to winners (for tooltips) */
    nextRoundWinner?: string;
    /** What happens to losers (for tooltips) */
    nextRoundLoser?: string;
}

/**
 * Calculates semantic round information based on position from the end.
 *
 * @param roundNumber Current round number (1-indexed)
 * @param roundCount Total number of rounds
 * @param matchLocation Bracket type
 */
export function getSemanticRoundInfo(
    roundNumber: number,
    roundCount: number,
    matchLocation: GroupType,
): SemanticRoundInfo {
    const roundsFromEnd = roundCount - roundNumber;

    // Finals (last round)
    if (roundsFromEnd === 0) {
        return {
            type: 'final',
            teamsRemaining: 2,
            label: 'Finals',
            nextRoundWinner: 'tournament champion',
            nextRoundLoser: matchLocation === 'loser_bracket' ? 'elimination' : 'loser bracket',
        };
    }

    // Semi-Finals (2nd to last)
    if (roundsFromEnd === 1) {
        return {
            type: 'semi-final',
            teamsRemaining: 4,
            label: 'Semi-Finals',
            nextRoundWinner: 'finals',
            nextRoundLoser: matchLocation === 'loser_bracket' ? 'elimination' : 'loser bracket',
        };
    }

    // Quarter-Finals (3rd to last)
    if (roundsFromEnd === 2) {
        return {
            type: 'quarter-final',
            teamsRemaining: 8,
            label: 'Quarter-Finals',
            nextRoundWinner: 'semi-finals',
            nextRoundLoser: matchLocation === 'loser_bracket' ? 'elimination' : 'loser bracket',
        };
    }

    // Round of X (calculate based on teams remaining)
    const teamsRemaining = Math.pow(2, roundsFromEnd + 1);
    const nextRoundTeams = Math.pow(2, roundsFromEnd);
    const nextLabel = nextRoundTeams === 8 ? 'quarter-finals' :
        nextRoundTeams === 4 ? 'semi-finals' :
            nextRoundTeams === 2 ? 'finals' :
                `round of ${nextRoundTeams}`;

    return {
        type: 'round-of-x',
        teamsRemaining,
        label: `Round of ${teamsRemaining}`,
        nextRoundWinner: nextLabel,
        nextRoundLoser: matchLocation === 'loser_bracket' ? 'elimination' : 'loser bracket',
    };
}

/**
 * Gets semantic label for a single elimination round.
 */
function getSingleEliminationRoundLabel(
    roundNumber: number,
    roundCount: number,
): string {
    const info = getSemanticRoundInfo(roundNumber, roundCount, 'single_bracket');
    return info.label;
}

/**
 * Gets semantic label for a winners bracket round.
 */
function getWinnerBracketRoundLabel(
    roundNumber: number,
    roundCount: number,
): string {
    const info = getSemanticRoundInfo(roundNumber, roundCount, 'winner_bracket');
    return `WB ${info.label}`;
}

/**
 * Gets semantic label for a losers bracket round.
 * Losers bracket has twice as many rounds as winners bracket due to alternating major/minor rounds.
 */
function getLoserBracketRoundLabel(
    roundNumber: number,
    roundCount: number,
): string {
    const roundsFromEnd = roundCount - roundNumber;

    if (roundsFromEnd === 0) {
        return 'LB Finals';
    }

    if (roundsFromEnd === 1) {
        return 'LB Semi-Finals';
    }

    if (roundsFromEnd === 2) {
        return 'LB Quarter-Finals';
    }

    // Calculate teams remaining
    const teamsRemaining = Math.pow(2, roundsFromEnd + 1);
    return `LB Round of ${teamsRemaining}`;
}

/**
 * Gets semantic label for a grand finals round.
 */
function getGrandFinalRoundLabel(
    roundNumber: number,
    roundCount: number,
): string {
    if (roundCount === 1) {
        return 'Grand Finals';
    }

    // Two-match grand finals (bracket reset)
    return roundNumber === 1 ? 'Grand Finals - Match 1' : 'Grand Finals - Match 2';
}

/**
 * Gets the appropriate semantic round label based on bracket type and configuration.
 *
 * @param roundNumber Current round number (1-indexed)
 * @param roundCount Total number of rounds in this bracket
 * @param matchLocation Type of bracket (single, winner, loser, final)
 * @param finalType Type of final (for grand finals bracket)
 */
export function getSemanticRoundLabel(
    roundNumber: number,
    roundCount: number,
    matchLocation: GroupType,
    finalType?: FinalType,
): string {
    // Grand finals bracket
    if (matchLocation === 'final_group' && finalType) {
        return getGrandFinalRoundLabel(roundNumber, roundCount);
    }

    // Losers bracket
    if (matchLocation === 'loser_bracket') {
        return getLoserBracketRoundLabel(roundNumber, roundCount);
    }

    // Winners bracket
    if (matchLocation === 'winner_bracket') {
        return getWinnerBracketRoundLabel(roundNumber, roundCount);
    }

    // Single elimination bracket
    return getSingleEliminationRoundLabel(roundNumber, roundCount);
}
