/// <reference path="../types.d.ts" />
import { validate } from "jsonschema";
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Validates the configuration file and returns the object or null
 * @param {string} configPath Path to the configuration file
 * @returns {Promise<AppServer.ServerConfig?>}
 * 
 * @todo Allow URL schema paths
 */
async function Validate(configPath) {
    try {
        let configContent = await fs.readFile(configPath, { encoding: 'utf-8' });
        let config = JSON.parse(configContent);
        let schemaContent = await fs.readFile(path.join(path.dirname(configPath), config['$schema']), {encoding: 'utf-8'});
        let schema = JSON.parse(schemaContent);
        let validationResult = validate(config, schema);
        if (validationResult.errors.length == 0) {
            return config;
        }

        for (let error of validationResult.errors) {
            let error_path = error.path.join('.'); 
            error_path = error_path == '' ? 'config' : 'config.' + error_path;
            console.error(`ERROR: ${error_path} ${error.message}`)
        }
    } catch {}
    return null;
}

export { Validate }