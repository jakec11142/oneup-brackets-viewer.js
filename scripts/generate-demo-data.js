const { writeFileSync } = require('fs');
const { join } = require('path');
const { randomUUID } = require('crypto');
const { InMemoryDatabase } = require('brackets-memory-db');
const { BracketsManager } = require('brackets-manager');

const OUTPUT_SHOWCASE = join(__dirname, '..', 'demo', 'showcase-data.json');
const OUTPUT_API = join(__dirname, '..', 'demo', 'api-data.json');

const ACTUAL_STAGE_IDS = {
    singleElimination: '4cfe40e7-50f5-4c16-9ee3-da4211fde700',
    doubleElimination: 'baab51c7-11ed-4130-89a4-e5dad161db9f',
    roundRobin: 'a3182d47-1f65-4a97-8109-970445718a94',
    swiss: '586412e0-55d9-4dd2-a134-096dc0cfd41a',
};

const KNOWN_STAGE_ITEM_IDS = {
    singleElimination: ['a71fd9d2-0435-4fe7-9e7d-023605623f8a', randomUUID()],
    doubleElimination: [
        'a5f95f29-6bf9-4106-a0db-08ccf1d836a8',
        randomUUID(),
        randomUUID(),
    ],
    roundRobin: ['27ec1aae-6695-471c-8ead-a65ba4f4e7b4', randomUUID()],
    swiss: ['2c6296f5-6cea-46df-bf6a-a22747d95f69'],
};

const STATUS_MAP = {
    0: 'UNSCHEDULED',
    1: 'SCHEDULED',
    2: 'SCHEDULED',
    3: 'LIVE',
    4: 'COMPLETED',
    5: 'COMPLETED',
};

function createTeamNames(count) {
    return Array.from({ length: count }, (_, index) => `Team ${index + 1}`);
}

function getBracketGroup(stageType, groupNumber) {
    if (stageType === 'SINGLE_ELIMINATION') {
        return groupNumber === 1 ? 'WINNERS_BRACKET' : 'FINALS';
    }

    if (stageType === 'DOUBLE_ELIMINATION') {
        if (groupNumber === 1)
            return 'WINNERS_BRACKET';
        if (groupNumber === 2)
            return 'LOSERS_BRACKET';
        return 'FINALS';
    }

    if (stageType === 'SWISS')
        return 'SWISS';

    return null;
}

function buildStandings(stageId, stageType, groups) {
    return {
        stageId,
        stageType,
        groups: groups.map(({ groupIndex, teamNames }) => ({
            groupIndex,
            entries: teamNames.map((name, index) => ({
                rank: index + 1,
                teamName: name,
                wins: 0,
                losses: 0,
                draws: 0,
                points: 0,
                scoreFor: 0,
                scoreAgainst: 0,
            })),
        })),
    };
}

function convertSlot(participantsMap, opponent, slot) {
    if (!opponent)
        return { slot };

    const participant = opponent.id != null ? participantsMap.get(opponent.id) : undefined;
    const slotData = { slot };

    if (participant?.name)
        slotData.teamName = participant.name;

    if (participant?.name)
        slotData.gamesWon = opponent.score ?? 0;

    if (opponent.result === 'win')
        slotData.winner = true;
    else if (opponent.result === 'loss')
        slotData.winner = false;

    if (opponent.position != null)
        slotData.sourceRank = opponent.position;

    return slotData;
}

