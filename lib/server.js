/// <reference path="../types.d.ts" />
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import http from 'node:http';
import https from 'node:https';

import express from 'express';
import morgan from 'morgan';

import { Validate } from './configuration_validator.js';

class Server {
    /**
     * 
     * @param {AppServer.ServerConfig} config 
     */
    constructor(config) {
        /** @type {AppServer.ServerConfig}     */ this.config = config;
        /** @type {Array<AppServer.AppConfig>} */ this.apps = [];
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
        }
        

    }

    /**
     * Mounts a single app and returns success
     * @param {AppServer.AppConfig} webapp 
     * @returns {Promise<boolean>}
     */
    async mount_app(webapp) {
        try {
            let packageText = await fs.readFile(path.join(webapp.local_path, 'package.json'), { encoding: 'utf-8' });

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

    async listen() {
        await this.scan_apps();

        if (this.apps.length <= 0) {
            throw new Error(`No applications found in ${this.config.app_directory}`)
        }

        // start http
        await new Promise(resolve => http.createServer(this.app).listen(this.config.port, resolve));

        // start https
        if (this.config.ssl) {
            let options = {
                key: await fs.readFile(this.config.ssl.keyFile),
                cert: await fs.readFile(this.config.ssl.certFile)
            }

            await new Promise(resolve => https.createServer(options, this.app).listen(this.config.ssl.port, resolve));
        }

        // setup the shutdown listeners
        process.on('SIGTERM', this.shutdown.bind(this));
        process.on('SIGBREAK', this.shutdown.bind(this));
        process.on('SIGINT', this.shutdown.bind(this));
    }
}

export default Server