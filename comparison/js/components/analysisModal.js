// Analysis Modal Component
// Handles analysis modal with draggable functionality

import { domElements } from '../core/domElements.js';
import { getIsDragging, setIsDragging, getDragState, updateDragState } from '../core/state.js';

export function initializeAnalysisModal() {
  const { analysisModal, analysisCloseBtn, iaaAnalysisBtn, analysisModalHeader } = domElements;
  
  // Open analysis modal
  iaaAnalysisBtn?.addEventListener('click', () => {
    analysisModal?.classList.remove('hidden');
  });
  
  // Close analysis modal
  analysisCloseBtn?.addEventListener('click', () => {
    analysisModal?.classList.add('hidden');
  });
  
  // Setup draggable functionality
  setupDraggable();
  
  // Setup resizable functionality
  setupResizable();
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
    const { analysisModal } = domElements;
    const dragState = getDragState();
    
    const currentX = e.clientX - dragState.initialX;
    const currentY = e.clientY - dragState.initialY;
    
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
