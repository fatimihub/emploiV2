import { app, BrowserWindow, Menu, screen, dialog, utilityProcess } from "electron";
import { type UtilityProcess } from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let win: BrowserWindow | null;
let backendProcess: UtilityProcess | null = null;

function logInfo(message: string) {
  const formattedMessage = `[${new Date().toISOString()}] [Main] ${message}`;
  
  // Console logging for dev/test
  if (!app.isPackaged || process.env.IS_TEST === 'true') {
    // console.log(formattedMessage);
  }

  // File logging for all modes (especially production diagnostics)
  try {
    let baseDir;
    if (process.platform === 'win32') {
      if (app.isPackaged) {
        baseDir = process.env.ProgramData || process.env.ALLUSERSPROFILE || 'C:\\ProgramData';
      } else {
        baseDir = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
      }
    } else {
      baseDir = path.join(process.env.HOME || '', '.config');
    }
    const userDataDir = path.join(baseDir, 'TimetableGenerator');
    
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    const logPath = path.join(userDataDir, 'backend-startup.log');
    fs.appendFileSync(logPath, formattedMessage + "\n");
  } catch (e) {}
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function startBackend() {
  // ALWAYS spawn the backend as a child process.
  // This is the simplest, most reliable approach.
  // The Windows Service is purely optional and handled separately by the installer.
  
  let backendPath: string;
  if (app.isPackaged) {
    backendPath = path.normalize(path.join(process.resourcesPath, "backend", "index.js"));
  } else {
    backendPath = path.normalize(path.join(__dirname, "..", "backend", "index.js"));
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
    stdio: 'pipe'
  });

  backendProcess.stdout?.on('data', (data) => logInfo(`[Backend Output] ${data.toString()}`));
  backendProcess.stderr?.on('data', (data) => logInfo(`[Backend Error] ${data.toString()}`));
  
  backendProcess.on('spawn', () => logInfo("Backend process spawned successfully"));
  backendProcess.on('exit', (code) => logInfo(`Backend process exited with code ${code}`));
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
    icon: app.isPackaged 
      ? path.join(__dirname, "..", "dist", "logo.png") 
      : path.join(__dirname, "..", "public", "logo.png"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
  });

  if (process.env.IS_TEST !== 'true') {
     logInfo("createWindow: Maximizing window...");
     win.maximize();
  }
  
  logInfo("createWindow: Showing window...");
  win.show();

  win.webContents.on("did-finish-load", () => {
    logInfo("createWindow: did-finish-load triggered");
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    
    // Open DevTools in development mode
    if (!app.isPackaged) {
      // win?.webContents.openDevTools();
      // logInfo("createWindow: DevTools opened");
    }
  });

  const loadingHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background-color:#f3f4f6;color:#1f2937;}.loader{border:4px solid #e5e7eb;border-top:4px solid #3b82f6;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin-bottom:20px;}@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}.container{display:flex;flex-direction:column;align-items:center;}</style></head><body><div class="container"><div class="loader"></div><h2>Connecting...</h2></div></body></html>`;
  logInfo("createWindow: Loading splash screen URL");
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml)}`);
}

function loadMainApp() {
  if (!win) return;
  const isDev = !app.isPackaged && process.env.IS_TEST !== 'true';
  //const loadPath = isDev ? "http://127.0.0.1:5173" : path.join(__dirname, "..", "dist", "index.html");
  
  const loadPath =path.join(__dirname, "..", "dist", "index.html");
  logInfo(`loadMainApp: Loading App URL/File: ${loadPath}`);
  
  if (isDev) {
    win.loadURL(loadPath);
  } else {
    win.loadFile(loadPath);
  }
}

// Wait for backend to be ready by listening for IPC message from utilityProcess
async function waitForBackend(port = 8002, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    if (!backendProcess) {
      return reject(new Error("Backend process not spawned"));
    }

    const timeout = setTimeout(() => {
      reject(new Error(`Backend failed to signal readiness within ${timeoutMs}ms`));
    }, timeoutMs);

    const messageHandler = (message: any) => {
      if (message && message.type === 'ready') {
        clearTimeout(timeout);
        logInfo(`[IPC] Backend reported ready on port ${message.port || port}`);
        backendProcess?.off('message', messageHandler);
        resolve(true);
      }
    };

    backendProcess.on('message', messageHandler);
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

  // Handle service management CLI flags for the installer
  if (process.argv.includes('--install-service')) {
    logInfo("app: --install-service flag detected. Running post-install script...");
    
    // Skip service installation in CI environments as it often fails/aborts silently
    if (process.env.CI === 'true') {
      logInfo("app: CI environment detected. Skipping service registration for installer hook.");
      app.exit(0);
      return;
    }
    try {
      const scriptPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'scripts', 'post-install-service.cjs')
        : path.join(__dirname, '..', 'scripts', 'post-install-service.cjs');
      
      logInfo(`app: Loading script from: ${scriptPath}`);
      // @ts-ignore
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

  if (process.argv.includes('--uninstall-service')) {
    logInfo("app: --uninstall-service flag detected. Running pre-uninstall script...");
    try {
      const scriptPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'scripts', 'pre-uninstall-service.cjs')
        : path.join(__dirname, '..', 'scripts', 'pre-uninstall-service.cjs');

      logInfo(`app: Loading script from: ${scriptPath}`);
      // @ts-ignore
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

  // --- NORMAL APP LAUNCH ---
  logInfo("app: Creating window...");
  createWindow();

  logInfo("app: Spawning backend process...");
  startBackend();

  try {
    logInfo("app: Waiting for backend to be ready...");

    await waitForBackend(8002, 60000);
    logInfo("app: Backend reported ready!");
    loadMainApp();
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logInfo(`app: Backend error: ${errorMessage}`);
    
    if (process.env.IS_TEST !== 'true') {
      const baseDir = process.platform === 'win32' 
        ? (process.env.ProgramData || 'C:\\ProgramData') 
        : path.join(process.env.HOME || '', '.config');
      const logFilePath = path.join(baseDir, 'TimetableGenerator', 'backend-startup.log');

      const response = dialog.showMessageBoxSync({
        type: 'error',
        title: 'Backend Startup Error',
        message: 'The Timetable Generator backend failed to start.',
        detail: `Error: ${errorMessage}\n\nPlease check the log file at:\n${logFilePath}`,
        buttons: ['Retry', 'Quit'],
        defaultId: 0,
        cancelId: 1
      });
      
      if (response === 0) {
        logInfo("User clicked Retry. Restarting...");
        stopBackend();
        startBackend();
        try {
          await waitForBackend(8002, 60000);
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
