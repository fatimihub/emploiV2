import { app, BrowserWindow, Menu, dialog, screen, utilityProcess } from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
let win;
let backendProcess = null;
function logInfo(message) {
  const formattedMessage = `[${(/* @__PURE__ */ new Date()).toISOString()}] [Main] ${message}`;
  if (!app.isPackaged || process.env.IS_TEST === "true") ;
  try {
    let baseDir;
    if (process.platform === "win32") {
      if (app.isPackaged) {
        baseDir = process.env.ProgramData || process.env.ALLUSERSPROFILE || "C:\\ProgramData";
      } else {
        baseDir = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Local");
      }
    } else {
      baseDir = path.join(process.env.HOME || "", ".config");
    }
    const userDataDir = path.join(baseDir, "TimetableGenerator");
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    const logPath = path.join(userDataDir, "backend-startup.log");
    fs.appendFileSync(logPath, formattedMessage + "\n");
  } catch (e) {
  }
}
function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}
function startBackend() {
  var _a, _b;
  let backendPath;
  if (app.isPackaged) {
    backendPath = path.normalize(path.join(process.resourcesPath, "backend", "index.js"));
  } else {
    backendPath = path.normalize(path.join(__dirname$1, "..", "backend", "index.js"));
  }
  logInfo(`Starting backend from: ${backendPath}`);
  if (!fs.existsSync(backendPath)) {
    logInfo(`CRITICAL: Backend file not found at ${backendPath}`);
    return;
  }
  backendProcess = utilityProcess.fork(backendPath, [], {
    env: {
      ...process.env,
      PORT: "8002",
      NODE_ENV: app.isPackaged ? "production" : "development"
    },
    stdio: "pipe"
  });
  (_a = backendProcess.stdout) == null ? void 0 : _a.on("data", (data) => logInfo(`[Backend Output] ${data.toString()}`));
  (_b = backendProcess.stderr) == null ? void 0 : _b.on("data", (data) => logInfo(`[Backend Error] ${data.toString()}`));
  backendProcess.on("spawn", () => logInfo("Backend process spawned successfully"));
  backendProcess.on("exit", (code) => logInfo(`Backend process exited with code ${code}`));
}
function createWindow() {
  logInfo("createWindow: Starting...");
  let width = 1200;
  let height = 800;
  try {
    logInfo("createWindow: Detecting screen...");
    const primaryDisplay = screen.getPrimaryDisplay();
    if (primaryDisplay && primaryDisplay.workAreaSize) {
      width = primaryDisplay.workAreaSize.width;
      height = primaryDisplay.workAreaSize.height;
      logInfo(`createWindow: Screen detected: ${width}x${height}`);
    }
  } catch (e) {
    console.warn("createWindow: Could not detect screen size, using default dimensions", e);
  }
  logInfo("createWindow: Initializing BrowserWindow...");
  win = new BrowserWindow({
    width,
    height,
    icon: app.isPackaged ? path.join(__dirname$1, "..", "dist", "logo.png") : path.join(__dirname$1, "..", "public", "logo.png"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false
    }
  });
  if (process.env.IS_TEST !== "true") {
    logInfo("createWindow: Maximizing window...");
    win.maximize();
  }
  logInfo("createWindow: Showing window...");
  win.show();
  win.webContents.on("did-finish-load", () => {
    logInfo("createWindow: did-finish-load triggered");
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
    if (!app.isPackaged) ;
  });
  const loadingHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background-color:#f3f4f6;color:#1f2937;}.loader{border:4px solid #e5e7eb;border-top:4px solid #3b82f6;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin-bottom:20px;}@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}.container{display:flex;flex-direction:column;align-items:center;}</style></head><body><div class="container"><div class="loader"></div><h2>Connecting...</h2></div></body></html>`;
  logInfo("createWindow: Loading splash screen URL");
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml)}`);
}
function loadMainApp() {
  if (!win) return;
  const isDev = !app.isPackaged && process.env.IS_TEST !== "true";
  const loadPath = path.join(__dirname$1, "..", "dist", "index.html");
  logInfo(`loadMainApp: Loading App URL/File: ${loadPath}`);
  if (isDev) {
    win.loadURL(loadPath);
  } else {
    win.loadFile(loadPath);
  }
}
async function waitForBackend(port = 8002, timeoutMs = 6e4) {
  return new Promise((resolve, reject) => {
    if (!backendProcess) {
      return reject(new Error("Backend process not spawned"));
    }
    const timeout = setTimeout(() => {
      reject(new Error(`Backend failed to signal readiness within ${timeoutMs}ms`));
    }, timeoutMs);
    const messageHandler = (message) => {
      if (message && message.type === "ready") {
        clearTimeout(timeout);
        logInfo(`[IPC] Backend reported ready on port ${message.port || port}`);
        backendProcess == null ? void 0 : backendProcess.off("message", messageHandler);
        resolve(true);
      }
    };
    backendProcess.on("message", messageHandler);
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
  win = null;
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && win === null) {
    createWindow();
  }
});
app.setAppUserModelId("TimetableGenerator");
app.whenReady().then(async () => {
  logInfo("app: whenReady triggered");
  Menu.setApplicationMenu(null);
  if (process.argv.includes("--install-service")) {
    logInfo("app: --install-service flag detected. Running post-install script...");
    if (process.env.CI === "true") {
      logInfo("app: CI environment detected. Skipping service registration for installer hook.");
      app.exit(0);
      return;
    }
    try {
      const scriptPath = app.isPackaged ? path.join(process.resourcesPath, "app.asar.unpacked", "scripts", "post-install-service.cjs") : path.join(__dirname$1, "..", "scripts", "post-install-service.cjs");
      logInfo(`app: Loading script from: ${scriptPath}`);
      const { default: installService } = await import(pathToFileURL(scriptPath).href);
      await installService();
      logInfo("app: Service installation completed successfully.");
      app.exit(0);
    } catch (err) {
      logInfo(`app: Service installation failed: ${err}`);
      app.exit(1);
    }
    return;
  }
  if (process.argv.includes("--uninstall-service")) {
    logInfo("app: --uninstall-service flag detected. Running pre-uninstall script...");
    try {
      const scriptPath = app.isPackaged ? path.join(process.resourcesPath, "app.asar.unpacked", "scripts", "pre-uninstall-service.cjs") : path.join(__dirname$1, "..", "scripts", "pre-uninstall-service.cjs");
      logInfo(`app: Loading script from: ${scriptPath}`);
      const { default: uninstallService } = await import(pathToFileURL(scriptPath).href);
      await uninstallService();
      logInfo("app: Service uninstallation completed successfully.");
      app.exit(0);
    } catch (err) {
      logInfo(`app: Service uninstallation failed: ${err}`);
      app.exit(1);
    }
    return;
  }
  logInfo("app: Creating window...");
  createWindow();
  logInfo("app: Spawning backend process...");
  startBackend();
  try {
    logInfo("app: Waiting for backend to be ready...");
    await waitForBackend(8002, 6e4);
    logInfo("app: Backend reported ready!");
    loadMainApp();
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logInfo(`app: Backend error: ${errorMessage}`);
    if (process.env.IS_TEST !== "true") {
      const baseDir = process.platform === "win32" ? process.env.ProgramData || "C:\\ProgramData" : path.join(process.env.HOME || "", ".config");
      const logFilePath = path.join(baseDir, "TimetableGenerator", "backend-startup.log");
      const response = dialog.showMessageBoxSync({
        type: "error",
        title: "Backend Startup Error",
        message: "The Timetable Generator backend failed to start.",
        detail: `Error: ${errorMessage}

Please check the log file at:
${logFilePath}`,
        buttons: ["Retry", "Quit"],
        defaultId: 0,
        cancelId: 1
      });
      if (response === 0) {
        logInfo("User clicked Retry. Restarting...");
        stopBackend();
        startBackend();
        try {
          await waitForBackend(8002, 6e4);
          logInfo("app: Backend reported ready after retry!");
          loadMainApp();
        } catch (retryErr) {
          logInfo(`app: Retry failed: ${retryErr}`);
          app.quit();
        }
      } else {
        app.quit();
      }
    } else {
      app.quit();
    }
  }
});
app.on("before-quit", stopBackend);
app.on("will-quit", stopBackend);
process.on("exit", stopBackend);
process.on("SIGINT", stopBackend);
process.on("SIGTERM", stopBackend);