function convertManagerStage(exported, stage, { stageId, stageType, stageItemIds = [] }) {
    const participantsMap = new Map(
        exported.participant.map(participant => [participant.id, participant]),
    );

    const groups = exported.group
        .filter(group => group.stage_id === stage.id)
        .sort((a, b) => a.number - b.number);

    const rounds = exported.round.filter(round => round.stage_id === stage.id);
    const matches = exported.match.filter(match => match.stage_id === stage.id);

    const stageItems = groups.map((group, index) => {
        const stageItemId = stageItemIds[index] ?? randomUUID();

        const groupRounds = rounds
            .filter(round => round.group_id === group.id)
            .sort((a, b) => a.number - b.number)
            .map(round => {
                const roundMatches = matches
                    .filter(match => match.round_id === round.id)
                    .sort((a, b) => a.number - b.number)
                    .map(match => ({
                        id: randomUUID(),
                        matchIndex: match.number - 1,
                        status: STATUS_MAP[match.status] ?? 'UNSCHEDULED',
                        scheduledTime: null,
                        completed: match.status === 4,
                        slots: [
                            convertSlot(participantsMap, match.opponent1, 1),
                            convertSlot(participantsMap, match.opponent2, 2),
                        ],
                    }));

                return {
                    number: round.number,
                    bracketGroup: getBracketGroup(stageType, group.number),
                    matches: roundMatches,
                };
            });

        return {
            id: stageItemId,
            groupIndex: group.number,
            rounds: groupRounds,
            edges: [],
        };
    });

    const structure = {
        stageId,
        stageType,
        stageItems,
    };

    if (stageType === 'DOUBLE_ELIMINATION')
        applyDoubleEliminationEdges(stageItems);

    return structure;
}

function ensureEdgeBucket(stageItem) {
    if (!stageItem.edges)
        stageItem.edges = [];
    return stageItem.edges;
}

function applyDoubleEliminationEdges(stageItems) {
    const grouped = Object.fromEntries(stageItems.map(item => [item.groupIndex, item]));
    const winnerItem = grouped[1];
    const loserItem = grouped[2];
    const finalItem = grouped[3];

    if (!winnerItem || !loserItem)
        return;

    ensureEdgeBucket(winnerItem);
    ensureEdgeBucket(loserItem);
    if (finalItem)
        ensureEdgeBucket(finalItem);

    const pushEdge = (item, edge) => {
        if (!edge.fromMatchId || !edge.toMatchId)
            return;

        ensureEdgeBucket(item).push(edge);
    };

    const winnerRounds = winnerItem.rounds;
    const loserRounds = loserItem.rounds;

    const mapPairwiseWinners = (fromMatches, toMatches, targetItem) => {
        for (let i = 0; i < toMatches.length; i++) {
            const sourceA = fromMatches[2 * i];
            const sourceB = fromMatches[2 * i + 1];
            const target = toMatches[i];

            pushEdge(targetItem, { fromMatchId: sourceA?.id, fromRank: 1, toMatchId: target?.id, toSlot: 1 });
            pushEdge(targetItem, { fromMatchId: sourceB?.id, fromRank: 1, toMatchId: target?.id, toSlot: 2 });
        }
    };

    // Winner bracket progression.
    for (let roundIndex = 0; roundIndex < winnerRounds.length - 1; roundIndex++) {
        const currentMatches = winnerRounds[roundIndex].matches;
        const nextMatches = winnerRounds[roundIndex + 1].matches;
        mapPairwiseWinners(currentMatches, nextMatches, winnerItem);
    }

    // Winner bracket to loser bracket drops.
    const wbr1 = winnerRounds[0]?.matches ?? [];
    const wbr2 = winnerRounds[1]?.matches ?? [];
    const wbr3 = winnerRounds[2]?.matches ?? [];
    const wbr4 = winnerRounds[3]?.matches ?? [];
    const wbr5 = winnerRounds[4]?.matches ?? [];

    const lbr1 = loserRounds[0]?.matches ?? [];
    const lbr2 = loserRounds[1]?.matches ?? [];
    const lbr4 = loserRounds[3]?.matches ?? [];
    const lbr6 = loserRounds[5]?.matches ?? [];
    const lbr8 = loserRounds[7]?.matches ?? [];

    for (let i = 0; i < wbr1.length; i++) {
        const targetIndex = Math.floor(i / 2);
        const toSlot = (i % 2) + 1;
        pushEdge(winnerItem, { fromMatchId: wbr1[i]?.id, fromRank: 2, toMatchId: lbr1[targetIndex]?.id, toSlot });
    }

    for (let i = 0; i < wbr2.length; i++) {
        const targetIndex = lbr2.length - 1 - i;
        pushEdge(winnerItem, { fromMatchId: wbr2[i]?.id, fromRank: 2, toMatchId: lbr2[targetIndex]?.id, toSlot: 1 });
    }

    const wbr3Order = [2, 3, 0, 1];
    for (let i = 0; i < wbr3.length; i++) {
        const targetIndex = wbr3Order[i] ?? i;
        pushEdge(winnerItem, { fromMatchId: wbr3[i]?.id, fromRank: 2, toMatchId: lbr4[targetIndex]?.id, toSlot: 1 });
    }

    for (let i = 0; i < wbr4.length; i++) {
        pushEdge(winnerItem, { fromMatchId: wbr4[i]?.id, fromRank: 2, toMatchId: lbr6[i]?.id, toSlot: 1 });
    }

    if (wbr5.length && lbr8.length) {
        pushEdge(winnerItem, { fromMatchId: wbr5[0]?.id, fromRank: 2, toMatchId: lbr8[0]?.id, toSlot: 1 });
    }

    // Loser bracket progression (including rounds where winners bracket losers join).
    for (let roundIndex = 0; roundIndex < loserRounds.length - 1; roundIndex++) {
        const currentMatches = loserRounds[roundIndex].matches;
        const nextMatches = loserRounds[roundIndex + 1].matches;

        if (currentMatches.length === nextMatches.length) {
            for (let i = 0; i < currentMatches.length; i++) {
                pushEdge(loserItem, { fromMatchId: currentMatches[i]?.id, fromRank: 1, toMatchId: nextMatches[i]?.id, toSlot: 2 });
            }
        } else {
            mapPairwiseWinners(currentMatches, nextMatches, loserItem);
        }
    }

    // Finals.
    if (finalItem && finalItem.rounds.length) {
        const firstFinalMatch = finalItem.rounds[0]?.matches?.[0];
        const resetMatch = finalItem.rounds[1]?.matches?.[0];

        if (wbr5.length && firstFinalMatch)
            pushEdge(winnerItem, { fromMatchId: wbr5[0]?.id, fromRank: 1, toMatchId: firstFinalMatch.id, toSlot: 1 });

        if (lbr8.length && firstFinalMatch)
            pushEdge(loserItem, { fromMatchId: lbr8[0]?.id, fromRank: 1, toMatchId: firstFinalMatch.id, toSlot: 2 });

        if (firstFinalMatch && resetMatch) {
            pushEdge(finalItem, { fromMatchId: firstFinalMatch.id, fromRank: 1, toMatchId: resetMatch.id, toSlot: 1 });
            pushEdge(finalItem, { fromMatchId: firstFinalMatch.id, fromRank: 2, toMatchId: resetMatch.id, toSlot: 2 });
        }
    }
}

