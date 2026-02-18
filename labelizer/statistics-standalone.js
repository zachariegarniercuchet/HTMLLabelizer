// Statistics for HTML Labelizer - Standalone version

(function() {
  
  function calculateDocumentStats(htmlString, labelsSchema) {
    if (!htmlString) {
      return { totalLabels: 0, labelTree: [], hasContent: false };
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
        if (!labelCounts.has(labelName)) return;
        
        const data = labelCounts.get(labelName);
        const children = [];
        
        if (labelDef.sublabels && labelDef.sublabels.size > 0) {
          labelDef.sublabels.forEach((sublabelDef, sublabelName) => {
            if (data.children.has(sublabelName)) {
              const childData = data.children.get(sublabelName);
              children.push({
                name: sublabelName,
                manual: childData.manual,
                auto: childData.auto,
                total: childData.manual + childData.auto,
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
      });
    } else {
      Array.from(labelCounts.keys()).sort().forEach(labelName => {
        const data = labelCounts.get(labelName);
        const children = Array.from(data.children.entries())
          .map(([name, childData]) => ({ 
            name, 
            manual: childData.manual, 
            auto: childData.auto,
            total: childData.manual + childData.auto,
            color: '#666'
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        labelTree.push({
          name: labelName,
          manual: data.manual,
          auto: data.auto,
          total: data.manual + data.auto,
          color: '#999',
          children: children
        });
      });
    }

    return {
      totalLabels: labels.length,
      labelTree: labelTree,
      hasContent: true
    };
  }

  function renderStats(stats, container) {
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
      `;
    } else {
      container.innerHTML = `
        <div class="stats-empty">
          <p>No labels found in document</p>
        </div>
      `;
    }
  }

  function getCurrentDocument() {
    return {
      htmlContent: window.currentHtml || null,
      labels: window.labels || null,
      filename: window.currentFileName || 'document'
    };
  }

  function updateStatistics() {
    try {
      const doc = getCurrentDocument();
      const statsContent = document.getElementById('stats-content');
      if (!statsContent) return;
      
      const stats = calculateDocumentStats(doc.htmlContent, doc.labels);
      renderStats(stats, statsContent);
    } catch (error) {
      console.error('[STATS ERROR]', error);
    }
  }

  function toggleStatistics() {
    const overlay = document.getElementById('stats-overlay');
    if (!overlay) return;
    
    const isHidden = overlay.classList.contains('hidden');
    if (isHidden) {
      updateStatistics();
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  function initializeStatistics() {
    const statsBtn = document.getElementById('stats-btn');
    const statsClose = document.getElementById('stats-close');
    const statsOverlay = document.getElementById('stats-overlay');
    
    if (statsBtn) {
      statsBtn.addEventListener('click', toggleStatistics);
    }
    
    if (statsClose) {
      statsClose.addEventListener('click', toggleStatistics);
    }
    
    if (statsOverlay) {
      statsOverlay.addEventListener('click', (e) => {
        if (e.target === statsOverlay) {
          toggleStatistics();
        }
      });
    }
  }

  // Expose to window
  window.updateStatistics = updateStatistics;
  window.toggleStatistics = toggleStatistics;
  window.initializeStatistics = initializeStatistics;
})();
