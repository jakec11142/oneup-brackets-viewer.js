const SAMPLES = [
  { id: 'single', label: 'Single Elimination', file: 'singleElimData.json' },
  { id: 'double', label: 'Double Elimination', file: 'doubleElimData.json' },
  { id: 'roundRobin', label: 'Round Robin', file: 'roundRobinData.json' },
  { id: 'swiss', label: 'Swiss', file: 'swissData.json' },
];

const VIEW_MODELS = [
  { id: undefined, label: 'Default' },
  { id: 'se-default', label: 'SE Default' },
  { id: 'se-compact', label: 'SE Compact' },
  { id: 'se-aggressive-compact', label: 'SE Aggressive Compact' },
  { id: 'se-super-compact', label: 'SE Super Compact' },
  { id: 'se-with-logos', label: 'SE With Logos' },
  { id: 'de-default', label: 'DE Default (Bottom)' },
  { id: 'de-top-aligned', label: 'DE Top-Aligned' },
  { id: 'de-compact', label: 'DE Compact' },
  { id: 'de-admin-compact', label: 'DE Admin Compact' },
  { id: 'de-aggressive-compact', label: 'DE Aggressive Compact' },
  { id: 'de-super-compact', label: 'DE Super Compact' },
  { id: 'de-separated-losers', label: 'DE Separated Losers' },
  { id: 'de-compact-separated', label: 'DE Compact Separated' },
  { id: 'de-traditional', label: 'DE Traditional' },
  { id: 'de-with-logos', label: 'DE With Logos' },
  { id: 'de-compact-logos', label: 'DE Compact Logos' },
  { id: 'compact', label: 'Compact (Any)' },
  { id: 'admin', label: 'Admin (Any)' },
];

const buttonsHost = document.querySelector('#format-buttons');
const viewModelHost = document.querySelector('#view-model-buttons');
const cache = new Map();

let currentSample = SAMPLES[0];
let currentViewModel = VIEW_MODELS[0];

SAMPLES.forEach(sample => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = sample.label;
  btn.dataset.sample = sample.id;
  btn.addEventListener('click', () => {
    currentSample = sample;
    renderCurrentConfig(btn, null);
  });
  buttonsHost.appendChild(btn);
});

VIEW_MODELS.forEach(vm => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = vm.label;
  btn.dataset.viewModel = vm.id;
  btn.addEventListener('click', () => {
    currentViewModel = vm;
    renderCurrentConfig(null, btn);
  });
  viewModelHost.appendChild(btn);
});

renderCurrentConfig(buttonsHost.firstElementChild, viewModelHost.firstElementChild);

/**
 * Renders the current sample with the current view model
 *
 * @param {HTMLButtonElement|null} sampleBtn - The sample button that was clicked (null if view model changed)
 * @param {HTMLButtonElement|null} vmBtn - The view model button that was clicked (null if sample changed)
 * @returns {Promise<void>}
 */
async function renderCurrentConfig(sampleBtn, vmBtn) {
  if (sampleBtn) {
    buttonsHost.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === sampleBtn));
  }
  if (vmBtn) {
    viewModelHost.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === vmBtn));
  }

  const structure = await loadStructure(currentSample.file);
  const viewerData = window.bracketsViewerDTO.convertStageStructureToViewerData(structure, undefined, {
    stageName: currentSample.label,
  });

  const config = {
    selector: '#viewer-root',
    clear: true,
    showRoundHeaders: false,
    viewModelId: currentViewModel.id,
  };

  console.log('Rendering with config:', config);
  console.log('- Sample:', currentSample.label);
  console.log('- View Model:', currentViewModel.label, '(id:', currentViewModel.id, ')');

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
