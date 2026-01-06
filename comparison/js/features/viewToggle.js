// View Toggle Feature - Switch between rendered and source views
// Read-only source view for documents A and B

import { domElements } from '../core/domElements.js';
import { getDocumentA, getDocumentB } from '../core/state.js';

// State for view mode
let isSourceViewA = false;
let isSourceViewB = false;

/**
 * Initialize view toggle functionality
 */
export function initializeViewToggle() {
  // Add event listeners to toggle buttons
  if (domElements.viewToggleA) {
    domElements.viewToggleA.addEventListener('click', () => toggleView('A'));
  }
  
  if (domElements.viewToggleB) {
    domElements.viewToggleB.addEventListener('click', () => toggleView('B'));
  }
  
  console.log('View toggle initialized');
}

/**
 * Toggle between rendered and source view for a document
 * @param {string} doc - 'A' or 'B'
 */
function toggleView(doc) {
  const isA = doc === 'A';
  const currentState = isA ? isSourceViewA : isSourceViewB;
  const documentData = isA ? getDocumentA() : getDocumentB();
  
  if (!documentData) return;
  
  const htmlContent = isA ? domElements.htmlContentA : domElements.htmlContentB;
  const sourceView = isA ? domElements.sourceViewA : domElements.sourceViewB;
  const viewToggle = isA ? domElements.viewToggleA : domElements.viewToggleB;
  
  // Get current scroll position before switching
  let currentScrollRatio = 0;
  if (currentState) {
    // Switching from source view
    currentScrollRatio = getScrollPosition(sourceView);
  } else {
    // Switching from rendered view
    currentScrollRatio = getScrollPosition(htmlContent);
  }
  
  // Toggle state
  if (isA) {
    isSourceViewA = !isSourceViewA;
  } else {
    isSourceViewB = !isSourceViewB;
  }
  
  const newState = isA ? isSourceViewA : isSourceViewB;
  
  // Update button text and style
  if (newState) {
    viewToggle.textContent = 'View Rendered';
    viewToggle.classList.add('active');
  } else {
    viewToggle.textContent = 'View Source';
    viewToggle.classList.remove('active');
  }
  
  // Toggle views
  if (newState) {
    // Show source view
    htmlContent.style.display = 'none';
    sourceView.style.display = 'block';
    sourceView.value = documentData.html;
  } else {
    // Show rendered view
    sourceView.style.display = 'none';
    htmlContent.style.display = 'block';
  }
  
  // Restore scroll position
  setTimeout(() => {
    if (newState) {
      setScrollPosition(sourceView, currentScrollRatio);
    } else {
      setScrollPosition(htmlContent, currentScrollRatio);
    }
  }, 10);
}

/**
 * Get scroll position as ratio (0-1)
 * @param {HTMLElement} element
 * @returns {number}
 */
function getScrollPosition(element) {
  if (!element) return 0;
  const maxScroll = element.scrollHeight - element.clientHeight;
  if (maxScroll <= 0) return 0;
  return element.scrollTop / maxScroll;
}

/**
 * Set scroll position from ratio (0-1)
 * @param {HTMLElement} element
 * @param {number} ratio
 */
function setScrollPosition(element, ratio) {
  if (!element) return;
  const maxScroll = element.scrollHeight - element.clientHeight;
  element.scrollTop = ratio * maxScroll;
}
