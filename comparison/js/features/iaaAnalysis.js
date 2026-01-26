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
    
    // Extract label type - prefer labelname over label attribute
    const labelType = labelElement.getAttribute('labelname') || 
                      labelElement.getAttribute('label') || '';
    const text = labelElement.textContent || '';
    
    // Get all attributes as parameters
    const params = {};
    for (let attr of labelElement.attributes) {
      params[attr.name] = attr.value;
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
 * Normalize text for comparison (remove extra whitespace, standardize formatting)
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')        // Replace multiple spaces/newlines with single space
    .replace(/\u00A0/g, ' ')     // Replace non-breaking spaces
    .trim()                       // Remove leading/trailing whitespace
    .toLowerCase();               // Case-insensitive comparison
}

/**
 * Extract the label name from labelname or label attribute
 * @param {Object} params - Label parameters object
 * @returns {string} Label name
 */
function getLabelName(params) {
  return params.labelname || params.label || '';
}

/**
 * Check if two labels have the same label hierarchy (considering parent attribute)
 * @param {Object} labelA - First label
 * @param {Object} labelB - Second label
 * @returns {boolean} True if label hierarchy matches
 */
function labelHierarchyMatches(labelA, labelB) {
  const nameA = getLabelName(labelA.params);
  const nameB = getLabelName(labelB.params);
  
  if (nameA !== nameB) return false;
  
  // Also check parent if it exists
  const parentA = labelA.params.parent || '';
  const parentB = labelB.params.parent || '';
  
  return parentA === parentB;
}

/**
 * Compare label attributes, with special handling for groupID attributes
 * @param {Object} labelA - First label
 * @param {Object} labelB - Second label
 * @param {boolean} strictMode - If true, all params must match; if false, only key params
 * @returns {Object} Match result with type and details
 */
function compareAttributesDetailed(labelA, labelB, strictMode = false) {
  // First check if label names match
  if (!labelHierarchyMatches(labelA, labelB)) {
    return { matches: false, type: 'different-label' };
  }
  
  // Get parameters, excluding style/class/presentation attributes
  const ignoredAttrs = ['style', 'class', 'labelname', 'label', 'parent'];
  const paramsA = Object.keys(labelA.params).filter(k => !ignoredAttrs.includes(k));
  const paramsB = Object.keys(labelB.params).filter(k => !ignoredAttrs.includes(k));
  
  if (strictMode) {
    // Strict: all parameters must match exactly
    if (paramsA.length !== paramsB.length) {
      return { matches: false, type: 'different-params' };
    }
    
    for (let key of paramsA) {
      if (!paramsB.includes(key) || labelA.params[key] !== labelB.params[key]) {
        return { matches: false, type: 'different-params' };
      }
    }
    
    return { matches: true, type: 'exact' };
  } else {
    // Lenient: key parameters should match, but extra params are ok
    const keyParams = ['docid', 'fragmentid', 'titletype', 'uri', 'non_standard'];
    
    for (let key of keyParams) {
      const hasA = paramsA.includes(key);
      const hasB = paramsB.includes(key);
      
      // If both have this key, values must match
      if (hasA && hasB && labelA.params[key] !== labelB.params[key]) {
        return { matches: false, type: 'different-key-params' };
      }
    }
    
    return { matches: true, type: 'lenient' };
  }
}

/**
 * Calculate text similarity using longest common subsequence ratio
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity ratio (0 to 1)
 */
function calculateTextSimilarity(text1, text2) {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;
  
  // Simple character-based similarity
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;
  
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  // Calculate overlap ratio
  let matchCount = 0;
  const shorterLen = shorter.length;
  const longerLen = longer.length;
  
  for (let i = 0; i < shorterLen; i++) {
    if (longer.includes(shorter[i])) {
      matchCount++;
    }
  }
  
  return matchCount / longerLen;
}

