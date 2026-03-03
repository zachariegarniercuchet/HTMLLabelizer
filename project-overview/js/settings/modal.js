// Settings Modal Management

/**
 * Initialize settings modal functionality
 */
export function initializeSettingsModal() {
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }
  
  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', closeSettingsModal);
  }
  
  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', closeSettingsModal);
  }
}

/**
 * Open settings modal
 */
function openSettingsModal() {
  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) {
    settingsModal.classList.remove('hidden');
  }
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) {
    settingsModal.classList.add('hidden');
  }
}
