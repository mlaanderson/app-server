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