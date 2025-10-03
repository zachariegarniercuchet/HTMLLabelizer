(() => {
  // ======= Configuration =======
  const ENHANCED_FORMATTING_SEARCH = true; // Set to false for simple text matching, true for enhanced matching across formatting tags
  
  // ======= State =======
  let currentHtml = '';
  let currentFileName = '';
  let isSourceView = false;
  let sourceViewModified = false;
  const labels = new Map(); // name -> {color, type, sublabels, params}
  const activeGroups = new Map(); // groupId -> { labelName, groupAttributes: Map }
  // ======= COMPLETE SEPARATION OF SELECTION TYPES =======
  let currentSelection = null; // For user mouse selections in HTML content
  let currentSearchSelection = null; // For search matches in HTML content - ONLY used by Apply button
  let currentAdvancedMouseSelection = null; // For user mouse selections in advanced content - PURELY advanced content
  let expandedNodes = new Set(); // Track expanded tree nodes
  let selectedNode = null; // Track selected tree node
  let currentParamElement = null; // Track element being edited for parameters
  
  // ======= Search Overlay State =======
  let searchOverlays = []; // Array of overlay elements for highlighting
  let currentSearchMatches = []; // Array of match data
  
  // ======= Group Display State =======
  let expandedGroups = new Set(); // Track expanded groups
  let groupsSectionExpanded = true; // Track if entire groups section is expanded
  let activeGroupFilter = null; // Track active group filter

  let searchTimeout;
  const MIN_SEARCH_LENGTH = 2; // Only search for strings MIN_SEARCH_LENGTH+ characters
  const SEARCH_DEBOUNCE_MS = 300; // Wait 300ms after user stops typing

  // ======= Multi-Selection State Management =======
  let multiSelectionMode = false;
  let multiSelections = []; // Array to store multiple selections
  let ctrlPressed = false;
  

  // ======= DOM Elements =======
  const elements = {
    htmlFileInput: document.getElementById('html-file-input'),
    downloadBtn: document.getElementById('download-html'),
    saveAsBtn: document.getElementById('save-as'),
    clearBtn: document.getElementById('clear-all'),
    htmlContent: document.getElementById('html-content'),
    currentFilename: document.getElementById('current-filename'),
    newLabelName: document.getElementById('new-label-name'),
    newLabelColor: document.getElementById('new-label-color'),
    addRootLabel: document.getElementById('add-root-label'),
    labelTree: document.getElementById('label-tree'),
    contextMenu: document.getElementById('context-menu'),
    labelOptions: document.getElementById('label-options'),
    paramMenu: document.getElementById('param-menu'),
    paramMenuTitle: document.getElementById('param-menu-title'),
    paramForm: document.getElementById('param-form'),
    totalMentions: document.getElementById('total-mentions'),
    labelTypes: document.getElementById('label-types'),
    sourceView: document.getElementById('source-view'),
    viewToggle: document.getElementById('view-toggle'),
    dropZone: document.getElementById('drop-zone'),
    advancedLabelInput: document.getElementById('advanced-label-input'),
    advancedContent: document.getElementById('advanced-content'),
    clearAdvancedLabels: document.getElementById('clear-advanced-labels'),
    applyAdvanced: document.getElementById('apply-advanced'),
    applyAllAdvanced: document.getElementById('apply-all-advanced'),
    navigatePrevious: document.getElementById('navigate-previous'),
    navigateNext: document.getElementById('navigate-next')
  };

  

  // ======= Utilities =======
  function getContrastColor(hexcolor) {
    hexcolor = hexcolor.replace('#', '');
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
  }

  function generateRandomColor() {
    const colors = ['#6aa3ff', '#20c997', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#e83e8c'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

function getScrollPosition(element) {
  const scrollTop = element.scrollTop;
  const scrollHeight = element.scrollHeight;
  const clientHeight = element.clientHeight;
  
  if (scrollHeight <= clientHeight) return 0;
  return scrollTop / (scrollHeight - clientHeight);
}

function setScrollPosition(element, ratio) {
  const scrollHeight = element.scrollHeight;
  const clientHeight = element.clientHeight;
  
  if (scrollHeight <= clientHeight) return;
  
  const maxScroll = scrollHeight - clientHeight;
  element.scrollTop = maxScroll * ratio;
}

function getBodyStartRatio(sourceContent) {
  const bodyMatch = sourceContent.match(/<body[^>]*>/i);
  if (!bodyMatch) return 0;
  
  const bodyStartIndex = bodyMatch.index;
  const totalLines = sourceContent.split('\n').length;
  const contentBeforeBody = sourceContent.substring(0, bodyStartIndex);
  const linesBeforeBody = contentBeforeBody.split('\n').length;
  
  return linesBeforeBody / totalLines;
}

function mapRenderedToSource(renderedRatio, sourceContent) {
  const bodyStartRatio = getBodyStartRatio(sourceContent);
  // Linear mapping: 0% rendered = body start, 100% rendered = 100% source
  return bodyStartRatio + (renderedRatio * (1 - bodyStartRatio));
}

function mapSourceToRendered(sourceRatio, sourceContent) {
  const bodyStartRatio = getBodyStartRatio(sourceContent);
  
  if (sourceRatio <= bodyStartRatio) {
    return 0; // Before body = start of rendered
  }
  
  // Linear mapping: source ratio between body start and end
  return (sourceRatio - bodyStartRatio) / (1 - bodyStartRatio);
}


  // ======= Make Element Draggable =======
  function makeDraggable(element, handle) {
    let isDragging = false;
    let hasMoved = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    handle.addEventListener('mousedown', dragStart);

    function dragStart(e) {
      // Get the current position of the element
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

        // Keep the menu within viewport bounds
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
      
      // Only restore focus to first input if we actually moved the menu
      // Don't interfere with normal clicking on inputs
      if (hasMoved) {
        const firstInput = element.querySelector('input, select');
        if (firstInput) {
          firstInput.focus();
        }
      }
    }

    // Set initial cursor style
    handle.style.cursor = 'grab';
  }

  // ======= Enhanced Label Management =======

  function createLabel(name, color, type = "structured", params = {}, groupConfig = null) {
  return {
    name,
    color,
    type,
    params: new Map(Object.entries(params)),
    sublabels: new Map(),
    groupConfig: groupConfig // { groupIdAttribute: 'id', groupAttributes: Map }
  };
}

  function addLabel(name, color, parentPath = []) {
    if (!name.trim()) return false;
    
    let current = labels;
    
    // Navigate to parent
    for (const pathSegment of parentPath) {
      if (current.has(pathSegment)) {
        current = current.get(pathSegment).sublabels;
      } else {
        return false; // Parent doesn't exist
      }
    }
    
    if (current.has(name)) {
      alert('Label with this name already exists at this level!');
      return false;
    }
    
    current.set(name, createLabel(name, color));
    refreshTreeUI();
    return true;
  }

  function addParameter(labelPath, paramName, paramValue = '') {
    const label = getLabelByPath(labelPath);
    if (!label || !paramName.trim()) return false;
    
    // Preserve case of parameter name
    label.params.set(paramName, paramValue);
    refreshTreeUI();
    return true;
  }

  function getLabelByPath(path) {
    let current = labels;
    
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      if (current.has(segment)) {
        if (i === path.length - 1) {
          return current.get(segment);
        } else {
          current = current.get(segment).sublabels;
        }
      } else {
        return null;
      }
    }
    
    return null;
  }

  function deleteLabel(labelPath) {
    if (labelPath.length === 0) return false;
    
    const parentPath = labelPath.slice(0, -1);
    const labelName = labelPath[labelPath.length - 1];
    
    let current = labels;
    
    // Navigate to parent
    for (const pathSegment of parentPath) {
      if (current.has(pathSegment)) {
        current = current.get(pathSegment).sublabels;
      } else {
        return false;
      }
    }
    
    if (current.has(labelName)) {
      current.delete(labelName);
      refreshTreeUI();
      return true;
    }
    
    return false;
  }

  function deleteParameter(labelPath, paramName) {
    const label = getLabelByPath(labelPath);
    if (!label) return false;
    
    label.params.delete(paramName);
    refreshTreeUI();
    return true;
  }

  // ======= Tree UI Management =======

function refreshTreeUI() {
  renderTree();
  updateLabelOptions();
  updateStats();
  
  // Ensure groups header has expand button after any tree updates
  setTimeout(() => {
    if (typeof initializeGroupsHeader === 'function') {
      initializeGroupsHeader();
    }
  }, 0);
}

function renderTree() {
  elements.labelTree.innerHTML = '';
  renderTreeLevel(labels, [], 0, elements.labelTree);
}

function renderTreeLevel(labelMap, currentPath, level, container) {
  labelMap.forEach((label, name) => {
    const nodePath = [...currentPath, name];
    const nodeId = nodePath.join('.');
    
    // Create tree node
    const treeNode = document.createElement('div');
    treeNode.className = 'tree-node';
    
    // Create tree item
    const treeItem = document.createElement('div');
    treeItem.className = `tree-item level-${level}`;
    treeItem.dataset.path = JSON.stringify(nodePath);
    
    if (selectedNode === nodeId) {
      treeItem.classList.add('selected');
    }
    
    // Expand/collapse button
    const expandBtn = document.createElement('button');
    expandBtn.className = 'tree-expand-btn';
    const hasChildren = label.sublabels.size > 0 || label.params.size > 0;
    
    if (hasChildren) {
      const isExpanded = expandedNodes.has(nodeId);
      expandBtn.classList.add(isExpanded ? 'expanded' : 'collapsed');
      expandBtn.onclick = (e) => {
        e.stopPropagation();
        toggleNode(nodeId);
      };
    } else {
      expandBtn.classList.add('no-children');
    }
    
    // Icon
    const icon = document.createElement('div');
    icon.className = 'tree-icon folder';
    
    // Color indicator
    const colorIndicator = document.createElement('div');
    colorIndicator.className = 'tree-color-indicator';
    colorIndicator.style.backgroundColor = label.color;
    
    // Label text
    const labelText = document.createElement('div');
    labelText.className = 'tree-label';
    labelText.textContent = name;
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'tree-actions';
    
    if (level === 0) {
      const addBtn = document.createElement('button');
      addBtn.className = 'tree-action-btn add';
      addBtn.title = 'Add sublabel';
      addBtn.onclick = (e) => {
        e.stopPropagation();
        promptAddSublabel(nodePath, treeNode);
      };
      actions.appendChild(addBtn);
    }
    
    const addParamBtn = document.createElement('button');
    addParamBtn.className = 'tree-action-btn edit';
    addParamBtn.title = 'Add parameter';
    addParamBtn.onclick = (e) => {
      e.stopPropagation();
      promptAddParameter(nodePath, treeNode);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tree-action-btn delete';
    deleteBtn.title = 'Delete label';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${name}" and all its children?`)) {
        deleteLabel(nodePath);
      }
    };
    
    actions.appendChild(addParamBtn);
    actions.appendChild(deleteBtn);
    
    // Assemble tree item
    treeItem.appendChild(expandBtn);
    treeItem.appendChild(icon);
    treeItem.appendChild(colorIndicator);
    treeItem.appendChild(labelText);
    treeItem.appendChild(actions);
    
    // Click handler for selection
    treeItem.onclick = (e) => {
      if (e.target === treeItem || e.target === labelText || e.target === icon || e.target === colorIndicator) {
        selectNode(nodeId);
      }
    };
    
    treeNode.appendChild(treeItem);
    
    // Children container
    if (hasChildren) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'tree-children';
      
      const isExpanded = expandedNodes.has(nodeId);
      childrenContainer.classList.add(isExpanded ? 'expanded' : 'collapsed');
      
      if (isExpanded) {
        // Sort and render parameters in order: gold, silver, regular
        const sortedParams = getSortedParameters(label);
        
        sortedParams.forEach(({ paramName, paramValue, type }) => {
          const paramItem = createParameterItem(nodePath, paramName, paramValue, level + 1, treeNode, type);
          childrenContainer.appendChild(paramItem);
        });
        
        // Then render sublabels
        renderTreeLevel(label.sublabels, nodePath, level + 1, childrenContainer);
      }
      
      treeNode.appendChild(childrenContainer);
    }
    
    container.appendChild(treeNode);
  });
}

function getSortedParameters(label) {
  const sortedParams = [];
  
  // Find group ID (gold) parameter
  let groupIdParam = null;
  if (label.groupConfig && label.groupConfig.groupIdAttribute) {
    const groupIdName = label.groupConfig.groupIdAttribute;
    if (label.params.has(groupIdName)) {
      groupIdParam = {
        paramName: groupIdName,
        paramValue: label.params.get(groupIdName),
        type: 'gold'
      };
    }
  }
  
  // Collect group attributes (silver)
  const groupAttributes = [];
  if (label.groupConfig && label.groupConfig.groupAttributes) {
    label.groupConfig.groupAttributes.forEach((value, name) => {
      groupAttributes.push({
        paramName: name,
        paramValue: value,
        type: 'silver'
      });
    });
  }
  
  // Collect regular parameters
  const regularParams = [];
  label.params.forEach((value, name) => {
    // Skip if it's the group ID parameter
    if (groupIdParam && name === groupIdParam.paramName) return;
    
    regularParams.push({
      paramName: name,
      paramValue: value,
      type: 'regular'
    });
  });
  
  // Order: gold first, then silver, then regular
  if (groupIdParam) sortedParams.push(groupIdParam);
  sortedParams.push(...groupAttributes);
  sortedParams.push(...regularParams);
  
  return sortedParams;
}

function createParameterItem(labelPath, paramName, paramValue, level, treeNode, paramType = 'regular') {
  const paramNode = document.createElement('div');
  paramNode.className = 'tree-node';
  
  const paramItem = document.createElement('div');
  paramItem.className = `tree-item level-${level} param-${paramType}`;
  
  // Empty expand button for alignment
  const expandBtn = document.createElement('button');
  expandBtn.className = 'tree-expand-btn no-children';
  
  // Parameter icon
  const icon = document.createElement('div');
  icon.className = `tree-icon param param-${paramType}`;
  
  // Parameter name
  const paramText = document.createElement('div');
  paramText.className = 'tree-label';
  paramText.textContent = paramName;
  
  // Parameter value
  const paramValueSpan = document.createElement('div');
  paramValueSpan.className = 'tree-param-value';
  paramValueSpan.textContent = `${paramValue.type} ${paramValue.default}` || '(empty)';
  
  // Actions
  const actions = document.createElement('div');
  actions.className = 'tree-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'tree-action-btn edit';
  editBtn.title = paramType === 'silver' ? 'Edit group attribute' : 'Edit parameter';
  editBtn.onclick = (e) => {
    e.stopPropagation();
    if (paramType === 'silver') {
      promptEditGroupAttribute(labelPath, paramName, paramValue, treeNode);
    } else {
      promptEditParameter(labelPath, paramName, paramValue, treeNode);
    }
  };
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'tree-action-btn delete';
  deleteBtn.title = paramType === 'gold' ? 'Delete group (removes all group attributes)' : 
                   paramType === 'silver' ? 'Delete group attribute' : 'Delete parameter';
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    if (paramType === 'gold') {
      if (confirm(`Delete group "${paramName}" and all group attributes?`)) {
        deleteGroup(labelPath);
      }
    } else if (paramType === 'silver') {
      if (confirm(`Delete group attribute "${paramName}"?`)) {
        deleteGroupAttribute(labelPath, paramName);
      }
    } else {
      if (confirm(`Delete parameter "${paramName}"?`)) {
        deleteParameter(labelPath, paramName);
      }
    }
  };
  
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  
  paramItem.appendChild(expandBtn);
  paramItem.appendChild(icon);
  paramItem.appendChild(paramText);
  paramItem.appendChild(paramValueSpan);
  paramItem.appendChild(actions);
  
  paramNode.appendChild(paramItem);
  return paramNode;
}

function toggleNode(nodeId) {
  if (expandedNodes.has(nodeId)) {
    expandedNodes.delete(nodeId);
  } else {
    expandedNodes.add(nodeId);
  }
  renderTree();
}

function selectNode(nodeId) {
  selectedNode = nodeId;
  renderTree();
}

// ======= Group Management Functions =======

function deleteGroup(labelPath) {
  const label = getLabelByPath(labelPath);
  if (!label || !label.groupConfig) return;

  // Remove the group ID parameter
  label.params.delete(label.groupConfig.groupIdAttribute);
  
  // Remove group config (this also removes all group attributes)
  label.groupConfig = null;

  refreshTreeUI();
}

function deleteGroupAttribute(labelPath, attrName) {
  const label = getLabelByPath(labelPath);
  if (!label || !label.groupConfig) return;

  label.groupConfig.groupAttributes.delete(attrName);
  refreshTreeUI();
}

/**
 * Close all open inline editors without saving
 */
function closeAllInlineEditors() {
  const inlineEditors = document.querySelectorAll('.inline-editor');
  inlineEditors.forEach(editor => editor.remove());
}

function promptAddSublabel(parentPath, container) {
    // Close any existing inline editors first
    closeAllInlineEditors();
    
    // Create inline input row
    const inlineEditor = document.createElement("div");
    inlineEditor.className = "inline-editor";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Sublabel name";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "save-btn green";

    // Handle save
    saveBtn.onclick = () => {
        const name = input.value.trim();
        if (!name) return;

        const color = generateRandomColor();
        if (addLabel(name, color, parentPath)) {
        inlineEditor.remove(); // remove editor
        // Expand parent node
        const parentNodeId = parentPath.join(".");
        expandedNodes.add(parentNodeId);
        renderTree();
        }
    };

    inlineEditor.appendChild(input);
    inlineEditor.appendChild(saveBtn);

    // Insert inline editor below the parent node
    container.appendChild(inlineEditor);
    input.focus();
    }

