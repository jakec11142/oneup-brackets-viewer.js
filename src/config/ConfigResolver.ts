/**
 * ConfigResolver - Handles configuration merging, defaults, and validation.
 *
 * Extracts config handling logic from the main render() method to improve
 * maintainability and testability.
 */

import { getViewModel, type ViewModel, type LayoutConfig, type BracketKind } from '../viewModels';
import type { Config, ViewerData } from '../types';

/**
 * Default configuration values.
 */
const CONFIG_DEFAULTS: Partial<Config> = {
    participantOriginPlacement: 'before',
    showSlotsOrigin: true,
    showLowerBracketSlotsOrigin: true,
    showPopoverOnMatchLabelClick: true,
    highlightParticipantOnHover: true,
    showRoundHeaders: true,
    showConnectors: true,
    showMatchMetadata: true,
    doubleElimMode: 'unified',
    // Performance defaults
    enableLayoutCache: true,
    enableSVGPooling: true,
    enableVirtualization: 'auto',
    virtualizationThreshold: 50,
};

/**
 * Font size mapping for the fontSize config option.
 */
export const FONT_SIZE_MAP: Record<'small' | 'medium' | 'large', string> = {
    small: '11px',
    medium: '13px',
    large: '15px',
};

/**
 * Result of resolving configuration.
 */
export interface ResolvedConfig {
    /** The merged configuration object */
    config: Config;
    /** The resolved view model */
    viewModel: ViewModel;
    /** The final layout configuration */
    layoutConfig: LayoutConfig;
}

/**
 * Resolves and merges configuration from user input, view model presets, and defaults.
 *
 * Priority order (highest to lowest):
 * 1. Explicit granular config options (matchWidth, matchHeight, etc.)
 * 2. layoutOverrides object
 * 3. View model preset
 * 4. Defaults
 *
 * @param userConfig - User-provided configuration
 * @param data - Viewer data (used to determine stage type for view model selection)
 * @returns Resolved configuration, view model, and layout config
 */
export function resolveConfig(
    userConfig: Partial<Config> | undefined,
    data: ViewerData,
): ResolvedConfig {
    // Step 1: Merge base config with defaults
    const config: Config = {
        ...CONFIG_DEFAULTS,
        customRoundName: userConfig?.customRoundName,
        onMatchClick: userConfig?.onMatchClick,
        onMatchLabelClick: userConfig?.onMatchLabelClick,
        selector: userConfig?.selector,
        theme: userConfig?.theme,
        clear: userConfig?.clear,
        qualifyingCount: userConfig?.qualifyingCount,
        eliminatedCount: userConfig?.eliminatedCount,
        viewModelId: userConfig?.viewModelId,
        layoutOverrides: userConfig?.layoutOverrides,
        // Override defaults with user values where provided
        participantOriginPlacement: userConfig?.participantOriginPlacement ?? CONFIG_DEFAULTS.participantOriginPlacement,
        showSlotsOrigin: userConfig?.showSlotsOrigin ?? CONFIG_DEFAULTS.showSlotsOrigin,
        showLowerBracketSlotsOrigin: userConfig?.showLowerBracketSlotsOrigin ?? CONFIG_DEFAULTS.showLowerBracketSlotsOrigin,
        showPopoverOnMatchLabelClick: userConfig?.showPopoverOnMatchLabelClick ?? CONFIG_DEFAULTS.showPopoverOnMatchLabelClick,
        highlightParticipantOnHover: userConfig?.highlightParticipantOnHover ?? CONFIG_DEFAULTS.highlightParticipantOnHover,
        showRoundHeaders: userConfig?.showRoundHeaders ?? CONFIG_DEFAULTS.showRoundHeaders,
        showConnectors: userConfig?.showConnectors ?? CONFIG_DEFAULTS.showConnectors,
        showMatchMetadata: userConfig?.showMatchMetadata ?? CONFIG_DEFAULTS.showMatchMetadata,
        doubleElimMode: userConfig?.doubleElimMode ?? CONFIG_DEFAULTS.doubleElimMode,
        // Performance options
        enableLayoutCache: userConfig?.enableLayoutCache ?? CONFIG_DEFAULTS.enableLayoutCache,
        enableSVGPooling: userConfig?.enableSVGPooling ?? CONFIG_DEFAULTS.enableSVGPooling,
        enableVirtualization: userConfig?.enableVirtualization ?? CONFIG_DEFAULTS.enableVirtualization,
        virtualizationThreshold: userConfig?.virtualizationThreshold ?? CONFIG_DEFAULTS.virtualizationThreshold,
        // Granular layout options (will be applied to layoutConfig)
        matchWidth: userConfig?.matchWidth,
        matchHeight: userConfig?.matchHeight,
        columnWidth: userConfig?.columnWidth,
        rowHeight: userConfig?.rowHeight,
        lowerBracketRowHeight: userConfig?.lowerBracketRowHeight,
        upperBracketRowHeight: userConfig?.upperBracketRowHeight,
        topOffset: userConfig?.topOffset,
        leftOffset: userConfig?.leftOffset,
        groupGapX: userConfig?.groupGapX,
        groupGapY: userConfig?.groupGapY,
        bracketAlignment: userConfig?.bracketAlignment,
        losersBracketOffsetX: userConfig?.losersBracketOffsetX,
        swissLayerStepY: userConfig?.swissLayerStepY,
        swissBucketGapY: userConfig?.swissBucketGapY,
        fontSize: userConfig?.fontSize,
    } as Config;

    // Step 2: Resolve view model based on stage type
    const firstStageType = data.stages?.[0]?.type;
    const stageType: BracketKind = (firstStageType === 'single_elimination' || firstStageType === 'double_elimination')
        ? firstStageType
        : 'single_elimination';

    const viewModel = getViewModel(userConfig?.viewModelId, stageType);

    // Step 3: Resolve doubleElimMode with priority: config > viewModel preset > default
    if (!userConfig?.doubleElimMode && viewModel.doubleElimMode) {
        config.doubleElimMode = viewModel.doubleElimMode;
    }

    // Step 4: Build layout config by merging view model preset with overrides
    const layoutConfig = buildLayoutConfig(viewModel, userConfig);

    return { config, viewModel, layoutConfig };
}

