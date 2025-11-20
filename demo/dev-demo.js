const SAMPLES = [
  { id: 'single', label: 'Single Elimination', file: 'singleElimData.json' },
  { id: 'double', label: 'Double Elimination', file: 'doubleElimData.json' },
  { id: 'roundRobin', label: 'Round Robin', file: 'roundRobinData.json' },
  { id: 'swiss', label: 'Swiss', file: 'swissData.json' },
];

const VIEW_MODELS = [
  { id: undefined, label: 'Default', formats: ['single', 'double', 'roundRobin', 'swiss'] },
  { id: 'se-default', label: 'SE Default', formats: ['single'] },
  { id: 'se-compact', label: 'SE Compact', formats: ['single'] },
  { id: 'se-ultra-compact', label: 'SE Ultra Compact', formats: ['single'] },
  { id: 'se-spacious', label: 'SE Spacious', formats: ['single'] },
  { id: 'se-with-logos', label: 'SE With Logos', formats: ['single'] },
  { id: 'se-compact-logos', label: 'SE Compact Logos', formats: ['single'] },
  { id: 'de-default', label: 'DE Standard (Industry)', formats: ['double'] },
  { id: 'de-compact', label: 'DE Compact', formats: ['double'] },
  { id: 'de-admin-compact', label: 'DE Admin Compact', formats: ['double'] },
  { id: 'de-split', label: 'DE Split View', formats: ['double'] },
  { id: 'de-spacious', label: 'DE Spacious', formats: ['double'] },
  { id: 'de-with-logos', label: 'DE With Logos', formats: ['double'] },
  { id: 'de-compact-logos', label: 'DE Compact Logos', formats: ['double'] },
  { id: 'de-separated-losers', label: 'DE Separated Losers', formats: ['double'] },
  { id: 'de-compact-separated', label: 'DE Compact Separated', formats: ['double'] },
  { id: 'de-traditional', label: 'DE Traditional', formats: ['double'] },
  { id: 'compact', label: 'Compact (Any)', formats: ['single', 'double', 'roundRobin', 'swiss'] },
  { id: 'admin', label: 'Admin (Any)', formats: ['single', 'double', 'roundRobin', 'swiss'] },
];

const VIEW_MODES = [
  { id: undefined, label: 'Auto (from view model)' },
  { id: 'default', label: 'Default (150px)' },
  { id: 'compact', label: 'Compact (130px)' },
  { id: 'logo', label: 'Logo (200px)' },
  { id: 'ultrawide', label: 'Ultrawide (220px)' },
];

const buttonsHost = document.querySelector('#format-buttons');
const viewModelHost = document.querySelector('#view-model-buttons');
const viewModeHost = document.querySelector('#view-mode-buttons');
const cache = new Map();

let currentSample = SAMPLES[0];
let currentViewModel = VIEW_MODELS[0];
let currentViewMode = VIEW_MODES[0];

// Display options state (defaults to all enabled)
const displayOptions = {
  showRoundHeaders: true,
  showStatusBadges: true,
  showSlotsOrigin: true,
  showLowerBracketSlotsOrigin: true,
  showRankingTable: true,
  showPopoverOnMatchLabelClick: true,
  // Tier 1 visual options
  highlightParticipantOnHover: true,
  separateBestOfLabel: true,
  participantOriginPlacement: 'before',
  theme: 'default',
  // Tier 2 interaction & layout options
  showConnectors: true,
  showParticipantImages: false,
  bracketAlignment: 'bottom',
  matchDensity: 'auto',
  swissColumnMode: 'round',
  // Tier 3 advanced options
  connectorStyle: 'default',
};

SAMPLES.forEach(sample => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = sample.label;
  btn.dataset.sample = sample.id;
  btn.addEventListener('click', () => {
    currentSample = sample;
    renderCurrentConfig(btn, null, null);
  });
  buttonsHost.appendChild(btn);
});

VIEW_MODELS.forEach(vm => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = vm.label;
  btn.dataset.viewModel = vm.id;
  btn.dataset.formats = JSON.stringify(vm.formats);
  btn.addEventListener('click', () => {
    currentViewModel = vm;
    renderCurrentConfig(null, btn, null);
  });
  viewModelHost.appendChild(btn);
});

