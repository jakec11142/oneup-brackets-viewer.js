const SAMPLES = [
  { id: 'single', label: 'Single Elimination', file: 'singleElimData.json' },
  { id: 'double', label: 'Double Elimination', file: 'doubleElimData.json' },
  { id: 'roundRobin', label: 'Round Robin', file: 'roundRobinData.json' },
  { id: 'swiss', label: 'Swiss', file: 'swissData.json' },
];

const VIEW_MODELS = [
  { id: undefined, label: 'Default', formats: ['single', 'double', 'roundRobin', 'swiss'] },
  { id: 'se-default', label: 'Default', formats: ['single'] },
  { id: 'se-compact', label: 'Compact', formats: ['single'] },
  { id: 'se-ultra-compact', label: 'Ultra Compact', formats: ['single'] },
  { id: 'se-spacious', label: 'Spacious', formats: ['single'] },
  { id: 'se-ultrawide', label: 'Ultrawide (21:9)', formats: ['single'] },
  { id: 'se-with-logos', label: 'With Logos', formats: ['single'] },
  { id: 'se-compact-logos', label: 'Compact with Logos', formats: ['single'] },
  { id: 'de-default', label: 'Standard', formats: ['double'] },
  { id: 'de-compact', label: 'Compact', formats: ['double'] },
  { id: 'de-admin-compact', label: 'Admin Compact', formats: ['double'] },
  { id: 'de-split', label: 'Split View', formats: ['double'] },
  { id: 'de-spacious', label: 'Spacious', formats: ['double'] },
  { id: 'de-ultrawide', label: 'Ultrawide (21:9)', formats: ['double'] },
  { id: 'de-with-logos', label: 'With Logos', formats: ['double'] },
  { id: 'de-compact-logos', label: 'Compact with Logos', formats: ['double'] },
  { id: 'compact', label: 'Compact (Any)', formats: ['single', 'double', 'roundRobin', 'swiss'] },
  { id: 'admin', label: 'Admin (Any)', formats: ['single', 'double', 'roundRobin', 'swiss'] },
];

const SIZING_OPTIONS = [
  { id: undefined, label: 'Auto' },
  { id: 'default', label: 'Standard (150px)' },
  { id: 'compact', label: 'Compact (130px)' },
  { id: 'logo', label: 'Logo (200px)' },
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
  // Additional visual options
  highlightParticipantOnHover: true,
  separatedChildCountLabel: true,
  participantOriginPlacement: 'before',
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
    displayOptions.separatedChildCountLabel = separateBestOfCheckbox.checked;
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
    // Additional visual customization options
    highlightParticipantOnHover: displayOptions.highlightParticipantOnHover,
    separatedChildCountLabel: displayOptions.separatedChildCountLabel,
    participantOriginPlacement: displayOptions.participantOriginPlacement,
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
