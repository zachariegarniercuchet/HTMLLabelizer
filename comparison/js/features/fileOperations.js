// File Operations Component
// Handles file upload, clear all, and related operations

import { domElements } from '../core/domElements.js';
import { setDocumentA, setDocumentB, setComparisonResults, getDocumentA, getDocumentB, clearCachedIAAResults } from '../core/state.js';
import { readFileAsText, isHtmlFile, processFiles } from '../utils/fileLoader.js';
import { extractExistingLabels, buildLabelsFromSchema, getHtmlStatistics, attachReadOnlyLabelEventListeners } from './htmlProcessor.js';
import { updateStatistics as updateCardStatistics } from './statistics.js';

export function initializeFileOperations() {
  setupClearAll();
  setupFileInput();
  setupDragAndDrop();
  setupUploadLinks();
}

function setupClearAll() {
  const { clearAllBtn } = domElements;
  
  clearAllBtn?.addEventListener('click', () => {
    if (confirm('Clear all loaded files and reset the comparison?')) {
      clearDocumentA();
      clearDocumentB();
      resetStatistics();
      disableDownloadButtons();
      clearCachedIAAResults(); // Clear IAA cache when documents are cleared
      checkAndEnableIAAButton(); // Disable IAA button when clearing
      
      // Re-attach upload links after clearing
      setTimeout(() => setupUploadLinks(), 100);
    }
  });
}

function clearDocumentA() {
  const { htmlContentA, filenameA, sourceViewA, viewToggleA } = domElements;
  
  if (htmlContentA) {
    htmlContentA.innerHTML = `
      <div class="empty-state drop-zone" id="drop-zone-a">
        <h3>No HTML loaded</h3>
        <p><a href="#" id="upload-link-a">Upload an HTML File</a> or drag & drop here to start comparing</p>
      </div>
    `;
    htmlContentA.style.display = 'block';
  }
  if (sourceViewA) {
    sourceViewA.style.display = 'none';
    sourceViewA.value = '';
  }
  if (viewToggleA) {
    viewToggleA.disabled = true;
    viewToggleA.classList.remove('active');
    viewToggleA.textContent = 'View Source';
  }
  if (domElements.statsBtnA) {
    domElements.statsBtnA.disabled = true;
  }
  if (filenameA) filenameA.textContent = '';
  setDocumentA(null);
  clearCachedIAAResults(); // Clear IAA cache when document changes
}

function clearDocumentB() {
  const { htmlContentB, filenameB, sourceViewB, viewToggleB } = domElements;
  
  if (htmlContentB) {
    htmlContentB.innerHTML = `
      <div class="empty-state drop-zone" id="drop-zone-b">
        <h3>No HTML loaded</h3>
        <p><a href="#" id="upload-link-b">Upload an HTML File</a> or drag & drop here to start comparing</p>
      </div>
    `;
    htmlContentB.style.display = 'block';
  }
  if (sourceViewB) {
    sourceViewB.style.display = 'none';
    sourceViewB.value = '';
  }
  if (viewToggleB) {
    viewToggleB.disabled = true;
    viewToggleB.classList.remove('active');
    viewToggleB.textContent = 'View Source';
  }
  if (domElements.statsBtnB) {
    domElements.statsBtnB.disabled = true;
  }
  if (filenameB) filenameB.textContent = '';
  setDocumentB(null);
  clearCachedIAAResults(); // Clear IAA cache when document changes
}

function resetStatistics() {
  const { agreementScore, totalLabelsA, totalLabelsB, commonLabels, analysisDetails } = domElements;
  
  if (agreementScore) agreementScore.textContent = '0%';
  if (totalLabelsA) totalLabelsA.textContent = '0';
  if (totalLabelsB) totalLabelsB.textContent = '0';
  if (commonLabels) commonLabels.textContent = '0';
  
  if (analysisDetails) {
    analysisDetails.innerHTML = '<p class="no-data">Load two annotated HTML files to see comparison analysis</p>';
  }
  
  setComparisonResults(null);
}

function disableDownloadButtons() {
  const { downloadReportBtn, saveAsBtn } = domElements;
  
  if (downloadReportBtn) downloadReportBtn.disabled = true;
  if (saveAsBtn) saveAsBtn.disabled = true;
}

/**
 * Setup upload link handlers
 * These links are in the empty state sections
 */