/**
 * Match labels based on text content similarity
 * @param {Array} labelsA - Labels from document A
 * @param {Array} labelsB - Labels from document B
 * @param {number} minSimilarity - Minimum text similarity for match (default: 0.9)
 * @param {boolean} strictParams - If true, require exact parameter match
 * @returns {Object} Matching results
 */
function matchLabelsByText(labelsA, labelsB, minSimilarity = 0.9, strictParams = false) {
  const matches = [];
  const matchedBIndices = new Set();
  
  // For each label in document A, find the best text-based match in document B
  labelsA.forEach(labelA => {
    let bestMatch = null;
    let bestSimilarity = 0;
    let bestMatchIndex = -1;
    let bestAttrResult = null;
    
    labelsB.forEach((labelB, indexB) => {
      // Skip if this label B is already matched
      if (matchedBIndices.has(indexB)) return;
      
      // Calculate text similarity
      const textSimilarity = calculateTextSimilarity(labelA.text, labelB.text);
      
      if (textSimilarity >= minSimilarity && textSimilarity > bestSimilarity) {
        // Check if label names match
        const attrResult = compareAttributesDetailed(labelA, labelB, strictParams);
        
        if (attrResult.matches || textSimilarity === 1.0) {
          bestSimilarity = textSimilarity;
          bestMatch = labelB;
          bestMatchIndex = indexB;
          bestAttrResult = attrResult;
        }
      }
    });
    
    // Determine match type based on text + attributes
    let matchType = 'no-match';
    if (bestMatch) {
      // Mark this labelB as matched
      matchedBIndices.add(bestMatchIndex);
      
      // Exact text match + exact attributes = exact match
      if (bestSimilarity === 1.0 && bestAttrResult.type === 'exact') {
        matchType = 'exact';
      } 
      // Close text match or lenient attribute match = overlap
      else if (bestSimilarity >= minSimilarity || bestAttrResult.type === 'lenient') {
        matchType = 'overlap';
      } else {
        matchType = 'no-match';
      }
      
      matches.push({
        labelA: labelA,
        labelB: bestMatch,
        matchType: matchType,
        textSimilarity: bestSimilarity,
        attributesMatch: bestAttrResult.type === 'exact',
        matchMethod: 'text'
      });
    } else {
      // No text-based match found
      matches.push({
        labelA: labelA,
        labelB: null,
        matchType: 'no-match',
        textSimilarity: 0,
        attributesMatch: false,
        matchMethod: 'none'
      });
    }
  });
  
  // Add unmatched labels from document B
  labelsB.forEach((labelB, indexB) => {
    if (!matchedBIndices.has(indexB)) {
      matches.push({
        labelA: null,
        labelB: labelB,
        matchType: 'no-match',
        textSimilarity: 0,
        attributesMatch: false,
        matchMethod: 'none'
      });
    }
  });
  
  return matches;
}

/**
 * Match labels using hybrid approach: text first, then position fallback
 * @param {Array} labelsA - Labels from document A
 * @param {Array} labelsB - Labels from document B
 * @param {Object} options - Matching options
 * @returns {Object} Matching results
 */