async function buildSingleEliminationSample() {
    const db = new InMemoryDatabase();
    const manager = new BracketsManager(db);
    const seeding = createTeamNames(16);

    const stage = await manager.create.stage({
        tournamentId: 1,
        name: 'CSGO Single Elim Showcase',
        type: 'single_elimination',
        seeding,
        settings: {
            size: 16,
            consolationFinal: true,
        },
    });

    const exported = await manager.export();
    const structure = convertManagerStage(exported, stage, {
        stageId: ACTUAL_STAGE_IDS.singleElimination,
        stageType: 'SINGLE_ELIMINATION',
        stageItemIds: KNOWN_STAGE_ITEM_IDS.singleElimination,
    });

    const standings = buildStandings(structure.stageId, structure.stageType, [
        { groupIndex: 1, teamNames: seeding },
    ]);

    return {
        label: 'CSGO Single Elim Showcase',
        structure,
        standings,
    };
}

async function buildDoubleEliminationSample() {
    const db = new InMemoryDatabase();
    const manager = new BracketsManager(db);
    const seeding = createTeamNames(32);

    const stage = await manager.create.stage({
        tournamentId: 1,
        name: 'CSGO Double Elim Championship',
        type: 'double_elimination',
        seeding,
        settings: {
            size: 32,
            grandFinal: 'double',
        },
    });

    const exported = await manager.export();
    const structure = convertManagerStage(exported, stage, {
        stageId: ACTUAL_STAGE_IDS.doubleElimination,
        stageType: 'DOUBLE_ELIMINATION',
        stageItemIds: KNOWN_STAGE_ITEM_IDS.doubleElimination,
    });

    const standings = buildStandings(structure.stageId, structure.stageType, [
        { groupIndex: 1, teamNames: seeding },
    ]);

    return {
        label: 'CSGO Double Elim Championship',
        structure,
        standings,
    };
}

