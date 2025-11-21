import { Match, ParticipantResult, FinalType, GroupType, Id, MatchGame, type RankingItem } from 'brackets-model';
import { Connection, Placement } from './types';
import { isMatchGame, rankingHeader, getDisplayStatus, DisplayStatus } from './helpers';
import { t } from './lang';
import { ConnectorLine } from './layout';

/**
 * Creates the title of the viewer.
 *
 * @param title The title to set.
 */
export function createTitle(title: string): HTMLElement {
    const h1 = document.createElement('h1');
    h1.innerText = title;
    return h1;
}

/**
 * Creates the title of a popover.
 *
 * @param title The title to set.
 */
export function createPopoverTitle(title: string): HTMLElement {
    const h4 = document.createElement('h4');
    h4.innerText = title;
    return h4;
}

/**
 * Creates a container which contains a round-robin stage.
 * 
 * @param stageId ID of the stage.
 */
export function createRoundRobinContainer(stageId: Id): HTMLElement {
    const stage = document.createElement('div');
    stage.classList.add('round-robin');
    stage.setAttribute('data-stage-id', stageId.toString());
    return stage;
}

/**
 * Creates a container which contains an elimination stage.
 * 
 * @param stageId ID of the stage.
 */
export function createEliminationContainer(stageId: Id): HTMLElement {
    const stage = document.createElement('div');
    stage.classList.add('elimination');
    stage.setAttribute('data-stage-id', stageId.toString());
    return stage;
}

/**
 * Creates a container which contains one bracket of a single or double elimination stage.
 *
 * @param groupId ID of the group.
 * @param title Title of the group.
 */
export function createBracketContainer(groupId?: Id, title?: string): HTMLElement {
    const bracket = document.createElement('section');
    bracket.classList.add('bracket');

    // Consolation matches are not in a group.
    if (groupId) {
        bracket.setAttribute('data-group-id', groupId.toString());

        // Extract and set bracket type for CSS targeting
        const groupIdStr = groupId.toString().toLowerCase();
        let bracketType = 'unknown';
        if (groupIdStr.includes('winners-bracket')) bracketType = 'winners';
        else if (groupIdStr.includes('losers-bracket')) bracketType = 'losers';
        else if (groupIdStr.includes('grand-final')) bracketType = 'grand-final';
        else if (groupIdStr.includes('placement')) bracketType = 'placement';

        bracket.setAttribute('data-bracket-type', bracketType);
    }

    if (title) {
        const h2 = document.createElement('h2');
        h2.innerText = title;
        bracket.append(h2);
    }

    return bracket;
}

/**
 * Creates a container which contains a group for round-robin stages.
 *
 * @param groupId ID of the group.
 * @param title Title of the group.
 */
export function createGroupContainer(groupId: Id, title: string): HTMLElement {
    const h2 = document.createElement('h2');
    h2.innerText = title;

    const group = document.createElement('section');
    group.classList.add('group');
    group.setAttribute('data-group-id', groupId.toString());
    group.append(h2);
    return group;
}

/**
 * Creates a wrapper section for round-robin group content with card styling.
 */
export function createRoundRobinGroupSection(): HTMLElement {
    const section = document.createElement('section');
    section.classList.add('round-robin-group');
    return section;
}

/**
 * Creates a "Standings" subheading for the rankings table.
 */
export function createStandingsHeading(): HTMLElement {
    const h3 = document.createElement('h3');
    h3.innerText = 'Standings';
    return h3;
}

/**
 * Creates a wrapper div for ranking tables to enable horizontal scrolling on mobile.
 */
export function createRankingTableWrapper(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.classList.add('ranking-table-wrapper');
    return wrapper;
}

/**
 * Creates a container which contains a list of rounds.
 */
export function createRoundsContainer(): HTMLElement {
    const round = document.createElement('div');
    round.classList.add('rounds');
    return round;
}

/**
 * Creates an SVG element for rendering bracket connectors.
 *
 * @param connectors Array of connector lines to render
 * @param width Total width of the SVG canvas
 * @param height Total height of the SVG canvas
 */
