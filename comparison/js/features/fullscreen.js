// Fullscreen functionality
import { domElements } from '../core/domElements.js';

export function initializeFullscreen() {
  const { fullscreenBtn } = domElements;
  
  if (!fullscreenBtn) return;

  // Full screen button event listener
  fullscreenBtn.addEventListener('click', () => {
    const elem = document.documentElement;
    
    // Toggle fullscreen
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      // Enter fullscreen
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) { // Safari
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { // Safari
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { // IE11
        document.msExitFullscreen();
      }
    }
  });

  // Update fullscreen button icon based on fullscreen state
  function updateFullscreenIcon() {
    if (fullscreenBtn) {
      const icon = fullscreenBtn.querySelector('.fullscreen-icon');
      if (icon) {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          icon.src = '../assets/icons-exit-full-screen.png';
          fullscreenBtn.title = 'Exit Full Screen (Esc)';
        } else {
          icon.src = '../assets/icons-full-screen.png';
          fullscreenBtn.title = 'Full Screen (F11 or Esc to exit)';
        }
      }
    }
  }

  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon); // Safari
}
