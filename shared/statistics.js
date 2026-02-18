/**
 * Shared Statistics Module
 * Provides statistics calculation and display functionality for HTML Labelizer tools
 */

/**
 * Count labels in an HTML string with hierarchical structure
 * @param {string} htmlString - The HTML content to analyze
 * @param {Map} labelsSchema - The label schema map with hierarchy
 * @returns {Object} Statistics object with label counts
 */
export function calculateDocumentStats(htmlString, labelsSchema) {
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
  
  // Find all manual_label and auto_label elements
  const labels = doc.querySelectorAll('manual_label, auto_label');
  
  // Count labels in a hierarchical structure with manual/auto separation
  const labelCounts = new Map(); // parent -> { manual, auto, children: Map(child -> {manual, auto}) }
  
  labels.forEach(label => {
    const isManual = label.tagName.toLowerCase() === 'manual_label';
    const labelName = label.getAttribute('labelName');
    const parent = label.getAttribute('parent');
    
    if (!labelName) return;
    
    if (parent && parent !== '') {
      // This is a sublabel
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
      // This is a top-level label
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
  
  // Build tree structure for rendering
  const labelTree = [];
  
  // Use schema order if available, otherwise alphabetical
  if (labelsSchema && labelsSchema.size > 0) {
    labelsSchema.forEach((labelDef, labelName) => {
      if (labelCounts.has(labelName)) {
        const data = labelCounts.get(labelName);
        const children = [];
        
        // Get children in schema order
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
    // Fallback: alphabetical order
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

/**
 * Render statistics for a document
 * @param {Object} stats - Statistics object
 * @param {HTMLElement} container - Container to render into
 */
export function renderStats(stats, container) {
  if (!stats.hasContent) {
    container.innerHTML = `
      <div class="stats-empty">
        <p>No document loaded</p>
      </div>
    `;
    return;
  }

  // Build hierarchical label tree HTML
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
              // Calculate total for all sublabels to show proportions
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
                      // Calculate percentage of this sublabel among all sublabels
                      const percentage = sublabelsTotal > 0 ? (child.total / sublabelsTotal * 100) : 0;
                      // Calculate manual/auto split within this sublabel
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
                // Calculate grand total of ALL labels in the document
                const grandTotal = stats.labelTree.reduce((sum, parent) => {
                  const sublabelsTotal = parent.children.reduce((childSum, child) => childSum + child.total, 0);
                  return sum + parent.total + sublabelsTotal;
                }, 0);
                
                return stats.labelTree.map(parent => {
                  const parentTotal = parent.total;
                  const sublabelsTotal = parent.children.reduce((sum, child) => sum + child.total, 0);
                  const combinedTotal = parentTotal + sublabelsTotal;
                  
                  if (combinedTotal === 0) return '';
                  
                  // Calculate this group's proportion of the grand total
                  const groupPercentage = grandTotal > 0 ? (combinedTotal / grandTotal * 100) : 0;
                  
                  // Calculate each segment's proportion within this bar
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
    container.innerHTML = `
      <div class="stats-empty">
        <p>No labels found in document</p>
      </div>
    `;
  }
}

/**
 * Create and initialize a statistics modal
 * @param {Object} options - Configuration options
 * @param {string} options.containerId - ID of the parent container element
 * @param {string} options.overlayId - ID for the overlay element
 * @param {string} options.title - Title for the statistics modal
 * @param {Function} options.getDocument - Function to get the current document data
 * @param {Function} options.downloadCallback - Optional callback for download button
 * @returns {Object} Object with functions to control the statistics modal
 */
export function createStatisticsModal(options) {
  const {
    containerId,
    overlayId,
    title,
    getDocument,
    downloadCallback
  } = options;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with id '${containerId}' not found`);
    return null;
  }

  // Create overlay and modal HTML
  const overlayHTML = `
    <div class="stats-overlay hidden" id="${overlayId}">
      <div class="stats-modal">
        <div class="stats-modal-header">
          <h3>${title}</h3>
          <div class="stats-header-buttons">
            ${downloadCallback ? `
              <button class="stats-download-btn" id="${overlayId}-download" title="Download Analysis">
                <img src="../assets/icons-download.png" alt="Download" class="download-icon">
              </button>
            ` : ''}
            <button class="stats-close-btn" id="${overlayId}-close">×</button>
          </div>
        </div>
        <div class="stats-modal-body">
          <div class="stats-container" id="${overlayId}-content">
            <div class="stats-empty">
              <p>Loading statistics...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Insert overlay into container
  container.insertAdjacentHTML('beforeend', overlayHTML);

  // Get elements
  const overlay = document.getElementById(overlayId);
  const statsContent = document.getElementById(`${overlayId}-content`);
  const closeBtn = document.getElementById(`${overlayId}-close`);
  const downloadBtn = downloadCallback ? document.getElementById(`${overlayId}-download`) : null;

  // Toggle function
  function toggle() {
    const isHidden = overlay.classList.contains('hidden');
    
    if (isHidden) {
      update();
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  // Update function
  function update() {
    const doc = getDocument();
    const htmlContent = doc ? doc.htmlContent : null;
    const labelsSchema = doc ? doc.labels : null;
    
    if (!statsContent) {
      console.warn('Statistics content container not found');
      return;
    }
    
    const stats = calculateDocumentStats(htmlContent, labelsSchema);
    renderStats(stats, statsContent);
  }

  // Download function
  function download() {
    if (downloadCallback) {
      downloadCallback();
    }
  }

  // Set up event listeners
  if (closeBtn) {
    closeBtn.addEventListener('click', toggle);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', download);
  }

  // Close when clicking outside the modal
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      toggle();
    }
  });

  return {
    toggle,
    update,
    download,
    overlay,
    statsContent
  };
}

/**
 * Export statistics as JSON
 * @param {Object} doc - Document object with htmlContent and labels
 * @param {string} filename - Filename for the download
 */
export function downloadStatisticsJSON(doc, filename) {
  const htmlContent = doc ? doc.htmlContent : null;
  const labelsSchema = doc ? doc.labels : null;
  
  if (!htmlContent) {
    console.warn('No document loaded to export statistics');
    return;
  }
  
  const stats = calculateDocumentStats(htmlContent, labelsSchema);
  
  // Build detailed statistics object
  const exportData = {
    documentName: filename || 'Document',
    exportDate: new Date().toISOString(),
    totalLabels: stats.totalLabels,
    labelParents: stats.labelTree.length,
    labels: stats.labelTree.map(parent => {
      const parentTotalManual = parent.manual;
      const parentTotalAuto = parent.auto;
      const parentTotal = parent.total;
      
      return {
        name: parent.name,
        color: parent.color,
        manual: parentTotalManual,
        auto: parentTotalAuto,
        total: parentTotal,
        sublabels: parent.children.map(child => ({
          name: child.name,
          color: child.color,
          manual: child.manual,
          auto: child.auto,
          total: child.total
        }))
      };
    })
  };
  
  // Create and trigger download
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename.replace('.html', '')}_statistics.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
