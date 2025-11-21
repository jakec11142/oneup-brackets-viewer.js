/**
 * ConfigResolver - Handles configuration merging, defaults, and validation.
 *
 * Extracts config handling logic from the main render() method to improve
 * maintainability and testability.
 */
import { type ViewModel, type LayoutConfig } from '../viewModels';
import type { Config, ViewerData } from '../types';
/**
 * Font size mapping for the fontSize config option.
 */
export declare const FONT_SIZE_MAP: Record<'small' | 'medium' | 'large', string>;
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
export declare function resolveConfig(userConfig: Partial<Config> | undefined, data: ViewerData): ResolvedConfig;
/**
 * Validates viewer data and throws descriptive errors for invalid input.
 */
export declare function validateViewerData(data: ViewerData): void;
/**
 * Applies theme classes and CSS custom properties to the target element.
 */
export declare function applyThemeToTarget(target: HTMLElement, config: Config, viewModel: ViewModel, layoutConfig: LayoutConfig): void;
