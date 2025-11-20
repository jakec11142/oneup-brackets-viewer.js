import { Participant, Id, StageSettings, Match, ParticipantResult, Status } from 'brackets-model';
import { ViewerData } from '../types';
import {
    StageStructureResponse,
    StageStandingsResponse,
    StageStructureFormat,
    MatchSlotResponse,
    StageStructureConversionOptions,
    BracketEdgeResponse,
} from './types';
import { ViewerStage, ViewerStageType } from '../models';

interface ParticipantAccumulator {
    participants: Participant[];
    nameToParticipant: Map<string, Participant>;
    tournamentId: Id;
    nextId: number;
}

const stageTypeMap: Record<Exclude<StageStructureFormat, 'FFA'>, ViewerStageType> = {
    SINGLE_ELIMINATION: 'single_elimination',
    DOUBLE_ELIMINATION: 'double_elimination',
    ROUND_ROBIN: 'round_robin',
    SWISS: 'swiss',
};

const statusMap: Record<string, Status> = {
    UNSCHEDULED: Status.Locked,
    SCHEDULED: Status.Ready,
    LIVE: Status.Running,
    COMPLETED: Status.Completed,
};

const defaultStageNames: Record<ViewerStageType, string> = {
    single_elimination: 'Single Elimination',
    double_elimination: 'Double Elimination',
    round_robin: 'Round Robin',
    swiss: 'Swiss Stage',
};

/**
 * Converts a structured stage response returned by the API to the shape required by the viewer.
 *
 * @param structure
 * @param standings
 * @param options
 */
export function convertStageStructureToViewerData(
    structure: StageStructureResponse,
    standings?: StageStandingsResponse,
    options: StageStructureConversionOptions = {},
): ViewerData {
    if (!structure.stageId)
        throw new Error('StageStructureResponse.stageId is required');

    const stageId = structure.stageId;
    const type = mapStageType(structure.stageType);
    const stageItems = structure.stageItems ?? [];
    const tournamentId = options.tournamentId ?? stageId;
    const accumulator: ParticipantAccumulator = {
        participants: [],
        nameToParticipant: new Map(),
        nextId: 1,
        tournamentId,
    };

    // Extract all edges from stage items
    const edges: BracketEdgeResponse[] = [];
    stageItems.forEach(item => {
        if (item.edges) 
            edges.push(...item.edges);
        
        item.rounds?.forEach(round => {
            round.matches?.forEach(match => {
                (match.slots ?? []).forEach(slot => ensureParticipant(accumulator, slot.teamName));
            });
        });
    });

    const matches: Match[] = [];

    stageItems.forEach((item, groupIndex) => {
        const baseGroupId = item.id ?? `group-${groupIndex + 1}`;

        item.rounds?.forEach(round => {
            // Incorporate bracketGroup into group_id for proper classification
            const bracketSuffix = round.bracketGroup
                ? round.bracketGroup.toLowerCase().replace(/_/g, '-')
                : 'bracket';
            const groupId = `${baseGroupId}-${bracketSuffix}`;

            const roundId = `${groupId}-round-${round.number ?? 1}`;

            round.matches?.forEach((match, matchIndex) => {
                matches.push({
                    id: match.id ?? `${roundId}-match-${matchIndex + 1}`,
                    stage_id: stageId,
                    group_id: groupId,
                    round_id: roundId,
                    number: match.matchIndex ?? matchIndex + 1,
                    status: mapStatus(match.status),
                    opponent1: convertSlot(accumulator, match.slots?.[0]),
                    opponent2: convertSlot(accumulator, match.slots?.[1]),
                    child_count: 0,
                });
            });
        });
    });

    const stageSettings: StageSettings = {
        size: accumulator.participants.length || undefined,
        groupCount: type === 'round_robin' || type === 'swiss' ? stageItems.length || 1 : undefined,
    };

    const stage: ViewerStage = {
        id: stageId,
        tournament_id: tournamentId,
        name: options.stageName ?? defaultStageNames[type],
        type,
        settings: stageSettings,
        number: options.stageNumber ?? 1,
    };

    return {
        stages: [stage],
        matches,
        matchGames: [],
        participants: accumulator.participants,
        edges,
    };
}

/**
 *
 * @param accumulator
 * @param teamName
 */
function ensureParticipant(accumulator: ParticipantAccumulator, teamName?: string): Participant | null {
    if (!teamName)
        return null;

    if (accumulator.nameToParticipant.has(teamName))
        return accumulator.nameToParticipant.get(teamName)!;

    const participant: Participant = {
        id: accumulator.nextId++,
        name: teamName,
        tournament_id: accumulator.tournamentId,
    };

    accumulator.participants.push(participant);
    accumulator.nameToParticipant.set(teamName, participant);
    return participant;
}

/**
 *
 * @param accumulator
 * @param slot
 */
function convertSlot(
    accumulator: ParticipantAccumulator,
    slot: MatchSlotResponse | undefined,
): ParticipantResult | null {
    if (!slot)
        return null;

    const participant = ensureParticipant(accumulator, slot.teamName);

    const result: ParticipantResult = {
        id: participant?.id ?? null,
    };

    if (slot.sourceRank !== undefined)
        result.position = slot.sourceRank;

    if (slot.gamesWon !== undefined)
        result.score = slot.gamesWon;

    if (slot.winner)
        result.result = 'win';

    if (!participant && slot.teamName)
        result.result = undefined;

    return result;
}

/**
 *
 * @param type
 */
function mapStageType(type?: StageStructureFormat): ViewerStageType {
    if (!type)
        throw new Error('StageStructureResponse.stageType is required');

    if (type === 'FFA')
        throw new Error(`Stage type ${type} is not supported by the viewer`);

    return stageTypeMap[type];
}

/**
 *
 * @param status
 */
function mapStatus(status?: string): Status {
    if (!status)
        return Status.Locked;

    return statusMap[status] ?? Status.Locked;
}
