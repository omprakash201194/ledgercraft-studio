# LedgerCraft Studio

A production-grade offline desktop accounting application built with Electron, React, TypeScript, Vite, and Material UI.

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 34 |
| UI | React 18 + Material UI v6 |
| Language | TypeScript 5 |
| Bundler | Vite 6 |
| Packaging | electron-builder |

## 📁 Project Structure

```
ledgercraft-studio/
├── electron/           # Electron main process
│   ├── main.ts         # Main window, security config
│   ├── preload.ts      # contextBridge IPC API
│   └── ipc/            # IPC handlers (future milestones)
├── renderer/           # React renderer
│   ├── index.html
│   └── src/
│       ├── components/ # Shared components (ThemeContext)
│       ├── pages/      # Page components (Dashboard, etc.)
│       ├── layouts/    # AppLayout (Sidebar + Topbar)
│       └── services/   # Service modules (future milestones)
├── electron-builder.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.electron.json
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 9+

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

This starts the Vite dev server and opens the Electron window. Hot-reloading is enabled for the renderer.

### Build for Production

```bash
npm run build
```

Produces installable packages in the `release/` directory (Windows NSIS installer and Portable executable).

## 🔐 Security

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- IPC via `contextBridge` only

## 🌗 Theme

Light and Dark mode with toggle in the Topbar. Theme preference is persisted in `localStorage`.

## 📋 Current Milestone

**Milestone 1 — Foundation Setup** ✅

- Electron + React + TypeScript + Vite scaffold
- Material UI v6 with custom theme
- Secure IPC bridge (`ping → pong`)
- AppLayout with sidebar navigation
- Light/Dark theme toggle
- electron-builder packaging config
