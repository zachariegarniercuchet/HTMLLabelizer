// HTML Labelizer Comparison Tool - Bundled JavaScript
// 100% Client-Side Version (No Server Required)

(function() {
  'use strict';

  // ======================
  // STATE MANAGEMENT
  // ======================
  
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
  
  // State getters and setters
  function getDocumentA() { return documentA; }
  function setDocumentA(doc) { documentA = doc; }
  function getDocumentB() { return documentB; }
  function setDocumentB(doc) { documentB = doc; }
  function getComparisonResults() { return comparisonResults; }
  function setComparisonResults(results) { comparisonResults = results; }
  function getCurrentTheme() { return currentTheme; }
  function setCurrentTheme(theme) { currentTheme = theme; }
  function getIsDragging() { return isDragging; }
  function setIsDragging(value) { isDragging = value; }
  function getDragState() { return dragState; }
  function updateDragState(updates) { dragState = { ...dragState, ...updates }; }
  function resetDragState() {
    dragState = { currentX: 0, currentY: 0, initialX: 0, initialY: 0, xOffset: 0, yOffset: 0 };
  }
  function getCachedIAAResults() { return cachedIAAResults; }
  function setCachedIAAResults(results) { cachedIAAResults = results; }
  function clearCachedIAAResults() { cachedIAAResults = null; }
  
  // ======================
  // DOM ELEMENTS
  // ======================
  
  const domElements = {
    // Settings Modal
    settingsModal: null,
    settingsBtn: null,
    settingsCloseBtn: null,
    settingsOverlay: null,
    
    // Theme & Display Controls
    themeToggle: null,
    contrastSlider: null,
    backgroundSlider: null,
    contrastPreview: null,
    backgroundPreview: null,
    resetSettingsBtn: null,
    
    // Analysis Modal
    analysisModal: null,
    analysisCloseBtn: null,
    analysisModalHeader: null,
    analysisDetails: null,
    
    // Action Buttons
    clearAllBtn: null,
    iaaAnalysisBtn: null,
    
    // Document A Elements
    htmlContentA: null,
    filenameA: null,
    dropZoneA: null,
    uploadLinkA: null,
    sourceViewA: null,
    viewToggleA: null,
    statsBtnA: null,
    statsContentA: null,
    
    // Document B Elements
    htmlContentB: null,
    filenameB: null,
    dropZoneB: null,
    uploadLinkB: null,
    sourceViewB: null,
    viewToggleB: null,
    statsBtnB: null,
    statsContentB: null,
    
    // Statistics Elements
    agreementScore: null,
    totalLabelsA: null,
    totalLabelsB: null,
    commonLabels: null
  };
  
  function initializeDOMElements() {
    domElements.settingsModal = document.getElementById('settings-modal');
    domElements.settingsBtn = document.getElementById('settings-btn');
    domElements.settingsCloseBtn = document.getElementById('settings-close-btn');
    domElements.settingsOverlay = document.getElementById('settings-overlay');
    domElements.themeToggle = document.getElementById('theme-toggle');
    domElements.contrastSlider = document.getElementById('contrast-slider');
    domElements.backgroundSlider = document.getElementById('background-slider');
    domElements.contrastPreview = document.getElementById('contrast-preview');
    domElements.backgroundPreview = document.getElementById('background-preview');
    domElements.resetSettingsBtn = document.getElementById('reset-settings');
    domElements.analysisModal = document.getElementById('analysis-modal');
    domElements.analysisCloseBtn = document.getElementById('analysis-close-btn');
    domElements.analysisModalHeader = document.getElementById('analysis-modal-header');
    domElements.analysisDetails = document.getElementById('analysis-details');
    domElements.clearAllBtn = document.getElementById('clear-all');
    domElements.iaaAnalysisBtn = document.getElementById('iaa-analysis-btn');
    domElements.htmlContentA = document.getElementById('html-content-a');
    domElements.filenameA = document.getElementById('filename-a');
    domElements.dropZoneA = document.getElementById('drop-zone-a');
    domElements.uploadLinkA = document.getElementById('upload-link-a');
    domElements.sourceViewA = document.getElementById('source-view-a');
    domElements.viewToggleA = document.getElementById('view-toggle-a');
    domElements.statsBtnA = document.getElementById('stats-btn-a');
    domElements.statsContentA = document.getElementById('stats-content-a');
    domElements.htmlContentB = document.getElementById('html-content-b');
    domElements.filenameB = document.getElementById('filename-b');
    domElements.dropZoneB = document.getElementById('drop-zone-b');
    domElements.uploadLinkB = document.getElementById('upload-link-b');
    domElements.sourceViewB = document.getElementById('source-view-b');
    domElements.viewToggleB = document.getElementById('view-toggle-b');
    domElements.statsBtnB = document.getElementById('stats-btn-b');
    domElements.statsContentB = document.getElementById('stats-content-b');
    domElements.agreementScore = document.getElementById('agreement-score');
    domElements.totalLabelsA = document.getElementById('total-labels-a');
    domElements.totalLabelsB = document.getElementById('total-labels-b');
    domElements.commonLabels = document.getElementById('common-labels');
  }
  
  // ======================
  // STORAGE UTILITIES
  // ======================
  
  function saveTheme(theme) { localStorage.setItem('theme', theme); }
  function loadTheme() { return localStorage.getItem('theme') || 'light'; }
  function saveContrast(value) { localStorage.setItem('contrast', value); }
  function loadContrast() { return localStorage.getItem('contrast') || '100'; }
  function saveBackgroundWarmth(value) { localStorage.setItem('backgroundWarmth', value); }
  function loadBackgroundWarmth() { return localStorage.getItem('backgroundWarmth') || '50'; }
  function resetAllSettings() {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('contrast', '100');
    localStorage.setItem('backgroundWarmth', '50');
  }
  
  // ======================
  // FILE LOADER UTILITIES
  // ======================
  
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }
  
  function isHtmlFile(file) {
    return file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm');
  }
  
  async function processFiles(files) {
    const results = [];
    for (const file of files) {
      if (isHtmlFile(file)) {
        try {
          const content = await readFileAsText(file);
          results.push({ file: file, content: content, name: file.name });
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error);
        }
      }
    }
    return results;
  }
  
  // ======================
  // HTML PROCESSOR
  // ======================
  
  function extractExistingLabels(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT, null);
    let commentNode;
    while (walker.nextNode()) {
      commentNode = walker.currentNode;
      const text = commentNode.nodeValue.trim();
      if (text.startsWith("HTMLLabelizer")) {
        const jsonStr = text.substring("HTMLLabelizer".length).trim();
        try {
          const schemaWrapper = JSON.parse(jsonStr);
          return schemaWrapper;
        } catch (e) {
          console.error('Failed to parse schema from comment:', e);
          return null;
        }
      }
    }
    return null;
  }
  
  function buildLabelsFromSchema(schema, parent = null, map = new Map()) {
    if (!schema || typeof schema !== "object") return map;
    
    Object.entries(schema).forEach(([name, def]) => {
      const paramsMap = new Map();
      let groupConfig = null;
      let groupIdAttribute = null;
      const groupAttributes = new Map();
      
      if (def.attributes && typeof def.attributes === "object") {
        Object.entries(def.attributes).forEach(([pname, pdef]) => {
          const { groupRole, ...paramDef } = pdef;
          if (groupRole === "groupID") {
            groupIdAttribute = pname;
            paramsMap.set(pname, paramDef);
          } else if (groupRole === "groupAttribute") {
            groupAttributes.set(pname, paramDef);
          } else {
            paramsMap.set(pname, paramDef);
          }
        });
      }
      
      if (groupIdAttribute) {
        groupConfig = { groupIdAttribute: groupIdAttribute, groupAttributes: groupAttributes };
      }
      
      const labelObj = {
        name,
        color: def.color || '#3498db',
        type: "structured",
        params: paramsMap,
        sublabels: new Map(),
        parent,
        groupConfig
      };
      
      map.set(name, labelObj);
      
      if (def.sublabels && Object.keys(def.sublabels).length > 0) {
        buildLabelsFromSchema(def.sublabels, name, labelObj.sublabels);
      }
    });
    
    return map;
  }
  
  function getHtmlStatistics(htmlContent) {
    const manualLabels = htmlContent.querySelectorAll('manual_label');
    const autoLabels = htmlContent.querySelectorAll('auto_label');
    return {
      totalMentions: manualLabels.length + autoLabels.length,
      manualLabels: manualLabels.length,
      autoLabels: autoLabels.length
    };
  }
  
  function getContrastColor(hexcolor) {
    const r = parseInt(hexcolor.slice(1,3), 16);
    const g = parseInt(hexcolor.slice(3,5), 16);
    const b = parseInt(hexcolor.slice(5,7), 16);
    const brightness = (r*299 + g*587 + b*114) / 1000;
    return brightness > 155 ? '#000000' : '#FFFFFF';
  }
  
  function getLabelByPath(path, labels) {
    let current = labels;
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      const label = current.get(segment);
      if (!label) return null;
      if (i === path.length - 1) return label;
      current = label.sublabels;
    }
    return null;
  }
  
  function attachReadOnlyLabelEventListeners(container, labels) {
    const labelElements = container.querySelectorAll('manual_label, auto_label');
    
    labelElements.forEach(labelElement => {
      const labelName = labelElement.getAttribute('labelName') || labelElement.getAttribute('data-label');
      const parent = labelElement.getAttribute('parent') || labelElement.getAttribute('data-parent') || '';
      
      let labelData = null;
      if (labelName) {
        const path = parent ? [parent, labelName] : [labelName];
        labelData = getLabelByPath(path, labels);
        
        if (labelData) {
          const bgColor = labelData.color || '#3498db';
          const textColor = getContrastColor(bgColor);
          labelElement.style.backgroundColor = bgColor;
          labelElement.style.color = textColor;
        }
      }
      
      labelElement.onclick = (e) => {
        const sel = window.getSelection();
        if (!sel.isCollapsed) return;
        e.stopPropagation();
        showParameterMenu(labelElement, labels, e.clientX, e.clientY);
      };
    });
  }
  
  // ======================
  // PARAMETER MENU
  // ======================
  
  function makeDraggable(element, handle) {
    let isDragging = false;
    let hasMoved = false;
    let currentX, currentY, initialX, initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    handle.addEventListener('mousedown', dragStart);
    
    function dragStart(e) {
      const rect = element.getBoundingClientRect();
      xOffset = rect.left;
      yOffset = rect.top;
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      if (e.target === handle) {
        isDragging = true;
        hasMoved = false;
        handle.style.cursor = 'grabbing';
      }
    }
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        hasMoved = true;
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        const rect = element.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));
        element.style.left = currentX + 'px';
        element.style.top = currentY + 'px';
      }
    }
    
    function dragEnd() {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      handle.style.cursor = 'grab';
      if (hasMoved) {
        const firstInput = element.querySelector('input, select');
        if (firstInput) firstInput.focus();
      }
    }
    
    handle.style.cursor = 'grab';
  }
  
  function showParameterMenu(labelElement, labels, x, y) {
    hideParameterMenu();
    
    const labelName = labelElement.getAttribute("labelName");
    const parent = labelElement.getAttribute("parent") || "";
    if (!labelName) return;
    
    const path = parent ? [parent, labelName] : [labelName];
    const labelData = getLabelByPath(path, labels);
    if (!labelData || labelData.params.size === 0) return;
    
    const paramMenu = document.createElement('div');
    paramMenu.id = 'param-menu';
    paramMenu.className = 'param-menu';
    
    const title = document.createElement('h4');
    title.textContent = `View Parameters - ${labelName}`;
    title.style.color = labelData.color || 'var(--accent)';
    paramMenu.appendChild(title);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'param-close-btn';
    closeBtn.textContent = '×';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      hideParameterMenu();
    };
    paramMenu.appendChild(closeBtn);
    
    const groupAttributeNames = new Set();
    if (labelData.groupConfig && labelData.groupConfig.groupAttributes) {
      labelData.groupConfig.groupAttributes.forEach((value, name) => {
        groupAttributeNames.add(name);
      });
    }
    
    const form = document.createElement('div');
    form.className = 'param-form';
    
    labelData.params.forEach((paramDef, paramName) => {
      if (groupAttributeNames.has(paramName)) return;
      
      const paramRow = document.createElement("div");
      paramRow.className = "param-row";
      
      const label = document.createElement("label");
      label.textContent = paramName + ":";
      
      const isGroupId = labelData.groupConfig && labelData.groupConfig.groupIdAttribute === paramName;
      if (isGroupId) label.classList.add("gold-label");
      
      const currentValue = labelElement.getAttribute(paramName) || "";
      
      const valueDisplay = document.createElement("div");
      valueDisplay.style.flex = "1";
      valueDisplay.style.background = "var(--bg)";
      valueDisplay.style.color = "var(--text)";
      valueDisplay.style.border = "1px solid var(--hover)";
      valueDisplay.style.padding = "8px 10px";
      valueDisplay.style.borderRadius = "6px";
      valueDisplay.style.fontSize = "13px";
      valueDisplay.style.wordBreak = "break-word";
      valueDisplay.textContent = currentValue || "(empty)";
      
      paramRow.appendChild(label);
      paramRow.appendChild(valueDisplay);
      form.appendChild(paramRow);
    });
    
    paramMenu.appendChild(form);
    
    const menuWidth = 250;
    const menuHeight = 200;
    x = Math.min(x, window.innerWidth - menuWidth - 10);
    y = Math.min(y, window.innerHeight - menuHeight - 10);
    paramMenu.style.left = `${x}px`;
    paramMenu.style.top = `${y}px`;
    
    document.body.appendChild(paramMenu);
    makeDraggable(paramMenu, title);
    
    setTimeout(() => {
      const outsideClickHandler = (e) => {
        if (!paramMenu.contains(e.target)) {
          hideParameterMenu();
          document.removeEventListener('mousedown', outsideClickHandler);
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          hideParameterMenu();
          document.removeEventListener('mousedown', outsideClickHandler);
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('mousedown', outsideClickHandler);
      document.addEventListener('keydown', escapeHandler);
    }, 10);
  }
  
  function hideParameterMenu() {
    const existing = document.getElementById('param-menu');
    if (existing) existing.remove();
  }
  
  // ======================
  // SETTINGS MODAL
  // ======================
  
  function initializeSettingsModal() {
    domElements.settingsBtn?.addEventListener('click', () => {
      domElements.settingsModal?.classList.remove('hidden');
    });
    domElements.settingsCloseBtn?.addEventListener('click', () => {
      domElements.settingsModal?.classList.add('hidden');
    });
    domElements.settingsOverlay?.addEventListener('click', () => {
      domElements.settingsModal?.classList.add('hidden');
    });
  }
  
  // ======================
  // ANALYSIS MODAL
  // ======================
  
  function initializeAnalysisModal() {
    domElements.iaaAnalysisBtn?.addEventListener('click', async () => {
      domElements.analysisModal?.classList.remove('hidden');
      await runIAAAnalysis();
    });
    
    domElements.analysisCloseBtn?.addEventListener('click', () => {
      domElements.analysisModal?.classList.add('hidden');
    });
  }
  
  // ===== IAA ANALYSIS FUNCTIONS (Client-Side) =====
  
  function extractLabelsWithPositions(container, docId) {
    const labels = [];
    const labelElements = container.querySelectorAll('manual_label, auto_label');
    
    labelElements.forEach((labelElement, index) => {
      const containerRect = container.getBoundingClientRect();
      const labelRect = labelElement.getBoundingClientRect();
      
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
  
  function calculateOverlap(pos1, pos2) {
    const xOverlap = Math.max(0, Math.min(pos1.right, pos2.right) - Math.max(pos1.left, pos2.left));
    const yOverlap = Math.max(0, Math.min(pos1.bottom, pos2.bottom) - Math.max(pos1.top, pos2.top));
    const intersectionArea = xOverlap * yOverlap;
    
    const area1 = pos1.width * pos1.height;
    const area2 = pos2.width * pos2.height;
    const unionArea = area1 + area2 - intersectionArea;
    
    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }
  
  function arePositionsExact(pos1, pos2, tolerance = 5) {
    return (
      Math.abs(pos1.top - pos2.top) <= tolerance &&
      Math.abs(pos1.left - pos2.left) <= tolerance &&
      Math.abs(pos1.width - pos2.width) <= tolerance &&
      Math.abs(pos1.height - pos2.height) <= tolerance
    );
  }
  
  // ===== NEW TEXT-BASED MATCHING FUNCTIONS =====
  
  function normalizeText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/\u00A0/g, ' ')
      .trim()
      .toLowerCase();
  }
  
  function getLabelName(params) {
    return params.labelname || params.label || '';
  }
  
  function labelHierarchyMatches(labelA, labelB) {
    const nameA = getLabelName(labelA.params);
    const nameB = getLabelName(labelB.params);
    
    if (nameA !== nameB) return false;
    
    const parentA = labelA.params.parent || '';
    const parentB = labelB.params.parent || '';
    
    return parentA === parentB;
  }
  
  function compareAttributesDetailed(labelA, labelB, strictMode = false) {
    if (!labelHierarchyMatches(labelA, labelB)) {
      return { matches: false, type: 'different-label' };
    }
    
    const ignoredAttrs = ['style', 'class', 'labelname', 'label', 'parent', 'verified'];
    const paramsA = Object.keys(labelA.params).filter(k => !ignoredAttrs.includes(k));
    const paramsB = Object.keys(labelB.params).filter(k => !ignoredAttrs.includes(k));
    
    if (strictMode) {
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
      // Lenient mode: check all non-ignored attributes match
      // Get union of all attribute keys
      const allKeys = new Set([...paramsA, ...paramsB]);
      
      for (let key of allKeys) {
        const valueA = labelA.params[key];
        const valueB = labelB.params[key];
        
        // If attribute exists in both, values must match
        if (valueA !== undefined && valueB !== undefined) {
          if (valueA !== valueB) {
            return { matches: false, type: 'different-values' };
          }
        }
        // If attribute exists in only one document, it's still a mismatch
        else if (valueA !== undefined || valueB !== undefined) {
          return { matches: false, type: 'different-attrs' };
        }
      }
      
      return { matches: true, type: 'lenient' };
    }
  }
  
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
  
  function matchLabelsByText(labelsA, labelsB, minSimilarity = 0.9, strictParams = false) {
    const matches = [];
    const matchedBIndices = new Set();
    
    labelsA.forEach(labelA => {
      let bestMatch = null;
      let bestSimilarity = 0;
      let bestMatchIndex = -1;
      let bestAttrResult = null;
      
      labelsB.forEach((labelB, indexB) => {
        if (matchedBIndices.has(indexB)) return;
        
        const textSimilarity = calculateTextSimilarity(labelA.text, labelB.text);
        
        if (textSimilarity >= minSimilarity && textSimilarity > bestSimilarity) {
          const attrResult = compareAttributesDetailed(labelA, labelB, strictParams);
          
          if (attrResult.matches || textSimilarity === 1.0) {
            bestSimilarity = textSimilarity;
            bestMatch = labelB;
            bestMatchIndex = indexB;
            bestAttrResult = attrResult;
          }
        }
      });
      
      let matchType = 'no-match';
      if (bestMatch) {
        matchedBIndices.add(bestMatchIndex);
        
        // Exact match: perfect text similarity AND all attributes match
        if (bestSimilarity === 1.0 && bestAttrResult.matches) {
          matchType = 'exact';
        } else if (bestSimilarity >= minSimilarity) {
          matchType = 'overlap';
        } else {
          matchType = 'no-match';
        }
        
        matches.push({
          labelA: labelA,
          labelB: bestMatch,
          matchType: matchType,
          textSimilarity: bestSimilarity,
          attributesMatch: bestAttrResult.matches,
          matchMethod: 'text'
        });
      } else {
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
  
  function compareAttributes(labelA, labelB) {
    // Legacy function - kept for compatibility
    const result = compareAttributesDetailed(labelA, labelB, true);
    return result.matches;
  }
  
  
  function matchLabelsHybrid(labelsA, labelsB, options = {}) {
    const {
      textSimilarityThreshold = 0.85,
      positionOverlapThreshold = 0.3,
      strictParams = false,
      preferTextMatching = true
    } = options;
    
    console.log(`Starting hybrid matching with ${labelsA.length} labels from A and ${labelsB.length} labels from B`);
    
    const textMatches = matchLabelsByText(labelsA, labelsB, textSimilarityThreshold, strictParams);
    
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
          
          const bIndex = unmatchedB.indexOf(bestMatchB);
          if (bIndex > -1) {
            unmatchedB.splice(bIndex, 1);
          }
        }
      });
      
      console.log(`Position matching added ${finalMatches.length - matchedAIndices.size} additional matches`);
    }
    
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
  
  function matchLabelsByPosition(labelsA, labelsB, minOverlap = 0.3) {
    const matches = [];
    const matchedBIndices = new Set();
    
    labelsA.forEach(labelA => {
      let bestMatch = null;
      let bestOverlap = 0;
      let bestMatchIndex = -1;
      
      labelsB.forEach((labelB, indexB) => {
        if (matchedBIndices.has(indexB)) return;
        
        const overlap = calculateOverlap(labelA.position, labelB.position);
        
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestMatch = labelB;
          bestMatchIndex = indexB;
        }
      });
      
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
        
        matchedBIndices.add(bestMatchIndex);
        
        matches.push({
          labelA: labelA,
          labelB: bestMatch,
          matchType: matchType,
          overlap: bestOverlap,
          attributesMatch: matchType === 'exact'
        });
      } else {
        matches.push({
          labelA: labelA,
          labelB: null,
          matchType: 'no-match',
          overlap: 0,
          attributesMatch: false
        });
      }
    });
    
    labelsB.forEach((labelB, indexB) => {
      if (!matchedBIndices.has(indexB)) {
        matches.push({
          labelA: null,
          labelB: labelB,
          matchType: 'no-match',
          overlap: 0,
          attributesMatch: false
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
  
  function applyMatchHighlighting(matchResults) {
    if (!matchResults || !matchResults.matches) return;
    
    clearMatchHighlighting();
    
    matchResults.matches.forEach(match => {
      if (match.labelA && match.labelA.element) {
        applyHighlightToElement(match.labelA.element, match.matchType);
      }
      
      if (match.labelB && match.labelB.element) {
        applyHighlightToElement(match.labelB.element, match.matchType);
      }
    });
  }
  
  function extractLabelTreeSchema(doc) {
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
  
  function extractGroupIdAttributesFromSchema(labelTree) {
    const groupIdMap = new Map();
    
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
   * Extract all valid attributes for each label from the schema
   * Returns Map of labelName -> array of valid attribute names
   */
  function extractValidAttributesFromSchema(labelTree) {
    const attributeMap = new Map();
    
    function processLabel(labelName, labelDef) {
      const validAttrs = [];
      
      if (labelDef.attributes) {
        for (const [attrName, attrDef] of Object.entries(labelDef.attributes)) {
          validAttrs.push(attrName);
        }
      }
      
      if (validAttrs.length > 0) {
        attributeMap.set(labelName, validAttrs);
      }
      
      if (labelDef.sublabels) {
        for (const [sublabelName, sublabelDef] of Object.entries(labelDef.sublabels)) {
          processLabel(sublabelName, sublabelDef);
        }
      }
    }
    
    for (const [labelName, labelDef] of Object.entries(labelTree)) {
      processLabel(labelName, labelDef);
    }
    
    return attributeMap;
  }
  
  function compareLabelTreeSchemas(schemaA, schemaB) {
    const differences = [];
    
    function compareObjects(objA, objB, path = '') {
      const keysA = Object.keys(objA || {});
      const keysB = Object.keys(objB || {});
      
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
      
      const commonKeys = keysA.filter(k => keysB.includes(k));
      for (const key of commonKeys) {
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
  
  function getGroupId(label, groupIdMap) {
    if (!label || !label.params) return null;
    
    const labelName = label.params.labelname || label.params.label || '';
    if (!labelName) return null;
    
    const groupIdAttrs = groupIdMap.get(labelName);
    if (!groupIdAttrs || groupIdAttrs.length === 0) return null;
    
    for (const attrName of groupIdAttrs) {
      const value = label.params[attrName];
      if (value && value.trim() !== '') {
        return value.trim();
      }
    }
    
    return null;
  }
  
  function extractClusters(labels, docId, groupIdMap) {
    const clusters = new Map();
    const labelToCluster = new Map();
    
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
  
  function analyzeCoReferenceClusters(matches, labelsA, labelsB, groupIdMap) {
    if (!groupIdMap || groupIdMap.size === 0) {
      return {
        hasGrouping: false,
        message: 'No groupID attributes defined in label tree schema'
      };
    }
    
    const clustersA = extractClusters(labelsA, 'A', groupIdMap);
    const clustersB = extractClusters(labelsB, 'B', groupIdMap);
    
    console.log(`Document A: ${clustersA.clusterCount} clusters, ${clustersA.clusteredLabelCount}/${clustersA.totalLabelCount} labels in clusters`);
    console.log(`Document B: ${clustersB.clusterCount} clusters, ${clustersB.clusteredLabelCount}/${clustersB.totalLabelCount} labels in clusters`);
    
    const clusterNamesA = Array.from(clustersA.clusters.keys());
    const clusterNamesB = Array.from(clustersB.clusters.keys());
    
    const clusterCorrespondences = [];
    const matchedBClusters = new Set();
    
    clusterNamesA.forEach(groupIdA => {
      const labelsInClusterA = clustersA.clusters.get(groupIdA);
      
      let bestMatches = [];
      let bestSimilarity = 0;
      
      clusterNamesB.forEach(groupIdB => {
        if (matchedBClusters.has(groupIdB)) return;
        
        const similarity = calculateTextSimilarity(groupIdA, groupIdB);
        
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatches = [{ groupIdB, similarity }];
        } else if (similarity === bestSimilarity && similarity > 0) {
          bestMatches.push({ groupIdB, similarity });
        }
      });
      
      if (bestMatches.length > 1) {
        bestMatches.forEach(match => {
          const labelsInClusterB = clustersB.clusters.get(match.groupIdB);
          
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
          
          match.labelOverlap = sharedMatchedLabels;
        });
        
        bestMatches.sort((a, b) => b.labelOverlap - a.labelOverlap);
      } else if (bestMatches.length === 1) {
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
      
      if (bestMatches.length > 0) {
        const bestMatch = bestMatches[0];
        const groupIdB = bestMatch.groupIdB;
        const labelsInClusterB = clustersB.clusters.get(groupIdB);
        
        const crossMatches = bestMatch.labelOverlap || 0;
        const sizeA = labelsInClusterA.length;
        const sizeB = labelsInClusterB.length;
        
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
    
    clusterCorrespondences.sort((a, b) => b.f1Score - a.f1Score);
    
    const avgF1 = clusterCorrespondences.length > 0 ?
      clusterCorrespondences.reduce((sum, c) => sum + c.f1Score, 0) / clusterCorrespondences.length : 0;
    const avgNameSimilarity = clusterCorrespondences.length > 0 ?
      clusterCorrespondences.reduce((sum, c) => sum + c.nameSimilarity, 0) / clusterCorrespondences.length : 0;
    
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
  
  function applyHighlightToElement(element, matchType) {
    // Save original styles before applying highlights (only if not already saved)
    if (!element.hasAttribute('data-iaa-match')) {
      element.setAttribute('data-original-boxShadow', element.style.boxShadow || '');
      element.setAttribute('data-original-backgroundColor', element.style.backgroundColor || '');
      element.setAttribute('data-original-color', element.style.color || '');
      element.setAttribute('data-original-fontWeight', element.style.fontWeight || '');
      element.setAttribute('data-original-borderRadius', element.style.borderRadius || '');
      element.setAttribute('data-original-padding', element.style.padding || '');
      element.setAttribute('data-original-position', element.style.position || '');
      element.setAttribute('data-original-zIndex', element.style.zIndex || '');
    }
    
    element.setAttribute('data-iaa-match', matchType);
    
    let highlightColor, textColor;
    switch (matchType) {
      case 'exact':
        highlightColor = 'rgba(34, 197, 94, 0.3)';
        textColor = '#22c55e';
        break;
      case 'overlap':
        highlightColor = 'rgba(249, 115, 22, 0.3)';
        textColor = '#f97316';
        break;
      case 'no-match':
        highlightColor = 'rgba(239, 68, 68, 0.3)';
        textColor = '#ef4444';
        break;
      default:
        highlightColor = 'transparent';
        textColor = 'inherit';
    }
    
    element.style.boxShadow = `0 0 0 3px ${highlightColor}`;
    element.style.backgroundColor = highlightColor;
    element.style.color = textColor;
    element.style.fontWeight = 'bold';
    element.style.borderRadius = '3px';
    element.style.padding = '2px 4px';
    element.style.position = 'relative';
    element.style.zIndex = '10';
  }
  
  function clearMatchHighlighting() {
    const allContainers = [
      document.getElementById('html-content-a'),
      document.getElementById('html-content-b')
    ];
    
    allContainers.forEach(container => {
      if (!container) return;
      
      const highlightedLabels = container.querySelectorAll('[data-iaa-match]');
      highlightedLabels.forEach(element => {
        // Restore original styles
        element.style.boxShadow = element.getAttribute('data-original-boxShadow') || '';
        element.style.backgroundColor = element.getAttribute('data-original-backgroundColor') || '';
        element.style.color = element.getAttribute('data-original-color') || '';
        element.style.fontWeight = element.getAttribute('data-original-fontWeight') || '';
        element.style.borderRadius = element.getAttribute('data-original-borderRadius') || '';
        element.style.padding = element.getAttribute('data-original-padding') || '';
        element.style.position = element.getAttribute('data-original-position') || '';
        element.style.zIndex = element.getAttribute('data-original-zIndex') || '';
        
        // Remove all data attributes
        element.removeAttribute('data-iaa-match');
        element.removeAttribute('data-original-boxShadow');
        element.removeAttribute('data-original-backgroundColor');
        element.removeAttribute('data-original-color');
        element.removeAttribute('data-original-fontWeight');
        element.removeAttribute('data-original-borderRadius');
        element.removeAttribute('data-original-padding');
        element.removeAttribute('data-original-position');
        element.removeAttribute('data-original-zIndex');
      });
    });
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
    
    // Check if we have cached results
    const cachedResults = getCachedIAAResults();
    if (cachedResults) {
      console.log('[IAA] Using cached results from:', cachedResults.timestamp);
      
      // Show brief loading message for cached results
      modalBody.innerHTML = `
        <div class="iaa-loading">
          <div class="spinner"></div>
          <p>Loading cached results...</p>
        </div>
        <div class="resize-handle" id="resize-handle"></div>
      `;
      
      // Use setTimeout to allow the UI to update before rendering
      setTimeout(() => {
        displayIAAResults(cachedResults, modalBody);
      }, 100);
      
      return;
    }
    
    // Show loading state for new computation
    modalBody.innerHTML = `
      <div class="iaa-loading">
        <div class="spinner"></div>
        <p>Analyzing inter-annotator agreement...</p>
        <p style="font-size: 12px; color: var(--sub); margin-top: 8px;">This may take a moment for large documents</p>
      </div>
      <div class="resize-handle" id="resize-handle"></div>
    `;
    
    // Use setTimeout to allow the loading UI to render before heavy computation
    setTimeout(async () => {
      try {
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
      
      // Extract valid attributes from schema for comparison
      const validAttributesMap = extractValidAttributesFromSchema(schemaA);
      console.log(`Found ${validAttributesMap.size} label types with attributes:`, 
        Array.from(validAttributesMap.entries()).map(([label, attrs]) => `${label}: [${attrs.join(', ')}]`).join(', '));
      
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
        textSimilarityThreshold: 0.85,
        positionOverlapThreshold: 0.3,
        strictParams: false,
        preferTextMatching: true
      };
      
      const matchResults = matchLabelsHybrid(labelsA, labelsB, matchingOptions);
      
      console.log('Match Results Summary:', matchResults.summary);
      
      const results = {
        labelsA: labelsA,
        labelsB: labelsB,
        matchResults: matchResults,
        validAttributesMap: validAttributesMap,
        timestamp: new Date().toISOString()
      };
      
      // Cache the results
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
          </div>
          <div class="resize-handle" id="resize-handle"></div>
        `;
      }
    }, 50); // Small delay to allow loading UI to render
  }
  
  /**
   * Generate per-label breakdown table
   */
  function generateLabelBreakdownTable(results) {
    const labelsA = results.labelsA || [];
    const labelsB = results.labelsB || [];
    const matches = results.matchResults.matches.filter(m => m.labelA && m.labelB);
    
    const labelStats = new Map();
    
    // Count labels in DocA
    labelsA.forEach(label => {
      const labelName = label.type || 'Unknown';
      const parent = label.params.parent || null;
      const key = parent ? `${parent}>${labelName}` : labelName;
      
      if (!labelStats.has(key)) {
        labelStats.set(key, {
          labelName: labelName,
          parent: parent,
          countA: 0,
          countB: 0,
          matches: 0,
          isParent: !parent
        });
      }
      labelStats.get(key).countA++;
    });
    
    // Count labels in DocB
    labelsB.forEach(label => {
      const labelName = label.type || 'Unknown';
      const parent = label.params.parent || null;
      const key = parent ? `${parent}>${labelName}` : labelName;
      
      if (!labelStats.has(key)) {
        labelStats.set(key, {
          labelName: labelName,
          parent: parent,
          countA: 0,
          countB: 0,
          matches: 0,
          isParent: !parent
        });
      }
      labelStats.get(key).countB++;
    });
    
    // Count matches
    matches.forEach(match => {
      const labelName = match.labelA.type || 'Unknown';
      const parent = match.labelA.params.parent || null;
      const key = parent ? `${parent}>${labelName}` : labelName;
      
      if (labelStats.has(key)) {
        labelStats.get(key).matches++;
      }
    });
    
    // Calculate F1 for each label
    const breakdown = [];
    labelStats.forEach((stats, key) => {
      const precision = stats.countA > 0 ? stats.matches / stats.countA : 0;
      const recall = stats.countB > 0 ? stats.matches / stats.countB : 0;
      const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      
      breakdown.push({
        ...stats,
        f1: f1
      });
    });
    
    // Sort to group parents with their sublabels
    breakdown.sort((a, b) => {
      // If both are parents, sort alphabetically
      if (a.isParent && b.isParent) {
        return a.labelName.localeCompare(b.labelName);
      }
      
      // If a is parent and b is sublabel
      if (a.isParent && !b.isParent) {
        // If b is a child of a, a comes first
        if (b.parent === a.labelName) return -1;
        // Otherwise compare a with b's parent
        return a.labelName.localeCompare(b.parent || '');
      }
      
      // If a is sublabel and b is parent
      if (!a.isParent && b.isParent) {
        // If a is a child of b, b comes first
        if (a.parent === b.labelName) return 1;
        // Otherwise compare a's parent with b
        return (a.parent || '').localeCompare(b.labelName);
      }
      
      // Both are sublabels - sort by parent first, then by label name
      if (a.parent === b.parent) {
        return a.labelName.localeCompare(b.labelName);
      }
      return (a.parent || '').localeCompare(b.parent || '');
    });
    
    const percentFormat = (num) => (num * 100).toFixed(1) + '%';
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    return `
      <div class="iaa-section">
        <h3>Per-Label Breakdown</h3>
        <div class="breakdown-table-container">
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>Label Name</th>
                <th>Doc A</th>
                <th>Doc B</th>
                <th>Matches</th>
                <th>F1 Score</th>
              </tr>
            </thead>
            <tbody>
              ${breakdown.map(stat => `
                <tr class="${stat.isParent ? 'parent-label' : 'sublabel'}">
                  <td class="label-name">
                    ${stat.isParent ? `<strong>${escapeHtml(stat.labelName)}</strong>` : `<span class="indent">↳ ${escapeHtml(stat.labelName)}</span>`}
                  </td>
                  <td class="count">${stat.countA}</td>
                  <td class="count">${stat.countB}</td>
                  <td class="count">${stat.matches}</td>
                  <td class="f1-cell">
                    <div class="f1-bar-container">
                      <div class="f1-bar" style="width: ${stat.f1 * 100}%"></div>
                      <span class="f1-text">${percentFormat(stat.f1)}</span>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  function displayIAAResults(results, container) {
    console.log('[IAA] Displaying results:', results);
    
    const matchResults = results.matchResults;
    const summary = matchResults.summary;
    
    // Calculate span-level F1 (based on exact position matches)
    const exactMatches = matchResults.matches.filter(m => m.labelA && m.labelB && 
      (m.matchType === 'exact' || m.matchType === 'overlap'));
    const tp = exactMatches.length;
    const fp = matchResults.matches.filter(m => m.labelA && !m.labelB).length;
    const fn = matchResults.matches.filter(m => !m.labelA && m.labelB).length;
    
    const precision = tp > 0 ? tp / (tp + fp) : 0;
    const recall = tp > 0 ? tp / (tp + fn) : 0;
    const f1_span = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    
    // Calculate attribute statistics (from matched spans only)
    const matchedPairs = matchResults.matches.filter(m => m.labelA && m.labelB);
    const matchedSpans = matchedPairs.length;
    
    // Will be calculated in generateAttributeBreakdownHTML and passed back
    let totalAttributesCompared = 0;
    let matchingAttributeValues = 0;
    
    let html = `
      <div class="iaa-section">
        <h3>Match Summary</h3>
        <div class="iaa-summary-grid">
          <div class="iaa-summary-card exact">
            <div class="iaa-summary-number">${summary.exactMatches}</div>
            <div class="iaa-summary-label">Perfect Match (Text + Attributes)</div>
            <div class="iaa-summary-color" style="background: #22c55e;"></div>
          </div>
          <div class="iaa-summary-card overlap">
            <div class="iaa-summary-number">${summary.overlapMatches}</div>
            <div class="iaa-summary-label">Partial Match (Text or Attributes Differ)</div>
            <div class="iaa-summary-color" style="background: #f97316;"></div>
          </div>
          <div class="iaa-summary-card no-match">
            <div class="iaa-summary-number">${summary.noMatches}</div>
            <div class="iaa-summary-label">No Match</div>
            <div class="iaa-summary-color" style="background: #ef4444;"></div>
          </div>
        </div>
        <div class="iaa-totals">
          <div>Document A: <strong>${summary.totalA}</strong> labels</div>
          <div>Document B: <strong>${summary.totalB}</strong> labels</div>
        </div>
      </div>
      
      <div class="iaa-section">
        <h3>Span-Level Agreement</h3>
        <div class="iaa-method">
          Measures agreement on label positions (exact position matches).
        </div>
        <div class="iaa-metrics">
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">F1 Score:</span>
            <span class="iaa-metric-value">${f1_span.toFixed(3)}</span>
          </div>
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">Precision:</span>
            <span class="iaa-metric-value">${precision.toFixed(3)}</span>
          </div>
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">Recall:</span>
            <span class="iaa-metric-value">${recall.toFixed(3)}</span>
          </div>
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">TP / FP / FN:</span>
            <span class="iaa-metric-value">${tp} / ${fp} / ${fn}</span>
          </div>
        </div>
        
        ${generateLabelBreakdownHTML(results)}
      </div>
      
      <div class="iaa-section">
        <h3>Attribute Agreement</h3>
        <div class="iaa-method">
          Among matched spans, measures agreement on label attributes.
        </div>
        <div class="iaa-metrics">
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">Matched Spans (from Level 1):</span>
            <span class="iaa-metric-value">${matchedSpans}</span>
          </div>
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">Total Attributes Compared:</span>
            <span class="iaa-metric-value" id="total-attrs-compared">-</span>
          </div>
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">Matching Attribute Values:</span>
            <span class="iaa-metric-value" id="matching-attr-values">-</span>
          </div>
        </div>
        
        ${generateAttributeBreakdownHTML(results)}
      </div>
    `;
    
    html += `<div class="resize-handle" id="resize-handle"></div>`;
    
    container.innerHTML = html;
  }
  
  /**
   * Generate HTML for per-label breakdown (used inline in Span-Level Agreement)
   */
  function generateLabelBreakdownHTML(results) {
    const labelsA = results.labelsA || [];
    const labelsB = results.labelsB || [];
    const matches = results.matchResults.matches.filter(m => m.labelA && m.labelB);
    
    const labelStats = new Map();
    
    // Count labels in DocA
    labelsA.forEach(label => {
      const labelName = label.type || 'Unknown';
      const parent = label.params.parent || null;
      const key = parent ? `${parent}>${labelName}` : labelName;
      
      if (!labelStats.has(key)) {
        labelStats.set(key, {
          labelName: labelName,
          parent: parent,
          countA: 0,
          countB: 0,
          matches: 0,
          isParent: !parent
        });
      }
      labelStats.get(key).countA++;
    });
    
    // Count labels in DocB
    labelsB.forEach(label => {
      const labelName = label.type || 'Unknown';
      const parent = label.params.parent || null;
      const key = parent ? `${parent}>${labelName}` : labelName;
      
      if (!labelStats.has(key)) {
        labelStats.set(key, {
          labelName: labelName,
          parent: parent,
          countA: 0,
          countB: 0,
          matches: 0,
          isParent: !parent
        });
      }
      labelStats.get(key).countB++;
    });
    
    // Count matches
    matches.forEach(match => {
      const labelName = match.labelA.type || 'Unknown';
      const parent = match.labelA.params.parent || null;
      const key = parent ? `${parent}>${labelName}` : labelName;
      
      if (labelStats.has(key)) {
        labelStats.get(key).matches++;
      }
    });
    
    // Calculate F1 for each label
    const breakdown = [];
    labelStats.forEach((stats, key) => {
      const precision = stats.countA > 0 ? stats.matches / stats.countA : 0;
      const recall = stats.countB > 0 ? stats.matches / stats.countB : 0;
      const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      
      breakdown.push({
        ...stats,
        f1: f1
      });
    });
    
    // Sort to group parents with their sublabels
    breakdown.sort((a, b) => {
      // If both are parents, sort alphabetically
      if (a.isParent && b.isParent) {
        return a.labelName.localeCompare(b.labelName);
      }
      
      // If a is parent and b is sublabel
      if (a.isParent && !b.isParent) {
        // If b is a child of a, a comes first
        if (b.parent === a.labelName) return -1;
        // Otherwise compare a with b's parent
        return a.labelName.localeCompare(b.parent || '');
      }
      
      // If a is sublabel and b is parent
      if (!a.isParent && b.isParent) {
        // If a is a child of b, b comes first
        if (a.parent === b.labelName) return 1;
        // Otherwise compare a's parent with b
        return (a.parent || '').localeCompare(b.labelName);
      }
      
      // Both are sublabels - sort by parent first, then by label name
      if (a.parent === b.parent) {
        return a.labelName.localeCompare(b.labelName);
      }
      return (a.parent || '').localeCompare(b.parent || '');
    });
    
    const percentFormat = (num) => (num * 100).toFixed(1) + '%';
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    return `
      <div style="margin-top: 20px;">
        <h4 style="color: var(--accent); font-size: 15px; margin-bottom: 12px; font-weight: 600;">Per-Label Breakdown</h4>
        <div class="breakdown-table-container">
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>Label Name</th>
                <th>Doc A</th>
                <th>Doc B</th>
                <th>Matches</th>
                <th>F1 Score</th>
              </tr>
            </thead>
            <tbody>
              ${breakdown.map(stat => `
                <tr class="${stat.isParent ? 'parent-label' : 'sublabel'}">
                  <td class="label-name">
                    ${stat.isParent ? `<strong>${escapeHtml(stat.labelName)}</strong>` : `<span class="indent">↳ ${escapeHtml(stat.labelName)}</span>`}
                  </td>
                  <td class="count">${stat.countA}</td>
                  <td class="count">${stat.countB}</td>
                  <td class="count">${stat.matches}</td>
                  <td class="count">${percentFormat(stat.f1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  /**
   * Generate HTML for per-attribute breakdown (used inline in Attribute Agreement)
   */
  function generateAttributeBreakdownHTML(results) {
    const matchedPairs = results.matchResults.matches.filter(m => m.labelA && m.labelB);
    const validAttributesMap = results.validAttributesMap || new Map();
    
    if (matchedPairs.length === 0) {
      return `<div style=\"margin-top: 20px; color: var(--sub); font-style: italic;\">No matched labels to compare attributes</div>`;
    }
    
    const ignoredAttrs = ['style', 'class', 'labelname', 'label', 'parent', 'verified'];
    const attributeStats = new Map();
    
    // Check if we have a schema to work with
    const hasSchema = validAttributesMap.size > 0;
    
    // Collect all attribute occurrences from matched pairs
    matchedPairs.forEach(match => {
      const labelA = match.labelA;
      const labelB = match.labelB;
      const labelName = labelA.type || 'Unknown';
      const parent = labelA.params.parent || null;
      const labelPath = parent ? `${parent}>${labelName}` : labelName;
      
      let validAttrs = [];
      
      if (hasSchema) {
        // If we have a schema, ONLY use attributes defined in schema
        validAttrs = validAttributesMap.get(labelName) || [];
      } else {
        // No schema: use all attributes except ignored ones
        const attrsA = Object.keys(labelA.params).filter(k => !ignoredAttrs.includes(k));
        const attrsB = Object.keys(labelB.params).filter(k => !ignoredAttrs.includes(k));
        validAttrs = [...new Set([...attrsA, ...attrsB])];
      }
      
      validAttrs.forEach(attrName => {
        // Skip if it's an ignored attribute
        if (ignoredAttrs.includes(attrName)) return;
        
        const key = `${labelPath}|${attrName}`;
        
        if (!attributeStats.has(key)) {
          attributeStats.set(key, {
            labelName: labelName,
            parent: parent,
            attrName: attrName,
            count: 0,
            matches: 0,
            isParent: !parent
          });
        }
        
        const stats = attributeStats.get(key);
        
        // Count pairs where both documents have this attribute
        const valueA = labelA.params[attrName];
        const valueB = labelB.params[attrName];
        
        // Only count if attribute exists in BOTH documents
        if (valueA !== undefined && valueB !== undefined) {
          stats.count++;
          
          // Check if values match
          if (valueA === valueB) {
            stats.matches++;
          }
        }
      });
    });
    
    // Convert to array and calculate agreement
    const breakdown = [];
    let totalAttributesCompared = 0;
    let matchingAttributeValues = 0;
    
    attributeStats.forEach((stats, key) => {
      const agreement = stats.count > 0 ? stats.matches / stats.count : 0;
      
      totalAttributesCompared += stats.count;
      matchingAttributeValues += stats.matches;
      
      breakdown.push({
        ...stats,
        agreement: agreement
      });
    });
    
    // Update the statistics in the DOM after rendering
    setTimeout(() => {
      const totalAttrsElem = document.getElementById('total-attrs-compared');
      const matchingAttrsElem = document.getElementById('matching-attr-values');
      if (totalAttrsElem) totalAttrsElem.textContent = totalAttributesCompared;
      if (matchingAttrsElem) matchingAttrsElem.textContent = matchingAttributeValues;
    }, 0);
    
    // Sort to group parents with their sublabels, then by attribute name
    breakdown.sort((a, b) => {
      // First, sort by label (parent grouping)
      if (a.isParent && b.isParent) {
        const labelCompare = a.labelName.localeCompare(b.labelName);
        if (labelCompare !== 0) return labelCompare;
        return a.attrName.localeCompare(b.attrName);
      }
      
      if (a.isParent && !b.isParent) {
        if (b.parent === a.labelName) return -1;
        return a.labelName.localeCompare(b.parent || '');
      }
      
      if (!a.isParent && b.isParent) {
        if (a.parent === b.labelName) return 1;
        return (a.parent || '').localeCompare(b.labelName);
      }
      
      // Both sublabels - sort by parent first, then label, then attribute
      if (a.parent !== b.parent) {
        return (a.parent || '').localeCompare(b.parent || '');
      }
      if (a.labelName !== b.labelName) {
        return a.labelName.localeCompare(b.labelName);
      }
      return a.attrName.localeCompare(b.attrName);
    });
    
    const percentFormat = (num) => (num * 100).toFixed(1) + '%';
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    return `
      <div style="margin-top: 20px;">
        <h4 style="color: var(--accent); font-size: 15px; margin-bottom: 12px; font-weight: 600;">Per-Attribute Breakdown</h4>
        <div class="breakdown-table-container">
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>Label + Attribute</th>
                <th>Count</th>
                <th>Matches</th>
                <th>Agreement</th>
              </tr>
            </thead>
            <tbody>
              ${breakdown.map(stat => {
                const labelDisplay = stat.isParent ? 
                  `<strong>${escapeHtml(stat.labelName)}</strong>` : 
                  `<span class="indent">↳ ${escapeHtml(stat.labelName)}</span>`;
                const attrDisplay = `<span style="color: var(--accent); font-family: monospace; font-size: 12px; margin-left: 8px;">${escapeHtml(stat.attrName)}</span>`;
                
                return `
                  <tr class="${stat.isParent ? 'parent-label' : 'sublabel'}">
                    <td class="label-name">
                      ${labelDisplay}${attrDisplay}
                    </td>
                    <td class="count">${stat.count}</td>
                    <td class="count">${stat.matches}</td>
                    <td class="count">${percentFormat(stat.agreement)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  function setupAnalysisModalDraggable() {
    domElements.analysisModalHeader?.addEventListener('mousedown', analysisModalDragStart);
    document.addEventListener('mousemove', analysisModalDrag);
    document.addEventListener('mouseup', analysisModalDragEnd);
  }
  
  function analysisModalDragStart(e) {
    // Don't drag if clicking on a button
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return;
    }
    
    const dragState = getDragState();
    if (e.target === domElements.analysisModalHeader || e.target.tagName === 'H2') {
      updateDragState({
        initialX: e.clientX - dragState.xOffset,
        initialY: e.clientY - dragState.yOffset
      });
      setIsDragging(true);
      domElements.analysisModalHeader.style.cursor = 'grabbing';
    }
  }
  
  function analysisModalDrag(e) {
    if (!getIsDragging()) return;
    e.preventDefault();
    const dragState = getDragState();
    const modalRect = domElements.analysisModal.getBoundingClientRect();
    const headerRect = domElements.analysisModalHeader.getBoundingClientRect();
    const headerHeight = headerRect.height;
    const modalWidth = modalRect.width;
    const modalHeight = modalRect.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let currentX = e.clientX - dragState.initialX;
    let currentY = e.clientY - dragState.initialY;
    
    // Calculate the modal's center position
    let centerX = viewportWidth / 2 + currentX;
    let centerY = viewportHeight / 2 + currentY;
    
    // Calculate header's position after move
    let headerTop = centerY - modalHeight / 2;
    let headerLeft = centerX - modalWidth / 2;
    let headerRight = headerLeft + modalWidth;
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
    
    updateDragState({ currentX, currentY, xOffset: currentX, yOffset: currentY });
    domElements.analysisModal.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px))`;
  }
  
  function analysisModalDragEnd(e) {
    const dragState = getDragState();
    updateDragState({ initialX: dragState.currentX, initialY: dragState.currentY });
    setIsDragging(false);
    if (domElements.analysisModalHeader) domElements.analysisModalHeader.style.cursor = 'move';
  }
  
  let isResizing = false;
  let resizeState = { startWidth: 0, startHeight: 0, startX: 0, startY: 0 };
  
  function setupAnalysisModalResizable() {
    setTimeout(() => {
      const resizeHandle = document.getElementById('resize-handle');
      if (!resizeHandle) return;
      resizeHandle.addEventListener('mousedown', resizeStart);
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', resizeEnd);
    }, 100);
  }
  
  function resizeStart(e) {
    isResizing = true;
    resizeState.startWidth = domElements.analysisModal.offsetWidth;
    resizeState.startHeight = domElements.analysisModal.offsetHeight;
    resizeState.startX = e.clientX;
    resizeState.startY = e.clientY;
    e.preventDefault();
  }
  
  function resize(e) {
    if (!isResizing) return;
    const width = resizeState.startWidth + (e.clientX - resizeState.startX);
    const height = resizeState.startHeight + (e.clientY - resizeState.startY);
    if (width >= 400 && width <= window.innerWidth * 0.9) {
      domElements.analysisModal.style.width = `${width}px`;
    }
    if (height >= 250 && height <= window.innerHeight * 0.8) {
      domElements.analysisModal.style.height = `${height}px`;
    }
  }
  
  function resizeEnd() {
    isResizing = false;
  }
  
  // ======================
  // THEME CONTROL
  // ======================
  
  let currentBackgroundWarmth = 50;
  
  function initializeThemeControl() {
    setupThemeToggle();
    setupContrastControl();
    setupBackgroundWarmthControl();
    setupResetButton();
    loadSavedSettings();
  }
  
  function setupThemeToggle() {
    domElements.themeToggle?.addEventListener('change', (e) => {
      applyTheme(e.target.checked ? 'light' : 'dark');
    });
  }
  
  function setupContrastControl() {
    domElements.contrastSlider?.addEventListener('input', (e) => {
      applyContrast(e.target.value);
    });
  }
  
  function setupBackgroundWarmthControl() {
    domElements.backgroundSlider?.addEventListener('input', (e) => {
      applyBackgroundWarmth(e.target.value);
    });
  }
  
  function setupResetButton() {
    domElements.resetSettingsBtn?.addEventListener('click', () => {
      applyTheme('light');
      if (domElements.contrastSlider) domElements.contrastSlider.value = 100;
      applyContrast(100);
      if (domElements.backgroundSlider) domElements.backgroundSlider.value = 50;
      applyBackgroundWarmth(50);
      resetAllSettings();
    });
  }
  
  function loadSavedSettings() {
    const savedTheme = loadTheme();
    applyTheme(savedTheme);
    const savedContrast = loadContrast();
    if (domElements.contrastSlider) domElements.contrastSlider.value = savedContrast;
    applyContrast(savedContrast);
    const savedWarmth = loadBackgroundWarmth();
    if (domElements.backgroundSlider) domElements.backgroundSlider.value = savedWarmth;
    applyBackgroundWarmth(savedWarmth);
  }
  
  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (domElements.themeToggle) domElements.themeToggle.checked = true;
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (domElements.themeToggle) domElements.themeToggle.checked = false;
    }
    setCurrentTheme(theme);
    saveTheme(theme);
    applyBackgroundWarmth(currentBackgroundWarmth);
  }
  
  function applyContrast(value) {
    const opacity = value / 100;
    document.documentElement.style.setProperty('--contrast-opacity', opacity);
    saveContrast(value);
    if (domElements.contrastPreview) {
      const percentage = Math.round(opacity * 100);
      domElements.contrastPreview.textContent = `Text visibility: ${percentage}% - This is how your text will appear`;
      domElements.contrastPreview.style.color = `rgba(var(--text-rgb), ${opacity})`;
    }
  }
  
  function applyBackgroundWarmth(value) {
    const root = document.documentElement;
    const warmth = value;
    const currentTheme = root.getAttribute('data-theme');
    currentBackgroundWarmth = warmth;
    saveBackgroundWarmth(warmth);
    
    if (currentTheme === 'light') {
      const intensity = warmth / 100;
      const baseR = 245 - (intensity * 30);
      const baseG = 247 - (intensity * 25);
      const baseB = 250 - (intensity * 35);
      root.style.setProperty('--bg-custom', `rgb(${Math.round(baseR)}, ${Math.round(baseG)}, ${Math.round(baseB)})`);
      root.style.setProperty('--bg', 'var(--bg-custom)');
      const contentR = 255 - (intensity * 50);
      const contentG = 255 - (intensity * 45);
      const contentB = 255 - (intensity * 55);
      root.style.setProperty('--html-content-bg', `rgb(${Math.round(contentR)}, ${Math.round(contentG)}, ${Math.round(contentB)})`);
    } else {
      const intensity = warmth / 100;
      const baseR = 11 + (intensity * 20);
      const baseG = 16 + (intensity * 25);
      const baseB = 32 + (intensity * 30);
      root.style.setProperty('--bg-custom', `rgb(${Math.round(baseR)}, ${Math.round(baseG)}, ${Math.round(baseB)})`);
      root.style.setProperty('--bg', 'var(--bg-custom)');
      root.style.removeProperty('--html-content-bg');
    }
    
    if (domElements.backgroundPreview) {
      const intensity = warmth / 100;
      let tone = 'Neutral';
      if (warmth < 40) tone = 'Cool';
      else if (warmth > 60) tone = 'Warm';
      domElements.backgroundPreview.textContent = `Background: ${Math.round(warmth)}% - ${tone}`;
      if (currentTheme === 'light') {
        const r = 245 - (intensity * 30);
        const g = 247 - (intensity * 25);
        const b = 250 - (intensity * 35);
        domElements.backgroundPreview.style.background = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      } else {
        const r = 11 + (intensity * 20);
        const g = 16 + (intensity * 25);
        const b = 32 + (intensity * 30);
        domElements.backgroundPreview.style.background = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      }
    }
  }
  
  // ======================
  // VIEW TOGGLE
  // ======================
  
  let isSourceViewA = false;
  let isSourceViewB = false;
  
  function initializeViewToggle() {
    if (domElements.viewToggleA) {
      domElements.viewToggleA.addEventListener('click', () => toggleView('A'));
    }
    if (domElements.viewToggleB) {
      domElements.viewToggleB.addEventListener('click', () => toggleView('B'));
    }
  }
  
  function toggleView(doc) {
    const isA = doc === 'A';
    const currentState = isA ? isSourceViewA : isSourceViewB;
    const documentData = isA ? getDocumentA() : getDocumentB();
    if (!documentData) return;
    
    const htmlContent = isA ? domElements.htmlContentA : domElements.htmlContentB;
    const sourceView = isA ? domElements.sourceViewA : domElements.sourceViewB;
    const viewToggle = isA ? domElements.viewToggleA : domElements.viewToggleB;
    
    if (isA) {
      isSourceViewA = !isSourceViewA;
    } else {
      isSourceViewB = !isSourceViewB;
    }
    
    const newState = isA ? isSourceViewA : isSourceViewB;
    
    if (newState) {
      viewToggle.textContent = 'View Rendered';
      viewToggle.classList.add('active');
      htmlContent.style.display = 'none';
      sourceView.style.display = 'block';
      sourceView.value = documentData.html;
    } else {
      viewToggle.textContent = 'View Source';
      viewToggle.classList.remove('active');
      sourceView.style.display = 'none';
      htmlContent.style.display = 'block';
    }
  }
  
  // ======================
  // STATISTICS
  // ======================
  
  function initializeStatistics() {
    const statsBtnA = document.getElementById('stats-btn-a');
    const statsBtnB = document.getElementById('stats-btn-b');
    if (statsBtnA) statsBtnA.addEventListener('click', () => toggleStatistics('a'));
    if (statsBtnB) statsBtnB.addEventListener('click', () => toggleStatistics('b'));
    
    const statsCloseA = document.getElementById('stats-close-a');
    const statsCloseB = document.getElementById('stats-close-b');
    if (statsCloseA) statsCloseA.addEventListener('click', () => toggleStatistics('a'));
    if (statsCloseB) statsCloseB.addEventListener('click', () => toggleStatistics('b'));
    
    const overlayA = document.getElementById('stats-overlay-a');
    const overlayB = document.getElementById('stats-overlay-b');
    if (overlayA) {
      overlayA.addEventListener('click', (e) => {
        if (e.target === overlayA) toggleStatistics('a');
      });
    }
    if (overlayB) {
      overlayB.addEventListener('click', (e) => {
        if (e.target === overlayB) toggleStatistics('b');
      });
    }
  }
  
  function toggleStatistics(side) {
    const overlay = document.getElementById(`stats-overlay-${side}`);
    if (!overlay) return;
    const isHidden = overlay.classList.contains('hidden');
    if (isHidden) {
      updateCardStatistics(side);
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }
  
  function calculateDocumentStats(htmlString, labelsSchema) {
    if (!htmlString) {
      return {
        totalLabels: 0,
        labelsByType: {},
        labelTree: [],
        hasContent: false
      };
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const labels = doc.querySelectorAll('manual_label, auto_label');
    
    const labelCounts = new Map();
    
    labels.forEach(label => {
      const isManual = label.tagName.toLowerCase() === 'manual_label';
      const labelName = label.getAttribute('labelName');
      const parent = label.getAttribute('parent');
      
      if (!labelName) return;
      
      if (parent && parent !== '') {
        if (!labelCounts.has(parent)) {
          labelCounts.set(parent, { manual: 0, auto: 0, children: new Map() });
        }
        const parentData = labelCounts.get(parent);
        
        if (!parentData.children.has(labelName)) {
          parentData.children.set(labelName, { manual: 0, auto: 0 });
        }
        
        const childData = parentData.children.get(labelName);
        if (isManual) {
          childData.manual++;
        } else {
          childData.auto++;
        }
      } else {
        if (!labelCounts.has(labelName)) {
          labelCounts.set(labelName, { manual: 0, auto: 0, children: new Map() });
        }
        const data = labelCounts.get(labelName);
        if (isManual) {
          data.manual++;
        } else {
          data.auto++;
        }
      }
    });
    
    const labelTree = [];
    
    if (labelsSchema && labelsSchema.size > 0) {
      labelsSchema.forEach((labelDef, labelName) => {
        if (labelCounts.has(labelName)) {
          const data = labelCounts.get(labelName);
          const children = [];
          
          if (labelDef.sublabels && labelDef.sublabels.size > 0) {
            labelDef.sublabels.forEach((sublabelDef, sublabelName) => {
              const childData = data.children.get(sublabelName);
              const manual = childData ? childData.manual : 0;
              const auto = childData ? childData.auto : 0;
              const total = manual + auto;
              
              if (total > 0 || data.children.size === 0) {
                children.push({
                  name: sublabelName,
                  manual: manual,
                  auto: auto,
                  total: total,
                  color: sublabelDef.color
                });
              }
            });
          }
          
          labelTree.push({
            name: labelName,
            manual: data.manual,
            auto: data.auto,
            total: data.manual + data.auto,
            color: labelDef.color,
            children: children
          });
        }
      });
    } else {
      Array.from(labelCounts.keys()).sort().forEach(labelName => {
        const data = labelCounts.get(labelName);
        const children = Array.from(data.children.entries())
          .map(([name, childData]) => ({ 
            name, 
            manual: childData.manual, 
            auto: childData.auto,
            total: childData.manual + childData.auto
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        labelTree.push({
          name: labelName,
          manual: data.manual,
          auto: data.auto,
          total: data.manual + data.auto,
          children: children
        });
      });
    }
    
    return {
      totalLabels: labels.length,
      labelTree: labelTree,
      hasContent: true,
      characterCount: doc.body.textContent.trim().length,
      paragraphCount: doc.querySelectorAll('p').length
    };
  }
  
  function renderStats(stats, container) {
    if (!stats.hasContent) {
      container.innerHTML = '<div class="stats-empty"><p>No document loaded</p></div>';
      return;
    }
    
    if (stats.labelTree && stats.labelTree.length > 0) {
      const totalLabels = stats.totalLabels;
      const totalLabelTypes = stats.labelTree.reduce((sum, parent) => {
        return sum + 1 + parent.children.length;
      }, 0);
      
      container.innerHTML = `
        <div class="stats-content">
          <div class="label-tree">
            <div class="label-tree-header">
              <h4>Label Statistics</h4>
              <div class="label-tree-summary">
                <span>${totalLabels} total labels</span>
                <span>•</span>
                <span>${totalLabelTypes} label types</span>
              </div>
            </div>
            <div class="label-tree-list">
              ${stats.labelTree.map(parent => {
                const sublabelsTotal = parent.children.reduce((sum, child) => sum + child.total, 0);
                
                return `
                <div class="label-tree-parent">
                  <div class="label-tree-item parent-label">
                    <span class="label-color-dot" style="background-color: ${parent.color || '#999'}"></span>
                    <span class="label-name">${parent.name}</span>
                    <span class="label-count-text">
                      ${parent.total > 0 ? `m${parent.manual} a${parent.auto}` : ''}
                    </span>
                  </div>
                  ${parent.children.length > 0 ? `
                    <div class="label-tree-children">
                      ${parent.children.map(child => {
                        const percentage = sublabelsTotal > 0 ? (child.total / sublabelsTotal * 100) : 0;
                        const manualPercent = child.total > 0 ? (child.manual / child.total * 100) : 0;
                        const autoPercent = child.total > 0 ? (child.auto / child.total * 100) : 0;
                        
                        return `
                        <div class="label-tree-item child-label">
                          <span class="label-color-dot" style="background-color: ${child.color || '#666'}"></span>
                          <span class="label-name">${child.name}</span>
                          <span class="label-count-text">m${child.manual} a${child.auto}</span>
                          <div class="label-bar-container">
                            <div class="label-bar" style="width: ${percentage}%">
                              <div class="bar-manual" style="width: ${manualPercent}%" title="Manual: ${child.manual} (${manualPercent.toFixed(1)}%)"></div>
                              <div class="bar-auto" style="width: ${autoPercent}%" title="Auto: ${child.auto} (${autoPercent.toFixed(1)}%)"></div>
                            </div>
                            <span class="label-percentage">${percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      `;
                      }).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
              }).join('')}
            </div>
            
            <div class="label-summary-section">
              <h4>Overall Labels Distribution</h4>
              <div class="combined-bars-diagram">
                ${(() => {
                  const grandTotal = stats.labelTree.reduce((sum, parent) => {
                    const sublabelsTotal = parent.children.reduce((childSum, child) => childSum + child.total, 0);
                    return sum + parent.total + sublabelsTotal;
                  }, 0);
                  
                  return stats.labelTree.map(parent => {
                    const parentTotal = parent.total;
                    const sublabelsTotal = parent.children.reduce((sum, child) => sum + child.total, 0);
                    const combinedTotal = parentTotal + sublabelsTotal;
                    
                    if (combinedTotal === 0) return '';
                    
                    const groupPercentage = grandTotal > 0 ? (combinedTotal / grandTotal * 100) : 0;
                    const parentPercentage = combinedTotal > 0 ? (parentTotal / combinedTotal * 100) : 0;
                    
                    return `
                      <div class="diagram-row">
                        <span class="diagram-label-name">${parent.name}</span>
                        <div class="diagram-bar-wrapper" style="width: ${groupPercentage}%">
                          <div class="diagram-bar">
                            ${parentTotal > 0 ? `
                              <div class="diagram-segment" 
                                   style="width: ${parentPercentage}%; background-color: ${parent.color}" 
                                   title="${parent.name}: ${parentTotal} (${((parentTotal / grandTotal) * 100).toFixed(1)}% of total)">
                              </div>
                            ` : ''}
                            ${parent.children.map(child => {
                              const childPercentage = combinedTotal > 0 ? (child.total / combinedTotal * 100) : 0;
                              return `
                                <div class="diagram-segment" 
                                     style="width: ${childPercentage}%; background-color: ${child.color}" 
                                     title="${child.name}: ${child.total} (${((child.total / grandTotal) * 100).toFixed(1)}% of total)">
                                </div>
                              `;
                            }).join('')}
                          </div>
                          <span class="diagram-percentage">${groupPercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    `;
                  }).join('');
                })()}
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = '<div class="stats-empty"><p>No labels found in document</p></div>';
    }
  }
  
  function updateCardStatistics(side) {
    const doc = side === 'a' ? getDocumentA() : getDocumentB();
    const htmlContent = doc ? doc.htmlContent : null;
    const labelsSchema = doc ? doc.labels : null;
    const statsContainer = side === 'a' ? domElements.statsContentA : domElements.statsContentB;
    
    if (!statsContainer) return;
    
    const stats = calculateDocumentStats(htmlContent, labelsSchema);
    renderStats(stats, statsContainer);
  }
  
  // ======================
  // FILE OPERATIONS
  // ======================
  
  function initializeFileOperations() {
    setupClearAll();
    setupUploadLinks();
    setupDragAndDrop();
  }
  
  function setupClearAll() {
    domElements.clearAllBtn?.addEventListener('click', () => {
      if (confirm('Clear all loaded files and reset the comparison?')) {
        clearDocumentA();
        clearDocumentB();
        resetStatistics();
        clearCachedIAAResults();
        checkAndEnableIAAButton();
        setTimeout(() => setupUploadLinks(), 100);
      }
    });
  }
  
  function clearDocumentA() {
    if (domElements.htmlContentA) {
      domElements.htmlContentA.innerHTML = `
        <div class="empty-state drop-zone" id="drop-zone-a">
          <h3>No HTML loaded</h3>
          <p><a href="#" id="upload-link-a">Upload an HTML File</a> or drag & drop here to start comparing</p>
        </div>
      `;
      domElements.htmlContentA.style.display = 'block';
    }
    if (domElements.sourceViewA) {
      domElements.sourceViewA.style.display = 'none';
      domElements.sourceViewA.value = '';
    }
    if (domElements.viewToggleA) {
      domElements.viewToggleA.disabled = true;
      domElements.viewToggleA.classList.remove('active');
      domElements.viewToggleA.textContent = 'View Source';
    }
    if (domElements.statsBtnA) domElements.statsBtnA.disabled = true;
    if (domElements.filenameA) domElements.filenameA.textContent = '';
    setDocumentA(null);
    clearCachedIAAResults();
  }
  
  function clearDocumentB() {
    if (domElements.htmlContentB) {
      domElements.htmlContentB.innerHTML = `
        <div class="empty-state drop-zone" id="drop-zone-b">
          <h3>No HTML loaded</h3>
          <p><a href="#" id="upload-link-b">Upload an HTML File</a> or drag & drop here to start comparing</p>
        </div>
      `;
      domElements.htmlContentB.style.display = 'block';
    }
    if (domElements.sourceViewB) {
      domElements.sourceViewB.style.display = 'none';
      domElements.sourceViewB.value = '';
    }
    if (domElements.viewToggleB) {
      domElements.viewToggleB.disabled = true;
      domElements.viewToggleB.classList.remove('active');
      domElements.viewToggleB.textContent = 'View Source';
    }
    if (domElements.statsBtnB) domElements.statsBtnB.disabled = true;
    if (domElements.filenameB) domElements.filenameB.textContent = '';
    setDocumentB(null);
    clearCachedIAAResults();
  }
  
  function resetStatistics() {
    if (domElements.agreementScore) domElements.agreementScore.textContent = '0%';
    if (domElements.totalLabelsA) domElements.totalLabelsA.textContent = '0';
    if (domElements.totalLabelsB) domElements.totalLabelsB.textContent = '0';
    if (domElements.commonLabels) domElements.commonLabels.textContent = '0';
    if (domElements.analysisDetails) {
      domElements.analysisDetails.innerHTML = '<p class="no-data">Load two annotated HTML files to see comparison analysis</p>';
    }
    setComparisonResults(null);
  }
  
  // Navigation state for label navigation
  let currentLabelIndexA = -1;
  let currentLabelIndexB = -1;
  let highlightedLabelA = null;
  let highlightedLabelB = null;
  let comparisonViewActive = false;
  let savedHtmlStateA = null;
  let savedHtmlStateB = null;
  let comparisonLoadingOverlay = null;
  
  function showComparisonLoading(message = 'Analyzing documents...') {
    // Create overlay if it doesn't exist
    if (!comparisonLoadingOverlay) {
      comparisonLoadingOverlay = document.createElement('div');
      comparisonLoadingOverlay.className = 'comparison-loading-overlay';
      comparisonLoadingOverlay.innerHTML = `
        <div class="iaa-loading">
          <div class="spinner"></div>
          <p id="comparison-loading-message"></p>
        </div>
      `;
      document.body.appendChild(comparisonLoadingOverlay);
    }
    
    // Update message
    const messageEl = comparisonLoadingOverlay.querySelector('#comparison-loading-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    
    // Show overlay
    comparisonLoadingOverlay.style.display = 'flex';
  }
  
  function hideComparisonLoading() {
    if (comparisonLoadingOverlay) {
      comparisonLoadingOverlay.style.display = 'none';
    }
  }
  
  function clearNavigationHighlights() {
    // Clear highlight from Document A
    if (highlightedLabelA) {
      highlightedLabelA.style.outline = '';
      highlightedLabelA = null;
    }
    
    // Clear highlight from Document B
    if (highlightedLabelB) {
      highlightedLabelB.style.outline = '';
      highlightedLabelB = null;
    }
  }
  
  async function runComparisonView() {
    const docA = getDocumentA();
    const docB = getDocumentB();
    
    if (!docA || !docB) {
      hideComparisonLoading();
      alert('Please load at least 2 annotated HTML files to perform comparison.');
      const toggleInput = document.getElementById('comparison-view-toggle');
      if (toggleInput) {
        toggleInput.classList.remove('active');
        comparisonViewActive = false;
      }
      return;
    }
    
    // Check if we have cached results
    let results = getCachedIAAResults();
    
    if (!results) {
      // Need to run analysis first
      try {
        // Parse HTML to extract label tree schemas
        const parserA = new DOMParser();
        const parserB = new DOMParser();
        const parsedDocA = parserA.parseFromString(docA.htmlContent, 'text/html');
        const parsedDocB = parserB.parseFromString(docB.htmlContent, 'text/html');
        
        const schemaA = extractLabelTreeSchema(parsedDocA);
        const schemaB = extractLabelTreeSchema(parsedDocB);
        
        // Validate that both documents have label tree schemas
        if (!schemaA || !schemaB) {
          throw new Error('Both documents must have HTMLLabelizer label tree schema.');
        }
        
        // Compare schemas - they must match
        const schemaComparison = compareLabelTreeSchemas(schemaA, schemaB);
        if (!schemaComparison.matches) {
          throw new Error('Cannot compare documents with different label tree schemas.');
        }
        
        // Extract valid attributes from schema for comparison
        const validAttributesMap = extractValidAttributesFromSchema(schemaA);
        
        // Get HTML content containers
        const containerA = document.getElementById('html-content-a');
        const containerB = document.getElementById('html-content-b');
        
        if (!containerA || !containerB) {
          throw new Error('Document containers not found');
        }
        
        // Extract labels with positions
        const labelsA = extractLabelsWithPositions(containerA, 'a');
        const labelsB = extractLabelsWithPositions(containerB, 'b');
        
        // Use hybrid matching (text-based with position fallback)
        const matchingOptions = {
          textSimilarityThreshold: 0.85,
          positionOverlapThreshold: 0.3,
          strictParams: false,
          preferTextMatching: true
        };
        
        const matchResults = matchLabelsHybrid(labelsA, labelsB, matchingOptions);
        
        results = {
          labelsA: labelsA,
          labelsB: labelsB,
          matchResults: matchResults,
          validAttributesMap: validAttributesMap,
          timestamp: new Date().toISOString()
        };
        
        // Cache the results
        setCachedIAAResults(results);
        
      } catch (error) {
        console.error('Comparison View Error:', error);
        hideComparisonLoading();
        alert(`Comparison failed: ${error.message}`);
        const toggleInput = document.getElementById('comparison-view-toggle');
        if (toggleInput) {
          toggleInput.classList.remove('active');
          comparisonViewActive = false;
        }
        return;
      }
    }
    
    // Apply highlighting to matched labels
    const matches = results.matchResults.matches || [];
    
    // First, clear any existing highlights
    clearMatchHighlighting();
    
    // Track which elements have been highlighted
    const highlightedA = new Set();
    const highlightedB = new Set();
    
    // Apply highlights for matched pairs
    matches.forEach(match => {
      if (match.labelA && match.labelA.element) {
        applyHighlightToElement(match.labelA.element, match.matchType);
        highlightedA.add(match.labelA.element);
      }
      
      if (match.labelB && match.labelB.element) {
        applyHighlightToElement(match.labelB.element, match.matchType);
        highlightedB.add(match.labelB.element);
      }
    });
    
    // Highlight unmatched labels in red
    results.labelsA.forEach(label => {
      if (label.element && !highlightedA.has(label.element)) {
        applyHighlightToElement(label.element, 'no-match');
      }
    });
    
    results.labelsB.forEach(label => {
      if (label.element && !highlightedB.has(label.element)) {
        applyHighlightToElement(label.element, 'no-match');
      }
    });
    
    console.log(`[Comparison View] Highlighted ${matches.length} matched pairs, ${results.labelsA.length - highlightedA.size} unmatched in A, ${results.labelsB.length - highlightedB.size} unmatched in B`);
    
    // Hide loading overlay
    hideComparisonLoading();
  }
  
  function setupComparisonViewToggle() {
    const toggleInput = document.getElementById('comparison-view-toggle');
    if (!toggleInput) return;
    
    toggleInput.addEventListener('click', async () => {
      // Toggle the active state
      comparisonViewActive = !comparisonViewActive;
      
      if (comparisonViewActive) {
        toggleInput.classList.add('active');
        
        // Only show loading if there's nothing in cache
        const cachedResults = getCachedIAAResults();
        if (!cachedResults) {
          showComparisonLoading('Analyzing documents...');
          // Small delay to ensure loading UI renders
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        await runComparisonView();
      } else {
        toggleInput.classList.remove('active');
        clearMatchHighlighting();
        console.log('[Comparison View] Cleared all highlights');
      }
    });
  }
  
  function setupUploadLinks() {
    setTimeout(() => {
      const uploadLinkA = document.getElementById('upload-link-a');
      const uploadLinkB = document.getElementById('upload-link-b');
      const uploadBtnA = document.getElementById('upload-btn-a');
      const uploadBtnB = document.getElementById('upload-btn-b');
      
      // Function to create file upload handler
      const createUploadHandler = (loadFunction) => {
        return (e) => {
          e.preventDefault();
          const tempInput = document.createElement('input');
          tempInput.type = 'file';
          tempInput.accept = '.html,.htm';
          tempInput.onchange = async (event) => {
            const files = Array.from(event.target.files);
            if (files.length > 0) {
              const processedFiles = await processFiles(files);
              if (processedFiles.length > 0) {
                await loadFunction(processedFiles[0].name, processedFiles[0].content);
              }
            }
          };
          tempInput.click();
        };
      };
      
      if (uploadLinkA) {
        uploadLinkA.addEventListener('click', createUploadHandler(loadDocumentA));
      }
      
      if (uploadBtnA) {
        uploadBtnA.addEventListener('click', createUploadHandler(loadDocumentA));
      }
      
      if (uploadLinkB) {
        uploadLinkB.addEventListener('click', createUploadHandler(loadDocumentB));
      }
      
      if (uploadBtnB) {
        uploadBtnB.addEventListener('click', createUploadHandler(loadDocumentB));
      }
    }, 100);
  }
  
  function setupLabelNavigation() {
    setTimeout(() => {
      const navPrevA = document.getElementById('navigate-previous-a');
      const navNextA = document.getElementById('navigate-next-a');
      const navPrevB = document.getElementById('navigate-previous-b');
      const navNextB = document.getElementById('navigate-next-b');
      
      function navigateLabels(contentId, direction) {
        const content = document.getElementById(contentId);
        if (!content) return;
        
        // Filter only parent labels (where parent="" or parent attribute is empty/not set)
        const allLabels = Array.from(content.querySelectorAll('manual_label, auto_label'));
        const labels = allLabels.filter(label => {
          const parent = label.getAttribute('parent');
          return !parent || parent === '';
        });
        
        if (labels.length === 0) return;
        
        const isA = contentId === 'html-content-a';
        let currentIndex = isA ? currentLabelIndexA : currentLabelIndexB;
        
        // Remove highlight from current label
        if (isA && highlightedLabelA) {
          highlightedLabelA.style.outline = '';
          highlightedLabelA = null;
        } else if (!isA && highlightedLabelB) {
          highlightedLabelB.style.outline = '';
          highlightedLabelB = null;
        }
        
        // Update index
        if (direction === 'next') {
          currentIndex = (currentIndex + 1) % labels.length;
        } else {
          currentIndex = currentIndex <= 0 ? labels.length - 1 : currentIndex - 1;
        }
        
        // Update global index
        if (isA) {
          currentLabelIndexA = currentIndex;
        } else {
          currentLabelIndexB = currentIndex;
        }
        
        // Highlight and scroll to new label
        const targetLabel = labels[currentIndex];
        targetLabel.style.outline = '3px solid var(--accent)';
        targetLabel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Track the highlighted label
        if (isA) {
          highlightedLabelA = targetLabel;
        } else {
          highlightedLabelB = targetLabel;
        }
      }
      
      if (navPrevA) {
        navPrevA.addEventListener('click', () => navigateLabels('html-content-a', 'prev'));
      }
      
      if (navNextA) {
        navNextA.addEventListener('click', () => navigateLabels('html-content-a', 'next'));
      }
      
      if (navPrevB) {
        navPrevB.addEventListener('click', () => navigateLabels('html-content-b', 'prev'));
      }
      
      if (navNextB) {
        navNextB.addEventListener('click', () => navigateLabels('html-content-b', 'next'));
      }
    }, 100);
  }
  
  function setupDragAndDrop() {
    setTimeout(() => {
      const dropZoneA = document.getElementById('drop-zone-a');
      const dropZoneB = document.getElementById('drop-zone-b');
      
      [dropZoneA, dropZoneB].forEach(dropZone => {
        if (!dropZone) return;
        
        ['dragenter', 'dragover'].forEach(eventName => {
          dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
          });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
          dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
          });
        });
        
        dropZone.addEventListener('drop', async (e) => {
          const files = Array.from(e.dataTransfer.files);
          if (files.length === 0) return;
          
          const processedFiles = await processFiles(files);
          if (processedFiles.length === 0) {
            alert('No valid HTML files found. Please drop .html or .htm files.');
            return;
          }
          
          const isZoneA = dropZone.id === 'drop-zone-a';
          if (isZoneA) {
            await loadDocumentA(processedFiles[0].name, processedFiles[0].content);
            if (processedFiles[1]) {
              await loadDocumentB(processedFiles[1].name, processedFiles[1].content);
            }
          } else {
            await loadDocumentB(processedFiles[0].name, processedFiles[0].content);
          }
        });
      });
    }, 100);
  }
  
  async function loadDocumentA(filename, htmlContent) {
    const schemaWrapper = extractExistingLabels(htmlContent);
    let labels = new Map();
    let meta = {};
    
    if (schemaWrapper) {
      if (schemaWrapper.labeltree) labels = buildLabelsFromSchema(schemaWrapper.labeltree);
      if (schemaWrapper.meta) meta = schemaWrapper.meta;
    }
    
    const documentData = {
      filename: filename,
      html: htmlContent,
      htmlContent: htmlContent,
      labels: labels,
      meta: meta
    };
    
    setDocumentA(documentData);
    clearCachedIAAResults();
    
    if (domElements.viewToggleA) domElements.viewToggleA.disabled = false;
    if (domElements.statsBtnA) domElements.statsBtnA.disabled = false;
    const navPrevA = document.getElementById('navigate-previous-a');
    const navNextA = document.getElementById('navigate-next-a');
    if (navPrevA) navPrevA.disabled = false;
    if (navNextA) navNextA.disabled = false;
    if (domElements.filenameA) domElements.filenameA.textContent = filename;
    
    if (domElements.htmlContentA) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const mentions = doc.querySelectorAll('manual_label, auto_label');
      mentions.forEach(mention => {
        const labelName = mention.getAttributeNames()[0];
        const parent = mention.getAttribute('parent') || '';
        const path = parent ? [parent, labelName] : [labelName];
        const labelData = labels.get(path[0]);
        if (labelData) {
          const actualLabel = path.length > 1 ? labelData.sublabels.get(path[1]) : labelData;
          if (actualLabel) {
            mention.style.backgroundColor = actualLabel.color;
            const r = parseInt(actualLabel.color.slice(1,3), 16);
            const g = parseInt(actualLabel.color.slice(3,5), 16);
            const b = parseInt(actualLabel.color.slice(5,7), 16);
            const brightness = (r*299 + g*587 + b*114) / 1000;
            mention.style.color = brightness > 155 ? '#000000' : '#FFFFFF';
          }
        }
      });
      domElements.htmlContentA.innerHTML = doc.body.innerHTML;
      attachReadOnlyLabelEventListeners(domElements.htmlContentA, labels);
    }
    
    updateStatistics();
    console.log(`Document A loaded: ${filename}`);
  }
  
  async function loadDocumentB(filename, htmlContent) {
    const schemaWrapper = extractExistingLabels(htmlContent);
    let labels = new Map();
    let meta = {};
    
    if (schemaWrapper) {
      if (schemaWrapper.labeltree) labels = buildLabelsFromSchema(schemaWrapper.labeltree);
      if (schemaWrapper.meta) meta = schemaWrapper.meta;
    }
    
    const documentData = {
      filename: filename,
      html: htmlContent,
      htmlContent: htmlContent,
      labels: labels,
      meta: meta
    };
    
    setDocumentB(documentData);
    clearCachedIAAResults();
    
    if (domElements.viewToggleB) domElements.viewToggleB.disabled = false;
    if (domElements.statsBtnB) domElements.statsBtnB.disabled = false;
    const navPrevB = document.getElementById('navigate-previous-b');
    const navNextB = document.getElementById('navigate-next-b');
    if (navPrevB) navPrevB.disabled = false;
    if (navNextB) navNextB.disabled = false;
    if (domElements.filenameB) domElements.filenameB.textContent = filename;
    
    if (domElements.htmlContentB) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const mentions = doc.querySelectorAll('manual_label, auto_label');
      mentions.forEach(mention => {
        const labelName = mention.getAttributeNames()[0];
        const parent = mention.getAttribute('parent') || '';
        const path = parent ? [parent, labelName] : [labelName];
        const labelData = labels.get(path[0]);
        if (labelData) {
          const actualLabel = path.length > 1 ? labelData.sublabels.get(path[1]) : labelData;
          if (actualLabel) {
            mention.style.backgroundColor = actualLabel.color;
            const r = parseInt(actualLabel.color.slice(1,3), 16);
            const g = parseInt(actualLabel.color.slice(3,5), 16);
            const b = parseInt(actualLabel.color.slice(5,7), 16);
            const brightness = (r*299 + g*587 + b*114) / 1000;
            mention.style.color = brightness > 155 ? '#000000' : '#FFFFFF';
          }
        }
      });
      domElements.htmlContentB.innerHTML = doc.body.innerHTML;
      attachReadOnlyLabelEventListeners(domElements.htmlContentB, labels);
    }
    
    updateStatistics();
    console.log(`Document B loaded: ${filename}`);
  }
  
  function updateStatistics() {
    if (domElements.htmlContentA) {
      const statsA = getHtmlStatistics(domElements.htmlContentA);
      if (domElements.totalLabelsA) domElements.totalLabelsA.textContent = statsA.totalMentions;
      updateCardStatistics('a');
    }
    
    if (domElements.htmlContentB) {
      const statsB = getHtmlStatistics(domElements.htmlContentB);
      if (domElements.totalLabelsB) domElements.totalLabelsB.textContent = statsB.totalMentions;
      updateCardStatistics('b');
    }
    
    checkAndEnableIAAButton();
  }
  
  function checkAndEnableIAAButton() {
    const docA = getDocumentA();
    const docB = getDocumentB();
    if (domElements.iaaAnalysisBtn) {
      if (docA && docB) {
        domElements.iaaAnalysisBtn.disabled = false;
      } else {
        domElements.iaaAnalysisBtn.disabled = true;
      }
    }
    
    // Also manage comparison view toggle
    const comparisonToggle = document.getElementById('comparison-view-toggle');
    if (comparisonToggle) {
      if (docA && docB) {
        comparisonToggle.disabled = false;
      } else {
        comparisonToggle.disabled = true;
        comparisonToggle.classList.remove('active');
        comparisonViewActive = false;
      }
    }
  }
  
  // ======================
  // INITIALIZATION
  // ======================
  
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Comparison Tool initializing (100% client-side version)...');
    initializeDOMElements();
    initializeSettingsModal();
    initializeAnalysisModal();
    initializeThemeControl();
    initializeFileOperations();
    initializeViewToggle();
    initializeStatistics();
    setupLabelNavigation();
    setupComparisonViewToggle();
    console.log('Comparison Tool initialized successfully');
  });
  
})();
