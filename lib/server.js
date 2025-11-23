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
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import http from 'node:http';
import https from 'node:https';

import express from 'express';
import morgan from 'morgan';
import serveIndex from 'serve-index';

/**
 * Determines if the file can be read from
 * @param {string} filename File path to test
 */
async function canRead(filename) {
    try {
        await fs.access(filename, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Determines if the file can be written to
 * @param {string} filename File path to test
 */
async function canWrite(filename) {
    try {
        await fs.access(filename, fs.constants.W_OK);
        return true;
    } catch {
        return false;
    }
}

class Server {
    /**
     * 
     * @param {AppServer.ServerConfig} config 
     */
    constructor(config) {
        /** @type {AppServer.ServerConfig}     */ this.config = config;
        /** @type {Array<AppServer.AppConfig>} */ this.apps = [];
        /** @type {Object.<string, AppServer.AppRoute>} */ this.mounted_apps = {};
        /** @type {Array<() => Promise<void>>} */ this.shutdowns = [];

        /** @type {express.Express} */ this.app = express();

        // Setup logging
        this.app.use(morgan('combined'));

        // setup HTTPS redirect if configured
        if (this.config.ssl && this.config.ssl.redirect) {
            console.log('HTTP requests will be redirected to HTTPS');
            this.app.use(this.redirectHttp.bind(this));
        }
    }

    /**
     * Redirects HTTP traffic to https
     * @param {express.Request} request 
     * @param {express.Response} response 
     * @param {express.NextFunction} next 
     */
    redirectHttp(request, response, next) {
        if (request.secure) {
            next();
        } else {
            response.redirect(`https://${request.hostname}:${this.config.ssl.port}${request.url}`);
        }
    }

    async scan_apps() {
        this.apps = [];

        if (this.config.standalone) {
            this.config.standalone.local_path = path.resolve(this.config.standalone.local_path);
            
            // mount the app
            if (await this.mount_app(this.config.standalone)) {
                this.apps = [this.config.standalone];
            } else {
                console.error(`ERROR: could not mount ${this.config.standalone.web_path}`)
            }
        } else {
            this.config.app_directory = path.resolve(this.config.app_directory);
            let files = await fs.readdir(this.config.app_directory, { withFileTypes: true, recursive: false });
            for (let file of files) {
                if (file.isDirectory()) {
                    let local_path = path.join(this.config.app_directory, file.name);
                    let web_path = '/' + file.name;
                    if (file.name == 'ROOT') {
                        web_path = '/';
                    }

                    // mount the app
                    if (await this.mount_app({ web_path, local_path })) {
                        this.apps.push({
                            web_path,
                            local_path
                        });
                    }
                }
            }

            if (!!this.config.user_folders) {
                let files = await fs.readdir(this.config.user_folders.user_root, { withFileTypes: true, recursive: false });
                for (let file of files) {
                    if (file.isDirectory()) {
                        let local_path = path.join(this.config.user_folders.user_root, file.name, this.config.user_folders.public_folder);
                        if (await canRead(local_path)) {
                            let web_path = `/~${file.name}`;

                            if (await this.mount_app({ web_path, local_path }));
                            this.apps.push({
                                web_path, local_path
                            });
                        }
                    }
                }
            }
        }

        if (this.apps.length <= 0) {
            throw new Error(`No applications found in ${this.config.app_directory}`)
        }

    }

    /**
     * Mounts a single app and returns success
     * @param {AppServer.AppConfig} webapp 
     * @returns {Promise<boolean>}
     */
    async mount_app(webapp) {
        try {
            let filename = path.join(webapp.local_path, 'package.json');

            if (await canRead(filename)) {

                let packageText = await fs.readFile(filename, { encoding: 'utf-8' });

                /** @type {AppServer.PackageJson} */
                let app_package = JSON.parse(packageText);
                let module_path = path.join(webapp.local_path, app_package.main);

                if (os.platform() === 'win32') {
                    // Win32 requires URLS
                    module_path = pathToFileURL(module_path);
                }
                

                /** @type {AppServer.AppInitializer} */
                let initializer = (await import(module_path)).default;
                let app_object = await initializer(webapp.web_path, webapp.local_path);

                if (app_object.shutdown) {
                    this.shutdowns.push(app_object.shutdown);
                }

                this.app.use(webapp.web_path, app_object.router);
                console.log(`Mounted ${webapp.web_path} from ${webapp.local_path}`);
                this.mounted_apps[webapp.web_path] = app_object;
            } else if (this.config.allow_static && (await canRead(webapp.local_path))) {
                if (this.config.static_folder_list) {
                    let router = express.Router();
                    router.use(express.static(webapp.local_path), 
                        serveIndex(webapp.local_path, {icons: true}));
                    this.app.use(webapp.web_path, router);
                    this.mounted_apps[webapp.web_path] = {router};
                } else {
                    let router = express.static(webapp.local_path)
                    this.app.use(webapp.web_path, router);
                    this.mounted_apps[webapp.web_path] = {router};
                }
                console.log(`Serving static content from ${webapp.local_path} on ${webapp.web_path}`);
            } else {
                throw new Error(`Could not find ${webapp.local_path}/package.json`);
            }

            return true;
        } catch (error) {
            console.error(`While mounting ${webapp.web_path}:`, error)
        }
        return false;
    }

    async shutdown() {
        console.log('Shutting down applications...');
        for (let handler of this.shutdowns) {
            await handler();
        }
        console.log('Shut down complete');
        process.exit(0);
    }

    /**
     * 
     * @param {WebSocket} socket 
     * @param {http.IncomingMessage} request 
     */
    handleIncomingWebSocket(socket, request) {
        // find the longest route that is included in request.url
        let routes = this.apps.filter(app => request.url.startsWith(app.web_path)).map(app => app.web_path);
        routes.sort((a,b) => b.length - a.length);
        if (routes.length > 0) {
            let app_object = this.mounted_apps[routes[0]];
            if ('web_socket' in app_object) {
                if (routes[0] !== '/') {
                    request.url = request.url.substring(routes[0].length);
                    if (request.url === '') {
                        request.url = '/';
                    }
                }
                app_object.web_socket(socket, request);
            }
        }
    }

    async listen() {
        await this.scan_apps();

        /** @type {http.Server} */
        let httpServer;
        /** @type {https.Server} */
        let httpsServer;

        // start http
        await new Promise(resolve => httpServer = http.createServer(this.app).listen(this.config.port, resolve));

        if (this.config.web_sockets) {
            let wss = new WebSocketServer({ server: httpServer });
            wss.on('connection', this.handleIncomingWebSocket.bind(this));
        }

        // start https
        if (this.config.ssl) {
            let options = {
                key: await fs.readFile(this.config.ssl.keyFile),
                cert: await fs.readFile(this.config.ssl.certFile)
            }

            await new Promise(resolve => httpsServer = https.createServer(options, this.app).listen(this.config.ssl.port, resolve));
            
            if (this.config.web_sockets) {
                let wss = new WebSocketServer({ server: httpServer });
                wss.on('connection', this.handleIncomingWebSocket.bind(this));
            }
        }

        // setup the shutdown listeners
        process.on('SIGTERM', this.shutdown.bind(this));
        process.on('SIGBREAK', this.shutdown.bind(this));
        process.on('SIGINT', this.shutdown.bind(this));
    }

    /**
     * Gets the structure needed to mount this server as a sub folder
     * on another instance
     */
    get Service() {
        return { 
            router: this.app,
            shutdown: this.shutdown
        }
    }
}

export default Server