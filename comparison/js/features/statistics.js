// Statistics Module
// Wrapper for shared statistics functionality

import { domElements } from '../core/domElements.js';
import { getDocumentA, getDocumentB } from '../core/state.js';
import { 
  calculateDocumentStats, 
  renderStats
} from '../../../shared/statistics.js';

/**
 * Update statistics for a specific document
 * @param {string} side - 'a' or 'b'
 */
export function updateStatistics(side) {
  const doc = side === 'a' ? getDocumentA() : getDocumentB();
  const htmlContent = doc ? doc.htmlContent : null;
  const labelsSchema = doc ? doc.labels : null;
  const statsContainer = side === 'a' ? domElements.statsContentA : domElements.statsContentB;
  
  if (!statsContainer) {
    console.warn(`Statistics container for side ${side} not found`);
    return;
  }
  
  const stats = calculateDocumentStats(htmlContent, labelsSchema);
  renderStats(stats, statsContainer);
}

/**
 * Toggle statistics overlay
 * @param {string} side - 'a' or 'b'
 */
export function toggleStatistics(side) {
  const overlay = document.getElementById(`stats-overlay-${side}`);
  
  if (!overlay) return;
  
  const isHidden = overlay.classList.contains('hidden');
  
  if (isHidden) {
    // Update statistics before showing
    updateStatistics(side);
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

/**
 * Export statistics as JSON
 * @param {string} side - 'a' or 'b'
 */
function downloadStatistics(side) {
  const doc = side === 'a' ? getDocumentA() : getDocumentB();
  
  if (!doc || !doc.htmlContent) {
    console.warn('No document loaded to export statistics');
    return;
  }
  
  const stats = calculateDocumentStats(doc.htmlContent, doc.labels);
  
  // Build detailed statistics object
  const exportData = {
    documentName: doc.filename || `document_${side}`,
    exportDate: new Date().toISOString(),
    totalLabels: stats.totalLabels,
    labelParents: stats.labelTree.length,
    labels: stats.labelTree.map(parent => {
      return {
        name: parent.name,
        color: parent.color,
        manual: parent.manual,
        auto: parent.auto,
        total: parent.total,
        sublabels: parent.children.map(child => ({
          name: child.name,
          color: child.color,
          manual: child.manual,
          auto: child.auto,
          total: child.total
        }))
      };
    })
  };
  
  // Create and trigger download
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(doc.filename || `document_${side}`).replace('.html', '')}_statistics.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Initialize statistics functionality
 */
export function initializeStatistics() {
  console.log('Initializing statistics module...');
  
  // Set up stats button listeners
  const statsBtnA = document.getElementById('stats-btn-a');
  const statsBtnB = document.getElementById('stats-btn-b');
  
  if (statsBtnA) {
    statsBtnA.addEventListener('click', () => toggleStatistics('a'));
  }
  
  if (statsBtnB) {
    statsBtnB.addEventListener('click', () => toggleStatistics('b'));
  }
  
  // Set up close button listeners
  const statsCloseA = document.getElementById('stats-close-a');
  const statsCloseB = document.getElementById('stats-close-b');
  
  if (statsCloseA) {
    statsCloseA.addEventListener('click', () => toggleStatistics('a'));
  }
  
  if (statsCloseB) {
    statsCloseB.addEventListener('click', () => toggleStatistics('b'));
  }
  
  // Set up download button listeners
  const statsDownloadA = document.getElementById('stats-download-a');
  const statsDownloadB = document.getElementById('stats-download-b');
  
  if (statsDownloadA) {
    statsDownloadA.addEventListener('click', () => downloadStatistics('a'));
  }
  
  if (statsDownloadB) {
    statsDownloadB.addEventListener('click', () => downloadStatistics('b'));
  }
  
  // Close overlay when clicking outside the modal
  const overlayA = document.getElementById('stats-overlay-a');
  const overlayB = document.getElementById('stats-overlay-b');
  
  if (overlayA) {
    overlayA.addEventListener('click', (e) => {
      if (e.target === overlayA) {
        toggleStatistics('a');
      }
    });
  }
  
  if (overlayB) {
    overlayB.addEventListener('click', (e) => {
      if (e.target === overlayB) {
        toggleStatistics('b');
      }
    });
  }
  
  console.log('Statistics module initialized');
}
