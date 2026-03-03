// ============================================
// SECTION 1: Annotation State
// ============================================

async function loadAnnotationState(projectFolderHandle) {
  try {
    console.log('Loading annotation state...');
    
    // Get subfolder handles
    const originalHandle = await projectFolderHandle.getDirectoryHandle('Original');
    const annotatedHandle = await projectFolderHandle.getDirectoryHandle('Annotated');
    
    // Count original documents
    const originalFiles = await readFilesFromFolder(originalHandle);
    const totalDocs = originalFiles.length;
    
    // Read annotated documents and extract annotators
    const annotatedFiles = await readFilesFromFolder(annotatedHandle);
    const annotatorCounts = {};
    const documentStatuses = [];
    
    // Create a map of annotated documents for quick lookup
    const annotatedMap = new Map();
    
    for (const fileHandle of annotatedFiles) {
      const metadata = await parseHTMLMetadata(fileHandle);
      const annotator = metadata?.meta?.Annotator || 'Unknown';
      
      annotatorCounts[annotator] = (annotatorCounts[annotator] || 0) + 1;
      annotatedMap.set(fileHandle.name, annotator);
    }
    
    // Build document status list
    for (const fileHandle of originalFiles) {
      const isAnnotated = annotatedMap.has(fileHandle.name);
      documentStatuses.push({
        name: fileHandle.name,
        status: isAnnotated ? 'completed' : 'pending',
        annotator: isAnnotated ? annotatedMap.get(fileHandle.name) : null
      });
    }
    
    const totalAnnotated = annotatedFiles.length;
    const progress = totalDocs > 0 ? (totalAnnotated / totalDocs) * 100 : 0;
    
    // Update UI
    updateProgressBar(progress, totalAnnotated, totalDocs);
    updateAnnotatorChart(annotatorCounts, totalDocs - totalAnnotated);
    updateDocumentList(documentStatuses);
    
    console.log('Annotation state loaded successfully');
    
  } catch (error) {
    console.error('Error loading annotation state:', error);
    alert('Error loading annotation state: ' + error.message);
  }
}

function updateProgressBar(progress, completed, total) {
  const progressBar = document.querySelector('#overall-progress-bar .progress-fill');
  const progressLabel = document.getElementById('overall-progress-label');
  
  if (progressBar && progressLabel) {
    progressBar.style.width = progress.toFixed(1) + '%';
    progressLabel.textContent = progress.toFixed(1) + '%';
  }
  
  // Add stats below progress bar
  const progressOverview = document.querySelector('.progress-overview');
  let statsContainer = progressOverview.querySelector('.progress-stats');
  
  if (!statsContainer) {
    statsContainer = document.createElement('div');
    statsContainer.className = 'progress-stats';
    progressOverview.appendChild(statsContainer);
  }
  
  statsContainer.innerHTML = `
    <div class="progress-stat">
      <span class="progress-stat-label">Total Documents</span>
      <span class="progress-stat-value">${total}</span>
    </div>
    <div class="progress-stat">
      <span class="progress-stat-label">Annotated</span>
      <span class="progress-stat-value">${completed}</span>
    </div>
    <div class="progress-stat">
      <span class="progress-stat-label">Remaining</span>
      <span class="progress-stat-value">${total - completed}</span>
    </div>
  `;
}

function updateAnnotatorChart(annotatorCounts, nonAnnotated) {
  const chartContainer = document.getElementById('contribution-chart');
  if (!chartContainer) return;
  
  // Prepare data for pie chart
  const data = [];
  const colors = ['#6aa3ff', '#4a8ef5', '#93c47d', '#ff5733', '#ffc107', '#8e7cc3', '#76CEDE'];
  let colorIndex = 0;
  
  for (const [annotator, count] of Object.entries(annotatorCounts)) {
    data.push({
      label: annotator,
      value: count,
      color: colors[colorIndex % colors.length]
    });
    colorIndex++;
  }
  
  if (nonAnnotated > 0) {
    data.push({
      label: 'Not Annotated',
      value: nonAnnotated,
      color: '#e0e0e0'
    });
  }
  
  // Render pie chart
  renderPieChart(chartContainer, data);
}

