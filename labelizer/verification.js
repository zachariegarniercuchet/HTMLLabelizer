// ======= Label Verification System =======
// This module handles the verification of labeled elements by parent label

(() => {
  // ======= Verification State =======
  let verificationMode = false;
  let currentParentLabelIndex = 0;
  let parentLabels = [];
  let currentLabelInstances = [];
  let currentInstanceIndex = 0;
  
  // ======= Silver Attributes Menu State =======
  let currentSilverAttributesMenu = null;
  let currentSilverAttributesLabelElement = null;
  let currentSilverAttributesGroupId = null;
  
  // ======= Filter State =======
  let activeFilters = {
    labelTypes: new Set(['manual', 'auto']), // manual, auto
    labelNames: new Set(), // parent label names
    verifiedStatus: new Set(['true', 'false']) // true, false
  };
  
  // ======= DOM Elements =======
  const verificationElements = {
    verifiedCount: document.getElementById('verified-count'),
    unverifiedCount: document.getElementById('unverified-count'),
    verificationTab: document.getElementById('tab-verification')
  };

  // ======= DOM Change Detection State =======
  let mutationObserver = null;
  let refreshTimeout = null;
  const REFRESH_DEBOUNCE_MS = 300; // Wait 300ms after changes stop before refreshing

  // ======= Utility Functions =======
  
  /**
   * Debounced refresh to avoid excessive recalculations
   * Waits for changes to stabilize before refreshing the instance list
   */
  function debounceRefreshInstanceList() {
    // Clear previous timeout if it exists
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    
    // Schedule a new refresh
    refreshTimeout = setTimeout(() => {
      if (verificationMode) {
        refreshInstanceList();
      }
      refreshTimeout = null;
    }, REFRESH_DEBOUNCE_MS);
  }
  
  /**
   * Refresh the instance list by re-collecting filtered instances
   * Maintains user's current position as much as possible
   */
  function refreshInstanceList() {
    if (!verificationMode) return;
    
    const labels = window.getLabels ? window.getLabels() : null;
    if (!labels) return;
    
    const htmlContent = window.getHtmlContent();
    if (!htmlContent) return;
    
    // Get the currently displayed instance before refresh
    const previousInstance = currentLabelInstances[currentInstanceIndex] || null;
    const previousLabelName = previousInstance ? previousInstance.getAttribute('labelName') : null;
    
    // Rebuild the filtered instances list
    const allParentLabels = Array.from(labels.keys());
    let newFilteredInstances = [];
    
    allParentLabels.forEach(parentLabelName => {
      if (activeFilters.labelNames.has(parentLabelName)) {
        const instances = collectFilteredInstances(parentLabelName);
        newFilteredInstances.push(...instances);
      }
    });
    
    // Sort by document order
    if (newFilteredInstances.length > 0) {
      newFilteredInstances.sort((a, b) => {
        const position = a.compareDocumentPosition(b);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
    }
    
    // Update the instances list
    currentLabelInstances = newFilteredInstances;
    
    // Try to maintain position intelligently
    if (previousInstance && previousInstance.parentElement) {
      // Previous instance still exists and is in DOM - find its new position
      const newIndex = currentLabelInstances.indexOf(previousInstance);
      if (newIndex !== -1) {
        // Found the same instance - stay on it
        currentInstanceIndex = newIndex;
      } else {
        // Previous instance was deleted/modified - keep same index position
        // The next item naturally shifts into view at this index
        // But clamp if now out of bounds
        if (currentInstanceIndex >= currentLabelInstances.length) {
          currentInstanceIndex = Math.max(0, currentLabelInstances.length - 1);
        }
      }
    } else {
      // Previous instance was removed - clamp index if out of bounds
      if (currentInstanceIndex >= currentLabelInstances.length) {
        currentInstanceIndex = Math.max(0, currentLabelInstances.length - 1);
      }
    }
    
    // Refresh the display
    if (currentLabelInstances.length > 0 && currentInstanceIndex >= 0) {
      showCurrentInstance();
    } else {
      showNoLabelsMessage();
    }
  }
  
  /**
   * Setup MutationObserver to detect DOM changes and refresh verification list
   */
  function setupDOMChangeDetection() {
    const htmlContent = window.getHtmlContent();
    if (!htmlContent) return;
    
    // Create a MutationObserver to watch for changes
    mutationObserver = new MutationObserver((mutations) => {
      // Only trigger refresh if we're in verification mode
      // and the changes are not triggered by our own code
      if (verificationMode) {
        debounceRefreshInstanceList();
      }
    });
    
    // Watch for attribute changes, text changes, and child node additions/removals
    const observerConfig = {
      attributes: true,           // Watch for attribute changes (verified, parameters)
      attributeFilter: ['verified', 'labelName', 'parent'], // Only watch relevant attributes
      childList: true,            // Watch for added/removed nodes
      subtree: true,              // Watch all descendants
      characterData: false        // Don't watch text node changes (too noisy)
    };
    
    mutationObserver.observe(htmlContent, observerConfig);
  }
  
  /**
   * Stop watching for DOM changes
   */
  function stopDOMChangeDetection() {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }
  }

  // ======= Verification Functions =======
  
  /**
   * Setup event handlers for silver attributes menu
   * Closes menu on click outside or ESC key (same as parameter menu)
   */
  function setupSilverAttributesMenuHandlers() {
    // Close on click outside
    document.addEventListener('mousedown', (e) => {
      if (currentSilverAttributesMenu && !currentSilverAttributesMenu.contains(e.target)) {
        hideSilverAttributesMenu();
      }
    });
    
    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && currentSilverAttributesMenu) {
        hideSilverAttributesMenu();
      }
    });
  }
  
  /**
   * Hide and save silver attributes menu
   * Auto-saves changes before closing (same as hideParameterMenu)
   */
  function hideSilverAttributesMenu() {
    if (!currentSilverAttributesMenu) return;
    
    // Auto-save changes before closing
    saveSilverAttributes();
    
    // Remove the menu from DOM
    currentSilverAttributesMenu.remove();
    currentSilverAttributesMenu = null;
    currentSilverAttributesLabelElement = null;
    currentSilverAttributesGroupId = null;
  }
  
  /**
   * Save silver attributes from the current menu
   */
  function saveSilverAttributes() {
    if (!currentSilverAttributesMenu || !currentSilverAttributesLabelElement) return;
    
    // Collect all silver attribute values
    const inputs = currentSilverAttributesMenu.querySelectorAll('[data-attr-name]');
    const newValues = new Map();
    
    inputs.forEach(input => {
      const attrName = input.dataset.attrName;
      let value;
      
      if (input.type === 'checkbox') {
        value = input.checked ? 'true' : 'false';
      } else {
        value = input.value || '';
      }
      
      newValues.set(attrName, value);
    });
    
    // Apply changes to all group members
    if (newValues.size > 0 && typeof window.updateGroupInDocument === 'function') {
      const labelElement = currentSilverAttributesLabelElement;
      const labelName = labelElement.getAttribute('labelName');
      const oldGroupId = currentSilverAttributesGroupId || '';
      
      window.updateGroupInDocument(labelName, oldGroupId, newValues, currentSilverAttributesGroupId);
      
      // Refresh verification display
      showCurrentInstance();
    }
  }
  
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
    
    // Setup silver attributes menu close handlers
    setupSilverAttributesMenuHandlers();
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
        const newStatus = shouldVerify ? 'true' : 'false';
        
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
    
    // Collect ALL instances matching filters from all parent labels
    let allFilteredInstances = [];
    
    allParentLabels.forEach(parentLabelName => {
      // Apply label name filter
      if (!activeFilters.labelNames.has(parentLabelName)) {
        return;
      }
      
      // Get instances for this label
      const instances = collectFilteredInstances(parentLabelName);
      allFilteredInstances.push(...instances);
    });
    
    if (allFilteredInstances.length > 0) {
      // Sort by document order (position in DOM)
      allFilteredInstances.sort((a, b) => {
        // Compare positions in the document
        const position = a.compareDocumentPosition(b);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
      
      // Set the unified list and show first instance
      currentLabelInstances = allFilteredInstances;
      currentInstanceIndex = 0;
      parentLabels = allParentLabels;
      showCurrentInstance();
    } else {
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
    
    // Stop watching for DOM changes
    stopDOMChangeDetection();
    
    // Clear all highlights
    document.querySelectorAll('.verification-highlight').forEach(el => {
      el.classList.remove('verification-highlight');
    });
  }
  
  /**
   * Start verification mode - collect all filtered instances in document order
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
    
    if (parentLabels.length === 0) {
      showNoLabelsMessage();
      return;
    }
    
    // Setup DOM change detection to refresh instance list on modifications
    setupDOMChangeDetection();
    
    // Apply filters to collect all matching instances in document order
    applyFilters();
  }
  
  /**
   * Show details for the current instance (based on currentInstanceIndex)
   */
  function showCurrentInstance() {
    if (currentLabelInstances.length === 0 || currentInstanceIndex >= currentLabelInstances.length) {
      showNoLabelsMessage();
      return;
    }
    
    const labels = window.getLabels();
    const htmlContent = window.getHtmlContent();
    if (!labels || !htmlContent) return;
    
    // Remove existing no-labels message if present
    const existingMessage = document.querySelector('.no-labels-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // Get current instance and its parent label name
    const currentInstance = currentLabelInstances[currentInstanceIndex];
    const parentLabelName = currentInstance.getAttribute('labelName');
    const labelData = labels.get(parentLabelName);
    
    if (!labelData) return;
    
    // Helper function to collect label instances (for sublabels)
    function collectLabelInstances(labelName, parentName = '') {
      const selector = parentName 
        ? `[labelName="${labelName}"][parent="${parentName}"]`
        : `[labelName="${labelName}"][parent=""]`;
      return Array.from(htmlContent.querySelectorAll(`manual_label${selector}, auto_label${selector}`));
    }
    
    // Display the label inspector with all filtered instances
    displayLabelInspector(parentLabelName, labelData, currentLabelInstances, collectLabelInstances);
    
    // Highlight current instance
    highlightLabelInstance(currentInstance);
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
      const isVerified = currentInstance.getAttribute('verified') === 'true';
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
    instanceCount.textContent = `${instances.length} total filtered`;
    header.appendChild(instanceCount);
    
    inspector.appendChild(header);
    
    // Navigation for instances
    if (instances.length > 0) {
      const instanceNav = document.createElement('div');
      instanceNav.className = 'instance-navigation';
      
      const prevBtn = document.createElement('button');
      prevBtn.textContent = '◀ Previous';
      prevBtn.onclick = () => navigateToPreviousInstance();
      prevBtn.disabled = false; // Always enabled, loops around
      
      const instanceInfo = document.createElement('span');
      instanceInfo.className = 'instance-info';
      instanceInfo.textContent = `Instance ${currentInstanceIndex + 1} of ${instances.length}`;
      
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next ▶';
      nextBtn.onclick = () => navigateToNextInstance();
      nextBtn.disabled = false; // Always enabled, loops around
      
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
    detailsTitle.textContent = 'Current Instance Attributes';
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

          // Attach attribute predictor (same behavior as parameter menu), if available
          if (
            typeof window.collectParameterSuggestions === 'function' &&
            typeof window.filterSuggestions === 'function' &&
            typeof window.createSuggestionDropdown === 'function' &&
            typeof window.handleSuggestionKeydown === 'function'
          ) {
            const labelName = labelElement.getAttribute('labelName');
            const parent = labelElement.getAttribute('parent') || '';
            const allSuggestions = window.collectParameterSuggestions(labelName, parent, paramName);
            
            let suggestionDropdown = null;
            
            input.oninput = (e) => {
              const inputValue = e.target.value;
              const filtered = window.filterSuggestions(allSuggestions, inputValue);
              
              if (suggestionDropdown) suggestionDropdown.remove();
              suggestionDropdown = null; // Always clear the reference
              
              if (filtered.length > 0 && inputValue.length > 0) {
                suggestionDropdown = window.createSuggestionDropdown(input, filtered);
                if (suggestionDropdown) {
                  paramRow.appendChild(suggestionDropdown);
                }
              }
            };
            
            input.onkeydown = (e) => {
              if (window.handleSuggestionKeydown(e, input, suggestionDropdown)) {
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

        // Attach attribute predictor for simple string parameters, if available
        if (
          typeof window.collectParameterSuggestions === 'function' &&
          typeof window.filterSuggestions === 'function' &&
          typeof window.createSuggestionDropdown === 'function' &&
          typeof window.handleSuggestionKeydown === 'function'
        ) {
          const labelName = labelElement.getAttribute('labelName');
          const parent = labelElement.getAttribute('parent') || '';
          const allSuggestions = window.collectParameterSuggestions(labelName, parent, paramName);
          
          let suggestionDropdown = null;
          
          input.oninput = (e) => {
            const inputValue = e.target.value;
            const filtered = window.filterSuggestions(allSuggestions, inputValue);
            
            if (suggestionDropdown) suggestionDropdown.remove();
            suggestionDropdown = null; // Always clear the reference
            
            if (filtered.length > 0 && inputValue.length > 0) {
              suggestionDropdown = window.createSuggestionDropdown(input, filtered);
              if (suggestionDropdown) {
                paramRow.appendChild(suggestionDropdown);
              }
            }
          };
          
          input.onkeydown = (e) => {
            if (window.handleSuggestionKeydown(e, input, suggestionDropdown)) {
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
      }
      
      input.dataset.paramName = paramName;
      
      // For group ID parameter, add a button to edit silver attributes
      if (isGroupId && labelData.groupConfig && labelData.groupConfig.groupAttributes && labelData.groupConfig.groupAttributes.size > 0) {
        // Create a container for the input and button
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.gap = '8px';
        inputContainer.style.alignItems = 'center';
        inputContainer.style.flex = '1';
        
        inputContainer.appendChild(input);
        
        // Create button to edit silver attributes
        const editSilverBtn = document.createElement('button');
        editSilverBtn.textContent = '⚙';
        editSilverBtn.className = 'edit-silver-attributes-btn';
        editSilverBtn.title = 'Edit group attributes (silver attributes)';
        editSilverBtn.style.padding = '2px 8px';
        editSilverBtn.style.fontSize = '14px';
        editSilverBtn.style.cursor = 'pointer';
        editSilverBtn.style.background = 'var(--warning)';
        editSilverBtn.style.color = 'black';
        editSilverBtn.style.border = 'none';
        editSilverBtn.style.borderRadius = '6px';
        editSilverBtn.style.minWidth = '30px';
        editSilverBtn.style.display = 'flex';
        editSilverBtn.style.alignItems = 'center';
        editSilverBtn.style.justifyContent = 'center';
        
        editSilverBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const labelName = labelElement.getAttribute('labelName');
          const parent = labelElement.getAttribute('parent') || '';
          const path = parent ? [parent, labelName] : [labelName];
          const goldValue = input.value.trim();
          
          // Get button position for menu positioning
          const rect = editSilverBtn.getBoundingClientRect();
          const x = rect.left;
          const y = rect.bottom + 8; // Position below the button
          
          openSilverAttributesModal(labelElement, path, goldValue, labelData, x, y);
        });
        
        inputContainer.appendChild(editSilverBtn);
        
        // Save on change to input
        input.addEventListener('change', () => {
          saveInstanceParameter(labelElement, paramName, input);
        });
        
        paramRow.appendChild(label);
        paramRow.appendChild(inputContainer);
      } else {
        // Save on change
        input.addEventListener('change', () => {
          saveInstanceParameter(labelElement, paramName, input);
        });
        
        paramRow.appendChild(label);
        paramRow.appendChild(input);
      }
      
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

                // Attach attribute predictor for nested sublabel parameters, if available
                if (
                  typeof window.collectParameterSuggestions === 'function' &&
                  typeof window.filterSuggestions === 'function' &&
                  typeof window.createSuggestionDropdown === 'function' &&
                  typeof window.handleSuggestionKeydown === 'function'
                ) {
                  const allSuggestions = window.collectParameterSuggestions(sublabelName, sublabelParent || '', paramName);
                  
                  let suggestionDropdown = null;
                  
                  input.oninput = (e) => {
                    const inputValue = e.target.value;
                    const filtered = window.filterSuggestions(allSuggestions, inputValue);
                    
                    if (suggestionDropdown) suggestionDropdown.remove();
                    suggestionDropdown = null; // Always clear the reference
                    
                    if (filtered.length > 0 && inputValue.length > 0) {
                      suggestionDropdown = window.createSuggestionDropdown(input, filtered);
                      if (suggestionDropdown) {
                        paramRow.appendChild(suggestionDropdown);
                      }
                    }
                  };
                  
                  input.onkeydown = (e) => {
                    if (window.handleSuggestionKeydown(e, input, suggestionDropdown)) {
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

              // Attach attribute predictor for simple sublabel parameters, if available
              if (
                typeof window.collectParameterSuggestions === 'function' &&
                typeof window.filterSuggestions === 'function' &&
                typeof window.createSuggestionDropdown === 'function' &&
                typeof window.handleSuggestionKeydown === 'function'
              ) {
                const allSuggestions = window.collectParameterSuggestions(sublabelName, sublabelParent || '', paramName);
                
                let suggestionDropdown = null;
                
                input.oninput = (e) => {
                  const inputValue = e.target.value;
                  const filtered = window.filterSuggestions(allSuggestions, inputValue);
                  
                  if (suggestionDropdown) suggestionDropdown.remove();
                  suggestionDropdown = null; // Always clear the reference
                  
                  if (filtered.length > 0 && inputValue.length > 0) {
                    suggestionDropdown = window.createSuggestionDropdown(input, filtered);
                    if (suggestionDropdown) {
                      paramRow.appendChild(suggestionDropdown);
                    }
                  }
                };
                
                input.onkeydown = (e) => {
                  if (window.handleSuggestionKeydown(e, input, suggestionDropdown)) {
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
   * Save parameter for current instance using the shared function from app.js
   */
  function saveInstanceParameter(labelElement, paramName, inputElement) {
    let value = '';
    
    if (inputElement.type === 'checkbox') {
      value = inputElement.checked ? 'true' : 'false';
    } else {
      value = inputElement.value || '';
    }
    
    // Build paramValues object with the single parameter
    const paramValues = {};
    paramValues[paramName] = value;
    
    // Use the shared function from app.js to save parameters
    // This ensures group attribute syncing and stats updates happen
    if (typeof window.saveParametersForElement === 'function') {
      window.saveParametersForElement(labelElement, paramValues);
    } else {
      // Fallback to direct setAttribute if function not available
      console.warn('saveParametersForElement not available, using direct setAttribute');
      labelElement.setAttribute(paramName, value);
      
      // Update HTML
      if (typeof window.updateCurrentHtmlFromDOM === 'function') {
        window.updateCurrentHtmlFromDOM();
      }
    }
  }
  
  /**
   * Navigate to next instance in document order
   */
  function navigateToNextInstance() {
    if (currentInstanceIndex < currentLabelInstances.length - 1) {
      currentInstanceIndex++;
      showCurrentInstance();
    } else {
      // Already at the last instance, loop to first
      currentInstanceIndex = 0;
      showCurrentInstance();
    }
  }
  
  /**
   * Navigate to previous instance in document order
   */
  function navigateToPreviousInstance() {
    if (currentInstanceIndex > 0) {
      currentInstanceIndex--;
      showCurrentInstance();
    } else {
      // Already at the first instance, loop to last
      currentInstanceIndex = currentLabelInstances.length - 1;
      showCurrentInstance();
    }
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
   * Toggle verification status of current instance
   */
  function toggleCurrentInstanceVerification() {
    if (currentLabelInstances.length === 0 || currentInstanceIndex >= currentLabelInstances.length) return;
    
    const currentInstance = currentLabelInstances[currentInstanceIndex];
    const currentStatus = currentInstance.getAttribute('verified');
    const newStatus = currentStatus === 'true' ? 'false' : 'true';
    
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
    showCurrentInstance();
  }
  

  
  /**
   * Update verification statistics
   */
  function updateVerificationStats() {
    const htmlContent = window.getHtmlContent ? window.getHtmlContent() : document.getElementById('html-content');
    if (!htmlContent) return;
    
    const allLabels = htmlContent.querySelectorAll('manual_label, auto_label');
    const verifiedLabels = htmlContent.querySelectorAll('manual_label[verified="true"], auto_label[verified="true"]');
    const unverifiedLabels = htmlContent.querySelectorAll('manual_label[verified="false"], auto_label[verified="false"]');
    
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
   * Open menu to edit silver attributes for a group ID
   * Uses the same design and behavior as the parameter menu
   * Reuses the update function from app.js to ensure consistency
   */
  function openSilverAttributesModal(labelElement, labelPath, currentGroupId, labelData, x, y) {
    // Close any existing silver attributes menu
    if (currentSilverAttributesMenu) {
      hideSilverAttributesMenu();
    }

    // Create the menu container (same class structure as param-menu)
    const menu = document.createElement('div');
    menu.id = 'silver-attributes-menu';
    menu.className = 'param-menu silver-attributes-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.zIndex = '1002';
    
    // Title with Group ID value
    const title = document.createElement('h4');
    title.className = 'silver-attributes-title';
    title.textContent = `Co-reference - ${currentGroupId || '(no group ID)'}`;
    title.style.cursor = 'grab';
    title.style.userSelect = 'none';
    menu.appendChild(title);

    // Info message (same style as param-delete-info)
    const infoMsg = document.createElement('div');
    infoMsg.className = 'param-delete-info';
    infoMsg.textContent = 'Changes will apply to all labels in this group';
    menu.appendChild(infoMsg);

    // Form container (same class as param-form)
    const form = document.createElement('div');
    form.className = 'param-form';
    
    // Create form for each silver attribute
    if (labelData.groupConfig && labelData.groupConfig.groupAttributes) {
      labelData.groupConfig.groupAttributes.forEach((attrDef, attrName) => {
        const paramRow = document.createElement('div');
        paramRow.className = 'param-row';
        
        const label = document.createElement('label');
        label.textContent = attrName + ':';
        label.style.color = '#C0C0C0'; // Silver color
        
        let input;
        const currentVal = labelElement.getAttribute(attrName) || '';
        
        if (attrDef.type === 'string') {
          input = document.createElement('input');
          input.type = 'text';
          input.value = currentVal;
        } else if (attrDef.type === 'checkbox') {
          input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = currentVal === 'true' || currentVal === true;
        } else if (attrDef.type === 'dropdown') {
          input = document.createElement('select');
          (attrDef.options || []).forEach((optVal) => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.textContent = optVal;
            if (optVal === currentVal) opt.selected = true;
            input.appendChild(opt);
          });
        }
        
        input.dataset.attrName = attrName;
        
        paramRow.appendChild(label);
        paramRow.appendChild(input);
        form.appendChild(paramRow);
      });
    }
    
    menu.appendChild(form);

    // Close button (same style as param-close-btn)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'param-close-btn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideSilverAttributesMenu();
    });
    menu.appendChild(closeBtn);

    // Add to document
    document.body.appendChild(menu);
    
    // Store references in state
    currentSilverAttributesMenu = menu;
    currentSilverAttributesLabelElement = labelElement;
    currentSilverAttributesGroupId = currentGroupId;

    // Make draggable by the title
    makeSilverAttributeMenuDraggable(menu, title);

    // Keep within viewport bounds
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${Math.max(0, window.innerWidth - rect.width - 10)}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${Math.max(0, window.innerHeight - rect.height - 10)}px`;
    }
    
    // Focus on first input and setup Enter key navigation (same as parameter menu)
    const allInputs = form.querySelectorAll('input, select');
    if (allInputs.length > 0) {
      // Focus on first input
      allInputs[0].focus();
      
      // Add Enter key navigation to all inputs
      allInputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (index < allInputs.length - 1) {
              // Move to next input
              allInputs[index + 1].focus();
            } else {
              // Last input - close the menu (auto-saves)
              hideSilverAttributesMenu();
            }
          }
        });
      });
    }
  }

  /**
   * Make an element draggable (same logic as app.js makeDraggable)
   */
  function makeSilverAttributeMenuDraggable(element, handle) {
    let isDragging = false;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    handle.addEventListener('mousedown', dragStart);

    function dragStart(e) {
      const rect = element.getBoundingClientRect();
      xOffset = rect.left;
      yOffset = rect.top;
      
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === handle || e.target.closest('h4') === handle) {
        isDragging = true;
        handle.style.cursor = 'grabbing';
      }
    }

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        
        let currentX = e.clientX - initialX;
        let currentY = e.clientY - initialY;

        // Keep within viewport bounds
        const rect = element.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        element.style.left = `${currentX}px`;
        element.style.top = `${currentY}px`;
      }
    }

    function dragEnd(e) {
      isDragging = false;
      handle.style.cursor = 'grab';
    }
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
