const SAMPLES = [
  { id: 'single', label: 'Single Elimination', file: 'singleElimData.json' },
  { id: 'double', label: 'Double Elimination', file: 'doubleElimData.json' },
  { id: 'roundRobin', label: 'Round Robin', file: 'roundRobinData.json' },
  { id: 'swiss', label: 'Swiss', file: 'swissData.json' },
];

const VIEW_MODELS = [
  { id: 'default', label: 'Default', formats: ['single', 'double', 'roundRobin', 'swiss'] },
  { id: 'broadcast', label: 'Broadcast / Streaming', formats: ['single', 'double', 'roundRobin', 'swiss'] },
  { id: 'de-split-horizontal', label: 'DE Split Horizontal (VCT)', formats: ['double'] },
];

const buttonsHost = document.querySelector('#format-buttons');
const viewModelHost = document.querySelector('#view-model-buttons');
const cache = new Map();

let currentSample = SAMPLES[0];
let currentViewModel = VIEW_MODELS.find(vm => vm.id === 'broadcast') || VIEW_MODELS[0];

// Display options state (defaults to all enabled)
const displayOptions = {
  showRoundHeaders: true,
  showSlotsOrigin: true,
  showLowerBracketSlotsOrigin: true,
  showPopoverOnMatchLabelClick: true,
  highlightParticipantOnHover: true,
  participantOriginPlacement: 'before',
  showParticipantImages: true,
  showConnectors: true,
  showMatchMetadata: true,
};

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
  btn.dataset.formats = JSON.stringify(vm.formats);
  btn.addEventListener('click', () => {
    currentViewModel = vm;
    renderCurrentConfig(null, btn);
  });
  viewModelHost.appendChild(btn);
});

// Set up display option toggles
const toggles = {
  'toggle-round-headers': 'showRoundHeaders',
  'toggle-slots-origin': 'showSlotsOrigin',
  'toggle-lower-slots-origin': 'showLowerBracketSlotsOrigin',
  'toggle-match-popover': 'showPopoverOnMatchLabelClick',
  'toggle-participant-images': 'showParticipantImages',
  'toggle-connectors': 'showConnectors',
  'toggle-match-metadata': 'showMatchMetadata',
};

Object.entries(toggles).forEach(([toggleId, optionKey]) => {
  const checkbox = document.getElementById(toggleId);
  if (checkbox) {
    checkbox.addEventListener('change', () => {
      displayOptions[optionKey] = checkbox.checked;
      renderCurrentConfig(null, null);
    });
  }
});

const highlightHoverCheckbox = document.getElementById('toggle-highlight-hover');
if (highlightHoverCheckbox) {
  highlightHoverCheckbox.addEventListener('change', () => {
    displayOptions.highlightParticipantOnHover = highlightHoverCheckbox.checked;
    renderCurrentConfig(null, null);
  });
}

// Dark mode toggle
const darkModeCheckbox = document.getElementById('toggle-dark-mode');
if (darkModeCheckbox) {
  darkModeCheckbox.addEventListener('change', () => {
    const isDark = darkModeCheckbox.checked;
    document.body.classList.toggle('dark', isDark);
    const viewer = document.querySelector('#viewer-root');
    if (viewer) {
      viewer.classList.toggle('bv-theme-dark', isDark);
    }
  });
}

const positionRadios = document.querySelectorAll('input[name="participant-position"]');
positionRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    displayOptions.participantOriginPlacement = radio.value;
    renderCurrentConfig(null, null);
  });
});

/**
 * Generates participant images using ui-avatars.com API
 *
 * @param {Array} participants - The participants array from ViewerData
 * @returns {Array} Array of ParticipantImage objects { participantId, imageUrl }
 */
function generateParticipantImages(participants) {
  return participants.map(participant => {
    // Extract initials from participant name (e.g., "Team Alpha" -> "TA")
    const initials = participant.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    // Generate a consistent color based on participant ID
    const colors = ['3498db', 'e74c3c', '2ecc71', 'f39c12', '9b59b6', '1abc9c', 'e67e22', '34495e'];
    const colorIndex = participant.id % colors.length;
    const background = colors[colorIndex];

    // Use ui-avatars.com API to generate avatar
    const imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=64&background=${background}&color=fff&bold=true&format=png`;

    return {
      participantId: participant.id,
      imageUrl: imageUrl,
    };
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
    filterViewModelButtons();
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
    viewModelId: currentViewModel.id,

    // Display options from toggles
    showRoundHeaders: displayOptions.showRoundHeaders,
    showSlotsOrigin: displayOptions.showSlotsOrigin,
    showLowerBracketSlotsOrigin: displayOptions.showLowerBracketSlotsOrigin,
    showPopoverOnMatchLabelClick: displayOptions.showPopoverOnMatchLabelClick,
    highlightParticipantOnHover: displayOptions.highlightParticipantOnHover,
    participantOriginPlacement: displayOptions.participantOriginPlacement,
    showConnectors: displayOptions.showConnectors,
    showMatchMetadata: displayOptions.showMatchMetadata,
  };

  console.log('Rendering with config:', config);
  console.log('- Sample:', currentSample.label);
  console.log('- View Model:', currentViewModel.label, '(id:', currentViewModel.id, ')');
  console.log('- Display Options:', displayOptions);

  // Set participant images if enabled
  if (displayOptions.showParticipantImages) {
    const participantImages = generateParticipantImages(viewerData.participants);
    window.bracketsViewer.setParticipantImages(participantImages);
    console.log('- Participant Images:', participantImages.length, 'images set');
  } else {
    // Clear images if disabled
    window.bracketsViewer.setParticipantImages([]);
    console.log('- Participant Images: disabled');
  }

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
