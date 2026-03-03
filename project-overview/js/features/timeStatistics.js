// ============================================
// Time Statistics Module
// ============================================

/**
 * Load and compute time statistics from all documents in the Annotated folder
 * @param {FileSystemDirectoryHandle} projectFolderHandle - Root project folder
 */
async function loadTimeStatistics(projectFolderHandle) {
  console.log('Loading time statistics...');
  
  const timeContainer = document.getElementById('time-statistics-content');
  if (!timeContainer) {
    console.error('Time statistics container not found');
    return;
  }
  
  try {
    // Get the Annotated folder
    const annotatedFolder = await projectFolderHandle.getDirectoryHandle('Annotated');
    const annotatedFiles = await readFilesFromFolder(annotatedFolder, '.html');
    
    console.log(`Processing time statistics for ${annotatedFiles.length} documents`);
    
    if (annotatedFiles.length === 0) {
      timeContainer.innerHTML = `
        <p class="placeholder-text">No annotated documents found</p>
      `;
      return;
    }
    
    // Collect time data from all documents
    const timeData = await collectTimeDataFromDocuments(annotatedFiles);
    
    console.log('Time data collected:', timeData);
    
    // Compute statistics
    const stats = computeTimeStatistics(timeData);
    
    console.log('Computed statistics:', stats);
    
    // Render statistics
    renderTimeStatistics(stats, timeContainer);
    
    console.log('Time statistics loaded successfully');
    
  } catch (error) {
    console.error('Error loading time statistics:', error);
    timeContainer.innerHTML = `
      <p class="placeholder-text">Error loading time statistics: ${error.message}</p>
    `;
  }
}

/**
 * Collect time and document data from all annotated files
 * @param {Array} fileHandles - Array of file handles
 * @returns {Object} Time data collection
 */
async function collectTimeDataFromDocuments(fileHandles) {
  const documents = [];
  
  for (const fileHandle of fileHandles) {
    try {
      const file = await fileHandle.getFile();
      const htmlContent = await file.text();
      
      // Extract metadata (includes time)
      const metadata = await parseHTMLMetadata(fileHandle);
      
      // Parse document to count labels and get text length
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      const manualLabels = doc.querySelectorAll('manual_label');
      const autoLabels = doc.querySelectorAll('auto_label');
      const totalLabels = manualLabels.length + autoLabels.length;
      
      // Count text length (words and characters)
      const bodyText = doc.body.textContent || '';
      const wordCount = bodyText.trim().split(/\s+/).length;
      const charCount = bodyText.length;
      
      // Extract time in milliseconds
      const timeMs = metadata && metadata.meta && metadata.meta.time ? metadata.meta.time : 0;
      
      // Count labels by parent type
      const labelsByType = new Map();
      manualLabels.forEach(label => {
        const labelName = label.getAttribute('labelName');
        const parent = label.getAttribute('parent');
        const topLevel = parent && parent !== '' ? parent : labelName;
        
        if (topLevel) {
          labelsByType.set(topLevel, (labelsByType.get(topLevel) || 0) + 1);
        }
      });
      autoLabels.forEach(label => {
        const labelName = label.getAttribute('labelName');
        const parent = label.getAttribute('parent');
        const topLevel = parent && parent !== '' ? parent : labelName;
        
        if (topLevel) {
          labelsByType.set(topLevel, (labelsByType.get(topLevel) || 0) + 1);
        }
      });
      
      documents.push({
        filename: fileHandle.name,
        timeMs: timeMs,
        timeHours: timeMs / (1000 * 60 * 60),
        totalLabels: totalLabels,
        manualLabels: manualLabels.length,
        autoLabels: autoLabels.length,
        wordCount: wordCount,
        charCount: charCount,
        labelsByType: labelsByType
      });
      
      console.log(`  ${fileHandle.name}: ${formatTime(timeMs)}, ${totalLabels} labels, ${wordCount} words`);
      
    } catch (error) {
      console.error(`Error processing ${fileHandle.name}:`, error);
    }
  }
  
  return { documents };
}

/**
 * Compute comprehensive time statistics
 * @param {Object} timeData - Collected time data
 * @returns {Object} Computed statistics
 */