function setupUploadLinks() {
  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    const uploadLinkA = document.getElementById('upload-link-a');
    const uploadLinkB = document.getElementById('upload-link-b');
    
    if (uploadLinkA) {
      uploadLinkA.addEventListener('click', (e) => {
        e.preventDefault();
        // Create temporary file input for Document A only
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = '.html,.htm';
        tempInput.onchange = async (event) => {
          const files = Array.from(event.target.files);
          if (files.length > 0) {
            const processedFiles = await processFiles(files);
            if (processedFiles.length > 0) {
              await loadDocumentA(processedFiles[0].name, processedFiles[0].content);
            }
          }
        };
        tempInput.click();
      });
    }
    
    if (uploadLinkB) {
      uploadLinkB.addEventListener('click', (e) => {
        e.preventDefault();
        // Create temporary file input for Document B only
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = '.html,.htm';
        tempInput.onchange = async (event) => {
          const files = Array.from(event.target.files);
          if (files.length > 0) {
            const processedFiles = await processFiles(files);
            if (processedFiles.length > 0) {
              await loadDocumentB(processedFiles[0].name, processedFiles[0].content);
            }
          }
        };
        tempInput.click();
      });
    }
  }, 100);
}

/**
 * Setup file input handler - only used for multi-file drops now
/**
 * Setup file input handler
 * From labelizer/app.js lines 6766-6810
 */
function setupFileInput() {
  const { htmlFileInput } = domElements;
  
  if (!htmlFileInput) return;
  
  htmlFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Process files
    const processedFiles = await processFiles(files);
    
    if (processedFiles.length === 0) {
      alert('No valid HTML files found. Please select .html or .htm files.');
      return;
    }
    
    // Load first file into Document A
    if (processedFiles[0]) {
      await loadDocumentA(processedFiles[0].name, processedFiles[0].content);
    }
    
    // Load second file into Document B (if provided)
    if (processedFiles[1]) {
      await loadDocumentB(processedFiles[1].name, processedFiles[1].content);
    }
    
    // Reset file input
    e.target.value = '';
  });
}

/**
 * Setup drag and drop handlers
 * From labelizer/app.js lines 6816-6861
 */
function setupDragAndDrop() {
  const dropZoneA = document.getElementById('drop-zone-a');
  const dropZoneB = document.getElementById('drop-zone-b');
  
  // Add drag event listeners to both drop zones
  [dropZoneA, dropZoneB].forEach(dropZone => {
    if (!dropZone) return;
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      });
    });
    
    dropZone.addEventListener('drop', async (e) => {
      const files = Array.from(e.dataTransfer.files);
      
      if (files.length === 0) return;
      
      // Process files
      const processedFiles = await processFiles(files);
      
      if (processedFiles.length === 0) {
        alert('No valid HTML files found. Please drop .html or .htm files.');
        return;
      }
      
      // Determine which zone received the drop
      const isZoneA = dropZone.id === 'drop-zone-a';
      
      if (isZoneA) {
        // Load into Document A
        await loadDocumentA(processedFiles[0].name, processedFiles[0].content);
        
        // If second file exists, load into Document B
        if (processedFiles[1]) {
          await loadDocumentB(processedFiles[1].name, processedFiles[1].content);
        }
      } else {
        // Load into Document B
        await loadDocumentB(processedFiles[0].name, processedFiles[0].content);
      }
    });
  });
}

/**
 * Load HTML content into Document A
 */
async function loadDocumentA(filename, htmlContent) {
  const { htmlContentA, filenameA } = domElements;
  
  // Extract schema from HTML
  const schemaWrapper = extractExistingLabels(htmlContent);
  
  let labels = new Map();
  let meta = {};
  
  if (schemaWrapper) {
    if (schemaWrapper.labeltree) {
      labels = buildLabelsFromSchema(schemaWrapper.labeltree);
    }
    if (schemaWrapper.meta) {
      meta = schemaWrapper.meta;
    }
  }
  
  // Create document object
  const documentData = {
    filename: filename,
    html: htmlContent,
    htmlContent: htmlContent,
    labels: labels,
    meta: meta
  };
  
  setDocumentA(documentData);
  clearCachedIAAResults(); // Clear IAA cache when new document is loaded
  
  // Enable view toggle button
  if (domElements.viewToggleA) {
    domElements.viewToggleA.disabled = false;
  }
  
  // Enable stats button
  if (domElements.statsBtnA) {
    domElements.statsBtnA.disabled = false;
  }
  
  // Update UI
  if (filenameA) {
    filenameA.textContent = filename;
  }
  
  if (htmlContentA) {
    // Parse and render HTML - matching original labelizer flow
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Style labels in the parsed doc BEFORE setting innerHTML (like original)
    const mentions = doc.querySelectorAll('manual_label, auto_label');
    mentions.forEach(mention => {
      const labelName = mention.getAttributeNames()[0];
      const parent = mention.getAttribute('parent') || '';
      const path = parent ? [parent, labelName] : [labelName];
      const labelData = labels.get(path[0]);
      
      if (labelData) {
        const actualLabel = path.length > 1 ? labelData.sublabels.get(path[1]) : labelData;
        if (actualLabel) {
          mention.style.backgroundColor = actualLabel.color;
          const r = parseInt(actualLabel.color.slice(1,3), 16);
          const g = parseInt(actualLabel.color.slice(3,5), 16);
          const b = parseInt(actualLabel.color.slice(5,7), 16);
          const brightness = (r*299 + g*587 + b*114) / 1000;
          mention.style.color = brightness > 155 ? '#000000' : '#FFFFFF';
        }
      }
    });
    
    // Set innerHTML from styled doc.body
    htmlContentA.innerHTML = doc.body.innerHTML;
    
    // Attach read-only event listeners (onclick for parameter viewing)
    attachReadOnlyLabelEventListeners(htmlContentA, labels);
    
    // Get statistics
    const stats = getHtmlStatistics(htmlContentA);
    console.log('Document A loaded:', filename, stats);
  }
  
  // Update statistics
  updateStatistics();
  
  console.log(`Document A loaded: ${filename}`);
}

