// import express  from "express";

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


    interface ServerConfig {
        /** The port to listen to HTTP requests on */
        port: number,
        /** The folder to scan for applications */
        app_directory?: string,
        /** A folder to run an app in standalone mode from */
        standalone?: AppConfig,
        /** Optional configuration for HTTPS */
        ssl?: SSLConfig
    }

    interface PackageJson {
        main: string,
        disabled?: boolean
    }

    interface AppRoute {
        router: express.Router,
        shutdown: () => Promise<void>
    }

    function AppInitializer(web_path: string, local_path: string) : Promise<AppRoute>
}