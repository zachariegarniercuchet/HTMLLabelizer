// Metadata for HTML Labelizer - Standalone version
// Allows users to add custom metadata key-value pairs to the document

(function() {
  console.log('[METADATA] Metadata module loaded');

  /**
   * Get current metadata object
   */
  function getCurrentMetadata() {
    return window.meta || {};
  }

  /**
   * Set metadata value
   */
  function setMetadata(key, value) {
    if (!window.meta) {
      window.meta = {};
    }
    window.meta[key] = value;
    console.log('[METADATA] Set metadata:', key, '=', value);
    
    // Immediately save to HTML
    saveMetadataToHtml();
  }

  /**
   * Delete metadata key
   */
  function deleteMetadata(key) {
    if (window.meta && window.meta.hasOwnProperty(key)) {
      delete window.meta[key];
      console.log('[METADATA] Deleted metadata key:', key);
      
      // Immediately save to HTML
      saveMetadataToHtml();
    }
  }

  /**
   * Save metadata to HTML schema
   */
  function saveMetadataToHtml() {
    if (window.updateSchemaInSourceView) {
      console.log('[METADATA] Saving metadata to HTML...');
      window.updateSchemaInSourceView();
      console.log('[METADATA] Metadata saved to HTML');
    } else {
      console.warn('[METADATA] updateSchemaInSourceView function not available');
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Render metadata list in the modal
   */
  function renderMetadataList() {
    const metaList = document.getElementById('meta-list');
    if (!metaList) {
      console.error('[METADATA ERROR] meta-list element not found');
      return;
    }

    const metadata = getCurrentMetadata();
    const keys = Object.keys(metadata);

    if (keys.length === 0) {
      metaList.innerHTML = '<div class="meta-empty"><p>No metadata defined. Add your first key-value pair below.</p></div>';
      return;
    }

    // Separate auto metadata (like 'time') from user-defined metadata
    const autoKeys = ['time'];
    const autoMetaKeys = keys.filter(key => autoKeys.includes(key));
    const userMetaKeys = keys.filter(key => !autoKeys.includes(key));
    
    // Display auto keys first, then user keys in insertion order
    const sortedKeys = [...autoMetaKeys, ...userMetaKeys];

    let html = '<div class="meta-items">';
    sortedKeys.forEach(key => {
      const value = metadata[key];
      const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
      const isReadOnly = key === 'time'; // Make time read-only since it's managed by timer
      
      html += `
        <div class="meta-item" data-key="${escapeHtml(key)}">
          <span class="meta-key">${escapeHtml(key)}</span>
          ${isReadOnly 
            ? `<input type="text" class="meta-value-input" value="${escapeHtml(displayValue)}" readonly>`
            : `<input type="text" class="meta-value-input" value="${escapeHtml(displayValue)}">`
          }
          ${!isReadOnly 
            ? `<button class="meta-delete-btn" title="Delete this metadata">×</button>` 
            : '<span class="meta-readonly-badge">auto</span>'
          }
        </div>
      `;
    });
    html += '</div>';

    metaList.innerHTML = html;

    // Attach event listeners
    attachMetadataEventListeners();
  }

  /**
   * Attach event listeners to metadata items
   */
  function attachMetadataEventListeners() {
    const metaList = document.getElementById('meta-list');
    if (!metaList) return;

    // Delete buttons
    metaList.querySelectorAll('.meta-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const metaItem = e.target.closest('.meta-item');
        const key = metaItem.getAttribute('data-key');
        
        if (confirm(`Delete metadata "${key}"?`)) {
          deleteMetadata(key);
          renderMetadataList();
        }
      });
    });

    // Value inputs - save on blur or Enter
    metaList.querySelectorAll('.meta-value-input').forEach(input => {
      if (input.readOnly) return; // Skip read-only inputs
      
      const metaItem = input.closest('.meta-item');
      const key = metaItem.getAttribute('data-key');
      
      const saveValue = () => {
        const newValue = input.value.trim();
        setMetadata(key, newValue);
      };

      input.addEventListener('blur', saveValue);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur();
        }
      });
    });
  }

  /**
   * Add new metadata key-value pair
   */
  function addNewMetadata() {
    const keyInput = document.getElementById('meta-new-key');
    const valueInput = document.getElementById('meta-new-value');
    
    if (!keyInput || !valueInput) {
      console.error('[METADATA ERROR] Input elements not found');
      return;
    }

    const key = keyInput.value.trim();
    const value = valueInput.value.trim();

    if (!key) {
      alert('Please enter a key name');
      keyInput.focus();
      return;
    }

    const metadata = getCurrentMetadata();
    if (metadata.hasOwnProperty(key)) {
      if (!confirm(`Metadata "${key}" already exists. Overwrite?`)) {
        return;
      }
    }

    setMetadata(key, value);
    renderMetadataList();
    
    // Clear inputs
    keyInput.value = '';
    valueInput.value = '';
    keyInput.focus();
  }

  /**
   * Toggle metadata modal
   */
  function toggleMetadata() {
    console.log('[METADATA] toggleMetadata() called');
    const overlay = document.getElementById('meta-overlay');
    
    if (!overlay) {
      console.error('[METADATA ERROR] meta-overlay element not found in DOM');
      return;
    }
    
    const isHidden = overlay.classList.contains('hidden');
    console.log('[METADATA] Overlay currently hidden:', isHidden);
    
    if (isHidden) {
      console.log('[METADATA] Showing overlay, rendering metadata list...');
      renderMetadataList();
      overlay.classList.remove('hidden');
      console.log('[METADATA] Overlay shown');
    } else {
      console.log('[METADATA] Hiding overlay');
      overlay.classList.add('hidden');
    }
  }

  /**
   * Initialize metadata modal
   */
  function initializeMetadataModal() {
    console.log('[METADATA] Initializing metadata modal');
    
    // Info button
    const infoBtn = document.getElementById('meta-info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', () => {
        toggleMetadata();
      });
      console.log('[METADATA] Info button listener attached');
    }

    // Close button
    const closeBtn = document.getElementById('meta-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toggleMetadata();
      });
    }

    // Add button
    const addBtn = document.getElementById('meta-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addNewMetadata();
      });
    }

    // Enter key in inputs
    const keyInput = document.getElementById('meta-new-key');
    const valueInput = document.getElementById('meta-new-value');
    
    if (keyInput) {
      keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (valueInput) {
            valueInput.focus();
          }
        }
      });
    }

    if (valueInput) {
      valueInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addNewMetadata();
        }
      });
    }

    console.log('[METADATA] Metadata modal initialized');
  }

  // Make functions available globally
  window.initializeMetadataModal = initializeMetadataModal;
  window.toggleMetadata = toggleMetadata;
  
  console.log('[METADATA] Metadata functions exposed globally');
  
})();
