const { spawn } = require('child_process');
const path = require('path');

async function installService() {
  if (process.platform !== 'win32') {
    return;
  }

  if (process.env.SKIP_SERVICE_INSTALL === 'true') {
    console.log('Skipping service install due to SKIP_SERVICE_INSTALL=true');
    return;
  }

  let serviceInstallPath;
  let backendMigrationsPath;
  if (process.resourcesPath) {
    serviceInstallPath = path.join(process.resourcesPath, 'backend', 'service-install.js');
    backendMigrationsPath = path.join(process.resourcesPath, 'backend', 'run-migrations.js');
  } else {
    serviceInstallPath = path.join(__dirname, '..', 'backend', 'service-install.js');
    backendMigrationsPath = path.join(__dirname, '..', 'backend', 'run-migrations.js');
  }

  console.log('Running initial database migrations...');
  await new Promise((resolve) => {
    // In packaged app, use the bundled Electron executable as a Node runner
    const nodePath = process.execPath;
    const env = { 
      ...process.env, 
      NODE_ENV: 'production',
      ELECTRON_RUN_AS_NODE: '1'
    };

    const migrate = spawn(nodePath, [backendMigrationsPath], { 
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env,
      cwd: path.dirname(backendMigrationsPath) // Ensure we run from the backend directory
    });

    // Set a 5-minute timeout for migrations to prevent installer hang
    const timeout = setTimeout(() => {
      console.warn('Migration process timed out after 5 minutes. Killing...');
      migrate.kill();
      resolve();
    }, 5 * 60 * 1000);

    migrate.stdout.on('data', (data) => console.log(`[Migration] ${data}`));
    migrate.stderr.on('data', (data) => console.error(`[Migration Error] ${data}`));

    migrate.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        console.log('Migrations completed successfully.');
      } else {
        console.warn(`Migration process exited with code ${code}. Initial setup might be incomplete.`);
      }
      resolve();
    });
    migrate.on('error', (err) => {
      clearTimeout(timeout);
      console.error('Failed to start migration process:', err);
      resolve();
    });
  });

  console.log('Installing Windows Service...');
  return new Promise((resolve, reject) => {
    const nodePath = process.execPath;
    const env = { 
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1'
    };
    const child = spawn(nodePath, [serviceInstallPath], { 
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env,
      cwd: path.dirname(serviceInstallPath) // Ensure we run from the backend directory
    });

    // Set a 5-minute timeout for service installation to prevent installer hang
    const timeout = setTimeout(() => {
      console.warn('Service installation timed out after 5 minutes. Killing...');
      child.kill();
      resolve(); // Resolve anyway to let installer finish
    }, 5 * 60 * 1000);

    child.stdout.on('data', (data) => console.log(`[ServiceInstall] ${data}`));
    child.stderr.on('data', (data) => console.error(`[ServiceInstall Error] ${data}`));

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        console.log('Service installation process completed.');
        resolve();
      } else {
        console.warn(`Service installation process exited with code ${code}.`);
        // For installer, we resolve instead of reject to avoid blocking the whole installation
        // if the service part fails (the app can still try to run in fallback mode)
        resolve(); 
      }
    });
    child.on('error', (err) => {
      clearTimeout(timeout);
      console.error('Failed to start service installation process:', err);
      resolve();
    });
  });
}

exports.default = installService;

if (require.main === module) {
  installService().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
