const SAMPLES = [
  { id: 'single', label: 'Single Elimination', file: 'singleElimData.json' },
  { id: 'double', label: 'Double Elimination', file: 'doubleElimData.json' },
  { id: 'roundRobin', label: 'Round Robin', file: 'roundRobinData.json' },
  { id: 'swiss', label: 'Swiss', file: 'swissData.json' },
];

const buttonsHost = document.querySelector('#format-buttons');
const cache = new Map();

SAMPLES.forEach(sample => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = sample.label;
  btn.dataset.sample = sample.id;
  btn.addEventListener('click', () => renderSample(sample, btn));
  buttonsHost.appendChild(btn);
});

renderSample(SAMPLES[0], buttonsHost.firstElementChild);

/**
 * Renders a bracket sample to the viewer
 * @param {object} sample - The sample configuration object
 * @param {HTMLButtonElement} btn - The button element that was clicked
 * @returns {Promise<void>}
 */
async function renderSample(sample, btn) {
  buttonsHost.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn));
  const structure = await loadStructure(sample.file);
  const viewerData = window.bracketsViewerDTO.convertStageStructureToViewerData(structure, undefined, {
    stageName: sample.label,
  });
  await window.bracketsViewer.render(viewerData, { selector: '#viewer-root', clear: true });
}

/**
 * Loads and caches a tournament structure from a JSON file
 * @param {string} file - The filename to load
 * @returns {Promise<object>} The tournament structure data
 */
async function loadStructure(file) {
  if (cache.has(file)) return cache.get(file);
  const data = await fetch(file).then(res => res.json());
  cache.set(file, data);
  return data;
}