VIEW_MODES.forEach(mode => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = mode.label;
  btn.dataset.viewMode = mode.id;
  btn.addEventListener('click', () => {
    currentViewMode = mode;
    renderCurrentConfig(null, null, btn);
  });
  viewModeHost.appendChild(btn);
});

// Set up display option toggles
const toggles = {
  'toggle-round-headers': 'showRoundHeaders',
  'toggle-status-badges': 'showStatusBadges',
  'toggle-slots-origin': 'showSlotsOrigin',
  'toggle-lower-slots-origin': 'showLowerBracketSlotsOrigin',
  'toggle-ranking-table': 'showRankingTable',
  'toggle-match-popover': 'showPopoverOnMatchLabelClick',
};

Object.entries(toggles).forEach(([toggleId, optionKey]) => {
  const checkbox = document.getElementById(toggleId);
  if (checkbox) {
    checkbox.addEventListener('change', () => {
      displayOptions[optionKey] = checkbox.checked;
      renderCurrentConfig(null, null, null); // Re-render with new options
    });
  }
});

// Set up Tier 1 customization option handlers
const highlightHoverCheckbox = document.getElementById('toggle-highlight-hover');
if (highlightHoverCheckbox) {
  highlightHoverCheckbox.addEventListener('change', () => {
    displayOptions.highlightParticipantOnHover = highlightHoverCheckbox.checked;
    renderCurrentConfig(null, null, null);
  });
}

const separateBestOfCheckbox = document.getElementById('toggle-separate-bestof');
if (separateBestOfCheckbox) {
  separateBestOfCheckbox.addEventListener('change', () => {
    displayOptions.separateBestOfLabel = separateBestOfCheckbox.checked;
    renderCurrentConfig(null, null, null);
  });
}

// Participant position radio buttons
const positionRadios = document.querySelectorAll('input[name="participant-position"]');
positionRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    displayOptions.participantOriginPlacement = radio.value;
    renderCurrentConfig(null, null, null);
  });
});

// Theme selector
const themeSelector = document.getElementById('theme-selector');
if (themeSelector) {
  themeSelector.addEventListener('change', () => {
    displayOptions.theme = themeSelector.value;
    renderCurrentConfig(null, null, null);
  });
}

// Tier 2 customization option handlers
const connectorLinesCheckbox = document.getElementById('toggle-connector-lines');
if (connectorLinesCheckbox) {
  connectorLinesCheckbox.addEventListener('change', () => {
    displayOptions.showConnectors = connectorLinesCheckbox.checked;
    renderCurrentConfig(null, null, null);
  });
}

const participantImagesCheckbox = document.getElementById('toggle-participant-images');
if (participantImagesCheckbox) {
  participantImagesCheckbox.addEventListener('change', () => {
    displayOptions.showParticipantImages = participantImagesCheckbox.checked;
    renderCurrentConfig(null, null, null);
  });
}

const bracketAlignmentSelector = document.getElementById('bracket-alignment');
if (bracketAlignmentSelector) {
  bracketAlignmentSelector.addEventListener('change', () => {
    displayOptions.bracketAlignment = bracketAlignmentSelector.value;
    renderCurrentConfig(null, null, null);
  });
}

const matchDensitySelector = document.getElementById('match-density');
if (matchDensitySelector) {
  matchDensitySelector.addEventListener('change', () => {
    displayOptions.matchDensity = matchDensitySelector.value;
    renderCurrentConfig(null, null, null);
  });
}

// Swiss column mode radio buttons
const swissRadios = document.querySelectorAll('input[name="swiss-column-mode"]');
swissRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    displayOptions.swissColumnMode = radio.value;
    renderCurrentConfig(null, null, null);
  });
});

// Tier 3 customization option handlers
const connectorStyleSelector = document.getElementById('connector-style');
if (connectorStyleSelector) {
  connectorStyleSelector.addEventListener('change', () => {
    displayOptions.connectorStyle = connectorStyleSelector.value;
    renderCurrentConfig(null, null, null);
  });
}

