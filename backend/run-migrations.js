/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { getDatabasePath, getUserDataDir } = require('./helpers/databasePath');

const userDataDir = getUserDataDir();

function log(message) {
  const logMessage = `[${new Date().toISOString()}] [Migration] ${message}\n`;
  try {
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
    fs.appendFileSync(path.join(userDataDir, 'backend-startup.log'), logMessage);
  } catch (e) {}
  console.log(message);
}

const dbFile = getDatabasePath();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbFile,
  logging: false,
  define: { timestamps: true, underscored: true },
  dialectOptions: { timeout: 30000 }
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js'))
    .sort();

  const countFlag = path.join(userDataDir, '.migrations_count');
  const dbExists = fs.existsSync(dbFile);
  
  // Fast path: if DB exists and migration count matches, skip everything
  if (dbExists && fs.existsSync(countFlag)) {
    const lastCount = parseInt(fs.readFileSync(countFlag, 'utf8'), 10);
    if (lastCount === migrationFiles.length) {
      log('Migration count matches. Skipping database connection for migrations.');
      return;
    }
  }

  log('Starting database migration process...');
  log(`Found ${migrationFiles.length} migration files.`);

  await sequelize.authenticate();
  log('Database connection established.');

  const queryInterface = sequelize.getQueryInterface();
  
  // Ensure SequelizeMeta table exists to track migrations
  await queryInterface.createTable('SequelizeMeta', {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true
    }
  }).catch(() => {}); // Table might already exist

  // Get already applied migrations
  const [results] = await sequelize.query('SELECT name FROM SequelizeMeta');
  const appliedMigrations = results.map(r => r.name);
  log(`${appliedMigrations.length} migrations already applied.`);

  for (const file of migrationFiles) {
    if (appliedMigrations.includes(file)) {
      continue;
    }

    try {
      log(`Applying migration ${file}...`);
      const migration = require(path.join(migrationsDir, file));
      await migration.up(queryInterface, Sequelize);
      
      // Track migration in SequelizeMeta
      await sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (?)', {
        replacements: [file],
        type: Sequelize.QueryTypes.INSERT
      });
      
      log(`Migration ${file} applied.`);
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        log(`Migration ${file} error: ${err.message}`);
        throw err; // Stop on unexpected error
      } else {
        log(`Migration ${file} skipped (already exists in schema but not in SequelizeMeta).`);
        // We should still track it if it seems to exist
        try {
          await sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (?)', {
            replacements: [file],
            type: Sequelize.QueryTypes.INSERT
          });
        } catch (e) {}
      }
    }
  }

  log('All migrations finished.');
  
  // Update count flag
  try { fs.writeFileSync(countFlag, migrationFiles.length.toString()); } catch (e) {}
  
  await sequelize.close();
}

module.exports = { runMigrations, getDatabasePath, getUserDataDir };

if (require.main === module) {
  log(`Using database file: ${dbFile}`);
  runMigrations().then(() => {
    log('Migration script completed successfully.');
    process.exit(0);
  }).catch(err => {
    log(`Fatal Migration Error: ${err.stack}`);
    process.exit(1);
  });
}