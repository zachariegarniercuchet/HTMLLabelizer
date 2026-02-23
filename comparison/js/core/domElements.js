// DOM Element References
// All DOM elements used across the comparison tool

export const domElements = {
  // Settings Modal
  settingsModal: document.getElementById('settings-modal'),
  settingsBtn: document.getElementById('settings-btn'),
  settingsCloseBtn: document.getElementById('settings-close-btn'),
  settingsOverlay: document.getElementById('settings-overlay'),
  
  // Theme & Display Controls
  themeToggle: document.getElementById('theme-toggle'),
  contrastSlider: document.getElementById('contrast-slider'),
  backgroundSlider: document.getElementById('background-slider'),
  contrastPreview: document.getElementById('contrast-preview'),
  backgroundPreview: document.getElementById('background-preview'),
  resetSettingsBtn: document.getElementById('reset-settings'),
  
  // Analysis Modal
  analysisModal: document.getElementById('analysis-modal'),
  analysisCloseBtn: document.getElementById('analysis-close-btn'),
  analysisModalHeader: document.getElementById('analysis-modal-header'),
  analysisDetails: document.getElementById('analysis-details'),
  
  // Action Buttons
  clearAllBtn: document.getElementById('clear-all'),
  iaaAnalysisBtn: document.getElementById('iaa-analysis-btn'),
  syncScrollToggle: document.getElementById('sync-scroll-toggle'),
  fullscreenBtn: document.getElementById('fullscreen-btn'),
  
  // Document A Elements
  htmlContentA: document.getElementById('html-content-a'),
  filenameA: document.getElementById('filename-a'),
  dropZoneA: document.getElementById('drop-zone-a'),
  uploadLinkA: document.getElementById('upload-link-a'),
  sourceViewA: document.getElementById('source-view-a'),
  viewToggleA: document.getElementById('view-toggle-a'),
  statsBtnA: document.getElementById('stats-btn-a'),
  statsContentA: document.getElementById('stats-content-a'),
  
  // Document B Elements
  htmlContentB: document.getElementById('html-content-b'),
  filenameB: document.getElementById('filename-b'),
  dropZoneB: document.getElementById('drop-zone-b'),
  uploadLinkB: document.getElementById('upload-link-b'),
  sourceViewB: document.getElementById('source-view-b'),
  viewToggleB: document.getElementById('view-toggle-b'),
  statsBtnB: document.getElementById('stats-btn-b'),
  statsContentB: document.getElementById('stats-content-b'),
  
  // Statistics Elements
  agreementScore: document.getElementById('agreement-score'),
  totalLabelsA: document.getElementById('total-labels-a'),
  totalLabelsB: document.getElementById('total-labels-b'),
  commonLabels: document.getElementById('common-labels')
};
