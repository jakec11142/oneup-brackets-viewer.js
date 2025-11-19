/**
 * Script to fix the data files and integrate them into showcase-data.json
 */
const fs = require('fs');
const path = require('path');

// Helper to extract teams from structure for standings
function extractTeamsFromStructure(structure) {
    const teams = new Set();
    structure.stageItems.forEach(item => {
        item.rounds.forEach(round => {
            round.matches.forEach(match => {
                match.slots.forEach(slot => {
                    if (slot.teamName && slot.teamName !== 'TBD') {
                        teams.add(slot.teamName);
                    }
                });
            });
        });
    });
    return Array.from(teams).sort();
}

// Helper to create standings from structure
function createStandings(structure, teams) {
    const standings = {
        stageId: structure.stageId,
        stageType: structure.stageType,
        groups: []
    };

    // For single elimination and double elimination, all teams are in one group
    if (structure.stageType === 'SINGLE_ELIMINATION' || structure.stageType === 'DOUBLE_ELIMINATION') {
        standings.groups.push({
            groupIndex: 1,
            entries: teams.map((teamName, index) => ({
                rank: index + 1,
                teamName,
                wins: 0,
                losses: 0,
                draws: 0,
                points: 0,
                scoreFor: 0,
                scoreAgainst: 0
            }))
        });
    }

    return standings;
}

// Process Round Robin data
console.log('Processing Round Robin data...');
const rrContent = fs.readFileSync(path.join(__dirname, '../demo/roundRobinData.json'), 'utf8');
const rrLines = rrContent.trim().split('\n');

// Build structure object (lines 1-2)
const rrStructureStr = rrLines[0] + '\n' + rrLines[1].replace(/,$/, '') + '\n}';
const rrStructure = JSON.parse(rrStructureStr);

// Build standings object (lines 1, 3, 4)
const rrStandingsStr = '{\n' + rrLines[2] + '\n' + rrLines[3];
const rrStandings = JSON.parse(rrStandingsStr);

const roundRobinSample = {
    label: 'Real Data - Round Robin (10 teams, 2 groups)',
    structure: rrStructure,
    standings: rrStandings
};

console.log('✓ Round Robin: structure has', rrStructure.stageItems.length, 'groups, standings has', rrStandings.groups.length, 'groups');

// Process Swiss data
console.log('\nProcessing Swiss data...');
const swissContent = fs.readFileSync(path.join(__dirname, '../demo/swissData.json'), 'utf8');
const swissLines = swissContent.trim().split('\n');

// Build structure object (lines 1-2)
const swissStructureStr = swissLines[0] + '\n' + swissLines[1].replace(/,$/, '') + '\n}';
const swissStructure = JSON.parse(swissStructureStr);

// Build standings object (lines 1, 3, 4)
const swissStandingsStr = '{\n' + swissLines[2] + '\n' + swissLines[3];
const swissStandings = JSON.parse(swissStandingsStr);

const swissSample = {
    label: 'Real Data - Swiss (12 teams, 5 rounds)',
    structure: swissStructure,
    standings: swissStandings
};

console.log('✓ Swiss: structure has', swissStructure.stageItems.length, 'groups, standings has', swissStandings.groups.length, 'groups');

// Process Single Elimination data
console.log('\nProcessing Single Elimination data...');
const seContent = fs.readFileSync(path.join(__dirname, '../demo/singleElimData.json'), 'utf8');
const seStructure = JSON.parse(seContent);
const seTeams = extractTeamsFromStructure(seStructure);
const seStandings = createStandings(seStructure, seTeams);

const singleElimSample = {
    label: 'Real Data - Single Elimination (16 teams)',
    structure: seStructure,
    standings: seStandings
};

console.log('✓ Single Elimination: extracted', seTeams.length, 'teams');

// Process Double Elimination data
console.log('\nProcessing Double Elimination data...');
const deContent = fs.readFileSync(path.join(__dirname, '../demo/doubleElimData.json'), 'utf8');
const deStructure = JSON.parse(deContent);
const deTeams = extractTeamsFromStructure(deStructure);
const deStandings = createStandings(deStructure, deTeams);

const doubleElimSample = {
    label: 'Real Data - Double Elimination (32 teams)',
    structure: deStructure,
    standings: deStandings
};

console.log('✓ Double Elimination: extracted', deTeams.length, 'teams');

// Load existing showcase-data.json
console.log('\nIntegrating into showcase-data.json...');
const showcasePath = path.join(__dirname, '../demo/showcase-data.json');
const showcaseData = JSON.parse(fs.readFileSync(showcasePath, 'utf8'));

// Add new samples to each format
showcaseData.roundRobin.push(roundRobinSample);
showcaseData.swiss.push(swissSample);
showcaseData.singleElimination.push(singleElimSample);
showcaseData.doubleElimination.push(doubleElimSample);

// Write updated showcase data
fs.writeFileSync(showcasePath, JSON.stringify(showcaseData, null, 2));

console.log('\n✓ Successfully integrated all data into showcase-data.json');
console.log('  - Round Robin: now has', showcaseData.roundRobin.length, 'samples');
console.log('  - Swiss: now has', showcaseData.swiss.length, 'samples');
console.log('  - Single Elimination: now has', showcaseData.singleElimination.length, 'samples');
console.log('  - Double Elimination: now has', showcaseData.doubleElimination.length, 'samples');
console.log('\nYou can now open demo/with-showcase.html to view the data!');
