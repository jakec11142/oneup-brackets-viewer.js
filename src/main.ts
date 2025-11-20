import './style.scss';
import { Participant, Match, ParticipantResult, Status, GroupType, FinalType, Id, type RankingItem, StageType } from 'brackets-model';
import { splitBy, getOriginAbbreviation, findRoot, completeWithBlankMatches, sortBy, isMatchGame, isMatch, splitByWithLeftovers } from './helpers';
import * as dom from './dom';
import * as lang from './lang';
import { Locale } from './lang';
import { helpers } from 'brackets-manager';
import { BracketEdgeResponse } from './dto/types';
import { computeLayout, computeSwissLayout } from './layout';
import { getViewModel, type ViewModel, type LayoutConfig, type BracketKind } from './viewModels';
import { detectFormatSize, getDEProfile } from './profiles/deProfiles';
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
    private alwaysConnectFirstRound = false;
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

        const root = document.createDocumentFragment();

        this.config = {
            customRoundName: config?.customRoundName,
            participantOriginPlacement: config?.participantOriginPlacement ?? 'before',
            separatedChildCountLabel: config?.separatedChildCountLabel ?? false,
            showSlotsOrigin: config?.showSlotsOrigin ?? true,
            showLowerBracketSlotsOrigin: config?.showLowerBracketSlotsOrigin ?? true,
            showPopoverOnMatchLabelClick: config?.showPopoverOnMatchLabelClick ?? true,
            highlightParticipantOnHover: config?.highlightParticipantOnHover ?? true,
            showRankingTable: config?.showRankingTable ?? true,
            showStatusBadges: config?.showStatusBadges ?? true,
            showRoundHeaders: config?.showRoundHeaders ?? true,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            rankingFormula: config?.rankingFormula ?? ((item): number => 3 * item.wins + 1 * item.draws + 0 * item.losses),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            doubleElimMode: config?.doubleElimMode ?? 'unified',
            viewModelId: config?.viewModelId,
            layoutOverrides: config?.layoutOverrides,
        } as Config;

        // Resolve view model based on stage type and viewModelId
        // This determines layout density, theme, and double elim mode preset
        const firstStageType = data.stages?.[0]?.type;
        const stageType: BracketKind = firstStageType === 'single_elimination' || firstStageType === 'double_elimination'
            ? firstStageType
            : 'single_elimination'; // fallback for round_robin, swiss, etc.

        this.viewModel = getViewModel(config?.viewModelId, stageType);

        // Create final layoutConfig by merging view model preset with user overrides
        this.layoutConfig = {
            ...this.viewModel.layout,
            ...(config?.layoutOverrides ?? {}),
        };

        // Resolve doubleElimMode with priority: config > viewModel preset > default 'unified'
        if (!config?.doubleElimMode && this.viewModel.doubleElimMode) {
            this.config.doubleElimMode = this.viewModel.doubleElimMode;
        }

        if (config?.onMatchClick)
            this._onMatchClick = config.onMatchClick;

        if (config?.onMatchLabelClick)
            this._onMatchLabelClick = config.onMatchLabelClick;

        if (!data.stages?.length)
            throw Error('The `data.stages` array is either empty or undefined');

        if (!data.participants?.length)
            throw Error('The `data.participants` array is either empty or undefined');

        if (!data.matches?.length)
            throw Error('The `data.matches` array is either empty or undefined');

        this.participants = data.participants;
        data.participants.forEach(participant => this.participantRefs[participant.id] = []);

        this.edges = data.edges ?? [];

        this.popover = document.createElement('div');
        this.popover.setAttribute('popover', 'auto');
        this.popover.addEventListener('toggle', (event) => {
            if ((event as ToggleEvent).newState === 'closed')
                this.clearPreviousPopoverSelections();
        });

        root.append(this.popover);

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

        const target = findRoot(config?.selector);

        // Apply theme with precedence: config.theme > viewModel.theme.rootClassName
        Array.from(target.classList)
            .filter(cls => cls.startsWith('bv-theme-'))
            .forEach(cls => target.classList.remove(cls));

        // Ensure base class is present
        if (!target.classList.contains('bv-root'))
            target.classList.add('bv-root');

        // Apply theme: explicit config.theme takes precedence, otherwise use view model theme
        const themeClass = config?.theme
            ? `bv-theme-${config.theme}`
            : this.viewModel.theme.rootClassName;

        if (themeClass)
            target.classList.add(themeClass);

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
        const container = dom.createRoundRobinContainer(stage.id);
        container.append(dom.createTitle(stage.name));

        let groupNumber = 1;

        for (const groupMatches of matchesByGroup) {
            const groupId = groupMatches[0].group_id;
            const groupContainer = dom.createGroupContainer(groupId, lang.getGroupName(groupNumber++));
            const matchesByRound = splitBy(groupMatches, 'round_id').map(matches => sortBy(matches, 'number'));

            let roundNumber = 1;

            for (const roundMatches of matchesByRound) {
                const roundId = roundMatches[0].round_id;
                const roundName = this.getRoundName({
                    roundNumber,
                    roundCount: 0,
                    groupType: lang.toI18nKey('round_robin'),
                }, lang.getRoundName);

                const roundContainer = dom.createRoundContainer(roundId, roundName);
                for (const match of roundMatches)
                    roundContainer.append(this.createMatch(match, true));

                groupContainer.append(roundContainer);
                roundNumber++;
            }

            if (this.config.showRankingTable)
                groupContainer.append(this.createRanking(groupMatches));

            container.append(groupContainer);
        }

        root.append(container);
    }

    /**
     * Renders a Swiss stage using record-bucket column layout.
     *
     * @param root The root element.
     * @param stage The stage to render.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderSwiss(root: DocumentFragment, stage: ViewerStage, matchesByGroup: MatchWithMetadata[][]): void {
        const container = dom.createEliminationContainer(stage.id);
        container.append(dom.createTitle(stage.name));

        let groupNumber = 1;

        for (const groupMatches of matchesByGroup) {
            if (!groupMatches?.length)
                continue;

            const groupId = groupMatches[0].group_id;
            const bracket = dom.createBracketContainer(groupId, lang.getGroupName(groupNumber++));
            const roundsContainer = dom.createRoundsContainer();

            // Organize matches with metadata
            const matchesByRound = splitBy(groupMatches, 'round_id').map(matches => sortBy(matches, 'number'));
            const roundCount = matchesByRound.length;

            // Prepare matches with round metadata
            const allMatchesWithMetadata: MatchWithMetadata[] = [];
            matchesByRound.forEach((roundMatches, roundIndex) => {
                const roundNumber = roundIndex + 1;
                roundMatches.forEach(match => {
                    allMatchesWithMetadata.push({
                        ...match,
                        metadata: {
                            ...match.metadata,
                            roundNumber,
                            roundCount,
                            matchLocation: 'single_bracket',
                            // Transfer Swiss-specific round data from Match object to metadata
                            roundDate: (match as any).swissRoundDate,
                            roundBestOf: (match as any).swissRoundBestOf,
                        },
                    });
                });
            });

            console.log(`🎯 Rendering Swiss group: ${allMatchesWithMetadata.length} matches`);

            // Use computeSwissLayout for record-bucket positioning
            const swissLayout = computeSwissLayout(allMatchesWithMetadata, this.layoutConfig);

            // Group matches by record bucket for panel rendering
            const matchesByRecord = new Map<string, MatchWithMetadata[]>();
            allMatchesWithMetadata.forEach(match => {
                const wins = match.metadata.swissWins ?? 0;
                const losses = match.metadata.swissLosses ?? 0;
                const key = `${wins}-${losses}`;
                if (!matchesByRecord.has(key)) {
                    matchesByRecord.set(key, []);
                }
                matchesByRecord.get(key)!.push(match);
            });

            // Render Swiss panels (boxed columns)
            let renderedPanels = 0;
            let renderedMatches = 0;

            swissLayout.panelPositions?.forEach(panel => {
                // Create panel container
                const panelDiv = document.createElement('div');
                panelDiv.className = 'swiss-panel';
                panelDiv.style.position = 'absolute';
                panelDiv.style.left = `${panel.xPx}px`;
                panelDiv.style.top = `${panel.yPx}px`;
                panelDiv.style.width = `${panel.width}px`;
                panelDiv.dataset.key = panel.key;

                // Create panel header
                const headerDiv = document.createElement('div');
                headerDiv.className = 'swiss-panel-header';

                const recordSpan = document.createElement('span');
                recordSpan.className = 'record';
                recordSpan.textContent = panel.record;
                headerDiv.appendChild(recordSpan);

                if (panel.date) {
                    const dateSpan = document.createElement('span');
                    dateSpan.className = 'date';
                    dateSpan.textContent = panel.date;
                    headerDiv.appendChild(dateSpan);
                }

                if (panel.bestOf) {
                    const boSpan = document.createElement('span');
                    boSpan.className = 'bo-label';
                    boSpan.textContent = panel.bestOf;
                    headerDiv.appendChild(boSpan);
                }

                panelDiv.appendChild(headerDiv);

                // Create panel body for matches
                const bodyDiv = document.createElement('div');
                bodyDiv.className = 'swiss-panel-body';

                // Render matches within this panel
                const panelMatches = matchesByRecord.get(panel.key) ?? [];
                panelMatches.forEach(match => {
                    const matchEl = this.createBracketMatch(match);
                    matchEl.classList.add('swiss-match-row');
                    bodyDiv.appendChild(matchEl);
                    renderedMatches++;
                });

                panelDiv.appendChild(bodyDiv);
                roundsContainer.appendChild(panelDiv);
                renderedPanels++;
            });

            console.log(`✅ Rendered ${renderedPanels} Swiss panels with ${renderedMatches} matches (NO connectors)`);

            // Set explicit size on rounds container
            roundsContainer.style.width = `${swissLayout.totalWidth}px`;
            roundsContainer.style.height = `${swissLayout.totalHeight}px`;

            bracket.append(roundsContainer);

            if (this.config.showRankingTable)
                bracket.append(this.createRanking(groupMatches));

            container.append(bracket);
        }

        root.append(container);
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
        const bracketMatches = splitBy(matchesByGroup[0], 'round_id').map(matches => sortBy(matches, 'number'));
        const { hasFinal, connectFinal, finalMatches } = this.getFinalInfoSingleElimination(matchesByGroup);

        this.renderBracket(container, bracketMatches, lang.getRoundName, 'single_bracket', connectFinal);

        if (hasFinal)
            this.renderFinal(container, 'consolation_final', finalMatches);
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
        // Helper to map group_id to matchLocation
        const getMatchLocation = (groupId: string): GroupType => {
            const normalized = groupId.toLowerCase();
            if (normalized.includes('winners-bracket')) return 'winner_bracket';
            if (normalized.includes('losers-bracket')) return 'loser_bracket';
            if (normalized.includes('grand-final')) return 'final_group';
            return 'winner_bracket'; // fallback
        };

        // Organize and prepare ALL matches with required metadata
        const allMatchesWithMetadata: MatchWithMetadata[] = [];

        Object.values(matchesByGroup).forEach(groupMatches => {
            if (!Array.isArray(groupMatches) || groupMatches.length === 0) return;

            // Determine bracket type from first match's group_id
            const matchLocation = getMatchLocation(String(groupMatches[0].group_id));

            // Organize by round and add metadata
            const matchesByRound = splitBy(groupMatches, 'round_id')
                .map(matches => sortBy(matches, 'number'));
            const roundCount = matchesByRound.length;

            matchesByRound.forEach((roundMatches, roundIndex) => {
                const roundNumber = roundIndex + 1;
                const connectFinal = matchLocation === 'winner_bracket' && roundNumber === roundCount;

                roundMatches.forEach(match => {
                    allMatchesWithMetadata.push({
                        ...match,
                        metadata: {
                            ...match.metadata,
                            roundNumber,
                            roundCount,
                            matchLocation,
                            connectFinal,
                        },
                    });
                });
            });
        });

        // Use ALL edges - NO FILTERING
        const allEdges = this.edges;

        console.log(`🔧 Unified DE: ${allMatchesWithMetadata.length} matches, ${allEdges.length} edges`);

        // Detect tournament format size and get appropriate layout profile
        const formatSize = detectFormatSize(allMatchesWithMetadata);
        const deProfile = formatSize ? getDEProfile(formatSize) : undefined;

        if (deProfile) {
            console.log(`📊 Using DE profile: ${deProfile.id} (${deProfile.formatSize}-team format)`);
        } else {
            console.log(`📊 No profile detected, using block-based layout`);
        }

        // Single computeLayout call with all matches + all edges + optional profile
        // Use 'winner_bracket' as the type (it's used mainly for logging)
        const layout = computeLayout(allMatchesWithMetadata, allEdges, 'winner_bracket', this.layoutConfig, deProfile);

        // Create bracket container for unified view
        const groupId = allMatchesWithMetadata[0]?.group_id ?? 'unified-de';
        const bracketContainer = dom.createBracketContainer(groupId, lang.getBracketName(this.stage, 'winner_bracket'));
        const roundsContainer = dom.createRoundsContainer();

        // Render all matches with absolute positioning
        let renderedCount = 0;
        let positionedCount = 0;

        for (const match of allMatchesWithMetadata) {
            const matchEl = this.createBracketMatch(match);
            const pos = layout.matchPositions.get(String(match.id));

            if (pos) {
                matchEl.style.position = 'absolute';
                matchEl.style.left = `${pos.xPx}px`;
                matchEl.style.top = `${pos.yPx}px`;
                positionedCount++;
            } else 
                console.warn(`⚠️ No position found for match ${match.id}`);
            

            roundsContainer.append(matchEl);
            renderedCount++;
        }

        console.log(`✅ Rendered ${renderedCount} matches (${positionedCount} positioned)`);

        // Render round headers with semantic labels (if enabled)
        // For unified mode, we need to determine bracket type and round count from matches at each column
        console.log('🎯 Unified DE showRoundHeaders config:', this.config.showRoundHeaders, 'will render?', this.config.showRoundHeaders !== false);
        if (this.config.showRoundHeaders !== false) {
            layout.headerPositions.forEach(header => {
                // Find matches in this column to determine bracket type and round count
                const matchesInColumn = allMatchesWithMetadata.filter(m => {
                    const pos = layout.matchPositions.get(String(m.id));
                    return pos && pos.xRound === header.columnIndex;
                });

                if (matchesInColumn.length === 0) return;

                // Use metadata from first match in column
                const sampleMatch = matchesInColumn[0];
                const bracketType = sampleMatch.metadata?.matchLocation ?? 'winner_bracket';
                const roundCount = sampleMatch.metadata?.roundCount ?? header.roundNumber;

                const roundInfo = {
                    roundNumber: header.roundNumber,
                    roundCount,
                };

                let roundName: string;

                if (bracketType === 'winner_bracket') {
                    roundName = lang.getWinnerBracketRoundName(roundInfo, lang.t);
                } else if (bracketType === 'loser_bracket') {
                    roundName = lang.getLoserBracketRoundName(roundInfo, lang.t);
                } else if (bracketType === 'final_group') {
                    roundName = 'Grand Finals';
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

        // Set explicit size on rounds container
        roundsContainer.style.width = `${layout.totalWidth}px`;
        roundsContainer.style.height = `${layout.totalHeight}px`;
        console.log(`📐 Container sized to ${layout.totalWidth}x${layout.totalHeight}px`);

        // Add SVG connectors overlay
        const svg = dom.createConnectorSVG(layout.connectors, layout.totalWidth, layout.totalHeight);
        roundsContainer.prepend(svg);

        bracketContainer.append(roundsContainer);
        container.append(bracketContainer);

        console.log(`🔗 Generated ${layout.connectors.length} connectors`);
    }

    /**
     * Returns information about the final group in single elimination.
     *
     * @param matchesByGroup A list of matches for each group.
     */
    private getFinalInfoSingleElimination(matchesByGroup: MatchWithMetadata[][]): {
        hasFinal: boolean,
        connectFinal: boolean,
        finalMatches: MatchWithMetadata[]
    } {
        const hasFinal = matchesByGroup[1] !== undefined;
        const finalMatches = sortBy(matchesByGroup[1] ?? [], 'number');

        // In single elimination, the only possible type of final is a consolation final,
        // and it has to be disconnected from the bracket because it doesn't directly follows its last match.
        const connectFinal = false;

        return { hasFinal, connectFinal, finalMatches };
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

        this.alwaysConnectFirstRound = !fromToornament;

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
        console.log(`[${bracketType}] Matches: ${allMatchesForLayout.length}, Edges: ${bracketEdges.length}, Connectors: ${layout.connectors.length}`);
        if (layout.connectors.length > 0) 
            console.log('First connector:', layout.connectors[0]);
        

        // Render round headers with semantic labels (if enabled)
        console.log('showRoundHeaders config:', this.config.showRoundHeaders, 'will render?', this.config.showRoundHeaders !== false);
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
                    console.warn(`⚠️ No position found for match ${match.id}`);
                

                roundsContainer.append(matchEl);
                renderedCount++;
            });
        }

        console.log(`✅ Rendered ${renderedCount} matches (${positionedCount} positioned)`);

        // Set explicit size on rounds container to fit all absolutely positioned matches
        roundsContainer.style.width = `${layout.totalWidth}px`;
        roundsContainer.style.height = `${layout.totalHeight}px`;
        console.log(`📐 Container sized to ${layout.totalWidth}x${layout.totalHeight}px`);

        // Add SVG connectors overlay
        const svg = dom.createConnectorSVG(layout.connectors, layout.totalWidth, layout.totalHeight);
        roundsContainer.prepend(svg);

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
     * Creates a ranking table for a group of a round-robin stage.
     *
     * @param matches The list of matches in the group.
     */
    private createRanking(matches: Match[]): HTMLElement {
        const table = dom.createTable();
        const ranking = helpers.getRanking(matches, this.config.rankingFormula!);

        table.append(dom.createRankingHeaders(ranking));

        for (const item of ranking)
            table.append(this.createRankingRow(item));

        return table;
    }

    /**
     * Creates a row of the ranking table.
     *
     * @param item Item of the ranking.
     */
    private createRankingRow(item: RankingItem): HTMLElement {
        const row = dom.createRow();
        const notRanked = item.played === 0;

        for (const key in item) {
            const prop = key as keyof RankingItem;
            const data = item[prop];

            if (prop === 'id') {
                const participant = this.participants.find(participant => participant.id === data);

                if (participant !== undefined) {
                    const cell = dom.createCell(participant.name);
                    this.setupMouseHover(participant.id, cell, true);
                    row.append(cell);
                    continue;
                }
            }

            if (notRanked && (prop === 'rank' || prop === 'points')) {
                row.append(dom.createCell('-'));
                continue;
            }

            row.append(dom.createCell(data));
        }

        return row;
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

        // Add status badge for visual match state indication (if enabled)
        if (this.config.showStatusBadges !== false) {
            const statusBadge = dom.createStatusBadge(match.status);
            matchContainer.append(statusBadge);
        }

        const opponents = isMatch(match)
            ? dom.createOpponentsContainer(() => this._onMatchClick(match))
            : dom.createOpponentsContainer();

        if (isMatch(match) && match.status >= Status.Completed)
            match.metadata.originHint = undefined;

        if (isMatch(match)) {
            const { originHint, matchLocation, roundNumber } = match.metadata;

            const participant1 = this.createParticipant(match.opponent1, propagateHighlight, 'opponent1', originHint, matchLocation, roundNumber);
            const participant2 = this.createParticipant(match.opponent2, propagateHighlight, 'opponent2', originHint, matchLocation, roundNumber);

            this.renderMatchLabel(opponents, match);
            opponents.append(participant1, participant2);
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

        if (this.config.separatedChildCountLabel) {
            opponents.append(dom.createMatchLabel(label, lang.getMatchStatus(match.status), onClick));

            if (match.child_count > 0)
                opponents.append(dom.createChildCountLabel(lang.t('common.best-of-x', { x: match.child_count }), onClick));

            return;
        }

        if (match.child_count > 0) {
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
}
