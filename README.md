<div align="center">

<img src="public/favicon.svg" alt="ShopNest Logo" width="96" height="96" />

# ShopNest Desktop
### Multi-Tenant Point of Sale & Business Management System

[![Release](https://img.shields.io/github/v/release/rumman2004/ShopNest-Desktop?style=flat-square&color=004643&label=Latest%20Release)](https://github.com/rumman2004/ShopNest-Desktop/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-004643?style=flat-square)](https://github.com/rumman2004/ShopNest-Desktop/releases)
[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri%20v2-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Backend](https://img.shields.io/badge/Backend-Vercel-black?style=flat-square&logo=vercel)](https://shopnest-backend-jade.vercel.app)

<br/>

**ShopNest Desktop** is a professional, cross-platform POS & ERP application built with **Tauri v2 + React 19**.  
It connects to a live cloud backend while also working **fully offline** — syncing automatically when your connection is restored.

<br/>

[📥 **Download for Windows**](https://github.com/rumman2004/ShopNest-Desktop/releases) · [🌐 **Live Web App**](https://shopnest-peach.vercel.app/) · [🐛 **Report a Bug**](https://github.com/rumman2004/ShopNest-Desktop/issues) · [💡 **Request Feature**](https://github.com/rumman2004/ShopNest-Desktop/issues)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running in Development](#running-in-development)
  - [Building for Production](#building-for-production)
- [⚙️ Configuration](#️-configuration)
- [📦 Tech Stack](#-tech-stack)
- [🗂️ Project Structure](#️-project-structure)
- [🔌 Services & Modules](#-services--modules)
- [🔄 CI/CD & Auto-Updater](#-cicd--auto-updater)
- [🔐 Security](#-security)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

### 🏪 Multi-Shop Management
- Create, manage, and switch between multiple stores from a single dashboard
- Complete data isolation — each shop has its own products, cashiers, and reports
- Owner-level analytics across all shops in one unified view

### 🧾 Lightning-Fast POS Terminal
- Distraction-free cashier interface optimised for speed
- Barcode scanner support via native HID/serial listener
- Scan → Add → Checkout in under 10 seconds
- Cash drawer kick-out via RJ11 ESC/POS pulse commands

### 🖨️ Receipt Printing Engine
- Native **ESC/POS** driver for thermal printers (58mm & 80mm paper)
- Customisable receipt header, footer, and logo
- Auto-detect printer on application startup

### 📊 Real-Time Analytics
- Revenue trends, profit margins, and daily summaries
- Top-selling products and low-stock alerts
- One-click **Excel export** (XLSX) for all reports

### 🛡️ Role-Based Access Control (RBAC)
- **Owner**: Full access — shops, reports, cashiers, settings
- **Cashier**: Restricted terminal — only point-of-sale screen
- JWT-authenticated sessions with automatic token refresh

### 📡 Offline-First Architecture
- Local **SQLCipher** encrypted database via Tauri SQL plugin
- All sales are saved locally first — even with no internet
- Background sync daemon queues pending transactions and pushes them when connectivity returns

### 🔄 Over-the-Air (OTA) Auto-Updater
- Built-in update checker using `@tauri-apps/plugin-updater`
- Silent background check on every app launch
- In-app update notification modal with one-click install

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  ShopNest Desktop (Tauri)               │
│                                                         │
│  ┌──────────────┐    ┌───────────────────────────────┐  │
│  │  React 19 UI │    │       Rust Core (Tauri)       │  │
│  │  (WebView2)  │◄──►│  Native APIs, File System,    │  │
│  │  TailwindCSS │    │  Printer, Serial Port, Tray   │  │
│  └──────────────┘    └───────────────────────────────┘  │
│          │                        │                     │
│          ▼                        ▼                     │
│  ┌──────────────┐    ┌───────────────────────────────┐  │
│  │  Axios API   │    │   SQLCipher (Local DB)        │  │
│  │  (Cloud Sync)│    │   Encrypted offline storage   │  │
│  └──────────────┘    └───────────────────────────────┘  │
│          │                                              │
└──────────┼──────────────────────────────────────────────┘
           │  HTTPS / REST API
           ▼
┌─────────────────────────────────┐
│   Vercel Cloud Backend          │
│   Node.js + Express + MongoDB   │
│   shopnest-backend.vercel.app   │
└─────────────────────────────────┘
```

### Data Flow — Offline Sale

```
Cashier scans item  →  Added to cart
        ↓
Checkout tapped  →  Saved to LOCAL SQLite DB immediately
        ↓
syncService checks internet  →  If ONLINE  : push to Cloud API
                             →  If OFFLINE : queued in local DB
        ↓
Connection restored  →  Queued sales auto-sync to cloud
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | ≥ 18.x | Frontend build |
| [Rust](https://www.rust-lang.org/tools/install) | ≥ 1.77 | Tauri core compilation |
| [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) | 2019+ | Windows native builds |
| [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) | Latest | Windows runtime (usually pre-installed) |

> **macOS**: Install Xcode Command Line Tools via `xcode-select --install`  
> **Linux**: Install `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/rumman2004/ShopNest-Desktop.git
cd ShopNest-Desktop

# 2. Install Node dependencies
npm install

# 3. Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Environment Configuration

Create a `.env` file in the project root:

```env
# ShopNest POS Desktop - API Configuration
VITE_API_URL=https://shopnest-backend-jade.vercel.app/api/v1
```

> For local backend development:
> ```env
> VITE_API_URL=http://localhost:5000/api/v1
> ```

### Running in Development

```bash
npm run tauri dev
```

This will:
1. Start the **Vite dev server** on `http://localhost:1420`
2. Compile the **Rust core** (first run takes 3–5 minutes)
3. Open the **native app window** with live hot-reload

### Building for Production

```bash
npm run tauri build
```

Output installers:

| OS | File |
|----|------|
| Windows (installer) | `bundle/nsis/ShopNest Desktop_1.0.0_x64-setup.exe` |
| Windows (MSI) | `bundle/msi/ShopNest Desktop_1.0.0_x64_en-US.msi` |
| macOS | `bundle/dmg/ShopNest Desktop_1.0.0_x64.dmg` |
| Linux | `bundle/appimage/shopnest-desktop_1.0.0_amd64.AppImage` |

All files are under `src-tauri/target/release/bundle/`.

---

## ⚙️ Configuration

### `src-tauri/tauri.conf.json`

| Key | Value | Description |
|-----|-------|-------------|
| `productName` | `ShopNest Desktop` | Application display name |
| `version` | `1.0.0` | Must be `MAJOR.MINOR.PATCH` — no suffix (WiX requirement) |
| `identifier` | `com.shopnest.pos` | Unique app bundle ID |
| `windows.width` | `1280` | Default window width |
| `windows.minWidth` | `1024` | Minimum supported width |
| `bundle.targets` | `all` | Builds NSIS, MSI, AppImage, DMG |

### `src-tauri/capabilities/default.json`

Controls which Tauri APIs the frontend is allowed to access:
- `core:default` — File system, window management, events
- `opener:default` — Open URLs in system browser

---

## 📦 Tech Stack

### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.1 | UI Framework |
| React Router DOM | 7.x | Client-side routing |
| TailwindCSS | 4.x | Utility-first CSS |
| Recharts | 3.x | Analytics charts |
| Lucide React | 1.x | Icon library |
| React Hook Form | 7.x | Form validation |
| GSAP | 3.x | Advanced animations |
| Axios | 1.x | HTTP client |
| date-fns | 4.x | Date formatting |
| XLSX | 0.18 | Excel export |

### Tauri Plugins

| Plugin | Purpose |
|--------|---------|
| `@tauri-apps/plugin-sql` | SQLite / SQLCipher local database |
| `@tauri-apps/plugin-updater` | OTA auto-updater |
| `@tauri-apps/plugin-process` | App restart / exit controls |
| `@tauri-apps/plugin-opener` | Open links in default browser |

### Backend (Cloud)

| Technology | Purpose |
|------------|---------|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Cloud database |
| JWT + bcrypt | Authentication & security |
| Vercel | Serverless deployment |

---

## 🗂️ Project Structure

```
ShopNest-Desktop/
├── .github/
│   └── workflows/
│       └── release.yml          # CI/CD: cross-platform build pipeline
├── public/
│   ├── favicon.svg              # ShopNest branded favicon
│   ├── favicon.ico              # Windows ICO favicon
│   └── logo.png                 # App logo (512x512)
├── src/
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Root component & router
│   ├── index.css                # Global styles & design tokens
│   ├── components/
│   │   ├── ui/                  # Reusable UI primitives (Button, Modal...)
│   │   └── layout/              # Sidebar, Navbar, Shell components
│   ├── context/
│   │   ├── AuthContext.jsx      # JWT auth state
│   │   └── ShopContext.jsx      # Active shop state
│   ├── features/
│   │   └── updater/
│   │       └── UpdaterModal.jsx # OTA update notification modal
│   ├── hooks/                   # Custom React hooks
│   ├── pages/
│   │   ├── public/              # Landing, Login, Register
│   │   ├── owner/               # Dashboard, Reports, Settings
│   │   └── cashier/             # POS terminal
│   ├── router/
│   │   └── AppRouter.jsx        # Protected & public route definitions
│   ├── services/
│   │   ├── api.js               # Axios instance with JWT interceptor
│   │   ├── authService.js       # Login / logout / register
│   │   ├── offlineDb.js         # SQLCipher local DB (init, CRUD)
│   │   ├── syncService.js       # Background cloud sync daemon
│   │   ├── printerService.js    # ESC/POS receipt & cash drawer driver
│   │   ├── updaterService.js    # OTA update check & install
│   │   ├── productService.js    # Product CRUD API calls
│   │   ├── salesService.js      # Sales API calls
│   │   ├── shopService.js       # Shop management API calls
│   │   ├── cashierService.js    # Cashier management API calls
│   │   ├── securityService.js   # Web Crypto session vault
│   │   └── tauriBridge.js       # Tauri <-> React event bridge
│   └── utils/
│       └── constants.js         # API base URL & app-wide constants
├── src-tauri/
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri application config
│   ├── capabilities/
│   │   └── default.json         # Frontend API permissions
│   ├── icons/                   # All platform icons (32px to 512px)
│   └── src/
│       ├── main.rs              # Rust entry point
│       └── lib.rs               # Tauri command handlers
├── .env                         # API URL (gitignored in production)
├── index.html                   # HTML shell
├── package.json                 # Node dependencies
└── vite.config.js               # Vite bundler config
```

---

## 🔌 Services & Modules

### `offlineDb.js` — Local SQLCipher Database
Initialises and manages a local AES-256 encrypted SQLite database.  
Tables: `products`, `sales`, `pending_sync`.

### `syncService.js` — Background Sync Daemon
Runs every 5 minutes and on app launch to:
1. Pull latest products and shop data from the cloud API
2. Push queued offline sales to the cloud
3. Skip all protected API calls if no auth token is present

### `printerService.js` — ESC/POS Printer Driver
Sends raw ESC/POS byte sequences to thermal printers over USB/Serial. Supports:
- 58mm and 80mm paper widths
- Custom receipt headers and line items
- Cash drawer kick-out via the `DLE EOT` command

### `updaterService.js` — OTA Auto-Updater
Checks GitHub Releases for a `latest.json` manifest on startup. If an update is available:
- Displays an `<UpdaterModal />` to the user
- One-click install that restarts the app

### `securityService.js` — Session Vault
Uses the **Web Crypto API** (`AES-GCM`) to encrypt the JWT token before storing it in `localStorage`.

### `tauriBridge.js` — Tauri ↔ React Bridge
Wraps `invoke()` and `listen()` for type-safe Rust ↔ JavaScript communication.

---

## 🔄 CI/CD & Auto-Updater

GitHub Actions automatically builds cross-platform installers on every push to `main`.

### Pipeline Flow

```
Push to main
     │
     ├── macOS Runner   → .dmg
     ├── Ubuntu Runner  → .AppImage + .deb
     └── Windows Runner → .exe (NSIS) + .msi (WiX)
              │
              └── GitHub Release created with all installers attached
```

### Triggering a New Release

```bash
git add .
git commit -m "feat: your new feature"
git push origin main
# GitHub Actions builds & publishes the release automatically
```

> **Note**: The version in `tauri.conf.json`, `Cargo.toml`, and `package.json` must be a clean `MAJOR.MINOR.PATCH` number (e.g. `1.0.0`). The WiX MSI builder rejects any pre-release suffixes like `-beta` or `-enterprise`.

---

## 🔐 Security

| Layer | Implementation |
|-------|---------------|
| **Transport** | All API calls over HTTPS to Vercel cloud |
| **Authentication** | JWT tokens with automatic expiry & refresh |
| **Token Storage** | AES-GCM encrypted via Web Crypto API |
| **Local Database** | SQLCipher (AES-256 encrypted SQLite) |
| **Content Security Policy** | Strict CSP in `tauri.conf.json` prevents XSS |
| **API Permissions** | Tauri capabilities JSON enforces least-privilege |
| **RBAC** | Owner vs Cashier enforced on frontend routes AND API middleware |

---

## 🤝 Contributing

Contributions are welcome!

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/amazing-feature`
3. **Commit** your changes: `git commit -m "feat: add amazing feature"`
4. **Push** to the branch: `git push origin feat/amazing-feature`
5. **Open** a Pull Request

### Conventional Commit Types

| Prefix | Use for |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation only |
| `style:` | Formatting, no logic change |
| `refactor:` | Code restructure |
| `perf:` | Performance improvements |
| `build:` | Build system / dependency changes |
| `ci:` | CI/CD configuration changes |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by [Rumman Ahmed](https://github.com/rumman2004)**

*ShopNest — Manage Every Shop. Sell with Confidence.*

[![GitHub stars](https://img.shields.io/github/stars/rumman2004/ShopNest-Desktop?style=social)](https://github.com/rumman2004/ShopNest-Desktop/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/rumman2004/ShopNest-Desktop?style=social)](https://github.com/rumman2004/ShopNest-Desktop/fork)

</div>