function promptAddParameter(labelPath, container) {
  // Close any existing inline editors first
  closeAllInlineEditors();
  
  const label = getLabelByPath(labelPath);
  const hasGroupConfig = label && label.groupConfig;
  const hasGroupId = hasGroupConfig && label.groupConfig.groupIdAttribute;

  const inlineEditor = document.createElement("div");
  inlineEditor.className = "inline-editor";

  // Name
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Parameter name";

  // Type selector
  const typeSelect = document.createElement("select");
  ["string", "dropdown", "checkbox"].forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });

  // Dynamic default value container
  const defaultValueContainer = document.createElement("div");
  defaultValueContainer.className = "default-value-container";

  // Dropdown values section
  const dropdownSection = document.createElement("div");
  dropdownSection.className = "dropdown-section hidden";

  const valuesList = document.createElement("div");
  valuesList.className = "dropdown-values";

  const addValueBtn = document.createElement("button");
  addValueBtn.textContent = "+ Add option";
  addValueBtn.type = "button";
  addValueBtn.onclick = () => {
    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.placeholder = "Option";
    valuesList.appendChild(itemInput);
  };

  dropdownSection.appendChild(addValueBtn);
  dropdownSection.appendChild(valuesList);

  // Group ID checkbox (show only if no group ID exists yet)
  const groupIdSection = document.createElement("div");
  groupIdSection.className = !hasGroupId ? "group-section gold-section" : "group-section gold-section hidden";

  const groupIdCheckbox = document.createElement("input");
  groupIdCheckbox.type = "checkbox";
  groupIdCheckbox.id = "is-group-id-" + Date.now();

  const groupIdLabel = document.createElement("label");
  groupIdLabel.textContent = "This is the Group ID";
  groupIdLabel.htmlFor = groupIdCheckbox.id;

  groupIdSection.appendChild(groupIdCheckbox);
  groupIdSection.appendChild(groupIdLabel);

  // Group attribute checkbox (show only if group ID exists)
  const groupAttrSection = document.createElement("div");
  groupAttrSection.className = hasGroupId ? "group-section silver-section" : "group-section silver-section hidden";

  const groupAttrCheckbox = document.createElement("input");
  groupAttrCheckbox.type = "checkbox";
  groupAttrCheckbox.id = "is-group-attr-" + Date.now();

  const groupAttrLabel = document.createElement("label");
  groupAttrLabel.textContent = "This is a group attribute";
  groupAttrLabel.htmlFor = groupAttrCheckbox.id;

  groupAttrSection.appendChild(groupAttrCheckbox);
  groupAttrSection.appendChild(groupAttrLabel);

  // Save button
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "save-btn green";

  const validNameRegex = /^[A-Za-z0-9_]+$/;

  // Render default input function
  function renderDefaultInput(type, options = []) {
    defaultValueContainer.innerHTML = "";

    if (type === "string") {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Default value";
      defaultValueContainer.appendChild(input);
    } else if (type === "checkbox") {
      const input = document.createElement("input");
      input.type = "checkbox";
      defaultValueContainer.appendChild(input);
    } else if (type === "dropdown") {
      // No default value input for dropdown
    }
  }

  // Initial default input
  renderDefaultInput("string");

  // Show/hide dropdown section + change default input
  typeSelect.onchange = () => {
    if (typeSelect.value === "dropdown") {
      dropdownSection.classList.remove("hidden");
      renderDefaultInput("dropdown");
    } else if (typeSelect.value === "checkbox") {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("checkbox");
    } else {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("string");
    }
  };

  saveBtn.onclick = () => {
    const paramName = nameInput.value.trim();
    if (!paramName) {
      alert("Parameter name cannot be empty.");
      return;
    }

    if (!validNameRegex.test(paramName)) {
      alert("Invalid parameter name. Use only letters, numbers, and underscores.");
      return;
    }

    const paramType = typeSelect.value;
    let paramValue;

    if (paramType === "dropdown") {
      const items = Array.from(valuesList.querySelectorAll("input"))
        .map(i => i.value.trim())
        .filter(v => v);

      paramValue = {
        type: "dropdown",
        options: items,
        default: items.length > 0 ? items[0] : ""
      };
    } else if (paramType === "checkbox") {
      const checkboxEl = defaultValueContainer.querySelector("input[type='checkbox']");
      paramValue = { type: "checkbox", default: checkboxEl && checkboxEl.checked };
    } else {
      const inputEl = defaultValueContainer.querySelector("input[type='text']");
      paramValue = { type: "string", default: inputEl ? inputEl.value.trim() : "" };
    }

    // Handle group ID creation
    if (groupIdCheckbox.checked) {
      // Create group config and set this parameter as group ID
      label.groupConfig = {
        groupIdAttribute: paramName,
        groupAttributes: new Map()
      };
      // Add as regular parameter too
      addParameter(labelPath, paramName, paramValue);
    } else if (hasGroupId && groupAttrCheckbox.checked) {
      // Add as group attribute
      label.groupConfig.groupAttributes.set(paramName, paramValue);
    } else {
      // Add as regular parameter
      addParameter(labelPath, paramName, paramValue);
    }

    inlineEditor.remove();
    const nodeId = labelPath.join(".");
    expandedNodes.add(nodeId);
    renderTree();
  };

  // Assemble the editor
  inlineEditor.appendChild(nameInput);
  inlineEditor.appendChild(typeSelect);
  inlineEditor.appendChild(dropdownSection);
  inlineEditor.appendChild(defaultValueContainer);
  inlineEditor.appendChild(groupIdSection);
  inlineEditor.appendChild(groupAttrSection);
  inlineEditor.appendChild(saveBtn);

  container.appendChild(inlineEditor);
  nameInput.focus();
}

function promptEditGroupAttribute(labelPath, attrName, attrValue, container) {
  // Close any existing inline editors first
  closeAllInlineEditors();
  
  const inlineEditor = document.createElement("div");
  inlineEditor.className = "inline-editor";

  let paramType = "string";
  let defaultVal = "";
  let options = [];

  if (typeof attrValue === "object" && attrValue.type) {
    paramType = attrValue.type;
    defaultVal = attrValue.default || "";
    options = attrValue.options || [];
  } else {
    defaultVal = attrValue || "";
  }

  // Name input
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = attrName;
  nameInput.placeholder = "Group attribute name";

  // Type selector
  const typeSelect = document.createElement("select");
  ["string", "dropdown", "checkbox"].forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    if (t === paramType) opt.selected = true;
    typeSelect.appendChild(opt);
  });

  // Default value container
  const defaultValueContainer = document.createElement("div");
  defaultValueContainer.className = "default-value-container";

  // Dropdown section
  const dropdownSection = document.createElement("div");
  dropdownSection.className = "dropdown-section" + (paramType === "dropdown" ? "" : " hidden");

  const valuesList = document.createElement("div");
  valuesList.className = "dropdown-values";

  // Populate existing options
  options.forEach(optVal => {
    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.value = optVal;
    valuesList.appendChild(itemInput);
  });

  const addValueBtn = document.createElement("button");
  addValueBtn.textContent = "+ Add option";
  addValueBtn.type = "button";
  addValueBtn.onclick = () => {
    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.placeholder = "Option";
    valuesList.appendChild(itemInput);
  };

  dropdownSection.appendChild(addValueBtn);
  dropdownSection.appendChild(valuesList);

  // Render default input function
  function renderDefaultInput(type, current = "") {
    defaultValueContainer.innerHTML = "";

    if (type === "string") {
      const input = document.createElement("input");
      input.type = "text";
      input.value = current;
      input.placeholder = "Default value";
      defaultValueContainer.appendChild(input);
    } else if (type === "checkbox") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = current === true || current === "true";
      defaultValueContainer.appendChild(input);
    }
  }

  renderDefaultInput(paramType, defaultVal);

  // Type change handler
  typeSelect.onchange = () => {
    if (typeSelect.value === "dropdown") {
      dropdownSection.classList.remove("hidden");
      renderDefaultInput("dropdown", "");
    } else if (typeSelect.value === "checkbox") {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("checkbox", false);
    } else {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("string", "");
    }
  };

  // Save button
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "save-btn green";

  const validNameRegex = /^[A-Za-z0-9_]+$/;

  saveBtn.onclick = () => {
    const newAttrName = nameInput.value.trim();
    if (!newAttrName || !validNameRegex.test(newAttrName)) {
      alert("Invalid group attribute name.");
      return;
    }

    const newParamType = typeSelect.value;
    let newAttrValue;
    
    if (newParamType === "dropdown") {
      const items = Array.from(valuesList.querySelectorAll("input"))
        .map(i => i.value.trim())
        .filter(v => v);

      newAttrValue = {
        type: "dropdown",
        options: items,
        default: items.length > 0 ? items[0] : ""
      };
    } else if (newParamType === "checkbox") {
      const checkboxEl = defaultValueContainer.querySelector("input[type='checkbox']");
      newAttrValue = { type: "checkbox", default: checkboxEl && checkboxEl.checked };
    } else {
      const inputEl = defaultValueContainer.querySelector("input[type='text']");
      newAttrValue = { type: "string", default: inputEl ? inputEl.value.trim() : "" };
    }

    const label = getLabelByPath(labelPath);
    if (label && label.groupConfig) {
      // Remove old attribute if name changed
      if (newAttrName !== attrName) {
        label.groupConfig.groupAttributes.delete(attrName);
      }
      // Add new/updated attribute
      label.groupConfig.groupAttributes.set(newAttrName, newAttrValue);
    }

    inlineEditor.remove();
    const nodeId = labelPath.join(".");
    expandedNodes.add(nodeId);
    renderTree();
  };

  // Assemble editor
  inlineEditor.appendChild(nameInput);
  inlineEditor.appendChild(typeSelect);
  inlineEditor.appendChild(dropdownSection);
  inlineEditor.appendChild(defaultValueContainer);
  inlineEditor.appendChild(saveBtn);

  container.appendChild(inlineEditor);
  nameInput.focus();
}


function promptEditParameter(labelPath, oldParamName, oldParamValue, container) {
  if (!container) {
    console.error("Container is undefined or null!");
    return;
  }

  // Close any existing inline editors first
  closeAllInlineEditors();

  const label = getLabelByPath(labelPath);
  
  // Check if this is the group ID parameter
  const isGroupId = label && label.groupConfig && label.groupConfig.groupIdAttribute === oldParamName;

  const inlineEditor = document.createElement("div");
  inlineEditor.className = "inline-editor";

  // Extract type/value
  let paramType = "string";
  let defaultVal = "";
  let options = [];

  if (typeof oldParamValue === "object" && oldParamValue.type) {
    paramType = oldParamValue.type;
    defaultVal = oldParamValue.default || "";
    options = oldParamValue.options || [];
  } else {
    defaultVal = oldParamValue || "";
  }

  // Name input (disabled if it's the group ID)
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = oldParamName;
  nameInput.placeholder = "Parameter name";
  if (isGroupId) {
    nameInput.disabled = true;
    nameInput.title = "Cannot rename group ID parameter. Delete the group first.";
  }

  // Type selector
  const typeSelect = document.createElement("select");
  ["string", "dropdown", "checkbox"].forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    if (t === paramType) opt.selected = true;
    typeSelect.appendChild(opt);
  });

  // Dynamic default value container
  const defaultValueContainer = document.createElement("div");
  defaultValueContainer.className = "default-value-container";

  // Dropdown values section
  const dropdownSection = document.createElement("div");
  dropdownSection.className = "dropdown-section" + (paramType === "dropdown" ? "" : " hidden");

  const valuesList = document.createElement("div");
  valuesList.className = "dropdown-values";

  options.forEach(optVal => {
    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.value = optVal;
    valuesList.appendChild(itemInput);
  });

  const addValueBtn = document.createElement("button");
  addValueBtn.textContent = "+ Add option";
  addValueBtn.type = "button";
  addValueBtn.onclick = () => {
    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.placeholder = "Option";
    valuesList.appendChild(itemInput);
  };

  dropdownSection.appendChild(addValueBtn);
  dropdownSection.appendChild(valuesList);

  // Render default value input depending on type
  function renderDefaultInput(type, options = [], current = "") {
    defaultValueContainer.innerHTML = "";

    if (type === "string") {
      const input = document.createElement("input");
      input.type = "text";
      input.value = current;
      input.placeholder = "Default value";
      defaultValueContainer.appendChild(input);
    } else if (type === "checkbox") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = current === true || current === "true";
      defaultValueContainer.appendChild(input);
    } else if (type === "dropdown") {
      // No default value input for dropdown
    }
  }

  renderDefaultInput(paramType, options, defaultVal);

  // Show/hide on type change
  typeSelect.onchange = () => {
    if (typeSelect.value === "dropdown") {
      dropdownSection.classList.remove("hidden");
      const items = Array.from(valuesList.querySelectorAll("input")).map(i => i.value.trim()).filter(v => v);
      renderDefaultInput("dropdown", items, "");
    } else if (typeSelect.value === "checkbox") {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("checkbox", [], false);
    } else {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("string", [], "");
    }
  };

  // Info message if editing group ID
  if (isGroupId) {
    const infoMsg = document.createElement("div");
    infoMsg.className = "group-section gold-section";
    infoMsg.style.fontSize = "12px";
    infoMsg.style.fontStyle = "italic";
    infoMsg.textContent = "⚠️ Editing the Group ID parameter. Name cannot be changed.";
    inlineEditor.appendChild(infoMsg);
  }

  // Save button
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "save-btn green";

  const validNameRegex = /^[A-Za-z0-9_]+$/;

  saveBtn.onclick = () => {
    const paramName = nameInput.value.trim();
    if (!paramName) {
      alert("Parameter name cannot be empty.");
      return;
    }

    // Check param name validity
    if (!validNameRegex.test(paramName)) {
      alert("Invalid parameter name. Use only letters, numbers, and underscores (no spaces or special characters).");
      return;
    }

    const paramType = typeSelect.value;
    let paramValue;

    if (paramType === "dropdown") {
      const items = Array.from(valuesList.querySelectorAll("input"))
        .map(i => i.value.trim())
        .filter(v => v);

      // Check each option
      for (const item of items) {
        if (!validNameRegex.test(item)) {
          alert(`Invalid option "${item}". Use only letters, numbers, and underscores (no spaces or special characters).`);
          return;
        }
      }

      paramValue = {
        type: "dropdown",
        options: items,
        default: items.length > 0 ? items[0] : ""
      };
    } else if (paramType === "checkbox") {
      const checkboxEl = defaultValueContainer.querySelector("input[type='checkbox']");
      paramValue = { type: "checkbox", default: checkboxEl && checkboxEl.checked };
    } else {
      const inputEl = defaultValueContainer.querySelector("input[type='text']");
      paramValue = { type: "string", default: inputEl ? inputEl.value.trim() : "" };
    }

    // Delete old parameter if name changed (and it's not the group ID)
    if (paramName !== oldParamName && !isGroupId) {
      deleteParameter(labelPath, oldParamName);
    }

    // Save the parameter
    addParameter(labelPath, paramName, paramValue);
    
    inlineEditor.remove();
    const nodeId = labelPath.join(".");
    expandedNodes.add(nodeId);
    renderTree();
  };

  // Assemble the editor
  inlineEditor.appendChild(nameInput);
  inlineEditor.appendChild(typeSelect);
  inlineEditor.appendChild(dropdownSection);
  inlineEditor.appendChild(defaultValueContainer);
  inlineEditor.appendChild(saveBtn);

  container.appendChild(inlineEditor);
  nameInput.focus();
}

// ======= Parameter Menu for Labeled Text =======
function showParameterMenu(labelElement, x, y) {
  hideContextMenu();
  hideParameterMenu();

  currentParamElement = labelElement;

  const labelName = labelElement.getAttribute("labelName");
  const parent = labelElement.getAttribute("parent") || "";

  if (!labelName) return;

  const path = parent ? [parent, labelName] : [labelName];
  const labelData = getLabelByPath(path);

  if (!labelData || labelData.params.size === 0) {
    return;
  }

  elements.paramMenuTitle.textContent = `Edit Parameters - ${labelName}`;
  elements.paramForm.innerHTML = "";

  // Add close button if it doesn't exist
  let closeBtn = elements.paramMenu.querySelector('.param-close-btn');
  if (!closeBtn) {
    closeBtn = document.createElement('button');
    closeBtn.className = 'param-close-btn';
    closeBtn.textContent = '×';
    closeBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent dragging when clicking close button
      hideParameterMenu();
    };
    elements.paramMenu.appendChild(closeBtn);
  }

  // Collect group attribute names to exclude them
  const groupAttributeNames = new Set();
  if (labelData.groupConfig && labelData.groupConfig.groupAttributes) {
    labelData.groupConfig.groupAttributes.forEach((value, name) => {
      groupAttributeNames.add(name);
    });
  }

  // Create inputs only for non-group parameters
  labelData.params.forEach((paramDef, paramName) => {
    // Skip if this is a group attribute (silver)
    if (groupAttributeNames.has(paramName)) {
      return;
    }

    const paramRow = document.createElement("div");
    paramRow.className = "param-row";
    paramRow.style.position = "relative";

    const label = document.createElement("label");
    label.textContent = paramName + ":";

    // Check if this is the group ID (gold) parameter
    const isGroupId = labelData.groupConfig && labelData.groupConfig.groupIdAttribute === paramName;
    if (isGroupId) {
      label.classList.add("gold-label");
    }

    let input;

    if (typeof paramDef === "object" && paramDef.type) {
      const type = paramDef.type;
      const currentVal = labelElement.getAttribute(paramName) ?? paramDef.default ?? "";

      if (type === "string") {
        input = document.createElement("input");
        input.type = "text";
        input.value = currentVal;
        
        const allSuggestions = collectParameterSuggestions(labelName, parent, paramName);
        
        let suggestionDropdown = null;
        
        input.oninput = (e) => {
          const inputValue = e.target.value;
          const filtered = filterSuggestions(allSuggestions, inputValue);
          
          if (suggestionDropdown) suggestionDropdown.remove();
          
          if (filtered.length > 0 && inputValue.length > 0) {
            suggestionDropdown = createSuggestionDropdown(input, filtered);
            if (suggestionDropdown) {
              paramRow.appendChild(suggestionDropdown);
            }
          }
        };
        
        input.onkeydown = (e) => {
          if (handleSuggestionKeydown(e, input, suggestionDropdown)) {
            if (e.key === 'Enter' || e.key === 'Escape') {
              suggestionDropdown = null;
            }
          }
        };
        
        input.onblur = () => {
          setTimeout(() => {
            if (suggestionDropdown) {
              suggestionDropdown.remove();
              suggestionDropdown = null;
            }
          }, 200);
        };
        
      } else if (type === "checkbox") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = currentVal === true || currentVal === "true";
      } else if (type === "dropdown") {
        input = document.createElement("select");
        (paramDef.options || []).forEach((optVal) => {
          const opt = document.createElement("option");
          opt.value = optVal;
          opt.textContent = optVal;
          if (optVal === currentVal) opt.selected = true;
          input.appendChild(opt);
        });
      }
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.value = labelElement.getAttribute(paramName) || paramDef || "";
      
      const allSuggestions = collectParameterSuggestions(labelName, parent, paramName);
      
      let suggestionDropdown = null;
      
      input.oninput = (e) => {
        const inputValue = e.target.value;
        const filtered = filterSuggestions(allSuggestions, inputValue);
        
        if (suggestionDropdown) suggestionDropdown.remove();
        
        if (filtered.length > 0 && inputValue.length > 0) {
          suggestionDropdown = createSuggestionDropdown(input, filtered);
          if (suggestionDropdown) {
            paramRow.appendChild(suggestionDropdown);
          }
        }
      };
      
      input.onkeydown = (e) => {
        if (handleSuggestionKeydown(e, input, suggestionDropdown)) {
          if (e.key === 'Enter' || e.key === 'Escape') {
            suggestionDropdown = null;
          }
        }
      };
      
      input.onblur = () => {
        setTimeout(() => {
          if (suggestionDropdown) {
            suggestionDropdown.remove();
            suggestionDropdown = null;
          }
        }, 200);
      };
    }

    input.dataset.paramName = paramName;

    paramRow.appendChild(label);
    paramRow.appendChild(input);
    elements.paramForm.appendChild(paramRow);
  });

  // Position menu
  const menuWidth = 250;
  const menuHeight = 200;

  x = Math.min(x, window.innerWidth - menuWidth - 10);
  y = Math.min(y, window.innerHeight - menuHeight - 10);

  elements.paramMenu.style.left = `${x}px`;
  elements.paramMenu.style.top = `${y}px`;
  elements.paramMenu.classList.remove("hidden");
  
  // Make the parameter menu draggable by its header
  makeDraggable(elements.paramMenu, elements.paramMenuTitle);
  
  // Focus on first input and setup Enter key navigation
  const allInputs = elements.paramForm.querySelectorAll('input, select');
  if (allInputs.length > 0) {
    // Focus on first input
    allInputs[0].focus();
    
    // Add Enter key navigation to all inputs
    allInputs.forEach((input, index) => {
      // Store original keydown handler if it exists
      const originalKeydownHandler = input.onkeydown;
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          // First check if suggestions are handling the event
          let suggestionHandled = false;
          if (originalKeydownHandler) {
            // Call the original handler and check if it handled the event
            const suggestionDropdown = input.parentElement.querySelector('.suggestion-dropdown');
            if (suggestionDropdown) {
              suggestionHandled = handleSuggestionKeydown(e, input, suggestionDropdown);
            }
          }
          
          // Only navigate if suggestions didn't handle the Enter key
          if (!suggestionHandled) {
            e.preventDefault();
            if (index < allInputs.length - 1) {
              // Move to next input
              allInputs[index + 1].focus();
            } else {
              // Last input - close the menu
              hideParameterMenu();
            }
          }
        }
      });
    });
  }
}


  function hideParameterMenu() {
    // Auto-save parameters before closing
    saveParameters();
    
    elements.paramMenu.classList.add('hidden');
    currentParamElement = null;
  }


  function syncGroupAttributes(labelElement, groupId, updatedAttributes) {
  const labelName = labelElement.getAttribute('labelName');
  const parent = labelElement.getAttribute('parent') || '';
  const path = parent ? [parent, labelName] : [labelName];
  const label = getLabelByPath(path);
  
  if (!label || !label.groupConfig) return;
  
  // Find all elements with the same group ID
  const allLabelElements = elements.htmlContent.querySelectorAll('manual_label');
  const sameGroupElements = Array.from(allLabelElements).filter(el => {
    const elLabelName = el.getAttribute('labelName');
    const elParent = el.getAttribute('parent') || '';
    const elPath = elParent ? [elParent, elLabelName] : [elLabelName];
    const elLabel = getLabelByPath(elPath);
    
    if (!elLabel || !elLabel.groupConfig) return false;
    
    const elGroupId = el.getAttribute(elLabel.groupConfig.groupIdAttribute);
    return elGroupId === groupId;
  });
  
  // Update all elements in the same group
  sameGroupElements.forEach(el => {
    updatedAttributes.forEach((value, attrName) => {
      el.setAttribute(attrName, value);
    });
  });
  
  updateCurrentHtmlFromDOM();
  updateStats();
}

  // ======= Enhanced Parameter Saving for Multi-Selection =======
