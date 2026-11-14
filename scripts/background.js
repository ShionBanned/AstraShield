// =========================================================================
// AstraShield Ultra - Service Worker & State Synchronizer
// =========================================================================

const DEFAULT_SHIELDS = {
  youtube: true,
  popups: true,
  stealth: true,
  cosmetic: true
};

const STATIC_RULESETS = ['ruleset_easylist', 'network_block_rules'];
const DYNAMIC_RULE_BASE_ID = 800001;

function normalizeDomain(rawDomain) {
  if (!rawDomain || typeof rawDomain !== 'string') return '';
  return rawDomain.trim().toLowerCase().replace(/^www\./, '');
}

function isHostMatchingDomain(hostname, domain) {
  const cleanHost = normalizeDomain(hostname);
  const cleanDomain = normalizeDomain(domain);
  if (!cleanHost || !cleanDomain) return false;
  return cleanHost === cleanDomain || cleanHost.endsWith('.' + cleanDomain);
}

function extractDomainFromUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const url = new URL(urlStr);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return normalizeDomain(url.hostname);
    }
  } catch (_) {}
  return '';
}

async function getStoredState() {
  const data = await chrome.storage.local.get(['globalEnabled', 'pausedDomains', 'shields', 'stats']);
  const globalEnabled = data.globalEnabled !== false;
  const rawDomains = Array.isArray(data.pausedDomains) ? data.pausedDomains : [];
  const pausedDomains = Array.from(
    new Set(rawDomains.map(normalizeDomain).filter(Boolean))
  );
  const shields = {
    ...DEFAULT_SHIELDS,
    ...(data.shields && typeof data.shields === 'object' ? data.shields : {})
  };
  const stats = data.stats && typeof data.stats === 'object' ? data.stats : { totalBlocked: 0 };
  return { globalEnabled, pausedDomains, shields, stats };
}

async function syncStaticRulesets(globalEnabled) {
  try {
    if (globalEnabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: STATIC_RULESETS
      });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: STATIC_RULESETS
      });
    }
  } catch (e) {
    console.error('[AstraShield] Failed to update static rulesets:', e);
  }
}

async function syncDynamicPauseRules(pausedDomains) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);
    const addRules = [];

    pausedDomains.forEach((rawDomain, index) => {
      const domain = normalizeDomain(rawDomain);
      if (!domain) return;

      const frameRuleId = DYNAMIC_RULE_BASE_ID + index * 2;
      const subresourceRuleId = frameRuleId + 1;

      // Rule 1: Whitelist frame hierarchy for paused domain (requires main_frame/sub_frame)
      addRules.push({
        id: frameRuleId,
        priority: 5000,
        action: { type: 'allowAllRequests' },
        condition: {
          requestDomains: [domain],
          resourceTypes: ['main_frame', 'sub_frame']
        }
      });

      // Rule 2: Whitelist all sub-requests initiated by paused domain
      addRules.push({
        id: subresourceRuleId,
        priority: 5000,
        action: { type: 'allow' },
        condition: {
          initiatorDomains: [domain]
        }
      });
    });

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
  } catch (e) {
    console.error('[AstraShield] Failed to sync dynamic pause rules:', e);
  }
}

function updateBadge(globalEnabled, currentDomainPaused = false) {
  if (!globalEnabled) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#DC2626' });
  } else if (currentDomainPaused) {
    chrome.action.setBadgeText({ text: 'PAUSE' });
    chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' });
  } else {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
  }
}

async function refreshBadgeForActiveTab() {
  try {
    const { globalEnabled, pausedDomains } = await getStoredState();
    if (!globalEnabled) {
      updateBadge(false, false);
      return;
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs && tabs[0];
    const domain = activeTab && activeTab.url ? extractDomainFromUrl(activeTab.url) : '';
    const isPaused = Boolean(
      domain && pausedDomains.some(d => isHostMatchingDomain(domain, d))
    );
    updateBadge(true, isPaused);
  } catch (_) {
    updateBadge(true, false);
  }
}

async function initializeEngine() {
  const state = await getStoredState();
  await chrome.storage.local.set(state);
  await syncStaticRulesets(state.globalEnabled);
  await syncDynamicPauseRules(state.pausedDomains);
  await refreshBadgeForActiveTab();
}

chrome.runtime.onInstalled.addListener(() => {
  initializeEngine();
});

chrome.runtime.onStartup.addListener(() => {
  initializeEngine();
});

chrome.tabs.onActivated.addListener(() => {
  refreshBadgeForActiveTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab && tab.active && (changeInfo.url || changeInfo.status === 'complete')) {
    refreshBadgeForActiveTab();
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return false;

  if (request.action === 'toggleGlobal') {
    handleToggleGlobal(Boolean(request.enabled)).then(sendResponse);
    return true;
  }
  if (request.action === 'toggleDomain') {
    handleToggleDomain(request.domain, Boolean(request.paused)).then(sendResponse);
    return true;
  }
  if (request.action === 'clearPausedDomains') {
    handleClearPausedDomains().then(sendResponse);
    return true;
  }
  if (request.action === 'toggleShield') {
    handleToggleShield(request.shield, Boolean(request.enabled)).then(sendResponse);
    return true;
  }
  if (request.action === 'getDomainStatus') {
    handleGetDomainStatus(request.domain).then(sendResponse);
    return true;
  }
  return false;
});

async function handleToggleGlobal(enabled) {
  await chrome.storage.local.set({ globalEnabled: enabled });
  await syncStaticRulesets(enabled);
  await refreshBadgeForActiveTab();
  return { success: true, globalEnabled: enabled };
}

async function handleToggleDomain(rawDomain, paused) {
  const domain = normalizeDomain(rawDomain);
  if (!domain) {
    return { success: false, error: 'Invalid domain' };
  }

  const { globalEnabled, pausedDomains } = await getStoredState();
  let updatedList = pausedDomains.filter(d => !isHostMatchingDomain(d, domain) && !isHostMatchingDomain(domain, d));

  if (paused) {
    updatedList.push(domain);
  }

  await chrome.storage.local.set({ pausedDomains: updatedList });
  await syncDynamicPauseRules(updatedList);
  await refreshBadgeForActiveTab();
  return { success: true, domain, paused, pausedDomains: updatedList, globalEnabled };
}

async function handleClearPausedDomains() {
  await chrome.storage.local.set({ pausedDomains: [] });
  await syncDynamicPauseRules([]);
  await refreshBadgeForActiveTab();
  return { success: true, pausedDomains: [] };
}

async function handleToggleShield(shield, enabled) {
  const { shields } = await getStoredState();
  if (Object.prototype.hasOwnProperty.call(DEFAULT_SHIELDS, shield)) {
    shields[shield] = enabled;
    await chrome.storage.local.set({ shields });
  }
  return { success: true, shields };
}

async function handleGetDomainStatus(rawDomain) {
  const domain = normalizeDomain(rawDomain);
  const { globalEnabled, pausedDomains, shields } = await getStoredState();
  const isPausedOnDomain = Boolean(
    domain && pausedDomains.some(d => isHostMatchingDomain(domain, d))
  );
  return {
    globalEnabled,
    isPausedOnDomain,
    pausedDomains,
    shields
  };
}