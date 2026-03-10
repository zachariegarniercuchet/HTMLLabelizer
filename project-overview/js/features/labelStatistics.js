// ============================================
// Label Statistics Module
// ============================================

/**
 * Load and aggregate label statistics from all documents in the Annotated folder
 * @param {FileSystemDirectoryHandle} projectFolderHandle - Root project folder
 */
async function loadLabelStatistics(projectFolderHandle) {
  console.log('Loading label statistics...');
  
  const statsContainer = document.getElementById('project-stats-content');
  if (!statsContainer) {
    console.error('Statistics container not found');
    return;
  }
  
  try {
    // Get the Annotated folder
    const annotatedFolder = await projectFolderHandle.getDirectoryHandle('Annotated');
    const annotatedFiles = await readFilesFromFolder(annotatedFolder);
    
    console.log(`Found ${annotatedFiles.length} documents in Annotated folder`);
    
    if (annotatedFiles.length === 0) {
      statsContainer.innerHTML = `
        <div class="stats-empty">
          <p>No annotated documents found in the Annotated folder</p>
        </div>
      `;
      return;
    }
    
    // Extract label schema from the first document (all should share the same schema)
    let labelsSchema = null;
    let firstDocMetadata = await parseHTMLMetadata(annotatedFiles[0]);
    
    console.log('First document metadata:', firstDocMetadata);
    
    if (firstDocMetadata && firstDocMetadata.labeltree) {
      // Use buildLabelsFromSchema to reconstruct the label schema as a Map
      labelsSchema = buildLabelsFromSchema(firstDocMetadata.labeltree);
      console.log('Label schema reconstructed:', labelsSchema.size, 'top-level labels');
    }
    
    if (!labelsSchema || labelsSchema.size === 0) {
      statsContainer.innerHTML = `
        <div class="stats-empty">
          <p>No label schema found. Documents must contain embedded label schemas.</p>
          <p style="margin-top: 8px; font-size: 14px; color: var(--sub);">Checked first document: ${annotatedFiles[0].name}</p>
        </div>
      `;
      return;
    }
    
    // Aggregate statistics across all documents
    const aggregatedStats = await aggregateStatisticsAcrossDocuments(annotatedFiles, labelsSchema);
    
    console.log('Aggregated statistics:', aggregatedStats);
    
    // Render aggregated statistics
    renderAggregatedStats(aggregatedStats, statsContainer);
    
    console.log('Label statistics loaded successfully');
    
  } catch (error) {
    console.error('Error loading label statistics:', error);
    statsContainer.innerHTML = `
      <div class="stats-empty">
        <p>Error loading statistics: ${error.message}</p>
      </div>
    `;
  }
}

/**
 * Build labels map from schema (from comparison tool)
 * Handles object-based schema with "attributes" instead of "params"
 */
function buildLabelsFromSchema(schema, parent = null, map = new Map()) {
  if (!schema || typeof schema !== "object") return map;
  
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

/**
 * Reconstruct a label Map from JSON structure
 * @param {Array} labelsArray - Array of label objects from JSON
 * @returns {Map} Label schema as a Map
 * @deprecated - Use buildLabelsFromSchema instead
 */
function reconstructLabelMap(labelsArray) {
  const labelsMap = new Map();
  
  labelsArray.forEach(labelObj => {
    const sublabelsMap = new Map();
    
    if (labelObj.sublabels && Array.isArray(labelObj.sublabels)) {
      labelObj.sublabels.forEach(sublabel => {
        sublabelsMap.set(sublabel.name, {
          name: sublabel.name,
          color: sublabel.color,
          type: sublabel.type
        });
      });
    }
    
    labelsMap.set(labelObj.name, {
      name: labelObj.name,
      color: labelObj.color,
      type: labelObj.type,
      sublabels: sublabelsMap
    });
  });
  
  return labelsMap;
}

/**
 * Aggregate statistics across multiple documents
 * @param {Array} fileHandles - Array of file handles for annotated documents
 * @param {Map} labelsSchema - The shared label schema
 * @returns {Object} Aggregated statistics
 */
async function aggregateStatisticsAcrossDocuments(fileHandles, labelsSchema) {
  // Initialize aggregated counts
  const aggregatedLabelTree = [];
  let totalLabels = 0;
  let totalDocuments = fileHandles.length;
  
  // Initialize structure based on schema
  labelsSchema.forEach((labelDef, labelName) => {
    const labelEntry = {
      name: labelName,
      color: labelDef.color,
      manual: 0,
      auto: 0,
      total: 0,
      children: []
    };
    
    // Initialize children
    if (labelDef.sublabels && labelDef.sublabels.size > 0) {
      labelDef.sublabels.forEach((sublabelDef, sublabelName) => {
        labelEntry.children.push({
          name: sublabelName,
          color: sublabelDef.color,
          manual: 0,
          auto: 0,
          total: 0
        });
      });
    }
    
    aggregatedLabelTree.push(labelEntry);
  });
  
  // Process each document
  for (const fileHandle of fileHandles) {
    try {
      const file = await fileHandle.getFile();
      const htmlContent = await file.text();
      
      // Parse the document
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Find all labels
      const labels = doc.querySelectorAll('manual_label, auto_label');
      totalLabels += labels.length;
      
      console.log(`Processing ${fileHandle.name}: ${labels.length} labels found`);
      
      // Count labels
      labels.forEach(label => {
        const isManual = label.tagName.toLowerCase() === 'manual_label';
        const labelName = label.getAttribute('labelName');
        const parent = label.getAttribute('parent');
        
        if (!labelName) return;
        
        // Find the label in aggregated tree
        const parentEntry = aggregatedLabelTree.find(l => l.name === (parent || labelName));
        
        if (parent && parent !== '') {
          // This is a sublabel
          if (parentEntry) {
            const childEntry = parentEntry.children.find(c => c.name === labelName);
            if (childEntry) {
              if (isManual) {
                childEntry.manual++;
              } else {
                childEntry.auto++;
              }
              childEntry.total++;
            }
          }
        } else {
          // This is a top-level label
          if (parentEntry) {
            if (isManual) {
              parentEntry.manual++;
            } else {
              parentEntry.auto++;
            }
            parentEntry.total++;
          }
        }
      });
      
    } catch (error) {
      console.error(`Error processing file ${fileHandle.name}:`, error);
    }
  }
  
  // Log aggregation results
  console.log('Aggregation complete:', {
    totalLabels,
    totalDocuments,
    labelTreeSize: aggregatedLabelTree.length,
    topLabelCounts: aggregatedLabelTree.map(l => ({ name: l.name, total: l.total }))
  });
  
  return {
    totalLabels: totalLabels,
    totalDocuments: totalDocuments,
    labelTree: aggregatedLabelTree,
    hasContent: true
  };
}

/**
 * Render aggregated statistics
 * @param {Object} stats - Aggregated statistics object
 * @param {HTMLElement} container - Container to render into
 */
function renderAggregatedStats(stats, container) {
  if (!stats.hasContent) {
    container.innerHTML = `
      <div class="stats-empty">
        <p>No statistics available</p>
      </div>
    `;
    return;
  }
  
  // Build hierarchical label tree HTML (matching shared/statistics.js format)
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
              <span>•</span>
              <span>${stats.totalDocuments} documents</span>
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
        <p>No labels found in annotated documents</p>
      </div>
    `;
  }
}
