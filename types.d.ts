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

declare namespace AppServer {
    interface SSLConfig {
        /** The port to listen to HTTPS requests on */
        port: number,
        /** If true, always redirect HTTP requests to HTTPS */
        redirect?: boolean,
        /** The location of the SSL key */
        keyFile: string,
        /** The location of the SSL certificate */
        certFile: string
    }

    interface AppConfig {
        /** The folder to search */
        local_path: string,
        /** The mount point for the app */
        web_path: string
    }

    interface UserFolders {
        /** The path which contains user home directories */
        user_root: string,
        /** The folder name in a home directory which will be served */
        public_folder: string
    }


    interface ServerConfig {
        /** The port to listen to HTTP requests on */
        port: number,
        /** The folder to scan for applications */
        app_directory?: string,
        /** A folder to run an app in standalone mode from */
        standalone?: AppConfig,
        /** Indicates that web sockets should be forwarded to apps */
        web_sockets?: boolean,
        /** Mounts folders without a defined app as static content */
        allow_static?: boolean,
        /** Allows directory listing in folders mounted as static content */
        static_folder_list?: boolean,
        /** Option configuration to allow user mounts at /~username */
        user_folders?: UserFolders,
        /** Optional configuration for HTTPS */
        ssl?: SSLConfig
    }

    interface PackageJson {
        main: string,
        disabled?: boolean
    }

    interface AppRoute {
        router: express.Router,
        shutdown: () => Promise<void>,
        web_sockets: (socket: WebSocket, request: http.IncomingRequest) => void
    }

    function AppInitializer(web_path: string, local_path: string) : Promise<AppRoute>
}