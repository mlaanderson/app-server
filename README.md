# App-Server
An [Express](https://expressjs.com/) based server which loads Express router
apps and mounts them.

There are no shared sessions, variables, or authentications between apps. The
apps are completely isolated from each other.

## Usage
```shell
app-server [-h] [-V] [-f configuration_file]
    -f, --config   Specify the configuration file, bypassing the search path
    -V, --version  Show the version info and exit
    -h, --help     Show this help text
```

When the server starts, it reads a JSON configuration file from one of the
following paths, unless specified on the command line:
* `${APP-SERVER-CONFIG-PATH}`
* `/etc/APP-server/conf.json`
* `${ProgramData}\APPServer\conf.json,`
* `/usr/local/etc/APP-server/conf.json,`
* `${HOME}/.local/etc/APP-server/conf.json`
* `${HOME}/.config/APP-server/conf.json`
* `${APPDATA}\APPServer\conf.json`
* `${LOCALAPPDATA}\APPServer\conf.json`
* `${USERPROFILE}\.local\APPServer\conf.json`
* `${USERPROFILE}\.config\APPServer\conf.json`
* `./.conf.json`
* `./.config.json`

The structure of the configuration file is:
```TypeScript
{
    /** The port to listen to HTTP requests on */
    port: number,
    /** The folder to scan for applications */
    app_directory?: string,
    /** A folder to run an app in standalone mode from */
    standalone?: {
        /** The folder to search */
        local_path: string,
        /** The mount point for the app */
        web_path: string
    },
    /** Mounts folders without a defined app as static content */
    allow_static?: boolean,
    /** Allows directory listing in folders mounted as static content */
    static_folder_list?: boolean,
    /** Option configuration to allow user mounts at /~username */
    user_folders?: {
        /** The path which contains user home directories */
        user_root: string,
        /** The folder name in a home directory which will be served */
        public_folder: string
    },
    /** Optional configuration for HTTPS */
    ssl?: {
        /** The port to listen to HTTPS requests on */
        port: number,
        /** If true, always redirect HTTP requests to HTTPS */
        redirect?: boolean,
        /** The location of the SSL key */
        keyFile: string,
        /** The location of the SSL certificate */
        certFile: string
    }
}
```
### port
The TCP port that application will listen on for HTTP requests.

### app_directory
_Use app_directory or standalone_

Points to the root of a directory which contains web applications to be
mounted by the server. A directory named `ROOT` will be mounted on `/`.

### standalone
_Use app_directory or standalone_

Points to a directory which will be the only application mounted. This
is useful for debugging an app. Install `app-server` as a development
dependency to you application.

#### standalone.local_path
The path to the web app base directory.

#### standalone.web_path
The path to mount the web app on the web server.

### allow_static
If set to true, the server will failover to serving static content from
application directories which do not include a `package.json` file.

**This can be a security risk, all of the files in the folder will be exposed.**

### static_folder_list
If set to true, the server will display a folder listing in static directories
which do not have an `index.html` file.

**This can be a security risk, all of the files in the folder will be exposed and listable.**

### user_folders
Optional setting to allow a specific folder in all user's home directories 
to be mounted. With the `allow_static` flag, this can let users serve simple
websites. It can also serve full apps. 

Example:
```json
"user_folders" {
    "user_root": "/home",
    "public_folder": "public_html"
}
```

This will search each immediate subdirectory of `/home` and serve the
contents of `/home/<USER>/public/html` as `/~<USER>`.

#### user_folders.user_root
The path to the directory in which user's home directories are located.

#### user_folders.public_folder
The name of a directory within the user's home directory to serve. This
can serve both static content and full blown applications.

### ssl
Option configuration to support HTTPS serving.

#### ssl.port
The TCP port to listen to for HTTPS requests.

#### ssl.redirect
Optional flag to force all HTTP requests to be redirected to their
HTTPS equivalent.

#### ssl.keyFile
Indicates the location of the SSL secret key for the HTTPS server.

#### ssl.certFile
Indicates the location of the SSL certificate for the HTTPS server.

## Startup - standard mode
On startup the server scans the indicated directory for subdirectories
which contain a `package.json` file. If one is found, the server imports
the module indicated by the `main` property and attempts to load the 
default export.

If a folder named `ROOT` is found it will be mounted at `/` on the server.

If the default export is a function that returns an Express router, and 
optionally a shutdown handler, the server will mount the application at
the subdirectory name.

If no `package.json` file is found and the `allow_static` is set, the
subdirectory is served in its entirety as static content.

## Alternate Startup - standalone mode
When developing an application for `app-server`, add `app-server` as a
development dependancy. Create a standalone mode that loads a configuration
and calls the server. This makes it easier to debug your code.

```javascript
import Server from 'app-server;

let config = {
    port: 8080,
    standalone: {
        local_path: ".",
        web_path: "/"
    }
};

let server = new Server(config);
server.listen().then(() => console.log('Listening on port 8080'));
```

## Alternate Startup - mounted as an app
The `app-server` can also be mounted as an app on itself. This allows an
app that serves sub-apps. This could be specifically helpful for installations
that use the `user_folders` configuration.

1. Create a project with `app-server` as a dependency. 
2. Create a configuration and load it
3. Create an instance of Server using the configuration
4. Call `server.scan_apps()` to load apps from the configuration
5. Create a function that returns `server.Service` as the default export

```javascript
/**
 * 
 * @param {string} web_path The path where this service is mounted on the main server
 * @param {string} local_path The local path where the server found this service
 * @returns {Promise<{router: express.Router, shutdown: () => Promise<void>}>}
 */
function Serve (web_path, local_path) {
    let server = new Server(config);
    await server.scan_apps();
    return server.Service
}

export default Serve;
```