function computeTimeStatistics(timeData) {
  const { documents } = timeData;
  
  if (documents.length === 0) {
    return { hasData: false };
  }
  
  // Filter out documents with zero time
  const docsWithTime = documents.filter(d => d.timeMs > 0);
  
  // Overall time metrics
  const times = docsWithTime.map(d => d.timeMs);
  const totalTimeMs = times.reduce((sum, t) => sum + t, 0);
  const meanTimeMs = times.length > 0 ? totalTimeMs / times.length : 0;
  const stdDevMs = times.length > 0 ? Math.sqrt(
    times.reduce((sum, t) => sum + Math.pow(t - meanTimeMs, 2), 0) / times.length
  ) : 0;
  
  // Label and word counts
  const totalLabels = documents.reduce((sum, d) => sum + d.totalLabels, 0);
  const totalWords = documents.reduce((sum, d) => sum + d.wordCount, 0);
  
  // Efficiency metrics (only for docs with time > 0)
  const labelsPerHour = docsWithTime.length > 0 
    ? docsWithTime.reduce((sum, d) => sum + (d.totalLabels / Math.max(d.timeHours, 0.001)), 0) / docsWithTime.length
    : 0;
  
  const wordsPerHour = docsWithTime.length > 0
    ? docsWithTime.reduce((sum, d) => sum + (d.wordCount / Math.max(d.timeHours, 0.001)), 0) / docsWithTime.length
    : 0;
  
  const timePerLabel = totalLabels > 0 && totalTimeMs > 0
    ? totalTimeMs / totalLabels
    : 0;
  
  const timePerWord = totalWords > 0 && totalTimeMs > 0
    ? totalTimeMs / totalWords
    : 0;
  
  // Per-label-type statistics
  const labelTypeStats = new Map();
  docsWithTime.forEach(doc => {
    doc.labelsByType.forEach((count, labelType) => {
      if (!labelTypeStats.has(labelType)) {
        labelTypeStats.set(labelType, { totalCount: 0, totalTime: 0, docCount: 0 });
      }
      const stats = labelTypeStats.get(labelType);
      stats.totalCount += count;
      stats.totalTime += doc.timeMs;
      stats.docCount += 1;
    });
  });
  
  // Convert to array and calculate per-label time
  const labelTypeArray = Array.from(labelTypeStats.entries()).map(([name, stats]) => ({
    name: name,
    totalCount: stats.totalCount,
    avgTimePerLabel: stats.totalCount > 0 ? stats.totalTime / stats.totalCount : 0,
    docCount: stats.docCount
  })).sort((a, b) => b.totalCount - a.totalCount);
  
  return {
    hasData: true,
    totalDocuments: documents.length,
    documentsWithTime: docsWithTime.length,
    
    // Time metrics
    totalTimeMs: totalTimeMs,
    totalTimeHours: totalTimeMs / (1000 * 60 * 60),
    meanTimeMs: meanTimeMs,
    stdDevMs: stdDevMs,
    
    // Count metrics
    totalLabels: totalLabels,
    totalWords: totalWords,
    
    // Efficiency metrics
    labelsPerHour: labelsPerHour,
    wordsPerHour: wordsPerHour,
    timePerLabelMs: timePerLabel,
    timePerWordMs: timePerWord,
    
    // Per-label-type
    labelTypeStats: labelTypeArray,
    
    // Raw data for potential export
    documents: documents
  };
}

/**
 * Render time statistics with visual elements
 * @param {Object} stats - Computed statistics
 * @param {HTMLElement} container - Container element
 */
function renderTimeStatistics(stats, container) {
  if (!stats.hasData) {
    container.innerHTML = `
      <p class="placeholder-text">No time data available</p>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="time-stats-grid">
      <!-- Overall Time Metrics -->
      <div class="time-stat-card">
        <h4>Overall Time Metrics</h4>
        <div class="stat-rows">
          <div class="stat-row">
            <span class="stat-label">Total Time</span>
            <span class="stat-value">${formatTime(stats.totalTimeMs)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Mean Time per Document</span>
            <span class="stat-value">${formatTime(stats.meanTimeMs)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Standard Deviation</span>
            <span class="stat-value">${formatTime(stats.stdDevMs)}</span>
          </div>
          <div class="stat-row-info">
            <span>${stats.documentsWithTime} of ${stats.totalDocuments} documents have time data</span>
          </div>
        </div>
      </div>
      
      <!-- Efficiency Metrics -->
      <div class="time-stat-card">
        <h4>Efficiency Metrics</h4>
        <div class="stat-rows">
          <div class="stat-row">
            <span class="stat-label">Labels per Hour</span>
            <span class="stat-value highlight">${stats.labelsPerHour.toFixed(1)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Time per Label</span>
            <span class="stat-value">${formatTime(stats.timePerLabelMs)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Words per Hour</span>
            <span class="stat-value">${stats.wordsPerHour.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Format time in milliseconds to human-readable format
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatTime(ms) {
  if (ms === 0) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  } else if (minutes > 0) {
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  } else {
    return `${seconds}s`;
  }
}
