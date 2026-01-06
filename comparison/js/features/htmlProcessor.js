// HTML Processing Functions
// Copied from labelizer/app.js - handles HTML parsing, label extraction, and rendering

import { showParameterMenu } from './parameterMenu.js';

/**
 * Extract existing labels from HTML string
 * From labelizer/app.js lines 3769-3829
 */
export function extractExistingLabels(htmlString) {
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

/**
 * Build schema from labels map
 * From labelizer/app.js lines 3896-3932
 * EXACT COPY - returns object with "attributes" not array with "params"
 */
export function buildSchemaFromLabels(map) {
  const obj = {};
  map.forEach(label => {
    const attributes = {};
    
    // Process all regular parameters
    label.params.forEach((paramDef, paramName) => {
      let groupRole = "regular";
      
      // Check if this is the group ID
      if (label.groupConfig && label.groupConfig.groupIdAttribute === paramName) {
        groupRole = "groupID";
      }
      
      attributes[paramName] = {
        ...paramDef,
        groupRole: groupRole
      };
    });
    
    // Add group attributes
    if (label.groupConfig && label.groupConfig.groupAttributes) {
      label.groupConfig.groupAttributes.forEach((attrDef, attrName) => {
        attributes[attrName] = {
          ...attrDef,
          groupRole: "groupAttribute"
        };
      });
    }
    
    obj[label.name] = {
      color: label.color,
      sublabels: buildSchemaFromLabels(label.sublabels),
      attributes: attributes
    };
  });
  return obj;
}

/**
 * Build labels map from schema
 * From labelizer/app.js lines 3935-3984
 * EXACT COPY - handles object-based schema with "attributes" instead of "params"
 */
export function buildLabelsFromSchema(schema, parent = null, map = new Map()) {
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
 * Get statistics from HTML content
 */
export function getHtmlStatistics(htmlContent) {
  const manualLabels = htmlContent.querySelectorAll('manual_label');
  const autoLabels = htmlContent.querySelectorAll('auto_label');
  
  return {
    totalMentions: manualLabels.length + autoLabels.length,
    manualLabels: manualLabels.length,
    autoLabels: autoLabels.length
  };
}

/**
 * Get contrast color for text (white or black) based on background color
 * From labelizer/app.js lines 195-201
 */
function getContrastColor(hexcolor) {
  const r = parseInt(hexcolor.slice(1,3), 16);
  const g = parseInt(hexcolor.slice(3,5), 16);
  const b = parseInt(hexcolor.slice(5,7), 16);
  const brightness = (r*299 + g*587 + b*114) / 1000;
  return brightness > 155 ? '#000000' : '#FFFFFF';
}

/**
 * Get label by path from labels map
 */
function getLabelByPath(path, labels) {
  let current = labels;
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    const label = current.get(segment);
    if (!label) return null;
    if (i === path.length - 1) return label;
    current = label.sublabels;
  }
  return null;
}

/**
 * Attach read-only event listeners to labels
 * Copied from labelizer/app.js lines 4118-4189 (WITHOUT delete button functionality)
 */
export function attachReadOnlyLabelEventListeners(container, labels) {
  const labelElements = container.querySelectorAll('manual_label, auto_label');
  
  labelElements.forEach(labelElement => {
    // NOTE: Delete button functionality removed for read-only view
    // In labelizer, there's a .delete-btn handler here
    
    // Get label color and style from label data
    const labelName = labelElement.getAttribute('labelName') || labelElement.getAttribute('data-label');
    const parent = labelElement.getAttribute('parent') || labelElement.getAttribute('data-parent') || '';
    
    // Define labelData outside conditional so it's accessible in onclick
    let labelData = null;
    
    if (labelName) {
      const path = parent ? [parent, labelName] : [labelName];
      labelData = getLabelByPath(path, labels);
      
      if (labelData) {
        // Apply color styling
        const bgColor = labelData.color || '#3498db';
        const textColor = getContrastColor(bgColor);
        
        labelElement.style.backgroundColor = bgColor;
        labelElement.style.color = textColor;
      }
    }

    // Click to view parameters (read-only) - using exact labelizer code
    labelElement.onclick = (e) => {
      // If there was a selection, do NOT open parameter menu
      const sel = window.getSelection();
      if (!sel.isCollapsed) {
        return;
      }
      
      e.stopPropagation();

      showParameterMenu(labelElement, labels, e.clientX, e.clientY);
    };
  });
}
