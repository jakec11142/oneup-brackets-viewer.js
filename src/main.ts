import './style.scss';
import { debug } from './debug';
import { Participant, Match, ParticipantResult, Status, GroupType, FinalType, Id, StageType } from 'brackets-model';
import { splitBy, getOriginAbbreviation, findRoot, completeWithBlankMatches, sortBy, isMatchGame, isMatch, splitByWithLeftovers } from './helpers';
import * as dom from './dom';
import * as lang from './lang';
import { Locale } from './lang';
import { helpers } from 'brackets-manager';
import { BracketEdgeResponse } from './dto/types';
import { computeLayout, computeSwissLayout } from './layout';
import { getViewModel, type ViewModel, type LayoutConfig, type BracketKind } from './viewModels';
import { detectFormatSize, getDEProfile } from './profiles/deProfiles';
import { getSemanticRoundLabel } from './round-labels';
// Performance optimizations
import { globalLayoutCache, globalPerfMonitor } from './performance';
import { createPooledConnectorSVG, globalConnectorPool } from './rendering/SVGConnectorPool';
// Config resolution
import { resolveConfig, validateViewerData, applyThemeToTarget } from './config/ConfigResolver';
// Renderers
import { renderRoundRobin } from './renderers/RoundRobinRenderer';
import { renderSwiss } from './renderers/SwissRenderer';
import { renderUnifiedSingleElimination, renderUnifiedDoubleElimination } from './renderers/EliminationRenderer';
import {
    Config,
    OriginHint,
    ParticipantContainers,
    RoundNameGetter,
    ViewerData,
    ParticipantImage,
    Side,
    MatchClickCallback,
    RoundNameInfo,
    MatchWithMetadata,
    InternalViewerData,
    MatchGameWithMetadata,
    ToggleEvent,
    ViewerStage,
    DoubleElimMode,
} from './types';

export class BracketsViewer {

    readonly participantRefs: Record<Id, HTMLElement[]> = {};

    private participants: Participant[] = [];
    private participantImages: ParticipantImage[] = [];
    private edges: BracketEdgeResponse[] = [];

    private stage!: ViewerStage;
    private config!: Config;
    private viewModel!: ViewModel;
    private layoutConfig!: LayoutConfig;
    private skipFirstRound = false;
    private popover!: HTMLElement;