export function matchLabelsHybrid(labelsA, labelsB, options = {}) {
  const {
    textSimilarityThreshold = 0.85,
    positionOverlapThreshold = 0.3,
    strictParams = false,
    preferTextMatching = true
  } = options;
  
  console.log(`Starting hybrid matching with ${labelsA.length} labels from A and ${labelsB.length} labels from B`);
  
  // First attempt: text-based matching
  const textMatches = matchLabelsByText(labelsA, labelsB, textSimilarityThreshold, strictParams);
  
  // Separate matched and unmatched labels
  const matchedAIndices = new Set();
  const matchedBIndices = new Set();
  const finalMatches = [];
  
  textMatches.forEach((match, idx) => {
    if (match.matchType !== 'no-match' && match.labelA && match.labelB) {
      finalMatches.push(match);
      matchedAIndices.add(labelsA.indexOf(match.labelA));
      matchedBIndices.add(labelsB.indexOf(match.labelB));
    }
  });
  
  console.log(`Text matching found ${finalMatches.length} matches`);
  
  // Second attempt: position-based matching for unmatched labels
  if (!preferTextMatching || finalMatches.length < Math.min(labelsA.length, labelsB.length) * 0.5) {
    const unmatchedA = labelsA.filter((_, idx) => !matchedAIndices.has(idx));
    const unmatchedB = labelsB.filter((_, idx) => !matchedBIndices.has(idx));
    
    console.log(`Attempting position matching for ${unmatchedA.length} unmatched A and ${unmatchedB.length} unmatched B`);
    
    unmatchedA.forEach(labelA => {
      let bestMatch = null;
      let bestOverlap = 0;
      let bestMatchB = null;
      
      unmatchedB.forEach(labelB => {
        const overlap = calculateOverlap(labelA.position, labelB.position);
        
        if (overlap >= positionOverlapThreshold && overlap > bestOverlap) {
          // Check if label names at least match
          if (labelHierarchyMatches(labelA, labelB)) {
            bestOverlap = overlap;
            bestMatchB = labelB;
          }
        }
      });
      
      if (bestMatchB) {
        const attrResult = compareAttributesDetailed(labelA, bestMatchB, strictParams);
        const matchType = attrResult.matches ? 
          (arePositionsExact(labelA.position, bestMatchB.position) ? 'exact' : 'overlap') : 
          'overlap';
        
        finalMatches.push({
          labelA: labelA,
          labelB: bestMatchB,
          matchType: matchType,
          overlap: bestOverlap,
          attributesMatch: attrResult.matches,
          matchMethod: 'position'
        });
        
        // Remove from unmatched
        const bIndex = unmatchedB.indexOf(bestMatchB);
        if (bIndex > -1) {
          unmatchedB.splice(bIndex, 1);
        }
      }
    });
    
    console.log(`Position matching added ${finalMatches.length - matchedAIndices.size} additional matches`);
  }
  
  // Add all unmatched labels
  textMatches.forEach(match => {
    if (match.matchType === 'no-match') {
      if (match.labelA && !Array.from(finalMatches).find(m => m.labelA === match.labelA)) {
        finalMatches.push(match);
      }
      if (match.labelB && !Array.from(finalMatches).find(m => m.labelB === match.labelB)) {
        finalMatches.push(match);
      }
    }
  });
  
  return {
    matches: finalMatches,
    summary: {
      totalA: labelsA.length,
      totalB: labelsB.length,
      exactMatches: finalMatches.filter(m => m.matchType === 'exact').length,
      overlapMatches: finalMatches.filter(m => m.matchType === 'overlap').length,
      noMatches: finalMatches.filter(m => m.matchType === 'no-match').length,
      textBasedMatches: finalMatches.filter(m => m.matchMethod === 'text').length,
      positionBasedMatches: finalMatches.filter(m => m.matchMethod === 'position').length
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
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis results with matches and summary
 */
export async function runIAAAnalysis(options = {}) {
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
  
  // Use hybrid matching (text-based with position fallback)
  const matchingOptions = {
    textSimilarityThreshold: options.textSimilarityThreshold || 0.85,
    positionOverlapThreshold: options.positionOverlapThreshold || 0.3,
    strictParams: options.strictParams || false,
    preferTextMatching: options.preferTextMatching !== false
  };
  
  const matchResults = matchLabelsHybrid(labelsA, labelsB, matchingOptions);
  
  console.log('Match Results Summary:', matchResults.summary);
  
  // Apply visual highlighting
  applyMatchHighlighting(matchResults);
  
  return {
    labelsA: labelsA,
    labelsB: labelsB,
    matchResults: matchResults,
    options: matchingOptions,
    timestamp: new Date().toISOString()
  };
}
