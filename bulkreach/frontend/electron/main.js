import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let sidecarProcess = null;

function spawnSidecar() {
  const isDev = !app.isPackaged;
  let sidecarPath;
  let sidecarCwd;
  const exeExt = process.platform === "win32" ? ".exe" : "";

  if (isDev) {
    // In development, execute the PyInstaller desktop_entry binary directly
    sidecarPath = path.join(app.getAppPath(), "..", "backend", "dist", "desktop_entry", `desktop_entry${exeExt}`);
    sidecarCwd = path.join(app.getAppPath(), "..", "backend");
  } else {
    // In production, electron-builder copies backend/dist/desktop_entry folder to resources/desktop_entry
    sidecarPath = path.join(process.resourcesPath, "desktop_entry", `desktop_entry${exeExt}`);
    sidecarCwd = path.join(process.resourcesPath, "desktop_entry");
  }

  console.log(`Starting sidecar from path: ${sidecarPath} with cwd: ${sidecarCwd}`);

  if (!fs.existsSync(sidecarPath)) {
    console.error(`Sidecar binary not found at ${sidecarPath}`);
    return;
  }

  try {
    // Ensure the sidecar is executable (macOS/Linux only)
    if (process.platform !== "win32") {
      fs.chmodSync(sidecarPath, "755");
    }
  } catch (err) {
    console.warn(`Could not chmod sidecar:`, err);
  }

  sidecarProcess = spawn(sidecarPath, [], {
    stdio: "pipe",
    cwd: sidecarCwd,
    env: { ...process.env },
  });

  sidecarProcess.stdout.on("data", (data) => {
    console.log(`🤖 [Backend]: ${data.toString().trim()}`);
  });

  sidecarProcess.stderr.on("data", (data) => {
    console.error(`🤖 [Backend Error]: ${data.toString().trim()}`);
  });

  sidecarProcess.on("close", (code) => {
    console.log(`🤖 [Backend] process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // frameless window
    icon: path.join(__dirname, "../build/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged || process.defaultApp;
  console.log(`[Electron] app.isPackaged: ${app.isPackaged}, isDev: ${isDev}`);
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    // Open devtools in development on startup (disabled by default)
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Maximize / Unmaximize event listeners
  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window-maximize-changed", true);
  });
  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window-maximize-changed", false);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC registration
ipcMain.handle("window-minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle("window-maximize-toggle", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle("window-close", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle("window-is-maximized", () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle("open-devtools", () => {
  if (mainWindow) mainWindow.webContents.openDevTools();
});

ipcMain.handle("open-external", async (event, url) => {
  await shell.openExternal(url);
});

app.whenReady().then(() => {
  spawnSidecar();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (sidecarProcess) {
    console.log("Terminating backend sidecar...");
    sidecarProcess.kill();
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (sidecarProcess) {
    console.log("Terminating backend sidecar before quit...");
    sidecarProcess.kill();
  }
});