    // eslint-disable-next-line jsdoc/require-jsdoc
    private getRoundName(info: RoundNameInfo, fallbackGetter: RoundNameGetter): string {
        return this.config.customRoundName?.(info, lang.t) || fallbackGetter(info, lang.t);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _onMatchClick: MatchClickCallback = (match: MatchWithMetadata): void => { };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _onMatchLabelClick: MatchClickCallback = (match: MatchWithMetadata): void => { };

    /**
     * @deprecated Use `onMatchClick` in the `config` parameter of `viewer.render()`.
     * @param callback A callback to be called when a match is clicked.
     */
    public set onMatchClicked(callback: MatchClickCallback) {
        this._onMatchClick = callback;
    }

    /**
     * Renders data generated with `brackets-manager.js`. If multiple stages are given, they will all be displayed.
     *
     * Stages won't be discriminated visually based on the tournament they belong to.
     *
     * @param data The data to display.
     * @param config An optional configuration for the viewer.
     */
    // eslint-disable-next-line @typescript-eslint/require-await -- Keep this async for backwards compatibility.
    public async render(data: ViewerData, config?: Partial<Config>): Promise<void> {
        if (typeof data === 'string')
            throw Error('Using a CSS selector as the first argument is deprecated. Please look here: https://github.com/Drarig29/brackets-viewer.js');

        // Validate input data
        validateViewerData(data);

        // Resolve configuration (merges defaults, view model, and user overrides)
        const resolved = resolveConfig(config, data);
        this.config = resolved.config;
        this.viewModel = resolved.viewModel;
        this.layoutConfig = resolved.layoutConfig;

        // Set callbacks
        if (config?.onMatchClick)
            this._onMatchClick = config.onMatchClick;
        if (config?.onMatchLabelClick)
            this._onMatchLabelClick = config.onMatchLabelClick;

        // Initialize state
        this.participants = data.participants;
        data.participants.forEach(participant => this.participantRefs[participant.id] = []);
        this.edges = data.edges ?? [];

        // Create popover element
        const root = document.createDocumentFragment();
        this.popover = document.createElement('div');
        this.popover.setAttribute('popover', 'auto');
        this.popover.addEventListener('toggle', (event) => {
            if ((event as ToggleEvent).newState === 'closed')
                this.clearPreviousPopoverSelections();
        });
        root.append(this.popover);

        // Render all stages
        data.stages.forEach(stage => this.renderStage(root, {
            ...data,
            stages: [stage],
            matches: data.matches
                .filter(match => match.stage_id === stage.id)
                .map(match => ({
                    ...match,
                    metadata: {
                        stageType: stage.type,
                        games: data.matchGames.filter(game => game.parent_id === match.id),
                    },
                })),
        }));

        // Apply to target element
        const target = findRoot(config?.selector);
        applyThemeToTarget(target, this.config, this.viewModel, this.layoutConfig);

        if (config?.clear)
            target.innerHTML = '';

        target.append(root);
    }

    /**
     * Updates the results of an existing match.
     * 
     * @param match The match to update.
     */
    public updateMatch(match: Match): void {
        //  TODO: finish this function (update win/loss/forfeit, scoreboard in round-robin, etc.)

        const matchContainer = document.querySelector(`[data-match-id='${match.id}']`);
        if (!matchContainer) throw Error('Match not found.');

        matchContainer.setAttribute('data-match-status', match.status.toString());

        const result1 = matchContainer.querySelector('.participant:nth-of-type(1) .result');
        if (result1 && match.opponent1?.score) result1.innerHTML = match.opponent1?.score?.toString();

        const result2 = matchContainer.querySelector('.participant:nth-of-type(2) .result');
        if (result2 && match.opponent2?.score) result2.innerHTML = match.opponent2?.score?.toString();
    }

    /**
     * Sets the images which will be rendered for every participant.
     *
     * @param images The participant images.
     */
    public setParticipantImages(images: ParticipantImage[]): void {
        this.participantImages = images;
    }

    /**
     * Adds a locale to the available i18n bundles.
     * 
     * @param name Name of the locale.
     * @param locale Contents of the locale.
     */
    public async addLocale(name: string, locale: Locale): Promise<void> {
        await lang.addLocale(name, locale);
    }

    /**
     * Renders a stage (round-robin, single or double elimination).
     *
     * @param root The root element.
     * @param data The data to display.
     */
    private renderStage(root: DocumentFragment, data: InternalViewerData): void {
        const stage = data.stages[0];
        if (!data.matches?.length)
            throw Error(`No matches found for stage ${stage.id}`);

        // Consolation matches are under `-1` in the array.
        const matchesByGroup = splitByWithLeftovers(data.matches, 'group_id');

        this.stage = stage;
        this.skipFirstRound = stage.settings.skipFirstRound || false;

        switch (stage.type) {
            case 'round_robin':
                this.renderRoundRobin(root, stage, matchesByGroup);
                break;
            case 'swiss':
                this.renderSwiss(root, stage, matchesByGroup);
                break;
            case 'single_elimination':
            case 'double_elimination':
                this.renderElimination(root, stage, matchesByGroup);
                break;
            default:
                throw Error(`Unknown bracket type: ${stage.type as string}`);
        }

        this.renderConsolationMatches(root, stage, matchesByGroup);
    }

    /**
     * Renders a round-robin stage.
     *
     * @param root The root element.
     * @param stage The stage to render.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderRoundRobin(root: DocumentFragment, stage: ViewerStage, matchesByGroup: MatchWithMetadata[][]): void {
        renderRoundRobin(root, stage, matchesByGroup, {
            config: this.config,
            createMatch: (match, useCompactView) => this.createMatch(match, useCompactView ?? false),
        });
    }

    /**
     * Renders a Swiss stage using record-bucket column layout.
     *
     * @param root The root element.
     * @param stage The stage to render.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderSwiss(root: DocumentFragment, stage: ViewerStage, matchesByGroup: MatchWithMetadata[][]): void {
        renderSwiss(root, stage, matchesByGroup, {
            config: this.config,
            layoutConfig: this.layoutConfig,
            createBracketMatch: (match) => this.createBracketMatch(match),
        });
    }

    /**
     * Renders an elimination stage (single or double).
     *
     * @param root The root element.
     * @param stage The stage to render.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderElimination(root: DocumentFragment, stage: ViewerStage, matchesByGroup: MatchWithMetadata[][]): void {
        const container = dom.createEliminationContainer(stage.id);
        container.append(dom.createTitle(stage.name));

        if (stage.type === 'single_elimination')
            this.renderSingleElimination(container, matchesByGroup);
        else
            this.renderDoubleElimination(container, matchesByGroup);

        root.append(container);
    }

    /**
     * Renders a list of consolation matches.
     *
     * @param root The root element.
     * @param stage The stage to render.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderConsolationMatches(root: DocumentFragment, stage: ViewerStage, matchesByGroup: MatchWithMetadata[][]): void {
        const consolationMatches = matchesByGroup[-1];
        if (!consolationMatches?.length)
            return;

        const consolation = dom.createBracketContainer(undefined, lang.t('common.consolation'));
        const roundsContainer = dom.createRoundsContainer();

        let matchNumber = 0;
        for (const match of consolationMatches) {
            roundsContainer.append(this.createMatch({
                ...match,
                metadata: {
                    label: lang.t('match-label.default', { matchNumber: ++matchNumber }),
                    stageType: stage.type,
                    games: [],
                },
            }, true));
        }

        consolation.append(roundsContainer);
        root.append(consolation);
    }

    /**
     * Renders a single elimination stage.
     *
     * @param container The container to render into.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderSingleElimination(container: HTMLElement, matchesByGroup: MatchWithMetadata[][]): void {
        // Use unified rendering for SE with consolation finals
        this.renderUnifiedSingleElimination(container, matchesByGroup);
    }

    /**
     * Renders a single elimination stage with unified absolute positioning.
     *
     * @param container The container to render into.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderUnifiedSingleElimination(container: HTMLElement, matchesByGroup: MatchWithMetadata[][]): void {
        renderUnifiedSingleElimination(container, matchesByGroup, {
            config: this.config,
            layoutConfig: this.layoutConfig,
            edges: this.edges,
            stage: this.stage,
            createBracketMatch: (match) => this.createBracketMatch(match),
            createConnectorSVG: (connectors, width, height) => this.createConnectorSVG(connectors, width, height),
        });
    }

    /**
     * Renders a double elimination stage.
     *
     * @param container The container to render into.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderDoubleElimination(container: HTMLElement, matchesByGroup: MatchWithMetadata[][]): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const mode: DoubleElimMode = this.config.doubleElimMode ?? 'unified';

        if (mode === 'unified') {
            this.renderUnifiedDoubleElimination(container, matchesByGroup);
            return;
        }

        // SPLIT MODE (legacy behavior)
        const hasLoserBracket = matchesByGroup[1] !== undefined;
        const winnerBracketMatches = splitBy(matchesByGroup[0], 'round_id').map(matches => sortBy(matches, 'number'));
        const { hasFinal, connectFinal, grandFinalMatches, consolationFinalMatches } = this.getFinalInfoDoubleElimination(matchesByGroup);

        this.renderBracket(container, winnerBracketMatches, lang.getWinnerBracketRoundName, 'winner_bracket', connectFinal);

        if (hasLoserBracket) {
            const loserBracketMatches = splitBy(matchesByGroup[1], 'round_id').map(matches => sortBy(matches, 'number'));
            this.renderBracket(container, loserBracketMatches, lang.getLoserBracketRoundName, 'loser_bracket');
        }

        if (hasFinal) {
            this.renderFinal(container, 'grand_final', grandFinalMatches);
            this.renderFinal(container, 'consolation_final', consolationFinalMatches);
        }
    }

    /**
     * Renders a unified double elimination stage with all bracket groups on one canvas.
     *
     * @param container The container to render into.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderUnifiedDoubleElimination(container: HTMLElement, matchesByGroup: MatchWithMetadata[][]): void {
        renderUnifiedDoubleElimination(container, matchesByGroup, {
            config: this.config,
            layoutConfig: this.layoutConfig,
            edges: this.edges,
            stage: this.stage,
            createBracketMatch: (match) => this.createBracketMatch(match),
            createConnectorSVG: (connectors, width, height) => this.createConnectorSVG(connectors, width, height),
        });
    }

    /**
     * Returns information about the final group in double elimination.
     * 
     * @param matchesByGroup A list of matches for each group.
     */
    private getFinalInfoDoubleElimination(matchesByGroup: MatchWithMetadata[][]): {
        hasFinal: boolean,
        connectFinal: boolean,
        grandFinalMatches: MatchWithMetadata[]
        consolationFinalMatches: MatchWithMetadata[]
    } {
        const hasFinal = matchesByGroup[2] !== undefined;
        const finalMatches = sortBy(matchesByGroup[2] ?? [], 'number');

        // All grand final matches have a `number: 1` property. We can have 0, 1 or 2 of them.
        const grandFinalMatches = finalMatches.filter(match => match.number === 1);
        // All consolation matches have a `number: 2` property (set by the manager). We can only have 0 or 1 of them.
        const consolationFinalMatches = finalMatches.filter(match => match.number === 2);

        // In double elimination, we can have a grand final, a consolation final, or both.
        // We only want to connect the upper bracket with the final group when we have at least one grand final match.
        // The grand final will always be placed directly next to the bracket.
        const connectFinal = grandFinalMatches.length > 0;

        return { hasFinal, connectFinal, grandFinalMatches, consolationFinalMatches };
    }

    /**
     * Renders a bracket.
     *
     * @param container The container to render into.
     * @param matchesByRound A list of matches for each round.
     * @param getRoundName A function giving a round's name based on its number.
     * @param bracketType Type of the bracket.
     * @param connectFinal Whether to connect the last match of the bracket to the first match of the final group.
     */
    private renderBracket(container: HTMLElement, matchesByRound: MatchWithMetadata[][], getRoundName: RoundNameGetter, bracketType: GroupType, connectFinal?: boolean): void {
        const groupId = matchesByRound[0][0].group_id;
        const roundCount = matchesByRound.length;
        const bracketContainer = dom.createBracketContainer(groupId, lang.getBracketName(this.stage, bracketType));
        const roundsContainer = dom.createRoundsContainer();

        const { matches: completedMatches, fromToornament } = completeWithBlankMatches(bracketType, matchesByRound[0], matchesByRound[1]);

        // Step 1: Calculate positions for ALL matches (original ordering)
        // This ensures every match has a position for connectors
        const allMatchesForLayout: MatchWithMetadata[] = [];
        for (let roundIndex = 0; roundIndex < matchesByRound.length; roundIndex++) {
            const roundNumber = roundIndex + 1;
            for (const match of matchesByRound[roundIndex]) {
                if (match) {
                    allMatchesForLayout.push({
                        ...match,
                        metadata: {
                            ...match.metadata,
                            roundNumber,
                            roundCount,
                            matchLocation: bracketType,
                            connectFinal,
                        },
                    });
                }
            }
        }

        // Filter edges to only those connecting matches in this bracket
        const matchIds = new Set(allMatchesForLayout.map(m => String(m.id)));
        const bracketEdges = this.edges.filter(edge =>
            matchIds.has(String(edge.fromMatchId ?? '')) &&
            matchIds.has(String(edge.toMatchId ?? '')),
        );

        // Compute layout using ALL matches
        const layout = computeLayout(allMatchesForLayout, bracketEdges, bracketType, this.layoutConfig);

        // Debug: Log connector count
        debug.log(`[${bracketType}] Matches: ${allMatchesForLayout.length}, Edges: ${bracketEdges.length}, Connectors: ${layout.connectors.length}`);
        if (layout.connectors.length > 0) 
            debug.log('First connector:', layout.connectors[0]);
        

        // Render round headers with semantic labels (if enabled)
        debug.log('showRoundHeaders config:', this.config.showRoundHeaders, 'will render?', this.config.showRoundHeaders !== false);
        if (this.config.showRoundHeaders !== false) {
            layout.headerPositions.forEach(header => {
                const roundInfo = {
                    roundNumber: header.roundNumber,
                    roundCount,
                };

                // Use appropriate semantic label function based on bracket type
                let roundName: string;
                if (bracketType === 'winner_bracket') {
                    roundName = lang.getWinnerBracketRoundName(roundInfo, lang.t);
                } else if (bracketType === 'loser_bracket') {
                    roundName = lang.getLoserBracketRoundName(roundInfo, lang.t);
                } else {
                    roundName = lang.getRoundName(roundInfo, lang.t);
                }

                const h3 = document.createElement('h3');
                h3.innerText = roundName;
                h3.style.position = 'absolute';
                h3.style.left = `${header.xPx}px`;
                h3.style.top = `${header.yPx}px`;
                h3.style.width = `var(--bv-match-width)`;
                roundsContainer.append(h3);
            });
        }

        // Step 2: Render matches using the proper ordering
        // Use completedMatches for round 1 if reordered, original for other rounds
        let renderedCount = 0;
        let positionedCount = 0;

        for (let roundIndex = 0; roundIndex < matchesByRound.length; roundIndex++) {
            const roundNumber = roundIndex + 1;
            const roundMatches = fromToornament && roundNumber === 1 ? completedMatches : matchesByRound[roundIndex];

            roundMatches.forEach((match, _idx) => {
                if (!match) return; // Skip null entries from reordering

                const matchWithMetadata: MatchWithMetadata = {
                    ...match,
                    metadata: {
                        ...match.metadata,
                        roundNumber,
                        roundCount,
                        matchLocation: bracketType,
                        connectFinal,
                    },
                };

                const matchEl = this.createBracketMatch(matchWithMetadata);
                const pos = layout.matchPositions.get(String(match.id));

                if (pos) {
                    matchEl.style.position = 'absolute';
                    matchEl.style.left = `${pos.xPx}px`;
                    matchEl.style.top = `${pos.yPx}px`;
                    positionedCount++;
                } else 
                    debug.warn(`⚠️ No position found for match ${match.id}`);
                

                roundsContainer.append(matchEl);
                renderedCount++;
            });
        }

        debug.log(`✅ Rendered ${renderedCount} matches (${positionedCount} positioned)`);

        // Set explicit size on rounds container to fit all absolutely positioned matches
        roundsContainer.style.width = `${layout.totalWidth}px`;
        roundsContainer.style.height = `${layout.totalHeight}px`;
        debug.log(`📐 Container sized to ${layout.totalWidth}x${layout.totalHeight}px`);

        // Add SVG connectors overlay (if enabled)
        if (this.config.showConnectors !== false) {
            const svg = this.createConnectorSVG(layout.connectors, layout.totalWidth, layout.totalHeight);
            roundsContainer.prepend(svg);
        } else {
            debug.log(`🔗 Connectors disabled by config (showConnectors: false)`);
        }

        bracketContainer.append(roundsContainer);
        container.append(bracketContainer);
    }

    /**
     * Renders a final group.
     *
     * @param container The container to render into.
     * @param finalType Type of the final.
     * @param matches Matches of the final.
     */
    private renderFinal(container: HTMLElement, finalType: FinalType, matches: MatchWithMetadata[]): void {
        // Double elimination stages can have a grand final, or a consolation final, or both.
        if (matches.length === 0)
            return;

        const upperBracket = container.querySelector('.bracket .rounds');
        if (!upperBracket) throw Error('Upper bracket not found.');

        const winnerWb = matches[0].opponent1;
        const displayCount = winnerWb?.id === null || winnerWb?.result === 'win' ? 1 : 2;
        const finalMatches = matches.slice(0, displayCount);
        const roundCount = finalMatches.length;

        const defaultFinalRoundNameGetter: RoundNameGetter = ({ roundNumber, roundCount }) => lang.getFinalMatchLabel(finalType, roundNumber, roundCount);

        for (let roundIndex = 0; roundIndex < finalMatches.length; roundIndex++) {
            const roundNumber = roundIndex + 1;
            const roundName = this.getRoundName({
                roundNumber,
                roundCount,
                groupType: lang.toI18nKey('final_group'),
                finalType: lang.toI18nKey(finalType),
            }, defaultFinalRoundNameGetter);

            const finalMatch: MatchWithMetadata = {
                ...finalMatches[roundIndex],
                metadata: {
                    ...finalMatches[roundIndex].metadata,
                    roundNumber,
                    roundCount,
                    matchLocation: 'final_group',
                },
            };

            const roundContainer = dom.createRoundContainer(finalMatch.round_id, roundName);
            roundContainer.append(this.createFinalMatch(finalType, finalMatch));
            upperBracket.append(roundContainer);
        }
    }

    /**
     * Creates a match in a bracket.
     *
     * @param match Information about the match.
     */
    private createBracketMatch(match: MatchWithMetadata): HTMLElement {
        const { roundNumber, roundCount, matchLocation } = match.metadata;

        if (roundNumber === undefined || roundCount === undefined || matchLocation === undefined)
            throw Error(`The match's internal data is missing roundNumber, roundCount or matchLocation: ${JSON.stringify(match)}`);

        const matchLabel = lang.getMatchLabel(match.number, roundNumber, roundCount, matchLocation);
        const originHint = lang.getOriginHint(roundNumber, roundCount, this.skipFirstRound, matchLocation);

        match.metadata.label = matchLabel;
        match.metadata.originHint = originHint;

        return this.createMatch(match, true);
    }

    /**
     * Creates a match in a final.
     *
     * @param finalType Type of the final.
     * @param match Information about the match.
     */
    private createFinalMatch(finalType: FinalType, match: MatchWithMetadata): HTMLElement {
        const { roundNumber, roundCount } = match.metadata;

        if (roundNumber === undefined || roundCount === undefined)
            throw Error(`The match's internal data is missing roundNumber or roundCount: ${JSON.stringify(match)}`);

        const connection = dom.getFinalConnection(finalType, roundNumber, roundCount);
        const matchLabel = lang.getFinalMatchLabel(finalType, roundNumber, roundCount);
        const originHint = lang.getFinalOriginHint(match.metadata.stageType as StageType, finalType, roundNumber);

        match.metadata.connection = connection;
        match.metadata.label = matchLabel;
        match.metadata.originHint = originHint;

        return this.createMatch(match, true);
    }

    /**
     * Creates a hidden empty match to act as a placeholder.
     */
    private skipBracketMatch(): HTMLElement {
        const matchContainer = dom.createMatchContainer();
        const opponents = dom.createOpponentsContainer();

        const participant1 = this.createParticipant(null, true);
        const participant2 = this.createParticipant(null, true);

        opponents.append(participant1, participant2);
        matchContainer.append(opponents);
        matchContainer.style.visibility = 'hidden';

        return matchContainer;
    }

    /**
     * Creates a match based on its results.
     *
     * @param match Results of the match.
     * @param propagateHighlight Whether to highlight participants in other matches.
     */
    private createMatch(match: MatchWithMetadata | MatchGameWithMetadata, propagateHighlight: boolean): HTMLElement {
        const matchContainer = dom.createMatchContainer(match);

        const opponents = isMatch(match)
            ? dom.createOpponentsContainer(() => this._onMatchClick(match))
            : dom.createOpponentsContainer();

        if (isMatch(match) && match.status >= Status.Completed)
            match.metadata.originHint = undefined;

        if (isMatch(match)) {
            const { originHint, matchLocation, roundNumber, roundCount, roundBestOf } = match.metadata;

            const participant1 = this.createParticipant(match.opponent1, propagateHighlight, 'opponent1', originHint, matchLocation, roundNumber);
            const participant2 = this.createParticipant(match.opponent2, propagateHighlight, 'opponent2', originHint, matchLocation, roundNumber);

            this.renderMatchLabel(opponents, match);

            opponents.append(participant1, participant2);

            // Add enhanced metadata with status and optional timer
            if (this.config.showMatchMetadata !== false) {
                // Skip round number for standalone placement/consolation finals
                const shouldShowRoundNumber = !(matchLocation === 'final_group' && roundCount === 1);
                const displayRoundNumber = shouldShowRoundNumber ? roundNumber : undefined;
                dom.addEnhancedMetadata(opponents, {
                    bestOf: roundBestOf || 'Bo3', // Default to Bo3 if not specified
                    status: match.status,
                    startedAt: (match as any).startedAt, // Optional timestamp if provided
                    round: displayRoundNumber,
                });
            }
        } else {
            const participant1 = this.createParticipant(match.opponent1, propagateHighlight, 'opponent1');
            const participant2 = this.createParticipant(match.opponent2, propagateHighlight, 'opponent2');

            this.renderMatchLabel(opponents, match);

            opponents.append(participant1, participant2);
        }

        matchContainer.append(opponents);

        return matchContainer;
    }

    /**
     * Creates a participant for a match.
     *
     * @param participant Information about the participant.
     * @param propagateHighlight Whether to highlight the participant in other matches.
     * @param side Side of the participant.
     * @param originHint Origin hint for the match.
     * @param matchLocation Location of the match.
     * @param roundNumber Number of the round.
     */
    private createParticipant(participant: ParticipantResult | null, propagateHighlight: boolean, side?: Side, originHint?: OriginHint, matchLocation?: GroupType, roundNumber?: number): HTMLElement {
        const containers: ParticipantContainers = {
            participant: dom.createParticipantContainer(participant && participant.id),
            name: dom.createNameContainer(),
            result: dom.createResultContainer(),
        };

        if (participant === null || participant === undefined)
            dom.setupBye(containers.name);
        else
            this.renderParticipant(containers, participant, side, originHint, matchLocation, roundNumber);

        containers.participant.append(containers.name, containers.result);

        if (participant && participant.id !== null)
            this.setupMouseHover(participant.id, containers.participant, propagateHighlight);

        return containers.participant;
    }

    /**
     * Renders a participant.
     *
     * @param containers Containers for the participant.
     * @param participant The participant result.
     * @param side Side of the participant.
     * @param originHint Origin hint for the match.
     * @param matchLocation Location of the match.
     * @param roundNumber Number of the round.
     */
    private renderParticipant(containers: ParticipantContainers, participant: ParticipantResult, side?: Side, originHint?: OriginHint, matchLocation?: GroupType, roundNumber?: number): void {
        const found = this.participants.find(item => item.id === participant.id);

        if (found) {
            containers.name.innerText = found.name;
            containers.participant.setAttribute('title', found.name);

            // Check for placeholder names (TBD, BYE, empty, etc.)
            if (dom.isPlaceholderName(found.name)) {
                dom.setupPlaceholder(containers.participant, containers.name);
                containers.result.innerText = '-';
                return; // Don't apply win/loss styling to placeholders
            }

            this.renderParticipantImage(containers.name, found.id);
            this.renderParticipantOrigin(containers.name, participant, side, matchLocation, roundNumber);
        } else
            this.renderHint(containers.name, participant, originHint, matchLocation);

        containers.result.innerText = `${participant.score === undefined ? '-' : participant.score}`;

        dom.setupWin(containers.participant, containers.result, participant);
        dom.setupLoss(containers.participant, containers.result, participant);
    }

    /**
     * Renders a participant image.
     *
     * @param nameContainer The name container.
     * @param participantId ID of the participant.
     */
    private renderParticipantImage(nameContainer: HTMLElement, participantId: Id): void {
        const found = this.participantImages.find(item => item.participantId === participantId);
        if (found) dom.addParticipantImage(nameContainer, found.imageUrl);
    }

    /**
     * Renders a match label.
     * 
     * @param opponents The opponents container.
     * @param match Results of the match.
     */
    private renderMatchLabel(opponents: HTMLElement, match: MatchWithMetadata | MatchGameWithMetadata): void {
        const { label } = match.metadata;

        if (isMatchGame(match)) {
            opponents.append(dom.createMatchLabel(label, lang.getMatchStatus(match.status)));
            return;
        }

        const onClick = (event: MouseEvent): void => {
            // Prevent `this._onMatchClick()` from being called.
            event.stopPropagation();
            this._onMatchLabelClick(match);

            if (match.child_count > 0 && this.config.showPopoverOnMatchLabelClick) {
                this.clearPreviousPopoverSelections();
                opponents.classList.add('popover-selected');
                this.showPopover(match);
            }
        };

        // Check if we're showing inline metadata (which includes best-of info)
        const hasInlineMetadata = isMatch(match) && match.metadata.roundBestOf !== undefined;

        if (match.child_count > 0 && !hasInlineMetadata) {
            const childCountLabel = lang.t('common.best-of-x', { x: match.child_count });
            const joined = label ? `${label}, ${childCountLabel}` : childCountLabel;
            opponents.append(dom.createMatchLabel(joined, lang.getMatchStatus(match.status), onClick));
        }
    }

    /**
     * Show a popover to display the games of a match.
     * 
     * @param match The parent match.
     */
    private showPopover(match: MatchWithMetadata): void {
        this.popover.innerText = '';

        const { roundNumber, roundCount, matchLocation } = match.metadata;

        const matchLabel = lang.getMatchLabel(match.number, roundNumber, roundCount, matchLocation);
        const popoverTitle = dom.createPopoverTitle(matchLabel);
        this.popover.append(popoverTitle);

        for (const game of match.metadata.games) {
            const matchGameLabel = lang.t('match-label.match-game', { gameNumber: game.number });
            const match = this.createMatch({
                ...game,
                metadata: { label: matchGameLabel },
            }, false);

            this.popover.append(match);
        }

        try {
            this.popover.togglePopover();
        } catch {
            // Keep this while Firefox doesn't support the Popover API.
        }
    }

    /**
     * Renders an origin hint for a participant.
     *
     * @param nameContainer The name container.
     * @param participant The participant result.
     * @param originHint Origin hint for the participant.
     * @param matchLocation Location of the match.
     */
    private renderHint(nameContainer: HTMLElement, participant: ParticipantResult, originHint?: OriginHint, matchLocation?: GroupType): void {
        if (originHint === undefined || participant.position === undefined) return;
        if (!this.config.showSlotsOrigin) return;
        if (!this.config.showLowerBracketSlotsOrigin && matchLocation === 'loser_bracket') return;

        dom.setupHint(nameContainer, originHint(participant.position));
    }

    /**
     * Renders a participant's origin.
     *
     * @param nameContainer The name container.
     * @param participant The participant result.
     * @param side Side of the participant.Side of the participant.
     * @param matchLocation Location of the match.
     * @param roundNumber Number of the round.
     */
    private renderParticipantOrigin(nameContainer: HTMLElement, participant: ParticipantResult, side?: Side, matchLocation?: GroupType, roundNumber?: number): void {
        if (participant.position === undefined || matchLocation === undefined) return;
        if (!this.config.participantOriginPlacement || this.config.participantOriginPlacement === 'none') return;
        if (!this.config.showSlotsOrigin) return;
        if (!this.config.showLowerBracketSlotsOrigin && matchLocation === 'loser_bracket') return;

        const abbreviation = getOriginAbbreviation(matchLocation, this.skipFirstRound, roundNumber, side);
        if (!abbreviation) return;

        const origin = `${abbreviation}${participant.position}`;
        dom.addParticipantOrigin(nameContainer, origin, this.config.participantOriginPlacement);
    }

    /**
     * Sets mouse hover events for a participant.
     *
     * @param participantId ID of the participant.
     * @param element The dom element to add events to.
     * @param propagateHighlight Whether to highlight the participant in other matches.
     */
    private setupMouseHover(participantId: Id, element: HTMLElement, propagateHighlight: boolean): void {
        if (!this.config.highlightParticipantOnHover) return;

        const setupListeners = (elements: HTMLElement[]): void => {
            element.addEventListener('mouseenter', () => {
                elements.forEach(el => el.classList.add('hover'));
            });

            element.addEventListener('mouseleave', () => {
                elements.forEach(el => el.classList.remove('hover'));
            });
        };

        if (!propagateHighlight) {
            setupListeners([element]);
            return;
        }

        const refs = this.participantRefs[participantId];
        if (!refs) throw Error(`The participant (id: ${participantId}) does not exist in the participants table.`);

        refs.push(element);

        setupListeners(refs);
    }

    /**
     * Clears any previous popover selections.
     */
    private clearPreviousPopoverSelections(): void {
        document.querySelector('.opponents.popover-selected')?.classList.remove('popover-selected');
    }

    /**
     * Creates an SVG element for connectors, using pooling if enabled.
     *
     * @param connectors Array of connector lines to render
     * @param width Total width of the SVG canvas
     * @param height Total height of the SVG canvas
     */
    private createConnectorSVG(connectors: import('./layout').ConnectorLine[], width: number, height: number): SVGElement {
        if (this.config.enableSVGPooling) {
            return createPooledConnectorSVG(connectors, width, height);
        }
        return dom.createConnectorSVG(connectors, width, height);
    }
}
