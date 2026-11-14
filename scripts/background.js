// =========================================================================
// AstraShield Ultra - Service Worker & State Synchronizer
// =========================================================================

function domainToRuleId(domain) {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = ((hash << 5) - hash) + domain.charCodeAt(i);
    hash |= 0;
  }
  return 800000 + (Math.abs(hash) % 90000);
}

// Initialize default state
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['globalEnabled', 'pausedDomains', 'shields', 'stats']);
  const defaults = {
    globalEnabled: data.globalEnabled !== undefined ? data.globalEnabled : true,
    pausedDomains: Array.isArray(data.pausedDomains) ? data.pausedDomains : [],
    shields: data.shields || {
      youtube: true,
      popups: true,
      stealth: true,
      cosmetic: true
    },
    stats: data.stats || {
      totalBlocked: 0
    }
  };
  await chrome.storage.local.set(defaults);
  updateBadge(defaults.globalEnabled);
});

// Update toolbar icon badge
function updateBadge(globalEnabled, currentDomainPaused = false) {
  if (!globalEnabled) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#DC2626' }); // Red
  } else if (currentDomainPaused) {
    chrome.action.setBadgeText({ text: 'PAUSE' });
    chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' }); // Amber
  } else {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981' }); // Green
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleGlobal') {
    handleToggleGlobal(request.enabled).then(sendResponse);
    return true;
  }
  if (request.action === 'toggleDomain') {
    handleToggleDomain(request.domain, request.paused).then(sendResponse);
    return true;
  }
  if (request.action === 'toggleShield') {
    handleToggleShield(request.shield, request.enabled).then(sendResponse);
    return true;
  }
  if (request.action === 'getDomainStatus') {
    handleGetDomainStatus(request.domain).then(sendResponse);
    return true;
  }
});

async function handleToggleGlobal(enabled) {
  await chrome.storage.local.set({ globalEnabled: enabled });
  if (enabled) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['ruleset_easylist', 'network_block_rules']
    });
    updateBadge(true);
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['ruleset_easylist', 'network_block_rules']
    });
    updateBadge(false);
  }
  return { success: true, globalEnabled: enabled };
}

async function handleToggleDomain(domain, paused) {
  const data = await chrome.storage.local.get(['pausedDomains', 'globalEnabled']);
  let pausedList = Array.isArray(data.pausedDomains) ? data.pausedDomains : [];
  const ruleId = domainToRuleId(domain);

  if (paused) {
    if (!pausedList.includes(domain)) {
      pausedList.push(domain);
    }
    // Add dynamic allow rule with top priority 5000
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: [{
          id: ruleId,
          priority: 5000,
          action: { type: 'allowAllRequests' },
          condition: {
            initiatorDomains: [domain],
            requestDomains: [domain]
          }
        }]
      });
    } catch (e) {
      console.error('Error adding allow rule for domain', domain, e);
    }
  } else {
    pausedList = pausedList.filter(d => d !== domain);
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId]
      });
    } catch (e) {
      console.error('Error removing allow rule for domain', domain, e);
    }
  }

  await chrome.storage.local.set({ pausedDomains: pausedList });
  updateBadge(data.globalEnabled, paused);
  return { success: true, domain, paused };
}

async function handleToggleShield(shield, enabled) {
  const data = await chrome.storage.local.get(['shields']);
  const shields = data.shields || {};
  shields[shield] = enabled;
  await chrome.storage.local.set({ shields });
  return { success: true, shields };
}

async function handleGetDomainStatus(domain) {
  const data = await chrome.storage.local.get(['globalEnabled', 'pausedDomains', 'shields']);
  const isPausedOnDomain = Array.isArray(data.pausedDomains) && data.pausedDomains.includes(domain);
  return {
    globalEnabled: data.globalEnabled !== false,
    isPausedOnDomain: isPausedOnDomain,
    shields: data.shields || {}
  };
}