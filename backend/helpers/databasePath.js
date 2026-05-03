const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Normalizes a path for use in the application.
 * On Windows, it handles the long-path prefix (\\?\) correctly by preserving backslashes 
 * for such paths, as mixed slashes can cause native module loading errors.
 * 
 * @param {string} p The path to normalize.
 * @returns {string} The normalized path.
 */
function normalizePath(p) {
  if (!p) return p;
  
  // Use official path.normalize first
  let normalized = path.normalize(p);
  
  // On Windows, if it's a long path prefix, KEEP backslashes.
  // Otherwise, we can use forward slashes for SQLite if we really want to,
  // but backslashes are generally safer for local FS operations on Windows.
  if (process.platform === 'win32' && normalized.startsWith('\\\\?\\')) {
    return normalized;
  }

  // For other cases, we use the platform's native separator
  return normalized;
}

/**
 * Returns the user data directory for the application.
 * Follows platform conventions: %LOCALAPPDATA% on Windows, ~/.config on Linux/macOS.
 * @returns {string} The normalized absolute path to the user data directory.
 */
function getUserDataDir() {
  const isTest = process.env.IS_TEST === 'true';
  const isProduction = (process.env.NODE_ENV || 'development').trim().toLowerCase() === 'production';
  
  let baseDir;
  if (process.platform === 'win32') {
    if (isTest) {
      // In tests, use a local temp dir to avoid permission issues and collisions
      baseDir = path.join(os.tmpdir(), 'TimetableGeneratorTest');
    } else if (isProduction) {
      baseDir = process.env.ProgramData || process.env.ALLUSERSPROFILE || 'C:\\ProgramData';
    } else {
      baseDir = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    }
  } else {
    baseDir = path.join(os.homedir(), '.config');
  }

  const userDataDir = path.join(baseDir, 'TimetableGenerator');
  if (!fs.existsSync(userDataDir)) {
    try {
      fs.mkdirSync(userDataDir, { recursive: true });
    } catch (e) {
      if (process.platform === 'win32' && !isTest) {
        return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'TimetableGenerator');
      }
    }
  }
  return normalizePath(userDataDir);
}

function getDatabasePath() {
  const isTest = process.env.IS_TEST === 'true';
  const env = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  
  if (isTest) {
    // Force a specific test database path that the cleaner can easily find
    const uDir = getUserDataDir();
    return normalizePath(path.join(uDir, 'database.sqlite'));
  }

  if (env === 'production') {
    const uDir = getUserDataDir();
    return normalizePath(path.join(uDir, 'database.sqlite'));
  } else {
    const dbDir = path.resolve(__dirname, '../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    return normalizePath(path.join(dbDir, 'database.sqlite'));
  }
}

module.exports = { getDatabasePath, getUserDataDir };