function renderPieChart(container, data) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    container.innerHTML = '<p class="placeholder-text">No data available</p>';
    return;
  }
  
  // Create SVG pie chart
  const size = 280;
  const radius = size / 2 - 20;
  const center = size / 2;
  
  let currentAngle = -90; // Start from top
  const slices = [];
  
  data.forEach(item => {
    const percentage = (item.value / total) * 100;
    const sliceAngle = (item.value / total) * 360;
    
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    
    const largeArc = sliceAngle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    slices.push({
      path: pathData,
      color: item.color,
      label: item.label,
      value: item.value,
      percentage: percentage.toFixed(1)
    });
    
    currentAngle = endAngle;
  });
  
  // Build HTML
  let html = '<div class="pie-chart-container">';
  html += `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  
  slices.forEach(slice => {
    html += `<path d="${slice.path}" fill="${slice.color}" stroke="var(--bg)" stroke-width="2"/>`;
  });
  
  html += '</svg></div>';
  
  // Add legend
  html += '<div class="pie-chart-legend">';
  slices.forEach(slice => {
    html += `
      <div class="legend-item">
        <div class="legend-color" style="background: ${slice.color};"></div>
        <div class="legend-text">
          <div class="legend-label">${slice.label}</div>
          <div class="legend-value">${slice.value} document${slice.value !== 1 ? 's' : ''} (${slice.percentage}%)</div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
}

function updateDocumentList(documentStatuses) {
  const grid = document.getElementById('documents-grid');
  if (!grid) return;
  
  if (documentStatuses.length === 0) {
    grid.innerHTML = '<p class="placeholder-text">No documents found</p>';
    return;
  }
  
  const initialShowCount = 6;
  let html = '';
  
  documentStatuses.forEach((doc, index) => {
    const isHidden = index >= initialShowCount ? 'hidden-doc' : '';
    html += `
      <div class="document-card ${isHidden}">
        <div class="document-name">${doc.name}</div>
        <div class="document-status ${doc.status}">${doc.status}</div>
        ${doc.annotator ? `<div class="document-annotator">By: ${doc.annotator}</div>` : ''}
      </div>
    `;
  });
  
  grid.innerHTML = html;
  
  // Set up toggle functionality
  setupDocumentListToggle(documentStatuses.length, initialShowCount);
}

function setupDocumentListToggle(totalCount, initialShowCount) {
  const toggleHeader = document.getElementById('document-list-toggle');
  const grid = document.getElementById('documents-grid');
  
  if (!toggleHeader || !grid) return;
  
  const arrow = toggleHeader.querySelector('.collapse-arrow');
  
  // Remove previous listener by cloning
  const newToggleHeader = toggleHeader.cloneNode(true);
  toggleHeader.parentNode.replaceChild(newToggleHeader, toggleHeader);
  const newArrow = newToggleHeader.querySelector('.collapse-arrow');
  
  // Set initial state (collapsed = showing first 6)
  let isExpanded = false;
  newArrow.textContent = '▶';
  
  newToggleHeader.addEventListener('click', () => {
    isExpanded = !isExpanded;
    
    if (isExpanded) {
      grid.classList.add('expanded');
      newArrow.textContent = '▼';
    } else {
      grid.classList.remove('expanded');
      newArrow.textContent = '▶';
    }
  });
  
  // Show/hide arrow based on document count
  if (totalCount <= initialShowCount) {
    newToggleHeader.style.cursor = 'default';
    newArrow.style.visibility = 'hidden';
  } else {
    newToggleHeader.style.cursor = 'pointer';
    newArrow.style.visibility = 'visible';
  }
}