function saveParameters() {
  if (!currentParamElement) return;

  // Get parameter values from form
  const paramValues = {};
  const elems = elements.paramForm.querySelectorAll('[data-param-name]');
  elems.forEach(el => {
    const paramName = el.dataset.paramName;
    let paramValue = '';

    if (el.tagName.toLowerCase() === 'input' && el.type === 'checkbox') {
      paramValue = el.checked ? 'true' : 'false';
    } else if (el.tagName.toLowerCase() === 'select') {
      paramValue = el.value ?? '';
    } else if (el.tagName.toLowerCase() === 'input') {
      paramValue = el.value ?? '';
    } else {
      paramValue = el.value ?? '';
    }

    paramValues[paramName] = paramValue;
  });

  // Check if this label has group configuration
  const labelName = currentParamElement.getAttribute('labelName');
  const parent = currentParamElement.getAttribute('parent') || '';
  const path = parent ? [parent, labelName] : [labelName];
  const label = getLabelByPath(path);
  
  if (label && label.groupConfig) {
    const groupIdAttr = label.groupConfig.groupIdAttribute;
    const groupId = currentParamElement.getAttribute(groupIdAttr);
    
    if (groupId) {
      // Separate group attributes from regular parameters
      const groupUpdates = new Map();
      
      label.groupConfig.groupAttributes.forEach((attrDef, attrName) => {
        if (paramValues[attrName] !== undefined) {
          groupUpdates.set(attrName, paramValues[attrName]);
        }
      });
      
      if (groupUpdates.size > 0) {
        syncGroupAttributes(currentParamElement, groupId, groupUpdates);
      }
    }
  }

  // Apply parameters to current element
  Object.entries(paramValues).forEach(([paramName, paramValue]) => {
    currentParamElement.setAttribute(paramName, paramValue);
  });

  // If we have multiple elements from multi-selection, apply to all
  if (window.currentMultiLabelElements && window.currentMultiLabelElements.length > 1) {
    window.currentMultiLabelElements.forEach(element => {
      if (element !== currentParamElement) {
        Object.entries(paramValues).forEach(([paramName, paramValue]) => {
          element.setAttribute(paramName, paramValue);
        });
      }
    });
    
    // Clear the reference
    window.currentMultiLabelElements = null;
  }

  // Update storage based on context
  const isInAdvancedContent = elements.advancedContent.contains(currentParamElement);
  const isInHtmlContent = elements.htmlContent.contains(currentParamElement);

  if (isInHtmlContent) {
    updateCurrentHtmlFromDOM();
  }

  // Don't call hideParameterMenu() here to avoid infinite loop
  // The caller of saveParameters() will handle closing the menu
  updateStats();
  refreshGroupsDisplay();
}

// Function to collect existing parameter values for suggestions
function collectParameterSuggestions(labelName, parent, paramName) {
  const suggestions = new Set();
  
  // Find all mentions with same label and parent
  const mentions = elements.htmlContent.querySelectorAll('manual_label');
  mentions.forEach(mention => {
    const mentionLabel = mention.getAttribute('labelName');
    const mentionParent = mention.getAttribute('parent') || '';
    
    if (mentionLabel === labelName && mentionParent === parent) {
      const paramValue = mention.getAttribute(paramName);
      if (paramValue && paramValue.trim()) {
        suggestions.add(paramValue.trim());
      }
    }
  });
  
  return Array.from(suggestions).sort();
}

// Function to create suggestion dropdown
function createSuggestionDropdown(input, suggestions) {
  // Remove existing dropdown
  const existingDropdown = input.parentElement.querySelector('.suggestion-dropdown');
  if (existingDropdown) {
    existingDropdown.remove();
  }
  
  if (suggestions.length === 0) return null;
  
  const dropdown = document.createElement('div');
  dropdown.className = 'suggestion-dropdown';

  
  suggestions.forEach((suggestion, index) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = suggestion;

    
    if (index === 0) {
      item.classList.add('highlighted');
    }
    
    item.onclick = () => {
      input.value = suggestion;
      dropdown.remove();
      input.focus();
    };
    
    dropdown.appendChild(item);
  });
  
  return dropdown;
}

// Function to filter suggestions based on input
function filterSuggestions(allSuggestions, inputValue) {
  if (!inputValue) return allSuggestions;
  
  const filtered = allSuggestions.filter(suggestion => 
    suggestion.toLowerCase().startsWith(inputValue.toLowerCase())
  );
  
  return filtered;
}

// Function to handle keyboard navigation in suggestions
function handleSuggestionKeydown(event, input, dropdown) {
  if (!dropdown) return false;
  
  const items = dropdown.querySelectorAll('.suggestion-item');
  const highlighted = dropdown.querySelector('.suggestion-item.highlighted');
  let currentIndex = Array.from(items).indexOf(highlighted);
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (highlighted) highlighted.classList.remove('highlighted');
      
      currentIndex = (currentIndex + 1) % items.length;
      items[currentIndex].classList.add('highlighted');
      return true;
      
    case 'ArrowUp':
      event.preventDefault();
      if (highlighted) highlighted.classList.remove('highlighted');
      
      currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      items[currentIndex].classList.add('highlighted');
      return true;
      
    case 'Enter':
      event.preventDefault();
      if (highlighted) {
        input.value = highlighted.textContent;
        dropdown.remove();
      }
      return true;
      
    case 'Escape':
      dropdown.remove();
      return true;
      
    default:
      return false;
  }
}

// ======= Group Display functions =======
function refreshGroupsDisplay() {
  const groupsList = document.getElementById('groups-list');
  if (!groupsList) return;
  
  // Clear any active group filter when refreshing
  clearGroupFilter();
  
  groupsList.innerHTML = '';
  
  // Collect all active groups from the HTML content
  const activeGroups = collectActiveGroups();
  
  if (activeGroups.size === 0) {
    const noGroupsDiv = document.createElement('div');
    noGroupsDiv.className = 'no-groups';
    noGroupsDiv.textContent = 'No active groups in document';
    groupsList.appendChild(noGroupsDiv);
    return;
  }
  
  activeGroups.forEach((groupData, groupKey) => {
    const { labelName, groupId, groupIdAttr, groupAttributes, values } = groupData;
    
    // Create group node container
    const groupNode = document.createElement('div');
    groupNode.className = 'tree-node';
    
    // Create main group item (similar to tree-item)
    const groupItem = document.createElement('div');
    groupItem.className = 'tree-item level-0 group-item';
    groupItem.dataset.editing = 'false';
    
    // Expand/collapse button - only show if group has attributes
    const expandBtn = document.createElement('button');
    if (groupAttributes.size === 0) {
      expandBtn.className = 'tree-expand-btn no-children';
    } else {
      expandBtn.className = `tree-expand-btn ${expandedGroups.has(groupKey) ? 'expanded' : 'collapsed'}`;
      expandBtn.onclick = (e) => {
        e.stopPropagation();
        toggleGroupExpansion(groupKey);
      };
    }
    
    // Get label color for the colored circle icon
    const label = getLabelByPath([labelName]);
    const labelColor = label ? label.color : '#6aa3ff';
    
    // Group icon - colored circle instead of folder
    const icon = document.createElement('div');
    icon.className = 'tree-color-indicator';
    icon.style.backgroundColor = labelColor;
    icon.style.border = '1px solid var(--border)';
    icon.style.width = '12px';
    icon.style.height = '12px';
    icon.style.borderRadius = '50%';
    icon.style.marginRight = '10px';
    icon.style.flexShrink = '0';
    
    // Group title and gold parameter (group ID)
    const titleSpan = document.createElement('div');
    titleSpan.className = 'tree-label';
    titleSpan.textContent = `${labelName} - `;
    
    // Add the group ID as an editable element
    const groupIdSpan = document.createElement('span');
    groupIdSpan.className = 'tree-param-value group-id-value';
    groupIdSpan.dataset.paramName = groupIdAttr;
    groupIdSpan.textContent = groupId === 'undefined' ? '' : groupId;
    titleSpan.appendChild(groupIdSpan);
    
    // Actions (modify button - always show if there are attributes or group ID to modify)
    const actions = document.createElement('div');
    actions.className = 'tree-actions';
    
    // Always show modify button (for both group ID and attributes)
    const modifyBtn = document.createElement('button');
    modifyBtn.className = 'tree-action-btn edit';
    modifyBtn.title = 'Modify group ID and attributes';
    modifyBtn.onclick = (e) => {
      e.stopPropagation();
      toggleGroupEdit(groupItem, groupKey);
    };
    
    actions.appendChild(modifyBtn);
    
    // Add click handler for group filtering
    groupItem.onclick = (e) => {
      // Don't trigger if clicking on actions or expand button
      if (e.target.closest('.tree-actions') || e.target.closest('.tree-expand-btn')) {
        return;
      }
      toggleGroupFilter(groupKey, labelName, groupData.groupId, groupData.groupIdAttr);
    };
    
    // Assemble group header
    groupItem.appendChild(expandBtn);
    groupItem.appendChild(icon);
    groupItem.appendChild(titleSpan);
    groupItem.appendChild(actions);
    
    // Create children container for attributes (only if there are attributes)
    const childrenDiv = document.createElement('div');
    if (groupAttributes.size === 0) {
      childrenDiv.className = 'tree-children collapsed';
    } else {
      childrenDiv.className = `tree-children ${expandedGroups.has(groupKey) ? 'expanded' : 'collapsed'}`;
    }
    
    // Add attributes as child items
    groupAttributes.forEach((attrDef, attrName) => {
      const attrNode = document.createElement('div');
      attrNode.className = 'tree-node';
      
      const attrItem = document.createElement('div');
      attrItem.className = 'tree-item level-1 group-attribute-item';
      
      // Empty expand button for alignment
      const attrExpandBtn = document.createElement('button');
      attrExpandBtn.className = 'tree-expand-btn no-children';
      
      // Attribute icon (silver)
      const attrIcon = document.createElement('div');
      attrIcon.className = 'tree-icon param param-silver';
      
      // Attribute name
      const attrLabel = document.createElement('div');
      attrLabel.className = 'tree-label';
      attrLabel.textContent = attrName;
      
      // Attribute value
      const attrValue = document.createElement('div');
      attrValue.className = 'tree-param-value';
      attrValue.dataset.attrName = attrName;
      
      const currentValue = values.get(attrName) || attrDef.default || '';
      
      if (attrDef.type === 'checkbox') {
        attrValue.textContent = currentValue === 'true' ? '✓' : '✗';
      } else {
        attrValue.textContent = currentValue;
      }
      
      // Assemble attribute item
      attrItem.appendChild(attrExpandBtn);
      attrItem.appendChild(attrIcon);
      attrItem.appendChild(attrLabel);
      attrItem.appendChild(attrValue);
      
      attrNode.appendChild(attrItem);
      childrenDiv.appendChild(attrNode);
    });
    
    // Assemble complete group
    groupNode.appendChild(groupItem);
    groupNode.appendChild(childrenDiv);
    groupsList.appendChild(groupNode);
  });
}

// Toggle group expansion
function toggleGroupExpansion(groupKey) {
  if (expandedGroups.has(groupKey)) {
    expandedGroups.delete(groupKey);
  } else {
    expandedGroups.add(groupKey);
  }
  refreshGroupsDisplay();
}

// Toggle group filter to highlight specific group
function toggleGroupFilter(groupKey, labelName, groupId, groupIdAttr) {
  const isCurrentlyFiltered = activeGroupFilter === groupKey;
  
  // Reset any existing filter
  clearGroupFilter();
  
  if (!isCurrentlyFiltered) {
    // Apply new filter
    activeGroupFilter = groupKey;
    applyGroupFilter(labelName, groupId, groupIdAttr);
    
    // Update group item appearance to show it's active
    const groupItems = document.querySelectorAll('.group-item');
    groupItems.forEach(item => {
      const titleSpan = item.querySelector('.tree-label');
      if (titleSpan && titleSpan.textContent.includes(labelName) && 
          titleSpan.textContent.includes(groupId === 'undefined' ? '' : groupId)) {
        item.classList.add('group-filtered-active');
      }
    });
  }
}

// Apply group filter to HTML content
function applyGroupFilter(labelName, groupId, groupIdAttr) {
  const labelElements = elements.htmlContent.querySelectorAll('manual_label');
  
  labelElements.forEach(labelEl => {
    const elLabelName = labelEl.getAttribute('labelName');
    const elGroupId = labelEl.getAttribute(groupIdAttr) || '';
    const actualGroupId = groupId === 'undefined' ? '' : groupId;
    
    if (elLabelName === labelName && elGroupId === actualGroupId) {
      // This label belongs to the filtered group - highlight it
      labelEl.classList.add('group-filter-highlight');
    } else {
      // This label doesn't belong to the filtered group - dim it
      labelEl.classList.add('group-filter-dimmed');
    }
  });
}

// Clear group filter
function clearGroupFilter() {
  if (activeGroupFilter) {
    // Remove all filter classes from labels
    const labelElements = elements.htmlContent.querySelectorAll('manual_label');
    labelElements.forEach(labelEl => {
      labelEl.classList.remove('group-filter-highlight', 'group-filter-dimmed');
    });
    
    // Remove active state from group items
    const groupItems = document.querySelectorAll('.group-item');
    groupItems.forEach(item => {
      item.classList.remove('group-filtered-active');
    });
    
    activeGroupFilter = null;
  }
}

// Add global click handler to clear group filter when clicking elsewhere
document.addEventListener('click', function(e) {
  // Don't clear if clicking within the groups section
  if (e.target.closest('#groups-section')) {
    return;
  }
  
  // Clear the filter if one is active
  if (activeGroupFilter) {
    clearGroupFilter();
  }
});

// Initialize groups header with expand button
function initializeGroupsHeader() {
  const groupsSection = document.getElementById('groups-section');
  if (groupsSection) {
    const header = groupsSection.querySelector('h3');
    if (header && !header.querySelector('.tree-expand-btn')) {
      // Create expand button
      const expandBtn = document.createElement('button');
      expandBtn.className = `tree-expand-btn ${groupsSectionExpanded ? 'expanded' : 'collapsed'}`;
      expandBtn.style.marginRight = '8px';
      expandBtn.onclick = () => toggleGroupsSection();
      
      // Insert button before the text
      header.insertBefore(expandBtn, header.firstChild);
    }
  }
}

// Toggle entire groups section
function toggleGroupsSection() {
  groupsSectionExpanded = !groupsSectionExpanded;
  const groupsList = document.getElementById('groups-list');
  const header = document.querySelector('#groups-section h3');
  const expandBtn = header.querySelector('.tree-expand-btn');
  
  if (groupsSectionExpanded) {
    groupsList.style.display = 'block';
    expandBtn.className = 'tree-expand-btn expanded';
  } else {
    groupsList.style.display = 'none';
    expandBtn.className = 'tree-expand-btn collapsed';
  }
}



function toggleGroupEdit(groupDiv, groupKey) {
  const isEditing = groupDiv.dataset.editing === 'true';
  const groupNode = groupDiv.parentNode; // Get the parent tree-node
  const attributesDiv = groupNode.querySelector('.tree-children');
  const modifyBtn = groupDiv.querySelector('.tree-action-btn.edit');
  
  if (!isEditing) {
    // Close any other edit sessions without saving
    const allEditingItems = document.querySelectorAll('.tree-item[data-editing="true"]');
    const hasOtherEditing = Array.from(allEditingItems).some(item => item !== groupDiv);
    
    if (hasOtherEditing) {
      // Refresh display to reset all edit states, then re-open this one
      refreshGroupsDisplay();
      
      // Find the group div again after refresh and start editing it
      setTimeout(() => {
        const allGroups = document.querySelectorAll('.group-item');
        const targetGroup = Array.from(allGroups).find(item => {
          const titleSpan = item.querySelector('.tree-label');
          const groupIdValue = titleSpan.querySelector('.group-id-value');
          const [labelName, groupId] = groupKey.split('_');
          const expectedText = groupId === 'undefined' ? '' : groupId;
          return titleSpan.textContent.includes(labelName) && 
                 (groupIdValue ? groupIdValue.textContent === expectedText : true);
        });
        
        if (targetGroup) {
          toggleGroupEdit(targetGroup, groupKey);
        }
      }, 0);
      return;
    }
    // Switch to edit mode
    groupDiv.dataset.editing = 'true';
    modifyBtn.title = 'Save changes';
    modifyBtn.classList.add('save-active');
    
    // Ensure the group is expanded when editing (if it has attributes)
    if (attributesDiv && attributesDiv.children.length > 0 && !expandedGroups.has(groupKey)) {
      expandedGroups.add(groupKey);
      attributesDiv.className = 'tree-children expanded';
      const expandBtn = groupDiv.querySelector('.tree-expand-btn');
      if (expandBtn) expandBtn.className = 'tree-expand-btn expanded';
    }
    
    // Convert group ID (gold parameter) to input
    const groupIdSpan = groupDiv.querySelector('.group-id-value');
    if (groupIdSpan) {
      const currentValue = groupIdSpan.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentValue;
      input.dataset.paramName = groupIdSpan.dataset.paramName;
      input.style.background = 'var(--bg)';
      input.style.color = 'var(--text)';
      input.style.border = '1px solid var(--border)';
      input.style.borderRadius = '4px';
      input.style.padding = '2px 6px';
      input.style.fontSize = '11px';
      input.style.fontFamily = 'ui-monospace, SFMono-Regular, monospace';
      input.style.minWidth = '100px';
      
      groupIdSpan.textContent = '';
      groupIdSpan.appendChild(input);
    }
    
    // Convert attribute values to inputs (silver parameters)
    if (attributesDiv) {
      const attrItems = attributesDiv.querySelectorAll('.tree-item');
      attrItems.forEach(attrItem => {
        const attrValueDiv = attrItem.querySelector('.tree-param-value');
        if (!attrValueDiv) return;
        
        const attrName = attrValueDiv.dataset.attrName;
        const currentValue = attrValueDiv.textContent;
        
        // Get attribute definition to know the type
        const [labelName, groupId] = groupKey.split('_');
        const label = Array.from(labels.values()).find(l => l.name === labelName);
        
        if (label && label.groupConfig) {
          const attrDef = label.groupConfig.groupAttributes.get(attrName);
          
          let input;
          if (attrDef.type === 'string') {
            input = document.createElement('input');
            input.type = 'text';
            input.value = currentValue;
            input.style.background = 'var(--bg)';
            input.style.color = 'var(--text)';
            input.style.border = '1px solid var(--border)';
            input.style.borderRadius = '4px';
            input.style.padding = '2px 6px';
            input.style.fontSize = '11px';
            input.style.fontFamily = 'ui-monospace, SFMono-Regular, monospace';
          } else if (attrDef.type === 'checkbox') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = currentValue === '✓';
          } else if (attrDef.type === 'dropdown') {
            input = document.createElement('select');
            input.style.background = 'var(--bg)';
            input.style.color = 'var(--text)';
            input.style.border = '1px solid var(--border)';
            input.style.borderRadius = '4px';
            input.style.padding = '2px 6px';
            input.style.fontSize = '11px';
            input.style.fontFamily = 'ui-monospace, SFMono-Regular, monospace';
            
            attrDef.options.forEach(opt => {
              const option = document.createElement('option');
              option.value = opt;
              option.textContent = opt;
              if (opt === currentValue) option.selected = true;
              input.appendChild(option);
            });
          }
          
          input.dataset.attrName = attrName;
          attrValueDiv.textContent = '';
          attrValueDiv.appendChild(input);
        }
      });
    }
    
  } else {
    // Save and switch back to display mode
    const [labelName, oldGroupId] = groupKey.split('_');
    
    // Get new group ID from input
    const groupIdInput = groupDiv.querySelector('.group-id-value input');
    const newGroupId = groupIdInput ? groupIdInput.value.trim() : oldGroupId;
    
    // Collect new values for attributes
    const newValues = new Map();
    if (attributesDiv) {
      const inputs = attributesDiv.querySelectorAll('input, select');
      inputs.forEach(input => {
        const attrName = input.dataset.attrName;
        let value;
        
        if (input.type === 'checkbox') {
          value = input.checked ? 'true' : 'false';
        } else {
          value = input.value;
        }
        
        newValues.set(attrName, value);
      });
    }
    
    // Update all labels with this group ID
    updateGroupInDocument(labelName, oldGroupId === 'undefined' ? '' : oldGroupId, newValues, newGroupId);
    
    // Refresh the display
    groupDiv.dataset.editing = 'false';
    modifyBtn.title = 'Modify group ID and attributes';
    modifyBtn.classList.remove('save-active');
    
    refreshGroupsDisplay();
  }
}

