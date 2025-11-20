const SAMPLES = [
  { id: 'single', label: 'Single Elimination', file: 'singleElimData.json' },
  { id: 'double', label: 'Double Elimination', file: 'doubleElimData.json' },
  { id: 'roundRobin', label: 'Round Robin', file: 'roundRobinData.json' },
  { id: 'swiss', label: 'Swiss', file: 'swissData.json' },
];

const VIEW_MODELS = [
  { id: 'default', label: 'Default', formats: ['single', 'double', 'roundRobin', 'swiss'] },
  { id: 'admin', label: 'Admin Dashboard', formats: ['single', 'double', 'roundRobin', 'swiss'] },
  { id: 'broadcast', label: 'Broadcast / Streaming', formats: ['single', 'double', 'roundRobin', 'swiss'] },
];

const SIZING_OPTIONS = [
  { id: undefined, label: 'None (Use Manual)' },
  { id: 'default', label: 'Standard (150px)' },
  { id: 'compact', label: 'Compact (130px)' },
  { id: 'ultra-compact', label: 'Ultra Compact (120px)' },
  { id: 'spacious', label: 'Spacious (170px)' },
  { id: 'logo', label: 'Logo (200px)' },
  { id: 'logo-compact', label: 'Logo Compact (180px)' },
  { id: 'ultrawide', label: 'Ultrawide (300px)' },
];

const buttonsHost = document.querySelector('#format-buttons');
const viewModelHost = document.querySelector('#view-model-buttons');
const sizingHost = document.querySelector('#sizing-buttons');
const cache = new Map();

let currentSample = SAMPLES[0];
let currentViewModel = VIEW_MODELS[0];
let currentSizing = SIZING_OPTIONS[0];

// Display options state (defaults to all enabled)
const displayOptions = {
  showRoundHeaders: true,
  showStatusBadges: true,
  showSlotsOrigin: true,
  showLowerBracketSlotsOrigin: true,
  showRankingTable: true,
  showPopoverOnMatchLabelClick: true,
  highlightParticipantOnHover: true,
  separatedChildCountLabel: true,
  participantOriginPlacement: 'before',
};

// Granular customization state (character-creator style)
const granularOptions = {
  matchWidth: undefined,
  matchHeight: undefined,
  columnWidth: undefined,
  rowHeight: undefined,
  groupGapY: undefined,
  bracketAlignment: undefined,
  fontSize: undefined,
  fontWeight: undefined,
  borderRadius: undefined,
  matchPadding: undefined,
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

SIZING_OPTIONS.forEach(option => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = option.label;
  btn.dataset.sizing = option.id;
  btn.addEventListener('click', () => {
    currentSizing = option;
    renderCurrentConfig(null, null, btn);
  });
  sizingHost.appendChild(btn);
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
      renderCurrentConfig(null, null, null);
    });
  }
});

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
    displayOptions.separatedChildCountLabel = separateBestOfCheckbox.checked;
    renderCurrentConfig(null, null, null);
  });
}

const positionRadios = document.querySelectorAll('input[name="participant-position"]');
positionRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    displayOptions.participantOriginPlacement = radio.value;
    renderCurrentConfig(null, null, null);
  });
});

// === GRANULAR CUSTOMIZATION CONTROLS (CHARACTER CREATOR) ===

// Match dimension sliders
function setupSlider(sliderId, valueId, granularKey) {
  const slider = document.getElementById(sliderId);
  const valueDisplay = document.getElementById(valueId);

  if (!slider || !valueDisplay) return;

  slider.addEventListener('input', () => {
    const value = parseInt(slider.value);
    valueDisplay.textContent = value;
    granularOptions[granularKey] = value;
    renderCurrentConfig(null, null, null);
  });
}

setupSlider('slider-match-width', 'value-match-width', 'matchWidth');
setupSlider('slider-match-height', 'value-match-height', 'matchHeight');
setupSlider('slider-column-width', 'value-column-width', 'columnWidth');
setupSlider('slider-row-height', 'value-row-height', 'rowHeight');
setupSlider('slider-group-gap-y', 'value-group-gap-y', 'groupGapY');
setupSlider('slider-border-radius', 'value-border-radius', 'borderRadius');
setupSlider('slider-match-padding', 'value-match-padding', 'matchPadding');

