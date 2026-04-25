/* ============================================================
   lead_capture.js — Conversion engine
   Modules:
     1. ROI Calculator (email-gated reveal)
     2. Exit-Intent Modal (real 2026 Investment Report)
     3. VIP Off-Market Gate
     4. Social Proof Toast (real subscribers only — no fabrication)
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
        const fn = unlockForm.querySelector('input[name="firstName"]').value.trim();
        const ln = unlockForm.querySelector('input[name="lastName"]').value.trim();
        const em = unlockForm.querySelector('input[name="email"]').value.trim();
        if (!fn || !ln || !em) { unlockMsg.textContent = 'Please fill in all fields.'; return; }
        const btn = unlockForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Unlocking…';
        const { ok, data } = await postSubscribe({ firstName: fn, lastName: ln, email: em });
        btn.disabled = false;
        btn.textContent = 'Unlock Results';
        if (ok || (data && /already subscribed/i.test(data.error || ''))) {
          markSubscribed();
          result.classList.remove('roi-locked');
          unlockMsg.textContent = 'Unlocked. Welcome.';
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
    let modal = document.getElementById('exitIntentModal');
    if (!modal) {
      modal = buildExitModal();
      document.body.appendChild(modal);
    }
    let armed = false;
    const arm = () => { armed = true; };
    setTimeout(arm, 8000);

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
          <span class="modal-eyebrow">Free PDF · 38 pages</span>
          <h2 id="exitTitle">Get the 2026 Global Investment Report</h2>
          <p>Live price, yield and growth data for 11 Latin American markets. Sent to your inbox in seconds.</p>
          <form class="modal-form" data-form="exit">
            <input type="text" name="firstName" placeholder="First name" required>
            <input type="text" name="lastName" placeholder="Last name" required>
            <input type="email" name="email" placeholder="Email address" required>
            <button type="submit">Send Me the Report</button>
            <p class="modal-fineprint">By submitting you agree to receive the report and our weekly newsletter. Unsubscribe anytime. We never share your data.</p>
          </form>
        </div>
      </div>`;
    wrap.querySelector('.modal-close').addEventListener('click', () => wrap.classList.remove('show'));
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.classList.remove('show'); });
    wrap.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const payload = {
        firstName: f.firstName.value.trim(),
        lastName: f.lastName.value.trim(),
        email: f.email.value.trim()
      };
      const btn = f.querySelector('button');
      btn.disabled = true; btn.textContent = 'Sending…';
      const { ok, data } = await postSubscribe(payload);
      if (ok || (data && /already subscribed/i.test(data.error || ''))) {
        markSubscribed();
        f.outerHTML = '<p style="text-align:center;padding:20px;color:#0a0e1a;"><strong>Check your inbox.</strong><br>The report is on its way.</p>';
        setTimeout(() => wrap.classList.remove('show'), 2200);
        // Open the report in a new tab so they can read it now too
        window.open('/reports/2026-global-investment-report.html', '_blank');
      } else {
        btn.disabled = false;
        btn.textContent = 'Send Me the Report';
        alert((data && data.error) || 'Network error.');
      }
    });
    return wrap;
  }

  /* ---------- 3. VIP OFF-MARKET GATE ---------- */
  function initVIP() {
    const section = document.querySelector('.vip-section');
    if (!section) return;
    const listings = section.querySelector('.vip-listings');
    if (!listings) return;
    if (alreadySubscribed()) listings.classList.remove('vip-locked');
    else listings.classList.add('vip-locked');
    const form = section.querySelector('.vip-gate-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fn = form.querySelector('input[name="firstName"]').value.trim();
      const ln = form.querySelector('input[name="lastName"]').value.trim();
      const em = form.querySelector('input[name="email"]').value.trim();
      if (!fn || !ln || !em) return;
      const btn = form.querySelector('button');
      btn.disabled = true; btn.textContent = 'Verifying…';
      const { ok, data } = await postSubscribe({ firstName: fn, lastName: ln, email: em });
      if (ok || (data && /already subscribed/i.test(data.error || ''))) {
        markSubscribed();
        listings.classList.remove('vip-locked');
        btn.textContent = 'Unlocked';
      } else {
        btn.disabled = false;
        btn.textContent = 'Verify Email';
        alert((data && data.error) || 'Network error.');
      }
    });
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

  /* ---------- BOOT ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  function boot() {
    initROICalculator();
    initExitIntent();
    initVIP();
    initSocialToast();
  }
})();
