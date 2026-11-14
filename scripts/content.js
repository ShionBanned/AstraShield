// =========================================================================
// AstraShield Ultra - Overlay Hunter & DOM Purger (ISOLATED World)
// =========================================================================
(function() {
  'use strict';

  const SESSION_CACHE_KEY = '__astrashield_cfg__';
  const currentHost = (window.location.hostname || '').toLowerCase().replace(/^www\./, '');

  let state = {
    isPaused: false,
    shields: {
      youtube: true,
      popups: true,
      stealth: true,
      cosmetic: true
    }
  };

  function isHostPaused(host, pausedDomains) {
    if (!host || !Array.isArray(pausedDomains)) return false;
    return pausedDomains.some(raw => {
      const d = String(raw || '').trim().toLowerCase().replace(/^www\./, '');
      return d && (host === d || host.endsWith('.' + d));
    });
  }

  function syncStateToPage(newState) {
    state = newState;
    const root = document.documentElement;
    if (root) {
      root.dataset.astraPaused = String(state.isPaused);
      root.dataset.astraShieldPaused = String(state.isPaused);
      root.dataset.astraYoutube = String(state.shields.youtube !== false);
      root.dataset.astraPopups = String(state.shields.popups !== false);
      root.dataset.astraStealth = String(state.shields.stealth !== false);
      root.dataset.astraCosmetic = String(state.shields.cosmetic !== false);
    }

    try {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(state));
    } catch (_) {}

    try {
      window.dispatchEvent(
        new CustomEvent('astrashield:state', {
          detail: JSON.stringify(state)
        })
      );
    } catch (_) {}

    if (state.isPaused || !state.shields.cosmetic) {
      restoreCosmeticElements();
    }
    if (state.isPaused || !state.shields.popups) {
      restoreNeutralizedOverlays();
    }
  }

  // 1. INVISIBLE OVERLAY & CLICKJACK HUNTER
  const PROTECTED_INTERACTIVE_SELECTOR = [
    'nav', 'header', 'main', 'footer', 'form', 'input', 'button', 'select',
    'textarea', 'video', 'audio', 'canvas', 'dialog', 'ytd-app', '#movie_player',
    '[role="dialog"]', '[role="menu"]', '[role="navigation"]', '[role="listbox"]',
    '[contenteditable="true"]'
  ].join(', ');

  function isSuspiciousOverlayElement(el, viewportArea) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (el.dataset && el.dataset.astraNeutralized === 'true') return false;

    const tag = el.tagName;
    if (tag !== 'DIV' && tag !== 'A' && tag !== 'SPAN' && tag !== 'SECTION' && tag !== 'IFRAME') {
      return false;
    }

    // Never touch elements containing real interactive UI, players, or visible text
    if (el.querySelector && el.querySelector(PROTECTED_INTERACTIVE_SELECTOR)) {
      return false;
    }
    const visibleText = (el.innerText || '').trim();
    if (visibleText.length > 0) {
      return false;
    }

    const style = window.getComputedStyle(el);
    if (style.position !== 'fixed' && style.position !== 'absolute') return false;
    if (style.pointerEvents === 'none' || style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    const zIndex = parseInt(style.zIndex, 10);
    const minZIndex = tag === 'A' ? 50 : 999;
    if (isNaN(zIndex) || zIndex < minZIndex) return false;

    const rect = el.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area < viewportArea * 0.45) return false;

    const opacity = parseFloat(style.opacity);
    const bg = style.backgroundColor || '';
    const hasNoBgImage = !style.backgroundImage || style.backgroundImage === 'none';
    const hasNoBackdrop = (!style.backdropFilter || style.backdropFilter === 'none') &&
                          (!style.webkitBackdropFilter || style.webkitBackdropFilter === 'none');
    const isTransparent =
      opacity < 0.05 ||
      ((bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && hasNoBgImage && hasNoBackdrop);

    return isTransparent;
  }

  function neutralizeOverlay(el) {
    el.dataset.astraNeutralized = 'true';
    el.dataset.astraPrevDisplay = el.style.getPropertyValue('display') || '';
    el.dataset.astraPrevPointer = el.style.getPropertyValue('pointer-events') || '';
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
  }

  function restoreNeutralizedOverlays() {
    const els = document.querySelectorAll('[data-astra-neutralized="true"]');
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (el.dataset.astraPrevDisplay) {
        el.style.setProperty('display', el.dataset.astraPrevDisplay);
      } else {
        el.style.removeProperty('display');
      }
      if (el.dataset.astraPrevPointer) {
        el.style.setProperty('pointer-events', el.dataset.astraPrevPointer);
      } else {
        el.style.removeProperty('pointer-events');
      }
      delete el.dataset.astraNeutralized;
      delete el.dataset.astraPrevDisplay;
      delete el.dataset.astraPrevPointer;
    }
  }

  function purgeClickjackOverlays() {
    if (state.isPaused || !state.shields.popups || !document.body) return;
    const viewportArea = window.innerWidth * window.innerHeight;
    if (viewportArea <= 0) return;

    const candidates = document.querySelectorAll(
      'body > div, body > a, body > span, body > section, body > iframe, a[target="_blank"]'
    );

    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (isSuspiciousOverlayElement(el, viewportArea)) {
        neutralizeOverlay(el);
      }
    }
  }

  // Intercept clicks directly on invisible overlays in capture phase
  window.addEventListener('pointerdown', function(e) {
    if (state.isPaused || !state.shields.popups) return;
    const target = e.target;
    if (target && target instanceof Element) {
      const viewportArea = window.innerWidth * window.innerHeight;
      if (isSuspiciousOverlayElement(target, viewportArea)) {
        neutralizeOverlay(target);
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);

  // 2. DOWNLOAD BUTTON SENTINEL
  const DOWNLOAD_REGEX = /(?:download|descargar|descarga|magnet|torrent|enlace|direct|ver\s+v[ií]deo)/i;

  function isSameOrSubdomain(hrefStr) {
    try {
      const u = new URL(hrefStr, window.location.href);
      const targetHost = u.hostname.toLowerCase().replace(/^www\./, '');
      return !targetHost || targetHost === currentHost || targetHost.endsWith('.' + currentHost);
    } catch (_) {
      return true;
    }
  }

  function protectDownloadButtons() {
    if (state.isPaused || !state.shields.popups) return;
    const clickables = document.querySelectorAll('a[href], button, input[type="submit"], input[type="button"]');
    for (let i = 0; i < clickables.length; i++) {
      const el = clickables[i];
      if (el.dataset.astraProtected === 'true') continue;

      const text = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim();
      if (DOWNLOAD_REGEX.test(text)) {
        el.dataset.astraProtected = 'true';
        if (el.tagName === 'A' && el.href) {
          el.dataset.originalHref = el.href;
          const restoreHref = function() {
            if (state.isPaused || !state.shields.popups) return;
            const orig = el.dataset.originalHref;
            if (orig && el.href !== orig && !isSameOrSubdomain(el.href)) {
              el.href = orig;
            }
          };
          el.addEventListener('pointerdown', restoreHref, true);
          el.addEventListener('mousedown', restoreHref, true);
          el.addEventListener('click', restoreHref, true);
        }
      }
    }
  }

  // 3. COSMETIC PURGE (Ads, Banners, Sponsored widgets)
  const AD_SELECTORS = [
    'ins.adsbygoogle',
    '[id^="google_ads_iframe"]',
    '[id*="taboola"]',
    '[id*="outbrain"]',
    '.ad-container',
    '.ad-banner',
    '.advertisement',
    '.ad_unit',
    '.ad-wrapper',
    '.adsbox',
    '.popunder',
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="adsterra"]',
    'iframe[src*="exoclick"]',
    'div[data-adunit]',
    'div[data-google-query-id]'
  ];
  const fullSelector = AD_SELECTORS.join(', ');

  function purgeAds(root = document) {
    if (state.isPaused || !state.shields.cosmetic) return;
    try {
      const elements = root.querySelectorAll(fullSelector);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.dataset.astraHidden === 'true') continue;
        el.dataset.astraHidden = 'true';
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('height', '0px', 'important');
        el.style.setProperty('min-height', '0px', 'important');
        el.style.setProperty('margin', '0px', 'important');
        el.style.setProperty('padding', '0px', 'important');
      }
    } catch (_) {}
  }

  function restoreCosmeticElements() {
    const hidden = document.querySelectorAll('[data-astra-hidden="true"]');
    for (let i = 0; i < hidden.length; i++) {
      const el = hidden[i];
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('height');
      el.style.removeProperty('min-height');
      el.style.removeProperty('margin');
      el.style.removeProperty('padding');
      delete el.dataset.astraHidden;
    }
  }

  // 4. THROTTLED & MUTATION OBSERVER DEFENSE
  let lastOverlayScan = 0;
  function runDefensePass(forceOverlayScan = false) {
    if (state.isPaused) return;
    purgeAds();
    protectDownloadButtons();
    const now = Date.now();
    if (forceOverlayScan || now - lastOverlayScan > 600) {
      lastOverlayScan = now;
      purgeClickjackOverlays();
    }
  }

  let observerStarted = false;
  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;

    runDefensePass(true);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => runDefensePass(true), { once: true });
    }

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (state.isPaused) return;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          runDefensePass(false);
          scheduled = false;
        });
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }
  }

  function loadAndApplyStorage() {
    chrome.storage.local.get(['globalEnabled', 'pausedDomains', 'shields'], data => {
      const globalEnabled = data.globalEnabled !== false;
      const pausedDomains = Array.isArray(data.pausedDomains) ? data.pausedDomains : [];
      const isPaused = !globalEnabled || isHostPaused(currentHost, pausedDomains);
      const shields = {
        youtube: true,
        popups: true,
        stealth: true,
        cosmetic: true,
        ...(data.shields && typeof data.shields === 'object' ? data.shields : {})
      };

      syncStateToPage({ isPaused, shields });
      if (!isPaused) {
        startObserver();
        runDefensePass(true);
      }
    });
  }

  loadAndApplyStorage();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.globalEnabled || changes.pausedDomains || changes.shields)) {
      loadAndApplyStorage();
    }
  });
})();