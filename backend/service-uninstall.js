const { Service } = require('node-windows');
const path = require('path');

// Create a new service object with the same parameters
const svc = new Service({
  name: 'TimetableGeneratorBackend',
  description: 'Timetable Generator backend API service',
  script: path.join(__dirname, 'index.js')
});

// Set a timeout for the uninstallation process to avoid hanging
const totalTimeout = setTimeout(() => {
  console.warn('Service uninstallation timed out after 30 seconds. Continuing anyway...');
  process.exit(0); // Exit with 0 to allow uninstaller to proceed
}, 30000);

svc.on('uninstall', function() {
  console.log('TimetableGeneratorBackend service uninstalled successfully.');
  clearTimeout(totalTimeout);
  process.exit(0);
});

svc.on('error', function(err) {
  console.error('Service uninstallation error:', err);
  clearTimeout(totalTimeout);
  // We exit with 0 even on error to avoid blocking the uninstaller
  process.exit(0); 
});

console.log('Uninstalling TimetableGeneratorBackend service...');
svc.uninstall();
