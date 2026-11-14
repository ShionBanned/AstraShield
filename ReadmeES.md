# 🛡️ AstraShield Ultra

<div align="center">

[![English](https://img.shields.io/badge/Language-English-blue?style=flat-square)](README.md)
[![Español](https://img.shields.io/badge/Idioma-Espa%C3%B1ol-brightgreen?style=flat-square)](ReadmeES.md)

![Manifest V3](https://img.shields.io/badge/Extensi%C3%B3n_Chrome-Manifest_V3-38BDF8?style=for-the-badge&logo=googlechrome&logoColor=white)
![Reglas](https://img.shields.io/badge/DeclarativeNetRequest-46%2C970_Reglas-10B981?style=for-the-badge)
![Publicidad Aceptable](https://img.shields.io/badge/Acceptable_Ads-0%20(Cero)-EF4444?style=for-the-badge)
![Licencia](https://img.shields.io/badge/Licencia-MIT-F59E0B?style=for-the-badge)

**Bloqueador de anuncios y motor anti-popunder de última generación para Google Chrome (Manifest V3).**  
Diseñado mediante ingeniería inversa profunda de los motores comerciales de eyeo/ABP para erradicar listas blancas corporativas, neutralizar la detección anti-adblock, frenar secuestros de clics en botones de descarga y bloquear los anuncios de YouTube.

</div>

---

## ⚡ ¿Por qué AstraShield Ultra?

Los bloqueadores comerciales (AdBlock, Adblock Plus) comparten el mismo motor base (`@eyeo/webext-ad-filtering-solution`) e incluyen una **lista blanca corporativa de 18.2 MB llamada "Acceptable Ads"** (`0798B6A2-94A4-4ADF-89ED-BEC112FC4C7F`). 

Bajo la API `declarativeNetRequest` de Chrome, las reglas de esa lista blanca se ejecutan con **prioridad 2000–2010 (`allow`)**, anulando deliberadamente las reglas de bloqueo comunitarias (prioridad 1000). Como consecuencia, los bloqueadores tradicionales dejan pasar anuncios de socios que pagan (Google, Taboola, Amazon) y se rinden añadiendo a YouTube a una lista blanca cuando aparece el muro anti-adblock.

**AstraShield Ultra elimina cualquier compromiso corporativo:**

- 🚫 **Cero Listas Blancas:** 0 excepciones corporativas (reglas `allow` y `allowAllRequests` eliminadas por completo). Las reglas de bloqueo operan sin sabotaje.
- 📺 **Escudo Anti-Anuncios en YouTube:** Poda en tiempo real de JSON en `/youtubei/v1/player` y `/youtubei/v1/next` (extracción de `adPlacements`, `playerAds` y `adSlots`) + aceleración instantánea a 16x con restauración de velocidad y audio.
- 🪟 **Defuser de Popunders y Clickjacking:** Destruye capas transparentes de pantalla completa en sitios de descarga sin romper modales legítimos ni ventanas de inicio de sesión OAuth, atrapando el abuso de `window.open` con ventanas señuelo (*mock proxies*).
- 🕵️ **Núcleo Sigiloso Indetectable:** Disfraz nativo completo de `[native code]` para `.toString()` y `.name`, junto con emulación de dimensiones para sensores señuelo basados en `CSSStyleDeclaration`.
- 🎛️ **Controlador Glassmorphic UI/UX Pro Max:** Indicador de estado en vivo, interruptor maestro global, control de pausa selectiva por dominio con gestor interactivo y conmutadores individuales de cada escudo.

---

## 🏗️ Arquitectura del Proyecto

```
AstraShield/
├── manifest.json            # Configuración MV3 con DNR y content scripts
├── icons/                   # Iconos vectoriales de alta resolución (16, 32, 48, 128 px)
├── popup/
│   ├── popup.html           # Interfaz Glassmorphic UI/UX Pro Max
│   └── popup.js             # Detección de pestaña activa, gestor de dominios y sincronización
├── rules/
│   ├── easylist.json        # 46,948 reglas puras de bloqueo compiladas para DeclarativeNetRequest
│   └── network_rules.json   # 22 reglas de prioridad 3000 contra redes agresivas de popunders
├── scripts/
│   ├── background.js        # Service worker MV3 (reglas dinámicas por sitio y badges en toolbar)
│   ├── content.js           # Cazador de overlays en mundo aislado, centinela de descargas y puente
│   └── scriptlets.js        # Disfraz nativo en mundo principal, podador de YouTube y decoy de popups
└── styles/
    └── cosmetic.css         # Hoja de estilos cosmética con soporte de pausa para colapsar banners
```

---

## 🚀 Instalación en Chrome

1. Clona o descarga este repositorio:
   ```bash
   git clone https://github.com/ShionBanned/AstraShield.git
   ```
2. Abre Google Chrome y entra en la dirección:
   ```text
   chrome://extensions/
   ```
3. Activa el **Modo de desarrollador** (interruptor en la esquina superior derecha).
4. Haz clic en **Cargar descomprimida** (*Load unpacked*).
5. Selecciona la carpeta `AstraShield` (o `my-custom-adblock`).
6. Fija la extensión en la barra de herramientas para acceder a su panel de control.

---

## 🎛️ Funcionalidades y Controles

| Función | Descripción |
| :--- | :--- |
| **Protección General** | Interruptor maestro para pausar o reactivar el bloqueo en todo el navegador de manera global. |
| **Pausar en este sitio** | Lista blanca selectiva para el dominio activo usando reglas dinámicas DNR de prioridad 5000 sin afectar otras pestañas. |
| **YouTube Ad Shield** | Intercepta peticiones del reproductor interno de YouTube, elimina arrays de anuncios en tiempo de ejecución y restaura audio/velocidad tras omitirlos. |
| **Anti-Popups & Overlays** | Escanea y suprime capas invisibles de clickjack sobre enlaces de descarga y torrents, preservando logins OAuth de terceros. |
| **Stealth Anti-Detección** | Camufla funciones anuladas imitando firmas nativas V8 y alimenta mediciones falsas a scripts detectores sin lanzar errores `Illegal invocation`. |
| **Filtrado Cosmético** | Colapso de bloques en DOM mediante MutationObserver y CSS sensible al estado de pausa para evitar huecos en blanco. |

---

## 📜 Licencia

Distribuido bajo la [Licencia MIT](LICENSE).