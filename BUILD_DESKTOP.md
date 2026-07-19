# 🖥️ BulkReach Desktop Build & Packaging Guide

This guide explains how to build the standalone desktop application of **BulkReach** (named **TalentStream**) for **macOS (.dmg)** and **Windows (.exe / installer)**.

---

## 🏗️ Architecture Overview

The desktop app is built using **Electron** for the user interface, which runs a compiled **Django/Python backend** as a background sidecar process:

1. **Frontend**: Built with React + Vite + TypeScript, running inside Electron.
2. **Backend**: Django + SQLite + Celery (running in Eager mode for local desktop zero-dependency execution), compiled into a standalone directory using **PyInstaller**.
3. **App Launcher**: Electron spawns the backend executable dynamically (`desktop_entry` on macOS, `desktop_entry.exe` on Windows) on start, and kills it when the app window is closed.

---

## 📦 Local Windows Build Guide (.exe)

Since PyInstaller cannot cross-compile Python code (i.e. you cannot build a Windows executable from a macOS machine), you **must** perform local Windows builds on a physical Windows machine or a virtual machine.

### Prerequisites (on Windows)
1. **Python 3.11** installed and added to your system `PATH`.
2. **Node.js 20+** and `npm` installed.
3. Git (to clone the repository).

### Step-by-Step Build Instructions

#### 1. Build the Python Backend Executable
Open PowerShell or Command Prompt in the repository root directory:
```bash
# Navigate to the backend directory
cd bulkreach/backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On PowerShell:
.\venv\Scripts\Activate.ps1
# On Command Prompt:
.\venv\Scripts\activate.bat

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run the backend build script (runs PyInstaller and generates dist/desktop_entry/)
python build_backend.py
```
This produces the compiled Python directory at `bulkreach/backend/dist/desktop_entry/` containing `desktop_entry.exe`.

#### 2. Build the Electron Windows App
Now package the Electron application:
```bash
# Navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install

# Compile the React frontend and bundle it with Electron into a Windows Installer
npm run electron:build:win
```
Once the build completes, the standalone Windows installer (NSIS executable) will be generated in `bulkreach/frontend/dist-electron/`.

---

## 🍏 Local macOS Build Guide (.dmg)

### Prerequisites (on macOS)
1. **Python 3.11** (installed via Homebrew or official installer).
2. **Node.js 20+** and `npm`.

### Step-by-Step Build Instructions

#### 1. Build the Python Backend Binary
Open Terminal and run:
```bash
# Navigate to the backend directory
cd bulkreach/backend

# Create virtual environment and activate
python3 -m venv venv
source venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Build backend (generates dist/desktop_entry/ and C sidecar wrapper)
python build_backend.py
```

#### 2. Build the Electron macOS App
Package the application into a DMG:
```bash
# Navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install

# Build the React app and package into macOS DMG
npm run electron:build
```
The compiled macOS bundle and DMG installer will be saved under `bulkreach/frontend/dist-electron/`.

---

## 🤖 Automated Builds via GitHub Actions (CI/CD)

To make packaging easy, a GitHub Actions workflow is configured in [build.yml](file://.github/workflows/build.yml) to automatically compile the backend and package the frontend installer for both operating systems.

- **Trigger**: Pushing to the `main` or `master` branch, or via manual run (`workflow_dispatch` on the GitHub Actions tab).
- **Outputs**:
  - `bulkreach-macos` artifact containing the macOS `.dmg`
  - `bulkreach-windows` artifact containing the Windows installer `.exe`
