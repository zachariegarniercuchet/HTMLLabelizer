// ============================================
// Main Application Logic
// ============================================

// Global state
let selectedFolderHandle = null;

// ============================================
// Folder Selection and Validation
// ============================================

async function handleFolderSelection() {
  try {
    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support folder selection. Please use a modern browser like Chrome, Edge, or Opera.');
      return;
    }
    
    // Show directory picker
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'read'
    });
    
    // Validate folder structure
    const isValid = await validateFolderStructure(directoryHandle);
    
    if (isValid) {
      selectedFolderHandle = directoryHandle;
      displaySelectedFolder(directoryHandle.name);
      await loadProjectData(directoryHandle);
    } else {
      alert('Invalid project structure. Please select a folder containing "Original" and "Annotated" subfolders.');
    }
    
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error selecting folder:', error);
      alert('Error accessing folder: ' + error.message);
    }
  }
}

async function validateFolderStructure(directoryHandle) {
  const requiredFolders = ['Original', 'Annotated'];
  const foundFolders = [];
  
  try {
    for await (const entry of directoryHandle.values()) {
      if (entry.kind === 'directory') {
        foundFolders.push(entry.name);
      }
    }
    
    // Check if all required folders exist
    const hasAllRequired = requiredFolders.every(folder => 
      foundFolders.includes(folder)
    );
    
    return hasAllRequired;
    
  } catch (error) {
    console.error('Error validating folder structure:', error);
    return false;
  }
}

function displaySelectedFolder(folderName) {
  const selectedPathElement = document.getElementById('selected-folder-path');
  
  if (selectedPathElement) {
    selectedPathElement.textContent = `Selected: ${folderName}`;
    selectedPathElement.classList.remove('hidden');
  }
}

async function loadProjectData(directoryHandle) {
  console.log('Loading project data from:', directoryHandle.name);
  
  // Show project content
  const projectContent = document.getElementById('project-content');
  if (projectContent) {
    projectContent.classList.remove('hidden');
  }
  
  // Scroll to project content
  if (projectContent) {
    projectContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  // Load each section
  try {
    await loadAnnotationState(directoryHandle);
    await loadLabelStatistics(directoryHandle);
    await loadTimeStatistics(directoryHandle);
    await loadDocumentClassification(directoryHandle);
    // TODO: Load other sections
    // await loadIAAAnalysis(directoryHandle);
  } catch (error) {
    console.error('Error loading project data:', error);
  }
}

// ============================================
// Initialization
// ============================================

function initializeApp() {
  console.log('Initializing Project Overview...');
  
  // Folder selection button
  const selectFolderBtn = document.getElementById('select-folder-btn');
  if (selectFolderBtn) {
    selectFolderBtn.addEventListener('click', handleFolderSelection);
  }
  
  // Collapsible Example Project Structure
  const exampleToggle = document.getElementById('example-structure-toggle');
  const exampleContent = document.getElementById('example-structure-content');
  
  if (exampleToggle && exampleContent) {
    const exampleArrow = exampleToggle.querySelector('.collapse-arrow');
    
    exampleToggle.addEventListener('click', () => {
      exampleContent.classList.toggle('expanded');
      exampleArrow.classList.toggle('expanded');
    });
  }
  
  console.log('Project Overview initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
