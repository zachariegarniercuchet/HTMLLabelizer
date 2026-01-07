// Analysis Modal Component
// Handles analysis modal with draggable functionality

import { domElements } from '../core/domElements.js';
import { getIsDragging, setIsDragging, getDragState, updateDragState, getDocumentA, getDocumentB, getCachedIAAResults, setCachedIAAResults } from '../core/state.js';

export function initializeAnalysisModal() {
  const { analysisModal, analysisCloseBtn, iaaAnalysisBtn, analysisModalHeader } = domElements;
  
  // Open analysis modal and run IAA analysis
  iaaAnalysisBtn?.addEventListener('click', async () => {
    analysisModal?.classList.remove('hidden');
    
    // Check if we have cached results
    const cachedResults = getCachedIAAResults();
    if (cachedResults) {
      // Display cached results without calling Python
      const modalBody = document.querySelector('.analysis-modal-body');
      if (modalBody) {
        // Reapply highlighting
        if (cachedResults.label_matches) {
          applyLabelHighlighting(cachedResults.label_matches);
        }
        displayIAAResults(cachedResults, modalBody);
      }
    } else {
      // No cache, run fresh analysis
      await runIAAAnalysis();
    }
  });
  
  // Minimize analysis modal (not close - keeps cache)
  analysisCloseBtn?.addEventListener('click', () => {
    analysisModal?.classList.add('hidden');
  });
  
  // Setup draggable functionality
  setupDraggable();
  
  // Setup resizable functionality
  setupResizable();
}

async function runIAAAnalysis() {
  const docA = getDocumentA();
  const docB = getDocumentB();
  const modalBody = document.querySelector('.analysis-modal-body');
  
  if (!modalBody) return;
  
  if (!docA || !docB) {
    modalBody.innerHTML = `
      <div class="iaa-error">
        <h3>⚠ Insufficient Data</h3>
        <p>Please load at least 2 annotated HTML files to perform IAA analysis.</p>
      </div>
      <div class="resize-handle" id="resize-handle"></div>
    `;
    return;
  }
  
  // Show loading state
  modalBody.innerHTML = `
    <div class="iaa-loading">
      <div class="spinner"></div>
      <p>Analyzing inter-annotator agreement...</p>
    </div>
    <div class="resize-handle" id="resize-handle"></div>
  `;
  
  try {
    // Send HTML content directly to backend
    const response = await fetch('/api/iaa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: [
          { name: docA.filename || 'Document A', content: docA.html },
          { name: docB.filename || 'Document B', content: docB.html }
        ],
        minOverlap: 0.5
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const results = await response.json();
    
    if (results.error) {
      throw new Error(results.error);
    }
    
    // Apply highlighting to HTML views
    if (results.label_matches) {
      applyLabelHighlighting(results.label_matches);
    }
    
    // Cache the results for future reopening
    setCachedIAAResults(results);
    
    // Display results in modal
    displayIAAResults(results, modalBody);
    
  } catch (error) {
    console.error('IAA Analysis Error:', error);
    modalBody.innerHTML = `
      <div class="iaa-error">
        <h3>⚠ Analysis Failed</h3>
        <p>${error.message}</p>
        <details style="margin-top: 12px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
          <summary style="cursor: pointer; color: var(--sub);">Technical Details</summary>
          <pre style="margin-top: 8px; font-size: 11px; color: var(--text); overflow-x: auto;">${error.stack || 'No additional details'}</pre>
        </details>
        <button onclick="location.reload()" style="margin-top: 12px;">Retry</button>
      </div>
      <div class="resize-handle" id="resize-handle"></div>
    `;
  }
}

