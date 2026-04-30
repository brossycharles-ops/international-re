// ===== Live Subscriber Count =====
const subscriberCountEl = document.getElementById('subscriberCount');
if (subscriberCountEl) {
  fetch('/api/subscriber-count')
    .then(res => res.json())
    .then(data => {
      if (data.count > 0) {
        subscriberCountEl.textContent = data.count + '+';
      }
    })
    .catch(() => {});
}

// ===== Navbar Scroll Effect =====
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ===== Mobile Menu Toggle =====
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.querySelector('.nav-links');

if (mobileToggle && navLinks) {
  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
    });
  });
}

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

if (popupOverlay && popupClose && popupForm) {
  function showPopup() {
    if (localStorage.getItem('subscribed')) return;
    if (sessionStorage.getItem('popupShown')) return;
    setTimeout(() => {
      if (sessionStorage.getItem('popupShown')) return;
      popupOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      sessionStorage.setItem('popupShown', 'true');
    }, 8000);
  }

  function closePopup() {
    popupOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  popupClose.addEventListener('click', closePopup);
  popupOverlay.addEventListener('click', (e) => {
    if (e.target === popupOverlay) closePopup();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popupOverlay.classList.contains('active')) closePopup();
  });

  popupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('popupFirstName').value.trim();
    const lastName = document.getElementById('popupLastName').value.trim();
    const email = document.getElementById('popupEmail').value.trim();
    if (!email) return;
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
        body: JSON.stringify({ firstName, lastName, email, source: 'homepage-popup' })
      });
      const data = await response.json();
      if (response.ok || /already subscribed/i.test(data.error || '')) {
        localStorage.setItem('subscribed', 'true');
        window.location.href = '/thankyou.html';
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
      }
    } catch {
      alert('Network error. Please check your connection and try again.');
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      submitBtn.disabled = false;
    }
  });

  showPopup();
}

// ===== Newsletter Form Submission (main page form) =====
const form = document.getElementById('subscribeForm');
const submitBtnEl = document.getElementById('submitBtn');

if (form && submitBtnEl) {
  const btnText = submitBtnEl.querySelector('.btn-text');
  const btnLoading = submitBtnEl.querySelector('.btn-loading');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    if (!email) return;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtnEl.disabled = true;
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, source: 'homepage-main-form' })
      });
      const data = await response.json();
      if (response.ok || /already subscribed/i.test(data.error || '')) {
        localStorage.setItem('subscribed', 'true');
        window.location.href = '/thankyou.html';
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtnEl.disabled = false;
      }
    } catch {
      alert('Network error. Please check your connection and try again.');
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      submitBtnEl.disabled = false;
    }
  });
}

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

// ===== Sticky CTA Bar =====
const stickyCta = document.getElementById('stickyCta');
const heroSection = document.querySelector('.hero');
const subscribeSection = document.getElementById('subscribe');

if (stickyCta && heroSection && subscribeSection) {
  window.addEventListener('scroll', () => {
    const heroBottom = heroSection.getBoundingClientRect().bottom;
    const subscribeTop = subscribeSection.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;
    stickyCta.classList.toggle('visible', heroBottom < 0 && subscribeTop > windowHeight);
  });
  const stickyBtn = stickyCta.querySelector('a');
  if (stickyBtn) stickyBtn.addEventListener('click', () => stickyCta.classList.remove('visible'));
}

// ===== Exit Intent Popup (homepage only) =====
if (popupOverlay) {
  let exitIntentShown = false;
  document.addEventListener('mouseout', (e) => {
    if (e.clientY < 5 && !exitIntentShown && !localStorage.getItem('subscribed') && !popupOverlay.classList.contains('active')) {
      popupOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      sessionStorage.setItem('popupShown', 'true');
      exitIntentShown = true;
    }
  });
}

// ===== Parallax Hero =====
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const heroImg = document.querySelector('.hero-img');
  if (heroImg && scrolled < window.innerHeight) {
    heroImg.style.transform = `translateY(${scrolled * 0.3}px)`;
  }
});

// ===== Animated Counter for Stats =====
const statNums = document.querySelectorAll('.stat-num');
let statsAnimated = false;

function animateStats() {
  if (statsAnimated) return;
  const heroStats = document.querySelector('.hero-stats');
  if (!heroStats) return;

  const rect = heroStats.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    statsAnimated = true;
    statNums.forEach(el => {
      const text = el.textContent;
      const num = parseInt(text);
      if (isNaN(num)) return;

      const suffix = text.replace(num.toString(), '');
      let current = 0;
      const step = Math.ceil(num / 40);
      const timer = setInterval(() => {
        current += step;
        if (current >= num) {
          current = num;
          clearInterval(timer);
        }
        el.textContent = current + suffix;
      }, 30);
    });
  }
}

window.addEventListener('scroll', animateStats);
animateStats();

// ===== Gallery items fade in on scroll =====
const galleryItems = document.querySelectorAll('.gallery-item');
const galleryObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, index * 80);
      galleryObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

galleryItems.forEach(item => {
  item.style.opacity = '0';
  item.style.transform = 'translateY(30px)';
  item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  galleryObserver.observe(item);
});
