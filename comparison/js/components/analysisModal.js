// Analysis Modal Component
// Handles analysis modal with draggable functionality

import { domElements } from '../core/domElements.js';
import { getIsDragging, setIsDragging, getDragState, updateDragState, getDocumentA, getDocumentB, getCachedIAAResults, setCachedIAAResults } from '../core/state.js';
import { runIAAAnalysis as runClientSideIAA } from '../features/iaaAnalysis.js';

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
    `;
    return;
  }
  
  // Show loading state
  modalBody.innerHTML = `
    <div class="iaa-loading">
      <div class="spinner"></div>
      <p>Analyzing inter-annotator agreement...</p>
    </div>
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
    `;
  }
}

function displayIAAResults(results, container) {
  console.log('[IAA] Displaying results:', results);
  
  // Display placeholder message
  container.innerHTML = `
    <div class="iaa-section" style="padding: 40px; text-align: center;">
      <h3 style="margin: 0 0 16px 0; font-size: 24px; color: var(--text);">
        📊 IAA Analysis
      </h3>
      <p style="color: var(--sub); font-size: 14px; margin-bottom: 20px;">
        Analysis results will be displayed here.
      </p>
      <div style="padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px; font-family: monospace; font-size: 12px; text-align: left; color: var(--text);">
        <pre>${JSON.stringify(results, null, 2)}</pre>
      </div>
    </div>
  `;
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
  
  // Don't drag if clicking on a button
  if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
    return;
  }
  
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
