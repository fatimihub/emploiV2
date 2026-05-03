export const logger = {
    info: (message: string) => console.log(`[INFO] ${new Date().toISOString()}: ${message}`),
    warn: (message: string) => console.log(`[WARN] ${new Date().toISOString()}: ${message}`),
    error: (message: string, error?: any) => {
        console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
        if (error) console.error(error);
    },
    debug: (message: string) => {
        if (process.env.DEBUG) console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`);
    },
    step: (stepNumber: number, description: string) => 
        console.log(`\n--- Step ${stepNumber}: ${description} ---`)
};
