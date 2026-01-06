// File Loading Utilities
// Copied from labelizer/app.js - handles file reading and validation

/**
 * Read a file as text - returns a promise
 * From labelizer/app.js lines 207-214
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Validate that a file is HTML
 */
export function isHtmlFile(file) {
  return file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm');
}

/**
 * Process multiple files from input or drop
 * Returns array of {file, content} objects
 */
export async function processFiles(files) {
  const results = [];
  
  for (const file of files) {
    if (isHtmlFile(file)) {
      try {
        const content = await readFileAsText(file);
        results.push({
          file: file,
          content: content,
          name: file.name
        });
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
    }
  }
  
  return results;
}
