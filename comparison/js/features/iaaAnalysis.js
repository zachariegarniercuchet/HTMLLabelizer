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
  
  // Token-based similarity: split on non-alphanumeric characters
  const tokens1 = norm1.split(/[^a-z0-9]+/).filter(t => t.length > 0);
  const tokens2 = norm2.split(/[^a-z0-9]+/).filter(t => t.length > 0);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;
  
  // Count matching tokens (exact matches)
  let exactMatches = 0;
  const used = new Set();
  
  for (const t1 of tokens1) {
    for (let i = 0; i < tokens2.length; i++) {
      if (!used.has(i) && t1 === tokens2[i]) {
        exactMatches++;
        used.add(i);
        break;
      }
    }
  }
  
  // Calculate Jaccard similarity on tokens
  const allTokens = new Set([...tokens1, ...tokens2]);
  const intersection = exactMatches;
  const union = allTokens.size;
  
  return union > 0 ? intersection / union : 0.0;
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

// ===== CO-REFERENCE / CLUSTER ANALYSIS =====

/**
 * Extract label tree schema from HTML document
 * @param {Document} doc - Parsed HTML document
 * @returns {Object|null} Label tree schema or null if not found
 */
function extractLabelTreeSchema(doc) {
  const comments = doc.querySelectorAll('comment');
  
  // Also check comment nodes directly
  const iterator = doc.createNodeIterator(doc, NodeFilter.SHOW_COMMENT);
  let commentNode;
  
  while (commentNode = iterator.nextNode()) {
    const commentText = commentNode.textContent.trim();
    if (commentText.includes('HTMLLabelizer') || commentText.includes('labeltree')) {
      try {
        const jsonMatch = commentText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const schema = JSON.parse(jsonMatch[0]);
          if (schema.labeltree) {
            return schema.labeltree;
          }
        }
      } catch (e) {
        console.error('Error parsing label tree schema:', e);
      }
    }
  }
  
  return null;
}

/**
 * Extract groupID attribute names from label tree schema
 * @param {Object} labelTree - Label tree schema object
 * @returns {Map} Map of label name -> array of groupID attribute names
 */
function extractGroupIdAttributesFromSchema(labelTree) {
  const groupIdMap = new Map(); // labelName -> [attributeName1, attributeName2, ...]
  
  function processLabel(labelName, labelDef) {
    const groupIdAttrs = [];
    
    if (labelDef.attributes) {
      for (const [attrName, attrDef] of Object.entries(labelDef.attributes)) {
        if (attrDef.groupRole === 'groupID') {
          groupIdAttrs.push(attrName);
        }
      }
    }
    
    if (groupIdAttrs.length > 0) {
      groupIdMap.set(labelName, groupIdAttrs);
    }
    
    // Process sublabels recursively
    if (labelDef.sublabels) {
      for (const [sublabelName, sublabelDef] of Object.entries(labelDef.sublabels)) {
        processLabel(sublabelName, sublabelDef);
      }
    }
  }
  
  for (const [labelName, labelDef] of Object.entries(labelTree)) {
    processLabel(labelName, labelDef);
  }
  
  return groupIdMap;
}

/**
 * Compare two label tree schemas for equality
 * @param {Object} schemaA - Schema from document A
 * @param {Object} schemaB - Schema from document B
 * @returns {Object} Comparison result with match status and differences
 */
function compareLabelTreeSchemas(schemaA, schemaB) {
  const differences = [];
  
  function compareObjects(objA, objB, path = '') {
    const keysA = Object.keys(objA || {});
    const keysB = Object.keys(objB || {});
    
    // Check for missing keys
    for (const key of keysA) {
      if (!(key in objB)) {
        differences.push(`${path}.${key} exists in A but not in B`);
      }
    }
    
    for (const key of keysB) {
      if (!(key in objA)) {
        differences.push(`${path}.${key} exists in B but not in A`);
      }
    }
    
    // Compare common keys (only structure, not colors or display properties)
    const commonKeys = keysA.filter(k => keysB.includes(k));
    for (const key of commonKeys) {
      // Skip visual properties
      if (key === 'color') continue;
      
      const valA = objA[key];
      const valB = objB[key];
      
      if (typeof valA === 'object' && typeof valB === 'object' && valA !== null && valB !== null) {
        compareObjects(valA, valB, `${path}.${key}`);
      }
    }
  }
  
  compareObjects(schemaA, schemaB, 'labeltree');
  
  return {
    matches: differences.length === 0,
    differences: differences
  };
}

