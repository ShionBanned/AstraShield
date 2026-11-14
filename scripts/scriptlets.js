// =========================================================================
// AstraShield Ultra - Stealth, Anti-Popup & YouTube Ad Shield (MAIN World)
// =========================================================================
(function() {
  'use strict';

  function isShieldPaused() {
    return document.documentElement && document.documentElement.dataset.astraShieldPaused === 'true';
  }

  // 1. STEALTH CLOAK: Native Function .toString() Deception
  const cloakedFunctions = new WeakMap();
  const originalFunctionToString = Function.prototype.toString;

  function cloakFunction(proxyFn, originalName = '') {
    cloakedFunctions.set(proxyFn, `function ${originalName}() { [native code] }`);
    return proxyFn;
  }

  Function.prototype.toString = new Proxy(originalFunctionToString, {
    apply(target, thisArg, args) {
      if (typeof thisArg === 'function' && cloakedFunctions.has(thisArg)) {
        return cloakedFunctions.get(thisArg);
      }
      return Reflect.apply(target, thisArg, args);
    }
  });
  cloakedFunctions.set(Function.prototype.toString, 'function toString() { [native code] }');

  // 2. ANTI-ADBLOCK BAIT DECEPTION (Indetectabilidad)
  const BAIT_PATTERNS = /(?:adsbox|ad-tester|adblock-test|banner-ad|ad-banner|google_ads|adsbygoogle|ad-placement)/i;

  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = new Proxy(originalGetComputedStyle, {
    apply(target, thisArg, args) {
      if (isShieldPaused()) return Reflect.apply(target, thisArg, args);
      const el = args[0];
      const style = Reflect.apply(target, thisArg, args);
      if (el && (BAIT_PATTERNS.test(el.id || '') || BAIT_PATTERNS.test(el.className || ''))) {
        return new Proxy(style, {
          get(sTarget, prop) {
            if (prop === 'display') return 'block';
            if (prop === 'visibility') return 'visible';
            if (prop === 'opacity') return '1';
            if (prop === 'height') return '150px';
            if (prop === 'width') return '300px';
            return Reflect.get(sTarget, prop);
          }
        });
      }
      return style;
    }
  });
  cloakFunction(window.getComputedStyle, 'getComputedStyle');

  // OffsetHeight/OffsetWidth bait interception
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

  if (originalOffsetHeight && originalOffsetHeight.get) {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      get: cloakFunction(function() {
        const val = originalOffsetHeight.get.call(this);
        if (!isShieldPaused() && val === 0 && (BAIT_PATTERNS.test(this.id || '') || BAIT_PATTERNS.test(this.className || ''))) {
          return 150;
        }
        return val;
      }, 'get offsetHeight'),
      configurable: true
    });
  }

  if (originalOffsetWidth && originalOffsetWidth.get) {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      get: cloakFunction(function() {
        const val = originalOffsetWidth.get.call(this);
        if (!isShieldPaused() && val === 0 && (BAIT_PATTERNS.test(this.id || '') || BAIT_PATTERNS.test(this.className || ''))) {
          return 300;
        }
        return val;
      }, 'get offsetWidth'),
      configurable: true
    });
  }

  // 3. GLOBAL AD SHIMS (Universal Compatibility)
  window.canRunAds = true;
  window.isAdBlockActive = false;
  window._adblock = false;
  window.abp = false;
  window.google_ad_client = 'ca-pub-0000000000000000';

  const adsbygoogleShim = [];
  adsbygoogleShim.push = cloakFunction(function(arg) {
    return 1;
  }, 'push');
  adsbygoogleShim.loaded = true;

  try {
    Object.defineProperty(window, 'adsbygoogle', {
      get: () => adsbygoogleShim,
      set: () => {},
      configurable: true
    });
  } catch (e) {
    window.adsbygoogle = adsbygoogleShim;
  }

  // 4. POP-UP & POP-UNDER DEFUSER
  const SUSPICIOUS_URL_PATTERNS = [
    /pop(?:ads|cash|under|up)/i,
    /redirect/i,
    /click(?:adu|under|bright|mega|sor)/i,
    /traffic/i,
    /adsterra/i,
    /propeller/i,
    /monetag/i,
    /hilltop/i,
    /exoclick/i,
    /juicyads/i,
    /adcash/i,
    /onclk/i,
    /deloton/i,
    /bet(?:365|winner|way|ano)?\./i,
    /casino/i,
    /dating/i,
    /affiliate/i,
    /syndication\./i
  ];

  let lastUserClickTime = 0;
  window.addEventListener('click', function(e) {
    if (e.isTrusted) {
      lastUserClickTime = Date.now();
    }
  }, true);

  const originalWindowOpen = window.open;
  const mockWindowProxy = {
    closed: false,
    close: cloakFunction(function() {}, 'close'),
    focus: cloakFunction(function() {}, 'focus'),
    blur: cloakFunction(function() {}, 'blur'),
    postMessage: cloakFunction(function() {}, 'postMessage'),
    document: {
      open: cloakFunction(function() {}, 'open'),
      write: cloakFunction(function() {}, 'write'),
      close: cloakFunction(function() {}, 'close')
    },
    location: { href: 'about:blank' }
  };

  window.open = cloakFunction(function(url, target, features) {
    if (isShieldPaused()) return Reflect.apply(originalWindowOpen, window, arguments);
    const now = Date.now();
    const isRecentClick = (now - lastUserClickTime) < 1500;
    const urlStr = String(url || '');

    const isSuspicious = !urlStr ||
      urlStr === 'about:blank' ||
      SUSPICIOUS_URL_PATTERNS.some(re => re.test(urlStr));

    if (!isRecentClick || isSuspicious) {
      console.warn('[AstraShield] Neutralized Pop-up/Pop-under:', urlStr || '(blank popunder)');
      return mockWindowProxy;
    }

    return Reflect.apply(originalWindowOpen, window, arguments);
  }, 'open');

  // 5. YOUTUBE AD SHIELD (JSON Pruning + 16x Instant-Skip + Anti-Adblock Defuser)
  if (location.hostname.includes('youtube.com')) {
    function prunePlayerAds(data) {
      if (!data || typeof data !== 'object') return data;
      delete data.adPlacements;
      delete data.playerAds;
      delete data.adSlots;
      if (data.playbackTracking) {
        delete data.playbackTracking.videostatsPlaybackUrl;
        delete data.playbackTracking.atrUrl;
      }
      return data;
    }

    let _rawResponse = window.ytInitialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get() {
        return _rawResponse;
      },
      set(val) {
        _rawResponse = isShieldPaused() ? val : prunePlayerAds(val);
      },
      configurable: true
    });
    if (_rawResponse && !isShieldPaused()) {
      _rawResponse = prunePlayerAds(_rawResponse);
    }

    const origFetch = window.fetch;
    window.fetch = cloakFunction(async function(...args) {
      const response = await Reflect.apply(origFetch, this, args);
      if (isShieldPaused()) return response;

      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
      if (url.includes('/youtubei/v1/player')) {
        try {
          const clone = response.clone();
          const json = await clone.json();
          const cleaned = prunePlayerAds(json);
          return new Response(JSON.stringify(cleaned), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        } catch (e) {
          return response;
        }
      }
      return response;
    }, 'fetch');

    function fastForwardYouTubeAds() {
      if (isShieldPaused()) return;
      const moviePlayer = document.getElementById('movie_player');
      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

      const isAdShowing = moviePlayer && (
        moviePlayer.classList.contains('ad-showing') ||
        moviePlayer.classList.contains('ad-interrupting')
      );

      if (isAdShowing && video) {
        video.muted = true;
        video.playbackRate = 16.0;
        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration;
        }
      }

      const skipBtn = document.querySelector(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-container'
      );
      if (skipBtn) {
        skipBtn.click();
      }

      const wallModal = document.querySelector('ytd-enforcement-message-view-model, tp-yt-paper-dialog[dialog]');
      if (wallModal) {
        wallModal.remove();
        document.querySelector('.tp-yt-iron-overlay-backdrop')?.remove();
        if (moviePlayer && typeof moviePlayer.playVideo === 'function') {
          moviePlayer.playVideo();
        }
        if (video && video.paused) {
          video.play();
        }
      }
    }

    setInterval(fastForwardYouTubeAds, 50);
  }

  console.log('[AstraShield Ultra] All shields armed with pause support.');
})();