/**
 * Filters view model buttons to show only those compatible with the current format
 */
function filterViewModelButtons() {
  const currentFormatId = currentSample.id;

  viewModelHost.querySelectorAll('button').forEach(btn => {
    const formats = JSON.parse(btn.dataset.formats || '[]');
    if (formats.includes(currentFormatId)) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });
}

// Initial filter and render
filterViewModelButtons();
renderCurrentConfig(buttonsHost.firstElementChild, viewModelHost.firstElementChild, viewModeHost.firstElementChild);

/**
 * Renders the current sample with the current view model and view mode
 *
 * @param {HTMLButtonElement|null} sampleBtn - The sample button that was clicked (null if view model/mode changed)
 * @param {HTMLButtonElement|null} vmBtn - The view model button that was clicked (null if sample/mode changed)
 * @param {HTMLButtonElement|null} viewModeBtn - The view mode button that was clicked (null if sample/vm changed)
 * @returns {Promise<void>}
 */
async function renderCurrentConfig(sampleBtn, vmBtn, viewModeBtn) {
  if (sampleBtn) {
    buttonsHost.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === sampleBtn));
    filterViewModelButtons();
  }
  if (vmBtn) {
    viewModelHost.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === vmBtn));
  }
  if (viewModeBtn) {
    viewModeHost.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === viewModeBtn));
  }

  const structure = await loadStructure(currentSample.file);
  const viewerData = window.bracketsViewerDTO.convertStageStructureToViewerData(structure, undefined, {
    stageName: currentSample.label,
  });

  const config = {
    selector: '#viewer-root',
    clear: true,
    viewModelId: currentViewModel.id,
    viewMode: currentViewMode.id,
    // Apply display options from toggles
    showRoundHeaders: displayOptions.showRoundHeaders,
    showStatusBadges: displayOptions.showStatusBadges,
    showSlotsOrigin: displayOptions.showSlotsOrigin,
    showLowerBracketSlotsOrigin: displayOptions.showLowerBracketSlotsOrigin,
    showRankingTable: displayOptions.showRankingTable,
    showPopoverOnMatchLabelClick: displayOptions.showPopoverOnMatchLabelClick,
    // Tier 1 visual customization options
    highlightParticipantOnHover: displayOptions.highlightParticipantOnHover,
    separateBestOfLabel: displayOptions.separateBestOfLabel,
    participantOriginPlacement: displayOptions.participantOriginPlacement,
    theme: displayOptions.theme,
    // Tier 2 interaction & layout options
    showConnectors: displayOptions.showConnectors,
    showParticipantImages: displayOptions.showParticipantImages,
    bracketAlignment: displayOptions.bracketAlignment,
    matchDensity: displayOptions.matchDensity,
    swissColumnMode: displayOptions.swissColumnMode,
    // Tier 3 advanced options
    connectorStyle: displayOptions.connectorStyle,
  };

  console.log('Rendering with config:', config);
  console.log('- Sample:', currentSample.label);
  console.log('- View Model:', currentViewModel.label, '(id:', currentViewModel.id, ')');
  console.log('- View Mode:', currentViewMode.label, '(id:', currentViewMode.id, ')');
  console.log('- Display Options:', displayOptions);

  await window.bracketsViewer.render(viewerData, config);
}

/**
 * Renders a bracket sample to the viewer (legacy function, kept for compatibility)
 *
 * @param {object} sample - The sample configuration object
 * @param {HTMLButtonElement} btn - The button element that was clicked
 * @returns {Promise<void>}
 */
async function renderSample(sample, btn) {
  currentSample = sample;
  await renderCurrentConfig(btn, null);
}

/**
 * Loads and caches a tournament structure from a JSON file
 *
 * @param {string} file - The filename to load
 * @returns {Promise<object>} The tournament structure data
 */
async function loadStructure(file) {
  if (cache.has(file)) return cache.get(file);
  const data = await fetch(file).then(res => res.json());
  cache.set(file, data);
  return data;
}
