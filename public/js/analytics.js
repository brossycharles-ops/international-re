(function () {
  'use strict';

  function track(event, props) {
    try {
      if (typeof window.plausible === 'function') {
        window.plausible(event, { props: props });
      }
    } catch (e) { /* analytics must never break the page */ }
  }

  function getUTMParams() {
    var params = {};
    try {
      var search = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
        var v = search.get(k);
        if (v) params[k] = v;
      });
    } catch (e) {}
    return params;
  }

  function injectUTMFields(form) {
    var utm = getUTMParams();
    Object.keys(utm).forEach(function (k) {
      if (form.querySelector('input[name="' + k + '"]')) return;
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = k;
      hidden.value = utm[k];
      form.appendChild(hidden);
    });
  }

  function initSubscribeTracking() {
    document.querySelectorAll('form').forEach(function (form) {
      injectUTMFields(form);

      form.addEventListener('submit', function () {
        var location = detectFormLocation(form);
        track('Subscribe Click', { location: location });
      });
    });

    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href*="subscribe"], a[href*="#subscribe"], a[href*="free-guide"]');
      if (link) {
        var loc = detectCTALocation(link);
        track('Subscribe Click', { location: loc });
      }
    });
  }

  function detectFormLocation(form) {
    if (form.id === 'roiUnlockForm') return 'roi-gate';
    if (form.closest('.vip-section')) return 'vip';
    if (form.closest('.popup-overlay') || form.closest('.modal-backdrop')) return 'modal';
    if (form.closest('.subscribe-section') || form.id === 'subscribeForm') return 'footer';
    if (form.closest('.hero') || form.closest('.guide-hero')) return 'hero';
    if (form.closest('.sticky-sub-bar') || form.closest('.sticky-cta')) return 'sticky';
    if (form.closest('.blog-inline-cta')) return 'blog-inline';
    if (form.dataset && form.dataset.source) return form.dataset.source;
    return 'other';
  }

  function detectCTALocation(link) {
    if (link.closest('.hero')) return 'hero';
    if (link.closest('.sticky-cta')) return 'sticky';
    if (link.closest('nav')) return 'nav';
    if (link.closest('.footer')) return 'footer';
    return 'other';
  }

  function initROITracking() {
    var budgetInput = document.getElementById('roiBudget');
    var regionSelect = document.getElementById('roiRegion');
    if (!budgetInput || !regionSelect) return;

    var started = false;
    function markStarted() {
      if (started) return;
      started = true;
      track('ROI Calc Started');
    }
    budgetInput.addEventListener('input', markStarted);
    regionSelect.addEventListener('change', markStarted);

    var unlockForm = document.getElementById('roiUnlockForm');
    if (unlockForm) {
      unlockForm.addEventListener('submit', function () {
        track('ROI Calc Email Submitted', { market: regionSelect.value });
      });
    }
  }

  function initAdvisoryTracking() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href*="advisory"]');
      if (!link) return;
      var location = 'other';
      if (link.closest('.roi-section') || link.closest('.roi-calc')) location = 'roi-results';
      else if (link.closest('.vip-section')) location = 'vip';
      else if (link.closest('nav')) location = 'nav';
      else if (link.closest('.ty-page')) location = 'thankyou';
      track('Advisory CTA Click', { location: location });
    });

    var advisoryForm = document.getElementById('advisoryForm');
    if (advisoryForm) {
      advisoryForm.addEventListener('focus', function () {
        track('Advisory Form Started');
      }, { once: true, capture: true });

      advisoryForm.addEventListener('submit', function () {
        var tier = advisoryForm.querySelector('[name="tier"]');
        var budget = advisoryForm.querySelector('[name="budget"]');
        track('Advisory Form Submitted', {
          tier: tier ? tier.value : '',
          budget: budget ? budget.value : ''
        });
      });
    }
  }

  function initContentTracking() {
    if (!document.querySelector('.blog-post, .blog-post-body')) return;

    var slug = window.location.pathname.split('/').pop().replace('.html', '');
    var milestones = { 50: false, 75: false, 100: false };

    function checkScroll() {
      var scrolled = window.scrollY + window.innerHeight;
      var total = document.documentElement.scrollHeight;
      var pct = Math.round((scrolled / total) * 100);

      [50, 75, 100].forEach(function (m) {
        if (pct >= m && !milestones[m]) {
          milestones[m] = true;
          track('Blog Post Read', { post: slug, percent: m });
        }
      });
    }

    window.addEventListener('scroll', checkScroll, { passive: true });
  }

  function initOutboundTracking() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="http"]');
      if (!link) return;
      if (link.hostname === window.location.hostname) return;
      track('Outbound Link', { url: link.href });
    });
  }

  function boot() {
    initSubscribeTracking();
    initROITracking();
    initAdvisoryTracking();
    initContentTracking();
    initOutboundTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
