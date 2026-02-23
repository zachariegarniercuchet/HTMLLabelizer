// Comparison Tool - Main Application Entry Point
// Initializes all modules and components

import { initializeSettingsModal } from '../components/settingsModal.js';
import { initializeAnalysisModal } from '../components/analysisModal.js';
import { initializeThemeControl } from '../components/themeControl.js';
import { initializeFileOperations } from '../features/fileOperations.js';
import { initializeViewToggle } from '../features/viewToggle.js';
import { initializeStatistics } from '../features/statistics.js';
import { initializeComparisonView } from '../features/comparisonView.js';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  console.log('Comparison Tool initializing...');
  
  // Initialize all components
  initializeSettingsModal();
  initializeAnalysisModal();
  initializeThemeControl();
  initializeFileOperations();
  initializeViewToggle();
  initializeStatistics();
  initializeComparisonView();
  
  console.log('Comparison Tool initialized - JavaScript functionality loaded');
});

// TODO: Implement drag and drop functionality
// TODO: Implement file loading and parsing
// TODO: Implement comparison analysis algorithms
// TODO: Implement report generation
