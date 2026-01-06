// Theme Control Component
// Handles theme toggle, contrast, and background warmth

import { domElements } from '../core/domElements.js';
import { setCurrentTheme } from '../core/state.js';
import { saveTheme, loadTheme, saveContrast, loadContrast, saveBackgroundWarmth, loadBackgroundWarmth, resetAllSettings } from '../utils/storage.js';

// Track current warmth value
let currentBackgroundWarmth = 50;

export function initializeThemeControl() {
  setupThemeToggle();
  setupContrastControl();
  setupBackgroundWarmthControl();
  setupResetButton();
  
  // Load saved settings
  loadSavedSettings();
}

function setupThemeToggle() {
  const { themeToggle } = domElements;
  
  themeToggle?.addEventListener('change', (e) => {
    applyTheme(e.target.checked ? 'light' : 'dark');
  });
}

function setupContrastControl() {
  const { contrastSlider } = domElements;
  
  contrastSlider?.addEventListener('input', (e) => {
    applyContrast(e.target.value);
  });
}

function setupBackgroundWarmthControl() {
  const { backgroundSlider } = domElements;
  
  backgroundSlider?.addEventListener('input', (e) => {
    applyBackgroundWarmth(e.target.value);
  });
}

function setupResetButton() {
  const { resetSettingsBtn, contrastSlider, backgroundSlider } = domElements;
  
  resetSettingsBtn?.addEventListener('click', () => {
    applyTheme('light');
    if (contrastSlider) contrastSlider.value = 100;
    applyContrast(100);
    if (backgroundSlider) backgroundSlider.value = 50;
    applyBackgroundWarmth(50);
    resetAllSettings();
  });
}

function loadSavedSettings() {
  const { contrastSlider, backgroundSlider } = domElements;
  
  // Load theme
  const savedTheme = loadTheme();
  applyTheme(savedTheme);
  
  // Load contrast
  const savedContrast = loadContrast();
  if (contrastSlider) {
    contrastSlider.value = savedContrast;
  }
  applyContrast(savedContrast);
  
  // Load background warmth
  const savedWarmth = loadBackgroundWarmth();
  if (backgroundSlider) {
    backgroundSlider.value = savedWarmth;
  }
  applyBackgroundWarmth(savedWarmth);
}

export function applyTheme(theme) {
  const { themeToggle } = domElements;
  
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeToggle) themeToggle.checked = true;
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (themeToggle) themeToggle.checked = false;
  }
  
  setCurrentTheme(theme);
  saveTheme(theme);
  
  // Reapply background warmth for the new theme
  applyBackgroundWarmth(currentBackgroundWarmth);
}

export function applyContrast(value) {
  const { contrastPreview } = domElements;
  const opacity = value / 100;
  
  document.documentElement.style.setProperty('--contrast-opacity', opacity);
  saveContrast(value);
  
  // Update preview text
  if (contrastPreview) {
    const percentage = Math.round(opacity * 100);
    contrastPreview.textContent = `Text visibility: ${percentage}% - This is how your text will appear`;
    contrastPreview.style.color = `rgba(var(--text-rgb), ${opacity})`;
  }
}

export function applyBackgroundWarmth(value) {
  const { backgroundPreview } = domElements;
  const root = document.documentElement;
  const warmth = value;
  const currentTheme = root.getAttribute('data-theme');
  
  // Store current warmth value
  currentBackgroundWarmth = warmth;
  saveBackgroundWarmth(warmth);
  
  if (currentTheme === 'light') {
    // Light theme: 0 = cool white, 100 = warm grey
    const intensity = warmth / 100;
    const baseR = 245 - (intensity * 30);  // 245 to 215 (warmer)
    const baseG = 247 - (intensity * 25);  // 247 to 222
    const baseB = 250 - (intensity * 35);  // 250 to 215 (less blue, more warm)
    
    root.style.setProperty('--bg-custom', `rgb(${Math.round(baseR)}, ${Math.round(baseG)}, ${Math.round(baseB)})`);
    root.style.setProperty('--bg', 'var(--bg-custom)');
    
    // Also update HTML content background for light theme to be more grey/warm
    const contentR = 255 - (intensity * 50);  // 255 to 205 (more noticeable change)
    const contentG = 255 - (intensity * 45);  // 255 to 210
    const contentB = 255 - (intensity * 55);  // 255 to 200 (warmer, less blue)
    
    root.style.setProperty('--html-content-bg', `rgb(${Math.round(contentR)}, ${Math.round(contentG)}, ${Math.round(contentB)})`);
  } else {
    // Dark theme: 0 = very dark, 100 = lighter/warmer dark
    const intensity = warmth / 100;
    const baseR = 11 + (intensity * 20);  // 11 to 31
    const baseG = 16 + (intensity * 25);  // 16 to 41  
    const baseB = 32 + (intensity * 30);  // 32 to 62
    
    root.style.setProperty('--bg-custom', `rgb(${Math.round(baseR)}, ${Math.round(baseG)}, ${Math.round(baseB)})`);
    root.style.setProperty('--bg', 'var(--bg-custom)');
    
    // Don't set --html-content-bg in dark theme, let it use --bg from CSS
    // Remove any lingering --html-content-bg from light mode
    root.style.removeProperty('--html-content-bg');
  }
  
  // Update preview
  if (backgroundPreview) {
    const intensity = warmth / 100;
    let tone = 'Neutral';
    if (warmth < 40) tone = 'Cool';
    else if (warmth > 60) tone = 'Warm';
    backgroundPreview.textContent = `Background: ${Math.round(warmth)}% - ${tone}`;
    
    // Update preview background color
    if (currentTheme === 'light') {
      const r = 245 - (intensity * 30);
      const g = 247 - (intensity * 25);
      const b = 250 - (intensity * 35);
      backgroundPreview.style.background = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    } else {
      const r = 11 + (intensity * 20);
      const g = 16 + (intensity * 25);
      const b = 32 + (intensity * 30);
      backgroundPreview.style.background = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }
  }
}
