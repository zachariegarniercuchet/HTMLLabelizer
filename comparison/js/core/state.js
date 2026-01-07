// Application State Management
// Centralized state for the comparison tool

let documentA = null;
let documentB = null;
let comparisonResults = null;
let cachedIAAResults = null;
let currentTheme = 'dark';
let isDragging = false;
let dragState = {
  currentX: 0,
  currentY: 0,
  initialX: 0,
  initialY: 0,
  xOffset: 0,
  yOffset: 0
};

// Document A State
export function getDocumentA() {
  return documentA;
}

export function setDocumentA(doc) {
  documentA = doc;
}

// Document B State
export function getDocumentB() {
  return documentB;
}

export function setDocumentB(doc) {
  documentB = doc;
}

// Get all loaded files for IAA analysis
export function getLoadedFiles() {
  const files = [];
  if (documentA && documentA.path) {
    files.push({ name: documentA.name || 'Document A', path: documentA.path });
  }
  if (documentB && documentB.path) {
    files.push({ name: documentB.name || 'Document B', path: documentB.path });
  }
  return files;
}

// Comparison Results State
export function getComparisonResults() {
  return comparisonResults;
}

export function setComparisonResults(results) {
  comparisonResults = results;
}

// Theme State
export function getCurrentTheme() {
  return currentTheme;
}

export function setCurrentTheme(theme) {
  currentTheme = theme;
}

// Dragging State
export function getIsDragging() {
  return isDragging;
}

export function setIsDragging(value) {
  isDragging = value;
}

export function getDragState() {
  return dragState;
}

export function updateDragState(updates) {
  dragState = { ...dragState, ...updates };
}

export function resetDragState() {
  dragState = {
    currentX: 0,
    currentY: 0,
    initialX: 0,
    initialY: 0,
    xOffset: 0,
    yOffset: 0
  };
}

// Cached IAA Results State
export function getCachedIAAResults() {
  return cachedIAAResults;
}

export function setCachedIAAResults(results) {
  cachedIAAResults = results;
}

export function clearCachedIAAResults() {
  cachedIAAResults = null;
}
