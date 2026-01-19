# HTML Labelizer - Comparison Tool

## Overview

The Comparison Tool allows you to load and compare two annotated HTML documents side-by-side. This version is **100% client-side** and runs directly in your browser without requiring any server.

## Features

- ✅ **Side-by-side document comparison**
- ✅ **Load annotated HTML files** via drag & drop or file selection
- ✅ **View rendered HTML or source code**
- ✅ **Label statistics** for each document
- ✅ **Theme customization** (light/dark mode, contrast, background warmth)
- ✅ **Read-only label parameter viewing**
- ⚠️ **IAA Analysis requires server** (see below)

## Usage

1. **Open the tool**: Simply open `index.html` in your web browser (double-click the file or use File > Open)
2. **Load documents**: 
   - Click "Upload an HTML File" in Document A or Document B panels
   - Or drag & drop HTML files onto the panels
3. **View labels**: Click on any label to view its parameters in a read-only popup
4. **Toggle views**: Use "View Source" / "View Rendered" buttons to switch between views
5. **View statistics**: Click the statistics icon to see label counts and distribution

## Limitations (Client-Side Version)

### IAA Analysis Not Available

The **Inter-Annotator Agreement (IAA) analysis** feature requires a Python backend server to calculate agreement statistics. When you click the "IAA Analysis" button, you'll see a message explaining this limitation.

To enable IAA analysis, you need to:
1. Install Python dependencies: `pip install -r requirements.txt`
2. Set up and run the backend server (see Server Setup section below)
3. Access the tool via `http://localhost:3000/comparison/`

## Server Setup (Optional - For IAA Analysis Only)

If you need IAA analysis capabilities:

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run a local server:**
   You need a web server that can handle the `/api/iaa` endpoint.
   
3. **Access via server:**
   Open `http://localhost:YOUR_PORT/comparison/index.html`

## Files

- `index.html` - Main HTML interface
- `app-bundled.js` - All JavaScript bundled in one file (no modules, no CORS issues)
- `style.css` - Comparison-specific styles
- `js/` - Original modular JavaScript source (not used in client-side version)
- `iaa_analysis.py` - Python script for IAA calculation (server only)
- `label_matcher.py` - Python script for label matching (server only)

## Troubleshooting

### File won't open
- Make sure you're opening `index.html` directly in your browser
- Modern browsers should handle local files without issues

### Labels not showing colors
- Check that your HTML files have the label schema embedded in comments
- The schema should start with `<!-- HTMLLabelizer {...} -->`

### JavaScript errors in console
- This is normal if you're trying to access IAA analysis without a server
- All other features should work fine

## Technical Notes

This version uses a bundled JavaScript file (`app-bundled.js`) instead of ES6 modules to avoid CORS restrictions when opening files directly via the `file://` protocol. The bundled version wraps all code in an IIFE (Immediately Invoked Function Expression) to prevent global namespace pollution while maintaining full functionality.
