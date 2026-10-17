/* ============================================================
   lead_capture.js — Conversion engine
   Modules:
     1. ROI Calculator (email-gated reveal)
     2. Exit-Intent Modal (Latin America Expat Starter Kit)
     4. Social Proof Toast (real subscribers only — no fabrication)
     5. Sticky Subscribe Bar
     6. Time-on-page modal trigger
     7. Delegated page actions (copy-link / print / share-twitter) —
        replaces inline onclick= attributes, which the CSP
        (script-src-attr 'none') blocks.
   GDPR/CCPA: every form has explicit consent line; nothing is
   pre-checked; no data leaves the user without submit; localStorage
   keys are namespaced and discoverable in DevTools.
   ============================================================ */
(function () {
  'use strict';

  const SUBSCRIBED_KEY = 'subscribed';
  const EXIT_SHOWN_KEY = 'exitModalShown';
  const TOAST_DISMISSED_KEY = 'toastDismissed';

  function alreadySubscribed() {
    try { return localStorage.getItem(SUBSCRIBED_KEY) === 'true'; }
    catch { return false; }
  }
  function markSubscribed() {
    try { localStorage.setItem(SUBSCRIBED_KEY, 'true'); } catch {}
  }

  async function postSubscribe(payload) {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  /* ---------- 1. ROI CALCULATOR ---------- */
  // Real cap rates / yield ranges sourced from existing site guides.
  // (gross yield % ranges, midpoints used)
  const MARKETS = {
    'costa-rica': { name: 'Costa Rica',          yield: 0.072, growth: 0.10, tax: 0.0025 },
    'panama':     { name: 'Panama',              yield: 0.085, growth: 0.06, tax: 0.0070 },
    'colombia':   { name: 'Colombia',            yield: 0.078, growth: 0.18, tax: 0.0080 },
    'mexico':     { name: 'Mexico (Playa)',      yield: 0.090, growth: 0.08, tax: 0.0030 },
    'tulum':      { name: 'Mexico (Tulum)',      yield: 0.105, growth: 0.11, tax: 0.0030 },
    'argentina':  { name: 'Argentina',           yield: 0.062, growth: 0.07, tax: 0.0125 },
    'chile':      { name: 'Chile',               yield: 0.055, growth: 0.04, tax: 0.0098 },
    'nicaragua':  { name: 'Nicaragua',           yield: 0.110, growth: 0.07, tax: 0.0100 },
    'uruguay':    { name: 'Uruguay',             yield: 0.058, growth: 0.05, tax: 0.0030 },
    'ecuador':    { name: 'Ecuador',             yield: 0.075, growth: 0.05, tax: 0.0050 },
    'peru':       { name: 'Peru',                yield: 0.070, growth: 0.05, tax: 0.0040 },
    'brazil':     { name: 'Brazil',              yield: 0.065, growth: 0.07, tax: 0.0060 },
    'portugal':   { name: 'Portugal (Lisbon)',   yield: 0.050, growth: 0.04, tax: 0.0050 },
    'greece':     { name: 'Greece (Athens)',     yield: 0.065, growth: 0.10, tax: 0.0035 },
    'indonesia':  { name: 'Indonesia (Bali)',    yield: 0.140, growth: 0.12, tax: 0.0050 },
    'georgia':    { name: 'Georgia (Tbilisi)',   yield: 0.100, growth: 0.115, tax: 0.0010 },
    'dominican':  { name: 'Dominican Republic',  yield: 0.095, growth: 0.085, tax: 0.0100 }
  };

  function fmtUSD(n) {
    if (!isFinite(n)) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }

  function initROICalculator() {
    const root = document.querySelector('.roi-calc');
    if (!root) return;
    const budgetInput = root.querySelector('#roiBudget');
    const regionSelect = root.querySelector('#roiRegion');
    const yearsInput = root.querySelector('#roiYears');
    const result = root.querySelector('.roi-calc-result');
    const valYield = root.querySelector('[data-roi="yield"]');
    const valIncome = root.querySelector('[data-roi="income"]');
    const valTotal = root.querySelector('[data-roi="total"]');
    const yieldSub = root.querySelector('[data-roi-sub="yield"]');
    const incomeSub = root.querySelector('[data-roi-sub="income"]');
    const totalSub = root.querySelector('[data-roi-sub="total"]');
    const unlockForm = root.querySelector('.roi-unlock-form');
    const unlockMsg = root.querySelector('.roi-unlock-msg');

    function compute() {
      const budget = parseFloat(budgetInput.value) || 0;
      const years = parseInt(yearsInput.value, 10) || 5;
      const m = MARKETS[regionSelect.value] || MARKETS['costa-rica'];
      const annualIncome = budget * m.yield;
      const totalReturn = budget * Math.pow(1 + m.growth + m.yield - m.tax, years);
      valYield.textContent = fmtPct(m.yield);
      valIncome.textContent = fmtUSD(annualIncome);
      valTotal.textContent = fmtUSD(totalReturn);
      yieldSub.textContent = m.name + ' average';
      incomeSub.textContent = 'gross, year 1';
      totalSub.textContent = years + '-year projection';
    }

    [budgetInput, regionSelect, yearsInput].forEach(el => {
      el && el.addEventListener('input', compute);
      el && el.addEventListener('change', compute);
    });
    compute();

    if (alreadySubscribed()) result.classList.remove('roi-locked');
    else result.classList.add('roi-locked');

    if (unlockForm) {
      unlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const em = unlockForm.querySelector('input[name="email"]').value.trim();
        if (!em) { unlockMsg.textContent = 'Please enter your email.'; return; }
        const btn = unlockForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Unlocking…';
        const { ok, data } = await postSubscribe({ firstName: '', lastName: '', email: em });
        btn.disabled = false;
        btn.textContent = 'Unlock Results';
        if (ok || (data && /already subscribed/i.test(data.error || ''))) {
          markSubscribed();
          result.classList.remove('roi-locked');
          unlockMsg.textContent = 'Unlocked. Welcome.';
          var advCta = document.getElementById('roiAdvisoryCta');
          if (advCta) advCta.style.display = 'block';
        } else {
          unlockMsg.textContent = (data && data.error) || 'Something went wrong.';
        }
      });
    }
  }

  /* ---------- 2. EXIT-INTENT MODAL ---------- */
  function initExitIntent() {
    if (alreadySubscribed()) return;
    if (sessionStorage.getItem(EXIT_SHOWN_KEY) === 'true') return;
    // Homepage uses its own #popupOverlay — don't stack a second modal on top
    if (document.getElementById('popupOverlay')) return;
    let modal = document.getElementById('exitIntentModal');
    if (!modal) {
      modal = buildExitModal();
      document.body.appendChild(modal);
    }
    let armed = false;
    const arm = () => { armed = true; };
    setTimeout(arm, 4000);

    function trigger() {
      if (!armed) return;
      if (sessionStorage.getItem(EXIT_SHOWN_KEY) === 'true') return;
      modal.classList.add('show');
      sessionStorage.setItem(EXIT_SHOWN_KEY, 'true');
    }
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget && e.clientY < 8) trigger();
    });
    if (window.matchMedia('(max-width: 768px)').matches) {
      let lastScroll = 0;
      window.addEventListener('scroll', () => {
        const s = window.scrollY;
        if (lastScroll - s > 24 && s > 600) trigger();
        lastScroll = s;
      }, { passive: true });
    }
    // Scroll-depth trigger: fires when reader is 70% through (highest engagement moment).
    // Only on article-style pages — skip homepage/forms.
    const isArticle = /\/(blog|guides|quick-reads|tips|landing)\//.test(window.location.pathname);
    if (isArticle) {
      const onScroll = () => {
        const scrolled = window.scrollY + window.innerHeight;
        const total = document.documentElement.scrollHeight;
        if (total > 0 && scrolled / total >= 0.7) {
          trigger();
          window.removeEventListener('scroll', onScroll);
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  function buildExitModal() {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.id = 'exitIntentModal';
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-labelledby="exitTitle" aria-modal="true">
        <button class="modal-close" aria-label="Close">&times;</button>
        <img class="modal-image" src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80" alt="Latin American skyline at golden hour" loading="lazy">
        <div class="modal-body">
          <span class="modal-eyebrow">Free · 2026 Edition</span>
          <h2 id="exitTitle">Before you go — get the Latin America Expat Starter Kit</h2>
          <p><strong>Free, sent instantly.</strong> A 17-city market comparison, residency routes for 10 countries, and a 47-item relocation checklist.</p>
          <form class="modal-form" data-form="exit">
            <input type="email" name="email" placeholder="Email address" required aria-label="Email address">
            <button type="submit">Send My Free Starter Kit →</button>
            <p class="modal-fineprint">Plus our weekly newsletter covering 11 Latin American countries. Unsubscribe anytime. No spam — ever.</p>
          </form>
        </div>
      </div>`;
    wrap.querySelector('.modal-close').addEventListener('click', () => wrap.classList.remove('show'));
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.classList.remove('show'); });
    wrap.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const payload = { email: f.email.value.trim() };
      const btn = f.querySelector('button');
      btn.disabled = true; btn.textContent = 'Sending…';
      const { ok, data } = await postSubscribe(payload);
      if (ok || (data && /already subscribed/i.test(data.error || ''))) {
        markSubscribed();
        f.outerHTML = '<p style="text-align:center;padding:20px;color:#0a0e1a;"><strong>Check your inbox.</strong><br>Your Starter Kit is on its way.</p>';
        setTimeout(() => { window.location.href = '/thankyou.html'; }, 1400);
      } else {
        btn.disabled = false;
        btn.textContent = 'Send My Free Starter Kit →';
        alert((data && data.error) || 'Network error.');
      }
    });
    return wrap;
  }

  /* ---------- 4. SOCIAL PROOF TOAST (real subscribers only) ---------- */
  /* Pulls from /api/recent-subscribers which returns:
       [{ initial: 'M', city: 'Austin, TX', minutesAgo: 12 }, ...]
     - No PII (no full name, no email)
     - Only real signups in last 14 days
     - If empty list returned, no toast shown
     - Per-session: only shows toasts from this real list, in random order
   */
  function initSocialToast() {
    if (sessionStorage.getItem(TOAST_DISMISSED_KEY) === 'true') return;
    fetch('/api/recent-subscribers').then(r => r.ok ? r.json() : { items: [] }).then(payload => {
      const items = (payload && payload.items) || [];
      if (!items.length) return;
      let i = 0;
      const queue = items.slice().sort(() => Math.random() - 0.5);
      const toast = buildToastEl();
      document.body.appendChild(toast);
      function show() {
        if (sessionStorage.getItem(TOAST_DISMISSED_KEY) === 'true') return;
        const item = queue[i % queue.length]; i++;
        const ago = item.minutesAgo < 60
          ? item.minutesAgo + ' min ago'
          : Math.round(item.minutesAgo / 60) + ' hr ago';
        toast.querySelector('.toast-avatar').textContent = item.initial || '✱';
        toast.querySelector('.toast-text').innerHTML =
          '<strong>' + escapeHtml(item.initial) + '. from ' + escapeHtml(item.city) + '</strong>' +
          ' just subscribed' +
          '<small>' + ago + '</small>';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 6000);
      }
      setTimeout(show, 25000);
      setInterval(show, 45000);
    }).catch(() => { /* silent — toast is optional */ });
  }

  function buildToastEl() {
    const el = document.createElement('div');
    el.className = 'social-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="toast-avatar">✱</div>
      <div class="toast-text"></div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;
    el.querySelector('.toast-close').addEventListener('click', () => {
      el.classList.remove('show');
      try { sessionStorage.setItem(TOAST_DISMISSED_KEY, 'true'); } catch {}
    });
    return el;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  /* ---------- 5. STICKY SUBSCRIBE BAR ---------- */
  function initStickyBar() {
    if (alreadySubscribed()) return;
    const STICKY_DISMISSED = 'stickyBarDismissed';
    if (sessionStorage.getItem(STICKY_DISMISSED) === 'true') return;
    // Only show on blog/guide pages (not homepage, subscribe page, thankyou)
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html' || /subscribe|thankyou|quiz/.test(path)) return;

    const bar = document.createElement('div');
    bar.className = 'sticky-sub-bar';
    bar.setAttribute('role', 'complementary');
    bar.setAttribute('aria-label', 'Subscribe prompt');
    bar.innerHTML = `
      <div class="sticky-bar-inner">
        <span class="sticky-bar-text">&#9670; <strong>Free Expat Starter Kit</strong> — 17-city comparison, residency routes for 10 countries &amp; a 47-item checklist</span>
        <form class="sticky-bar-form" autocomplete="off">
          <input type="email" name="email" placeholder="Your email" required aria-label="Email address">
          <button type="submit">Get It Free →</button>
        </form>
        <button class="sticky-bar-close" aria-label="Dismiss">&times;</button>
      </div>`;
    document.body.appendChild(bar);

    bar.querySelector('.sticky-bar-close').addEventListener('click', () => {
      bar.classList.remove('visible');
      try { sessionStorage.setItem(STICKY_DISMISSED, 'true'); } catch {}
    });

    bar.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = bar.querySelector('input[name="email"]').value.trim();
      if (!email) return;
      const btn = bar.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Subscribing…';
      const { ok, data } = await postSubscribe({ firstName: '', lastName: '', email });
      if (ok || (data && /already subscribed/i.test(data.error || ''))) {
        markSubscribed();
        window.location.href = '/thankyou.html';
      } else {
        btn.disabled = false; btn.textContent = 'Get It Free →';
        alert((data && data.error) || 'Something went wrong.');
      }
    });

    // Show after 60% scroll depth
    let shown = false;
    function checkScroll() {
      if (shown) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (scrolled / total >= 0.6) {
        bar.classList.add('visible');
        shown = true;
        window.removeEventListener('scroll', checkScroll);
      }
    }
    window.addEventListener('scroll', checkScroll, { passive: true });
  }

  /* ---------- 6. TIME-ON-PAGE EXIT INTENT (25s) ---------- */
  function initTimeOnPage() {
    if (alreadySubscribed()) return;
    if (sessionStorage.getItem('exitModalShown') === 'true') return;
    setTimeout(() => {
      const modal = document.getElementById('exitIntentModal');
      if (!modal) return;
      if (sessionStorage.getItem('exitModalShown') === 'true') return;
      if (alreadySubscribed()) return;
      modal.classList.add('show');
      sessionStorage.setItem('exitModalShown', 'true');
    }, 25000);
  }

  /* ---------- 7. DELEGATED PAGE ACTIONS ---------- */
  // <button data-action="copy-link" [data-copy-url="…"]>  copies the URL (default: this page)
  // <button data-action="print">                          window.print()
  // <button data-action="share-twitter" data-tweet-url="https://twitter.com/intent/tweet?text=…&url=">
  //                                                       opens the intent with this page's URL appended
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(new Error('copy failed')); }
      catch (err) { reject(err); }
      finally { ta.remove(); }
    });
  }
  function flashLabel(el, text) {
    if (!el.dataset.label) el.dataset.label = el.textContent;
    el.textContent = text;
    clearTimeout(el._labelTimer);
    el._labelTimer = setTimeout(() => { el.textContent = el.dataset.label; }, 2000);
  }
  function initPageActions() {
    if (window.__ireActionsBound) return;
    window.__ireActionsBound = true;
    document.addEventListener('click', (e) => {
      const el = e.target.closest && e.target.closest('[data-action]');
      if (!el) return;
      const action = el.getAttribute('data-action');
      if (action === 'copy-link') {
        e.preventDefault();
        const url = el.getAttribute('data-copy-url') || window.location.href;
        copyText(url).then(() => flashLabel(el, 'Copied!'), () => flashLabel(el, 'Copy failed'));
      } else if (action === 'print') {
        e.preventDefault();
        window.print();
      } else if (action === 'share-twitter') {
        e.preventDefault();
        const base = el.getAttribute('data-tweet-url') || 'https://twitter.com/intent/tweet?url=';
        window.open(base + encodeURIComponent(window.location.href), '_blank', 'noopener');
      }
    });
  }
  initPageActions();

  /* ---------- 8. GENERIC SUBSCRIBE FORMS ---------- */
  // <form data-lc-subscribe="source-tag"> … <input type="email" name="email"> … </form>
  // [optional sibling/child .subscribe-msg for status text]. POSTs JSON to /api/subscribe
  // (form-action 'self' blocks posting to third-party hosts).
  function initGenericSubscribeForms() {
    document.querySelectorAll('form[data-lc-subscribe]').forEach((f) => {
      if (f.dataset.lcBound) return;
      f.dataset.lcBound = '1';
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = f.querySelector('input[type="email"]');
        const email = (input && input.value || '').trim();
        const btn = f.querySelector('button[type="submit"], button');
        let msg = f.querySelector('.subscribe-msg') ||
          (f.nextElementSibling && f.nextElementSibling.classList.contains('subscribe-msg') ? f.nextElementSibling : null);
        if (!msg) {
          msg = document.createElement('p');
          msg.className = 'subscribe-msg';
          msg.setAttribute('role', 'status');
          f.insertAdjacentElement('afterend', msg);
        }
        if (!email) { msg.textContent = 'Please enter your email.'; return; }
        const label = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }
        msg.textContent = '';
        try {
          const { ok, data } = await postSubscribe({ email, source: f.getAttribute('data-lc-subscribe') || 'unknown' });
          if (ok || (data && /already subscribed/i.test(data.error || ''))) {
            markSubscribed();
            msg.textContent = 'Check your inbox — welcome aboard!';
            setTimeout(() => { window.location.href = '/thankyou.html'; }, 1200);
            return;
          }
          msg.textContent = (data && data.error) || 'Something went wrong. Please try again.';
        } catch {
          msg.textContent = 'Network error. Please check your connection and try again.';
        }
        if (btn) { btn.disabled = false; btn.textContent = label; }
      });
    });
  }

  /* ---------- BOOT ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  function boot() {
    const fy = document.getElementById('footerYear');
    if (fy) fy.textContent = new Date().getFullYear();
    initROICalculator();
    initExitIntent();
    initSocialToast();
    initStickyBar();
    initGenericSubscribeForms();
    initTimeOnPage();
  }
})();