async function buildRoundRobinSample() {
    const db = new InMemoryDatabase();
    const manager = new BracketsManager(db);
    const seeding = createTeamNames(10);

    const stage = await manager.create.stage({
        tournamentId: 1,
        name: 'CSGO Round Robin Warmup',
        type: 'round_robin',
        seeding,
        settings: {
            groupCount: 2,
        },
    });

    const exported = await manager.export();
    const structure = convertManagerStage(exported, stage, {
        stageId: ACTUAL_STAGE_IDS.roundRobin,
        stageType: 'ROUND_ROBIN',
        stageItemIds: KNOWN_STAGE_ITEM_IDS.roundRobin,
    });

    const groupStandings = structure.stageItems.map((item, index) => {
        const names = new Set();
        item.rounds.forEach(round => {
            round.matches.forEach(match => {
                match.slots?.forEach(slot => {
                    if (slot?.teamName)
                        names.add(slot.teamName);
                });
            });
        });

        return {
            groupIndex: index + 1,
            teamNames: Array.from(names),
        };
    });

    const standings = buildStandings(structure.stageId, structure.stageType, groupStandings);

    return {
        label: 'CSGO Round Robin Warmup',
        structure,
        standings,
    };
}

function buildSwissSample() {
    const stageId = ACTUAL_STAGE_IDS.swiss;
    const stageItemId = KNOWN_STAGE_ITEM_IDS.swiss[0];
    const teamNames = createTeamNames(12);

    const swissPairings = [
        [
            [1, 12],
            [2, 11],
            [3, 10],
            [4, 9],
            [5, 8],
            [6, 7],
        ],
        [
            [1, 11],
            [12, 2],
            [3, 9],
            [4, 10],
            [5, 7],
            [6, 8],
        ],
        [
            [1, 10],
            [11, 3],
            [12, 4],
            [9, 5],
            [8, 6],
            [7, 2],
        ],
        [
            [1, 9],
            [10, 4],
            [11, 5],
            [12, 6],
            [8, 2],
            [7, 3],
        ],
        [
            [1, 8],
            [9, 4],
            [10, 5],
            [11, 6],
            [12, 7],
            [2, 3],
        ],
    ];

    const structure = {
        stageId,
        stageType: 'SWISS',
        stageItems: [
            {
                id: stageItemId,
                groupIndex: 1,
                rounds: swissPairings.map((roundPairs, roundIndex) => ({
                    number: roundIndex + 1,
                    bracketGroup: getBracketGroup('SWISS', 1),
                    matches: roundPairs.map((pair, matchIndex) => ({
                        id: randomUUID(),
                        matchIndex,
                        status: 'UNSCHEDULED',
                        scheduledTime: null,
                        completed: false,
                        slots: [
                            {
                                slot: 1,
                                teamName: `Team ${pair[0]}`,
                                gamesWon: 0,
                            },
                            {
                                slot: 2,
                                teamName: `Team ${pair[1]}`,
                                gamesWon: 0,
                            },
                        ],
                    })),
                })),
                edges: [],
            },
        ],
    };

    const standings = buildStandings(stageId, structure.stageType, [
        { groupIndex: 1, teamNames },
    ]);

    return {
        label: 'CSGO Swiss Trials',
        structure,
        standings,
    };
}

async function main() {
    const [singleElim, doubleElim, roundRobin] = await Promise.all([
        buildSingleEliminationSample(),
        buildDoubleEliminationSample(),
        buildRoundRobinSample(),
    ]);

    const swiss = buildSwissSample();

    const showcaseData = {
        roundRobin: [roundRobin],
        swiss: [swiss],
        singleElimination: [singleElim],
        doubleElimination: [doubleElim],
    };

    writeFileSync(OUTPUT_SHOWCASE, `${JSON.stringify(showcaseData, null, 2)}\n`, 'utf8');
    writeFileSync(OUTPUT_API, `${JSON.stringify({ structure: swiss.structure, standings: swiss.standings }, null, 2)}\n`, 'utf8');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