/**
 * Load HTML content into Document B
 */
async function loadDocumentB(filename, htmlContent) {
  const { htmlContentB, filenameB } = domElements;
  
  // Extract schema from HTML
  const schemaWrapper = extractExistingLabels(htmlContent);
  let labels = new Map();
  let meta = {};
  
  if (schemaWrapper) {
    if (schemaWrapper.labeltree) {
      labels = buildLabelsFromSchema(schemaWrapper.labeltree);
    }
    if (schemaWrapper.meta) {
      meta = schemaWrapper.meta;
    }
  }
  
  // Create document object
  const documentData = {
    filename: filename,
    html: htmlContent,
    htmlContent: htmlContent,
    labels: labels,
    meta: meta
  };
  
  setDocumentB(documentData);
  clearCachedIAAResults(); // Clear IAA cache when new document is loaded
  
  // Enable view toggle button
  if (domElements.viewToggleB) {
    domElements.viewToggleB.disabled = false;
  }
  
  // Enable stats button
  if (domElements.statsBtnB) {
    domElements.statsBtnB.disabled = false;
  }
  
  // Update UI
  if (filenameB) {
    filenameB.textContent = filename;
  }
  
  if (htmlContentB) {
    // Parse and render HTML - matching original labelizer flow
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Style labels in the parsed doc BEFORE setting innerHTML (like original)
    const mentions = doc.querySelectorAll('manual_label, auto_label');
    mentions.forEach(mention => {
      const labelName = mention.getAttributeNames()[0];
      const parent = mention.getAttribute('parent') || '';
      const path = parent ? [parent, labelName] : [labelName];
      const labelData = labels.get(path[0]);
      
      if (labelData) {
        const actualLabel = path.length > 1 ? labelData.sublabels.get(path[1]) : labelData;
        if (actualLabel) {
          mention.style.backgroundColor = actualLabel.color;
          const r = parseInt(actualLabel.color.slice(1,3), 16);
          const g = parseInt(actualLabel.color.slice(3,5), 16);
          const b = parseInt(actualLabel.color.slice(5,7), 16);
          const brightness = (r*299 + g*587 + b*114) / 1000;
          mention.style.color = brightness > 155 ? '#000000' : '#FFFFFF';
        }
      }
    });
    
    // Set innerHTML from styled doc.body
    htmlContentB.innerHTML = doc.body.innerHTML;
    
    // Attach read-only event listeners (onclick for parameter viewing)
    attachReadOnlyLabelEventListeners(htmlContentB, labels);
    
    // Get statistics
    const stats = getHtmlStatistics(htmlContentB);
    console.log('Document B loaded:', filename, stats);
  }
  
  // Update statistics
  updateStatistics();
  
  console.log(`Document B loaded: ${filename}`);
}

/**
 * Update statistics display
 */
function updateStatistics() {
  // Update modal statistics
  const { agreementScore, totalLabelsA, totalLabelsB, commonLabels, htmlContentA, htmlContentB } = domElements;
  
  if (htmlContentA) {
    const statsA = getHtmlStatistics(htmlContentA);
    if (totalLabelsA) totalLabelsA.textContent = statsA.totalMentions;
    // Update card flip statistics for document A
    updateCardStatistics('a');
  }
  
  if (htmlContentB) {
    const statsB = getHtmlStatistics(htmlContentB);
    if (totalLabelsB) totalLabelsB.textContent = statsB.totalMentions;
    // Update card flip statistics for document B
    updateCardStatistics('b');
  }
  
  // Enable IAA Analysis button if both documents are loaded
  checkAndEnableIAAButton();
  
  // TODO: Calculate agreement score and common labels
}

/**
 * Check if both documents are loaded and enable IAA Analysis button
 */
function checkAndEnableIAAButton() {
  const { iaaAnalysisBtn } = domElements;
  const docA = getDocumentA();
  const docB = getDocumentB();
  
  if (iaaAnalysisBtn) {
    if (docA && docB) {
      iaaAnalysisBtn.disabled = false;
    } else {
      iaaAnalysisBtn.disabled = true;
    }
  }
}
