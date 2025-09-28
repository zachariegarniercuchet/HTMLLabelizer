(() => {
  // ======= State =======
  let currentHtml = '';
  let currentFileName = '';
  let isSourceView = false;
  let sourceViewModified = false;
  const labels = new Map(); // name -> {color, type, sublabels, params}
  let currentSelection = null;
  let expandedNodes = new Set(); // Track expanded tree nodes
  let selectedNode = null; // Track selected tree node
  let currentParamElement = null; // Track element being edited for parameters

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
    saveParams: document.getElementById('save-params'),
    cancelParams: document.getElementById('cancel-params'),
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



  // ======= Enhanced Label Management =======

  function createLabel(name, color, type = "structured", params = {}) {
    return {
      name,
      color,
      type,
      params: new Map(Object.entries(params)),
      sublabels: new Map()  // nested label tree
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
      
      //actions.appendChild(addBtn);
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
          // Render parameters first
          label.params.forEach((value, paramName) => {
            const paramItem = createParameterItem(nodePath, paramName, value, level + 1, treeNode);
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

  function createParameterItem(labelPath, paramName, paramValue, level, treeNode) {
    const paramNode = document.createElement('div');
    paramNode.className = 'tree-node';
    
    const paramItem = document.createElement('div');
    paramItem.className = `tree-item level-${level}`;
    
    // Empty expand button for alignment
    const expandBtn = document.createElement('button');
    expandBtn.className = 'tree-expand-btn no-children';
    
    // Parameter icon
    const icon = document.createElement('div');
    icon.className = 'tree-icon param';
    
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
    editBtn.title = 'Edit parameter';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      promptEditParameter(labelPath, paramName, paramValue, treeNode);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tree-action-btn delete';
    deleteBtn.title = 'Delete parameter';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Delete parameter "${paramName}"?`)) {
        deleteParameter(labelPath, paramName);
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

  // ======= User Interaction Prompts =======

  function promptAddSublabel(parentPath, container) {
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

  // Render default value input depending on type
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
        // No default value input for dropdown anymore
        }
  }

  // Initial default input
  renderDefaultInput("string");

  // Show/hide dropdown section + change default input
  typeSelect.onchange = () => {
    if (typeSelect.value === "dropdown") {
      dropdownSection.classList.remove("hidden");
      renderDefaultInput("dropdown", Array.from(valuesList.querySelectorAll("input")).map(i => i.value.trim()).filter(v => v));
    } else if (typeSelect.value === "checkbox") {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("checkbox");
    } else {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("string");
    }
  };

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

  // If all checks passed → save
  addParameter(labelPath, paramName, paramValue);
  inlineEditor.remove();
  const nodeId = labelPath.join(".");
  expandedNodes.add(nodeId);
  renderTree();
};

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

  // Name
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = oldParamName;
  nameInput.placeholder = "Parameter name";

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
        // No default value input for dropdown anymore
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

  // If all checks passed → save
  addParameter(labelPath, paramName, paramValue);
  inlineEditor.remove();
  const nodeId = labelPath.join(".");
  expandedNodes.add(nodeId);
  renderTree();
};

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
    //alert("This label has no parameters to edit");
    return;
  }

  elements.paramMenuTitle.textContent = `Edit Parameters - ${labelName}`;
  elements.paramForm.innerHTML = "";

  // Create inputs depending on param type
  labelData.params.forEach((paramDef, paramName) => {
    const paramRow = document.createElement("div");
    paramRow.className = "param-row";
    paramRow.style.position = "relative"; // For dropdown positioning

    const label = document.createElement("label");
    label.textContent = paramName + ":";

    let input;

    if (typeof paramDef === "object" && paramDef.type) {
      const type = paramDef.type;
      const currentVal = labelElement.getAttribute(paramName) ?? paramDef.default ?? "";

      if (type === "string") {
        input = document.createElement("input");
        input.type = "text";
        input.value = currentVal;
        
        // ADD SUGGESTION FUNCTIONALITY FOR STRING INPUTS
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
          // Delay removal to allow clicking on suggestions
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
      // Fallback: treat as string with suggestions
      input = document.createElement("input");
      input.type = "text";
      input.value = labelElement.getAttribute(paramName) || paramDef || "";
      
      // ADD SUGGESTION FUNCTIONALITY FOR FALLBACK STRING INPUTS
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
}


  function hideParameterMenu() {
    elements.paramMenu.classList.add('hidden');
    currentParamElement = null;
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

  hideParameterMenu();
  updateStats();
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
  labels.clear();

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

  // 2. If schema found, build labels
  if (schema) {
    buildLabelsFromSchema(schema);
  }

  refreshTreeUI();
}

function buildLabelsFromSchema(schema, parent = null, map = labels) {
  Object.entries(schema).forEach(([name, def]) => {
  // prepare params
  const paramsMap = new Map();
  if (def.attributes && typeof def.attributes === "object") {
    Object.entries(def.attributes).forEach(([pname, pdef]) => {
      paramsMap.set(pname, pdef);
    });
  }

  const labelObj = {
    name,
    color: def.color || generateRandomColor(),
    type: "structured",
    params: paramsMap,
    sublabels: new Map(),
    parent,
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
        <div class="empty-state">
          <h3>No HTML loaded</h3>
          <p>Upload an HTML file to start labeling</p>
        </div>
      `;
      // Update filename display
      if (elements.currentFilename) {
        elements.currentFilename.textContent = '';
      }
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
  }

  function hideContextMenu() {
    elements.contextMenu.classList.add('hidden');
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

  // Original single selection logic
  if (!currentSelection || !currentSelection.range) return;

  hideContextMenu();

  try {
    const range = currentSelection.range;
    const selectedText = range.toString().trim();
    if (!selectedText) return;

    const validation = isValidSelection(range);
    if (!validation.valid) {
      alert("Invalid Selection: " + validation.reason);
      return;
    }

    const previousMatchIndex = currentSelection.matchIndex;
    const wasAdvanced = currentSelection.isAdvanced;

    let labelElement = null;

    if (currentSelection.isAdvanced) {
      labelElement = applyLabelToAdvancedContent(range, labelPath, labelData);
      if (window.currentSearchMatches && window.currentSearchMatches.length > 0) {
        setTimeout(() => {
          restoreOrFindNextSelection(previousMatchIndex);
        }, 10);
      }
    } else {
      labelElement = applyLabelToHtmlContent(range, labelPath, labelData);
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


function restoreOrFindNextSelection(previousMatchIndex) {
  if (!window.currentSearchMatches || window.currentSearchMatches.length === 0) {
    currentSelection = null;
    return;
  }

  // Try to find a valid highlight at or after the previous position
  let targetIndex = previousMatchIndex || 0;
  let attempts = 0;
  
  while (attempts < window.currentSearchMatches.length) {
    const highlight = elements.htmlContent.querySelector(`[data-match-index="${targetIndex}"]`);
    if (highlight) {
      setCurrentSelection(window.currentSearchMatches[targetIndex], targetIndex);
      return;
    }
    targetIndex = (targetIndex + 1) % window.currentSearchMatches.length;
    attempts++;
  }
  
  // If no highlights found, clear selection
  currentSelection = null;
}

function applyLabelToAdvancedContent(range, labelPath, labelData) {
  const selectedText = range.toString().trim();
  if (!selectedText) return;

  // Store current match info before applying label
  const currentMatchIndex = currentSelection?.matchIndex;

  // Create the label element (same as HTML content)
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
  updateStats();

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
        updateStats();
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
function applyAdvancedLabels() {
  if (!currentSelection || !currentSelection.range) {
    alert("No current selection. Please navigate to a match first.");
    return;
  }

  const advancedLabels = elements.advancedContent.querySelectorAll("manual_label");
  if (advancedLabels.length === 0) {
    alert("No labels defined in advanced content");
    return;
  }

  // Store the current match info BEFORE applying labels
  const currentMatchIndex = currentSelection.matchIndex;
  const searchText = getCleanAdvancedText(); // Get the clean text from advanced content

  try {
    // Get the selected text from the current selection
    const selectedText = currentSelection.range.toString();
    
    // Get the clean advanced content text (what the user typed)
    const advancedText = getCleanAdvancedText();
    
    // NEW VALIDATION: Check if ALL text is labeled by exactly ONE root label
    if (!isFullyLabeled()) {
      alert("Please ensure all text is covered by exactly ONE main label in the advanced content. You cannot have multiple separate labels at the root level - all text must be within a single parent label (which can contain nested labels).");
      return;
    }
    
    // Verify that the selected text matches the advanced text
    if (normalizeText(selectedText) !== normalizeText(advancedText)) {
      alert(`Selected text "${selectedText}" doesn't match advanced content "${advancedText}"`);
      return;
    }

    // Create the exact label structure by cloning and adapting the advanced content
    const labelStructure = cloneAdvancedStructure();
    
    // Apply the structure to the current selection
    replaceSelectionWithStructure(currentSelection.range, labelStructure);

    // Update currentHtml
    updateCurrentHtmlFromDOM();
    
    // Clear current selection
    currentSelection = null;

    // Re-search with the ORIGINAL search text to find next match
    setTimeout(() => {
      if (searchText && searchText.length >= MIN_SEARCH_LENGTH) {
        const matches = searchInHtmlContent(searchText);
        
        if (matches.length > 0) {
          const availableHighlights = Array.from(elements.htmlContent.querySelectorAll('.search-highlight'))
            .map(h => ({
              element: h,
              index: parseInt(h.dataset.matchIndex)
            }))
            .filter(h => !isNaN(h.index))
            .sort((a, b) => a.index - b.index);

          if (availableHighlights.length > 0) {
            let targetHighlight = availableHighlights.find(h => h.index >= currentMatchIndex);
            
            if (!targetHighlight) {
              targetHighlight = availableHighlights[0];
            }
            
            setCurrentSelection(matches[targetHighlight.index], targetHighlight.index);
          }
        }
      }
    }, 10);

    window.getSelection().removeAllRanges();
    attachLabelEventListeners();
    updateStats();

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
    clearSearchHighlights();
    currentSelection = null;
    return [];
  }
  
  // Store current selection info before clearing highlights
  const previousMatchIndex = currentSelection?.matchIndex ?? 0;
  
  // Clear highlights BEFORE searching
  clearSearchHighlights();
  
  // Update currentHtml to reflect current DOM state (including new labels)
  updateCurrentHtmlFromDOM();
  
  // Find matches using the improved algorithm
  const matches = findTextMatches(elements.htmlContent, searchText);
  console.log(`Found ${matches.length} matches for "${searchText}"`);
  
  // Highlight matches
  highlightMatches(matches);
  
  // Try to find the first available highlight for navigation
  if (matches.length > 0) {
    // Get all current highlights in document order
    const availableHighlights = Array.from(elements.htmlContent.querySelectorAll('.search-highlight'))
      .map(h => ({
        element: h,
        index: parseInt(h.dataset.matchIndex)
      }))
      .filter(h => !isNaN(h.index))
      .sort((a, b) => a.index - b.index); // Sort by match index (document order)
    
    if (availableHighlights.length > 0) {
      // Try to find a highlight at or after the previous position
      let targetHighlight = availableHighlights.find(h => h.index >= previousMatchIndex);
      
      // If no match found after previous position, use the first available
      if (!targetHighlight) {
        targetHighlight = availableHighlights[0];
      }
      
      setCurrentSelection(matches[targetHighlight.index], targetHighlight.index);
    }
  } else {
    currentSelection = null;
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

function setCurrentSelection(match, matchIndex) {
  try {
    const highlightedElement = elements.htmlContent.querySelector(`[data-match-index="${matchIndex}"]`);
    
    if (!highlightedElement) {
      console.error('Could not find highlighted element for match index:', matchIndex);
      // Try to find any available highlight
      const anyHighlight = elements.htmlContent.querySelector('.search-highlight');
      if (anyHighlight) {
        const anyIndex = parseInt(anyHighlight.dataset.matchIndex) || 0;
        setCurrentSelection(window.currentSearchMatches[anyIndex], anyIndex);
        return;
      }
      currentSelection = null;
      return;
    }
    
    // Create range that selects the text content
    const range = document.createRange();
    
    if (highlightedElement.childNodes.length === 1 && 
        highlightedElement.firstChild.nodeType === Node.TEXT_NODE) {
      range.selectNodeContents(highlightedElement);
    } else {
      range.selectNode(highlightedElement);
    }
    
    currentSelection = {
      range: range,
      isAdvanced: false,
      matchIndex: matchIndex,
      text: highlightedElement.textContent,
      highlightElement: highlightedElement
    };
    
    updateCurrentSelectionHighlight(matchIndex);
    
    console.log(`Current selection set to match ${matchIndex}: "${currentSelection.text}"`);
  } catch (error) {
    console.error('Error setting current selection:', error);
    currentSelection = null;
  }
}

function updateCurrentSelectionHighlight(currentIndex) {
  // Remove current selection styling from all highlights
  const allHighlights = elements.htmlContent.querySelectorAll('.search-highlight');
  allHighlights.forEach(highlight => {
    highlight.classList.remove('current-selection');
    highlight.style.backgroundColor = '#ffff00';
    highlight.style.border = 'none';
  });
  
  // Add current selection styling to the current match
  const currentHighlight = elements.htmlContent.querySelector(`[data-match-index="${currentIndex}"]`);
  if (currentHighlight) {
    currentHighlight.classList.add('current-selection');
    currentHighlight.style.backgroundColor = '#ff6b35';
    currentHighlight.style.border = '2px solid #ff4500';
    currentHighlight.style.boxShadow = '0 0 4px rgba(255, 69, 0, 0.5)';
    
    // Scroll the current selection into view
    currentHighlight.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  }
}



function findTextMatches(element, searchText) {
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

function mapNormalizedToOriginalPosition(originalText, normalizedPosition) {
  let originalPos = 0;
  let normalizedPos = 0;
  
  while (originalPos < originalText.length && normalizedPos < normalizedPosition) {
    const char = originalText[originalPos];
    
    if (/\s/.test(char)) {
      // This is whitespace - in normalized version, multiple whitespace becomes single space
      // Skip consecutive whitespace in original
      while (originalPos < originalText.length && /\s/.test(originalText[originalPos])) {
        originalPos++;
      }
      normalizedPos++; // One space in normalized version
    } else {
      // Regular character
      originalPos++;
      normalizedPos++;
    }
  }
  
  return originalPos;
}

function highlightMatches(matches) {
  if (matches.length === 0) return;
  
  // Process matches in reverse order to maintain text positions
  // but keep original indices for proper navigation
  const indexedMatches = matches.map((match, originalIndex) => ({
    ...match,
    originalIndex
  }));
  
  const sortedMatches = [...indexedMatches].sort((a, b) => {
    const nodeComparison = a.node.compareDocumentPosition(b.node);
    if (nodeComparison & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    } else if (nodeComparison & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    } else {
      return b.startOffset - a.startOffset;
    }
  });
  
  sortedMatches.forEach((match) => {
    try {
      if (!match.node.parentNode || 
          match.startOffset >= match.node.textContent.length ||
          match.endOffset > match.node.textContent.length) {
        console.warn('Skipping invalid match:', match);
        return;
      }
      
      const range = document.createRange();
      range.setStart(match.node, match.startOffset);
      range.setEnd(match.node, match.endOffset);
      
      const highlight = document.createElement('span');
      highlight.className = 'search-highlight';
      highlight.style.backgroundColor = '#ffff00';
      highlight.style.color = '#000';
      highlight.style.padding = '1px 2px';
      highlight.style.borderRadius = '2px';
      // Use original index for proper navigation order
      highlight.dataset.matchIndex = match.originalIndex;
      
      range.surroundContents(highlight);
      
    } catch (e) {
      console.warn('Could not highlight match:', e, match);
    }
  });
  
  // Store matches for navigation (keep original order)
  window.currentSearchMatches = matches;
}

// Simple clear function
function clearSearchHighlights() {
  const highlights = elements.htmlContent.querySelectorAll('.search-highlight');
  highlights.forEach(highlight => {
    // Check if highlight contains a manual_label
    const manualLabel = highlight.querySelector('manual_label');
    
    if (manualLabel) {
      // If highlight contains a label, replace highlight with the label
      highlight.parentNode.replaceChild(manualLabel, highlight);
    } else {
      // Replace highlight with its content
      const parent = highlight.parentNode;
      const content = highlight.innerHTML;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      // Insert all content before the highlight
      while (tempDiv.firstChild) {
        parent.insertBefore(tempDiv.firstChild, highlight);
      }
      
      // Remove the highlight
      parent.removeChild(highlight);
    }
  });
  
  // Clean up empty tags like <i></i>
  const emptyTags = elements.htmlContent.querySelectorAll('i:empty, b:empty, em:empty, strong:empty, u:empty, s:empty, del:empty, sup:empty, sub:empty');
  emptyTags.forEach(tag => tag.remove());
  
  window.currentSearchMatches = [];
  currentSelection = null;
}

function navigateToNextMatch() {
  if (!window.currentSearchMatches || window.currentSearchMatches.length === 0) {
    alert('No matches found to navigate to');
    return;
  }
  
  const availableHighlights = Array.from(elements.htmlContent.querySelectorAll('.search-highlight'))
    .map(h => ({
      element: h,
      index: parseInt(h.dataset.matchIndex)
    }))
    .filter(h => !isNaN(h.index))
    .sort((a, b) => a.index - b.index);
  
  if (availableHighlights.length === 0) {
    alert('No more matches to navigate to');
    currentSelection = null;
    return;
  }
  
  const currentIndex = currentSelection?.matchIndex ?? -1;
  let nextHighlight = availableHighlights.find(h => h.index > currentIndex);
  
  if (!nextHighlight) {
    nextHighlight = availableHighlights[0];
  }
  
  setCurrentSelection(window.currentSearchMatches[nextHighlight.index], nextHighlight.index);
}

function navigateToPreviousMatch() {
  if (!window.currentSearchMatches || window.currentSearchMatches.length === 0) {
    alert('No matches found to navigate to');
    return;
  }
  
  const availableHighlights = Array.from(elements.htmlContent.querySelectorAll('.search-highlight'))
    .map(h => ({
      element: h,
      index: parseInt(h.dataset.matchIndex)
    }))
    .filter(h => !isNaN(h.index))
    .sort((a, b) => a.index - b.index);
  
  if (availableHighlights.length === 0) {
    alert('No more matches to navigate to');
    currentSelection = null;
    return;
  }
  
  const currentIndex = currentSelection?.matchIndex ?? Number.MAX_SAFE_INTEGER;
  const reverseHighlights = [...availableHighlights].reverse();
  let prevHighlight = reverseHighlights.find(h => h.index < currentIndex);
  
  if (!prevHighlight) {
    prevHighlight = availableHighlights[availableHighlights.length - 1];
  }
  
  setCurrentSelection(window.currentSearchMatches[prevHighlight.index], prevHighlight.index);
}

// Update the clear function to also clear current selection
function clearSearchHighlights() {
  const highlights = elements.htmlContent.querySelectorAll('.search-highlight');
  highlights.forEach(highlight => {
    // Check if highlight contains a manual_label
    const manualLabel = highlight.querySelector('manual_label');
    
    if (manualLabel) {
      // If highlight contains a label, replace highlight with the label
      highlight.parentNode.replaceChild(manualLabel, highlight);
    } else {
      // If highlight only contains text, replace with text node
      const parent = highlight.parentNode;
      const textNode = document.createTextNode(highlight.textContent);
      parent.replaceChild(textNode, highlight);
      parent.normalize();
    }
  });
  
  window.currentSearchMatches = [];
  currentSelection = null;
}

  // ======= Event Listeners =======
  
  // File loading
  elements.htmlFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      currentHtml = await readFileAsText(file);
      currentFileName = file.name;

      // Reset source view state
      sourceViewModified = false;
      isSourceView = false;
      elements.viewToggle.textContent = 'View Source';
      elements.viewToggle.classList.remove('active');
      
      extractExistingLabels(currentHtml);
      renderHtmlContent();
      elements.downloadBtn.disabled = false;
      elements.viewToggle.disabled = false;

      
    } catch (error) {
    alert('Error reading HTML file');
    console.error(error);
  } finally {
    // ✅ Reset input so the same file can be uploaded again
    e.target.value = '';
  }
  });

  document.getElementById('upload-link').addEventListener('click', (e) => {
    e.preventDefault(); // stop page jump
    document.getElementById('html-file-input').click();
  });

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
      elements.viewToggle.disabled = false;

    } catch (error) {
      alert('Error reading HTML file');
      console.error(error);
    }
  });

  // Download
  elements.downloadBtn.addEventListener('click', () => {
  if (!currentHtml) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(currentHtml, 'text/html');

  // 1. Remove delete buttons
  const deleteButtons = doc.querySelectorAll('.delete-btn');
  deleteButtons.forEach(button => button.remove());

  // 2. Build JSON schema from your current labels tree
  function buildSchemaFromLabels(map) {
    const obj = {};
    map.forEach(label => {
      obj[label.name] = {
        color: label.color,
        sublabels: buildSchemaFromLabels(label.sublabels),
        attributes: Object.fromEntries(label.params || []),
      };
    });
    return obj;
  }

  const schema = buildSchemaFromLabels(labels);
  const schemaJson = JSON.stringify(schema, null, 2); // pretty print

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
  const finalHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;

  // 6. Download
  const blob = new Blob([finalHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentFileName || 'labeled.html';
  a.click();
  URL.revokeObjectURL(url);
});


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
      renderHtmlContent();
      refreshTreeUI();
      elements.downloadBtn.disabled = true;
      elements.viewToggle.disabled = true;

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

  // Parameter menu event listeners
  elements.saveParams.addEventListener('click', saveParameters);
  elements.cancelParams.addEventListener('click', hideParameterMenu);

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
        console.log('Single selection made:', selection.toString().trim());
        currentSelection = {
          text: selection.toString().trim(),
          range: range.cloneRange(),
          isAdvanced: isInAdvancedContent
        };
        
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
      multiSelectionMode = true;
      document.body.classList.add('multi-selection-mode');
      
    }
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


elements.advancedContent.addEventListener('input', () => {
  const searchText = elements.advancedContent.textContent.trim().replace(/×.*$/, '');
  
  // Clear existing timeout
  clearTimeout(searchTimeout);
  
  // If search text is too short, clear highlights and return
  if (searchText.length < MIN_SEARCH_LENGTH) {
    clearSearchHighlights();
    return;
  }
  
  // Set new timeout for debounced search
  searchTimeout = setTimeout(() => {
    if (searchText && currentHtml) {
      console.log('Searching for:', searchText);
      searchInHtmlContent(searchText);
    } else {
      clearSearchHighlights();
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
  if (!window.currentSearchMatches || window.currentSearchMatches.length === 0) {
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
  
  // Get all current highlights
  const highlights = Array.from(elements.htmlContent.querySelectorAll('.search-highlight'));
  let totalApplied = 0;
  let skipped = 0;
  
  highlights.forEach(highlight => {
    try {
      // Set current selection to this highlight
      const matchIndex = parseInt(highlight.dataset.matchIndex) || 0;
      const range = document.createRange();
      range.selectNodeContents(highlight);
      
      // Verify the highlighted text matches the advanced content
      const highlightedText = highlight.textContent;
      const advancedText = getCleanAdvancedText();
      
      if (normalizeText(highlightedText) !== normalizeText(advancedText)) {
        console.warn(`Skipping highlight ${matchIndex}: text mismatch`);
        skipped++;
        return;
      }
      
      currentSelection = {
        range: range,
        isAdvanced: false,
        matchIndex: matchIndex,
        text: highlightedText,
        highlightElement: highlight
      };
      
      // Create the label structure and apply it
      const labelStructure = cloneAdvancedStructure();
      replaceSelectionWithStructure(range, labelStructure);
      
      totalApplied++;
      
    } catch (e) {
      console.warn('Could not apply label to highlight:', e);
      skipped++;
    }
  });
  
  // Update currentHtml after all applications
  updateCurrentHtmlFromDOM();
  
  // Clear current selection
  currentSelection = null;
  
  // Show results
  let message = `Applied labels to ${totalApplied} matches`;
  if (skipped > 0) {
    message += ` (${skipped} skipped due to text mismatches)`;
  }
  alert(message);
  
  // Re-search to update highlights
  setTimeout(() => {
    if (searchText && searchText.length >= MIN_SEARCH_LENGTH) {
      searchInHtmlContent(searchText);
    } else {
      clearSearchHighlights();
    }
    
    // Refresh event listeners and stats
    attachLabelEventListeners();
    updateStats();
  }, 10);
});

// Clear advanced content
elements.clearAdvancedLabels.addEventListener('click', () => {
  elements.advancedContent.innerHTML = '';
  clearSearchHighlights();
  updateStats();
});

// Clear advanced content
elements.clearAdvancedLabels.addEventListener('click', () => {
  elements.advancedContent.innerHTML = '';
  clearSearchHighlights();
  updateStats();
});


// When a click occurs, store the coordinates
window.addEventListener('click', (event) => {
  window.lastClickX = event.clientX;
  window.lastClickY = event.clientY;
});

  // ======= Initialize =======
  elements.newLabelColor.value = generateRandomColor();
  refreshTreeUI();
  console.log('Enhanced HTML Labelizer ready!');
})();