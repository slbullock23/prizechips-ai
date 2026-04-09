import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  shell,
} from "electron";
import { autoUpdater } from "electron-updater";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as http from "http";

// ── Constants ────────────────────────────────────────────────────────────────

const APP_URL = "http://localhost:3000";
const HEALTH_URL = "http://localhost:8000/health";
const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 120_000; // 2 minutes

// ── State ────────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let composeProcess: ChildProcess | null = null;
let isQuitting = false;

// ── Paths ────────────────────────────────────────────────────────────────────

function getComposePath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "docker-compose.yml")
    : path.join(__dirname, "..", "docker-compose.yml");
}

function getAssetPath(filename: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "assets", filename)
    : path.join(__dirname, "assets", filename);
}

// ── Docker Compose ───────────────────────────────────────────────────────────

function runDockerCompose(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const extraPaths = [
      "/usr/local/bin",
      "/opt/homebrew/bin",
      "/Applications/Docker.app/Contents/Resources/bin",
    ].join(":");
    const proc = spawn("docker", ["compose", "-f", getComposePath(), ...args], {
      stdio: "pipe",
      env: { ...process.env, PATH: `${extraPaths}:${process.env.PATH ?? ""}` },
    });

    proc.stderr?.on("data", (data) => {
      console.error("[docker]", data.toString().trim());
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`docker compose exited with code ${code}`));
    });
  });
}

async function startServices(): Promise<void> {
  console.log("Starting Docker services...");
  await runDockerCompose(["up", "-d", "--pull", "missing"]);
}

async function stopServices(): Promise<void> {
  console.log("Stopping Docker services...");
  await runDockerCompose(["down"]);
}

// ── Health polling ───────────────────────────────────────────────────────────

function ping(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    http
      .get(url, (res) => resolve(res.statusCode === 200))
      .on("error", () => resolve(false));
  });
}

async function waitForBackend(): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const ok = await ping(HEALTH_URL);
    if (ok) return;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("Backend did not become healthy within 2 minutes.");
}

// ── Windows ──────────────────────────────────────────────────────────────────

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    webPreferences: { contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, "splash.html"));
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.once("ready-to-show", () => {
    splashWindow?.close();
    splashWindow = null;
    mainWindow?.show();
  });

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

// ── Tray ─────────────────────────────────────────────────────────────────────

function createTray(): void {
  const iconPath = getAssetPath("tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("PrizeChips");

  const menu = Menu.buildFromTemplate([
    {
      label: "Open PrizeChips",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: "separator" },
    {
      label: "Open in Browser",
      click: () => shell.openExternal(APP_URL),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.handle("get-app-version", () => app.getVersion());

// ── App lifecycle ─────────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

app.whenReady().then(async () => {
  createSplashWindow();
  createTray();

  try {
    await startServices();
    await waitForBackend();
    createMainWindow();
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.error("Startup failed:", err);
    splashWindow?.webContents.executeJavaScript(
      `document.getElementById('status').textContent = 'Startup failed: ${String(err).replace(/'/g, "\\'")}';`
    );
  }
});

app.on("activate", () => {
  mainWindow?.show();
  mainWindow?.focus();
});

app.on("before-quit", async (e) => {
  if (!isQuitting) return;
  e.preventDefault();
  isQuitting = true;
  tray?.destroy();
  await stopServices().catch(console.error);
  app.exit(0);
});

app.on("window-all-closed", () => {
  // Keep app running in tray (macOS/Linux convention)
  // On Windows, some users expect quit on all-windows-closed — adjust if needed
});
