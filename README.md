# LedgerCraft Studio

LedgerCraft Studio is a fully offline desktop document automation
utility designed specifically for Chartered Accountant firms.

It enables administrators to upload Microsoft Word templates, create
dynamic forms mapped to template placeholders, and allow users to
generate professional reports in a secure multi-user environment --- all
without requiring any server, internet connection, or external database
installation.

------------------------------------------------------------------------

## ✨ Key Features

-   Fully Offline Desktop Application
-   Windows-first Distribution
-   Multi-user Role-Based Access (Admin / User)
-   Secure Local Authentication
-   Word (.docx) Template Upload
-   Automatic Placeholder Detection
-   Dynamic Form Builder
-   Smart Placeholder-to-Field Mapping
-   One-click Report Generation
-   Local SQLite Database (No Installation Required)
-   Structured Report Storage
-   Expandable Modular Architecture

------------------------------------------------------------------------

## 👥 User Roles

### Admin

-   Manage Users
-   Upload and Manage Templates
-   Create and Modify Forms
-   Generate Reports
-   View All Generated Reports

### User

-   Generate Reports Using Existing Forms
-   View Generated Reports
-   Cannot Modify Templates or Forms

------------------------------------------------------------------------

## 🏗 Architecture Overview

LedgerCraft Studio is designed as a pure desktop utility.

Electron Main Process: - SQLite Database Management - File System
Handling - Template Processing Engine - Authentication Logic - IPC
Handlers

React + Material UI Renderer: - Modern UI - Dynamic Form Builder -
Report Generation Interface - Role-based Navigation

There is no backend server and no network dependency.

------------------------------------------------------------------------

## 🧠 Technology Stack

-   Electron
-   React + TypeScript
-   Material UI (MUI)
-   SQLite (embedded)
-   better-sqlite3
-   docx-templater
-   bcrypt
-   electron-builder

------------------------------------------------------------------------

## 📂 Project Structure

    ledgercraft-studio/
    │
    ├── electron/
    │   ├── main.ts
    │   ├── preload.ts
    │   ├── database.ts
    │   └── ipc/
    │
    ├── renderer/
    │   ├── src/
    │   │   ├── components/
    │   │   ├── pages/
    │   │   ├── layouts/
    │   │   └── services/
    │   └── package.json
    │
    ├── assets/
    ├── electron-builder.json
    ├── package.json
    └── README.md

------------------------------------------------------------------------

## 🗄 Data Storage

All application data is stored locally under:

### Windows

C:`\Users`{=tex}\<User\>`\AppData`{=tex}`\Roaming`{=tex}`\LedgerCraftStudio`{=tex}\

Structure:

/database.sqlite\
/templates/\
/reports/\
/logs/

No external database installation required.

------------------------------------------------------------------------

## 📄 Template Placeholder Format

Templates must use double curly braces:

{{client_name}}\
{{assessment_year}}\
{{total_income}}

The application automatically scans and extracts placeholders during
upload.

------------------------------------------------------------------------

## 🔐 Security

-   Passwords hashed using bcrypt
-   Role-based UI rendering
-   Secure Electron configuration (contextIsolation enabled)
-   No external network exposure
-   Local-only data storage

------------------------------------------------------------------------

## 🚀 Development Setup

### Install Dependencies

npm install

### Run in Development Mode

npm run dev

------------------------------------------------------------------------

## 🛠 Build Windows Installer

npm run build

This will generate:

-   Windows .exe installer
-   Portable version

------------------------------------------------------------------------

## 📦 Release Strategy

1.  Update version in package.json\
2.  Create Git tag:

git tag v1.0.0\
git push origin v1.0.0

3.  Upload generated installer to GitHub Releases

------------------------------------------------------------------------

## 🛣 Roadmap

-   PDF Export Support
-   Digital Signature Integration
-   Bulk Report Generation
-   Client Management Module
-   Backup & Restore Utility
-   Plugin Architecture
-   Future Web Companion Version

------------------------------------------------------------------------

## 📜 License

MIT License

------------------------------------------------------------------------

## 💼 Vision

LedgerCraft Studio aims to become a comprehensive offline digital
toolkit for CA firms, starting with intelligent document automation and
expanding into a full practice management ecosystem.
