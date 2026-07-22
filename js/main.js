const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('active'));
  });
}

// Sticky Header Shadow effect on scroll
const headerEl = document.querySelector('.header');
if (headerEl) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      headerEl.classList.add('scrolled');
    } else {
      headerEl.classList.remove('scrolled');
    }
  });
}

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

// ==========================================
// PORTFOLIO UX ENHANCEMENTS
// ==========================================

// Page Loader Fade Out
window.addEventListener('load', () => {
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('fade-out');
    }, 150);
  }
});

// Reusable Toast System
window.showToast = (message, type = 'info') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.classList.add('toast', `toast-${type}`);
  toast.innerText = message;
  container.appendChild(toast);

  // Trigger reflow
  toast.offsetHeight;
  toast.classList.add('is-visible');

  setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
};

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

// Toast Handlers for booking redirects
document.querySelectorAll('a[href="booking.html"]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Skip toast redirect if already on the booking page
    if (window.location.pathname.endsWith('booking.html')) {
      return;
    }
    e.preventDefault();
    window.showToast("Redirecting to booking portal...", "success");
    setTimeout(() => {
      window.location.href = btn.getAttribute('href');
    }, 700);
  });
});

// Simulated Skeleton Loading Trigger
const skeletonLoaders = document.querySelectorAll('.skeleton-onload');
if (skeletonLoaders.length > 0) {
  skeletonLoaders.forEach(el => el.classList.add('skeleton'));
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      skeletonLoaders.forEach(el => el.classList.remove('skeleton'));
    }, 750);
  });
}

// Contact Form Validation
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const subject = document.getElementById('contact-subject').value.trim();
    const inquiry = document.getElementById('contact-inquiry').value;
    const message = document.getElementById('contact-message').value.trim();
    
    // Check empty fields
    if (!name || !email || !phone || !subject || !inquiry || !message) {
      window.showToast("Please fill in all required fields.", "info");
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      window.showToast("Please enter a valid email address.", "info");
      return;
    }
    
    // Phone validation
    const phoneRegex = /^[0-9]{10,12}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-+()]/g, ''))) {
      window.showToast("Please enter a valid phone number.", "info");
      return;
    }
    
    // Success submission
    window.showToast("Message sent successfully! Our team will contact you soon.", "success");
    contactForm.reset();
  });
}


