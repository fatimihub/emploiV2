import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export const config = {
    env: process.env.NODE_ENV || 'development',
    isTest: process.env.IS_TEST === 'true',
    port: process.env.PORT || 8002,
    baseUrl: 'http://127.0.0.1:5173',
    backendUrl: 'http://127.0.0.1:8002/api/v1',
    timeouts: {
        launch: 180000,
        action: 15000,
        navigation: 30000,
    },
    paths: {
        rootDir,
        electronMain: path.join(rootDir, 'dist-electron', 'main.js'),
        executablePath: process.env.EXECUTABLE_PATH || (process.platform === 'win32' 
            ? path.join(rootDir, 'dist', 'win-unpacked', 'Timetable Generator.exe')
            : path.join(rootDir, 'dist', 'linux-unpacked', 'timetable-generator')),
        databaseDir: process.platform === 'win32'
            ? path.join(os.tmpdir(), 'TimetableGeneratorTest', 'TimetableGenerator')
            : path.join(rootDir, 'backend', 'database'),
        userDataDir: process.platform === 'win32'
            ? path.join(os.tmpdir(), 'TimetableGeneratorTest', 'TimetableGenerator')
            : path.join(os.homedir(), '.config', 'TimetableGenerator'),
    },
    testBuiltApp: process.env.TEST_BUILT_APP === 'true'
};
