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
assert.equal(viewerData.matches.length, 6, 'expected six matches');
assert.equal(viewerData.participants.length, 4, 'expected four unique participants');

const decidingMatch = viewerData.matches.find(match => match.id === 'swiss-match-5');
assert.ok(decidingMatch, 'round three match missing');
assert.equal(decidingMatch?.opponent1?.result, 'win');

console.log('DTO conversion tests passed.');
