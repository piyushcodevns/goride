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
    toast.textContent = message;
    container.appendChild(toast);

    toast.offsetHeight; // Force reflow
    toast.classList.add('is-visible');

    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };
}
if (!window.showToast) {
  window.showToast = window.GoRide.showToast;
}

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Menu Toggle (Mobile Drawer)
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const navButtons = document.querySelector('.nav-buttons');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      if (navButtons) navButtons.classList.toggle('active');
      const expanded = navLinks.classList.contains('active');
      menuToggle.setAttribute('aria-expanded', expanded);
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        if (navButtons) navButtons.classList.remove('active');
      });
    });

    if (navButtons) {
      navButtons.querySelectorAll('a, button').forEach((btn) => {
        btn.addEventListener('click', () => {
          navLinks.classList.remove('active');
          navButtons.classList.remove('active');
        });
      });
    }
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
});

// Page Loader Fade Out
window.addEventListener('load', () => {
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('fade-out');
    }, 150);
  }
});

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
