/// <reference types="node" />

import assert from 'assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { convertStageStructureToViewerData } from '../src/dto/converter';
import type { StageStructureResponse, StageStandingsResponse } from '../src/dto/types';

const fixturePath = resolve(__dirname, '..', '..', 'demo', 'api-data.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
    structure: StageStructureResponse,
    standings?: StageStandingsResponse
};

const viewerData = convertStageStructureToViewerData(fixture.structure, fixture.standings, { stageName: 'Demo Stage' });

assert.equal(viewerData.stages.length, 1, 'expected a single stage');
assert.equal(viewerData.stages[0].name, 'Demo Stage');
assert.equal(viewerData.stages[0].type, 'swiss');
assert.equal(viewerData.matches.length, 30, 'expected thirty matches');
assert.equal(viewerData.participants.length, 12, 'expected twelve unique participants');
assert.equal(viewerData.stages[0].settings.groupCount, 1, 'expected a single Swiss group');

const seededMatch = viewerData.matches.find(match => match.opponent1?.id && match.opponent2?.id);
assert.ok(seededMatch, 'expected at least one seeded match');

const teamNames = seededMatch
    ? [
        viewerData.participants.find(participant => participant.id === seededMatch.opponent1?.id)?.name,
        viewerData.participants.find(participant => participant.id === seededMatch.opponent2?.id)?.name,
    ]
    : [];

assert.ok(teamNames?.includes('Team 1'), 'expected Team 1 to be seeded in Swiss round one');
assert.ok(teamNames?.includes('Team 12'), 'expected Team 12 to be seeded in Swiss round one');

console.log('DTO conversion tests passed.');
