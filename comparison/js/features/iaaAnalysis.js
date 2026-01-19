// IAA (Inter-Annotator Agreement) Analysis Module
// Client-side label matching and highlighting based on position overlap

import { getDocumentA, getDocumentB } from '../core/state.js';

/**
 * Extract all labels from a document with their position information
 * @param {HTMLElement} container - The container with rendered HTML
 * @param {string} docId - Document identifier ('a' or 'b')
 * @returns {Array} Array of label objects with position data
 */
export function extractLabelsWithPositions(container, docId) {
  const labels = [];
  const labelElements = container.querySelectorAll('manual_label, auto_label');
  
  labelElements.forEach((labelElement, index) => {
    // Get the bounding rectangle relative to the container
    const containerRect = container.getBoundingClientRect();
    const labelRect = labelElement.getBoundingClientRect();
    
    // Calculate relative position
    const relativeTop = labelRect.top - containerRect.top + container.scrollTop;
    const relativeLeft = labelRect.left - containerRect.left + container.scrollLeft;
    
    // Extract label attributes
    const labelType = labelElement.getAttribute('label') || '';
    const text = labelElement.textContent || '';
    
    // Get all attributes as parameters
    const params = {};
    for (let attr of labelElement.attributes) {
      if (attr.name !== 'label') {
        params[attr.name] = attr.value;
      }
    }
    
    labels.push({
      id: `${docId}_${index}`,
      docId: docId,
      index: index,
      type: labelType,
      text: text,
      params: params,
      element: labelElement,
      position: {
        top: relativeTop,
        left: relativeLeft,
        width: labelRect.width,
        height: labelRect.height,
        bottom: relativeTop + labelRect.height,
        right: relativeLeft + labelRect.width
      }
    });
  });
  
  return labels;
}

/**
 * Calculate overlap between two label positions
 * @param {Object} pos1 - First label position
 * @param {Object} pos2 - Second label position
 * @returns {number} Overlap ratio (0 to 1)
 */
