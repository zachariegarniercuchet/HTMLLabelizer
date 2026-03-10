// ============================================
// Document Classification Module
// ============================================

/**
 * Load and display document classification metadata from all documents in the Annotated folder
 * @param {FileSystemDirectoryHandle} projectFolderHandle - Root project folder
 */
async function loadDocumentClassification(projectFolderHandle) {
  console.log('Loading document classification...');
  
  const metadataCategoriesContainer = document.getElementById('metadata-categories');
  
  if (!metadataCategoriesContainer) {
    console.error('Metadata categories container not found');
    return;
  }
  
  try {
    // Get the Annotated folder
    const annotatedFolder = await projectFolderHandle.getDirectoryHandle('Annotated');
    const annotatedFiles = await readFilesFromFolder(annotatedFolder);
    
    console.log(`Processing classification for ${annotatedFiles.length} documents`);
    
    if (annotatedFiles.length === 0) {
      metadataCategoriesContainer.innerHTML = `
        <p class="placeholder-text">No annotated documents found</p>
      `;
      return;
    }
    
    // Collect metadata from all documents
    const documentsMetadata = await collectDocumentsMetadata(annotatedFiles);
    
    console.log('Documents metadata collected:', documentsMetadata);
    
    // Extract metadata keys (excluding time metadata)
    const metadataKeys = extractMetadataKeys(documentsMetadata);
    
    console.log('Metadata keys found:', metadataKeys);
    
    // Render unique metadata summary
    const metadataSummaryContainer = document.getElementById('metadata-summary');
    if (metadataSummaryContainer) {
      renderMetadataSummary(documentsMetadata, metadataKeys, metadataSummaryContainer);
    }
    
    // Render metadata table
    renderMetadataTable(documentsMetadata, metadataKeys, metadataCategoriesContainer);
    
    console.log('Document classification loaded successfully');
    
  } catch (error) {
    console.error('Error loading document classification:', error);
    metadataCategoriesContainer.innerHTML = `
      <p class="placeholder-text">Error loading classification: ${error.message}</p>
    `;
  }
}

/**
 * Collect metadata from all annotated documents
 * @param {Array} fileHandles - Array of file handles
 * @returns {Array} Array of document metadata objects
 */
async function collectDocumentsMetadata(fileHandles) {
  const documentsMetadata = [];
  
  for (const fileHandle of fileHandles) {
    const schemaWrapper = await parseHTMLMetadata(fileHandle);
    
    if (schemaWrapper && schemaWrapper.meta) {
      documentsMetadata.push({
        filename: fileHandle.name,
        meta: schemaWrapper.meta
      });
    } else {
      // Include documents without metadata
      documentsMetadata.push({
        filename: fileHandle.name,
        meta: {}
      });
    }
  }
  
  return documentsMetadata;
}

/**
 * Extract unique metadata keys from all documents (excluding time-related keys)
 * @param {Array} documentsMetadata - Array of document metadata
 * @returns {Array} Array of metadata keys
 */
function extractMetadataKeys(documentsMetadata) {
  const keysSet = new Set();
  
  // Time-related keys to exclude
  const excludeKeys = ['time', 'Time', 'timestamp', 'Timestamp', 'duration', 'Duration'];
  
  for (const doc of documentsMetadata) {
    if (doc.meta) {
      Object.keys(doc.meta).forEach(key => {
        if (!excludeKeys.includes(key)) {
          keysSet.add(key);
        }
      });
    }
  }
  
  // Convert to array and sort alphabetically
  return Array.from(keysSet).sort();
}

/**
 * Render metadata table with documents as rows and metadata keys as columns
 * @param {Array} documentsMetadata - Array of document metadata
 * @param {Array} metadataKeys - Array of metadata keys
 * @param {HTMLElement} container - Container element
 */
