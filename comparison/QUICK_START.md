# Quick Start - Comparison Tool

## ✅ You're Ready to Go!

The comparison tool is now **100% client-side** and works without any server!

## How to Use

1. **Open the tool:**
   - Simply double-click `index.html` 
   - Or right-click → Open with → Your browser

2. **Load documents:**
   - Click "Upload an HTML File" or drag & drop HTML files
   - Load one file in Document A and another in Document B

3. **Explore features:**
   - Click labels to view their parameters
   - Toggle between rendered and source views
   - View label statistics

## What Changed

### ✅ Now Works Without Server
- All JavaScript bundled into `app-bundled.js`
- No more CORS errors
- No need for Node.js or Python (unless you need IAA analysis)

### ⚠️ IAA Analysis Limitation
The IAA (Inter-Annotator Agreement) analysis button will show a message explaining that this feature requires a Python backend server. All other features work perfectly without a server.

## Troubleshooting

**Q: I see "CORS" errors**
A: You're probably still loading an old cached version. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

**Q: Nothing happens when I click buttons**
A: Check the browser console (F12) for errors. Make sure you're opening the `comparison/index.html` file.

**Q: I need IAA analysis**
A: See the main README.md for server setup instructions.

## Files Overview

- `index.html` - Main page (this is what you open)
- `app-bundled.js` - All JavaScript code (no server needed)
- `style.css` - Styles
- `js/` - Original source modules (you can ignore this)

Enjoy! 🎉
