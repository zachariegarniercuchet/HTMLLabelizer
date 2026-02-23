# Synchronized Scroll Feature

## Overview
The synchronized scroll feature allows both documents (Document A and Document B) in the comparison tool to scroll together in perfect synchronization.

## Location
The synchronized scroll functionality is implemented in:
- **Modular version**: `comparison/js/features/synchronizedScroll.js`
- **Bundled version**: `comparison/app-bundled.js` (integrated)

## Features

### Automatic Synchronization
- When enabled, scrolling in either document automatically scrolls the other
- Works in both **Rendered View** (HTML content) and **Source View** (code)
- Maintains scroll position percentages for proper alignment
- Prevents infinite scroll loops with intelligent throttling

### Toggle Controls
1. **Button**: Click the connect/disconnect icon button in the header toolbar
   - **Connected icon** (🔗): Synchronization is ON
   - **Disconnected icon** (⛓️‍💥): Synchronization is OFF
2. **Keyboard Shortcut**: Press `Ctrl+Shift+S` to toggle on/off
3. **Visual Feedback**: 
   - Active state shows blue highlight on button with connect icon
   - Inactive state shows disconnect icon
   - Toast notification appears when toggling
   - Button is disabled until both documents are loaded

### Default State
- Synchronized scrolling is **DISABLED by default**
- Automatically **ENABLES when both documents are loaded**
- Automatically **DISABLES when documents are cleared**
- Cannot be enabled manually unless both documents are loaded

## How It Works

### Scroll Calculation
The feature calculates the scroll position as a percentage:
```
scrollPercentage = scrollTop / (scrollHeight - clientHeight)
```

This percentage is then applied to the target document, ensuring proper alignment regardless of document length differences.

### Event Handling
- Listens to `scroll` events on both documents
- Uses a flag (`isScrolling`) to prevent circular event triggering
- 50ms debounce to ensure smooth performance

## API Functions

If you need to control synchronized scrolling programmatically (modular version only):

```javascript
import { 
  toggleSyncScroll, 
  enableSyncScroll, 
  disableSyncScroll,
  isSyncScrollEnabled,
  scrollBothTo,
  scrollBothToTop,
  scrollBothToBottom,
  checkAndEnableSyncButton
} from './js/features/synchronizedScroll.js';

// Toggle on/off
toggleSyncScroll();

// Explicitly enable/disable
enableSyncScroll();
disableSyncScroll();

// Check status
const isEnabled = isSyncScrollEnabled();

// Check document state and enable/disable button
checkAndEnableSyncButton();

// Programmatic scrolling
scrollBothToTop();           // Scroll both to top
scrollBothToBottom();        // Scroll both to bottom
scrollBothTo(0.5, 0);       // Scroll to 50% vertical, 0% horizontal
```

## Styling

The sync button styling is defined in `comparison/style.css`:
- `.sync-scroll-btn` - Base button styles with flexbox for icon centering
- `.sync-icon` - Icon image styling (18x18px)
- `.sync-scroll-btn.active` - Active state (blue highlight with connect icon)
- `.sync-scroll-btn:not(.active)` - Inactive state (disconnect icon)
- Theme-specific styles for light/dark modes

## Button Order in UI
The buttons in the comparison tool header are ordered as follows (left to right):
1. **Sync Scroll Toggle** (⛓️/🔗) - First position for quick access
2. **Comparison View Toggle** (⚏) - Second position
3. **IAA Analysis** - Third position
4. **Clear All** - Fourth position
5. **Settings** (⚙) - Last position

## Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Uses standard DOM scroll APIs
- No external dependencies required

## Troubleshooting

### Scrolling doesn't sync
1. Check that the button shows as "active" (blue highlight)
2. Ensure both documents are loaded
3. Try toggling off and back on with `Ctrl+Shift+S`

### One document scrolls but not the other
- This is expected if one document is shorter than visible area
- Synchronization works based on percentage, not absolute pixels

### Performance issues
- The feature uses throttling to prevent excessive calculations
- If issues persist, try disabling and re-enabling

## Future Enhancements
Possible improvements:
- Synchronized horizontal scrolling (partially implemented)
- Custom scroll ratio settings
- Synchronized selection highlighting
- Link-based navigation synchronization
