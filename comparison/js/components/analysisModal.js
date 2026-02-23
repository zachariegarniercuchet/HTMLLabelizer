// Analysis Modal Component
// Handles IAA analysis button

import { domElements } from '../core/domElements.js';

export function initializeAnalysisModal() {
  const { iaaAnalysisBtn } = domElements;
  
  // Show "Not implemented yet" message when IAA Analysis button is clicked
  iaaAnalysisBtn?.addEventListener('click', () => {
    alert('IAA Analysis - Not implemented yet');
  });
}
