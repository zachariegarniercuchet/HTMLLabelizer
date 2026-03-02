/**
 * Demo Mode Module for HTML Labelizer
 * 
 * This module handles the initialization and management of demo mode,
 * which loads pre-configured sample data to showcase the tool's capabilities.
 * 
 * Demo mode is activated when the URL contains the parameter: ?demo=true
 */

(() => {
  'use strict';

  /**
   * Check if demo mode is active based on URL parameters
   * @returns {boolean} True if demo mode is enabled
   */
  function isDemoMode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('demo') === 'true';
  }

  /**
   * Initialize demo mode by loading sample data
   * This function waits for the main app to be ready before proceeding
   */
  function initializeDemoMode() {
    if (!isDemoMode()) {
      console.log('Demo mode not active');
      return;
    }

console.log('🎬 Demo mode activated - Loading sample data...');

    // Add visual indicator that this is demo mode
    addDemoIndicator();

    // Wait for the app to be ready and then load demo data
    // We need to wait because app.js needs to define all its functions first
    const maxAttempts = 50;
    let attempts = 0;

    function tryLoadDemoData() {
      attempts++;
      
      // Check if required app functions are available
      if (typeof window.currentHtml !== 'undefined' && 
          typeof window.labels !== 'undefined' &&
          typeof window.meta !== 'undefined') {
        
        loadDemoData();
      } else if (attempts < maxAttempts) {
        setTimeout(tryLoadDemoData, 100);
      } else {
        console.error('Could not load demo data - app not ready');
      }
    }

    // Start trying to load demo data
    setTimeout(tryLoadDemoData, 500);
  }

  /**
   * Add a visual indicator showing that demo mode is active
   */
  function addDemoIndicator() {
    const header = document.querySelector('.app-header');
    if (!header) return;

    const indicator = document.createElement('div');
    indicator.className = 'demo-indicator';
    indicator.innerHTML = `
      <span class="demo-badge">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-3H7V4h2v6z"/>
        </svg>
        Demo Mode
      </span>
      <button class="exit-demo-btn" onclick="window.location.href='index.html'" title="Exit demo and start fresh">
        Exit Demo
      </button>
    `;

    // Insert after the brand
    const brand = header.querySelector('.brand');
    if (brand) {
      brand.after(indicator);
    } else {
      header.insertBefore(indicator, header.firstChild);
    }

    // Add styles
    addDemoStyles();
  }

  /**
   * Add CSS styles for demo mode UI elements
   */
  function addDemoStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .demo-indicator {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 12px;
        background: linear-gradient(135deg, rgba(32, 201, 151, 0.15), rgba(106, 163, 255, 0.15));
        border: 1px solid rgba(32, 201, 151, 0.3);
        border-radius: 8px;
        margin-left: 16px;
        animation: demo-pulse 2s ease-in-out infinite;
      }

      @keyframes demo-pulse {
        0%, 100% { 
          box-shadow: 0 0 0 0 rgba(32, 201, 151, 0.4);
        }
        50% { 
          box-shadow: 0 0 0 8px rgba(32, 201, 151, 0);
        }
      }

      .demo-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #20c997;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .demo-badge svg {
        animation: rotate 2s linear infinite;
      }

      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .exit-demo-btn {
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        color: #e7ecff !important;
        padding: 4px 10px !important;
        border-radius: 6px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        box-shadow: none !important;
      }

      .exit-demo-btn:hover {
        background: rgba(255, 107, 107, 0.2) !important;
        border-color: rgba(255, 107, 107, 0.5) !important;
        color: #ff6b6b !important;
        transform: translateY(-1px) !important;
        filter: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Load demo data into the application
   */
  function loadDemoData() {
    try {
      if (typeof DEMO_DATA === 'undefined') {
        console.error('Demo data not available - make sure demo-data.js is loaded');
        return;
      }

      console.log('📄 Loading demo document...');

      // Set the HTML content and filename
      window.currentHtml = DEMO_DATA.html;
      window.currentFileName = DEMO_DATA.fileName;

      // Update filename display
      const filenameElement = document.getElementById('current-filename');
      if (filenameElement) {
        filenameElement.textContent = DEMO_DATA.fileName;
      }

      // Extract labels from the HTML schema comment
      // This will rebuild the label tree and load metadata
      if (typeof window.extractExistingLabels === 'function') {
        window.extractExistingLabels(DEMO_DATA.html);
      }

      // Render the HTML content
      // This will display the labeled content and attach event listeners
      if (typeof window.renderHtmlContent === 'function') {
        window.renderHtmlContent();
      }

      // Enable buttons that are initially disabled
      enableUIControls();

      console.log('✅ Demo data loaded successfully!');
      
      // Show a brief welcome message
      showWelcomeMessage();

    } catch (error) {
      console.error('Error loading demo data:', error);
    }
  }

  /**
   * Parse demo HTML content and render it
   * @deprecated - Now using window.extractExistingLabels and window.renderHtmlContent
   */
  function parseAndRenderDemoContent() {
    // This function is kept for backwards compatibility but is no longer used
    // The functionality is now handled by extractExistingLabels and renderHtmlContent
  }

  /**
   * Rebuild label structure from parsed JSON
   * @deprecated - Now using window.extractExistingLabels
   */
  function rebuildLabelStructure(labelData) {
    // This function is kept for backwards compatibility but is no longer used
    // The functionality is now handled by extractExistingLabels
  }

  /**
   * Enable UI controls that are initially disabled
   */
  function enableUIControls() {
    const controlIds = [
      'download-html',
      'save-as',
      'stats-btn',
      'meta-info-btn',
      'view-toggle',
      'toggle-timer'
    ];

    controlIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.disabled = false;
      }
    });
  }

  /**
   * Show a welcome message for demo mode
   */
  function showWelcomeMessage() {
    // Create a temporary toast notification
    const toast = document.createElement('div');
    toast.className = 'demo-welcome-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <h3>� Welcome to Demo Mode</h3>
        <p>Explore a Cannes Film Festival report with movie and series annotations.</p>
        <p><strong>Try:</strong> Click on labeled films, expand the label tree, or modify parameters!</p>
      </div>
    `;

    document.body.appendChild(toast);

    // Add toast styles
    const style = document.createElement('style');
    style.textContent = `
      .demo-welcome-toast {
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: linear-gradient(135deg, #11182d, #1a2238);
        border: 1px solid #6aa3ff;
        border-radius: 12px;
        padding: 20px;
        max-width: 400px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        animation: slideInUp 0.5s ease-out, fadeOut 0.5s ease-in 4.5s;
        z-index: 10000;
      }

      .demo-welcome-toast .toast-content h3 {
        margin: 0 0 10px 0;
        color: #20c997;
        font-size: 18px;
        font-weight: 600;
      }

      .demo-welcome-toast .toast-content p {
        margin: 8px 0;
        color: #e7ecff;
        font-size: 14px;
        line-height: 1.5;
      }

      .demo-welcome-toast .toast-content strong {
        color: #6aa3ff;
      }

      @keyframes slideInUp {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    // Remove toast after 5 seconds
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  // Initialize demo mode when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDemoMode);
  } else {
    initializeDemoMode();
  }

  console.log('Demo module loaded');
})();
