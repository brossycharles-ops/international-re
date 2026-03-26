// ===== Navbar Scroll Effect =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== Mobile Menu Toggle =====
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.querySelector('.nav-links');

mobileToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

// Close mobile menu when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
  });
});

// ===== Scroll Animations =====
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

// Add fade-in class to animatable elements
document.querySelectorAll('.market-card, .fact, .why-card, .subscribe-text, .subscribe-form-wrap').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// ===== EMAIL CAPTURE POPUP =====
const popupOverlay = document.getElementById('popupOverlay');
const popupClose = document.getElementById('popupClose');
const popupForm = document.getElementById('popupForm');
const popupSuccess = document.getElementById('popupSuccess');

// Show popup after a short delay on first visit
function showPopup() {
  // Check if user has already seen the popup this session
  if (sessionStorage.getItem('popupShown')) return;

  setTimeout(() => {
    popupOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    sessionStorage.setItem('popupShown', 'true');
  }, 1500);
}

// Close popup
function closePopup() {
  popupOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

popupClose.addEventListener('click', closePopup);

// Close on overlay click (not the popup itself)
popupOverlay.addEventListener('click', (e) => {
  if (e.target === popupOverlay) closePopup();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && popupOverlay.classList.contains('active')) {
    closePopup();
  }
});

// Popup form submission
popupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('popupFirstName').value.trim();
  const lastName = document.getElementById('popupLastName').value.trim();
  const email = document.getElementById('popupEmail').value.trim();

  if (!firstName || !lastName || !email) return;

  const btnText = popupForm.querySelector('.popup-btn-text');
  const btnLoading = popupForm.querySelector('.popup-btn-loading');
  const submitBtn = popupForm.querySelector('button[type="submit"]');

  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email })
    });

    const data = await response.json();

    if (response.ok) {
      popupForm.style.display = 'none';
      popupSuccess.style.display = 'block';
      // Also mark that they subscribed so the main form knows
      localStorage.setItem('subscribed', 'true');
      // Auto close after 3 seconds
      setTimeout(closePopup, 3000);
    } else {
      alert(data.error || 'Something went wrong. Please try again.');
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      submitBtn.disabled = false;
    }
  } catch (err) {
    alert('Network error. Please check your connection and try again.');
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    submitBtn.disabled = false;
  }
});

// Trigger popup on page load
showPopup();

// ===== Newsletter Form Submission (main page form) =====
const form = document.getElementById('subscribeForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');
const successMessage = document.getElementById('successMessage');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!firstName || !lastName || !email) return;

  // Show loading state
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email })
    });

    const data = await response.json();

    if (response.ok) {
      // Show success message
      form.style.display = 'none';
      successMessage.style.display = 'block';
      localStorage.setItem('subscribed', 'true');
    } else {
      alert(data.error || 'Something went wrong. Please try again.');
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      submitBtn.disabled = false;
    }
  } catch (err) {
    alert('Network error. Please check your connection and try again.');
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    submitBtn.disabled = false;
  }
});

// ===== Smooth Scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});
