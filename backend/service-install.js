const { Service } = require('node-windows');
const path = require('path');

const { getUserDataDir } = require('./helpers/databasePath');

// Create a new service object
const svc = new Service({
  name: 'TimetableGeneratorBackend',
  description: 'Timetable Generator backend API service',
  script: path.join(__dirname, 'index.js'),
  workingDirectory: __dirname,
  nodePath: process.execPath, // Use Electron as the Node runner for ABI compatibility
  env: [
    {
      name: "PORT",
      value: "8002"
    },
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "ELECTRON_RUN_AS_NODE",
      value: "1"
    }
  ],
  logpath: getUserDataDir()
});

console.log('Installing TimetableGeneratorBackend service...');

// Set a timeout for the entire installation/start process to avoid hanging
const totalTimeout = setTimeout(() => {
  console.warn('Service installation/start timed out after 45 seconds. Continuing anyway...');
  process.exit(0); // Exit with 0 to allow installer to proceed
}, 45000);

svc.on('install', function() {
  console.log('Service installation complete.');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('Service is already installed.');
  clearTimeout(totalTimeout);
  process.exit(0);
});

svc.on('start', function() {
  console.log('Service started successfully.');
  clearTimeout(totalTimeout);
  process.exit(0);
});

svc.on('error', function(err) {
  console.error('Service installation/start error:', err);
  clearTimeout(totalTimeout);
  // We exit with 0 even on error during install to avoid blocking the main app installation.
  // The app has a fallback mechanism to run the backend as a standard child process if the service fails.
  process.exit(0); 
});

svc.install();

module.exports = {
  uninstall: function() {
    svc.uninstall();
  }
};
