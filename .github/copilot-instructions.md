# HTML Labelizer - AI Coding Assistant Guide

## Project Overview

HTML Labelizer is a client-side web application for semantic annotation of HTML documents. Users create hierarchical label schemas, apply labels to text selections, and export annotated HTML with embedded metadata.

## Architecture & Core Patterns

### Modular ES6 Structure
- **Root entry**: `app.js` (legacy) vs `js/core/app.js` (modular) - check which is active in `index.html`
- **State management**: Centralized in `js/core/state.js` with explicit setter functions (can't modify imported `let` variables directly)
- **Import pattern**: All modules import from specific paths, never relative imports like `../../../`

### Label Data Model
Labels are stored as nested `Map` objects with this structure:
```javascript
// In js/core/state.js
const labels = new Map(); // name -> labelObject

// Label object structure from js/components/labelManager.js
{
  name: string,
  color: string,
  type: "structured",
  params: Map, // parameter definitions
  sublabels: Map, // nested labels
  groupConfig?: { groupIdAttribute, groupAttributes }
}
```

### HTML Persistence Pattern
- **Schema storage**: Labels saved as `<!-- HTMLLabelizer {json} -->` comments before `<head>`
- **Applied labels**: Use `<manual_label>` custom elements with attributes
- **Bidirectional sync**: Parse comments on load, regenerate on save

## Key Development Workflows

### Adding New Features
1. **State changes**: Add to `js/core/state.js` with setters
2. **DOM elements**: Reference in `js/core/domElements.js`
3. **UI components**: Create in `js/components/`
4. **Event handlers**: Add to `js/events/eventHandlers.js`
5. **Import chains**: Update `js/core/app.js` imports

### Working with Labels
- **Create**: Use `createLabel()` from `labelManager.js`
- **Navigate tree**: Use `getLabelByPath(pathArray)` 
- **UI updates**: Always call `refreshTreeUI()` after label changes
- **Parameter types**: `string`, `dropdown` (with options array), `checkbox`

### HTML Processing
- **Source ↔ Rendered views**: Synchronized scrolling via `scrollUtils.js` position mapping
- **Label extraction**: `extractExistingLabels()` rebuilds state from HTML comments
- **DOM manipulation**: All labeled elements get delete buttons and parameter click handlers

## Project-Specific Conventions

### File Naming & Organization
- **Utilities**: Pure functions in `js/utils/`
- **Components**: UI-focused modules in `js/components/`
- **Features**: Complex business logic in `js/features/`
- **State**: Never mutate imported variables directly - use setters

### CSS Architecture
- **CSS Variables**: Dark theme defined in `:root` with `--bg`, `--card`, etc.
- **Component classes**: `.tree-node`, `.param-gold`, `.group-section`
- **State classes**: `.expanded/.collapsed`, `.selected`, `.editing`

### Event Handling Patterns
- **Text selection**: Custom selection handling for label application
- **Context menus**: Positioned absolutely with viewport boundary detection
- **Inline editors**: Created dynamically, appended to tree containers
- **Parameter suggestions**: Autocomplete based on existing label attributes

## Integration Points & Data Flow

### File Operations
- **Upload**: Parse HTML → extract schema → rebuild UI state
- **Download**: Generate schema comment → inject into HTML → download
- **Drag & drop**: Handled via `drop-zone` with file validation

### Multi-View Synchronization
- **Source view**: Direct HTML editing with change detection (`sourceViewModified` flag)
- **Rendered view**: DOM manipulation with labeled elements
- **Scroll sync**: `mapRenderedToSource()` and `mapSourceToRendered()` maintain position

### Label Application Flow
1. User selects text → `showContextMenu()`
2. Choose label → `applyLabelToSelection()`  
3. Wrap in `<manual_label>` → preserve formatting
4. Update statistics → attach event listeners

## Critical Implementation Details

### State Management Gotchas
```javascript
// ❌ Wrong - can't modify imported let variables
import { currentHtml } from '../core/state.js';
currentHtml = newValue;

// ✅ Correct - use setter functions
import { setCurrentHtml } from '../core/state.js';
setCurrentHtml(newValue);
```

### Parameter Type Handling
```javascript
// Parameter definitions support three types:
{
  type: "string", 
  default: "value"
}
{
  type: "dropdown",
  options: ["opt1", "opt2"],
  default: "opt1"  
}
{
  type: "checkbox",
  default: true
}
```

### Testing & Validation
- **Test files**: Located in `test/` directory with sample HTML files
- **No unit tests**: Direct browser testing with `index.html`
- **Validation**: HTML parsing via `DOMParser` for syntax checking

## Common Tasks

**Add new label parameter type**: Extend type checks in `parameterMenu.js` and `contextMenu.js`
**Implement new UI component**: Create in `js/components/`, export functions, import in `app.js`
**Modify label schema**: Update `createLabel()` in `labelManager.js` and persistence logic in `htmlProcessor.js`
**Add keyboard shortcuts**: Extend handlers in `eventHandlers.js`

The codebase follows a clear separation of concerns with explicit module boundaries - respect the existing import patterns and state management approach when extending functionality.