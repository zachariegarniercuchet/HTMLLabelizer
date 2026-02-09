// ======= Label Verification System =======
// This module handles the verification of labeled elements by parent label

(() => {
  // ======= Verification State =======
  let verificationMode = false;
  let currentParentLabelIndex = 0;
  let parentLabels = [];
  let currentLabelInstances = [];
  let currentInstanceIndex = 0;
  
  // ======= Filter State =======
  let activeFilters = {
    labelTypes: new Set(['manual', 'auto']), // manual, auto
    labelNames: new Set(), // parent label names
    verifiedStatus: new Set(['True', 'False']) // True, False
  };
  
  // ======= DOM Elements =======
  const verificationElements = {
    verifiedCount: document.getElementById('verified-count'),
    unverifiedCount: document.getElementById('unverified-count'),
    verificationTab: document.getElementById('tab-verification')
  };

  // ======= Verification Functions =======
  
  /**
   * Initialize verification system
   */
  function initVerification() {
    // Set up tab change detection
    setupTabChangeDetection();
    
    // Initial update of verification stats
    updateVerificationStats();
    
    // Setup filter event listeners
    setupFilterListeners();
  }
  
  /**
   * Setup filter event listeners
   */
  function setupFilterListeners() {
    // Helper function to close all dropdowns
    function closeAllDropdowns() {
      document.querySelectorAll('.filter-dropdown').forEach(dd => {
        dd.classList.remove('active');
      });
      document.querySelectorAll('.filter-arrow').forEach(arrow => {
        arrow.textContent = '▼';
      });
    }
    
    // Filter menu button toggles
    const filterButtons = document.querySelectorAll('.filter-menu-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const filterType = btn.getAttribute('data-filter');
        const dropdown = document.getElementById(`filter-dropdown-${filterType}`);
        
        if (!dropdown) {
          console.error(`Dropdown not found: filter-dropdown-${filterType}`);
          return;
        }
        
        // Close all other dropdowns
        document.querySelectorAll('.filter-dropdown').forEach(dd => {
          if (dd !== dropdown) {
            dd.classList.remove('active');
          }
        });
        
        // Reset all arrows
        document.querySelectorAll('.filter-arrow').forEach(arrow => {
          const parentBtn = arrow.closest('.filter-menu-btn');
          if (parentBtn !== btn) {
            arrow.textContent = '▼';
          }
        });
        
        // Toggle current dropdown
        const isActive = dropdown.classList.contains('active');
        dropdown.classList.toggle('active');
        
        // Update arrow direction
        const arrow = btn.querySelector('.filter-arrow');
        if (dropdown.classList.contains('active')) {
          arrow.textContent = '▲';
          
          // Position dropdown below button
          const rect = btn.getBoundingClientRect();
          
          dropdown.style.position = 'fixed';
          dropdown.style.top = `${rect.bottom + 4}px`;
          dropdown.style.left = `${rect.left}px`;
          dropdown.style.zIndex = '1000';
        } else {
          arrow.textContent = '▼';
        }
      });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-menu-btn') && !e.target.closest('.filter-dropdown')) {
        closeAllDropdowns();
      }
    });
    
    // Close dropdowns on scroll or resize
    window.addEventListener('scroll', closeAllDropdowns, true);
    window.addEventListener('resize', closeAllDropdowns);
    
    // Label type filters
    const typeFilters = document.querySelectorAll('.filter-type');
    typeFilters.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          activeFilters.labelTypes.add(checkbox.value);
        } else {
          activeFilters.labelTypes.delete(checkbox.value);
        }
        updateFilterCounts();
        applyFilters();
      });
    });
    
    // Verified status filters
    const verifiedFilters = document.querySelectorAll('.filter-verified');
    verifiedFilters.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          activeFilters.verifiedStatus.add(checkbox.value);
        } else {
          activeFilters.verifiedStatus.delete(checkbox.value);
        }
        updateFilterCounts();
        applyFilters();
      });
    });
    
    // Initial filter counts
    updateFilterCounts();
    
    // Bulk action buttons
    const bulkVerifyBtn = document.getElementById('bulk-verify-btn');
    const bulkUnverifyBtn = document.getElementById('bulk-unverify-btn');
    
    if (bulkVerifyBtn) {
      bulkVerifyBtn.addEventListener('click', () => {
        handleBulkVerification(true);
      });
    }
    
    if (bulkUnverifyBtn) {
      bulkUnverifyBtn.addEventListener('click', () => {
        handleBulkVerification(false);
      });
    }
  }
  
  /**
   * Show confirmation dialog for bulk actions
   */
  function showBulkActionConfirmation(isVerifying, count, callback) {
    const action = isVerifying ? 'verify' : 'unverify';
    const actionPast = isVerifying ? 'verified' : 'unverified';
    
    // Create custom confirmation dialog
    const overlay = document.createElement('div');
    overlay.className = 'delete-confirmation-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'delete-confirmation-dialog';
    
    // Header section
    const header = document.createElement('div');
    header.className = 'delete-confirmation-header';
    
    const title = document.createElement('h3');
    title.textContent = `Bulk ${action} labels`;
    
    // Body section
    const body = document.createElement('div');
    body.className = 'delete-confirmation-body';
    
    const message = document.createElement('div');
    
    let messageHtml = `<p>Are you sure you want to set all filtered labels as <strong>${actionPast}</strong>?</p>`;
    
    if (count > 0) {
      const totalElementsText = count === 1 ? 'label instance' : 'label instances';
      messageHtml += `<div class="${isVerifying ? 'info-box' : 'warning-box'}">
        <strong>${isVerifying ? 'ℹ️' : '⚠️'} Impact:</strong><br>
        This will ${action} <strong>${count}</strong> ${totalElementsText} matching your current filters (including nested sublabels).
      </div>`;
    } else {
      messageHtml += `<div class="no-impact-box">
        <strong>No labels match your current filters.</strong>
      </div>`;
    }
    
    messageHtml += `<p class="cannot-undo"><strong>This action cannot be undone.</strong></p>`;
    
    message.innerHTML = messageHtml;
    
    // Footer section with buttons
    const footer = document.createElement('div');
    footer.className = 'delete-confirmation-footer';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'delete-confirmation-cancel-btn';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = count > 0 ? `${isVerifying ? 'Verify' : 'Unverify'} ${count} labels` : 'OK';
    confirmBtn.className = 'delete-confirmation-delete-btn';
    
    // Event handlers
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      callback(false);
    });
    
    confirmBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      callback(count > 0);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        callback(false);
      }
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', escapeHandler);
        callback(false);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    
    header.appendChild(title);
    body.appendChild(message);
    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    
    document.body.appendChild(overlay);
  }
  
  /**
   * Handle bulk verification/unverification
   */
  function handleBulkVerification(shouldVerify) {
    const htmlContent = window.getHtmlContent();
    if (!htmlContent) return;
    
    // Collect all filtered instances
    const labels = window.getLabels();
    if (!labels) return;
    
    const allParentLabels = Array.from(labels.keys());
    let allFilteredInstances = [];
    
    // Get all instances that match current filters
    allParentLabels.forEach(parentLabelName => {
      if (activeFilters.labelNames.has(parentLabelName)) {
        const instances = collectFilteredInstances(parentLabelName);
        allFilteredInstances.push(...instances);
      }
    });
    
    const totalCount = allFilteredInstances.length;
    
    // Show confirmation dialog
    showBulkActionConfirmation(shouldVerify, totalCount, (confirmed) => {
      if (confirmed && totalCount > 0) {
        // Apply verification to all filtered instances
        const newStatus = shouldVerify ? 'True' : 'False';
        
        allFilteredInstances.forEach(instance => {
          // Set verified attribute for parent label
          instance.setAttribute('verified', newStatus);
          
          // Also set for all nested sublabels
          const nestedSublabels = instance.querySelectorAll('manual_label, auto_label');
          nestedSublabels.forEach(sublabel => {
            sublabel.setAttribute('verified', newStatus);
          });
        });
        
        // Update the actual HTML to persist the change
        if (typeof window.updateCurrentHtmlFromDOM === 'function') {
          window.updateCurrentHtmlFromDOM();
        }
        
        // Update stats
        updateVerificationStats();
        
        // Refresh the current view if in verification mode
        if (verificationMode && currentLabelInstances.length > 0) {
          const parentLabelName = parentLabels[currentParentLabelIndex];
          showParentLabelDetails(parentLabelName);
        }
      }
    });
  }
  
  /**
   * Populate label name filters based on available parent labels
   */
  function populateLabelNameFilters() {
    const labels = window.getLabels ? window.getLabels() : null;
    if (!labels) return;
    
    const filterContainer = document.getElementById('filter-label-names');
    if (!filterContainer) return;
    
    // Clear existing filters
    filterContainer.innerHTML = '';
    
    // Get all parent labels (only root level)
    const parentLabelNames = Array.from(labels.keys());
    
    // Initialize all label names as selected if empty
    if (activeFilters.labelNames.size === 0) {
      parentLabelNames.forEach(name => activeFilters.labelNames.add(name));
    }
    
    // Create checkbox for each label
    parentLabelNames.forEach(labelName => {
      const labelData = labels.get(labelName);
      const label = document.createElement('label');
      label.className = 'filter-checkbox';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'filter-label-name';
      checkbox.value = labelName;
      checkbox.checked = activeFilters.labelNames.has(labelName);
      
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          activeFilters.labelNames.add(labelName);
        } else {
          activeFilters.labelNames.delete(labelName);
        }
        updateFilterCounts();
        applyFilters();
      });
      
      const colorDot = document.createElement('span');
      colorDot.className = 'filter-color-dot';
      colorDot.style.backgroundColor = labelData.color;
      
      const text = document.createElement('span');
      text.textContent = labelName;
      
      label.appendChild(checkbox);
      label.appendChild(colorDot);
      label.appendChild(text);
      
      filterContainer.appendChild(label);
    });
    
    // Update filter counts
    updateFilterCounts();
  }
  
  /**
   * Update filter count badges
   */
  function updateFilterCounts() {
    const typeCount = document.getElementById('filter-type-count');
    const nameCount = document.getElementById('filter-name-count');
    const statusCount = document.getElementById('filter-status-count');
    
    if (typeCount) {
      typeCount.textContent = `(${activeFilters.labelTypes.size})`;
    }
    
    if (nameCount) {
      nameCount.textContent = `(${activeFilters.labelNames.size})`;
    }
    
    if (statusCount) {
      statusCount.textContent = `(${activeFilters.verifiedStatus.size})`;
    }
  }
  
  /**
   * Clear all filters and reset to defaults
   */
  function clearAllFilters() {
    // Reset filter state
    activeFilters.labelTypes = new Set(['manual', 'auto']);
    activeFilters.verifiedStatus = new Set(['True', 'False']);
    
    // Get all parent labels and add them to filter
    const labels = window.getLabels ? window.getLabels() : null;
    if (labels) {
      activeFilters.labelNames = new Set(Array.from(labels.keys()));
    }
    
    // Update UI
    document.querySelectorAll('.filter-type').forEach(cb => cb.checked = true);
    document.querySelectorAll('.filter-verified').forEach(cb => cb.checked = true);
    document.querySelectorAll('.filter-label-name').forEach(cb => cb.checked = true);
    
    // Update filter counts
    updateFilterCounts();
    
    // Re-apply filters (show all)
    applyFilters();
  }
  
  /**
   * Apply current filters and navigate to first matching label
   */
  function applyFilters() {
    if (!verificationMode) return;
    
    // Get all parent labels
    const labels = window.getLabels ? window.getLabels() : null;
    if (!labels) return;
    
    const allParentLabels = Array.from(labels.keys());
    const htmlContent = window.getHtmlContent();
    if (!htmlContent) return;
    
    // Find first parent label that has instances matching the filters
    let foundMatch = false;
    
    for (let i = 0; i < allParentLabels.length; i++) {
      const parentLabelName = allParentLabels[i];
      
      // Apply label name filter
      if (!activeFilters.labelNames.has(parentLabelName)) {
        continue;
      }
      
      // Get instances for this label
      const instances = collectFilteredInstances(parentLabelName);
      
      if (instances.length > 0) {
        currentParentLabelIndex = i;
        parentLabels = allParentLabels;
        foundMatch = true;
        showParentLabelDetails(parentLabelName);
        break;
      }
    }
    
    if (!foundMatch) {
      // No matching labels found
      showNoLabelsMessage();
    }
  }
  
  /**
   * Collect label instances that match current filters
   */
  function collectFilteredInstances(labelName) {
    const htmlContent = window.getHtmlContent();
    if (!htmlContent) return [];
    
    let instances = [];
    
    // Collect instances based on label type filter
    if (activeFilters.labelTypes.has('manual')) {
      const manualSelector = `[labelName="${labelName}"][parent=""]`;
      instances.push(...Array.from(htmlContent.querySelectorAll(`manual_label${manualSelector}`)));
    }
    
    if (activeFilters.labelTypes.has('auto')) {
      const autoSelector = `[labelName="${labelName}"][parent=""]`;
      instances.push(...Array.from(htmlContent.querySelectorAll(`auto_label${autoSelector}`)));
    }
    
    // Filter by verified status
    instances = instances.filter(inst => {
      const verifiedValue = inst.getAttribute('verified');
      return activeFilters.verifiedStatus.has(verifiedValue);
    });
    
    return instances;
  }
  
  /**
   * Show "no labels" message when no matches found
   */
  function showNoLabelsMessage() {
    const verificationTab = document.getElementById('tab-verification');
    if (!verificationTab) return;
    
    // Remove existing inspector
    const existingInspector = verificationTab.querySelector('.label-inspector');
    if (existingInspector) {
      existingInspector.remove();
    }
    
    // Remove existing no-labels message
    const existingMessage = verificationTab.querySelector('.no-labels-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // Create no labels message
    const message = document.createElement('div');
    message.className = 'no-labels-message';
    message.innerHTML = '<h3>No labels match the current filters</h3><p>Try adjusting your filter settings</p>';
    
    const verificationSection = verificationTab.querySelector('.verification-section');
    if (verificationSection) {
      verificationSection.appendChild(message);
    }
    
    // Clear any highlights
    document.querySelectorAll('.verification-highlight').forEach(el => {
      el.classList.remove('verification-highlight');
    });
  }
  
  /**
   * Setup tab change detection to auto-start/stop verification
   */
  function setupTabChangeDetection() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        if (targetTab === 'verification') {
          // Entering verification tab - auto-start
          setTimeout(() => startVerification(), 100);
        } else if (verificationMode) {
          // Leaving verification tab - stop highlighting
          stopVerification();
        }
      });
    });
  }
  
  /**
   * Stop verification mode and clear highlights
   */
  function stopVerification() {
    verificationMode = false;
    
    // Clear all highlights
    document.querySelectorAll('.verification-highlight').forEach(el => {
      el.classList.remove('verification-highlight');
    });
  }
  
  /**
   * Start verification mode - find first unverified label
   */
  function startVerification() {
    verificationMode = true;
    
    // Get all parent labels
    const labels = window.getLabels ? window.getLabels() : null;
    if (!labels) {
      console.error('Cannot access labels from app.js');
      return;
    }
    
    // Populate label name filters
    populateLabelNameFilters();
    
    parentLabels = Array.from(labels.keys());
    currentParentLabelIndex = 0;
    
    if (parentLabels.length === 0) {
      showNoLabelsMessage();
      return;
    }
    
    // Apply filters to find first matching label
    applyFilters();
  }
  
  /**
   * Show details for a parent label with all its instances
   */
  function showParentLabelDetails(parentLabelName) {
    const labels = window.getLabels();
    const htmlContent = window.getHtmlContent();
    if (!labels || !htmlContent) return;
    
    const labelData = labels.get(parentLabelName);
    if (!labelData) return;
    
    // Remove existing no-labels message if present
    const existingMessage = document.querySelector('.no-labels-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // Use filtered instances
    currentLabelInstances = collectFilteredInstances(parentLabelName);
    currentInstanceIndex = 0;
    
    // Helper function to collect label instances (for sublabels)
    function collectLabelInstances(labelName, parentName = '') {
      const selector = parentName 
        ? `[labelName="${labelName}"][parent="${parentName}"]`
        : `[labelName="${labelName}"][parent=""]`;
      return Array.from(htmlContent.querySelectorAll(`manual_label${selector}, auto_label${selector}`));
    }
    
    // Display the label inspector
    displayLabelInspector(parentLabelName, labelData, currentLabelInstances, collectLabelInstances);
    
    // Highlight first instance if exists
    if (currentLabelInstances.length > 0) {
      highlightLabelInstance(currentLabelInstances[0]);
    }
  }
  
  /**
   * Display label inspector with all attributes
   */
  function displayLabelInspector(labelName, labelData, instances, collectLabelInstances) {
    // Create inspector panel in verification tab
    const verificationTab = document.getElementById('tab-verification');
    if (!verificationTab) return;
    
    // Remove existing inspector
    const existingInspector = verificationTab.querySelector('.label-inspector');
    if (existingInspector) {
      existingInspector.remove();
    }
    
    // Create new inspector
    const inspector = document.createElement('div');
    inspector.className = 'label-inspector';
    
    // Header with label name and color
    const header = document.createElement('div');
    header.className = 'inspector-header';
    header.style.backgroundColor = labelData.color;
    header.style.color = getContrastColor(labelData.color);
    
    const titleContainer = document.createElement('div');
    titleContainer.className = 'header-title-container';
    
    const title = document.createElement('h3');
    title.textContent = labelName;
    titleContainer.appendChild(title);
    
    // Add status badge to header
    if (instances.length > 0) {
      const currentInstance = instances[currentInstanceIndex];
      const isVerified = currentInstance.getAttribute('verified') === 'True';
      const statusBadge = document.createElement('span');
      statusBadge.className = isVerified ? 'verified-badge' : 'unverified-badge';
      statusBadge.textContent = isVerified ? '✓ Verified' : '✗ Unverified';
      statusBadge.style.marginLeft = '10px';
      statusBadge.style.fontSize = '12px';
      statusBadge.style.cursor = 'pointer';
      statusBadge.title = 'Click to toggle verification status';
      
      // Make status badge clickable to toggle verification
      statusBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCurrentInstanceVerification();
      });
      
      titleContainer.appendChild(statusBadge);
    }
    
    header.appendChild(titleContainer);
    
    const instanceCount = document.createElement('span');
    instanceCount.className = 'instance-count';
    instanceCount.textContent = `${instances.length} instance${instances.length !== 1 ? 's' : ''}`;
    header.appendChild(instanceCount);
    
    inspector.appendChild(header);
    
    // Navigation for instances
    if (instances.length > 0) {
      const instanceNav = document.createElement('div');
      instanceNav.className = 'instance-navigation';
      
      const prevBtn = document.createElement('button');
      prevBtn.textContent = '◀ Previous';
      prevBtn.onclick = () => navigateToPreviousInstance();
      prevBtn.disabled = currentInstanceIndex === 0;
      
      const instanceInfo = document.createElement('span');
      instanceInfo.className = 'instance-info';
      instanceInfo.textContent = `Instance ${currentInstanceIndex + 1} of ${instances.length}`;
      
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next ▶';
      nextBtn.onclick = () => navigateToNextInstance();
      nextBtn.disabled = currentInstanceIndex >= instances.length - 1;
      
      instanceNav.appendChild(prevBtn);
      instanceNav.appendChild(instanceInfo);
      instanceNav.appendChild(nextBtn);
      
      inspector.appendChild(instanceNav);
      
      // Current instance details
      if (currentInstanceIndex < instances.length) {
        const currentInstance = instances[currentInstanceIndex];
        const instanceDetails = createInstanceDetails(currentInstance, labelData);
        inspector.appendChild(instanceDetails);
      }
    }
    
    // Insert inspector into verification section
    const verificationSection = verificationTab.querySelector('.verification-section');
    const verificationStats = verificationTab.querySelector('.verification-stats');
    if (verificationSection && verificationStats) {
      // Insert before stats
      verificationSection.insertBefore(inspector, verificationStats);
    } else if (verificationSection) {
      // If no stats, insert at the beginning of verification section
      verificationSection.insertBefore(inspector, verificationSection.firstChild);
    } else {
      // Fallback: append to tab
      verificationTab.appendChild(inspector);
    }
  }
  
  /**
   * Create instance details panel with editable attributes
   */
  function createInstanceDetails(labelElement, labelData) {
    const detailsPanel = document.createElement('div');
    detailsPanel.className = 'instance-details';
    
    const detailsTitle = document.createElement('h4');
    detailsTitle.textContent = 'Current Instance Parameters';
    detailsPanel.appendChild(detailsTitle);
    
    // Collect group attribute names (gold attributes)
    const groupAttributeNames = new Set();
    let groupIdAttribute = null;
    if (labelData.groupConfig && labelData.groupConfig.groupAttributes) {
      groupIdAttribute = labelData.groupConfig.groupIdAttribute;
      labelData.groupConfig.groupAttributes.forEach((value, name) => {
        groupAttributeNames.add(name);
      });
    }
    
    // Create form for parameters
    const form = document.createElement('div');
    form.className = 'param-form';
    
    // Display all parameters
    labelData.params.forEach((paramDef, paramName) => {
      const paramRow = document.createElement('div');
      paramRow.className = 'param-row';
      
      const label = document.createElement('label');
      label.textContent = paramName + ':';
      
      // Check if this is the group ID (gold) parameter
      const isGroupId = groupIdAttribute === paramName;
      const isGroupAttr = groupAttributeNames.has(paramName);
      
      if (isGroupId) {
        label.classList.add('gold-label');
      } else if (isGroupAttr) {
        label.classList.add('silver-label');
      }
      
      let input;
      const currentVal = labelElement.getAttribute(paramName) || '';
      
      if (typeof paramDef === 'object' && paramDef.type) {
        const type = paramDef.type;
        
        if (type === 'string') {
          input = document.createElement('input');
          input.type = 'text';
          input.value = currentVal;
        } else if (type === 'checkbox') {
          input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = currentVal === 'true' || currentVal === true;
        } else if (type === 'dropdown') {
          input = document.createElement('select');
          (paramDef.options || []).forEach((optVal) => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.textContent = optVal;
            if (optVal === currentVal) opt.selected = true;
            input.appendChild(opt);
          });
        }
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = currentVal;
      }
      
      input.dataset.paramName = paramName;
      
      // Save on change
      input.addEventListener('change', () => {
        saveInstanceParameter(labelElement, paramName, input);
      });
      
      paramRow.appendChild(label);
      paramRow.appendChild(input);
      form.appendChild(paramRow);
    });
    
    detailsPanel.appendChild(form);
    
    // Find and display nested sublabels
    const nestedSublabels = Array.from(labelElement.querySelectorAll('manual_label, auto_label'));
    if (nestedSublabels.length > 0) {
      const sublabelsContainer = document.createElement('div');
      sublabelsContainer.className = 'nested-sublabels';
      
      const sublabelsTitle = document.createElement('h4');
      sublabelsTitle.textContent = 'Nested Sublabels';
      sublabelsContainer.appendChild(sublabelsTitle);
      
      nestedSublabels.forEach(sublabelEl => {
        const sublabelName = sublabelEl.getAttribute('labelName');
        const sublabelParent = sublabelEl.getAttribute('parent');
        const sublabelPath = sublabelParent ? [sublabelParent, sublabelName] : [sublabelName];
        const sublabelData = window.getLabelByPath ? window.getLabelByPath(sublabelPath) : null;
        
        if (sublabelData) {
          const sublabelSection = document.createElement('div');
          sublabelSection.className = 'nested-sublabel-section';
          sublabelSection.style.borderLeftColor = sublabelData.color;
          
          const sublabelHeader = document.createElement('div');
          sublabelHeader.className = 'nested-sublabel-header';
          sublabelHeader.textContent = sublabelName;
          sublabelHeader.style.color = sublabelData.color;
          sublabelSection.appendChild(sublabelHeader);
          
          // Create editable parameters for sublabel
          const sublabelForm = document.createElement('div');
          sublabelForm.className = 'sublabel-param-form';
          
          sublabelData.params.forEach((paramDef, paramName) => {
            const paramRow = document.createElement('div');
            paramRow.className = 'param-row';
            
            const label = document.createElement('label');
            label.textContent = paramName + ':';
            
            let input;
            const currentVal = sublabelEl.getAttribute(paramName) || '';
            
            if (typeof paramDef === 'object' && paramDef.type) {
              const type = paramDef.type;
              
              if (type === 'string') {
                input = document.createElement('input');
                input.type = 'text';
                input.value = currentVal;
              } else if (type === 'checkbox') {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = currentVal === 'true' || currentVal === true;
              } else if (type === 'dropdown') {
                input = document.createElement('select');
                (paramDef.options || []).forEach((optVal) => {
                  const opt = document.createElement('option');
                  opt.value = optVal;
                  opt.textContent = optVal;
                  if (optVal === currentVal) opt.selected = true;
                  input.appendChild(opt);
                });
              }
            } else {
              input = document.createElement('input');
              input.type = 'text';
              input.value = currentVal;
            }
            
            input.dataset.paramName = paramName;
            
            // Save on change
            input.addEventListener('change', () => {
              saveInstanceParameter(sublabelEl, paramName, input);
            });
            
            paramRow.appendChild(label);
            paramRow.appendChild(input);
            sublabelForm.appendChild(paramRow);
          });
          
          sublabelSection.appendChild(sublabelForm);
          
          sublabelsContainer.appendChild(sublabelSection);
        }
      });
      
      detailsPanel.appendChild(sublabelsContainer);
    }
    
    return detailsPanel;
  }
  
  /**
   * Save parameter for current instance
   */
  function saveInstanceParameter(labelElement, paramName, inputElement) {
    let value = '';
    
    if (inputElement.type === 'checkbox') {
      value = inputElement.checked ? 'true' : 'false';
    } else {
      value = inputElement.value || '';
    }
    
    labelElement.setAttribute(paramName, value);
    
    // Update HTML
    if (typeof window.updateCurrentHtmlFromDOM === 'function') {
      window.updateCurrentHtmlFromDOM();
    }
  }
  
  /**
   * Navigate to next instance of current parent label
   */
  function navigateToNextInstance() {
    if (currentInstanceIndex < currentLabelInstances.length - 1) {
      currentInstanceIndex++;
      const parentLabelName = parentLabels[currentParentLabelIndex];
      const labels = window.getLabels();
      const labelData = labels.get(parentLabelName);
      
      const htmlContent = window.getHtmlContent();
      function collectLabelInstances(labelName, parentName = '') {
        const selector = parentName 
          ? `[labelName="${labelName}"][parent="${parentName}"]`
          : `[labelName="${labelName}"][parent=""]`;
        return Array.from(htmlContent.querySelectorAll(`manual_label${selector}, auto_label${selector}`));
      }
      
      displayLabelInspector(parentLabelName, labelData, currentLabelInstances, collectLabelInstances);
      highlightLabelInstance(currentLabelInstances[currentInstanceIndex]);
    }
  }
  
  /**
   * Navigate to previous instance of current parent label
   */
  function navigateToPreviousInstance() {
    if (currentInstanceIndex > 0) {
      currentInstanceIndex--;
      const parentLabelName = parentLabels[currentParentLabelIndex];
      const labels = window.getLabels();
      const labelData = labels.get(parentLabelName);
      
      const htmlContent = window.getHtmlContent();
      function collectLabelInstances(labelName, parentName = '') {
        const selector = parentName 
          ? `[labelName="${labelName}"][parent="${parentName}"]`
          : `[labelName="${labelName}"][parent=""]`;
        return Array.from(htmlContent.querySelectorAll(`manual_label${selector}, auto_label${selector}`));
      }
      
      displayLabelInspector(parentLabelName, labelData, currentLabelInstances, collectLabelInstances);
      highlightLabelInstance(currentLabelInstances[currentInstanceIndex]);
    }
  }
  
  /**
   * Navigate to next parent label
   */
  function navigateToNextParentLabel() {
    const startIndex = currentParentLabelIndex;
    let attempts = 0;
    const maxAttempts = parentLabels.length;
    
    // Keep trying to find next parent with matching instances
    do {
      if (currentParentLabelIndex < parentLabels.length - 1) {
        currentParentLabelIndex++;
      } else {
        currentParentLabelIndex = 0; // Loop back to first
      }
      
      attempts++;
      
      const parentLabelName = parentLabels[currentParentLabelIndex];
      
      // Check if this label name is in the filter
      if (!activeFilters.labelNames.has(parentLabelName)) {
        continue;
      }
      
      // Check if this parent has instances matching filters
      const instances = collectFilteredInstances(parentLabelName);
      if (instances.length > 0) {
        showParentLabelDetails(parentLabelName);
        return;
      }
      
    } while (currentParentLabelIndex !== startIndex && attempts < maxAttempts);
    
    // If we looped back to start or tried all labels, show no labels message
    showNoLabelsMessage();
  }
  
  /**
   * Highlight a specific label instance in the HTML content
   */
  function highlightLabelInstance(labelElement) {
    // Clear previous highlights
    document.querySelectorAll('.verification-highlight').forEach(el => {
      el.classList.remove('verification-highlight');
    });
    
    // Highlight current
    labelElement.classList.add('verification-highlight');
    
    // Scroll to the label
    labelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  /**
   * Navigate to the next unverified label (legacy - not used in parent label mode)
   */
  function navigateToNextUnverified() {
    // This function is kept for compatibility but not used
    // The new workflow uses navigateToNextParentLabel
  }
  
  /**
   * Toggle verification status of current instance
   */
  function toggleCurrentInstanceVerification() {
    if (currentLabelInstances.length === 0 || currentInstanceIndex >= currentLabelInstances.length) return;
    
    const currentInstance = currentLabelInstances[currentInstanceIndex];
    const currentStatus = currentInstance.getAttribute('verified');
    const newStatus = currentStatus === 'True' ? 'False' : 'True';
    
    // Toggle verified attribute for parent label
    currentInstance.setAttribute('verified', newStatus);
    
    // Also toggle all nested sublabels
    const nestedSublabels = currentInstance.querySelectorAll('manual_label, auto_label');
    nestedSublabels.forEach(sublabel => {
      sublabel.setAttribute('verified', newStatus);
    });
    
    // Update the actual HTML to persist the change
    if (typeof window.updateCurrentHtmlFromDOM === 'function') {
      window.updateCurrentHtmlFromDOM();
    }
    
    // Update stats
    updateVerificationStats();
    
    // Refresh the inspector display to show updated status
    const parentLabelName = parentLabels[currentParentLabelIndex];
    const labels = window.getLabels();
    const labelData = labels.get(parentLabelName);
    
    const htmlContent = window.getHtmlContent();
    function collectLabelInstances(labelName, parentName = '') {
      const selector = parentName 
        ? `[labelName="${labelName}"][parent="${parentName}"]`
        : `[labelName="${labelName}"][parent=""]`;
      return Array.from(htmlContent.querySelectorAll(`manual_label${selector}, auto_label${selector}`));
    }
    
    displayLabelInspector(parentLabelName, labelData, currentLabelInstances, collectLabelInstances);
    highlightLabelInstance(currentLabelInstances[currentInstanceIndex]);
  }
  
  /**
   * Mark current instance as verified (kept for compatibility)
   */
  function markCurrentInstanceAsVerified() {
    if (currentLabelInstances.length === 0 || currentInstanceIndex >= currentLabelInstances.length) return;
    
    const currentInstance = currentLabelInstances[currentInstanceIndex];
    
    // Set verified attribute to True for parent label
    currentInstance.setAttribute('verified', 'True');
    
    // Also mark all nested sublabels as verified
    const nestedSublabels = currentInstance.querySelectorAll('manual_label, auto_label');
    nestedSublabels.forEach(sublabel => {
      sublabel.setAttribute('verified', 'True');
    });
    
    currentInstance.classList.remove('verification-highlight');
    
    // Update the actual HTML to persist the change
    if (typeof window.updateCurrentHtmlFromDOM === 'function') {
      window.updateCurrentHtmlFromDOM();
    }
    
    // Update stats
    updateVerificationStats();
    
    // Update the inspector display
    const parentLabelName = parentLabels[currentParentLabelIndex];
    const labels = window.getLabels();
    const labelData = labels.get(parentLabelName);
    
    const htmlContent = window.getHtmlContent();
    function collectLabelInstances(labelName, parentName = '') {
      const selector = parentName 
        ? `[labelName=\"${labelName}\"][parent=\"${parentName}\"]`
        : `[labelName=\"${labelName}\"][parent=\"\"]`;
      return Array.from(htmlContent.querySelectorAll(`manual_label${selector}, auto_label${selector}`));
    }
    
    displayLabelInspector(parentLabelName, labelData, currentLabelInstances, collectLabelInstances);
    highlightLabelInstance(currentLabelInstances[currentInstanceIndex]);
  }
  
  /**
   * Update verification statistics
   */
  function updateVerificationStats() {
    const htmlContent = window.getHtmlContent ? window.getHtmlContent() : document.getElementById('html-content');
    if (!htmlContent) return;
    
    const allLabels = htmlContent.querySelectorAll('manual_label, auto_label');
    const verifiedLabels = htmlContent.querySelectorAll('manual_label[verified="True"], auto_label[verified="True"]');
    const unverifiedLabels = htmlContent.querySelectorAll('manual_label[verified="False"], auto_label[verified="False"]');
    
    if (verificationElements.verifiedCount) {
      verificationElements.verifiedCount.textContent = verifiedLabels.length;
    }
    
    if (verificationElements.unverifiedCount) {
      verificationElements.unverifiedCount.textContent = unverifiedLabels.length;
    }
  }
  
  /**
   * Helper function to get contrast color
   */
  function getContrastColor(hexColor) {
    // Remove # if present
    hexColor = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  /**
   * Public function to update stats (can be called from app.js)
   */
  window.updateVerificationStats = updateVerificationStats;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVerification);
  } else {
    initVerification();
  }
})();
