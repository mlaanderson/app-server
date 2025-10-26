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
import { fileURLToPath, pathToFileURL, URL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Converts a path or URL into a known URL
 * @param {string} path Known path or URL
 * @returns {URL}
 */
function toUrl(path) {
    try {
        let result = new URL(path);
        if (result.protocol.length <= 2) {
            // windows drive
            return pathToFileURL(path);
        }
        return result;
    } catch {
        // relative path
        return pathToFileURL(path.join(__dirname, path));
    }
}

const FAILOVER_SCHEMA = "https://raw.githubusercontent.com/mlaanderson/app-server/refs/heads/main/lib/config.schema.json";

/**
 * Validates the configuration file and returns the object or null
 * @param {string} configPath Path to the configuration file
 * @returns {Promise<AppServer.ServerConfig?>}
 * 
 * @todo Allow URL schema paths
 */
async function Validate(configPath) {
    try {
        // get the config JSON
        let configContent = await fs.readFile(configPath, { encoding: 'utf-8' });
        let config = JSON.parse(configContent);
        if (!config.$schema) {
            config.$schema = FAILOVER_SCHEMA;
        }

        // load the schema path
        let schemaURL = toUrl(config.$schema);
        let schemaContent;
        if (schemaURL.protocol == 'file:') {
            let schemaPath = fileURLToPath(schemaURL);
            schemaContent = await fs.readFile(schemaPath, 'utf-8');
        } else {
            let response = await fetch(schemaURL.href);
            schemaContent = await response.text();
        }
        let schema = JSON.parse(schemaContent);

        // Validate the configuration
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