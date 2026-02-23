// Synchronized Scroll Feature
// Synchronizes scrolling between Document A and Document B in the comparison tool

import { domElements } from '../core/domElements.js';
import { getDocumentA, getDocumentB } from '../core/state.js';

let isSyncEnabled = false; // Start disabled until both documents are loaded
let isScrolling = false; // Prevent infinite scroll loops

/**
 * Initialize synchronized scrolling functionality
 */
export function initializeSynchronizedScroll() {
  console.log('Initializing synchronized scroll...');
  
  // Add scroll listeners for rendered views (HTML content)
  if (domElements.htmlContentA && domElements.htmlContentB) {
    domElements.htmlContentA.addEventListener('scroll', () => {
      if (isSyncEnabled && !isScrolling) {
        syncScroll(domElements.htmlContentA, domElements.htmlContentB);
      }
    });
    
    domElements.htmlContentB.addEventListener('scroll', () => {
      if (isSyncEnabled && !isScrolling) {
        syncScroll(domElements.htmlContentB, domElements.htmlContentA);
      }
    });
  }
  
  // Add scroll listeners for source views (textareas)
  if (domElements.sourceViewA && domElements.sourceViewB) {
    domElements.sourceViewA.addEventListener('scroll', () => {
      if (isSyncEnabled && !isScrolling) {
        syncScroll(domElements.sourceViewA, domElements.sourceViewB);
      }
    });
    
    domElements.sourceViewB.addEventListener('scroll', () => {
      if (isSyncEnabled && !isScrolling) {
        syncScroll(domElements.sourceViewB, domElements.sourceViewA);
      }
    });
  }
  
  // Add button click handler
  if (domElements.syncScrollToggle) {
    domElements.syncScrollToggle.addEventListener('click', () => {
      toggleSyncScroll();
      updateButtonState();
    });
    
    // Initialize button state
    updateButtonState();
  }
  
  // Add keyboard shortcut (Ctrl+Shift+S) to toggle synchronized scrolling
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      toggleSyncScroll();
      updateButtonState();
    }
  });
  
  console.log('Synchronized scroll initialized - Use Ctrl+Shift+S to toggle');
}

/**
 * Synchronize scroll position from source element to target element
 * @param {HTMLElement} source - The element being scrolled
 * @param {HTMLElement} target - The element to sync scroll to
 */
function syncScroll(source, target) {
  if (!source || !target) return;
  
  isScrolling = true;
  
  // Calculate scroll percentage
  const scrollPercentageVertical = source.scrollTop / (source.scrollHeight - source.clientHeight);
  const scrollPercentageHorizontal = source.scrollLeft / (source.scrollWidth - source.clientWidth);
  
  // Apply to target element
  if (!isNaN(scrollPercentageVertical)) {
    target.scrollTop = scrollPercentageVertical * (target.scrollHeight - target.clientHeight);
  }
  
  if (!isNaN(scrollPercentageHorizontal)) {
    target.scrollLeft = scrollPercentageHorizontal * (target.scrollWidth - target.clientWidth);
  }
  
  // Reset flag after a short delay to prevent loop
  setTimeout(() => {
    isScrolling = false;
  }, 50);
}

/**
 * Toggle synchronized scrolling on/off
 */
export function toggleSyncScroll() {
  isSyncEnabled = !isSyncEnabled;
  
  const status = isSyncEnabled ? 'enabled' : 'disabled';
  console.log(`Synchronized scrolling ${status}`);
  
  // Show visual feedback
  showSyncNotification(`Synchronized Scrolling: ${status.toUpperCase()}`);
}

/**
 * Update the sync scroll button visual state
 */
function updateButtonState() {
  const syncIcon = document.getElementById('sync-icon');
  
  if (domElements.syncScrollToggle) {
    if (isSyncEnabled) {
      domElements.syncScrollToggle.classList.add('active');
      domElements.syncScrollToggle.title = 'Synchronized Scrolling: ON (Ctrl+Shift+S to toggle)';
      if (syncIcon) {
        syncIcon.src = '../assets/icons-connect.png';
        syncIcon.alt = 'Connected';
      }
    } else {
      domElements.syncScrollToggle.classList.remove('active');
      domElements.syncScrollToggle.title = 'Synchronized Scrolling: OFF (Ctrl+Shift+S to toggle)';
      if (syncIcon) {
        syncIcon.src = '../assets/icons-disconnect.png';
        syncIcon.alt = 'Disconnected';
      }
    }
  }
}

/**
 * Check if both documents are loaded and enable/disable sync button
 */
export function checkAndEnableSyncButton() {
  const { syncScrollToggle } = domElements;
  const docA = getDocumentA();
  const docB = getDocumentB();
  
  if (syncScrollToggle) {
    if (docA && docB) {
      syncScrollToggle.disabled = false;
      // Auto-enable sync when both documents are loaded
      if (!isSyncEnabled) {
        isSyncEnabled = true;
        updateButtonState();
      }
    } else {
      syncScrollToggle.disabled = true;
      syncScrollToggle.title = 'Synchronized Scrolling: OFF (Load both documents to enable)';
      isSyncEnabled = false;
      updateButtonState();
    }
  }
}

/**
 * Enable synchronized scrolling
 */
export function enableSyncScroll() {
  isSyncEnabled = true;
  console.log('Synchronized scrolling enabled');
}

/**
 * Disable synchronized scrolling
 */
export function disableSyncScroll() {
  isSyncEnabled = false;
  console.log('Synchronized scrolling disabled');
}

/**
 * Check if synchronized scrolling is currently enabled
 * @returns {boolean}
 */
export function isSyncScrollEnabled() {
  return isSyncEnabled;
}

/**
 * Show a temporary notification to the user
 * @param {string} message - Message to display
 */
function showSyncNotification(message) {
  // Remove existing notification if present
  const existingNotification = document.querySelector('.sync-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'sync-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--card);
    color: var(--text);
    padding: 12px 24px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid var(--border);
    animation: slideDown 0.3s ease-out;
  `;
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
  `;
  
  if (!document.querySelector('style[data-sync-notification]')) {
    style.setAttribute('data-sync-notification', 'true');
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Remove notification after 2 seconds
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

/**
 * Scroll both documents to a specific percentage position
 * @param {number} percentageVertical - Vertical scroll percentage (0-1)
 * @param {number} percentageHorizontal - Horizontal scroll percentage (0-1)
 */
export function scrollBothTo(percentageVertical = 0, percentageHorizontal = 0) {
  const elements = [
    domElements.htmlContentA,
    domElements.htmlContentB,
    domElements.sourceViewA,
    domElements.sourceViewB
  ];
  
  elements.forEach(element => {
    if (element && element.scrollHeight > element.clientHeight) {
      element.scrollTop = percentageVertical * (element.scrollHeight - element.clientHeight);
    }
    if (element && element.scrollWidth > element.clientWidth) {
      element.scrollLeft = percentageHorizontal * (element.scrollWidth - element.clientWidth);
    }
  });
}

/**
 * Scroll both documents to the top
 */
export function scrollBothToTop() {
  scrollBothTo(0, 0);
}

/**
 * Scroll both documents to the bottom
 */
export function scrollBothToBottom() {
  scrollBothTo(1, 0);
}
