// Analysis Modal Component
// Handles analysis modal with draggable functionality

import { domElements } from '../core/domElements.js';
import { getIsDragging, setIsDragging, getDragState, updateDragState, getDocumentA, getDocumentB, getCachedIAAResults, setCachedIAAResults } from '../core/state.js';
import { runIAAAnalysis as runClientSideIAA, clearMatchHighlighting } from '../features/iaaAnalysis.js';

export function initializeAnalysisModal() {
  const { analysisModal, analysisCloseBtn, iaaAnalysisBtn, analysisModalHeader } = domElements;
  
  // Open analysis modal and run IAA analysis
  iaaAnalysisBtn?.addEventListener('click', async () => {
    analysisModal?.classList.remove('hidden');
    
    // Check if we have cached results
    const cachedResults = getCachedIAAResults();
    if (cachedResults) {
      // Display cached results and reapply highlighting
      const modalBody = document.querySelector('.analysis-modal-body');
      if (modalBody) {
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
    // Run client-side IAA analysis
    const results = await runClientSideIAA();
    
    console.log('IAA Analysis Results:', results);
    
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

function displayIAAResults(results, container) {
  console.log('[IAA] Displaying results:', results);
  
  const matchResults = results.matchResults;
  const summary = matchResults.summary;
  
  // Create summary section
  let html = `
    <div class="iaa-section">
      <h3>📊 Match Summary</h3>
      <div class="iaa-summary-grid">
        <div class="iaa-summary-card exact">
          <div class="iaa-summary-number">${summary.exactMatches}</div>
          <div class="iaa-summary-label">Exact Matches</div>
          <div class="iaa-summary-color" style="background: #22c55e;"></div>
        </div>
        <div class="iaa-summary-card overlap">
          <div class="iaa-summary-number">${summary.overlapMatches}</div>
          <div class="iaa-summary-label">Overlap Matches</div>
          <div class="iaa-summary-color" style="background: #f97316;"></div>
        </div>
        <div class="iaa-summary-card no-match">
          <div class="iaa-summary-number">${summary.noMatches}</div>
          <div class="iaa-summary-label">No Matches</div>
          <div class="iaa-summary-color" style="background: #ef4444;"></div>
        </div>
      </div>
      <div class="iaa-totals">
        <div>Document A: <strong>${summary.totalA}</strong> labels</div>
        <div>Document B: <strong>${summary.totalB}</strong> labels</div>
      </div>
    </div>
    
    <div class="iaa-section">
      <h3>🎯 Agreement Metrics</h3>
      <div class="iaa-method">
        Labels are matched based on position overlap (Intersection over Union). 
        <strong style="color: #22c55e;">Green</strong> = exact position match, 
        <strong style="color: #f97316;">Orange</strong> = partial overlap, 
        <strong style="color: #ef4444;">Red</strong> = no match found.
      </div>
      <div class="iaa-metrics">
        <div class="iaa-metric-row">
          <span class="iaa-metric-label">Agreement Rate:</span>
          <span class="iaa-metric-value">${((summary.exactMatches + summary.overlapMatches) / Math.max(summary.totalA, summary.totalB) * 100).toFixed(1)}%</span>
        </div>
        <div class="iaa-metric-row">
          <span class="iaa-metric-label">Exact Match Rate:</span>
          <span class="iaa-metric-value">${(summary.exactMatches / Math.max(summary.totalA, summary.totalB) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
    
    <div class="iaa-section">
      <h3>📋 Detailed Matches</h3>
      <div class="iaa-matches-list">
  `;
  
  // Add detailed match list
  matchResults.matches.forEach((match, index) => {
    const matchTypeClass = match.matchType.replace('-', '_');
    const matchTypeLabel = match.matchType === 'exact' ? 'Exact Match' : 
                           match.matchType === 'overlap' ? 'Overlap Match' : 'No Match';
    const matchColor = match.matchType === 'exact' ? '#22c55e' : 
                       match.matchType === 'overlap' ? '#f97316' : '#ef4444';
    
    if (match.labelA && match.labelB) {
      html += `
        <div class="iaa-match-item ${matchTypeClass}">
          <div class="iaa-match-header" style="border-left: 4px solid ${matchColor};">
            <span class="iaa-match-badge" style="background: ${matchColor};">${matchTypeLabel}</span>
            <span class="iaa-match-overlap">${(match.overlap * 100).toFixed(0)}% overlap</span>
          </div>
          <div class="iaa-match-details">
            <div class="iaa-match-side">
              <strong>Doc A:</strong> ${match.labelA.type || 'Label'} 
              <span class="iaa-match-text">"${match.labelA.text.substring(0, 50)}${match.labelA.text.length > 50 ? '...' : ''}"</span>
            </div>
            <div class="iaa-match-side">
              <strong>Doc B:</strong> ${match.labelB.type || 'Label'}
              <span class="iaa-match-text">"${match.labelB.text.substring(0, 50)}${match.labelB.text.length > 50 ? '...' : ''}"</span>
            </div>
          </div>
        </div>
      `;
    } else if (match.labelA) {
      html += `
        <div class="iaa-match-item no_match">
          <div class="iaa-match-header" style="border-left: 4px solid ${matchColor};">
            <span class="iaa-match-badge" style="background: ${matchColor};">Only in Doc A</span>
          </div>
          <div class="iaa-match-details">
            <div class="iaa-match-side">
              <strong>Doc A:</strong> ${match.labelA.type || 'Label'}
              <span class="iaa-match-text">"${match.labelA.text.substring(0, 50)}${match.labelA.text.length > 50 ? '...' : ''}"</span>
            </div>
          </div>
        </div>
      `;
    } else if (match.labelB) {
      html += `
        <div class="iaa-match-item no_match">
          <div class="iaa-match-header" style="border-left: 4px solid ${matchColor};">
            <span class="iaa-match-badge" style="background: ${matchColor};">Only in Doc B</span>
          </div>
          <div class="iaa-match-details">
            <div class="iaa-match-side">
              <strong>Doc B:</strong> ${match.labelB.type || 'Label'}
              <span class="iaa-match-text">"${match.labelB.text.substring(0, 50)}${match.labelB.text.length > 50 ? '...' : ''}"</span>
            </div>
          </div>
        </div>
      `;
    }
  });
  
  html += `
      </div>
    </div>
    <div class="resize-handle" id="resize-handle"></div>
  `;
  
  container.innerHTML = html;
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