/**
 * Builds the final layout configuration by merging view model preset,
 * layoutOverrides, and granular layout options.
 */
function buildLayoutConfig(
    viewModel: ViewModel,
    userConfig: Partial<Config> | undefined,
): LayoutConfig {
    // Start with view model preset
    const layoutConfig: LayoutConfig = {
        ...viewModel.layout,
        // Apply layoutOverrides object
        ...(userConfig?.layoutOverrides ?? {}),
    };

    // Apply granular layout dimension controls (highest priority)
    applyGranularOverrides(layoutConfig, userConfig);

    return layoutConfig;
}

/**
 * Applies granular layout dimension controls to the layout config.
 * These take highest priority and override everything else.
 */
function applyGranularOverrides(
    layoutConfig: LayoutConfig,
    userConfig: Partial<Config> | undefined,
): void {
    if (!userConfig) return;

    if (userConfig.matchWidth !== undefined) layoutConfig.matchWidth = userConfig.matchWidth;
    if (userConfig.matchHeight !== undefined) layoutConfig.matchHeight = userConfig.matchHeight;
    if (userConfig.columnWidth !== undefined) layoutConfig.columnWidth = userConfig.columnWidth;
    if (userConfig.rowHeight !== undefined) layoutConfig.rowHeight = userConfig.rowHeight;
    if (userConfig.lowerBracketRowHeight !== undefined) layoutConfig.lowerBracketRowHeight = userConfig.lowerBracketRowHeight;
    if (userConfig.upperBracketRowHeight !== undefined) layoutConfig.upperBracketRowHeight = userConfig.upperBracketRowHeight;
    if (userConfig.topOffset !== undefined) layoutConfig.topOffset = userConfig.topOffset;
    if (userConfig.leftOffset !== undefined) layoutConfig.leftOffset = userConfig.leftOffset;
    if (userConfig.groupGapX !== undefined) layoutConfig.groupGapX = userConfig.groupGapX;
    if (userConfig.groupGapY !== undefined) layoutConfig.groupGapY = userConfig.groupGapY;
    if (userConfig.bracketAlignment !== undefined) layoutConfig.bracketAlignment = userConfig.bracketAlignment;
    if (userConfig.losersBracketOffsetX !== undefined) layoutConfig.losersBracketOffsetX = userConfig.losersBracketOffsetX;
    if (userConfig.swissLayerStepY !== undefined) layoutConfig.swissLayerStepY = userConfig.swissLayerStepY;
    if (userConfig.swissBucketGapY !== undefined) layoutConfig.swissBucketGapY = userConfig.swissBucketGapY;
}

/**
 * Validates viewer data and throws descriptive errors for invalid input.
 */
export function validateViewerData(data: ViewerData): void {
    if (!data.stages?.length) {
        throw Error('The `data.stages` array is either empty or undefined');
    }

    if (!data.participants?.length) {
        throw Error('The `data.participants` array is either empty or undefined');
    }

    if (!data.matches?.length) {
        throw Error('The `data.matches` array is either empty or undefined');
    }
}

/**
 * Applies theme classes and CSS custom properties to the target element.
 */
export function applyThemeToTarget(
    target: HTMLElement,
    config: Config,
    viewModel: ViewModel,
    layoutConfig: LayoutConfig,
): void {
    // Remove existing theme classes
    Array.from(target.classList)
        .filter(cls => cls.startsWith('bv-theme-'))
        .forEach(cls => target.classList.remove(cls));

    // Ensure base class is present
    if (!target.classList.contains('bv-root')) {
        target.classList.add('bv-root');
    }

    // Apply theme: explicit config.theme takes precedence, otherwise use view model theme
    const themeClass = config.theme
        ? `bv-theme-${config.theme}`
        : viewModel.theme.rootClassName;

    if (themeClass) {
        target.classList.add(themeClass);
    }

    // Set dynamic CSS variables from layout config
    target.style.setProperty('--bv-match-width', `${layoutConfig.matchWidth}px`);
    target.style.setProperty('--bv-match-height', `${layoutConfig.matchHeight}px`);

    // Apply font size if specified
    if (config.fontSize) {
        target.style.setProperty('--bv-font-size', FONT_SIZE_MAP[config.fontSize]);
    }
}
