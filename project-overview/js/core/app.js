// Project Overview - Main Application Entry Point

import { initializeTheme } from './settings/theme.js';
import { initializeSettingsModal } from './settings/modal.js';
import { initializeFolderSelection } from './features/folderSelection.js';

/**
 * Initialize the Project Overview application
 */
function initApp() {
  console.log('Project Overview initializing...');
  
  // Initialize theme
  initializeTheme();
  
  // Initialize settings modal
  initializeSettingsModal();
  
  // Initialize folder selection
  initializeFolderSelection();
  
  console.log('Project Overview initialized successfully');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
