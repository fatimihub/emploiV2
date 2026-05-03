import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/env.config';
import { logger } from './logger';

export const dbCleaner = {
    cleanDevDatabase: () => {
        const dbDir = config.paths.databaseDir;
        if (fs.existsSync(dbDir)) {
            logger.info(`Cleaning existing database files in ${dbDir}...`);
            const files = fs.readdirSync(dbDir);
            for (const file of files) {
                if (file.startsWith('database.sqlite')) {
                    try {
                        const filePath = path.join(dbDir, file);
                        fs.unlinkSync(filePath);
                        logger.debug(`Deleted: ${file}`);
                    } catch (e) {
                        logger.error(`Failed to delete ${file}`, e);
                    }
                }
            }
        }

        // Also clean the migrations_done flag so migrations re-run on fresh DB
        const userDataDir = config.paths.userDataDir;
        if (fs.existsSync(userDataDir)) {
            const migrationFlag = path.join(userDataDir, '.migrations_done');
            if (fs.existsSync(migrationFlag)) {
                try {
                    fs.unlinkSync(migrationFlag);
                    logger.debug('Deleted .migrations_done flag.');
                } catch (e) {
                    logger.error('Failed to delete .migrations_done flag', e);
                }
            }
        }
    }
};