export function createConnectorSVG(connectors: ConnectorLine[], width: number, height: number): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'bracket-connectors');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());

    for (const conn of connectors) {
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        const pointsStr = conn.points.map(p => `${p.x},${p.y}`).join(' ');
        polyline.setAttribute('points', pointsStr);
        polyline.setAttribute('fill', 'none');

        // Apply styling based on connector type
        polyline.setAttribute('class', `connector-${conn.connectorType}`);

        switch (conn.connectorType) {
            case 'cross-bracket':
                // Cross-bracket connectors: lower opacity, dashed, thinner
                polyline.setAttribute('stroke', 'var(--bv-connector-cross-bracket)');
                polyline.setAttribute('stroke-width', '1.5');
                polyline.setAttribute('opacity', '0.3');
                polyline.setAttribute('stroke-dasharray', '4,3');
                break;

            case 'grand-final':
                // Grand final connectors: bold, full opacity, distinct color
                polyline.setAttribute('stroke', 'var(--bv-connector-grand-final)');
                polyline.setAttribute('stroke-width', '3');
                polyline.setAttribute('opacity', '1');
                break;

            case 'internal':
            default:
                // Internal connectors: standard styling
                polyline.setAttribute('stroke', 'var(--bv-connector-internal)');
                polyline.setAttribute('stroke-width', '2');
                polyline.setAttribute('opacity', '0.8');
                break;
        }

        svg.appendChild(polyline);
    }

    return svg;
}

/**
 * Creates a container which contains a round.
 *
 * @param roundId ID of the round.
 * @param title Title of the round.
 * @param tooltip Optional tooltip text to show on hover.
 */
export function createRoundContainer(roundId: Id, title: string, tooltip?: string): HTMLElement {
    const h3 = document.createElement('h3');
    h3.innerText = title;

    if (tooltip) {
        h3.setAttribute('title', tooltip);
        h3.classList.add('has-tooltip');
    }

    const round = document.createElement('article');
    round.classList.add('round');
    round.setAttribute('data-round-id', roundId.toString());
    round.append(h3);
    return round;
}

/**
 * Creates a container which contains a match.
 *
 * @param match A match or a match game.
 */
export function createMatchContainer(match?: Match | MatchGame): HTMLElement {
    const div = document.createElement('div');
    div.classList.add('match');

    if (match) {
        if (isMatchGame(match))
            div.setAttribute('data-match-game-id', match.id.toString());
        else
            div.setAttribute('data-match-id', match.id.toString());

        div.setAttribute('data-match-status', match.status.toString());
    }

    return div;
}

/**
 * Creates a status badge element for a match.
 *
 * @param status The numeric status from the match.
 */
export function createStatusBadge(status: number): HTMLElement {
    const badge = document.createElement('div');
    badge.classList.add('status-badge');

    const displayStatus: DisplayStatus = getDisplayStatus(status);
    badge.classList.add(`status-${displayStatus}`);

    // Set badge text based on display status
    switch (displayStatus) {
        case 'live':
            badge.innerText = 'LIVE';
            break;
        case 'upcoming':
            badge.innerText = '⏱';  // Clock emoji for upcoming
            break;
        case 'completed':
            badge.innerText = '✓';  // Checkmark for completed
            break;
        case 'pending':
            // No text for pending - visual styling only
            break;
    }

    return badge;
}

/**
 * Creates a container which contains the label of a match.
 *
 * @param label The label of the match.
 * @param status The status to set as tooltip.
 * @param onClick Called when the label is clicked.
 */
export function createMatchLabel(label: string | undefined, status: string, onClick?: (event: MouseEvent) => void): HTMLElement {
    const span = document.createElement('span');
    span.innerText = label || '';
    span.title = status;
    onClick && span.addEventListener('click', onClick);
    return span;
}

/**
 * Creates a container which contains the opponents of a match.
 *
 * @param onClick Called when the match is clicked.
 */
export function createOpponentsContainer(onClick?: () => void): HTMLElement {
    const opponents = document.createElement('div');
    opponents.classList.add('opponents');
    onClick && opponents.addEventListener('click', onClick);
    return opponents;
}

/**
 * Creates a container which contains a participant.
 *
 * @param participantId ID of the participant.
 */