function updateGroupInDocument(labelName, oldGroupId, newValues, newGroupId) {
  const labelElements = elements.htmlContent.querySelectorAll('manual_label');
  
  labelElements.forEach(labelEl => {
    const elLabelName = labelEl.getAttribute('labelName');
    
    if (elLabelName === labelName) {
      const parent = labelEl.getAttribute('parent') || '';
      const path = parent ? [parent, labelName] : [labelName];
      const label = getLabelByPath(path);
      
      if (label && label.groupConfig) {
        const groupIdAttr = label.groupConfig.groupIdAttribute;
        const elGroupId = labelEl.getAttribute(groupIdAttr) || '';
        
        if (elGroupId === oldGroupId) {
          // Update group ID (gold parameter) if changed
          if (newGroupId !== undefined && newGroupId !== oldGroupId) {
            if (newGroupId === '') {
              labelEl.removeAttribute(groupIdAttr);
            } else {
              labelEl.setAttribute(groupIdAttr, newGroupId);
            }
          }
          
          // Update this element's group attributes (silver parameters)
          newValues.forEach((value, attrName) => {
            if (value === '') {
              labelEl.removeAttribute(attrName);
            } else {
              labelEl.setAttribute(attrName, value);
            }
          });
        }
      }
    }
  });
  
  updateCurrentHtmlFromDOM();
  updateStats();
}

  // ======= Label Options for Context Menu =======

  function getAllLabelsRecursive(labelMap, prefix = []) {
    const result = [];
    labelMap.forEach((label, name) => {
      const fullPath = [...prefix, name];
      const displayName = fullPath.join(' > ');
      result.push({ path: fullPath, label, displayName });

      // Recurse into sublabels
      const sub = getAllLabelsRecursive(label.sublabels, fullPath);
      result.push(...sub);
    });
    return result;
  }

  function updateLabelOptions() {
    elements.labelOptions.innerHTML = "";

    const allLabels = getAllLabelsRecursive(labels);

    if (allLabels.length === 0) {
      const noLabels = document.createElement("div");
      noLabels.className = "no-labels";
      noLabels.textContent = "No labels defined";
      elements.labelOptions.appendChild(noLabels);
      return;
    }

    allLabels.forEach(({ path, label, displayName }) => {
      const option = document.createElement("button");
      option.className = "label-option";
      option.textContent = displayName;
      option.style.backgroundColor = label.color;
      option.style.color = getContrastColor(label.color);

      option.onclick = (e) => {
        e.stopPropagation();
        applyLabelToSelection(path, label);
      };

      elements.labelOptions.appendChild(option);
    });
  }

// ======= toggle view function =======
function toggleView() {
  if (!currentHtml) return;
  
  let currentScrollRatio = 0;
  
  // Get current scroll position before switching
  if (isSourceView) {
    const sourceRatio = getScrollPosition(elements.sourceView);
    currentScrollRatio = mapSourceToRendered(sourceRatio, elements.sourceView.value);
    
    // If switching from source view and it was modified, ask user
    if (sourceViewModified) {
      const shouldSave = confirm(
        "You have unsaved changes in the source view.\n\n" +
        "👉 Press Ctrl+S to save your changes.\n" +
        "👉 Press Ctrl+Z to undo recent edits.\n\n" +
        "Do you want to apply them now? (Cancel will discard changes)"
      );
      if (shouldSave) {
        applySourceChanges();
      } else {
        // Reset source view to current HTML
        elements.sourceView.value = currentHtml;
        sourceViewModified = false;
      }
    }
  } else {
    const renderedRatio = getScrollPosition(elements.htmlContent);
    currentScrollRatio = renderedRatio; // Store rendered ratio for mapping
  }
  
  // Toggle view state
  isSourceView = !isSourceView;
  
  // Update button text and style
  if (isSourceView) {
    elements.viewToggle.textContent = 'View Rendered';
    elements.viewToggle.classList.add('active');
  } else {
    elements.viewToggle.textContent = 'View Source';
    elements.viewToggle.classList.remove('active');
  }
  
  // Re-render content
  renderHtmlContent();
  
  // If switching back to rendered view and there's text in advanced content, restore search
  if (!isSourceView) {
    const advancedText = getCleanAdvancedText();
    if (advancedText) {
      console.log('Restoring search after view toggle');
      searchInHtmlContent(advancedText);
    }
  }
  
  // Apply scroll position to new view after a small delay
  setTimeout(() => {
    if (isSourceView) {
      // Map rendered ratio to source ratio
      const sourceRatio = mapRenderedToSource(currentScrollRatio, elements.sourceView.value);
      setScrollPosition(elements.sourceView, sourceRatio);
    } else {
      // Direct mapping for rendered view
      setScrollPosition(elements.htmlContent, currentScrollRatio);
    }
  }, 10);
}

function applySourceChanges() {
  try {
    const newHtml = elements.sourceView.value;
    
    // Validate HTML by parsing it
    const parser = new DOMParser();
    const doc = parser.parseFromString(newHtml, 'text/html');
    
    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid HTML syntax');
    }
    
    // Update current HTML
    currentHtml = newHtml;
    
    // Re-extract labels from the modified HTML
    extractExistingLabels(currentHtml);
    
    // Reset modification flag
    sourceViewModified = false;
    
    // If we're in rendered view, update it
    if (!isSourceView) {
      renderHtmlContent();
    }
    
    console.log('Source changes applied successfully');
    
  } catch (error) {
    alert('Error applying changes: ' + error.message + '\nPlease check your HTML syntax.');
    console.error('Error applying source changes:', error);
  }
}

  // ======= HTML Processing =======
  function extractExistingLabels(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  // 1. Find the <!-- HTMLLabelizer ... --> comment
  let schema = null;
  const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT, null, false);
  while (walker.nextNode()) {
    const comment = walker.currentNode.nodeValue.trim();
    if (comment.startsWith("HTMLLabelizer")) {
      try {
        const jsonPart = comment.replace("HTMLLabelizer", "").trim();
        schema = JSON.parse(jsonPart);
      } catch (e) {
        console.warn("Invalid HTMLLabelizer schema:", e);
      }
      break;
    }
  }

  // 2. If schema found, clear existing labels and build from schema
  if (schema) {
    console.log("HTMLLabelizer schema found - rebuilding label tree from document");
    labels.clear();
    buildLabelsFromSchema(schema);

    refreshTreeUI();
  } else {
    console.log("No HTMLLabelizer schema found - preserving existing label tree");
    // If no schema found, preserve the existing tree
    // Only refresh the UI without clearing labels
    if (labels.size > 0) {
      refreshTreeUI();
    }
  }

  
}



// Update collectActiveGroups to handle empty/undefined group IDs:
function collectActiveGroups() {
  const groups = new Map();
  
  const labelElements = elements.htmlContent.querySelectorAll('manual_label');
  
  labelElements.forEach(labelEl => {
    const labelName = labelEl.getAttribute('labelName');
    const parent = labelEl.getAttribute('parent') || '';
    const path = parent ? [parent, labelName] : [labelName];
    const label = getLabelByPath(path);
    
    if (label && label.groupConfig && label.groupConfig.groupIdAttribute) {
      const groupIdAttr = label.groupConfig.groupIdAttribute;
      
      // Check if element has the group ID attribute (even if empty)
      if (labelEl.hasAttribute(groupIdAttr)) {
        const groupId = labelEl.getAttribute(groupIdAttr) || 'undefined';
        const groupKey = `${labelName}_${groupId}`;
        
        if (!groups.has(groupKey)) {
          const values = new Map();
          
          // Collect FIRST occurrence of each group attribute value
          label.groupConfig.groupAttributes.forEach((attrDef, attrName) => {
            // Find first element with this group ID that has a value for this attribute
            const firstValueElement = Array.from(labelElements).find(el => {
              const elLabelName = el.getAttribute('labelName');
              const elParent = el.getAttribute('parent') || '';
              const elGroupId = el.getAttribute(groupIdAttr);
              
              if (elLabelName === labelName && elParent === parent && elGroupId === groupId) {
                const value = el.getAttribute(attrName);
                return value !== null && value.trim() !== '';
              }
              return false;
            });
            
            const firstValue = firstValueElement 
              ? firstValueElement.getAttribute(attrName) 
              : (attrDef.default || '');
            
            values.set(attrName, firstValue);
          });
          
          groups.set(groupKey, {
            labelName,
            groupId,
            groupIdAttr,
            groupAttributes: label.groupConfig.groupAttributes,
            values
          });
        }
      }
    }
  });
  
  return groups;
}

function buildSchemaFromLabels(map) {
  const obj = {};
  map.forEach(label => {
    const attributes = {};
    
    // Process all regular parameters
    label.params.forEach((paramDef, paramName) => {
      let groupRole = "regular";
      
      // Check if this is the group ID
      if (label.groupConfig && label.groupConfig.groupIdAttribute === paramName) {
        groupRole = "groupID";
      }
      
      attributes[paramName] = {
        ...paramDef,
        groupRole: groupRole
      };
    });
    
    // Add group attributes
    if (label.groupConfig && label.groupConfig.groupAttributes) {
      label.groupConfig.groupAttributes.forEach((attrDef, attrName) => {
        attributes[attrName] = {
          ...attrDef,
          groupRole: "groupAttribute"
        };
      });
    }
    
    obj[label.name] = {
      color: label.color,
      sublabels: buildSchemaFromLabels(label.sublabels),
      attributes: attributes
    };
  });
  return obj;
}

function buildLabelsFromSchema(schema, parent = null, map = labels) {
  Object.entries(schema).forEach(([name, def]) => {
    const paramsMap = new Map();
    let groupConfig = null;
    let groupIdAttribute = null;
    const groupAttributes = new Map();
    
    // Process attributes and separate them by groupRole
    if (def.attributes && typeof def.attributes === "object") {
      Object.entries(def.attributes).forEach(([pname, pdef]) => {
        const { groupRole, ...paramDef } = pdef;
        
        if (groupRole === "groupID") {
          // This is the group ID parameter
          groupIdAttribute = pname;
          paramsMap.set(pname, paramDef);
        } else if (groupRole === "groupAttribute") {
          // This is a group attribute
          groupAttributes.set(pname, paramDef);
        } else {
          // Regular parameter
          paramsMap.set(pname, paramDef);
        }
      });
    }
    
    // Build group config if we have a group ID
    if (groupIdAttribute) {
      groupConfig = {
        groupIdAttribute: groupIdAttribute,
        groupAttributes: groupAttributes
      };
    }

    const labelObj = {
      name,
      color: def.color || generateRandomColor(),
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
}



  function renderHtmlContent() {
    if (!currentHtml) {
      elements.htmlContent.innerHTML = `
        <div class="empty-state drop-zone" id="drop-zone">
          <h3>No HTML loaded</h3>
          <p><a href="#" id="upload-link">Upload an HTML File</a> or drag & drop here to start labeling</p>
        </div>
      `;
      // Update filename display
      if (elements.currentFilename) {
        elements.currentFilename.textContent = '';
      }
      
      // Re-attach event listeners for the newly created elements
      attachEmptyStateEventListeners();
      return;
    }

    // Update filename display
    if (isSourceView) {
      elements.htmlContent.style.display = 'none';
      elements.sourceView.style.display = 'block';
      
      // Set the value only if it hasn't been modified or if we're refreshing
      if (!sourceViewModified) {
        elements.sourceView.value = currentHtml;
      }
      
      return; // Return early when showing source view
    } else {
      elements.htmlContent.style.display = 'block';
      elements.sourceView.style.display = 'none';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHtml, 'text/html');

    const mentions = doc.querySelectorAll('manual_label');

    mentions.forEach(mention => {
      const labelName = mention.getAttributeNames()[0];
      const labelData = getLabelByPath([labelName]);
      if (labelData) {
        mention.style.backgroundColor = labelData.color;
        mention.style.color = getContrastColor(labelData.color);
      }

      if (!mention.querySelector('.delete-btn')) {
        const deleteBtn = doc.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "×";
        mention.appendChild(deleteBtn);
      }
    });

    elements.htmlContent.innerHTML = doc.body.innerHTML;
    
    // Update filename display
    if (elements.currentFilename) {
      elements.currentFilename.textContent = currentFileName || '';
    }
    
    attachLabelEventListeners();
    updateStats();

     refreshGroupsDisplay()
  }

  function attachEmptyStateEventListeners() {
    // Update dropZone reference to the newly created element
    const currentDropZone = document.getElementById('drop-zone');
    if (!currentDropZone) return;

    // Attach upload link event listener
    const uploadLink = document.getElementById('upload-link');
    if (uploadLink) {
      uploadLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('html-file-input').click();
      });
    }

    // Attach drag & drop event listeners
    ['dragenter', 'dragover'].forEach(eventName => {
      currentDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentDropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      currentDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentDropZone.classList.remove('dragover');
      });
    });

    currentDropZone.addEventListener('drop', async (e) => {
      const file = e.dataTransfer.files[0];
      if (!file) return;

      try {
        currentHtml = await readFileAsText(file);
        currentFileName = file.name;

        sourceViewModified = false;
        isSourceView = false;
        elements.viewToggle.textContent = 'View Source';
        elements.viewToggle.classList.remove('active');

        extractExistingLabels(currentHtml);
        renderHtmlContent();
        refreshTreeUI();

        elements.downloadBtn.disabled = false;
        elements.saveAsBtn.disabled = false;
        elements.viewToggle.disabled = false;
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading file. Please try again.');
      }
    });
  }

  function attachLabelEventListeners() {
    const labelElements = elements.htmlContent.querySelectorAll('manual_label');
    labelElements.forEach(labelElement => {
      const deleteBtn = labelElement.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          
          // Extract content while preserving formatting
          const contentToPreserve = extractLabelContentWithFormatting(labelElement);
          
          if (labelElement.parentNode) {
            // Insert the preserved content before the label
            if (contentToPreserve.childNodes.length > 0) {
              Array.from(contentToPreserve.childNodes).forEach(node => {
                labelElement.parentNode.insertBefore(node, labelElement);
              });
            }
            
            // Remove the label element
            labelElement.parentNode.removeChild(labelElement);
            
          } else {
            elements.htmlContent.innerHTML = '';
          }

          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = elements.htmlContent.innerHTML;
          const parser = new DOMParser();
          const doc = parser.parseFromString(currentHtml, 'text/html');
          doc.body.innerHTML = tempDiv.innerHTML;
          currentHtml = doc.documentElement.outerHTML;

          attachLabelEventListeners();
          updateStats();
          refreshGroupsDisplay();
          
          // Refresh search if there's text in advanced content, preserving current match position
          const advancedText = getCleanAdvancedText();
          if (advancedText) {
            const currentMatchIndex = currentSearchSelection?.matchIndex ?? 0;
            console.log('Refreshing search after label deletion, preserving match index:', currentMatchIndex);
            
            // Re-run search
            const matches = searchInHtmlContent(advancedText);
            
            // Try to preserve the current match position
            if (matches.length > 0 && currentMatchIndex < matches.length) {
              setCurrentSearchSelection(matches[currentMatchIndex], currentMatchIndex);
            } else if (matches.length > 0) {
              // If current index is out of bounds, go to the last available match
              const lastIndex = matches.length - 1;
              setCurrentSearchSelection(matches[lastIndex], lastIndex);
            }
          }
        };
      }

      // Click to edit parameters
      labelElement.onclick = (e) => {
        // Don't trigger if clicking delete button
        if (e.target.classList.contains('delete-btn')) return;

        // If there was a selection, do NOT open parameter menu!
        const sel = window.getSelection();
        if (!sel.isCollapsed || multiSelectionMode) return;
        
        e.stopPropagation();

        showParameterMenu(labelElement, e.clientX, e.clientY);
      };
    });
}

function extractLabelContentWithFormatting(labelElement) {
    const contentFragment = document.createDocumentFragment();
    
    // Process each child node, excluding the delete button
    Array.from(labelElement.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains('delete-btn')) {
            return; // Skip delete button
        }
        
        // Clone the node to preserve all formatting
        const clonedNode = child.cloneNode(true);
        contentFragment.appendChild(clonedNode);
    });
    
    return contentFragment;
}


function updateStats() {
    const manualLabels = elements.htmlContent.querySelectorAll('manual_label');
    elements.totalMentions.textContent = manualLabels.length;
    
    // Count total label types (including sublabels)
    let totalLabelTypes = 0;
    function countLabelsRecursive(labelMap) {
      labelMap.forEach((label) => {
        totalLabelTypes++;
        countLabelsRecursive(label.sublabels);
      });
    }
    countLabelsRecursive(labels);
    elements.labelTypes.textContent = totalLabelTypes;
}

  // ======= Selection and Labeling =======
  function showContextMenu(x, y) {
    hideParameterMenu();
    
    const menuWidth = 200;
    const menuHeight = 150;
    
    x = Math.min(x, window.innerWidth - menuWidth - 10);
    y = Math.min(y, window.innerHeight - menuHeight - 10);
    
    elements.contextMenu.style.left = `${x}px`;
    elements.contextMenu.style.top = `${y}px`;
    elements.contextMenu.classList.remove('hidden');
    
    // Make the context menu draggable by its header
    const contextHeader = elements.contextMenu.querySelector('h4');
    if (contextHeader) {
      makeDraggable(elements.contextMenu, contextHeader);
    }
  }

  function hideContextMenu() {
    elements.contextMenu.classList.add('hidden');
  }

  function clearAllSelections() {
    currentSelection = null;
    currentAdvancedMouseSelection = null;
    // Note: We don't clear currentSearchSelection here as it should persist until explicitly cleared
  }

  // Validation function to check if selection crosses manual_label boundaries
