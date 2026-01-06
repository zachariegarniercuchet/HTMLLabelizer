// LocalStorage Utility Functions
// Handles saving and loading settings from localStorage

export function saveTheme(theme) {
  localStorage.setItem('theme', theme);
}

export function loadTheme() {
  return localStorage.getItem('theme') || 'light';
}

export function saveContrast(value) {
  localStorage.setItem('contrast', value);
}

export function loadContrast() {
  return localStorage.getItem('contrast') || '100';
}

export function saveBackgroundWarmth(value) {
  localStorage.setItem('backgroundWarmth', value);
}

export function loadBackgroundWarmth() {
  return localStorage.getItem('backgroundWarmth') || '50';
}

export function resetAllSettings() {
  localStorage.setItem('theme', 'light');
  localStorage.setItem('contrast', '100');
  localStorage.setItem('backgroundWarmth', '50');
}
