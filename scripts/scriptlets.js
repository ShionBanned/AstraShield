// =========================================================================
// AstraShield Ultra - Stealth, Anti-Popup & YouTube Ad Shield (MAIN World)
// =========================================================================
(function() {
  'use strict';

  const SESSION_CACHE_KEY = '__astrashield_cfg__';

  let runtimeConfig = {
    isPaused: false,
    shields: {
      youtube: true,
      popups: true,
      stealth: true,
      cosmetic: true
    }
  };

  // Load cached state synchronously at document_start before page scripts run
  try {
    const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        runtimeConfig = {
          isPaused: Boolean(parsed.isPaused),
          shields: {
            youtube: true,
            popups: true,
            stealth: true,
            cosmetic: true,
            ...(parsed.shields || {})
          }
        };
      }
    }
  } catch (_) {}

  window.addEventListener('astrashield:state', function(e) {
    try {
      const parsed = typeof e.detail === 'string' ? JSON.parse(e.detail) : e.detail;
      if (parsed && typeof parsed === 'object') {
        runtimeConfig = {
          isPaused: Boolean(parsed.isPaused),
          shields: {
            youtube: true,
            popups: true,
            stealth: true,
            cosmetic: true,
            ...(parsed.shields || {})
          }
        };
      }
    } catch (_) {}
  });

  function isShieldPaused() {
    const root = document.documentElement;
    if (root && root.dataset) {
      if (root.dataset.astraPaused === 'true' || root.dataset.astraShieldPaused === 'true') {
        return true;
      }
      if (root.dataset.astraPaused === 'false') {
        return false;
      }
    }
    return Boolean(runtimeConfig.isPaused);
  }

  function isModuleEnabled(moduleName) {
    if (isShieldPaused()) return false;
    const root = document.documentElement;
    if (root && root.dataset) {
      const attrMap = {
        youtube: 'astraYoutube',
        popups: 'astraPopups',
        stealth: 'astraStealth',
        cosmetic: 'astraCosmetic'
      };
      const attr = attrMap[moduleName];
      if (attr && root.dataset[attr] !== undefined) {
        return root.dataset[attr] !== 'false';
      }
    }
    return runtimeConfig.shields[moduleName] !== false;
  }

  // 1. STEALTH CLOAK: Native Function .toString() & .name Deception
  const cloakedFunctions = new WeakMap();
  const originalFunctionToString = Function.prototype.toString;

  function cloakFunction(proxyFn, originalName = '', originalLength = undefined) {
    try {
      Object.defineProperty(proxyFn, 'name', {
        value: originalName,
        writable: false,
        enumerable: false,
        configurable: true
      });
      if (typeof originalLength === 'number') {
        Object.defineProperty(proxyFn, 'length', {
          value: originalLength,
          writable: false,
          enumerable: false,
          configurable: true
        });
      }
    } catch (_) {}
    cloakedFunctions.set(proxyFn, `function ${originalName}() { [native code] }`);
    return proxyFn;
  }

  const customToString = function toString() {
    if (typeof this === 'function' && cloakedFunctions.has(this)) {
      return cloakedFunctions.get(this);
    }
    return Reflect.apply(originalFunctionToString, this, arguments);
  };
  cloakFunction(customToString, 'toString', 0);
  Function.prototype.toString = customToString;

  // 2. ANTI-ADBLOCK BAIT DECEPTION (Indetectabilidad)
  const BAIT_PATTERNS = /(?:adsbox|ad-tester|adblock-test|banner-ad|ad-banner|google_ads|adsbygoogle|ad-placement)/i;

  function isBaitElement(el) {
    if (!el || typeof el !== 'object') return false;
    const idStr = typeof el.id === 'string' ? el.id : '';
    const classStr = typeof el.className === 'string'
      ? el.className
      : (typeof el.getAttribute === 'function' ? (el.getAttribute('class') || '') : '');
    return BAIT_PATTERNS.test(idStr) || BAIT_PATTERNS.test(classStr);
  }

  const FAKE_STYLE_VALUES = {
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    height: '150px',
    width: '300px'
  };

  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = cloakFunction(function getComputedStyle(el, pseudoElt) {
    const style = Reflect.apply(originalGetComputedStyle, window, arguments);
    if (!isModuleEnabled('stealth') || !style || !isBaitElement(el)) {
      return style;
    }

    const fakeGetPropertyValue = cloakFunction(function getPropertyValue(propName) {
      const normalized = String(propName || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(FAKE_STYLE_VALUES, normalized)) {
        return FAKE_STYLE_VALUES[normalized];
      }
      return style.getPropertyValue(propName);
    }, 'getPropertyValue', 1);

    return new Proxy(style, {
      get(sTarget, prop) {
        if (prop === 'getPropertyValue') {
          return fakeGetPropertyValue;
        }
        if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(FAKE_STYLE_VALUES, prop)) {
          return FAKE_STYLE_VALUES[prop];
        }
        const value = Reflect.get(sTarget, prop, sTarget);
        return typeof value === 'function' ? value.bind(sTarget) : value;
      }
    });
  }, 'getComputedStyle', 1);

  // OffsetHeight/OffsetWidth bait interception
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

  if (originalOffsetHeight && originalOffsetHeight.get) {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      get: cloakFunction(function get() {
        const val = originalOffsetHeight.get.call(this);
        if (isModuleEnabled('stealth') && val === 0 && isBaitElement(this)) {
          return 150;
        }
        return val;
      }, 'get offsetHeight', 0),
      configurable: true
    });
  }

  if (originalOffsetWidth && originalOffsetWidth.get) {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      get: cloakFunction(function get() {
        const val = originalOffsetWidth.get.call(this);
        if (isModuleEnabled('stealth') && val === 0 && isBaitElement(this)) {
          return 300;
        }
        return val;
      }, 'get offsetWidth', 0),
      configurable: true
    });
  }

  // 3. GLOBAL AD SHIMS (Universal Compatibility)
  if (isModuleEnabled('stealth')) {
    window.canRunAds = true;
    window.isAdBlockActive = false;
    window._adblock = false;
    window.abp = false;
    if (!window.google_ad_client) {
      window.google_ad_client = 'ca-pub-0000000000000000';
    }

    const adsbygoogleShim = [];
    adsbygoogleShim.push = cloakFunction(function push() {
      return 1;
    }, 'push', 1);
    adsbygoogleShim.loaded = true;

    try {
      let currentAdsByGoogle = window.adsbygoogle || adsbygoogleShim;
      Object.defineProperty(window, 'adsbygoogle', {
        get() {
          return isModuleEnabled('stealth') ? adsbygoogleShim : currentAdsByGoogle;
        },
        set(val) {
          currentAdsByGoogle = val;
        },
        configurable: true
      });
    } catch (_) {
      window.adsbygoogle = adsbygoogleShim;
    }
  }

  // 4. POP-UP & POP-UNDER DEFUSER
  const SUSPICIOUS_URL_PATTERNS = [
    /pop(?:ads|cash|under|up|myads)/i,
    /click(?:adu|under|bright|mega|sor)/i,
    /adsterra/i,
    /propeller(?:ads)?/i,
    /monetag/i,
    /hilltop(?:ads)?/i,
    /exoclick/i,
    /juicyads/i,
    /adcash/i,
    /onclk(?:ds)?/i,
    /deloton/i,
    /trafficjunky/i,
    /realsrv\.com/i,
    /(?:^|[/.])bet(?:365|winner|way|ano|1x)\./i,
    /1xbet/i
  ];

  const OAUTH_SAFE_PATTERNS = [
    /accounts\.google\.com/i,
    /appleid\.apple\.com/i,
    /github\.com\/login\/oauth/i,
    /login\.microsoftonline\.com/i,
    /login\.live\.com/i,
    /discord\.com\/oauth2/i,
    /facebook\.com\/v\d+\.\d+\/dialog\/oauth/i,
    /auth0\.com/i,
    /paypal\.com\/checkoutnow/i,
    /stripe\.com/i
  ];

  let lastUserInteractionTime = 0;
  function recordInteraction(e) {
    if (e && e.isTrusted) {
      lastUserInteractionTime = Date.now();
    }
  }

  ['pointerdown', 'mousedown', 'mouseup', 'click', 'touchend'].forEach(evt => {
    window.addEventListener(evt, recordInteraction, true);
  });
  window.addEventListener('keydown', function(e) {
    if (e.isTrusted && (e.key === 'Enter' || e.key === ' ')) {
      lastUserInteractionTime = Date.now();
    }
  }, true);

  const originalWindowOpen = window.open;
  const mockLocation = {
    href: 'about:blank',
    assign: cloakFunction(function assign() {}, 'assign', 1),
    replace: cloakFunction(function replace() {}, 'replace', 1),
    reload: cloakFunction(function reload() {}, 'reload', 0),
    toString: cloakFunction(function toString() { return 'about:blank'; }, 'toString', 0)
  };

  const mockWindowProxy = {
    closed: false,
    opener: window,
    close: cloakFunction(function close() { this.closed = true; }, 'close', 0),
    focus: cloakFunction(function focus() {}, 'focus', 0),
    blur: cloakFunction(function blur() {}, 'blur', 0),
    postMessage: cloakFunction(function postMessage() {}, 'postMessage', 2),
    addEventListener: cloakFunction(function addEventListener() {}, 'addEventListener', 2),
    removeEventListener: cloakFunction(function removeEventListener() {}, 'removeEventListener', 2),
    document: {
      open: cloakFunction(function open() { return this; }, 'open', 0),
      write: cloakFunction(function write() {}, 'write', 1),
      writeln: cloakFunction(function writeln() {}, 'writeln', 1),
      close: cloakFunction(function close() {}, 'close', 0)
    },
    location: mockLocation
  };

  window.open = cloakFunction(function open(url, target, features) {
    if (!isModuleEnabled('popups')) {
      return Reflect.apply(originalWindowOpen, window, arguments);
    }

    const now = Date.now();
    const isRecentClick = (now - lastUserInteractionTime) < 2000;
    const urlStr = String(url || '').trim();

    if (urlStr && OAUTH_SAFE_PATTERNS.some(re => re.test(urlStr)) && isRecentClick) {
      return Reflect.apply(originalWindowOpen, window, arguments);
    }

    const isSuspicious =
      !urlStr ||
      urlStr === 'about:blank' ||
      /^javascript:/i.test(urlStr) ||
      SUSPICIOUS_URL_PATTERNS.some(re => re.test(urlStr));

    if (!isRecentClick || isSuspicious) {
      console.warn('[AstraShield] Neutralized Pop-up/Pop-under:', urlStr || '(blank popunder)');
      return mockWindowProxy;
    }

    return Reflect.apply(originalWindowOpen, window, arguments);
  }, 'open', 3);

  // 5. YOUTUBE AD SHIELD (JSON Pruning + State-Restoring Instant-Skip + Anti-Adblock Defuser)
  if (location.hostname.includes('youtube.com')) {
    function prunePlayerAds(data) {
      if (!data || typeof data !== 'object') return data;
      delete data.adPlacements;
      delete data.playerAds;
      delete data.adSlots;
      delete data.adBreakHeartbeatParams;
      if (data.playbackTracking) {
        delete data.playbackTracking.videostatsPlaybackUrl;
        delete data.playbackTracking.atrUrl;
        delete data.playbackTracking.qoeUrl;
      }
      return data;
    }

    let _rawResponse = window.ytInitialPlayerResponse;
    try {
      Object.defineProperty(window, 'ytInitialPlayerResponse', {
        get() {
          return _rawResponse;
        },
        set(val) {
          _rawResponse = isModuleEnabled('youtube') ? prunePlayerAds(val) : val;
        },
        configurable: true
      });
      if (_rawResponse && isModuleEnabled('youtube')) {
        _rawResponse = prunePlayerAds(_rawResponse);
      }
    } catch (_) {}

    const origFetch = window.fetch;
    window.fetch = cloakFunction(async function fetch(...args) {
      const response = await Reflect.apply(origFetch, this, args);
      if (!isModuleEnabled('youtube')) return response;

      const req = args[0];
      const url = typeof req === 'string' ? req : (req && typeof req.url === 'string' ? req.url : '');
      if (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next')) {
        try {
          const clone = response.clone();
          const json = await clone.json();
          const cleaned = prunePlayerAds(json);
          const synthetic = new Response(JSON.stringify(cleaned), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
          Object.defineProperty(synthetic, 'url', { value: response.url });
          Object.defineProperty(synthetic, 'type', { value: response.type });
          return synthetic;
        } catch (_) {
          return response;
        }
      }
      return response;
    }, 'fetch', 1);

    let wasAdShowing = false;
    let savedUserMuted = false;
    let savedUserRate = 1.0;

    function fastForwardYouTubeAds() {
      if (!isModuleEnabled('youtube')) return;
      const moviePlayer = document.getElementById('movie_player');
      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

      const isAdShowing = Boolean(
        moviePlayer && (
          moviePlayer.classList.contains('ad-showing') ||
          moviePlayer.classList.contains('ad-interrupting')
        )
      );

      if (isAdShowing && video) {
        if (!wasAdShowing) {
          wasAdShowing = true;
          savedUserMuted = video.muted;
          savedUserRate = video.playbackRate > 0 && video.playbackRate <= 2 ? video.playbackRate : 1.0;
        }
        video.muted = true;
        try {
          video.playbackRate = 16.0;
        } catch (_) {}
        if (isFinite(video.duration) && video.duration > 0.1) {
          try {
            video.currentTime = Math.max(0, video.duration - 0.05);
          } catch (_) {}
        }
      } else if (wasAdShowing && video) {
        wasAdShowing = false;
        video.muted = savedUserMuted;
        try {
          video.playbackRate = savedUserRate;
        } catch (_) {
          video.playbackRate = 1.0;
        }
      }

      const skipBtn = document.querySelector(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-container button'
      );
      if (skipBtn && typeof skipBtn.click === 'function') {
        skipBtn.click();
      }

      // Only remove enforcement modal, NEVER legitimate Share/Playlist dialogs
      const enforcementEl = document.querySelector('ytd-enforcement-message-view-model');
      if (enforcementEl) {
        const dialog = enforcementEl.closest('tp-yt-paper-dialog') || enforcementEl;
        dialog.remove();
        const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
        if (backdrop) backdrop.remove();
        if (moviePlayer && typeof moviePlayer.playVideo === 'function') {
          try { moviePlayer.playVideo(); } catch (_) {}
        }
        if (video && video.paused) {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        }
      }
    }

    setInterval(fastForwardYouTubeAds, 100);
  }

  console.log('[AstraShield Ultra] All shields armed with granular & pause support.');
})();