function isValidSelection(range) {
  try {
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    
    // Get all nodes within the range
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_ALL,
      {
        acceptNode: function(node) {
          if (range.intersectsNode(node)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    const nodesInRange = [];
    let node;
    while (node = walker.nextNode()) {
      nodesInRange.push(node);
    }
    
    // Check for manual_label boundaries
    for (let node of nodesInRange) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check if we're crossing a manual_label boundary
        if (node.tagName === 'MANUAL_LABEL') {
          // If the range starts or ends inside this manual_label, but not completely contained
          const rangeStartsInside = node.contains(startContainer) || node === startContainer;
          const rangeEndsInside = node.contains(endContainer) || node === endContainer;
          const rangeCompletelyContained = node.contains(startContainer) && node.contains(endContainer);
          
          if ((rangeStartsInside || rangeEndsInside) && !rangeCompletelyContained) {
            return {
              valid: false,
              reason: "Selection cannot cross manual_label boundaries. Please select text that is completely inside or outside existing labels."
            };
          }
        }
        
        // Check for delete buttons
        if (node.classList && node.classList.contains('delete-btn')) {
          return {
            valid: false,
            reason: "Selection cannot include delete buttons (×). Please select only the text content."
          };
        }
      }
    }
    
    // Additional check: ensure we're not selecting across multiple manual_label siblings
    const startLabel = getContainingManualLabel(startContainer);
    const endLabel = getContainingManualLabel(endContainer);
    
    if (startLabel && endLabel && startLabel !== endLabel) {
      return {
        valid: false,
        reason: "Selection cannot span across multiple labels. Please select text within a single label or in unlabeled areas."
      };
    }
    
    // Check if selection contains partial manual_label tags
    const rangeContents = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(rangeContents);
    
    // Look for opening tags without closing tags or vice versa
    const openTags = (tempDiv.innerHTML.match(/<manual_label[^>]*>/g) || []).length;
    const closeTags = (tempDiv.innerHTML.match(/<\/manual_label>/g) || []).length;
    
    if (openTags !== closeTags) {
      return {
        valid: false,
        reason: "Selection creates malformed HTML by partially selecting label tags. Please select complete elements or text only."
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error("Error validating selection:", error);
    return {
      valid: false,
      reason: "Error validating selection. Please try selecting again."
    };
  }
}

// Helper function to find containing manual_label
function getContainingManualLabel(node) {
  let current = node;
  while (current && current !== elements.htmlContent && current !== elements.advancedContent) {
    if (current.nodeType === Node.ELEMENT_NODE && current.tagName === 'MANUAL_LABEL') {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}



// ======= Multi-Selection Functions =======
function addToMultiSelection(range, container) {
  // Validate each selection
  const validation = isValidSelection(range);
  if (!validation.valid) {
    alert("Invalid Selection: " + validation.reason);
    return false;
  }

  const selection = {
    range: range.cloneRange(),
    text: range.toString().trim(),
    isAdvanced: elements.advancedContent.contains(container) || elements.advancedContent === container
  };

  multiSelections.push(selection);
  
  // Visual feedback - highlight the selection temporarily
  highlightMultiSelection(range, multiSelections.length - 1);
  
  return true;
}

function highlightMultiSelection(range, index) {
  try {
    // Get range boundaries for overlay positioning
    const rects = range.getClientRects();
    if (rects.length === 0) return;

    // Store range data for later use
    const rangeData = {
      range: range.cloneRange(),
      rects: Array.from(rects),
      text: range.toString(),
      index: index
    };

    multiSelections[index].rangeData = rangeData;
    
    // Create overlay highlights for each rect
    Array.from(rects).forEach((rect, rectIndex) => {
      const overlay = document.createElement('div');
      overlay.className = 'multi-selection-overlay';
      overlay.dataset.multiIndex = index;
      overlay.dataset.rectIndex = rectIndex;
      
      // Get scroll offsets
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      overlay.style.cssText = `
        position: absolute;
        left: ${rect.left + scrollLeft}px;
        top: ${rect.top + scrollTop}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background-color: rgba(0, 123, 255, 0.3);
        border: 2px dashed #007bff;
        pointer-events: none;
        z-index: 1000;
        border-radius: 2px;
      `;
      
      // Add number indicator for first rect only
      if (rectIndex === 0) {
        const indicator = document.createElement('span');
        indicator.style.cssText = `
          position: absolute;
          top: -20px;
          left: 0;
          background: #007bff;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 2px;
          font-weight: bold;
          min-width: 16px;
          text-align: center;
          line-height: 1;
        `;
        indicator.textContent = (index + 1).toString();
        overlay.appendChild(indicator);
      }
      
      document.body.appendChild(overlay);
    });
    
  } catch (e) {
    console.warn('Could not highlight multi-selection:', e);
  }
}

function clearMultiSelectionHighlights() {
  // Remove all overlay elements
  const overlays = document.querySelectorAll('.multi-selection-overlay');
  overlays.forEach(overlay => overlay.remove());
}

// Update overlays on scroll/resize
function updateMultiSelectionOverlays() {
  const overlays = document.querySelectorAll('.multi-selection-overlay');
  if (overlays.length === 0) return;

  // Clear existing overlays
  overlays.forEach(overlay => overlay.remove());
  
  // Recreate overlays with updated positions
  multiSelections.forEach((selection, index) => {
    if (selection.rangeData) {
      try {
        // Get fresh rects in case content moved
        const freshRects = selection.rangeData.range.getClientRects();
        if (freshRects.length > 0) {
          highlightMultiSelection(selection.rangeData.range, index);
        }
      } catch (e) {
        console.warn('Could not update overlay for selection', index, e);
      }
    }
  });
}


function applyLabelToMultiSelections(labelPath, labelData) {
  if (multiSelections.length === 0) return;

  hideContextMenu();
  
  let appliedElements = [];
  let lastAppliedElement = null;

  console.log(`Processing ${multiSelections.length} multi-selections`);

  // Process each stored selection using the original ranges
  multiSelections.forEach((selection, index) => {
    try {
      console.log(`Processing selection ${index}: "${selection.text.substring(0, 50)}..."`);
      
      const range = selection.range;
      
      // Validate the range is still valid
      if (!range || !range.startContainer || !range.endContainer) {
        console.warn(`Selection ${index} has invalid range, skipping`);
        return;
      }

      let labelElement = null;
      
      if (selection.isAdvanced) {
        labelElement = applyLabelToAdvancedContent(range, labelPath, labelData);
      } else {
        labelElement = applyLabelToHtmlContent(range, labelPath, labelData);
      }
      
      if (labelElement) {
        appliedElements.push(labelElement);
        lastAppliedElement = labelElement;
        console.log(`Successfully applied label to selection ${index}`);
      } else {
        console.warn(`Failed to create label element for selection ${index}`);
      }
      
    } catch (error) {
      console.error(`Error applying label to selection ${index}:`, error);
    }
  });

  // Clear multi-selection state and overlays
  clearMultiSelectionHighlights();
  multiSelections = [];
  multiSelectionMode = false;

  // Update HTML content if we modified the main content area
  if (appliedElements.some(el => elements.htmlContent.contains(el))) {
    updateCurrentHtmlFromDOM();
  }

  // Attach event listeners to new labels
  if (appliedElements.some(el => elements.htmlContent.contains(el))) {
    attachLabelEventListeners();
  }
  if (appliedElements.some(el => elements.advancedContent.contains(el))) {
    attachAdvancedLabelEventListeners();
  }

  // Show parameter menu for the last applied element (they all have the same parameters)
  if (lastAppliedElement && appliedElements.length > 0) {
    // Store reference to all applied elements for parameter synchronization
    window.currentMultiLabelElements = appliedElements;
    
    const x = window.lastClickX ?? window.innerWidth / 2;
    const y = window.lastClickY ?? window.innerHeight / 2;
    showParameterMenu(lastAppliedElement, x, y);
  }

  updateStats();
  console.log(`Applied label to ${appliedElements.length} selections`);
}

// ======= Selection Functions =======
function applyLabelToSelection(labelPath, labelData) {
  if (multiSelections.length > 0) {
    // Apply to multi-selections
    applyLabelToMultiSelections(labelPath, labelData);
    return;
  }

  // Priority: Advanced mouse selection > Regular mouse selection
  // NOTE: Search selections should ONLY be used via applyAdvancedLabels(), NOT for direct labeling
  let targetSelection = currentAdvancedMouseSelection || currentSelection;
  if (!targetSelection || !targetSelection.range) return;

  hideContextMenu();

  try {
    const range = targetSelection.range;
    const selectedText = range.toString().trim();
    if (!selectedText) return;

    const validation = isValidSelection(range);
    if (!validation.valid) {
      alert("Invalid Selection: " + validation.reason);
      return;
    }

    const wasAdvancedMouseSelection = !!currentAdvancedMouseSelection;

    let labelElement = null;

    if (wasAdvancedMouseSelection) {
      console.log('Applying label to advanced content mouse selection');
      // This is a manual mouse selection in advanced content - PURELY advanced content
      labelElement = applyLabelToAdvancedContent(range, labelPath, labelData);
      currentAdvancedMouseSelection = null; // Clear the advanced mouse selection
    } else if (currentSelection && currentSelection.isAdvanced) {
      console.log('Applying label to advanced content selection (legacy)');
      // This is an advanced content selection (legacy fallback) - PURELY advanced content
      labelElement = applyLabelToAdvancedContent(range, labelPath, labelData);
      currentSelection = null; // Clear the selection
    } else {
      console.log('Applying label to HTML content selection');
      // This is a regular HTML content selection  
      labelElement = applyLabelToHtmlContent(range, labelPath, labelData);
      currentSelection = null; // Clear the selection
    }

    if (labelElement) {
      const x = window.lastClickX ?? window.innerWidth / 2;
      const y = window.lastClickY ?? window.innerHeight / 2;
      showParameterMenu(labelElement, x, y);
    }

  } catch (error) {
    console.error("Error applying label:", error);
    alert("Error applying label. Please try selecting text again.");
  }
}


// Old restoreOrFindNextSelection function removed - now using navigateToNextMatch

function applyLabelToAdvancedContent(range, labelPath, labelData) {
  console.log('applyLabelToAdvancedContent: Working PURELY in advanced content - no HTML content interaction');
  
  const selectedText = range.toString().trim();
  if (!selectedText) return;

  // Create the label element - ONLY for advanced content, no connection to HTML content
  const labelElement = document.createElement("manual_label");

  // Set attributes
  labelElement.setAttribute("labelName", labelPath[labelPath.length - 1]);
  
  if (labelPath.length > 1) {
    labelElement.setAttribute("parent", labelPath[labelPath.length - 2]);
  } else {
    labelElement.setAttribute("parent", "");
  }

  // Apply parameters as attributes
  labelData.params.forEach((paramDef, paramName) => {
    let initialValue = "";
    if (typeof paramDef === "object" && paramDef.type) {
        initialValue = paramDef.default ?? "";
    } else {
        initialValue = paramDef;
    }
    labelElement.setAttribute(paramName, initialValue);
  });
  
  // Apply group attributes (silver attributes) with their default values
  if (labelData.groupConfig && labelData.groupConfig.groupAttributes) {
    labelData.groupConfig.groupAttributes.forEach((attrDef, attrName) => {
      let initialValue = "";
      if (typeof attrDef === "object" && attrDef.type) {
        initialValue = attrDef.default ?? "";
      } else {
        initialValue = attrDef;
      }
      labelElement.setAttribute(attrName, initialValue);
    });
  }
  
  labelElement.style.backgroundColor = labelData.color;
  labelElement.style.color = getContrastColor(labelData.color);

  // Extract and preserve formatting
  const fragment = range.extractContents();
  const processedContent = preserveFormattingInLabel(fragment);
  
  // Add the processed content to the label
  labelElement.appendChild(processedContent);

  // Add delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  labelElement.appendChild(deleteBtn);

  // Insert the label
  range.insertNode(labelElement);

  // Clear selection
  window.getSelection().removeAllRanges();
  
  // Attach event listeners for advanced content
  attachAdvancedLabelEventListeners();
  
  // Note: We don't call updateStats() here because this is purely advanced content
  // Stats will be updated when labels are applied to HTML content via applyAdvancedLabels()

  return labelElement;
}

function attachAdvancedLabelEventListeners() {
  const labelElements = elements.advancedContent.querySelectorAll('manual_label');
  labelElements.forEach(labelElement => {
    const deleteBtn = labelElement.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        
        // Extract content while preserving formatting
        const contentToPreserve = extractLabelContentWithFormatting(labelElement);
        
        if (labelElement.parentNode) {
          if (contentToPreserve.childNodes.length > 0) {
            Array.from(contentToPreserve.childNodes).forEach(node => {
              labelElement.parentNode.insertBefore(node, labelElement);
            });
          }
          labelElement.parentNode.removeChild(labelElement);
        }

        attachAdvancedLabelEventListeners();
        // Note: We don't call updateStats() here because this is purely advanced content manipulation
      };
    }

    // Click to edit parameters
    labelElement.onclick = (e) => {
      if (e.target.classList.contains('delete-btn')) return;
      const sel = window.getSelection();
      if (!sel.isCollapsed) return;
      
      e.stopPropagation();
      const labelName = labelElement.getAttribute("labelName");
      const parent = labelElement.getAttribute("parent") || "";

      if (!labelName) return;

      const path = parent ? [parent, labelName] : [labelName];
      const labelData = getLabelByPath(path);

      if (!labelData || labelData.params.size === 0) {
        //alert("This label has no parameters to edit");
        return;
      }
      showParameterMenu(labelElement, e.clientX, e.clientY);
    };
  });
}

function refreshSearchAfterLabeling() {
  // Check if there's an active search that needs refreshing
  if (currentSearchMatches.length > 0 || currentSearchSelection) {
    // Get the current search text from advanced content
    const advancedText = elements.advancedContent.textContent.trim().replace(/×/g, '');
    
    if (advancedText && advancedText.length >= MIN_SEARCH_LENGTH) {
      // Store the current match index to try to maintain position
      const previousMatchIndex = currentSearchSelection?.matchIndex ?? 0;
      
      console.log(`Refreshing search for "${advancedText}" after labeling, trying to maintain position ${previousMatchIndex}`);
      
      // Re-run the search
      setTimeout(() => {
        const matches = searchInHtmlContent(advancedText);
        
        if (matches.length > 0) {
          // Try to set the selection to the same position, or the closest available
          let targetIndex = previousMatchIndex;
          
          // If the previous index is out of bounds, use the last available match
          if (targetIndex >= matches.length) {
            targetIndex = matches.length - 1;
          }
          
          // If we had no previous selection, default to first match
          if (targetIndex < 0) {
            targetIndex = 0;
          }
          
          setCurrentSearchSelection(matches[targetIndex], targetIndex);
          console.log(`Search refreshed: ${matches.length} matches found, positioned at match ${targetIndex}`);
        } else {
          console.log('Search refreshed: no matches found');
          currentSearchSelection = null;
          clearSearchOverlays();
        }
      }, 50); // Small delay to ensure DOM is updated
    } else {
      // No valid search text, clear everything
      clearSearchOverlays();
      currentSearchSelection = null;
    }
  }
}



function applyLabelToHtmlContent(range, labelPath, labelData) {
  const selectedText = range.toString().trim();
  if (!selectedText) return;

  // CHECK IF WE'RE APPLYING TO A HIGHLIGHTED ELEMENT
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  
  // Find if the selection is within a highlight span
  let highlightSpan = null;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    let parent = startContainer.parentNode;
    while (parent && parent !== elements.htmlContent) {
      if (parent.classList && parent.classList.contains('search-highlight')) {
        highlightSpan = parent;
        break;
      }
      parent = parent.parentNode;
    }
  }

  // If we're in a highlight span, we need special handling
  if (highlightSpan) {
    applyLabelToHighlightedText(highlightSpan, labelPath, labelData);
    return;
  }

  // Original labeling logic for non-highlighted text
  const labelElement = document.createElement("manual_label");
  labelElement.setAttribute("labelName", labelPath[labelPath.length - 1]);
  
  if (labelPath.length > 1) {
    labelElement.setAttribute("parent", labelPath[labelPath.length - 2]);
  } else {
    labelElement.setAttribute("parent", "");
  }

  labelData.params.forEach((paramDef, paramName) => {
    let initialValue = "";
    if (typeof paramDef === "object" && paramDef.type) {
      initialValue = paramDef.default ?? "";
    } else {
      initialValue = paramDef;
    }
    labelElement.setAttribute(paramName, initialValue);
  });
  
  // Apply group attributes (silver attributes) with their default values
  if (labelData.groupConfig && labelData.groupConfig.groupAttributes) {
    labelData.groupConfig.groupAttributes.forEach((attrDef, attrName) => {
      let initialValue = "";
      if (typeof attrDef === "object" && attrDef.type) {
        initialValue = attrDef.default ?? "";
      } else {
        initialValue = attrDef;
      }
      labelElement.setAttribute(attrName, initialValue);
    });
  }
  
  labelElement.style.backgroundColor = labelData.color;
  labelElement.style.color = getContrastColor(labelData.color);

  const fragment = range.extractContents();
  const processedContent = preserveFormattingInLabel(fragment);
  labelElement.appendChild(processedContent);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  labelElement.appendChild(deleteBtn);

  range.insertNode(labelElement);

  // Update currentHtml
  updateCurrentHtmlFromDOM();

  window.getSelection().removeAllRanges();
  attachLabelEventListeners();
  updateStats();
  
  // Refresh search if there's an active search to maintain highlights and position
  refreshSearchAfterLabeling();
  
  return labelElement;
}

function applyLabelToHighlightedText(highlightSpan, labelPath, labelData) {
  // Create the label element
  const labelElement = document.createElement("manual_label");
  labelElement.setAttribute("labelName", labelPath[labelPath.length - 1]);
  
  if (labelPath.length > 1) {
    labelElement.setAttribute("parent", labelPath[labelPath.length - 2]);
  } else {
    labelElement.setAttribute("parent", "");
  }

  labelData.params.forEach((paramDef, paramName) => {
    let initialValue = "";
    if (typeof paramDef === "object" && paramDef.type) {
      initialValue = paramDef.default ?? "";
    } else {
      initialValue = paramDef;
    }
    labelElement.setAttribute(paramName, initialValue);
  });
  
  // Apply group attributes (silver attributes) with their default values
  if (labelData.groupConfig && labelData.groupConfig.groupAttributes) {
    labelData.groupConfig.groupAttributes.forEach((attrDef, attrName) => {
      let initialValue = "";
      if (typeof attrDef === "object" && attrDef.type) {
        initialValue = attrDef.default ?? "";
      } else {
        initialValue = attrDef;
      }
      labelElement.setAttribute(attrName, initialValue);
    });
  }
  
  labelElement.style.backgroundColor = labelData.color;
  labelElement.style.color = getContrastColor(labelData.color);

  // Extract content from highlight span (excluding the highlight styling)
  const textContent = highlightSpan.textContent;
  labelElement.textContent = textContent;

  // Add delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  labelElement.appendChild(deleteBtn);

  // Replace the highlight span with the label element
  highlightSpan.parentNode.replaceChild(labelElement, highlightSpan);

  // Update currentHtml
  updateCurrentHtmlFromDOM();

  window.getSelection().removeAllRanges();
  attachLabelEventListeners();
  updateStats();
  
  // Refresh search if there's an active search to maintain highlights and position
  refreshSearchAfterLabeling();
}

function preserveFormattingInLabel(fragment) {
    // Clone the fragment to avoid modifying the original
    const processedFragment = document.createDocumentFragment();
    
    // Process each node in the fragment
    Array.from(fragment.childNodes).forEach(node => {
        processedFragment.appendChild(node.cloneNode(true));
    });
    
    return processedFragment;
}


  // ======= Advanced Labeling =================================================
  // This function is the ONLY bridge between advanced content and HTML content
  // It takes the labeled structure from advanced content and applies it to the current search selection in HTML content
function applyAdvancedStructureSimple(range) {
  // Get the root advanced label (there should be exactly one)
  const rootLabels = getRootLabels();
  if (rootLabels.length !== 1) {
    throw new Error("Must have exactly one root label in advanced content");
  }
  
  const rootAdvancedLabel = rootLabels[0];
  
  // Extract the original content with formatting preserved
  const fragment = range.extractContents();
  const processedContent = preserveFormattingInLabel(fragment);
  
  // Create the complete nested structure from advanced content
  const completeStructure = createNestedLabelStructure(rootAdvancedLabel, processedContent);
  
  // Insert the complete structure
  range.insertNode(completeStructure);
}

function createNestedLabelStructure(advancedLabel, originalContent) {
  // Create the current label element
  const labelElement = document.createElement("manual_label");
  
  // Copy all attributes from the advanced label
  Array.from(advancedLabel.attributes).forEach(attr => {
    if (attr.name !== 'style') { // Don't copy style attributes
      labelElement.setAttribute(attr.name, attr.value);
    }
  });
  
  // Apply styling based on label definition
  const labelName = advancedLabel.getAttribute('labelName');
  const parent = advancedLabel.getAttribute('parent') || '';
  const path = parent ? [parent, labelName] : [labelName];
  const labelData = getLabelByPath(path);
  
  if (labelData) {
    labelElement.style.backgroundColor = labelData.color;
    labelElement.style.color = getContrastColor(labelData.color);
  }
  
  // Check for nested manual_label elements (direct children only)
  const directChildLabels = Array.from(advancedLabel.children).filter(
    child => child.tagName === 'MANUAL_LABEL'
  );
  
  if (directChildLabels.length === 0) {
    // No nested labels - add the original content directly
    labelElement.appendChild(originalContent);
  } else {
    // Has nested labels - need to map content properly
    mapAdvancedStructureToOriginalContent(advancedLabel, originalContent, labelElement);
  }
  
  // Add delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  labelElement.appendChild(deleteBtn);
  
  return labelElement;
}

function mapAdvancedStructureToOriginalContent(advancedLabel, originalContent, targetLabel) {
  // Get the clean text from both sources
  const advancedText = getCleanTextFromElement(advancedLabel);
  const originalText = getTextFromFragment(originalContent);
  
  console.log('Mapping advanced structure:');
  console.log('Advanced text:', advancedText);
  console.log('Original text:', originalText);
  
  // Verify they match (normalized)
  if (normalizeText(advancedText) !== normalizeText(originalText)) {
    console.warn('Text mismatch, falling back to simple structure');
    targetLabel.appendChild(originalContent);
    return;
  }
  
  // Use a simpler approach: apply the structure but preserve the original formatting
  // by doing a smart replacement
  applyStructureWithFormattingPreservation(advancedLabel, originalContent, targetLabel);
}

function applyStructureWithFormattingPreservation(advancedLabel, originalContent, targetLabel) {
  // New approach: Process the advanced label structure while preserving original formatting
  console.log('Advanced structure preservation - processing nested labels');
  
  // Get the text content from both sources for alignment
  const advancedText = getCleanTextFromElement(advancedLabel);
  const originalText = getTextFromFragment(originalContent);
  
  console.log('Advanced text:', advancedText);
  console.log('Original text:', originalText);
  
  // Use a more sophisticated approach that maps the advanced structure onto the original DOM structure
  // instead of trying to extract by text offsets
  const mappingResult = mapAdvancedStructureToOriginalDOM(advancedLabel, originalContent);
  
  if (mappingResult.success) {
    // Apply the mapped structure
    mappingResult.elements.forEach(element => {
      targetLabel.appendChild(element);
    });
  } else {
    // Fallback to simple content preservation
    console.warn('Structure mapping failed, using simple content preservation');
    targetLabel.appendChild(originalContent.cloneNode(true));
  }
}

function mapAdvancedStructureToOriginalDOM(advancedLabel, originalContent) {
  // This function creates a more sophisticated mapping that preserves formatting
  // by working with the DOM structure rather than text offsets
  
  const result = {
    success: false,
    elements: []
  };
  
  try {
    // Create a working copy of the original content
    const workingDiv = document.createElement('div');
    workingDiv.appendChild(originalContent.cloneNode(true));
    
    // Build a text-to-node mapping for the original content
    const originalMapping = buildTextToNodeMapping(workingDiv);
    const advancedMapping = buildAdvancedLabelMapping(advancedLabel);
    
    console.log('Original mapping:', originalMapping);
    console.log('Advanced mapping:', advancedMapping);
    
    // Process each section in the advanced mapping
    let processedOffset = 0;
    
    advancedMapping.forEach(section => {
      const startOffset = processedOffset;
      const endOffset = processedOffset + section.text.length;
      
      if (section.isLabel) {
        // Create a nested label with the corresponding original content
        const labelContent = extractContentFromMapping(originalMapping, startOffset, endOffset);
        const nestedLabel = createSingleLabel(section, labelContent);
        result.elements.push(nestedLabel);
      } else {
        // Regular content - extract from original with formatting preserved
        const content = extractContentFromMapping(originalMapping, startOffset, endOffset);
        if (content && content.childNodes.length > 0) {
          Array.from(content.childNodes).forEach(node => {
            result.elements.push(node.cloneNode(true));
          });
        }
      }
      
      processedOffset += section.text.length;
    });
    
    result.success = true;
  } catch (error) {
    console.error('Error in mapAdvancedStructureToOriginalDOM:', error);
    result.success = false;
  }
  
  return result;
}

function buildTextToNodeMapping(container) {
  // Build a mapping of text positions to DOM nodes
  const mapping = [];
  let textOffset = 0;
  
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ALL,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text.length > 0) {
        mapping.push({
          startOffset: textOffset,
          endOffset: textOffset + text.length,
          node: node,
          text: text,
          type: 'text'
        });
        textOffset += text.length;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Store element boundaries for formatting preservation
      mapping.push({
        startOffset: textOffset,
        endOffset: textOffset, // Elements have no text length themselves
        node: node,
        text: '',
        type: 'element_start'
      });
    }
  }
  
  return mapping;
}

