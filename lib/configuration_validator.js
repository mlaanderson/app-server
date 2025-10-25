/// <reference path="../types.d.ts" />
/**
 * Copyright 2025 Michael Anderson
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the “Software”), to deal in the
 * Software without restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies
 * or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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