// Visual customization dropdowns
const fontSizeSelect = document.getElementById('select-font-size');
if (fontSizeSelect) {
  fontSizeSelect.addEventListener('change', () => {
    granularOptions.fontSize = fontSizeSelect.value || undefined;
    renderCurrentConfig(null, null, null);
  });
}

const fontWeightSelect = document.getElementById('select-font-weight');
if (fontWeightSelect) {
  fontWeightSelect.addEventListener('change', () => {
    granularOptions.fontWeight = fontWeightSelect.value || undefined;
    renderCurrentConfig(null, null, null);
  });
}

// Bracket alignment radios
const alignmentRadios = document.querySelectorAll('input[name="bracket-alignment"]');
alignmentRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    granularOptions.bracketAlignment = radio.value;
    renderCurrentConfig(null, null, null);
  });
});

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
renderCurrentConfig(buttonsHost.firstElementChild, viewModelHost.firstElementChild, sizingHost.firstElementChild);

/**
 * Renders the current sample with the current view model and sizing preset
 *
 * @param {HTMLButtonElement|null} sampleBtn - The sample button that was clicked (null if view model/sizing changed)
 * @param {HTMLButtonElement|null} vmBtn - The view model button that was clicked (null if sample/sizing changed)
 * @param {HTMLButtonElement|null} sizingBtn - The sizing button that was clicked (null if sample/vm changed)
 * @returns {Promise<void>}
 */
async function renderCurrentConfig(sampleBtn, vmBtn, sizingBtn) {
  if (sampleBtn) {
    buttonsHost.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === sampleBtn));
    filterViewModelButtons();
  }
  if (vmBtn) {
    viewModelHost.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === vmBtn));
  }
  if (sizingBtn) {
    sizingHost.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === sizingBtn));
  }

  const structure = await loadStructure(currentSample.file);
  const viewerData = window.bracketsViewerDTO.convertStageStructureToViewerData(structure, undefined, {
    stageName: currentSample.label,
  });

  const config = {
    selector: '#viewer-root',
    clear: true,
    viewModelId: currentViewModel.id,
    sizing: currentSizing.id,

    // Display options from toggles
    showRoundHeaders: displayOptions.showRoundHeaders,
    showStatusBadges: displayOptions.showStatusBadges,
    showSlotsOrigin: displayOptions.showSlotsOrigin,
    showLowerBracketSlotsOrigin: displayOptions.showLowerBracketSlotsOrigin,
    showRankingTable: displayOptions.showRankingTable,
    showPopoverOnMatchLabelClick: displayOptions.showPopoverOnMatchLabelClick,
    highlightParticipantOnHover: displayOptions.highlightParticipantOnHover,
    separatedChildCountLabel: displayOptions.separatedChildCountLabel,
    participantOriginPlacement: displayOptions.participantOriginPlacement,

    // Granular customization parameters (character-creator style)
    // Only include if user has set them (not undefined)
    ...(granularOptions.matchWidth !== undefined && { matchWidth: granularOptions.matchWidth }),
    ...(granularOptions.matchHeight !== undefined && { matchHeight: granularOptions.matchHeight }),
    ...(granularOptions.columnWidth !== undefined && { columnWidth: granularOptions.columnWidth }),
    ...(granularOptions.rowHeight !== undefined && { rowHeight: granularOptions.rowHeight }),
    ...(granularOptions.groupGapY !== undefined && { groupGapY: granularOptions.groupGapY }),
    ...(granularOptions.bracketAlignment !== undefined && { bracketAlignment: granularOptions.bracketAlignment }),
    ...(granularOptions.fontSize !== undefined && { fontSize: granularOptions.fontSize }),
    ...(granularOptions.fontWeight !== undefined && { fontWeight: granularOptions.fontWeight }),
    ...(granularOptions.borderRadius !== undefined && { borderRadius: granularOptions.borderRadius }),
    ...(granularOptions.matchPadding !== undefined && { matchPadding: granularOptions.matchPadding }),
  };

  console.log('Rendering with config:', config);
  console.log('- Sample:', currentSample.label);
  console.log('- View Model:', currentViewModel.label, '(id:', currentViewModel.id, ')');
  console.log('- Sizing:', currentSizing.label, '(id:', currentSizing.id, ')');
  console.log('- Display Options:', displayOptions);
  console.log('- Granular Options:', granularOptions);

  await window.bracketsViewer.render(viewerData, config);
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
