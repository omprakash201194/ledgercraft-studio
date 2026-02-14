# LedgerCraft Studio

A production-grade offline desktop accounting application built with Electron, React, TypeScript, Vite, and Material UI.

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 34 |
| UI | React 18 + Material UI v6 |
| Language | TypeScript 5 |
| Bundler | Vite 6 |
| Database | SQLite (better-sqlite3) |
| Auth | bcryptjs (password hashing) |
| Packaging | electron-builder |

## 📁 Project Structure

```
ledgercraft-studio/
├── electron/                  # Electron main process
│   ├── main.ts                # Window creation, app lifecycle
│   ├── preload.ts             # contextBridge IPC API
│   ├── storage.ts             # App data directory initialization
│   ├── database.ts            # SQLite database class + repositories
│   ├── auth.ts                # Authentication + session management
│   └── ipc/
│       └── handlers.ts        # IPC handler registration
├── renderer/                  # React renderer
│   ├── index.html
│   └── src/
│       ├── components/        # ThemeContext, AuthContext
│       ├── pages/             # Dashboard, LoginPage, UsersPage, PlaceholderPage
│       ├── layouts/           # AppLayout (role-based sidebar + topbar)
│       └── services/          # (future milestones)
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

> The `postinstall` script automatically runs `electron-rebuild` to compile the native `better-sqlite3` module for Electron.

### Development

```bash
npm run dev
```

Starts the Vite dev server and opens the Electron window with hot-reloading.

### Build for Production

```bash
npm run build
```

Produces installable packages in the `release/` directory.

## 🔐 Authentication

- **Default admin**: `admin` / `admin123` (created on first launch)
- **Password security**: bcrypt hashing (never stored in plaintext)
- **Session**: In-memory only, resets on app restart
- **Roles**: `ADMIN` and `USER` with role-based sidebar filtering
- **Route protection**: Unauthenticated users redirected to login

## 🗄 Database

SQLite stored at `%APPDATA%/LedgerCraftStudio/database.sqlite`

**Tables**: `users`, `templates`, `template_placeholders`, `forms`, `form_fields`, `reports`

## 📄 Template Management

- ADMIN-only upload via native file dialog (.docx only)
- Files saved to `%APPDATA%/LedgerCraftStudio/templates/{uuid}.docx`
- Placeholder extraction: `{{key}}` patterns detected using `docxtemplater`
- Placeholders stored in `template_placeholders` table

## 🌗 Theme

Light/Dark mode toggle, persisted in `localStorage`.

## 📋 Milestones

- **Milestone 1** ✅ — Foundation (Electron + React + TypeScript + Vite + MUI)
- **Milestone 2** ✅ — Database layer (SQLite + app data initialization + IPC)
- **Milestone 3** ✅ — Authentication (bcrypt, login UI, role-based routing, user management)
- **Milestone 4** ✅ — Template management (upload .docx, placeholder extraction, admin UI)
