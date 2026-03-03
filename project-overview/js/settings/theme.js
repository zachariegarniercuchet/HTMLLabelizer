// Theme Management

const THEME_KEY = 'theme';

/**
 * Initialize theme based on saved preference
 */
export function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const themeToggle = document.getElementById('theme-toggle');
  
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeToggle) themeToggle.checked = true;
  }
  
  if (themeToggle) {
    themeToggle.addEventListener('change', handleThemeChange);
  }
}

/**
 * Handle theme toggle change
 */
function handleThemeChange(event) {
  if (event.target.checked) {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem(THEME_KEY, 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'dark');
  }
}
