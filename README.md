# boneCV Pro

Platformë PWA private dhe offline për krijimin e dokumenteve profesionale në shqip (CV, kontrata, kërkesa dhe më shumë). Dygjuhëshe (Shqip / English), me temë të errët/çelët, e instalueshme dhe gati për paketim si aplikacion Android përmes Trusted Web Activity.

> A private, offline‑first PWA for creating professional documents in Albanian. Bilingual (SQ/EN), dark/light themes, installable, and TWA‑ready.

## Struktura e projektit / Project structure

```
boneCV-pro/
├── index.html            # Kreu / Dashboard (pika hyrëse / entry point)
├── cv.html               # Krijuesi i CV-së
├── kontrata.html         # Krijuesi i kontratave
├── kerkesa.html          # Krijuesi i kërkesave
├── arkiva.html           # Arkiva e dokumenteve
├── cilesimet.html        # Cilësimet (gjuha, tema, të dhënat)
├── offline.html          # Faqja e rezervës kur s'ka internet
├── manifest.json         # Web App Manifest (instalim / TWA)
├── service-worker.js     # Service worker (cache offline-first)
├── master.js             # Logjika e përbashkët (state, i18n, temë, UI)
└── assets/
    └── icons/            # Ikonat lokale (PNG 72–512, maskable, monochrome, favicon)
        └── source/       # Burimet SVG të ikonave (të redaktueshme)
```

Të gjitha faqet ndajnë `master.js`, i cili menaxhon: ruajtjen lokale (localStorage), përkthimin Shqip/English në kohë reale, motorin e temës, sidebar-in, qendrën e ndihmës me manual, dhe regjistrimin e service worker-it.

## Si ta nisësh / How to run

Service worker-ët nuk punojnë me `file://`. Nise nga një server lokal, p.sh:

```bash
# nga brenda dosjes boneCV-pro/
python -m http.server 8080
# hap http://localhost:8080
```

## Veçoritë / Features

- **PWA / Offline-first** — punon plotësisht pa internet pas hapjes së parë.
- **E instalueshme** — banner "Instalo" + i gatshëm për Play Store (TWA), me ikona lokale maskable.
- **Dygjuhëshe** — Shqip & English, ndërrim i menjëhershëm.
- **Temë** — e errët / e çelët / automatike, ngjyrë kryesore, madhësi teksti, qasshmëri.
- **Sidebar i avancuar** — CTA "Krijo dokument", navigim i grupuar, ndërrues gjuhe, instalim.
- **Qendra e ndihmës** — manual i plotë hap-pas-hapi + asistent lokal.
- **Privatësi** — asnjë server, asnjë llogari; të dhënat rrinë vetëm në pajisje.

## Të dhënat / Data

Ruhen lokalisht (localStorage). Backup/rikthim përmes **Cilësimet → Eksporto / Importo** (skedar JSON).

---
boneCV Pro · v1.3.0
