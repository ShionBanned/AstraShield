// =========================================================================
// AstraShield Ultra - Overlay Hunter & DOM Purger (ISOLATED World)
// =========================================================================
(function() {
  'use strict';

  // Check state from storage
  chrome.storage.local.get(['globalEnabled', 'pausedDomains', 'shields'], data => {
    const globalEnabled = data.globalEnabled !== false;
    const pausedDomains = Array.isArray(data.pausedDomains) ? data.pausedDomains : [];
    const currentHost = window.location.hostname;
    const isPaused = !globalEnabled || pausedDomains.some(d => currentHost === d || currentHost.endsWith('.' + d));

    if (isPaused) {
      if (document.documentElement) {
        document.documentElement.dataset.astraShieldPaused = 'true';
      }
      console.log('[AstraShield] Shield is PAUSED for', currentHost);
      return;
    }

    const shields = data.shields || {
      popups: true,
      cosmetic: true
    };

    // 1. INVISIBLE OVERLAY & CLICKJACK HUNTER
    function purgeClickjackOverlays() {
      if (!shields.popups) return;
      const candidates = document.querySelectorAll('div, a, span, section');
      const viewportArea = window.innerWidth * window.innerHeight;

      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        if (el === document.body || el === document.documentElement) continue;

        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'absolute') {
          const zIndex = parseInt(style.zIndex, 10);
          if (zIndex >= 99) {
            const rect = el.getBoundingClientRect();
            const area = rect.width * rect.height;
            const isMassive = area > (viewportArea * 0.4);
            const isTransparent = parseFloat(style.opacity) < 0.1 || style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent';

            if (isMassive && isTransparent) {
              if (!el.querySelector('nav, header, form, input')) {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('pointer-events', 'none', 'important');
                console.warn('[AstraShield] Destroyed full-page clickjack overlay:', el);
              }
            }
          }
        }
      }
    }

    // 2. DOWNLOAD BUTTON SENTINEL
    const DOWNLOAD_REGEX = /(?:download|descargar|descarga|magnet|torrent|enlace|direct|ver\s+v[ií]deo)/i;

    function protectDownloadButtons() {
      if (!shields.popups) return;
      const clickables = document.querySelectorAll('a, button, input[type="submit"], input[type="button"]');
      for (let i = 0; i < clickables.length; i++) {
        const el = clickables[i];
        const text = (el.textContent || el.value || '').trim();

        if (DOWNLOAD_REGEX.test(text)) {
          if (!el.dataset.astraProtected) {
            el.dataset.astraProtected = 'true';
            if (el.tagName === 'A' && el.href) {
              el.dataset.originalHref = el.href;
              if (el.getAttribute('target') === '_blank' && !el.href.includes(window.location.hostname)) {
                el.addEventListener('mousedown', function(e) {
                  if (el.href !== el.dataset.originalHref && !el.href.includes(window.location.hostname)) {
                    console.warn('[AstraShield] Restored hijacked download button:', el.dataset.originalHref);
                    el.href = el.dataset.originalHref;
                  }
                }, true);
              }
            }
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
      if (!shields.cosmetic) return;
      try {
        const elements = root.querySelectorAll(fullSelector);
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('height', '0px', 'important');
          el.style.setProperty('min-height', '0px', 'important');
          el.style.setProperty('margin', '0px', 'important');
          el.style.setProperty('padding', '0px', 'important');
        }
      } catch (e) {}
    }

    // 4. PERIODIC & MUTATION OBSERVER DEFENSE
    function runDefensePass() {
      purgeAds();
      purgeClickjackOverlays();
      protectDownloadButtons();
    }

    runDefensePass();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runDefensePass);
    }

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          runDefensePass();
          scheduled = false;
        });
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false
    });
  });
})();