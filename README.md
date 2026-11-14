# 🛡️ AstraShield Ultra

<div align="center">

![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-38BDF8?style=for-the-badge&logo=googlechrome&logoColor=white)
![Rules](https://img.shields.io/badge/DeclarativeNetRequest-47%2C490_Rules-10B981?style=for-the-badge)
![Acceptable Ads](https://img.shields.io/badge/Acceptable_Ads-0%20(Zero)-EF4444?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)

**Next-generation, zero-compromise AdBlocker and Anti-Popunder Engine for Google Chrome (Manifest V3).**  
Engineered through deep reverse-engineering of eyeo/ABP engines to eliminate corporate whitelists, defuse anti-adblock detection, stop download button popunder loops, and neutralize YouTube ads.

</div>

---

## ⚡ Why AstraShield Ultra?

Commercial adblockers (AdBlock, Adblock Plus) share the same underlying `@eyeo/webext-ad-filtering-solution` engine and ship with an **18.2 MB "Acceptable Ads" whitelist** (`0798B6A2-94A4-4ADF-89ED-BEC112FC4C7F`). 

Under Chrome's `declarativeNetRequest`, their whitelist rules run with **priority 2000–2010 (`allow`)**, overriding the community block rules (priority 1000). Commercial blockers actively unblock paid partners (Google, Taboola, Amazon) and auto-whitelist YouTube when ad-walls appear.

**AstraShield Ultra eliminates all corporate compromises:**

- 🚫 **Zero Whitelists:** 0 corporate exceptions. Block rules run without interference.
- 📺 **YouTube Ad Shield:** Real-time `/youtubei/v1/player` JSON pruning (`adPlacements` & `playerAds` stripping) + 16x instant-skip fallback.
- 🪟 **Anti-Popunder & Clickjacking Defuser:** Destroys full-screen transparent overlays on download websites and traps `window.open` abuse with decoy proxies.
- 🕵️ **Undetectable Stealth Core:** Complete `[native code]` `.toString()` cloaking and bait element deception (simulating visible dimensions for anti-adblock sensors).
- 🎛️ **UI/UX Pro Max Glassmorphic Controller:** Live status indicator, master global toggle, per-site pause control, and granular shield switches.

---

## 🏗️ Architecture

```
my-custom-adblock/
├── manifest.json            # MV3 configuration with DNR & content scripts
├── icons/                   # Vector-drawn high-res shield icons (16, 32, 48, 128)
├── popup/
│   ├── popup.html           # Glassmorphic UI/UX Pro Max controller
│   └── popup.js             # Active tab detection & state synchronizer
├── rules/
│   ├── easylist.json        # 47,490 compiled DeclarativeNetRequest block rules
│   └── network_rules.json   # Priority 3000 rules targeting aggressive popunder networks
├── scripts/
│   ├── background.js        # MV3 Service worker (dynamic per-site DNR allow rules & badges)
│   ├── content.js           # Isolated world overlay hunter & download button sentinel
│   └── scriptlets.js        # Main world stealth cloak, YouTube pruner & window.open decoy
└── styles/
    └── cosmetic.css         # Universal element hiding and banner collapse stylesheet
```

---

## 🚀 Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/ShionBanned/AstraShield.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (*Cargar descomprimida*).
5. Select the `AstraShield` directory.
6. Pin the extension to your toolbar.

---

## 🎛️ Features & Controls

| Feature | Description |
| :--- | :--- |
| **Protección General** | Master global toggle to pause or resume blocking across all tabs. |
| **Pausar en este sitio** | Whitelist toggle for the current active domain via dynamic priority 5000 DNR rules without affecting other open tabs. |
| **YouTube Ad Shield** | Intercepts internal YouTube player requests and purges ad arrays at runtime. |
| **Anti-Popups & Overlays** | Scans and deletes invisible fixed clickjack barriers covering download/magnet links. |
| **Stealth Anti-Detección** | Cloaks overridden methods to match native V8 signatures and feeds fake geometry to anti-adblock probes. |
| **Filtrado Cosmético** | MutationObserver-backed DOM collapse to prevent empty whitespace boxes. |

---

## 📜 License

Released under the [MIT License](LICENSE).