function applyLabelHighlighting(labelMatches) {
  // Get HTML content containers and overlay containers
  const htmlContentA = document.getElementById('html-content-a');
  const htmlContentB = document.getElementById('html-content-b');
  const overlayA = document.getElementById('iaa-overlay-a');
  const overlayB = document.getElementById('iaa-overlay-b');
  
  if (!htmlContentA || !htmlContentB || !overlayA || !overlayB || !labelMatches.matches) return;
  
  // Clear existing overlays
  overlayA.innerHTML = '';
  overlayB.innerHTML = '';
  
  // Process matches for both documents
  labelMatches.matches.forEach((docMatches, index) => {
    const htmlContainer = index === 0 ? htmlContentA : htmlContentB;
    const overlayContainer = index === 0 ? overlayA : overlayB;
    const allLabels = htmlContainer.querySelectorAll('manual_label, auto_label');
    
    // Create a map of label index to match info
    const labelMatchMap = new Map();
    Object.entries(docMatches.labels).forEach(([labelId, matchData]) => {
      const labelIndex = parseInt(labelId.split('_')[1]);
      labelMatchMap.set(labelIndex, matchData);
    });
    
    // Create overlays for each label
    allLabels.forEach((labelElement, labelIndex) => {
      const matchData = labelMatchMap.get(labelIndex);
      
      if (!matchData) return;
      
      // Get match info for the other document
      const otherDocName = index === 0 ? 
        (labelMatches.matches[1]?.document || 'doc2') : 
        (labelMatches.matches[0]?.document || 'doc1');
      
      const matchInfo = matchData.matches[otherDocName];
      
      // Determine match type and color
      let matchType, color, matchScore;
      if (!matchInfo) {
        matchType = 'none';
        color = '#f87171';
        matchScore = 0;
      } else {
        matchType = matchInfo.match_type;
        matchScore = matchInfo.overlap;
        color = matchType === 'exact' ? '#4ade80' : '#fbbf24';
      }
      
      // Create overlay element and add to overlay container (not HTML content!)
      createMatchOverlay(labelElement, matchType, color, matchScore, matchInfo, overlayContainer, htmlContainer);
    });
  });
}

