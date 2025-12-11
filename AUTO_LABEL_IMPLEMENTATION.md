# Auto Label Support - Implementation Summary

## Overview
The HTML Labelizer application now supports both `manual_label` (human-created) and `auto_label` (machine-generated) elements with identical functionality.

## Changes Made

### 1. Query Updates (15+ locations)
All `querySelectorAll('manual_label')` calls have been updated to:
```javascript
querySelectorAll('manual_label, auto_label')
```

This ensures both label types are detected and processed everywhere in the application.

### 2. Label Extraction
The `extractExistingLabels()` function now:
- Detects both `manual_label` and `auto_label` elements in HTML documents
- Extracts the label schema from both types
- Builds the label tree from existing elements if no schema comment is found
- Logs information about detected auto labels

### 3. Event Handlers
Updated event listeners to work with both label types:
- Click handlers for parameter editing
- Delete button functionality
- Group management
- Parameter synchronization
- Search and navigation

### 4. Validation & Selection
Updated selection validation to recognize both label types:
- Boundary crossing detection
- Tag balance checking
- Multi-selection compatibility
- Context detection

### 5. Statistics & Display
Updated all UI components:
- Label counts now include both types
- Group displays work with both types
- Tree visualization supports both types
- Search highlighting works with both types

## Behavior

### When Loading Documents
- Documents with `auto_label` elements are automatically detected
- Labels are extracted and added to the label tree
- All auto labels become editable just like manual labels

### When Creating Labels
- User-created labels remain as `manual_label` (no change to existing behavior)
- This preserves the distinction between human and machine annotations in the raw HTML

### When Editing
- Both `manual_label` and `auto_label` can be:
  - Clicked to edit parameters
  - Deleted using the delete button
  - Included in groups
  - Searched and navigated
  - Exported in the final HTML

## Testing

A test file has been created: `test/test_auto_labels.html`

This file contains:
- Auto-generated labels (simulating ML model output)
- Manual labels (simulating human annotations)
- Mixed content with both types
- Unlabeled text for testing new annotations

### How to Test
1. Open the application in your browser
2. Load `test/test_auto_labels.html`
3. Verify that all labels appear in the label tree
4. Click on auto labels to edit their parameters
5. Delete some auto labels and verify they can be removed
6. Add new manual labels to unlabeled text
7. Export the document and verify both label types are preserved

## Technical Notes

### Attribute Consistency
The application uses these attributes for both label types:
- `labelName`: The name of the label
- `parent`: The parent label path (for nested labels)
- `color`: The label color
- Parameters: Any additional attributes defined in the schema

### CSS Styling
You may want to add CSS to visually distinguish auto labels from manual labels:
```css
auto_label {
  opacity: 0.85; /* Slightly dimmed */
  border-bottom: 1px dashed; /* Dashed underline for auto labels */
}

manual_label {
  border-bottom: 1px solid; /* Solid underline for manual labels */
}
```

### Future Enhancements
Possible improvements:
- Add a visual indicator (badge/icon) to distinguish auto from manual labels
- Add bulk operations to convert auto labels to manual labels (after verification)
- Add confidence scores for auto labels
- Filter view to show only manual or only auto labels
- Statistics showing manual vs auto label counts

## Backwards Compatibility
✅ Fully backwards compatible:
- Documents with only `manual_label` elements work exactly as before
- The schema format remains unchanged
- No breaking changes to the API or user interface

## Files Modified
- `app.js`: Updated all label queries, event handlers, and processing functions (15+ updates)
- Added test file: `test/test_auto_labels.html`