export function createParticipantContainer(participantId: Id | null): HTMLElement {
    const participant = document.createElement('div');
    participant.classList.add('participant');

    if (participantId !== null && participantId !== undefined)
        participant.setAttribute('data-participant-id', participantId.toString());

    return participant;
}

/**
 * Creates a container which contains the name of a participant.
 */
export function createNameContainer(): HTMLElement {
    const name = document.createElement('div');
    name.classList.add('name');
    return name;
}

/**
 * Creates a container which contains the result of a match for a participant.
 */
export function createResultContainer(): HTMLElement {
    const result = document.createElement('div');
    result.classList.add('result');
    return result;
}

/**
 * Creates a table.
 */
export function createTable(): HTMLElement {
    return document.createElement('table');
}

/**
 * Creates a table row.
 */
export function createRow(): HTMLElement {
    return document.createElement('tr');
}

/**
 * Creates a table cell.
 *
 * @param data The data in the cell.
 */
export function createCell(data: string | number): HTMLElement {
    const td = document.createElement('td');
    td.innerText = String(data);
    return td;
}

/**
 * Creates the headers for a ranking table.
 *
 * @param ranking The object containing the ranking.
 */
export function createRankingHeaders(ranking: RankingItem[]): HTMLElement {
    const headers = document.createElement('tr');
    const firstItem = ranking[0];

    for (const key in firstItem) {
        const prop = key as keyof RankingItem;
        const header = rankingHeader(prop);
        const th = document.createElement('th');
        th.innerText = header.text;
        th.setAttribute('title', header.tooltip);
        headers.append(th);
    }

    return headers;
}

/**
 * Sets a hint on a name container.
 *
 * @param nameContainer The name container.
 * @param hint The hint to set.
 */
export function setupHint(nameContainer: HTMLElement, hint: string): void {
    nameContainer.classList.add('hint');
    nameContainer.innerText = hint;
    nameContainer.title = hint;
}

/**
 * Sets a BYE on a name container.
 *
 * @param nameContainer The name container.
 */
export function setupBye(nameContainer: HTMLElement): void {
    nameContainer.innerText = t('common.bye');
    nameContainer.classList.add('bye');
}

/**
 * Checks if a participant name is a placeholder value.
 *
 * @param name The participant name to check.
 */
export function isPlaceholderName(name: string | null | undefined): boolean {
    if (!name || name.trim() === '') return true;
    const lower = name.toLowerCase().trim();
    return lower === 'tbd' || lower === 'bye' || lower === 'unknown' || lower === 'pending';
}

/**
 * Sets placeholder styling on a participant.
 *
 * @param participantContainer The participant container.
 * @param nameContainer The name container.
 * @param displayText Optional text to display (defaults to current text or "TBD").
 */
export function setupPlaceholder(participantContainer: HTMLElement, nameContainer: HTMLElement, displayText?: string): void {
    participantContainer.classList.add('placeholder');
    nameContainer.classList.add('placeholder');
    if (displayText) {
        nameContainer.innerText = displayText;
    }
}

/**
 * Sets a win for a participant.
 *
 * @param participantContainer The participant container.
 * @param resultContainer The result container.
 * @param participant The participant result.
 */
export function setupWin(participantContainer: HTMLElement, resultContainer: HTMLElement, participant: ParticipantResult): void {
    if (participant.result && participant.result === 'win') {
        participantContainer.classList.add('win');

        if (participant.score === undefined)
            resultContainer.innerText = t('abbreviations.win');
    }
}

/**
 * Sets a loss for a participant.
 *
 * @param participantContainer The participant container.
 * @param resultContainer The result container.
 * @param participant The participant result.
 */
export function setupLoss(participantContainer: HTMLElement, resultContainer: HTMLElement, participant: ParticipantResult): void {
    if (participant.result && participant.result === 'loss' || participant.forfeit) {
        participantContainer.classList.add('loss');

        if (participant.forfeit)
            resultContainer.innerText = t('abbreviations.forfeit');
        else if (participant.score === undefined)
            resultContainer.innerText = t('abbreviations.loss');
    }
}

