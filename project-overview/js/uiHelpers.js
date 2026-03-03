// ============================================
// UI Helpers: Theme, Settings, Navigation
// ============================================

// ============================================
// Theme Management
// ============================================

const THEME_KEY = 'theme';

function initializeTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeToggle) themeToggle.checked = true;
  }

  if (themeToggle) {
    themeToggle.addEventListener('change', function(event) {
      if (event.target.checked) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem(THEME_KEY, 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'dark');
      }
    });
  }
}

// ============================================
// Settings Modal
// ============================================

function initializeSettingsModal() {
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsCloseBtn = document.getElementById('settings-close-btn');

  function openSettingsModal() {
    if (settingsModal) {
      settingsModal.classList.remove('hidden');
    }
  }

  function closeSettingsModal() {
    if (settingsModal) {
      settingsModal.classList.add('hidden');
    }
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }

  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', closeSettingsModal);
  }

  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', closeSettingsModal);
  }
}

// ============================================
// Fullscreen Functionality
// ============================================

function initializeFullscreen() {
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // Handle fullscreen changes
  document.addEventListener('fullscreenchange', function() {
    if (fullscreenBtn) {
      if (document.fullscreenElement) {
        fullscreenBtn.title = 'Exit Full Screen (F11 or Esc)';
      } else {
        fullscreenBtn.title = 'Full Screen (F11 or Esc to exit)';
      }
    }
  });
}

// ============================================
// Navigation and Scrolling
// ============================================

function initializeNavigation() {
  // Smooth scroll for navigation links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Update URL without scrolling
        history.pushState(null, null, `#${targetId}`);
      }
    });
  });

  // Intersection Observer for active nav highlighting
  const observerOptions = {
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, observerOptions);

  // Observe all sections
  document.querySelectorAll('.content-section[id]').forEach(section => {
    observer.observe(section);
  });

  // Set initial active state on page load
  if (window.location.hash) {
    const activeLink = document.querySelector(`.nav-link[href="${window.location.hash}"]`);
    if (activeLink) {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      activeLink.classList.add('active');
    }
  } else {
    document.querySelector('.nav-link')?.classList.add('active');
  }
}

// ============================================
// Initialize All UI Components
// ============================================

function initializeUI() {
  initializeTheme();
  initializeSettingsModal();
  initializeFullscreen();
  initializeNavigation();
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}
