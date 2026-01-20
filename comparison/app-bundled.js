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
      // Clear any navigation highlights before analysis
      clearNavigationHighlights();
      
      domElements.analysisModal?.classList.remove('hidden');
      await runIAAAnalysis();
    });
    
    domElements.analysisCloseBtn?.addEventListener('click', () => {
      domElements.analysisModal?.classList.add('hidden');
    });
    
    setupAnalysisModalDraggable();
    setupAnalysisModalResizable();
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
      
      const labelType = labelElement.getAttribute('label') || '';
      const text = labelElement.textContent || '';
      
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
  
  function applyHighlightToElement(element, matchType) {
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
      
      const results = {
        labelsA: labelsA,
        labelsB: labelsB,
        matchResults: matchResults,
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
    
    // Calculate attribute F1 (from matched spans only)
    const matchedSpans = exactMatches.length;
    const attributeMatches = matchResults.matches.filter(m => m.matchType === 'exact').length;
    const attributeMismatches = matchResults.matches.filter(m => m.matchType === 'overlap').length;
    
    const attr_precision = matchedSpans > 0 ? attributeMatches / matchedSpans : 0;
    const attr_recall = matchedSpans > 0 ? attributeMatches / matchedSpans : 0;
    const f1_attr = matchedSpans > 0 ? (attributeMatches / matchedSpans) : 0;
    
    let html = `
      <div class="iaa-section">
        <h3>Match Summary</h3>
        <div class="iaa-summary-grid">
          <div class="iaa-summary-card exact">
            <div class="iaa-summary-number">${summary.exactMatches}</div>
            <div class="iaa-summary-label">Exact + Same Attributes</div>
            <div class="iaa-summary-color" style="background: #22c55e;"></div>
          </div>
          <div class="iaa-summary-card overlap">
            <div class="iaa-summary-number">${summary.overlapMatches}</div>
            <div class="iaa-summary-label">Exact + Mismatch Attributes</div>
            <div class="iaa-summary-color" style="background: #f97316;"></div>
          </div>
          <div class="iaa-summary-card no-match">
            <div class="iaa-summary-number">${summary.noMatches}</div>
            <div class="iaa-summary-label">Not Exact</div>
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
      </div>
      
      <div class="iaa-section">
        <h3>Attribute Agreement</h3>
        <div class="iaa-method">
          Among matched spans, measures agreement on label attributes.
        </div>
        <div class="iaa-metrics">
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">Attribute F1:</span>
            <span class="iaa-metric-value">${f1_attr.toFixed(3)}</span>
          </div>
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">Matched Spans:</span>
            <span class="iaa-metric-value">${matchedSpans}</span>
          </div>
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">Same Attributes:</span>
            <span class="iaa-metric-value">${attributeMatches}</span>
          </div>
          <div class="iaa-metric-row">
            <span class="iaa-metric-label">Different Attributes:</span>
            <span class="iaa-metric-value">${attributeMismatches}</span>
          </div>
        </div>
      </div>
    `;
    
    html += `<div class="resize-handle" id="resize-handle"></div>`;
    
    container.innerHTML = html;
  }
  
  function setupAnalysisModalDraggable() {
    domElements.analysisModalHeader?.addEventListener('mousedown', analysisModalDragStart);
    document.addEventListener('mousemove', analysisModalDrag);
    document.addEventListener('mouseup', analysisModalDragEnd);
  }
  
  function analysisModalDragStart(e) {
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
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let currentX = e.clientX - dragState.initialX;
    let currentY = e.clientY - dragState.initialY;
    
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
    console.log('Comparison Tool initialized successfully');
  });
  
})();