/**
 * Adds the participant origin to a name.
 *
 * @param nameContainer The name container.
 * @param text The text to set (origin).
 * @param placement The placement of the participant origin.
 */
export function addParticipantOrigin(nameContainer: HTMLElement, text: string, placement: Placement): void {
    const span = document.createElement('span');

    if (placement === 'before') {
        span.innerText = `${text} `;
        nameContainer.prepend(span);
    } else if (placement === 'after') {
        span.innerText = ` (${text})`;
        nameContainer.append(span);
    }
}

/**
 * Adds the participant image to a name.
 *
 * @param nameContainer The name container.
 * @param src Source of the image.
 */
export function addParticipantImage(nameContainer: HTMLElement, src: string): void {
    const img = document.createElement('img');
    img.src = src;
    nameContainer.prepend(img);
}

/**
 * Returns the connection for a given round in the final.
 *
 * @param finalType Type of final.
 * @param roundNumber Number of the round.
 * @param matchCount The count of matches.
 */
export function getFinalConnection(finalType: FinalType, roundNumber: number, matchCount: number): Connection {
    return {
        connectPrevious: finalType === 'grand_final' && (roundNumber === 1 && 'straight'),
        connectNext: matchCount === 2 && roundNumber === 1 && 'straight',
    };
}

/**
 * Creates a container for inline match metadata (date, round, etc.)
 */
export function createMatchMetadataContainer(): HTMLElement {
    const metadata = document.createElement('div');
    metadata.classList.add('match-metadata');
    return metadata;
}

/**
 * Adds enhanced metadata to the opponents container with status and optional timer
 *
 * @param opponentsContainer The opponents container to add metadata to
 * @param options Metadata options including bestOf, status, and startedAt
 */
export function addEnhancedMetadata(
    opponentsContainer: HTMLElement,
    options: {
        bestOf?: string,
        status?: number,
        startedAt?: number, // Unix timestamp in ms
        round?: number,
    }
): void {
    const { bestOf, status, startedAt } = options;
    const metadata = createMatchMetadataContainer();

    // Determine display status
    // Status enum: Locked=0, Waiting=1, Ready=2, Running=3, Completed=4, Archived=5
    const isLive = status === 3;

    // Add status class for styling (only live gets special treatment)
    if (isLive) {
        metadata.classList.add('status-live');
        metadata.innerText = 'LIVE';

        // Add timer for live matches
        if (startedAt) {
            const timerSpan = document.createElement('span');
            timerSpan.classList.add('live-timer');
            timerSpan.innerText = ' ' + formatElapsedTime(startedAt);
            metadata.appendChild(timerSpan);

            // Start timer interval
            const intervalId = setInterval(() => {
                if (!document.body.contains(metadata)) {
                    clearInterval(intervalId);
                    return;
                }
                timerSpan.innerText = ' ' + formatElapsedTime(startedAt);
            }, 1000);

            // Store interval for potential cleanup
            (metadata as any)._timerInterval = intervalId;
        }
    } else if (bestOf) {
        // For non-live matches, just show bestOf (e.g., "Bo3")
        metadata.innerText = bestOf;
    } else {
        // No content to show, don't add metadata
        return;
    }

    // Append to opponents container (positioned absolute in corner via CSS)
    opponentsContainer.appendChild(metadata);
}

/**
 * Formats elapsed time from a start timestamp
 */
function formatElapsedTime(startedAt: number): string {
    const now = Date.now();
    const elapsed = Math.floor((now - startedAt) / 1000);

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Legacy function - redirects to addEnhancedMetadata
 * @deprecated Use addEnhancedMetadata instead
 */
export function addInlineMetadata(opponentsContainer: HTMLElement, _date?: string, round?: number, bestOf?: string): void {
    addEnhancedMetadata(opponentsContainer, { bestOf, round });
}

/**
 * Creates a bracket section title element (e.g., "Upper Bracket", "Lower Bracket")
 * @param title The title text to display
 * @returns An HTMLElement containing the bracket section title
 */
export function createBracketSectionTitle(title: string): HTMLElement {
    const titleElement = document.createElement('div');
    titleElement.className = 'bracket-section-title';
    titleElement.textContent = title;
    return titleElement;
}
