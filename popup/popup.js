// =========================================================================
// AstraShield Ultra - Popup Interaction Controller
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  let currentTabId = null;
  let currentDomain = '';

  // DOM Elements
  const brandIcon = document.getElementById('brandIcon');
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const globalToggle = document.getElementById('globalToggle');
  const globalDesc = document.getElementById('globalDesc');
  const currentDomainEl = document.getElementById('currentDomain');
  const siteStatusText = document.getElementById('siteStatusText');
  const sitePauseToggle = document.getElementById('sitePauseToggle');
  const reloadPrompt = document.getElementById('reloadPrompt');
  const pausedSitesCountEl = document.getElementById('pausedSitesCount');

  // Shields elements
  const shieldYoutube = document.getElementById('shieldYoutube');
  const shieldPopups = document.getElementById('shieldPopups');
  const shieldStealth = document.getElementById('shieldStealth');
  const shieldCosmetic = document.getElementById('shieldCosmetic');

  // 1. Get current active tab domain
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      currentTabId = tabs[0].id;
      const url = new URL(tabs[0].url);
      if (url.protocol.startsWith('http')) {
        currentDomain = url.hostname;
        currentDomainEl.textContent = currentDomain;
      } else {
        currentDomain = 'Página Interna';
        currentDomainEl.textContent = currentDomain;
        sitePauseToggle.disabled = true;
      }
    }
  } catch (e) {
    currentDomainEl.textContent = 'Navegador';
    sitePauseToggle.disabled = true;
  }

  // 2. Load stored settings
  const data = await chrome.storage.local.get(['globalEnabled', 'pausedDomains', 'shields']);
  const globalEnabled = data.globalEnabled !== false;
  const pausedDomains = Array.isArray(data.pausedDomains) ? data.pausedDomains : [];
  const isSitePaused = currentDomain && pausedDomains.includes(currentDomain);
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

  updateUI(globalEnabled, isSitePaused, pausedDomains.length);

  function updateUI(isGlobalOn, isDomainPaused, pausedCount) {
    pausedSitesCountEl.textContent = `${pausedCount} sitio${pausedCount === 1 ? '' : 's'} pausado${pausedCount === 1 ? '' : 's'}`;

    if (!isGlobalOn) {
      brandIcon.className = 'brand-icon off';
      statusBadge.className = 'status-badge global-off';
      statusText.textContent = 'DESACTIVADO';
      globalDesc.textContent = 'Protección pausada globalmente';
      siteStatusText.textContent = 'Desactivado';
      siteStatusText.style.color = 'var(--accent-red)';
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
    reloadPrompt.style.display = 'flex';
  }

  // 3. Global Toggle Handler
  globalToggle.addEventListener('change', async () => {
    const isEnabled = globalToggle.checked;
    await chrome.runtime.sendMessage({ action: 'toggleGlobal', enabled: isEnabled });
    const freshData = await chrome.storage.local.get(['pausedDomains']);
    const list = Array.isArray(freshData.pausedDomains) ? freshData.pausedDomains : [];
    updateUI(isEnabled, list.includes(currentDomain), list.length);
    showReloadNotice();
  });

  // 4. Per-Site Pause Toggle Handler
  sitePauseToggle.addEventListener('change', async () => {
    if (!currentDomain || currentDomain.startsWith('Página')) return;
    const isPaused = sitePauseToggle.checked;
    await chrome.runtime.sendMessage({
      action: 'toggleDomain',
      domain: currentDomain,
      paused: isPaused
    });
    const freshData = await chrome.storage.local.get(['pausedDomains', 'globalEnabled']);
    const list = Array.isArray(freshData.pausedDomains) ? freshData.pausedDomains : [];
    updateUI(freshData.globalEnabled !== false, isPaused, list.length);
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

  // 6. Reload Prompt Action
  reloadPrompt.addEventListener('click', () => {
    if (currentTabId) {
      chrome.tabs.reload(currentTabId);
      window.close();
    }
  });
});