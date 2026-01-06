// Parameter Menu Module
// Copied exactly from labelizer/app.js lines 268-341 (makeDraggable) and 2376-2608 (showParameterMenu)

/**
 * Make element draggable by handle
 * Copied from labelizer/app.js lines 268-341
 */
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

/**
 * Get label by path from labels map
 */
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

/**
 * Show parameter menu for a label element (READ-ONLY MODE)
 * Copied from labelizer/app.js lines 2376-2608 but WITHOUT editing capability
 * EXACT LOGIC: Only show if labelData.params.size > 0
 */
export function showParameterMenu(labelElement, labels, x, y) {
  hideParameterMenu();

  const labelName = labelElement.getAttribute("labelName");
  const parent = labelElement.getAttribute("parent") || "";

  if (!labelName) {
    return;
  }

  const path = parent ? [parent, labelName] : [labelName];
  const labelData = getLabelByPath(path, labels);

  // CRITICAL CHECK: Same as labelizer line 2389
  // Don't show menu if no label data OR no parameters defined
  if (!labelData || labelData.params.size === 0) {
    return;
  }

  // Create parameter menu
  const paramMenu = document.createElement('div');
  paramMenu.id = 'param-menu';
  paramMenu.className = 'param-menu';

  // Create title (drag handle)
  const title = document.createElement('h4');
  title.textContent = `View Parameters - ${labelName}`;
  title.style.color = labelData.color || 'var(--accent)';
  paramMenu.appendChild(title);

  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'param-close-btn';
  closeBtn.textContent = '×';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    hideParameterMenu();
  };
  paramMenu.appendChild(closeBtn);

  // Collect group attribute names to exclude them (same as labelizer line 2408)
  const groupAttributeNames = new Set();
  if (labelData.groupConfig && labelData.groupConfig.groupAttributes) {
    labelData.groupConfig.groupAttributes.forEach((value, name) => {
      groupAttributeNames.add(name);
    });
  }

  // Create form container for displaying parameters (read-only)
  const form = document.createElement('div');
  form.className = 'param-form';

  // Display parameters based on labelData.params (same logic as labelizer)
  // Only show non-group parameters
  labelData.params.forEach((paramDef, paramName) => {
    // Skip if this is a group attribute (silver)
    if (groupAttributeNames.has(paramName)) {
      return;
    }

    const paramRow = document.createElement("div");
    paramRow.className = "param-row";

    const label = document.createElement("label");
    label.textContent = paramName + ":";

    // Check if this is the group ID (gold) parameter
    const isGroupId = labelData.groupConfig && labelData.groupConfig.groupIdAttribute === paramName;
    if (isGroupId) {
      label.classList.add("gold-label");
    }

    // Get current value from HTML element attribute
    const currentValue = labelElement.getAttribute(paramName) || "";

    // Create read-only display
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

  // Position menu
  const menuWidth = 250;
  const menuHeight = 200;

  x = Math.min(x, window.innerWidth - menuWidth - 10);
  y = Math.min(y, window.innerHeight - menuHeight - 10);

  paramMenu.style.left = `${x}px`;
  paramMenu.style.top = `${y}px`;
  
  document.body.appendChild(paramMenu);

  // Make the parameter menu draggable by its title
  makeDraggable(paramMenu, title);

  // Close on outside click - using mousedown event like labelizer (line 7131)
  // setTimeout ensures this handler is added after the current click completes
  setTimeout(() => {
    const outsideClickHandler = (e) => {
      // Only close if click is outside the menu
      if (!paramMenu.contains(e.target)) {
        hideParameterMenu();
        document.removeEventListener('mousedown', outsideClickHandler);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    
    // Close on Escape key (like labelizer line 7144)
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

/**
 * Hide parameter menu
 */
export function hideParameterMenu() {
  const existing = document.getElementById('param-menu');
  if (existing) {
    existing.remove();
  }
}
