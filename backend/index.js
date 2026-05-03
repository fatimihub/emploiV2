const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const { getDatabasePath, getUserDataDir } = require('./helpers/databasePath');

// Load environment variables early
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env-example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  try { fs.copyFileSync(envExamplePath, envPath); } catch (e) {}
}
require("dotenv").config({ path: envPath });

// Performance imports (kept at top)
const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const { Sequelize } = require('sequelize');

// Setup logging
const userDataDir = getUserDataDir();
const logPath = path.join(userDataDir, 'backend-startup.log');

function log(message, isError = false) {
  const isProduction = process.env.NODE_ENV === 'production';
  const loggingEnabled = process.env.ENABLE_LOGS === 'true';

  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  if (isError || loggingEnabled) {
    try {
      if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
      fs.appendFileSync(logPath, logMessage);
    } catch (e) {}
  }
  
  if (!isProduction || isError || loggingEnabled || process.argv.includes('--migrate-only')) {
    console.log(message);
  }
}

function killProcessesOnPort(port) {
  return new Promise((resolve) => {
    const platform = process.platform;
    const currentPid = process.pid;
    
    let command = platform === 'win32'
      ? `cmd.exe /c "for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :${port} ^| findstr LISTENING') do if not \"%a\"==\"${currentPid}\" taskkill /F /PID %a"`
      : `lsof -ti:${port} | grep -v ${currentPid} | xargs -r kill -9`;

    const timeout = setTimeout(() => resolve(), 3000);
    exec(command, (error) => {
      clearTimeout(timeout);
      resolve();
    });
  });
}


async function startServer(app, port, sequelize, databaseService, initializeDefaults) {
  try {
    // Always clean the port before starting to prevent EADDRINUSE errors
    // This handles stale processes from previous crashes or force-quits
    log(`Cleaning port ${port}...`);
    await killProcessesOnPort(port);

    await sequelize.authenticate();
    log('DB connected.');

    await databaseService.initializeOptimizations();
    try { await initializeDefaults(); } catch (e) {
      log(`Warning: Initial setting initialization failed: ${e.message}`);
    }

    app.listen(port, '127.0.0.1', () => {
      log(`Server running at http://127.0.0.1:${port}`, true);
      if (process.parentPort) process.parentPort.postMessage({ type: 'ready', port });
    });
  } catch (err) {
    log(`Startup error: ${err.stack}`, true);
    process.exit(1);
  }
}

async function main() {
  log('Backend starting...', true);
  try {
    // DEFERRED IMPORTS
    log('Loading models and routes...');
    const startLoad = Date.now();
    
    log('Loading models...');
    const { sequelize } = require("./models/index.js");
    log(`Models loaded in ${Date.now() - startLoad}ms`);

    // Run migrations before anything else
    log('Running database migrations...');
    try {
      const { runMigrations } = require('./run-migrations.js');
      await runMigrations();
      log('Migrations completed successfully.');
    } catch (migErr) {
      log(`Migration warning (continuing anyway): ${migErr.message}`, true);
    }
    
    const startServices = Date.now();
    log('Loading services...');
    const databaseService = require("./services/databaseService.js");
    log(`Services loaded in ${Date.now() - startServices}ms`);
    
    const startControllers = Date.now();
    log('Loading controllers...');
    const { initializeDefaults } = require('./controllers/SettingController.js');
    log(`Controllers loaded in ${Date.now() - startControllers}ms`);
    
    const startMiddleware = Date.now();
    log('Loading middleware...');
    const { authenticateJWT } = require('./middleware/auth.js');
    log(`Middleware loaded in ${Date.now() - startMiddleware}ms`);

    const startRoutes = Date.now();
    log('Loading routes...');
    const authRouter = require("./routes/api/v1/auth.js");
    log('authRouter loaded');
    const importDataRouter = require("./routes/api/v1/importData.js");
    log('importDataRouter loaded');
    const generateRouter = require("./routes/api/v1/generate.js");
    log('generateRouter loaded');
    const classroomRouter = require("./routes/api/v1/classroom.js");
    const timetableFormateurRouter = require("./routes/api/v1/timetableFormateur.js");
    const groupRouter = require('./routes/api/v1/group.js');
    const branchRouter = require('./routes/api/v1/branch.js');
    const mergeRouter = require('./routes/api/v1/merge.js');
    const timetableGroupRouter = require('./routes/api/v1/timetableGroup.js');
    const timetableActiveFormateurRouter = require("./routes/api/v1/timetableActiveFormateur.js");
    const timetableActiveClassroomRouter = require("./routes/api/v1/timetableClassroom.js");
    const historicTimetablesRouter = require("./routes/api/v1/timetableHistoric.js");
    const groupsEnStageRouter = require("./routes/api/v1/groupsEnStage.js");
    const formateurRouter = require("./routes/api/v1/formateur.js");
    const settingRouter = require("./routes/api/v1/setting.js");
    log(`All routes loaded in ${Date.now() - startRoutes}ms`);
    log(`Total loading time: ${Date.now() - startLoad}ms`);

    const app = express();
    const PORT = process.env.PORT || 8002;
    const API_V1 = "/api/v1";

    // Middleware
    app.use(compression());
    app.use(helmet({ 
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false
    }));
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
    
    const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.IS_TEST === 'true';
    const corsOptions = {
      origin: isDevOrTest ? true : "http://127.0.0.1:5173",
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      credentials: true
    };
    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static & Health
    app.use('/uploads/admin-images', cors({ origin: '*' }), express.static(path.resolve(__dirname, 'uploads/admin-images'), {
      setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }));
    app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

    // Routes
    app.use(API_V1, authRouter);
    app.use(API_V1, branchRouter);
    app.use(API_V1, settingRouter);

    const protectedRouters = [
      importDataRouter, generateRouter, classroomRouter,
      timetableFormateurRouter, groupRouter, mergeRouter, timetableGroupRouter,
      timetableActiveFormateurRouter, timetableActiveClassroomRouter,
      historicTimetablesRouter, groupsEnStageRouter, formateurRouter
    ];
    protectedRouters.forEach(r => app.use(API_V1, authenticateJWT, r));

    // Error handler
    app.use((err, req, res, next) => {
      log(`App Error: ${err.message}`, true);
      res.status(500).json({ error: 'Internal Server Error' });
    });

    // Graceful Shutdown
    const shutdown = async () => {
      log('Shutdown initiated...');
      try { await sequelize.close(); } catch (e) {}
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    await startServer(app, PORT, sequelize, databaseService, initializeDefaults);
  } catch (err) {
    log(`Fatal Error: ${err.stack}`, true);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled Error:', err);
  process.exit(1);
});