/**
 * Extract groupID from label parameters using schema
 * @param {Object} label - Label object with params
 * @param {Map} groupIdMap - Map of label names to groupID attribute names
 * @returns {string|null} GroupID or null if not found
 */
function getGroupId(label, groupIdMap) {
  if (!label || !label.params) return null;
  
  // Get label name
  const labelName = label.params.labelname || label.params.label || '';
  if (!labelName) return null;
  
  // Check if this label type has groupID attributes
  const groupIdAttrs = groupIdMap.get(labelName);
  if (!groupIdAttrs || groupIdAttrs.length === 0) return null;
  
  // Try each groupID attribute in order
  for (const attrName of groupIdAttrs) {
    const value = label.params[attrName];
    if (value && value.trim() !== '') {
      return value.trim();
    }
  }
  
  return null;
}

/**
 * Build clusters from labels based on groupID attribute
 * @param {Array} labels - Array of label objects
 * @param {string} docId - Document identifier
 * @param {Map} groupIdMap - Map of label names to groupID attribute names from schema
 * @returns {Object} Cluster information
 */
function extractClusters(labels, docId, groupIdMap) {
  const clusters = new Map(); // groupId -> array of label indices
  const labelToCluster = new Map(); // label index -> groupId
  
  labels.forEach((label, index) => {
    const groupId = getGroupId(label, groupIdMap);
    
    if (groupId) {
      if (!clusters.has(groupId)) {
        clusters.set(groupId, []);
      }
      clusters.get(groupId).push(index);
      labelToCluster.set(index, groupId);
    }
  });
  
  return {
    clusters: clusters,
    labelToCluster: labelToCluster,
    clusterCount: clusters.size,
    clusteredLabelCount: labelToCluster.size,
    totalLabelCount: labels.length
  };
}

/**
 * Analyze co-reference clusters across matched labels
 * @param {Array} matches - Array of match objects from matching algorithm
 * @param {Array} labelsA - Labels from document A
 * @param {Array} labelsB - Labels from document B
 * @param {Map} groupIdMap - Map of label names to groupID attribute names from schema
 * @returns {Object} Co-reference analysis results
 */