function calculateOverlap(pos1, pos2) {
  // Calculate intersection area
  const xOverlap = Math.max(0, Math.min(pos1.right, pos2.right) - Math.max(pos1.left, pos2.left));
  const yOverlap = Math.max(0, Math.min(pos1.bottom, pos2.bottom) - Math.max(pos1.top, pos2.top));
  const intersectionArea = xOverlap * yOverlap;
  
  // Calculate union area
  const area1 = pos1.width * pos1.height;
  const area2 = pos2.width * pos2.height;
  const unionArea = area1 + area2 - intersectionArea;
  
  // Return IoU (Intersection over Union)
  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

/**
 * Check if two positions are exactly the same
 * @param {Object} pos1 - First label position
 * @param {Object} pos2 - Second label position
 * @param {number} tolerance - Pixel tolerance for "exact" match
 * @returns {boolean} True if positions match exactly
 */
function arePositionsExact(pos1, pos2, tolerance = 5) {
  return (
    Math.abs(pos1.top - pos2.top) <= tolerance &&
    Math.abs(pos1.left - pos2.left) <= tolerance &&
    Math.abs(pos1.width - pos2.width) <= tolerance &&
    Math.abs(pos1.height - pos2.height) <= tolerance
  );
}

/**
 * Compare attributes between two labels
 * @param {Object} labelA - First label
 * @param {Object} labelB - Second label
 * @returns {boolean} True if all attributes match
 */
function compareAttributes(labelA, labelB) {
  // Compare label type/name
  if (labelA.type !== labelB.type) {
    return false;
  }
  
  // Get all parameter keys from both labels
  const keysA = Object.keys(labelA.params);
  const keysB = Object.keys(labelB.params);
  
  // Check if they have the same number of parameters
  if (keysA.length !== keysB.length) {
    return false;
  }
  
  // Check if all keys exist in both and have the same values
  for (let key of keysA) {
    if (!keysB.includes(key) || labelA.params[key] !== labelB.params[key]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Match labels between two documents based on position overlap
 * @param {Array} labelsA - Labels from document A
 * @param {Array} labelsB - Labels from document B
 * @param {number} minOverlap - Minimum overlap ratio for partial match (default: 0.3)
 * @returns {Object} Matching results
 */
export function matchLabelsByPosition(labelsA, labelsB, minOverlap = 0.3) {
  const matches = [];
  const matchedBIndices = new Set();
  
  // For each label in document A, find the best match in document B
  labelsA.forEach(labelA => {
    let bestMatch = null;
    let bestOverlap = 0;
    let bestMatchIndex = -1;
    
    labelsB.forEach((labelB, indexB) => {
      // Skip if this label B is already matched
      if (matchedBIndices.has(indexB)) return;
      
      // Calculate overlap
      const overlap = calculateOverlap(labelA.position, labelB.position);
      
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestMatch = labelB;
        bestMatchIndex = indexB;
      }
    });
    
    // Determine match type
    let matchType = 'no-match';
    if (bestMatch && bestOverlap >= minOverlap) {
      // Check if positions are exact
      if (arePositionsExact(labelA.position, bestMatch.position)) {
        // Exact position match - now check attributes
        if (compareAttributes(labelA, bestMatch)) {
          matchType = 'exact'; // Green: exact position + same attributes
        } else {
          matchType = 'overlap'; // Orange: exact position but different attributes
        }
      } else {
        // Approximate/partial position match
        matchType = 'no-match'; // Red: approximate match
      }
      
      // Mark this labelB as matched
      matchedBIndices.add(bestMatchIndex);
      
      matches.push({
        labelA: labelA,
        labelB: bestMatch,
        matchType: matchType,
        overlap: bestOverlap,
        attributesMatch: matchType === 'exact'
      });
    } else {
      // No match found
      matches.push({
        labelA: labelA,
        labelB: null,
        matchType: 'no-match',
        overlap: 0,
        attributesMatch: false
      });
    }
  });
  ,
        attributesMatch: false
  // Add unmatched labels from document B
  labelsB.forEach((labelB, indexB) => {
    if (!matchedBIndices.has(indexB)) {
      matches.push({
        labelA: null,
        labelB: labelB,
        matchType: 'no-match',
        overlap: 0
      });
    }
  });
  
  return {
    matches: matches,
    summary: {
      totalA: labelsA.length,
      totalB: labelsB.length,
      exactMatches: matches.filter(m => m.matchType === 'exact').length,
      overlapMatches: matches.filter(m => m.matchType === 'overlap').length,
      noMatches: matches.filter(m => m.matchType === 'no-match').length
    }
  };
}

/**
 * Apply visual highlighting to matched labels
 * @param {Object} matchResults - Results from matchLabelsByPosition
 */
export function applyMatchHighlighting(matchResults) {
  if (!matchResults || !matchResults.matches) return;
  
  // Clear any existing highlights
  clearMatchHighlighting();
  
  matchResults.matches.forEach(match => {
    // Highlight label A
    if (match.labelA && match.labelA.element) {
      applyHighlightToElement(match.labelA.element, match.matchType);
    }
    
    // Highlight label B
    if (match.labelB && match.labelB.element) {
      applyHighlightToElement(match.labelB.element, match.matchType);
    }
  });
}

/**
 * Apply highlight styling to a single element
 * @param {HTMLElement} element - The label element to highlight
 * @param {string} matchType - 'exact', 'overlap', or 'no-match'
 */
function applyHighlightToElement(element, matchType) {
  // Add data attribute for match type
  element.setAttribute('data-iaa-match', matchType);
  
  // Apply color based on match type
  let highlightColor, textColor;
  switch (matchType) {
    case 'exact':
      highlightColor = 'rgba(34, 197, 94, 0.3)'; // Green
      textColor = '#22c55e';
      break;
    case 'overlap':
      highlightColor = 'rgba(249, 115, 22, 0.3)'; // Orange
      textColor = '#f97316';
      break;
    case 'no-match':
      highlightColor = 'rgba(239, 68, 68, 0.3)'; // Red
      textColor = '#ef4444';
      break;
    default:
      highlightColor = 'transparent';
      textColor = 'inherit';
  }
  
  // Apply as box-shadow for overlay effect
  element.style.boxShadow = `0 0 0 3px ${highlightColor}`;
  element.style.backgroundColor = highlightColor;
  element.style.color = textColor;
  element.style.fontWeight = 'bold';
  element.style.borderRadius = '3px';
  element.style.padding = '2px 4px';
  element.style.position = 'relative';
  element.style.zIndex = '10';
}

/**
 * Clear all IAA match highlighting
 */
export function clearMatchHighlighting() {
  const allContainers = [
    document.getElementById('html-content-a'),
    document.getElementById('html-content-b')
  ];
  
  allContainers.forEach(container => {
    if (!container) return;
    
    const highlightedLabels = container.querySelectorAll('[data-iaa-match]');
    highlightedLabels.forEach(element => {
      element.removeAttribute('data-iaa-match');
      element.style.boxShadow = '';
      element.style.backgroundColor = '';
      element.style.color = '';
      element.style.fontWeight = '';
      element.style.borderRadius = '';
      element.style.padding = '';
      element.style.position = '';
      element.style.zIndex = '';
    });
  });
}

/**
 * Run complete IAA analysis
 * @returns {Object} Analysis results with matches and summary
 */
export async function runIAAAnalysis() {
  const docA = getDocumentA();
  const docB = getDocumentB();
  
  if (!docA || !docB) {
    throw new Error('Both documents must be loaded for IAA analysis');
  }
  
  // Get HTML content containers
  const containerA = document.getElementById('html-content-a');
  const containerB = document.getElementById('html-content-b');
  
  if (!containerA || !containerB) {
    throw new Error('Document containers not found');
  }
  
  // Extract labels with positions
  const labelsA = extractLabelsWithPositions(containerA, 'a');
  const labelsB = extractLabelsWithPositions(containerB, 'b');
  
  console.log(`Extracted ${labelsA.length} labels from Document A`);
  console.log(`Extracted ${labelsB.length} labels from Document B`);
  
  // Match labels based on position
  const matchResults = matchLabelsByPosition(labelsA, labelsB, 0.3);
  
  // Apply visual highlighting
  applyMatchHighlighting(matchResults);
  
  return {
    labelsA: labelsA,
    labelsB: labelsB,
    matchResults: matchResults,
    timestamp: new Date().toISOString()
  };
}
