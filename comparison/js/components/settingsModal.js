// Settings Modal Component
// Handles settings modal open/close functionality

import { domElements } from '../core/domElements.js';

export function initializeSettingsModal() {
  const { settingsModal, settingsBtn, settingsCloseBtn, settingsOverlay } = domElements;
  
  // Open settings modal
  settingsBtn?.addEventListener('click', () => {
    settingsModal?.classList.remove('hidden');
  });
  
  // Close settings modal - close button
  settingsCloseBtn?.addEventListener('click', () => {
    settingsModal?.classList.add('hidden');
  });
  
  // Close settings modal - overlay click
  settingsOverlay?.addEventListener('click', () => {
    settingsModal?.classList.add('hidden');
  });
}
