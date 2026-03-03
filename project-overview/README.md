# Project Overview Tool

## Overview

The Project Overview tool provides comprehensive project management and monitoring capabilities for annotation workflows. It allows users to track annotation progress, analyze statistics, and evaluate inter-annotator agreement across entire annotation projects.

## Required Folder Structure

To use this tool, your annotation project must follow this structure:

```
Project Root/
├── Original/           # Original documents (with or without label schema)
├── Annotated/          # Final annotated documents
└── IAA_Experiments/    # Inter-annotator agreement experiments
    ├── document1/      # Subfolder per document
    │   ├── annotator1.html
    │   ├── annotator2.html
    │   └── ...
    └── document2/
        └── ...
```

### Folder Descriptions

- **Original**: Contains the source documents. These may already include a label schema embedded in HTML comments, or they may be plain HTML files.

- **Annotated**: Contains the final, completed annotated versions of documents. These files should include the finished metadata indicating completion status.

- **IAA_Experiments**: Contains subfolders named after each document. Each subfolder contains multiple annotated versions of the same document by different annotators, used for calculating inter-annotator agreement metrics.

## Features

### 1. Annotation State
- **Project Progress**: Overall completion percentage based on finished metadata
- **Document Status**: List of all documents with their annotation status
- **Annotator Contributions**: Visual breakdown of who annotated which documents
  - Shows percentage contributed by each annotator
  - Highlights unannotated documents

### 2. Label & Time Statistics
- **Label Distribution**: Visualization of label usage across all annotated documents
- **Time Statistics**: Time metrics for annotation workflows
- **Hierarchical Label Breakdown**: Detailed statistics for each label in the schema
  - Assumes all documents share the same label schema

### 3. Document Classification
- **Metadata-based Organization**: Group documents by classification metadata
- **Classification Statistics**: Statistics broken down by metadata categories
  - Example: If metadata includes "court" field, show statistics per court

### 4. Inter-Annotator Agreement (IAA)
- **Agreement Metrics**: Overall IAA scores across the project
- **Per-Document Analysis**: IAA scores for each document with multiple annotations
- **Detailed Comparison**: In-depth analysis of annotator disagreements

## Technical Architecture

### File Structure

```
project-overview/
├── index.html              # Main HTML with inline CSS and JavaScript
├── style.css               # (Optional) External CSS for future refactoring
├── README.md               # Documentation
└── js/                     # (Optional) External JS for future refactoring
    ├── core/
    │   └── app.js
    ├── settings/
    │   ├── theme.js
    │   └── modal.js
    └── features/
        └── folderSelection.js
```

**Note**: The application currently uses inline CSS and JavaScript (like the main index.html and docs pages) to avoid CORS issues when opening the file directly in a browser. The external CSS and JS files are available for future modularization if a development server is used.

### Current Implementation Status

**Phase 1: Skeleton (Completed)**
- [x] HTML structure with 4 main sections
- [x] Styling matching project aesthetic
- [x] Folder selection interface
- [x] Basic JavaScript architecture

**Phase 2: Data Loading (To Be Implemented)**
- [ ] Load documents from Original folder
- [ ] Load annotated documents from Annotated folder
- [ ] Load IAA experiments from IAA_Experiments folder
- [ ] Parse label schemas and metadata

**Phase 3: Statistics & Visualization (To Be Implemented)**
- [ ] Calculate annotation progress
- [ ] Generate label distribution statistics
- [ ] Process time metadata
- [ ] Implement classification views
- [ ] Calculate IAA metrics

## Browser Compatibility

This tool uses the File System Access API for folder selection. It requires:
- Chrome 86+
- Edge 86+
- Opera 72+

Note: Firefox and Safari do not currently support this API.

## Usage

1. Click "Select Project Folder" button
2. Choose a folder containing the required structure
3. The tool will validate the folder structure
4. Once validated, all four sections will populate with project data

## Code Organization

The JavaScript code is organized into modular files for better maintainability:

```
js/
├── utils.js            # File parsing utilities (parseHTMLMetadata, readFilesFromFolder)
├── annotationState.js  # Section 1 logic (progress bar, pie chart, document list)
├── uiHelpers.js        # UI components (theme, settings, navigation, fullscreen)
└── app.js              # Main orchestration (folder selection, initialization)
```

### Why No ES6 Modules?
The tool uses regular `<script>` tags instead of ES6 modules to avoid CORS issues when running locally with the `file://` protocol. This keeps the application 100% client-side with zero server requirements.

### Load Order
Scripts are loaded in dependency order:
1. **utils.js** - Core utilities (no dependencies)
2. **annotationState.js** - Uses utilities
3. **uiHelpers.js** - Independent UI management
4. **app.js** - Orchestrates everything

### Adding New Sections
To add a new section (e.g., Label Statistics):
1. Create `js/labelStatistics.js` with `async function loadLabelStatistics(projectFolderHandle)`
2. Add `<script src="js/labelStatistics.js"></script>` in index.html
3. Call from `loadProjectData()` in app.js

## Future Enhancements

- Export reports as PDF or HTML
- Customizable metadata fields
- Real-time collaboration features
- Automatic backup and versioning
- Advanced IAA metrics (Krippendorff's alpha, Fleiss' kappa)
- Keyboard shortcuts and accessibility improvements
