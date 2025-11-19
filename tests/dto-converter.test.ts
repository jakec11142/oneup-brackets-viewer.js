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
assert.equal(viewerData.matches.length, 4, 'expected four matches');
assert.equal(viewerData.participants.length, 4, 'expected four unique participants');

const finals = viewerData.matches.find(match => match.id === 'match-3');
assert.ok(finals, 'final match missing');
assert.equal(finals?.opponent1?.result, 'win');

console.log('DTO conversion tests passed.');
