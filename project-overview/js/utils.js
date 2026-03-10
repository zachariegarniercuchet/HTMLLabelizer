// ============================================
// UTILS: File Parsing
// ============================================

/**
 * Extract existing labels from HTML string using TreeWalker (matching comparison tool)
 */
function extractExistingLabels(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT, null);
  let commentNode;
  while (walker.nextNode()) {
    commentNode = walker.currentNode;
    const text = commentNode.nodeValue.trim();
    if (text.startsWith("HTMLLabelizer")) {
      const jsonStr = text.substring("HTMLLabelizer".length).trim();
      try {
        const schemaWrapper = JSON.parse(jsonStr);
        // Return the schema wrapper which contains labeltree and meta
        return schemaWrapper;
      } catch (e) {
        console.error('Failed to parse schema from comment:', e);
        return null;
      }
    }
  }
  return null;
}

async function parseHTMLMetadata(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    
    // Use extractExistingLabels for better parsing
    const schemaWrapper = extractExistingLabels(text);
    
    if (!schemaWrapper) {
      console.warn(`No schema found in ${fileHandle.name}`);
      return null;
    }
    
    console.log(`Schema extracted from ${fileHandle.name}:`, {
      hasLabeltree: !!schemaWrapper.labeltree,
      hasMeta: !!schemaWrapper.meta,
      labeltreeKeys: schemaWrapper.labeltree ? Object.keys(schemaWrapper.labeltree) : []
    });
    
    return schemaWrapper;
  } catch (e) {
    console.error('Failed to parse metadata from', fileHandle.name, ':', e);
    return null;
  }
}

async function readFilesFromFolder(folderHandle, extensions = ['.html', '.htm']) {
  const files = [];
  // Ensure extensions is always an array
  const extArray = Array.isArray(extensions) ? extensions : [extensions];
  
  for await (const entry of folderHandle.values()) {
    if (entry.kind === 'file') {
      // Check if file ends with any of the allowed extensions
      const hasValidExtension = extArray.some(ext => entry.name.endsWith(ext));
      if (hasValidExtension) {
        files.push(entry);
      }
    }
  }
  return files;
}
