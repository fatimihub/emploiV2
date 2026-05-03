const { spawn } = require('child_process');
const path = require('path');

async function uninstallService() {
  if (process.platform !== 'win32') {
    return;
  }

  if (process.env.SKIP_SERVICE_INSTALL === 'true') {
    return;
  }

  let serviceUninstallPath;
  if (process.resourcesPath) {
    serviceUninstallPath = path.join(process.resourcesPath, 'backend', 'service-uninstall.js');
  } else {
    serviceUninstallPath = path.join(__dirname, '..', 'backend', 'service-uninstall.js');
  }

  return new Promise((resolve, reject) => {
    const nodePath = process.execPath;
    const env = { 
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1'
    };
    const child = spawn(nodePath, [serviceUninstallPath], { 
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env,
      cwd: path.dirname(serviceUninstallPath)
    });
    child.stdout.on('data', (data) => console.log(`[Uninstall] ${data}`));
    child.stderr.on('data', (data) => console.error(`[Uninstall Error] ${data}`));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else {
        console.warn(`Uninstallation process exited with code ${code}.`);
        resolve(); // Resolve to not block uninstaller
      }
    });
    child.on('error', (err) => reject(err));
  });
}

exports.default = uninstallService;

if (require.main === module) {
  uninstallService().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