function buildAdvancedLabelMapping(advancedLabel) {
  // Build a mapping of the advanced label structure
  const mapping = [];
  
  Array.from(advancedLabel.childNodes).forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent;
      if (text.trim()) {
        mapping.push({
          text: text,
          isLabel: false,
          element: null
        });
      }
    } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'MANUAL_LABEL') {
      const text = getCleanTextFromElement(child);
      mapping.push({
        text: text,
        isLabel: true,
        element: child
      });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      // Other HTML elements in advanced structure (should be treated as content)
      const text = child.textContent;
      if (text) {
        mapping.push({
          text: text,
          isLabel: false,
          element: child
        });
      }
    }
  });
  
  return mapping;
}

function extractContentFromMapping(originalMapping, startOffset, endOffset) {
  // Extract content from the original mapping while preserving formatting
  const fragment = document.createDocumentFragment();
  
  // Find all nodes that overlap with our range
  const relevantNodes = originalMapping.filter(item => 
    item.type === 'text' && 
    !(item.endOffset <= startOffset || item.startOffset >= endOffset)
  );
  
  relevantNodes.forEach(nodeInfo => {
    const nodeStart = Math.max(nodeInfo.startOffset, startOffset);
    const nodeEnd = Math.min(nodeInfo.endOffset, endOffset);
    
    if (nodeStart < nodeEnd) {
      // Extract the relevant portion of this text node
      const relativeStart = nodeStart - nodeInfo.startOffset;
      const relativeEnd = nodeEnd - nodeInfo.startOffset;
      const extractedText = nodeInfo.text.substring(relativeStart, relativeEnd);
      
      if (extractedText) {
        // Clone the text node's parent hierarchy to preserve formatting
        const textNode = document.createTextNode(extractedText);
        const formattedNode = cloneFormattingHierarchy(nodeInfo.node, textNode);
        fragment.appendChild(formattedNode);
      }
    }
  });
  
  return fragment;
}

function cloneFormattingHierarchy(originalTextNode, newTextNode) {
  // Clone the formatting hierarchy around a text node
  let currentNode = newTextNode;
  let parent = originalTextNode.parentNode;
  
  // Walk up the hierarchy and clone formatting elements
  while (parent && parent.nodeType === Node.ELEMENT_NODE && isFormattingElement(parent)) {
    const formattingClone = parent.cloneNode(false); // Clone without children
    formattingClone.appendChild(currentNode);
    currentNode = formattingClone;
    parent = parent.parentNode;
  }
  
  return currentNode;
}



function createSingleLabel(labelInfo, content) {
  const labelElement = document.createElement("manual_label");
  
  // Copy attributes from the source label
  Array.from(labelInfo.element.attributes).forEach(attr => {
    if (attr.name !== 'style') {
      labelElement.setAttribute(attr.name, attr.value);
    }
  });
  
  // Apply styling
  const labelName = labelInfo.element.getAttribute('labelName');
  const parent = labelInfo.element.getAttribute('parent') || '';
  const path = parent ? [parent, labelName] : [labelName];
  const labelData = getLabelByPath(path);
  
  if (labelData) {
    labelElement.style.backgroundColor = labelData.color;
    labelElement.style.color = getContrastColor(labelData.color);
  }
  
  // Add content
  labelElement.appendChild(content);
  
  // Add delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  labelElement.appendChild(deleteBtn);
  
  return labelElement;
}



function handleSplitFormattingInExtraction(fragment, startNode, endNode, startOffset, endOffset) {
  // This function handles cases where formatting elements are split across extraction boundaries
  // It ensures that partial formatting elements are properly reconstructed
  
  const processedFragment = document.createDocumentFragment();
  const nodes = Array.from(fragment.childNodes);
  
  // Handle each node, looking for incomplete formatting elements
  nodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // Check if this element was truncated and needs reconstruction
      const reconstructedNode = reconstructTruncatedFormattingElement(node, startNode, endNode, startOffset, endOffset);
      processedFragment.appendChild(reconstructedNode);
    } else {
      // Text nodes and other nodes can be added directly
      processedFragment.appendChild(node.cloneNode(true));
    }
  });
  
  return processedFragment;
}

function reconstructTruncatedFormattingElement(element, startNode, endNode, startOffset, endOffset) {
  // Check if the element appears to be a formatting element that was truncated
  if (isFormattingElement(element)) {
    // For formatting elements, we need to ensure the content is properly preserved
    const reconstructed = element.cloneNode(false); // Clone without children
    
    // Process all child nodes recursively
    Array.from(element.childNodes).forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        reconstructed.appendChild(reconstructTruncatedFormattingElement(child, startNode, endNode, startOffset, endOffset));
      } else {
        reconstructed.appendChild(child.cloneNode(true));
      }
    });
    
    return reconstructed;
  }
  
  // For non-formatting elements, return as-is
  return element.cloneNode(true);
}

function isFormattingElement(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

  const formattingTags = [
    "i", "em", "italic",        // italic
    "b", "strong", "bold",      // bold
    "u", "underline",           // underline
    "s", "strike", "del",       // strikethrough
    "sup", "sub"                // superscript/subscript
  ];

  return formattingTags.includes(element.tagName.toLowerCase());
}

function getCleanTextFromElement(element) {
  const clone = element.cloneNode(true);
  const deleteButtons = clone.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => btn.remove());
  return clone.textContent;
}

function getTextFromFragment(fragment) {
  const div = document.createElement('div');
  div.appendChild(fragment.cloneNode(true));
  return div.textContent;
}

function applyAdvancedLabels() {
  console.log('applyAdvancedLabels: Starting - this is the ONLY bridge between advanced and HTML content');
  
  if (!currentSearchSelection) {
    alert("No current search selection. Please navigate to a match first.");
    return;
  }

  const advancedLabels = elements.advancedContent.querySelectorAll("manual_label");
  if (advancedLabels.length === 0) {
    alert("No labels defined in advanced content");
    return;
  }

  const currentMatchIndex = currentSearchSelection.matchIndex;
  const searchText = getCleanAdvancedText();
  const match = currentSearchSelection.match;

  try {
    // Handle both simple matches and enhanced multi-node matches
    let primaryNode, secondaryNode;
    
    if (match.isMultiNode) {
      primaryNode = match.startNode;
      secondaryNode = match.endNode;
      
      if (!primaryNode || !primaryNode.parentNode || !secondaryNode || !secondaryNode.parentNode) {
        alert("The selected match is no longer valid. Please navigate to another match.");
        return;
      }
    } else {
      primaryNode = match.node;
      
      if (!primaryNode || !primaryNode.parentNode) {
        alert("The selected match is no longer valid. Please navigate to another match.");
        return;
      }
    }

    const range = document.createRange();
    try {
      if (match.isMultiNode) {
        range.setStart(match.startNode, match.startOffset);
        range.setEnd(match.endNode, match.endOffset);
      } else {
        range.setStart(match.node, match.startOffset);
        range.setEnd(match.node, match.endOffset);
      }
    } catch (e) {
      alert("Could not create selection range. The text may have changed.");
      console.error("Range creation error:", e);
      return;
    }

    if (!isFullyLabeled()) {
      alert("Please ensure all text is covered by exactly ONE main label in the advanced content.");
      return;
    }

    // Apply the advanced label structure the same way as applyLabelToHtmlContent
    applyAdvancedStructureSimple(range);

    updateCurrentHtmlFromDOM();
    attachLabelEventListeners();
    updateStats();
    
    // Re-search and navigate to next available match
    setTimeout(() => {
      const matches = searchInHtmlContent(searchText);
      
      if (matches.length > 0) {
        // Find next match after the current one
        let nextIndex = 0;
        // Look for first match with index >= current
        for (let i = 0; i < matches.length; i++) {
          if (i >= currentMatchIndex) {
            nextIndex = i;
            break;
          }
        }
        setCurrentSearchSelection(matches[nextIndex], nextIndex);
      } else {
        currentSearchSelection = null;
        clearSearchOverlays();
      }
    }, 100);

    console.log("Labels applied successfully");
    
  } catch (e) {
    console.error("Could not apply labels:", e);
    alert("Could not apply labels: " + e.message);
  }
}

function isFullyLabeled() {
  // Get all root-level labels (not nested inside other labels)
  const rootLabels = getRootLabels();
  
  // Must have exactly one root label
  if (rootLabels.length !== 1) {
    return false;
  }
  
  // Get all text content from advanced input
  const fullText = getCleanAdvancedText();
  
  // Get text from the single root label
  const rootLabelText = getRootLabelText(rootLabels[0]);
  
  // Normalize both texts and compare
  return normalizeText(fullText) === normalizeText(rootLabelText);
}

function getRootLabels() {
  // Get all manual_label elements that are not nested inside other labels
  const allLabels = elements.advancedContent.querySelectorAll('manual_label');
  const rootLabels = [];
  
  allLabels.forEach(label => {
    let isNested = false;
    let parent = label.parentElement;
    while (parent && parent !== elements.advancedContent) {
      if (parent.tagName === 'MANUAL_LABEL') {
        isNested = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!isNested) {
      rootLabels.push(label);
    }
  });
  
  return rootLabels;
}

function getRootLabelText(rootLabel) {
  // Clone the root label to avoid modifying the original
  const clone = rootLabel.cloneNode(true);
  
  // Remove delete buttons
  const deleteButtons = clone.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => btn.remove());
  
  return clone.textContent;
}

function getCleanAdvancedText() {
  const clone = elements.advancedContent.cloneNode(true);
  const deleteButtons = clone.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => btn.remove());
  return clone.textContent.trim();
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function cloneAdvancedStructure() {
  // Clone the entire advanced content structure
  const clone = elements.advancedContent.cloneNode(true);
  
  // Remove delete buttons from the clone
  const deleteButtons = clone.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => btn.remove());
  
  // Process all manual_label elements to ensure they have proper attributes and styling
  const labels = clone.querySelectorAll('manual_label');
  labels.forEach(label => {
    const labelName = label.getAttribute('labelName');
    const parent = label.getAttribute('parent') || '';
    const path = parent ? [parent, labelName] : [labelName];
    const labelData = getLabelByPath(path);
    
    if (labelData) {
      // Apply styling
      label.style.backgroundColor = labelData.color;
      label.style.color = getContrastColor(labelData.color);
      
      // Ensure all parameters are set correctly
      labelData.params.forEach((paramDef, paramName) => {
        if (!label.hasAttribute(paramName)) {
          let defaultValue = "";
          if (typeof paramDef === "object" && paramDef.type) {
            defaultValue = paramDef.default ?? "";
          } else {
            defaultValue = paramDef;
          }
          label.setAttribute(paramName, defaultValue);
        }
      });
      
      // Ensure all group attributes are set correctly
      if (labelData.groupConfig && labelData.groupConfig.groupAttributes) {
        labelData.groupConfig.groupAttributes.forEach((attrDef, attrName) => {
          if (!label.hasAttribute(attrName)) {
            let defaultValue = "";
            if (typeof attrDef === "object" && attrDef.type) {
              defaultValue = attrDef.default ?? "";
            } else {
              defaultValue = attrDef;
            }
            label.setAttribute(attrName, defaultValue);
          }
        });
      }
    }
  });
  
  return clone;
}

function replaceSelectionWithStructure(range, structure) {
  // Remove the selected content
  range.deleteContents();
  
  // Create a document fragment to hold the new structure
  const fragment = document.createDocumentFragment();
  
  // Move all children from the cloned structure to the fragment
  while (structure.firstChild) {
    const child = structure.firstChild;
    
    // If it's a manual_label, add delete button
    if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'MANUAL_LABEL') {
      addDeleteButtonToLabel(child);
    }
    
    fragment.appendChild(child);
  }
  
  // Insert the fragment at the range position
  range.insertNode(fragment);
}

function addDeleteButtonToLabel(labelElement) {
  // Check if delete button already exists
  if (labelElement.querySelector('.delete-btn')) {
    return;
  }
  
  // Create and add delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "×";
  labelElement.appendChild(deleteBtn);
  
  // Also add delete buttons to any nested labels
  const nestedLabels = labelElement.querySelectorAll('manual_label');
  nestedLabels.forEach(nestedLabel => {
    if (!nestedLabel.querySelector('.delete-btn')) {
      const nestedDeleteBtn = document.createElement("button");
      nestedDeleteBtn.className = "delete-btn";
      nestedDeleteBtn.textContent = "×";
      nestedLabel.appendChild(nestedDeleteBtn);
    }
  });
}

  // ======= Search function for advanced labels =======
  
function searchInHtmlContent(searchText) {
  if (!currentHtml || !searchText) {
    clearSearchOverlays();
    currentSearchSelection = null;
    return [];
  }
  
  // Store current selection info before clearing overlays
  const previousMatchIndex = currentSearchSelection?.matchIndex ?? 0;
  
  // Clear overlays BEFORE searching
  clearSearchOverlays();
  
  // Update currentHtml to reflect current DOM state (including new labels)
  updateCurrentHtmlFromDOM();
  
  // Find matches using the improved algorithm
  const matches = findTextMatches(elements.htmlContent, searchText);
  console.log(`Found ${matches.length} matches for "${searchText}"`);
  
  // Create overlay highlights for matches
  createSearchOverlays(matches);
  
  // Set current search selection
  if (matches.length > 0) {
    // Try to find a match at or after the previous position
    let targetIndex = previousMatchIndex;
    if (targetIndex >= matches.length) {
      targetIndex = 0;
    }
    
    setCurrentSearchSelection(matches[targetIndex], targetIndex);
  } else {
    currentSearchSelection = null;
  }
  
  return matches;
}