function createMatchOverlay(labelElement, matchType, color, matchScore, matchInfo, overlayContainer, htmlContainer) {
  // Skip if icon already exists
  if (labelElement.querySelector('.iaa-match-icon')) return;
  
  // Create icon container (like delete-btn pattern)
  const icon = document.createElement('div');
  icon.className = 'iaa-match-icon';
  icon.style.backgroundColor = color;
  
  // Add SVG icon
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
      <path d="M 25 1 C 11.222656 1 0 10.878906 0 23.1875 C 0 29.234375 2.773438 34.664063 7.21875 38.6875 C 6.546875 40.761719 5.046875 42.398438 3.53125 43.65625 C 2.714844 44.332031 1.933594 44.910156 1.3125 45.46875 C 1.003906 45.746094 0.722656 46.027344 0.5 46.375 C 0.277344 46.722656 0.078125 47.21875 0.21875 47.75 L 0.34375 48.15625 L 0.6875 48.375 C 1.976563 49.117188 3.582031 49.246094 5.3125 49.125 C 7.042969 49.003906 8.929688 48.605469 10.78125 48.09375 C 14.375 47.101563 17.75 45.6875 19.53125 44.90625 C 21.289063 45.273438 23.054688 45.5 24.90625 45.5 C 38.683594 45.5 49.90625 35.621094 49.90625 23.3125 C 49.90625 11.007813 38.78125 1 25 1 Z M 25 3 C 37.820313 3 47.90625 12.214844 47.90625 23.3125 C 47.90625 34.402344 37.730469 43.5 24.90625 43.5 C 23.078125 43.5 21.355469 43.320313 19.625 42.9375 L 19.28125 42.84375 L 19 43 C 17.328125 43.738281 13.792969 45.179688 10.25 46.15625 C 8.476563 46.644531 6.710938 47.019531 5.1875 47.125 C 4.167969 47.195313 3.539063 46.953125 2.84375 46.78125 C 3.339844 46.355469 4.019531 45.847656 4.8125 45.1875 C 6.554688 43.742188 8.644531 41.730469 9.375 38.75 L 9.53125 38.125 L 9.03125 37.75 C 4.625 34.015625 2 28.875 2 23.1875 C 2 12.097656 12.175781 3 25 3 Z M 23.8125 12.8125 C 23.511719 12.8125 23.40625 12.988281 23.40625 13.1875 L 23.40625 15.8125 C 23.40625 16.113281 23.613281 16.1875 23.8125 16.1875 L 26.1875 16.1875 C 26.488281 16.1875 26.59375 16.011719 26.59375 15.8125 L 26.59375 13.1875 C 26.59375 12.886719 26.386719 12.8125 26.1875 12.8125 Z M 23.90625 20.09375 C 23.605469 20.09375 23.5 20.300781 23.5 20.5 L 23.5 33.90625 C 23.5 34.207031 23.707031 34.3125 23.90625 34.3125 L 23.90625 34.40625 L 26.1875 34.40625 C 26.488281 34.40625 26.59375 34.199219 26.59375 34 L 26.59375 20.5 C 26.59375 20.199219 26.386719 20.09375 26.1875 20.09375 Z"/>
    </svg>
  `;
  
  // Create hover tooltip - just show percentage
  const tooltip = document.createElement('div');
  tooltip.className = 'iaa-match-tooltip';
  tooltip.textContent = `${(matchScore * 100).toFixed(0)}%`;
  
  icon.appendChild(tooltip);
  
  // Append directly to the label element (like delete button)
  labelElement.appendChild(icon);
}

function displayIAAResults(results, container) {
  const iaaData = results.iaa || results; // Handle both old and new response format
  const matchData = results.label_matches;
  
  const html = `
    <div class="iaa-results">
      <div class="iaa-section">
        <h3>📊 Summary</h3>
        <div class="iaa-grid">
          <div class="iaa-stat">
            <span class="iaa-label">Annotators:</span>
            <span class="iaa-value">${iaaData.summary.num_annotators}</span>
          </div>
          <div class="iaa-stat">
            <span class="iaa-label">Unique Labels:</span>
            <span class="iaa-value">${iaaData.summary.total_unique_labels}</span>
          </div>
          <div class="iaa-stat">
            <span class="iaa-label">Avg Labels/Annotator:</span>
            <span class="iaa-value">${iaaData.statistics.avg_labels_per_annotator}</span>
          </div>
        </div>
        
        <div class="annotator-list">
          <strong>Annotators:</strong>
          <ul>
            ${iaaData.summary.annotators.map(name => `<li>${name}</li>`).join('')}
          </ul>
        </div>
      </div>
      
      ${matchData ? `
      <div class="iaa-section">
        <h3>🎯 Label Matching Results</h3>
        <div class="iaa-grid">
          <div class="iaa-stat">
            <span class="iaa-label">Exact Matches:</span>
            <span class="iaa-value highlight">${matchData.summary.exact_matches}</span>
          </div>
          <div class="iaa-stat">
            <span class="iaa-label">Partial Matches:</span>
            <span class="iaa-value">${matchData.summary.partial_matches}</span>
          </div>
          <div class="iaa-stat">
            <span class="iaa-label">No Matches:</span>
            <span class="iaa-value">${matchData.summary.no_matches}</span>
          </div>
        </div>
        <div style="margin-top: 12px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px;">
          <div style="color: var(--sub); font-size: 13px; margin-bottom: 8px;">💡 Labels are now color-coded in the documents:</div>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 16px; height: 16px; background: #4ade80; border-radius: 4px;"></div>
              <span style="font-size: 12px; color: var(--text);">Exact Match</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 16px; height: 16px; background: #fbbf24; border-radius: 4px;"></div>
              <span style="font-size: 12px; color: var(--text);">Partial Match (≥50%)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 16px; height: 16px; background: #f87171; border-radius: 4px;"></div>
              <span style="font-size: 12px; color: var(--text);">No Match</span>
            </div>
          </div>
          <div style="color: var(--sub); font-size: 12px; margin-top: 8px;">Hover over labels to see match details</div>
        </div>
      </div>
      ` : ''}
      
      <div class="iaa-section">
        <h3>🏷 Label Usage by Annotator</h3>
        ${Object.entries(iaaData.label_counts).map(([annotator, counts]) => `
          <div class="annotator-labels">
            <strong>${annotator}:</strong>
            <div class="label-chips">
              ${Object.entries(counts).map(([label, count]) => `
                <span class="label-chip">${label} <span class="count-badge">${count}</span></span>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="iaa-section">
        <h3>🔄 Overlap Analysis</h3>
        ${Object.entries(iaaData.overlap_analysis).map(([comparison, metrics]) => `
          <div class="overlap-card">
            <h4>${comparison.replace(/_vs_/g, ' vs ')}</h4>
            <div class="iaa-grid">
              <div class="iaa-stat">
                <span class="iaa-label">Common Labels:</span>
                <span class="iaa-value">${metrics.common_labels}</span>
              </div>
              <div class="iaa-stat">
                <span class="iaa-label">Total Unique:</span>
                <span class="iaa-value">${metrics.total_unique_labels}</span>
              </div>
              <div class="iaa-stat">
                <span class="iaa-label">Jaccard Similarity:</span>
                <span class="iaa-value highlight">${(metrics.jaccard_similarity * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="iaa-section">
        <h3>📈 Label Types Used</h3>
        <div class="label-types">
          ${iaaData.summary.unique_label_types.map(label => `
            <span class="label-type-badge">${label}</span>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="resize-handle" id="resize-handle"></div>
  `;
  
  container.innerHTML = html;
  setupResizable(); // Re-attach resize handler
}

function setupDraggable() {
  const { analysisModal, analysisModalHeader } = domElements;
  
  analysisModalHeader?.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
}

function dragStart(e) {
  const { analysisModalHeader } = domElements;
  const dragState = getDragState();
  
  if (e.target === analysisModalHeader || e.target.tagName === 'H2') {
    updateDragState({
      initialX: e.clientX - dragState.xOffset,
      initialY: e.clientY - dragState.yOffset
    });
    setIsDragging(true);
    analysisModalHeader.style.cursor = 'grabbing';
  }
}

function drag(e) {
  if (getIsDragging()) {
    e.preventDefault();
    const { analysisModal, analysisModalHeader } = domElements;
    const dragState = getDragState();

    // Modal and header dimensions
    const modalRect = analysisModal.getBoundingClientRect();
    const headerRect = analysisModalHeader.getBoundingClientRect();
    const headerHeight = headerRect.height;
    const modalWidth = modalRect.width;
    const modalHeight = modalRect.height;

    // Viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate new position
    let currentX = e.clientX - dragState.initialX;
    let currentY = e.clientY - dragState.initialY;

    // The modal is centered by default, so we need to offset calculations
    // The transform is: translate(calc(-50% + x), calc(-50% + y))
    // So the modal's center is at (viewportWidth/2 + x, viewportHeight/2 + y)
    // The header's top-left relative to the modal is (0, 0)

    // Calculate the modal's center position
    let centerX = viewportWidth / 2 + currentX;
    let centerY = viewportHeight / 2 + currentY;

    // Constrain so that the header stays visible
    // Header top must be >= 0
    // Header left must be >= 0
    // Header right must be <= viewportWidth
    // Modal bottom must be <= viewportHeight

    // Calculate header's top/left/right after move
    let headerTop = centerY - modalHeight / 2;
    let headerLeft = centerX - modalWidth / 2;
    let headerRight = headerLeft + modalWidth;
    let headerBottom = headerTop + headerHeight;
    let modalBottom = centerY + modalHeight / 2;

    // Constrain top (header always visible)
    if (headerTop < 0) {
      currentY += -headerTop;
      centerY += -headerTop;
      headerTop = 0;
      modalBottom = centerY + modalHeight / 2;
    }
    // Constrain left
    if (headerLeft < 0) {
      currentX += -headerLeft;
      centerX += -headerLeft;
      headerLeft = 0;
      headerRight = headerLeft + modalWidth;
    }
    // Constrain right
    if (headerRight > viewportWidth) {
      let over = headerRight - viewportWidth;
      currentX -= over;
      centerX -= over;
      headerLeft -= over;
      headerRight = viewportWidth;
    }
    // Constrain bottom (modal bottom)
    if (modalBottom > viewportHeight) {
      let over = modalBottom - viewportHeight;
      currentY -= over;
      centerY -= over;
      headerTop -= over;
      modalBottom = viewportHeight;
    }

    updateDragState({
      currentX,
      currentY,
      xOffset: currentX,
      yOffset: currentY
    });

    setTranslate(currentX, currentY, analysisModal);
  }
}

function dragEnd(e) {
  const { analysisModalHeader } = domElements;
  const dragState = getDragState();
  
  updateDragState({
    initialX: dragState.currentX,
    initialY: dragState.currentY
  });
  
  setIsDragging(false);
  if (analysisModalHeader) {
    analysisModalHeader.style.cursor = 'move';
  }
}

function setTranslate(xPos, yPos, el) {
  el.style.transform = `translate(calc(-50% + ${xPos}px), calc(-50% + ${yPos}px))`;
}

// Resize functionality
let isResizing = false;
let resizeState = {
  startWidth: 0,
  startHeight: 0,
  startX: 0,
  startY: 0
};

function setupResizable() {
  const resizeHandle = document.getElementById('resize-handle');
  
  if (!resizeHandle) return;
  
  resizeHandle.addEventListener('mousedown', resizeStart);
  document.addEventListener('mousemove', resize);
  document.addEventListener('mouseup', resizeEnd);
}

function resizeStart(e) {
  const { analysisModal } = domElements;
  
  isResizing = true;
  
  resizeState.startWidth = analysisModal.offsetWidth;
  resizeState.startHeight = analysisModal.offsetHeight;
  resizeState.startX = e.clientX;
  resizeState.startY = e.clientY;
  
  e.preventDefault();
}

function resize(e) {
  if (!isResizing) return;
  
  const { analysisModal } = domElements;
  
  const width = resizeState.startWidth + (e.clientX - resizeState.startX);
  const height = resizeState.startHeight + (e.clientY - resizeState.startY);
  
  // Apply size constraints
  if (width >= 400 && width <= window.innerWidth * 0.9) {
    analysisModal.style.width = `${width}px`;
  }
  
  if (height >= 250 && height <= window.innerHeight * 0.8) {
    analysisModal.style.height = `${height}px`;
  }
}

function resizeEnd() {
  isResizing = false;
}