export function analyzeCoReferenceClusters(matches, labelsA, labelsB, groupIdMap) {
  // Check if we have groupID attributes defined in schema
  if (!groupIdMap || groupIdMap.size === 0) {
    return {
      hasGrouping: false,
      message: 'No groupID attributes defined in label tree schema'
    };
  }
  
  // Extract clusters from both documents
  const clustersA = extractClusters(labelsA, 'A', groupIdMap);
  const clustersB = extractClusters(labelsB, 'B', groupIdMap);
  
  console.log(`Document A: ${clustersA.clusterCount} clusters, ${clustersA.clusteredLabelCount}/${clustersA.totalLabelCount} labels in clusters`);
  console.log(`Document B: ${clustersB.clusterCount} clusters, ${clustersB.clusteredLabelCount}/${clustersB.totalLabelCount} labels in clusters`);
  
  // Get all cluster names (groupIDs)
  const clusterNamesA = Array.from(clustersA.clusters.keys());
  const clusterNamesB = Array.from(clustersB.clusters.keys());
  
  // Match clusters using two-step process:
  // 1. String similarity between groupID names
  // 2. Tie-breaking using label overlap
  
  const clusterCorrespondences = [];
  const matchedBClusters = new Set();
  
  // For each cluster in A, find best match in B
  clusterNamesA.forEach(groupIdA => {
    const labelsInClusterA = clustersA.clusters.get(groupIdA);
    
    let bestMatches = []; // Array of {groupIdB, similarity, labelOverlap}
    let bestSimilarity = 0;
    
    // Step 1: Find clusters in B with best string similarity
    clusterNamesB.forEach(groupIdB => {
      if (matchedBClusters.has(groupIdB)) return; // Already matched
      
      const similarity = calculateTextSimilarity(groupIdA, groupIdB);
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatches = [{ groupIdB, similarity }];
      } else if (similarity === bestSimilarity && similarity > 0) {
        bestMatches.push({ groupIdB, similarity });
      }
    });
    
    // Step 2: If we have ties, use label overlap to break them
    if (bestMatches.length > 1) {
      bestMatches.forEach(match => {
        const labelsInClusterB = clustersB.clusters.get(match.groupIdB);
        
        // Count how many matched labels these clusters share
        let sharedMatchedLabels = 0;
        labelsInClusterA.forEach(indexA => {
          const labelA = labelsA[indexA];
          labelsInClusterB.forEach(indexB => {
            const labelB = labelsB[indexB];
            // Check if these labels are matched
            const isMatched = matches.some(m => 
              m.labelA === labelA && 
              m.labelB === labelB && 
              m.matchType !== 'no-match'
            );
            if (isMatched) sharedMatchedLabels++;
          });
        });
        
        match.labelOverlap = sharedMatchedLabels;
      });
      
      // Sort by label overlap (descending), then take the best
      bestMatches.sort((a, b) => b.labelOverlap - a.labelOverlap);
    } else if (bestMatches.length === 1) {
      // Calculate label overlap even for single match
      const labelsInClusterB = clustersB.clusters.get(bestMatches[0].groupIdB);
      let sharedMatchedLabels = 0;
      labelsInClusterA.forEach(indexA => {
        const labelA = labelsA[indexA];
        labelsInClusterB.forEach(indexB => {
          const labelB = labelsB[indexB];
          const isMatched = matches.some(m => 
            m.labelA === labelA && 
            m.labelB === labelB && 
            m.matchType !== 'no-match'
          );
          if (isMatched) sharedMatchedLabels++;
        });
      });
      bestMatches[0].labelOverlap = sharedMatchedLabels;
    }
    
    // Take the best match (no threshold - always match to closest cluster)
    if (bestMatches.length > 0) {
      const bestMatch = bestMatches[0];
      const groupIdB = bestMatch.groupIdB;
      const labelsInClusterB = clustersB.clusters.get(groupIdB);
      
      // Calculate metrics
      const crossMatches = bestMatch.labelOverlap || 0;
      const sizeA = labelsInClusterA.length;
      const sizeB = labelsInClusterB.length;
      
      // Count how many labels from each cluster are matched (to any label)
      const matchedInA = labelsInClusterA.filter(indexA => {
        const labelA = labelsA[indexA];
        return matches.some(m => m.labelA === labelA && m.matchType !== 'no-match');
      }).length;
      
      const matchedInB = labelsInClusterB.filter(indexB => {
        const labelB = labelsB[indexB];
        return matches.some(m => m.labelB === labelB && m.matchType !== 'no-match');
      }).length;
      
      const precision = matchedInA > 0 ? crossMatches / matchedInA : 0;
      const recall = matchedInB > 0 ? crossMatches / matchedInB : 0;
      const f1Score = (precision + recall) > 0 ? 
        (2 * precision * recall) / (precision + recall) : 0;
      
      clusterCorrespondences.push({
        groupIdA: groupIdA,
        groupIdB: groupIdB,
        sizeA: sizeA,
        sizeB: sizeB,
        matchedInA: matchedInA,
        matchedInB: matchedInB,
        crossMatches: crossMatches,
        nameSimilarity: bestSimilarity,
        precision: precision,
        recall: recall,
        f1Score: f1Score,
        matchMethod: bestMatches.length > 1 ? 'name+overlap' : 'name'
      });
      
      matchedBClusters.add(groupIdB);
    }
  });
  
  // Sort by F1 score descending
  clusterCorrespondences.sort((a, b) => b.f1Score - a.f1Score);
  
  // Calculate overall metrics
  const avgF1 = clusterCorrespondences.length > 0 ?
    clusterCorrespondences.reduce((sum, c) => sum + c.f1Score, 0) / clusterCorrespondences.length : 0;
  const avgNameSimilarity = clusterCorrespondences.length > 0 ?
    clusterCorrespondences.reduce((sum, c) => sum + c.nameSimilarity, 0) / clusterCorrespondences.length : 0;
  
  // Find unmatched clusters
  const unmatchedClustersA = clusterNamesA
    .filter(name => !clusterCorrespondences.some(c => c.groupIdA === name))
    .map(name => ({
      groupId: name,
      size: clustersA.clusters.get(name).length,
      doc: 'A'
    }));
  
  const unmatchedClustersB = clusterNamesB
    .filter(name => !matchedBClusters.has(name))
    .map(name => ({
      groupId: name,
      size: clustersB.clusters.get(name).length,
      doc: 'B'
    }));
  
  return {
    hasGrouping: true,
    clustersA: clustersA,
    clustersB: clustersB,
    correspondences: clusterCorrespondences,
    unmatchedClustersA: unmatchedClustersA,
    unmatchedClustersB: unmatchedClustersB,
    summary: {
      totalClustersA: clustersA.clusterCount,
      totalClustersB: clustersB.clusterCount,
      mappedClustersA: clusterCorrespondences.length,
      mappedClustersB: matchedBClusters.size,
      totalCorrespondences: clusterCorrespondences.length,
      avgF1Score: avgF1,
      avgNameSimilarity: avgNameSimilarity,
      clusterCoverageA: clustersA.clusterCount > 0 ? 
        (clusterCorrespondences.length / clustersA.clusterCount) : 0,
      clusterCoverageB: clustersB.clusterCount > 0 ? 
        (matchedBClusters.size / clustersB.clusterCount) : 0
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
  
  // Parse HTML to extract label tree schemas
  const parserA = new DOMParser();
  const parserB = new DOMParser();
  const parsedDocA = parserA.parseFromString(docA.htmlContent, 'text/html');
  const parsedDocB = parserB.parseFromString(docB.htmlContent, 'text/html');
  
  const schemaA = extractLabelTreeSchema(parsedDocA);
  const schemaB = extractLabelTreeSchema(parsedDocB);
  
  // Validate that both documents have label tree schemas
  if (!schemaA || !schemaB) {
    throw new Error('Both documents must have HTMLLabelizer label tree schema. Cannot compare documents without schemas.');
  }
  
  // Compare schemas - they must match
  const schemaComparison = compareLabelTreeSchemas(schemaA, schemaB);
  if (!schemaComparison.matches) {
    const diffMessage = schemaComparison.differences.slice(0, 5).join('\n  • ');
    const moreCount = schemaComparison.differences.length > 5 ? `\n  ... and ${schemaComparison.differences.length - 5} more differences` : '';
    throw new Error(`Cannot compare documents with different label tree schemas.\n\nDifferences found:\n  • ${diffMessage}${moreCount}`);
  }
  
  console.log('✓ Label tree schemas match');
  
  // Extract groupID attributes from schema
  const groupIdMap = extractGroupIdAttributesFromSchema(schemaA);
  console.log(`Found ${groupIdMap.size} label types with groupID attributes:`, 
    Array.from(groupIdMap.entries()).map(([label, attrs]) => `${label}: [${attrs.join(', ')}]`).join(', '));
  
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
  
  // Perform co-reference cluster analysis (using schema-based groupID attributes)
  const coRefAnalysis = analyzeCoReferenceClusters(matchResults.matches, labelsA, labelsB, groupIdMap);
  
  if (coRefAnalysis.hasGrouping === false) {
    console.log('⚠ No co-reference analysis: ' + coRefAnalysis.message);
  } else {
    console.log('Co-Reference Analysis Summary:', coRefAnalysis.summary);
  }
  
  // Apply visual highlighting
  applyMatchHighlighting(matchResults);
  
  return {
    labelsA: labelsA,
    labelsB: labelsB,
    matchResults: matchResults,
    coRefAnalysis: coRefAnalysis,
    schemaValidation: {
      validated: true,
      schemasMatch: true
    },
    options: matchingOptions,
    timestamp: new Date().toISOString()
  };
}
