// Folder Selection and Validation

let selectedFolderHandle = null;

/**
 * Initialize folder selection functionality
 */
export function initializeFolderSelection() {
  const selectFolderBtn = document.getElementById('select-folder-btn');
  
  if (selectFolderBtn) {
    selectFolderBtn.addEventListener('click', handleFolderSelection);
  }
}

/**
 * Handle folder selection button click
 */
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
      alert('Invalid project structure. Please select a folder containing "Original", "Annotated", and "IAA_Experiments" subfolders.');
    }
    
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error selecting folder:', error);
      alert('Error accessing folder: ' + error.message);
    }
  }
}

/**
 * Validate that the selected folder has the required structure
 */
async function validateFolderStructure(directoryHandle) {
  const requiredFolders = ['Original', 'Annotated', 'IAA_Experiments'];
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

/**
 * Display the selected folder path
 */
function displaySelectedFolder(folderName) {
  const selectedPathElement = document.getElementById('selected-folder-path');
  
  if (selectedPathElement) {
    selectedPathElement.textContent = `Selected: ${folderName}`;
    selectedPathElement.classList.remove('hidden');
  }
}

/**
 * Load project data from the selected folder
 */
async function loadProjectData(directoryHandle) {
  console.log('Loading project data from:', directoryHandle.name);
  
  // Show project content
  const projectContent = document.getElementById('project-content');
  if (projectContent) {
    projectContent.classList.remove('hidden');
  }
  
  // Scroll to project content
  projectContent?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  // TODO: Implement data loading logic
  // This will be implemented in future phases:
  // 1. Load documents from Original folder
  // 2. Load annotated documents from Annotated folder
  // 3. Load IAA experiments from IAA_Experiments folder
  // 4. Process and display statistics
  
  console.log('Project data loading will be implemented in next phase');
}

/**
 * Get the selected folder handle
 */
export function getSelectedFolderHandle() {
  return selectedFolderHandle;
}
