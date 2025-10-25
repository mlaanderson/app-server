/// <reference path="types.d.ts" />
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

import { parseArgs } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Server from "./lib/server.js";
import { Validate } from "./lib/configuration_validator.js";
import { ConfigSearch, Env } from "./lib/config_search.js";

if (fileURLToPath(import.meta.url) === (await fs.realpath(process.argv[1]))) {
    const CONFIG_PATHS = [
        Env`${'APP-SERVER-CONFIG-PATH'}`,
        '/etc/APP-server/conf.json',
        Env`${'ProgramData'}\\APPServer\\conf.json`,
        '/usr/local/etc/APP-server/conf.json',
        Env`${'HOME'}/.local/etc/APP-server/conf.json`,
        Env`${'HOME'}/.config/APP-server/conf.json`,
        Env`${'APPDATA'}\\APPServer\\conf.json`,
        Env`${'LOCALAPPDATA'}\\APPServer\\conf.json`,
        Env`${'USERPROFILE'}\\.local\\APPServer\\conf.json`,
        Env`${'USERPROFILE'}\\.config\\APPServer\\conf.json`,
        './.conf.json',
        './.config.json'
    ];

    const package_json = JSON.parse(await fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), 'package.json')));
    let { values } = parseArgs({
        allowPositionals: false,
        options: {
            "config": { type: 'string', short: 'f' },
            "version": { type: 'boolean', short: 'V' },
            "help": { type: 'boolean', short: 'h' }
        }
    });

    if (values.help) {
        console.error('USAGE: app-server [-h] [-V] [-f configuration_file]');
        console.error('    -f, --config   Specify the configuration file, bypassing the search path');
        console.error('    -V, --version  Show the version info and exit');
        console.error('    -h, --help     Show this help text');
        process.exit(-1);
    }

    if (values.version) {
        console.error(`${package_json.name}: ${package_json.version}`);
        process.exit(0);
    }

    if (values.config) {
        CONFIG_PATHS.unshift(values.config);
    }

    let config_path = await ConfigSearch(CONFIG_PATHS);
    let config = await Validate(config_path);

    if (!config) {
        console.error('ERROR: Invalid configuration')
    } else {
        console.log(`Using configuration from ${config_path}`);
        let server = new Server(config);
        await server.listen();
        console.log(`Listening to HTTP on ${config.port} ${config.ssl ? "and HTTPS on " + config.ssl.port : ''}`)
    }
}

export { Server }