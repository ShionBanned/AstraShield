// =========================================================================
// AstraShield Ultra - Popup Interaction Controller
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  let currentTabId = null;
  let currentDomain = '';
  let isRestrictedPage = false;

  // DOM Elements
  const brandIcon = document.getElementById('brandIcon');
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const globalToggleContainer = document.getElementById('globalToggleContainer');
  const globalToggle = document.getElementById('globalToggle');
  const globalDesc = document.getElementById('globalDesc');
  const currentDomainEl = document.getElementById('currentDomain');
  const siteStatusText = document.getElementById('siteStatusText');
  const sitePauseToggle = document.getElementById('sitePauseToggle');
  const reloadPrompt = document.getElementById('reloadPrompt');
  const modulesCard = document.getElementById('modulesCard');
  const pausedSitesCountEl = document.getElementById('pausedSitesCount');
  const pausedDrawer = document.getElementById('pausedDrawer');
  const pausedListContainer = document.getElementById('pausedListContainer');
  const clearAllPausedBtn = document.getElementById('clearAllPausedBtn');

  // Shields elements
  const shieldYoutube = document.getElementById('shieldYoutube');
  const shieldPopups = document.getElementById('shieldPopups');
  const shieldStealth = document.getElementById('shieldStealth');
  const shieldCosmetic = document.getElementById('shieldCosmetic');
  const shieldInputs = [shieldYoutube, shieldPopups, shieldStealth, shieldCosmetic];

  function normalizeDomain(rawDomain) {
    if (!rawDomain || typeof rawDomain !== 'string') return '';
    return rawDomain.trim().toLowerCase().replace(/^www\./, '');
  }

  function isHostInPausedList(host, list) {
    const cleanHost = normalizeDomain(host);
    if (!cleanHost || !Array.isArray(list)) return false;
    return list.some(item => {
      const d = normalizeDomain(item);
      return d && (cleanHost === d || cleanHost.endsWith('.' + d));
    });
  }

  // 1. Get current active tab domain
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs && tabs[0];
    if (activeTab) {
      currentTabId = activeTab.id;
      if (activeTab.url) {
        const url = new URL(activeTab.url);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          currentDomain = normalizeDomain(url.hostname);
          currentDomainEl.textContent = currentDomain;
        } else {
          isRestrictedPage = true;
          currentDomainEl.textContent = 'Página Interna';
          sitePauseToggle.disabled = true;
        }
      } else {
        isRestrictedPage = true;
        currentDomainEl.textContent = 'Página del Sistema';
        sitePauseToggle.disabled = true;
      }
    } else {
      isRestrictedPage = true;
      currentDomainEl.textContent = 'Navegador';
      sitePauseToggle.disabled = true;
    }
  } catch (_) {
    isRestrictedPage = true;
    currentDomainEl.textContent = 'Navegador';
    sitePauseToggle.disabled = true;
  }

  // 2. Load stored settings
  const data = await chrome.storage.local.get(['globalEnabled', 'pausedDomains', 'shields']);
  const globalEnabled = data.globalEnabled !== false;
  let pausedDomains = Array.isArray(data.pausedDomains)
    ? Array.from(new Set(data.pausedDomains.map(normalizeDomain).filter(Boolean)))
    : [];
  const isSitePaused = !isRestrictedPage && isHostInPausedList(currentDomain, pausedDomains);
  const shields = data.shields || {
    youtube: true,
    popups: true,
    stealth: true,
    cosmetic: true
  };

  // Sync controls
  globalToggle.checked = globalEnabled;
  sitePauseToggle.checked = isSitePaused;
  shieldYoutube.checked = shields.youtube !== false;
  shieldPopups.checked = shields.popups !== false;
  shieldStealth.checked = shields.stealth !== false;
  shieldCosmetic.checked = shields.cosmetic !== false;

  updateUI(globalEnabled, isSitePaused, pausedDomains);

  function renderPausedDrawer(list) {
    pausedListContainer.innerHTML = '';
    if (!list || list.length === 0) {
      pausedDrawer.style.display = 'none';
      return;
    }

    list.forEach(domain => {
      const row = document.createElement('div');
      row.className = 'paused-domain-item';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = domain;

      const removeBtn = document.createElement('span');
      removeBtn.className = 'remove-domain-btn';
      removeBtn.textContent = 'Reactivar';
      removeBtn.addEventListener('click', async () => {
        const res = await chrome.runtime.sendMessage({
          action: 'toggleDomain',
          domain,
          paused: false
        });
        pausedDomains = (res && Array.isArray(res.pausedDomains)) ? res.pausedDomains : pausedDomains.filter(d => d !== domain);
        const nowPaused = !isRestrictedPage && isHostInPausedList(currentDomain, pausedDomains);
        sitePauseToggle.checked = nowPaused;
        updateUI(globalToggle.checked, nowPaused, pausedDomains);
        if (domain === currentDomain) {
          showReloadNotice();
        }
      });

      row.appendChild(nameSpan);
      row.appendChild(removeBtn);
      pausedListContainer.appendChild(row);
    });
  }

  function updateUI(isGlobalOn, isDomainPaused, list) {
    const pausedCount = Array.isArray(list) ? list.length : 0;
    pausedSitesCountEl.textContent = `${pausedCount} sitio${pausedCount === 1 ? '' : 's'} pausado${pausedCount === 1 ? '' : 's'}`;
    renderPausedDrawer(list);

    shieldInputs.forEach(input => {
      input.disabled = !isGlobalOn;
    });
    if (modulesCard) {
      modulesCard.classList.toggle('disabled-card', !isGlobalOn);
    }

    if (!isGlobalOn) {
      brandIcon.className = 'brand-icon off';
      statusBadge.className = 'status-badge global-off';
      statusText.textContent = 'DESACTIVADO';
      globalDesc.textContent = 'Protección pausada globalmente';
      siteStatusText.textContent = 'Desactivado';
      siteStatusText.style.color = 'var(--accent-red)';
      sitePauseToggle.disabled = true;
    } else if (isRestrictedPage) {
      brandIcon.className = 'brand-icon';
      statusBadge.className = 'status-badge';
      statusText.textContent = 'PROTEGIDO';
      globalDesc.textContent = 'Bloqueando rastreadores y anuncios';
      siteStatusText.textContent = 'No aplicable';
      siteStatusText.style.color = 'var(--text-muted)';
      sitePauseToggle.disabled = true;
    } else if (isDomainPaused) {
      brandIcon.className = 'brand-icon paused';
      statusBadge.className = 'status-badge site-paused';
      statusText.textContent = 'PAUSADO EN SITIO';
      globalDesc.textContent = 'Protección activa excepto en este sitio';
      siteStatusText.textContent = 'En lista blanca';
      siteStatusText.style.color = 'var(--accent-amber)';
      sitePauseToggle.disabled = false;
    } else {
      brandIcon.className = 'brand-icon';
      statusBadge.className = 'status-badge';
      statusText.textContent = 'PROTEGIDO';
      globalDesc.textContent = 'Bloqueando rastreadores y anuncios';
      siteStatusText.textContent = 'Protegido';
      siteStatusText.style.color = 'var(--accent-green)';
      sitePauseToggle.disabled = false;
    }
  }

  function showReloadNotice() {
    if (!isRestrictedPage) {
      reloadPrompt.style.display = 'flex';
    }
  }

  // 3. Global Toggle Handler (including clicking hero card)
  globalToggleContainer.addEventListener('click', (e) => {
    if (e.target.closest('label.switch')) return;
    globalToggle.checked = !globalToggle.checked;
    globalToggle.dispatchEvent(new Event('change'));
  });

  globalToggle.addEventListener('change', async () => {
    const isEnabled = globalToggle.checked;
    await chrome.runtime.sendMessage({ action: 'toggleGlobal', enabled: isEnabled });
    const freshData = await chrome.storage.local.get(['pausedDomains']);
    pausedDomains = Array.isArray(freshData.pausedDomains) ? freshData.pausedDomains.map(normalizeDomain).filter(Boolean) : [];
    const nowPaused = !isRestrictedPage && isHostInPausedList(currentDomain, pausedDomains);
    updateUI(isEnabled, nowPaused, pausedDomains);
    showReloadNotice();
  });

  // 4. Per-Site Pause Toggle Handler
  sitePauseToggle.addEventListener('change', async () => {
    if (isRestrictedPage || !currentDomain) return;
    const isPaused = sitePauseToggle.checked;
    const res = await chrome.runtime.sendMessage({
      action: 'toggleDomain',
      domain: currentDomain,
      paused: isPaused
    });
    pausedDomains = (res && Array.isArray(res.pausedDomains)) ? res.pausedDomains : pausedDomains;
    updateUI(globalToggle.checked, isPaused, pausedDomains);
    showReloadNotice();
  });

  // 5. Granular Shields Toggles
  const shieldMap = [
    { el: shieldYoutube, name: 'youtube' },
    { el: shieldPopups, name: 'popups' },
    { el: shieldStealth, name: 'stealth' },
    { el: shieldCosmetic, name: 'cosmetic' }
  ];

  shieldMap.forEach(({ el, name }) => {
    el.addEventListener('change', async () => {
      await chrome.runtime.sendMessage({
        action: 'toggleShield',
        shield: name,
        enabled: el.checked
      });
      showReloadNotice();
    });
  });

  // 6. Paused Sites List Drawer & Clear Action
  pausedSitesCountEl.addEventListener('click', () => {
    if (!pausedDomains || pausedDomains.length === 0) return;
    const isVisible = pausedDrawer.style.display === 'block';
    pausedDrawer.style.display = isVisible ? 'none' : 'block';
  });

  clearAllPausedBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'clearPausedDomains' });
    pausedDomains = [];
    sitePauseToggle.checked = false;
    pausedDrawer.style.display = 'none';
    updateUI(globalToggle.checked, false, pausedDomains);
    showReloadNotice();
  });

  // 7. Reload Prompt Action
  reloadPrompt.addEventListener('click', () => {
    if (currentTabId) {
      chrome.tabs.reload(currentTabId);
      window.close();
    }
  });
});