// Application State Management
// Centralized state for the comparison tool

let documentA = null;
let documentB = null;
let comparisonResults = null;
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