function renderMetadataTable(documentsMetadata, metadataKeys, container) {
  if (metadataKeys.length === 0) {
    container.innerHTML = `
      <p class="placeholder-text">No metadata found in documents (time metadata excluded)</p>
    `;
    return;
  }
  
  // Create table header with collapse arrow
  const tableHeaderHTML = `
    <div class="metadata-table-header">
      <span class="collapse-arrow" id="metadata-table-arrow">▶</span>
      <h3>Metadata Overview</h3>
    </div>
  `;
  
  // Create table
  let tableHTML = '<div class="metadata-table-wrapper" id="metadata-table-wrapper">';
  tableHTML += '<table class="metadata-table">';
  
  // Table header
  tableHTML += '<thead><tr>';
  tableHTML += '<th class="metadata-table-header-cell">Document</th>';
  metadataKeys.forEach(key => {
    tableHTML += `<th class="metadata-table-header-cell">${escapeHtml(key)}</th>`;
  });
  tableHTML += '</tr></thead>';
  
  // Table body - show first 10 rows by default
  tableHTML += '<tbody>';
  
  const maxVisibleRows = 10;
  documentsMetadata.forEach((doc, index) => {
    const isHidden = index >= maxVisibleRows;
    const rowClass = isHidden ? 'metadata-table-row hidden-row' : 'metadata-table-row';
    
    tableHTML += `<tr class="${rowClass}">`;
    tableHTML += `<td class="metadata-table-cell document-name-cell">${escapeHtml(doc.filename)}</td>`;
    
    metadataKeys.forEach(key => {
      const value = doc.meta[key] || '-';
      tableHTML += `<td class="metadata-table-cell">${escapeHtml(String(value))}</td>`;
    });
    
    tableHTML += '</tr>';
  });
  
  tableHTML += '</tbody>';
  tableHTML += '</table>';
  tableHTML += '</div>';
  
  // Info text
  const infoHTML = `
    <p class="metadata-table-info">
      Showing ${Math.min(maxVisibleRows, documentsMetadata.length)} of ${documentsMetadata.length} documents
      ${documentsMetadata.length > maxVisibleRows ? '(click arrow to expand)' : ''}
    </p>
  `;
  
  container.innerHTML = tableHeaderHTML + tableHTML + infoHTML;
  
  // Add collapse/expand functionality for rows (not the whole table)
  const tableHeader = container.querySelector('.metadata-table-header');
  const arrow = document.getElementById('metadata-table-arrow');
  
  if (tableHeader && arrow) {
    // Start collapsed (showing first 10 rows only)
    // No 'expanded' class initially
    
    tableHeader.addEventListener('click', () => {
      const isExpanded = arrow.classList.contains('expanded');
      
      if (isExpanded) {
        // Collapse to first 10 rows
        arrow.classList.remove('expanded');
        
        // Hide extra rows
        const hiddenRows = container.querySelectorAll('.hidden-row');
        hiddenRows.forEach(row => {
          row.style.display = 'none';
        });
      } else {
        // Expand to show all rows
        arrow.classList.add('expanded');
        
        // Show all rows
        const hiddenRows = container.querySelectorAll('.hidden-row');
        hiddenRows.forEach(row => {
          row.style.display = '';
        });
      }
    });
  }
  
  // Initially hide the extra rows (show first 10)
  const hiddenRows = container.querySelectorAll('.hidden-row');
  hiddenRows.forEach(row => {
    row.style.display = 'none';
  });
}

/**
 * Render unique metadata summary with counts
 * @param {Array} documentsMetadata - Array of document metadata
 * @param {Array} metadataKeys - Array of metadata keys
 * @param {HTMLElement} container - Container element
 */
function renderMetadataSummary(documentsMetadata, metadataKeys, container) {
  if (metadataKeys.length === 0) {
    container.innerHTML = `
      <p class="placeholder-text">No metadata found in documents</p>
    `;
    return;
  }
  
  // Create summary header with collapse arrow
  const summaryHeaderHTML = `
    <div class="summary-header">
      <span class="collapse-arrow" id="summary-arrow">▶</span>
      <h3>Unique Metadata Summary</h3>
    </div>
  `;
  
  // Create summary grid
  let summaryHTML = '<div class="summary-grid" id="summary-grid">';
  
  // For each metadata key, create a column with unique values and counts
  metadataKeys.forEach(key => {
    const valueCounts = {};
    
    // Count occurrences of each unique value
    documentsMetadata.forEach(doc => {
      const value = doc.meta[key] || 'Not specified';
      valueCounts[value] = (valueCounts[value] || 0) + 1;
    });
    
    // Sort by count descending
    const sortedValues = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
    
    summaryHTML += '<div class="summary-column">';
    summaryHTML += `<div class="summary-column-title">${escapeHtml(key)}</div>`;
    summaryHTML += '<div class="summary-items">';
    
    const maxVisibleItems = 10;
    sortedValues.forEach(([value, count], index) => {
      const isHidden = index >= maxVisibleItems;
      const itemClass = isHidden ? 'summary-item hidden-item' : 'summary-item';
      
      summaryHTML += `<div class="${itemClass}">`;
      summaryHTML += `<span class="summary-item-label" title="${escapeHtml(String(value))}">${escapeHtml(String(value))}</span>`;
      summaryHTML += `<span class="summary-item-count">${count}</span>`;
      summaryHTML += '</div>';
    });
    
    summaryHTML += '</div>';
    summaryHTML += '</div>';
  });
  
  summaryHTML += '</div>';
  
  container.innerHTML = summaryHeaderHTML + summaryHTML;
  
  // Add collapse/expand functionality
  const summaryHeader = container.querySelector('.summary-header');
  const arrow = document.getElementById('summary-arrow');
  
  if (summaryHeader && arrow) {
    // Start collapsed (showing first 10 items only)
    // No 'expanded' class initially
    
    summaryHeader.addEventListener('click', () => {
      const isExpanded = arrow.classList.contains('expanded');
      
      if (isExpanded) {
        // Collapse to first 10 items
        arrow.classList.remove('expanded');
        
        // Hide extra items in all columns
        const hiddenItems = container.querySelectorAll('.hidden-item');
        hiddenItems.forEach(item => {
          item.style.display = 'none';
        });
      } else {
        // Expand to show all items
        arrow.classList.add('expanded');
        
        // Show all items in all columns
        const hiddenItems = container.querySelectorAll('.hidden-item');
        hiddenItems.forEach(item => {
          item.style.display = '';
        });
      }
    });
  }
  
  // Initially hide the extra items (show first 10)
  const hiddenItems = container.querySelectorAll('.hidden-item');
  hiddenItems.forEach(item => {
    item.style.display = 'none';
  });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
