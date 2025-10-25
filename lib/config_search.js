/// <reference path="../types.d.ts" />

import fs from 'node:fs/promises';

/**
 * 
 * @param {string[]} strings 
 * @param  {...string} values 
 */
function Env(strings, ...values) {
    let result = '';
    for (let n = 0; n < strings.length; n++) {
        result += strings[n];
        if (n < values.length) {
            if (values[n] in process.env) {
                result += process.env[values[n]];
            } else {
                return '';
            }
        }
    }
    return result;
}

/**
 * Searches a set of paths to find the first configuration file
 * @param {string[]} paths 
 * @returns {Promise<string>}
 */
async function ConfigSearch(paths) {
    for (let filepath of paths) {
        try {
            filepath = await fs.realpath(filepath);
            await fs.readFile(filepath, 'utf-8');
            return filepath;
        } catch {}
    }

    return null;
}

export {
    Env, ConfigSearch
}