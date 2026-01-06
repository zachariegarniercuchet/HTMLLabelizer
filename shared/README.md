# Shared CSS Components

This folder contains common CSS components shared across the HTML Labelizer project.

## File Structure

### `common.css`
- **Purpose**: Core theme variables, global resets, and utilities
- **Contains**:
  - CSS variables (colors, spacing, shadows)
  - Light/Dark theme definitions
  - Global reset styles
  - Text contrast control
  - Utility classes (.hidden, responsive breakpoints)

### `header.css`
- **Purpose**: Application header component
- **Contains**:
  - .app-header - sticky header bar
  - .brand - logo and title section
  - .controls - header button container
  - .file-input - file upload wrapper

### `buttons.css`
- **Purpose**: All button styles and states
- **Contains**:
  - Base button styles
  - Light/Dark theme button variations
  - Special buttons (settings, clear, apply, etc.)
  - Disabled button states
  - Header-specific button styles

### `cards.css`
- **Purpose**: Card component layouts
- **Contains**:
  - .card - main card container
  - .card-header - card title area
  - .card-body - card content area
  - Title and filename styling

### `drop-zone.css`
- **Purpose**: HTML content display and file drop zones
- **Contains**:
  - .html-content - HTML display area
  - .empty-state - placeholder when no content loaded
  - .drop-zone - drag-and-drop file area
  - Upload link styles
  - Light/Dark theme variations

### `settings-modal.css`
- **Purpose**: Settings modal dialog
- **Contains**:
  - .settings-modal - modal overlay and container
  - Theme toggle switch
  - Contrast and background sliders
  - Reset button
  - All modal animations

### `statistics.css`
- **Purpose**: Statistics display components
- **Contains**:
  - .stats-grid - statistics grid layout
  - .stat-item - individual stat card
  - .stat-number and .stat-label styling

## Usage

To use these shared styles in your project, include them in your HTML:

```html
<!-- Shared Styles -->
<link rel="stylesheet" href="../shared/common.css">
<link rel="stylesheet" href="../shared/header.css">
<link rel="stylesheet" href="../shared/buttons.css">
<link rel="stylesheet" href="../shared/cards.css">
<link rel="stylesheet" href="../shared/drop-zone.css">
<link rel="stylesheet" href="../shared/settings-modal.css">
<link rel="stylesheet" href="../shared/statistics.css">
<!-- Project-Specific Styles -->
<link rel="stylesheet" href="style.css">
```

## Benefits

1. **DRY Principle**: No code duplication between labelizer and comparison tools
2. **Maintainability**: Changes to shared components update both tools
3. **Consistency**: Ensures identical styling across all tools
4. **Organization**: Clear separation of concerns
5. **Reusability**: Easy to add new tools using the same components

## Adding New Components

When creating new shared components:

1. Create a new CSS file in `/shared/` with a descriptive name
2. Add clear comments documenting the component's purpose
3. Include only styles that will be shared across multiple tools
4. Update this README with the new component documentation
5. Add the stylesheet link to relevant tool HTML files

## Tool-Specific Styles

Each tool (labelizer, comparison) should have its own `style.css` for:
- Layout specific to that tool
- Features unique to that tool
- Custom components not shared with other tools

This keeps shared components truly generic and reusable.
