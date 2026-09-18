"use strict";

// Establish the global namespace safely without clobbering
window.GoRide = window.GoRide || {};
window.GoRide.utils = window.GoRide.utils || {};
window.GoRide.config = window.GoRide.config || {};

// Reusable Toast System (fallback if helpers.js / toast.js not yet loaded)
if (!window.GoRide.showToast) {
  window.GoRide.showToast = (message, type = 'info') => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSymbol = 'ℹ';
    if (type === 'success') iconSymbol = '✓';
    else if (type === 'error') iconSymbol = '✕';
    else if (type === 'warning') iconSymbol = '⚠';

    let cleanText = typeof message === 'string' ? message.replace(/^[✓✔✕✖ℹ⚠]\s*/, '') : String(message || '');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = iconSymbol;

    const textSpan = document.createElement('span');
    textSpan.className = 'toast-text';
    textSpan.textContent = cleanText;

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);
    container.appendChild(toast);

    toast.offsetHeight; // Force reflow
    toast.classList.add('is-visible');

    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  };
}
if (!window.showToast) {
  window.showToast = window.GoRide.showToast;
}

function initMain() {
  // Navigation Menu Toggle (Mobile Drawer)
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const navButtons = document.querySelector('.nav-buttons');

  if (menuToggle && navLinks && !menuToggle.dataset.navInitialized) {
    menuToggle.dataset.navInitialized = 'true';
    // Ensure mobile backdrop exists in DOM
    let navBackdrop = document.querySelector('.nav-backdrop');
    if (!navBackdrop) {
      navBackdrop = document.createElement('div');
      navBackdrop.className = 'nav-backdrop';
      navBackdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(navBackdrop);
    }

    const closeNavDrawer = () => {
      navLinks.classList.remove('active');
      if (navButtons) navButtons.classList.remove('active');
      if (navBackdrop) navBackdrop.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    };

    const openNavDrawer = () => {
      navLinks.classList.add('active');
      if (navButtons) navButtons.classList.add('active');
      if (navBackdrop) navBackdrop.classList.add('active');
      menuToggle.setAttribute('aria-expanded', 'true');
    };

    menuToggle.setAttribute('aria-expanded', 'false');

    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = navLinks.classList.contains('active');
      if (isExpanded) {
        closeNavDrawer();
      } else {
        openNavDrawer();
      }
    });

    // Close on backdrop click
    if (navBackdrop) {
      navBackdrop.addEventListener('click', closeNavDrawer);
    }

    // Close on navigation clicks
    navLinks.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        closeNavDrawer();
      }
    });

    if (navButtons) {
      navButtons.addEventListener('click', (e) => {
        if (e.target.closest('a, button')) {
          closeNavDrawer();
        }
      });
    }

    // Close on Escape key press and return focus to toggle
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        closeNavDrawer();
        menuToggle.focus();
      }
    });
  }

  // FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const button = item.querySelector('.faq-question');
    if (!button) return;

    const toggleFaq = () => {
      const isOpen = item.classList.contains('is-open');

      faqItems.forEach((entry) => {
        entry.classList.remove('is-open');
        const entryButton = entry.querySelector('.faq-question');
        if (entryButton) {
          entryButton.setAttribute('aria-expanded', 'false');
        }
      });

      if (!isOpen) {
        item.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
      }
    };

    button.addEventListener('click', toggleFaq);
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleFaq();
      }
    });
  });

  // Dynamic Navbar Auth Sync fallback if helpers.js not loaded
  const token = localStorage.getItem('goride_token');
  if (token && (!window.GoRide.ui || !window.GoRide.ui.updateNavbar)) {
    const loginBtns = document.querySelectorAll('a.login-btn[href="login.html"]');
    loginBtns.forEach(btn => {
      btn.href = 'profile.html';
      btn.textContent = 'Profile';
    });
  }

  // Sticky / Glass Header Scroll Effect
  const header = document.querySelector('.header');
  if (header) {
    const handleHeaderScroll = () => {
      if (window.scrollY > 15) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    handleHeaderScroll(); // Initialize on page load
  }

  // Scroll to Top Button
  const scrollTopBtn = document.getElementById('backToTop');
  if (scrollTopBtn) {
    let scrollThrottle = false;
    window.addEventListener('scroll', () => {
      if (!scrollThrottle) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 400) {
            scrollTopBtn.classList.add('is-visible');
          } else {
            scrollTopBtn.classList.remove('is-visible');
          }
          scrollThrottle = false;
        });
        scrollThrottle = true;
      }
    });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMain);
} else {
  initMain();
}

// Page Loader Fade Out
function dismissLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('fade-out');
    }, 150);
  }
}

if (document.readyState === 'complete') {
  dismissLoader();
} else {
  window.addEventListener('load', dismissLoader);
}