function updateCurrentHtmlFromDOM() {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = elements.htmlContent.innerHTML;
  
  // Remove delete buttons for clean HTML
  const deleteButtons = tempDiv.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => btn.remove());
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(currentHtml, 'text/html');
  doc.body.innerHTML = tempDiv.innerHTML;
  currentHtml = doc.documentElement.outerHTML;
}

// ======= Overlay-based Search Highlighting System =======

function createSearchOverlays(matches) {
  clearSearchOverlays();
  
  currentSearchMatches = matches;
  
  matches.forEach((match, index) => {
    try {
      const overlay = createOverlayForMatch(match, index);
      if (overlay) {
        searchOverlays.push(overlay);
        // Append to the scrollable container's parent for proper positioning
        elements.htmlContent.appendChild(overlay);
      }
    } catch (error) {
      console.warn('Could not create overlay for match:', error, match);
    }
  });
}

function createOverlayForMatch(match, index) {
  const range = document.createRange();
  
  // Handle both simple matches and enhanced multi-node matches
  if (match.isMultiNode) {
    range.setStart(match.startNode, match.startOffset);
    range.setEnd(match.endNode, match.endOffset);
  } else {
    range.setStart(match.node, match.startOffset);
    range.setEnd(match.node, match.endOffset);
  }
  
  const rect = range.getBoundingClientRect();
  const containerRect = elements.htmlContent.getBoundingClientRect();
  
  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.dataset.matchIndex = index;
  
  // Position relative to the container's content area
  overlay.style.position = 'absolute';
  overlay.style.left = (rect.left - containerRect.left + elements.htmlContent.scrollLeft) + 'px';
  overlay.style.top = (rect.top - containerRect.top + elements.htmlContent.scrollTop) + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  overlay.style.backgroundColor = '#ffff00';
  overlay.style.opacity = '0.4';
  overlay.style.borderRadius = '2px';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '100';
  overlay.style.transition = 'opacity 0.2s ease, background-color 0.2s ease';
  
  return overlay;
}

function setCurrentSearchSelection(match, matchIndex) {
  try {
    // Handle both simple matches and enhanced multi-node matches
    let primaryNode = match.isMultiNode ? match.startNode : match.node;
    
    // Validate that the node still exists in the document
    if (!primaryNode || !primaryNode.parentNode) {
      console.warn('Match node no longer in document, skipping');
      return;
    }
    
    const range = document.createRange();
    
    if (match.isMultiNode) {
      range.setStart(match.startNode, match.startOffset);
      range.setEnd(match.endNode, match.endOffset);
    } else {
      range.setStart(match.node, match.startOffset);
      range.setEnd(match.node, match.endOffset);
    }
    
    currentSearchSelection = {
      range: range,
      matchIndex: matchIndex,
      text: match.text,
      match: match  // Store the complete match object for later recreation
    };
    
    updateCurrentSearchSelectionHighlight(matchIndex);
    scrollToCurrentSelection();
    
    console.log(`Current search selection set to match ${matchIndex}: "${currentSearchSelection.text}" ${match.isEnhanced ? '(enhanced)' : '(simple)'}`);
  } catch (error) {
    console.error('Error setting current search selection:', error);
    currentSearchSelection = null;
  }
}

function scrollToCurrentSelection() {
  if (!currentSearchSelection) return;
  
  try {
    const range = currentSearchSelection.range;
    const rect = range.getBoundingClientRect();
    const containerRect = elements.htmlContent.getBoundingClientRect();
    
    // Check if selection is visible
    if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) {
      // Calculate scroll position to center the selection
      const targetScrollTop = elements.htmlContent.scrollTop + 
        (rect.top - containerRect.top) - (containerRect.height / 2);
      
      elements.htmlContent.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  } catch (error) {
    console.warn('Could not scroll to selection:', error);
  }
}

function updateCurrentSearchSelectionHighlight(currentIndex) {
  // Reset all overlays to default appearance
  searchOverlays.forEach(overlay => {
    overlay.style.backgroundColor = '#ffff00';
    overlay.style.opacity = '0.4';
    overlay.style.border = 'none';
    overlay.style.boxShadow = 'none';
  });
  
  // Highlight the current selection
  const currentOverlay = searchOverlays.find(overlay => 
    parseInt(overlay.dataset.matchIndex) === currentIndex
  );
  
  if (currentOverlay) {
    currentOverlay.style.backgroundColor = '#ff6b35';
    currentOverlay.style.opacity = '0.7';
    currentOverlay.style.border = '2px solid #ff4500';
    currentOverlay.style.boxShadow = '0 0 4px rgba(255, 69, 0, 0.8)';
    
    // Scroll the current selection into view
    const range = currentSearchSelection.range;
    const rect = range.getBoundingClientRect();
    const containerRect = elements.htmlContent.getBoundingClientRect();
    
    // Check if the selection is visible
    if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) {
      // Scroll to make it visible
      const targetScrollTop = elements.htmlContent.scrollTop + 
        (rect.top - containerRect.top) - (containerRect.height / 2);
      
      elements.htmlContent.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  }
}

function clearSearchOverlays() {
  searchOverlays.forEach(overlay => {
    if (overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
  });
  searchOverlays = [];
  currentSearchMatches = [];
  currentSearchSelection = null;
}

// Update overlays when scrolling or resizing
function updateSearchOverlayPositions() {
  if (currentSearchMatches.length === 0 || searchOverlays.length === 0) return;
  
  currentSearchMatches.forEach((match, index) => {
    const overlay = searchOverlays[index];
    let primaryNode = match.isMultiNode ? match.startNode : match.node;
    
    if (!overlay || !primaryNode || !primaryNode.parentNode) return;
    
    try {
      const range = document.createRange();
      
      if (match.isMultiNode) {
        range.setStart(match.startNode, match.startOffset);
        range.setEnd(match.endNode, match.endOffset);
      } else {
        range.setStart(match.node, match.startOffset);
        range.setEnd(match.node, match.endOffset);
      }
      
      const rect = range.getBoundingClientRect();
      const containerRect = elements.htmlContent.getBoundingClientRect();
      
      overlay.style.left = (rect.left - containerRect.left + elements.htmlContent.scrollLeft) + 'px';
      overlay.style.top = (rect.top - containerRect.top + elements.htmlContent.scrollTop) + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
    } catch (error) {
      console.warn('Could not update overlay position:', error);
    }
  });
}

// This function is now replaced by updateCurrentSearchSelectionHighlight in the overlay system



function findTextMatches(element, searchText) {
  if (ENHANCED_FORMATTING_SEARCH) {
    return findEnhancedTextMatches(element, searchText);
  } else {
    return findSimpleTextMatches(element, searchText);
  }
}

function findSimpleTextMatches(element, searchText) {
  const matches = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip text inside manual_label tags, delete buttons, and search highlights
        let parent = node.parentNode;
        while (parent && parent !== element) {
          if (parent.tagName === 'MANUAL_LABEL' || 
              parent.classList?.contains('delete-btn') ||
              parent.classList?.contains('search-highlight')) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentNode;
        }
        
        // Also skip if the text is already fully contained within a manual_label
        // This prevents re-labeling already labeled text
        let checkParent = node.parentNode;
        while (checkParent && checkParent !== element) {
          if (checkParent.tagName === 'MANUAL_LABEL') {
            return NodeFilter.FILTER_REJECT;
          }
          checkParent = checkParent.parentNode;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  // Normalize the search text
  const normalizedSearch = searchText.replace(/\s+/g, ' ').trim().toLowerCase();

  let textNode;
  while (textNode = walker.nextNode()) {
    const text = textNode.textContent;
    const normalizedText = text.replace(/\s+/g, ' ').toLowerCase();
    
    let index = 0;
    while ((index = normalizedText.indexOf(normalizedSearch, index)) !== -1) {
      const originalStart = mapNormalizedToOriginalPosition(text, index);
      const originalEnd = mapNormalizedToOriginalPosition(text, index + normalizedSearch.length);
      
      if (originalStart >= 0 && originalEnd <= text.length && originalStart < originalEnd) {
        matches.push({
          node: textNode,
          startOffset: originalStart,
          endOffset: originalEnd,
          text: text.substring(originalStart, originalEnd)
        });
      }
      index += normalizedSearch.length;
    }
  }
  
  return matches;
}

function findEnhancedTextMatches(element, searchText) {
  console.log('Enhanced search for:', searchText);
  const matches = [];
  
  // Normalize the search text
  const normalizedSearch = searchText.replace(/\s+/g, ' ').trim().toLowerCase();
  console.log('Normalized search:', normalizedSearch);
  
  // Get all text nodes in order
  const textNodes = getOrderedTextNodes(element);
  console.log('Found text nodes:', textNodes.length);
  
  if (textNodes.length === 0) return matches;
  
  // Build a continuous text representation with position mapping
  let continuousText = '';
  let positionMap = []; // Maps each character position in continuousText to {node, offset}
  
  textNodes.forEach((nodeInfo, nodeIndex) => {
    const text = nodeInfo.node.textContent;
    console.log(`Node ${nodeIndex}: "${text}"`);
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      positionMap.push({
        node: nodeInfo.node,
        offset: i,
        nodeIndex: nodeIndex
      });
      
      continuousText += char;
    }
    
    // Add space between nodes if needed (but don't map this space to any node)
    if (nodeIndex < textNodes.length - 1 && !text.endsWith(' ') && !textNodes[nodeIndex + 1].node.textContent.startsWith(' ')) {
      positionMap.push({
        node: null,
        offset: -1,
        nodeIndex: -1,
        isVirtualSpace: true
      });
      continuousText += ' ';
    }
  });
  
  console.log('Continuous text length:', continuousText.length);
  console.log('Continuous text preview:', continuousText.substring(0, 200) + '...');
  
  // Normalize the continuous text
  const normalizedContinuous = continuousText.replace(/\s+/g, ' ').trim().toLowerCase();
  console.log('Normalized continuous length:', normalizedContinuous.length);
  
  // Find matches in normalized text
  let searchIndex = 0;
  while ((searchIndex = normalizedContinuous.indexOf(normalizedSearch, searchIndex)) !== -1) {
    console.log(`Found match at normalized position ${searchIndex}: "${normalizedContinuous.substring(searchIndex, searchIndex + normalizedSearch.length)}"`);
    
    const matchStart = searchIndex;
    const matchEnd = searchIndex + normalizedSearch.length;
    
    // Map back to original positions
    const realMatch = mapNormalizedMatchToReal(continuousText, positionMap, matchStart, matchEnd, normalizedContinuous);
    
    if (realMatch) {
      console.log('Real match:', realMatch.text);
      matches.push(realMatch);
    } else {
      console.log('Failed to map normalized match to real positions');
    }
    
    searchIndex += normalizedSearch.length;
  }
  
  console.log(`Enhanced search found ${matches.length} matches`);
  return matches;
}

function getOrderedTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip text inside manual_label tags, delete buttons, and search highlights
        let parent = node.parentNode;
        while (parent && parent !== element) {
          if (parent.tagName === 'MANUAL_LABEL' || 
              parent.classList?.contains('delete-btn') ||
              parent.classList?.contains('search-highlight')) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentNode;
        }
        
        // Also skip if the text is already fully contained within a manual_label
        let checkParent = node.parentNode;
        while (checkParent && checkParent !== element) {
          if (checkParent.tagName === 'MANUAL_LABEL') {
            return NodeFilter.FILTER_REJECT;
          }
          checkParent = checkParent.parentNode;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let textNode;
  while (textNode = walker.nextNode()) {
    if (textNode.textContent.trim()) { // Only include nodes with actual content
      textNodes.push({
        node: textNode,
        text: textNode.textContent
      });
    }
  }
  
  return textNodes;
}

function mapNormalizedMatchToReal(originalText, positionMap, normalizedStart, normalizedEnd, normalizedText) {
  // Find the real start and end positions by mapping from normalized back to original
  const realStart = mapNormalizedPositionToReal(originalText, normalizedText, normalizedStart);
  const realEnd = mapNormalizedPositionToReal(originalText, normalizedText, normalizedEnd);
  
  if (realStart === -1 || realEnd === -1 || realStart >= realEnd) {
    return null;
  }
  
  // Check bounds
  if (realStart >= positionMap.length || realEnd > positionMap.length) {
    return null;
  }
  
  const startPos = positionMap[realStart];
  const endPos = positionMap[Math.min(realEnd - 1, positionMap.length - 1)];
  
  // Skip virtual spaces
  if (!startPos?.node || !endPos?.node || startPos.isVirtualSpace || endPos.isVirtualSpace) {
    return null;
  }
  
  // Extract the actual matched text
  let matchedText = '';
  for (let i = realStart; i < realEnd && i < positionMap.length; i++) {
    const pos = positionMap[i];
    if (pos.node && !pos.isVirtualSpace) {
      matchedText += pos.node.textContent[pos.offset] || '';
    }
  }
  
  if (startPos.node === endPos.node) {
    // Single node match
    return {
      node: startPos.node,
      startOffset: startPos.offset,
      endOffset: endPos.offset + 1,
      text: matchedText,
      isEnhanced: true
    };
  } else {
    // Multi-node match
    return {
      startNode: startPos.node,
      startOffset: startPos.offset,
      endNode: endPos.node,
      endOffset: endPos.offset + 1,
      text: matchedText,
      isEnhanced: true,
      isMultiNode: true
    };
  }
}

function mapNormalizedPositionToReal(originalText, normalizedText, normalizedPos) {
  let realPos = 0;
  let normPos = 0;
  
  while (realPos < originalText.length && normPos < normalizedPos) {
    const realChar = originalText[realPos];
    
    if (/\s/.test(realChar)) {
      // Skip consecutive whitespace in original
      while (realPos < originalText.length && /\s/.test(originalText[realPos])) {
        realPos++;
      }
      // Count as one space in normalized
      normPos++;
    } else {
      realPos++;
      normPos++;
    }
  }
  
  return realPos <= originalText.length ? realPos : -1;
}



function navigateToNextMatch() {
  if (!currentSearchMatches || currentSearchMatches.length === 0) {
    alert('No matches found to navigate to');
    return;
  }
  
  const currentIndex = currentSearchSelection?.matchIndex ?? -1;
  let nextIndex = currentIndex + 1;
  
  if (nextIndex >= currentSearchMatches.length) {
    nextIndex = 0; // Wrap to first match
  }
  
  setCurrentSearchSelection(currentSearchMatches[nextIndex], nextIndex);
}

function navigateToPreviousMatch() {
  if (!currentSearchMatches || currentSearchMatches.length === 0) {
    alert('No matches found to navigate to');
    return;
  }
  
  const currentIndex = currentSearchSelection?.matchIndex ?? currentSearchMatches.length;
  let prevIndex = currentIndex - 1;
  
  if (prevIndex < 0) {
    prevIndex = currentSearchMatches.length - 1; // Wrap to last match
  }
  
  setCurrentSearchSelection(currentSearchMatches[prevIndex], prevIndex);
}

// Duplicate clearSearchHighlights function removed - now using clearSearchOverlays

  // ======= Event Listeners =======
  
  // File loading
  elements.htmlFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      currentHtml = await readFileAsText(file);
      currentFileName = file.name;

      // Debug logging for file loading
      console.log('=== FILE LOADING DEBUG ===');
      console.log('File name:', file.name);
      console.log('File size:', file.size, 'bytes');
      console.log('File type:', file.type);
      console.log('File last modified:', new Date(file.lastModified));
      console.log('File webkitRelativePath:', file.webkitRelativePath || 'Not available');
      console.log('Note: Browser security prevents access to the original file path');
      console.log('Available file properties:', Object.getOwnPropertyNames(file));
      console.log('=========================');

      // Reset source view state
      sourceViewModified = false;
      isSourceView = false;
      elements.viewToggle.textContent = 'View Source';
      elements.viewToggle.classList.remove('active');
      
      extractExistingLabels(currentHtml);
      renderHtmlContent();
      refreshGroupsDisplay(); // Update groups display after parsing
      elements.downloadBtn.disabled = false;
      elements.saveAsBtn.disabled = false;
      elements.viewToggle.disabled = false;

      
    } catch (error) {
    alert('Error reading HTML file');
    console.error(error);
  } finally {
    // ✅ Reset input so the same file can be uploaded again
    e.target.value = '';
  }
  });

  // Upload link removed - now using proper button in HTML

  // ✅ Gestion drag & drop
  ['dragenter', 'dragover'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.dropZone.classList.remove('dragover');
    });
  });

  elements.dropZone.addEventListener('drop', async (e) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;

    // on déclenche la même logique que le fileInput
    try {
      currentHtml = await readFileAsText(file);
      currentFileName = file.name;


      sourceViewModified = false;
      isSourceView = false;
      elements.viewToggle.textContent = 'View Source';
      elements.viewToggle.classList.remove('active');

      extractExistingLabels(currentHtml);
      renderHtmlContent();
      elements.downloadBtn.disabled = false;
      elements.saveAsBtn.disabled = false;
      elements.viewToggle.disabled = false;

    } catch (error) {
      alert('Error reading HTML file');
      console.error(error);
    }
  });

  // ======= Download Functions =======
  function prepareHtmlForDownload() {
    if (!currentHtml) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHtml, 'text/html');

    // 1. Remove delete buttons
    const deleteButtons = doc.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => button.remove());

    // 2. Build JSON schema from your current labels tree
    const schema = buildSchemaFromLabels(labels);
    const schemaJson = JSON.stringify(schema, null, 2);

    // 3. Find existing HTMLLabelizer comment
    let found = false;
    const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT, null);
    let commentNode;
    while ((commentNode = walker.nextNode())) {
      if (commentNode.nodeValue && commentNode.nodeValue.trim().startsWith("HTMLLabelizer")) {
        // Replace old content
        commentNode.nodeValue = " HTMLLabelizer\n" + schemaJson + "\n";
        found = true;
        break;
      }
    }

    // 4. If not found, insert before <head>
    if (!found) {
      const newComment = doc.createComment(" HTMLLabelizer\n" + schemaJson + "\n");
      const htmlEl = doc.documentElement;
      const headEl = htmlEl.querySelector("head");
      htmlEl.insertBefore(newComment, headEl);
    }

    // 5. Serialize back to HTML
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }

  function downloadFile() {
    const finalHtml = prepareHtmlForDownload();
    if (!finalHtml) return;

    const fileName = currentFileName || 'labeled.html';
    console.log('Downloading file:', fileName);

    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveAsFile() {
    const finalHtml = prepareHtmlForDownload();
    if (!finalHtml) return;

    console.log('Save As - File System Access API available:', 'showSaveFilePicker' in window);

    // Use File System Access API if available, fallback to traditional download
    if ('showSaveFilePicker' in window) {
      // Modern browsers with File System Access API
      (async () => {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: currentFileName || 'labeled.html',
            types: [
              {
                description: 'HTML files',
                accept: {
                  'text/html': ['.html', '.htm']
                }
              }
            ]
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(finalHtml);
          await writable.close();
          
          console.log('File saved successfully using File System Access API');
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Failed to save file:', err);
            // Fallback to regular download
            downloadFile();
          } else {
            console.log('User cancelled save dialog');
          }
        }
      })();
    } else {
      // Fallback for browsers that don't support File System Access API
      console.log('File System Access API not available, using fallback');
      const blob = new Blob([finalHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFileName || 'labeled.html';
      
      // Try to open in new window for manual save
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(finalHtml)}`;
      const newWindow = window.open(dataUrl, '_blank');
      if (!newWindow) {
        // If popup is blocked, fallback to regular download
        console.log('Popup blocked, falling back to regular download');
        a.click();
      } else {
        console.log('Opened in new window - user can save manually');
      }
      
      URL.revokeObjectURL(url);
    }
  }

  // Download button event listener
  elements.downloadBtn.addEventListener('click', downloadFile);

  // Save As button event listener
  elements.saveAsBtn.addEventListener('click', saveAsFile);


  // Clear all
  elements.clearBtn.addEventListener('click', () => {
    if (confirm('Clear all content and labels?')) {
      currentHtml = '';
      currentFileName = '';
      labels.clear();
      expandedNodes.clear();
      selectedNode = null;
      sourceViewModified = false;
      isSourceView = false;
      elements.viewToggle.textContent = 'View Source';
      elements.viewToggle.classList.remove('active');
      
      // Clear advanced content section
      elements.advancedContent.innerHTML = '';
      clearSearchOverlays();
      
      renderHtmlContent();
      refreshTreeUI();
      elements.downloadBtn.disabled = true;
      elements.saveAsBtn.disabled = true;
      elements.viewToggle.disabled = true;
      refreshGroupsDisplay();
    }
  });

  // Add root label
  elements.addRootLabel.addEventListener('click', () => {
    const name = elements.newLabelName.value.trim();
    const color = elements.newLabelColor.value;
    
    if (addLabel(name, color)) {
      elements.newLabelName.value = '';
      elements.newLabelColor.value = generateRandomColor();
    }
  });

  // Enter key for adding labels
  elements.newLabelName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      elements.addRootLabel.click();
    }
  });

  // Parameter menu event listeners removed - now auto-saves on close

// ======= Enhanced Text Selection Handling =======
document.addEventListener('mouseup', (e) => {
  if (elements.contextMenu.contains(e.target) || elements.paramMenu.contains(e.target)) return;
  
  const selection = window.getSelection();
  
  if (!selection.isCollapsed && selection.toString().trim()) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Check if selection is in HTML content or advanced content
    const isInHtmlContent = elements.htmlContent.contains(container) || elements.htmlContent === container;
    const isInAdvancedContent = elements.advancedContent.contains(container) || elements.advancedContent === container;
    
    if (isInHtmlContent || isInAdvancedContent) {
      if (multiSelectionMode && ctrlPressed) {
        // Add to multi-selection
        if (addToMultiSelection(range, container)) {
          console.log(`Added selection ${multiSelections.length}: "${range.toString().trim()}"`);
        }
        // Clear the visual selection but keep our stored ranges
        selection.removeAllRanges();
        return;
      } else if (!multiSelectionMode) {
        // Single selection mode
        if (isInAdvancedContent) {
          console.log('Advanced content mouse selection made:', selection.toString().trim());
          // Advanced content mouse selection - DON'T interfere with search selection
          currentAdvancedMouseSelection = {
            text: selection.toString().trim(),
            range: range.cloneRange(),
            isAdvanced: true
          };
          currentSelection = null; // Clear regular selection
        } else {
          console.log('HTML content mouse selection made:', selection.toString().trim());
          // HTML content mouse selection - completely separate from search selections
          currentSelection = {
            text: selection.toString().trim(),
            range: range.cloneRange(),
            isAdvanced: false
          };
          currentAdvancedMouseSelection = null; // Clear advanced mouse selection
          // NOTE: We don't touch currentSearchSelection - search selections are managed independently
        }
        
        showContextMenu(e.clientX, e.clientY);
        return;
      }
    }
  }
  
  // If we reach here and we're not in multi-selection mode, hide menus
  if (!multiSelectionMode) {
    hideContextMenu();
    hideParameterMenu();
  }
});

  // Hide menus when clicking elsewhere
  document.addEventListener('mousedown', (e) => {
    if (!elements.contextMenu.contains(e.target)) {
      hideContextMenu();
      // Clear mouse selections when hiding context menu (but preserve search selection)
      currentSelection = null;
      currentAdvancedMouseSelection = null;
    }
    if (!elements.paramMenu.contains(e.target)) {
      hideParameterMenu();
    }
    if (!ctrlPressed && multiSelectionMode && !elements.contextMenu.contains(e.target)) {
      clearMultiSelectionHighlights();
      multiSelections = [];
      multiSelectionMode = false;
    }
  });

  // Hide menus on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideContextMenu();
      hideParameterMenu();
      // Clear mouse selections but preserve search selection
      currentSelection = null;
      currentAdvancedMouseSelection = null;
    }
  });

  // Source view input tracking
elements.viewToggle.addEventListener('click', toggleView);
elements.sourceView.addEventListener('input', () => {
  sourceViewModified = true;
});



// ADD KEYBOARD SHORTCUTS FOR SOURCE VIEW
elements.sourceView.addEventListener('keydown', (e) => {
  // Ctrl+S or Cmd+S to save changes
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    applySourceChanges();
  }
  
  // Ctrl+Z or Cmd+Z to discard changes
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
    e.preventDefault();
    if (sourceViewModified) {
      const shouldDiscard = confirm('Discard all changes in source view?');
      if (shouldDiscard) {
        elements.sourceView.value = currentHtml;
        sourceViewModified = false;
      }
    }
  }
});


// ======= Keyboard Event Handlers =======
// Add these event listeners to handle Ctrl key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Control' || e.key === 'Meta') {
    if (!ctrlPressed) {
      ctrlPressed = true;
      // Only activate multiselection mode if no other keys are pressed
      // and we're not in an input field or the source view
      if (!e.shiftKey && !e.altKey && 
          !document.activeElement.matches('input, textarea, select') &&
          !elements.sourceView.contains(document.activeElement)) {
        // Delay activation slightly to allow for keyboard shortcuts like Ctrl+F
        setTimeout(() => {
          if (ctrlPressed && !document.activeElement.matches('input, textarea, select')) {
            multiSelectionMode = true;
            document.body.classList.add('multi-selection-mode');
          }
        }, 100);
      }
    }
  }
  
  // Check for common Ctrl combinations that should NOT activate multiselection
  if ((e.ctrlKey || e.metaKey) && ['f', 'h', 'g', 's', 'z', 'y', 'a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
    // These are browser shortcuts, don't activate multiselection mode
    ctrlPressed = false;
    multiSelectionMode = false;
    document.body.classList.remove('multi-selection-mode');
  }
  
  // Existing escape key handling
  if (e.key === 'Escape') {
    hideContextMenu();
    hideParameterMenu();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Control' || e.key === 'Meta') {
    ctrlPressed = false;
    document.body.classList.remove('multi-selection-mode');
    
    // If we have selections and we're releasing Ctrl, show context menu
    if (multiSelectionMode && multiSelections.length > 0) {
      // Use the last click position or center of screen
      const x = window.lastClickX ?? window.innerWidth / 2;
      const y = window.lastClickY ?? window.innerHeight / 2;
      showContextMenu(x, y);
    } else if (multiSelections.length === 0) {
      // No selections made, exit multi-selection mode
      multiSelectionMode = false;
    }
  }
});

// Keep overlays positioned correctly on scroll/resize
window.addEventListener('scroll', updateMultiSelectionOverlays);
window.addEventListener('resize', updateMultiSelectionOverlays);

// Also update search overlays on scroll and resize
elements.htmlContent.addEventListener('scroll', updateSearchOverlayPositions);
window.addEventListener('resize', updateSearchOverlayPositions);


elements.advancedContent.addEventListener('input', () => {
  const searchText = elements.advancedContent.textContent.trim().replace(/×/g, '');
  
  // Clear existing timeout
  clearTimeout(searchTimeout);
  
  // If search text is too short, clear highlights and return
  if (searchText.length < MIN_SEARCH_LENGTH) {
    clearSearchOverlays();
    return;
  }
  
  // Set new timeout for debounced search
  searchTimeout = setTimeout(() => {
    if (searchText && currentHtml) {
      console.log('Searching for:', searchText);
      searchInHtmlContent(searchText);
    } else {
      clearSearchOverlays();
    }
  }, SEARCH_DEBOUNCE_MS);
});


elements.applyAdvanced.addEventListener('click', () => {
  applyAdvancedLabels();
});

elements.navigatePrevious.addEventListener('click', () => {
  navigateToPreviousMatch();
});
elements.navigateNext.addEventListener('click', () => {
  navigateToNextMatch();
});

elements.applyAllAdvanced.addEventListener('click', () => {
  if (!currentSearchMatches || currentSearchMatches.length === 0) {
    alert('No matches found');
    return;
  }
  
  const advancedLabels = elements.advancedContent.querySelectorAll('manual_label');
  if (advancedLabels.length === 0) {
    alert('No labels defined in advanced content');
    return;
  }
  
  // NEW VALIDATION: Check if ALL text is labeled by exactly ONE root label
  if (!isFullyLabeled()) {
    alert("Please ensure all text is covered by exactly ONE main label in the advanced content. You cannot have multiple separate labels at the root level - all text must be within a single parent label (which can contain nested labels).");
    return;
  }
  
  // Store the search text for re-searching at the end
  const searchText = getCleanAdvancedText();
  
  // Apply to all current search matches IN REVERSE ORDER
  // This prevents DOM modifications from invalidating subsequent matches
  let totalApplied = 0;
  let skipped = 0;
  
  // Process matches from last to first to avoid DOM invalidation issues
  for (let i = currentSearchMatches.length - 1; i >= 0; i--) {
    const match = currentSearchMatches[i];
    try {
      // Handle both simple matches and enhanced multi-node matches
      let primaryNode, secondaryNode;
      
      if (match.isMultiNode) {
        primaryNode = match.startNode;
        secondaryNode = match.endNode;
        
        if (!primaryNode || !primaryNode.parentNode || !secondaryNode || !secondaryNode.parentNode) {
          console.warn(`Skipping match ${i}: nodes no longer valid`);
          skipped++;
          continue;
        }
      } else {
        primaryNode = match.node;
        
        if (!primaryNode || !primaryNode.parentNode) {
          console.warn(`Skipping match ${i}: node no longer valid`);
          skipped++;
          continue;
        }
      }

      // Create range for this match
      const range = document.createRange();
      
      try {
        if (match.isMultiNode) {
          range.setStart(match.startNode, match.startOffset);
          range.setEnd(match.endNode, match.endOffset);
        } else {
          range.setStart(match.node, match.startOffset);
          range.setEnd(match.node, match.endOffset);
        }
        
        // Apply the advanced label structure
        applyAdvancedStructureSimple(range);
        
        totalApplied++;
        
      } catch (rangeError) {
        console.warn(`Could not create range for match ${i}:`, rangeError);
        skipped++;
      }
      
    } catch (e) {
      console.warn(`Could not apply label to match ${i}:`, e);
      skipped++;
    }
  }
  
  // Update currentHtml after all applications
  updateCurrentHtmlFromDOM();
  
  // Clear current search selection
  currentSearchSelection = null;
  
  // Show results
  let message = `Applied labels to ${totalApplied} matches`;
  if (skipped > 0) {
    message += ` (${skipped} skipped due to errors)`;
  }
  alert(message);
  
  // Re-search to update highlights
  setTimeout(() => {
    if (searchText && searchText.length >= MIN_SEARCH_LENGTH) {
      searchInHtmlContent(searchText);
    } else {
      clearSearchOverlays();
    }
    
    // Refresh event listeners and stats
    attachLabelEventListeners();
    updateStats();
  }, 10);
});

// Clear advanced content
elements.clearAdvancedLabels.addEventListener('click', () => {
  elements.advancedContent.innerHTML = '';
  clearSearchOverlays();
  updateStats();
});

elements.htmlContent.addEventListener('DOMSubtreeModified', refreshGroupsDisplay);


// When a click occurs, store the coordinates
window.addEventListener('click', (event) => {
  window.lastClickX = event.clientX;
  window.lastClickY = event.clientY;
});

  // ======= Theme Management =======
  
  // Theme settings keys for localStorage
  const THEME_STORAGE_KEY = 'htmlLabelizer_theme';
  const CONTRAST_STORAGE_KEY = 'htmlLabelizer_contrast';
  const BACKGROUND_STORAGE_KEY = 'htmlLabelizer_background';
  
  // Theme state
  let currentTheme = 'light';
  let textContrast = 100;
  let backgroundWarmth = 50;
  
  // Initialize theme system
  function initializeTheme() {
    // Load saved preferences
    loadThemeSettings();
    
    // Apply initial theme
    applyTheme(currentTheme);
    applyContrast(textContrast);
    
    // Initialize HTML content background for light theme
    if (currentTheme === 'light') {
      const root = document.documentElement;
      root.style.setProperty('--html-content-bg', '#ffffff');
    }
    
    applyBackgroundWarmth(backgroundWarmth);
    
    // Update UI controls
    updateThemeControls();
  }
  
  // Load theme settings from localStorage
  function loadThemeSettings() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const savedContrast = localStorage.getItem(CONTRAST_STORAGE_KEY);
    const savedBackground = localStorage.getItem(BACKGROUND_STORAGE_KEY);
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      currentTheme = savedTheme;
    }
    
    if (savedContrast !== null) {
      const contrast = parseInt(savedContrast, 10);
      if (!isNaN(contrast) && contrast >= 0 && contrast <= 100) {
        textContrast = contrast;
      }
    }
    
    if (savedBackground !== null) {
      const background = parseInt(savedBackground, 10);
      if (!isNaN(background) && background >= 0 && background <= 100) {
        backgroundWarmth = background;
      }
    }
  }
  
  // Save theme settings to localStorage
  function saveThemeSettings() {
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    localStorage.setItem(CONTRAST_STORAGE_KEY, textContrast.toString());
    localStorage.setItem(BACKGROUND_STORAGE_KEY, backgroundWarmth.toString());
  }
  
  // Apply theme to document
  function applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    
    currentTheme = theme;
    saveThemeSettings();
    
    // Reapply background warmth for the new theme
    applyBackgroundWarmth(backgroundWarmth);
  }
  
  // Apply text contrast
  function applyContrast(contrast) {
    const root = document.documentElement;
    const opacity = contrast / 100;
    
    root.style.setProperty('--contrast-opacity', opacity);
    textContrast = contrast;
    saveThemeSettings();
    
    // Update preview text
    updateContrastPreview(contrast);
  }
  
  // Apply background warmth
  function applyBackgroundWarmth(warmth) {
    const root = document.documentElement;
    
    if (currentTheme === 'dark') {
      // Dark theme: 0 = very dark, 100 = lighter/warmer dark
      const intensity = warmth / 100;
      const baseR = 11 + (intensity * 20);  // 11 to 31
      const baseG = 16 + (intensity * 25);  // 16 to 41  
      const baseB = 32 + (intensity * 30);  // 32 to 62
      
      root.style.setProperty('--bg-custom', `rgb(${Math.round(baseR)}, ${Math.round(baseG)}, ${Math.round(baseB)})`);
      root.style.setProperty('--bg', 'var(--bg-custom)');
    } else {
      // Light theme: 0 = cool white, 100 = warm grey
      const intensity = warmth / 100;
      const baseR = 245 - (intensity * 30);  // 245 to 215 (warmer)
      const baseG = 247 - (intensity * 25);  // 247 to 222
      const baseB = 250 - (intensity * 35);  // 250 to 215 (less blue, more warm)
      
      root.style.setProperty('--bg-custom', `rgb(${Math.round(baseR)}, ${Math.round(baseG)}, ${Math.round(baseB)})`);
      root.style.setProperty('--bg', 'var(--bg-custom)');
      
      // Also update HTML content background for light theme to be more grey/warm
      const contentR = 255 - (intensity * 50);  // 255 to 205 (more noticeable change)
      const contentG = 255 - (intensity * 45);  // 255 to 210
      const contentB = 255 - (intensity * 55);  // 255 to 200 (warmer, less blue)
      
      root.style.setProperty('--html-content-bg', `rgb(${Math.round(contentR)}, ${Math.round(contentG)}, ${Math.round(contentB)})`);
    }
    
    backgroundWarmth = warmth;
    saveThemeSettings();
    
    // Update preview
    updateBackgroundPreview(warmth);
  }

  // Update background preview
  function updateBackgroundPreview(warmth) {
    const preview = document.getElementById('background-preview');
    if (preview) {
      const percentage = Math.round(warmth);
      const descriptor = currentTheme === 'dark' ? 
        (warmth < 33 ? 'Very Dark' : warmth < 66 ? 'Medium Dark' : 'Warm Dark') :
        (warmth < 33 ? 'Cool White' : warmth < 66 ? 'Neutral' : 'Warm Grey');
      
      preview.textContent = `Background: ${percentage}% - ${descriptor}`;
      
      // Apply the same background calculation for preview
      if (currentTheme === 'dark') {
        const intensity = warmth / 100;
        const baseR = 11 + (intensity * 20);
        const baseG = 16 + (intensity * 25);
        const baseB = 32 + (intensity * 30);
        preview.style.background = `rgb(${Math.round(baseR)}, ${Math.round(baseG)}, ${Math.round(baseB)})`;
      } else {
        const intensity = warmth / 100;
        const baseR = 245 - (intensity * 30);
        const baseG = 247 - (intensity * 25);
        const baseB = 250 - (intensity * 35);
        preview.style.background = `rgb(${Math.round(baseR)}, ${Math.round(baseG)}, ${Math.round(baseB)})`;
      }
    }
  }

  // Update contrast preview text
  function updateContrastPreview(contrast) {
    const preview = document.getElementById('contrast-preview');
    if (preview) {
      const percentage = Math.round(contrast);
      preview.textContent = `Text visibility: ${percentage}% - This is how your text will appear`;
      preview.style.color = `rgba(var(--text-rgb), ${contrast / 100})`;
    }
  }
  
  // Update theme controls in settings modal
  function updateThemeControls() {
    const themeToggle = document.getElementById('theme-toggle');
    const contrastSlider = document.getElementById('contrast-slider');
    const backgroundSlider = document.getElementById('background-slider');
    
    if (themeToggle) {
      themeToggle.checked = currentTheme === 'light';
    }
    
    if (contrastSlider) {
      contrastSlider.value = textContrast;
      updateContrastPreview(textContrast);
    }
    
    if (backgroundSlider) {
      backgroundSlider.value = backgroundWarmth;
      updateBackgroundPreview(backgroundWarmth);
    }
  }
  
  // Toggle between light and dark theme
  function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }
  
  // Reset to default settings
  function resetThemeSettings() {
    applyTheme('light');
    applyContrast(100);
    applyBackgroundWarmth(50);
    updateThemeControls();
  }
  
  // Setup event listeners for theme controls
  function setupThemeEventListeners() {
    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    
    // Contrast slider
    const contrastSlider = document.getElementById('contrast-slider');
    
    // Background slider
    const backgroundSlider = document.getElementById('background-slider');
    
    // Reset button
    const resetBtn = document.getElementById('reset-settings');
    
    // Open settings modal
    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        updateThemeControls();
      });
    }
    
    // Close settings modal
    const closeModal = () => {
      if (settingsModal) {
        settingsModal.classList.add('hidden');
      }
    };
    
    if (settingsOverlay) {
      settingsOverlay.addEventListener('click', closeModal);
    }
    
    if (settingsCloseBtn) {
      settingsCloseBtn.addEventListener('click', closeModal);
    }
    
    // Handle ESC key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
        closeModal();
      }
    });
    
    // Theme toggle handler
    if (themeToggle) {
      themeToggle.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'light' : 'dark';
        applyTheme(newTheme);
      });
    }
    
    // Contrast slider handler
    if (contrastSlider) {
      contrastSlider.addEventListener('input', (e) => {
        const contrast = parseInt(e.target.value, 10);
        applyContrast(contrast);
      });
    }
    
    // Background slider handler
    if (backgroundSlider) {
      backgroundSlider.addEventListener('input', (e) => {
        const warmth = parseInt(e.target.value, 10);
        applyBackgroundWarmth(warmth);
      });
    }
    
    // Reset button handler
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetThemeSettings();
      });
    }
  }

  // ======= Initialize =======
  elements.newLabelColor.value = generateRandomColor();
  initializeGroupsHeader();
  refreshTreeUI();
  
  // Initialize theme system
  initializeTheme();
  setupThemeEventListeners();
  
  // Initialize empty state event listeners on page load
  attachEmptyStateEventListeners();
  
  console.log('Enhanced HTML Labelizer ready!');

})();