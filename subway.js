const http = require("node:http");
const fs = require("node:fs");
const mimeType = require("mime-types");
const nodePath = require("node:path");

class SubwayError extends Error {
    constructor(message) {
        super("[Subway Error] " + message);
    }
}

class Route {
    constructor(path, callback, method = "*") {
        this.path = path;
        this.callback = callback;
        this.method = method;
    }

    callback(req, res) {
        throw new SubwayError("Route not implemented");
    }
}

const RouteHandlers = {
    redirect: (redirect_pattern, redirect_path, method = "*") => {
        return new Route(redirect_pattern, (req, res) => {
            res.writeHead(302, http.STATUS_CODES[302], {
                location: redirect_path
            });
            res.end();
        }, method);
    },

    cors: (allow_origin, allowed_methods) => {
        return new Route(/.*/, (req, res) => {
            res.writeHead(200, http.STATUS_CODES[200], {
                'access-control-allow-origin': allow_origin,
                'access-control-allow-methods': allowed_methods
            });
            res.end();
        }, 'OPTIONS');
    },

    serve: (base_path) => {
        return new Route(new RegExp(`\\/${nodePath.normalize(base_path)}\\/([\\w\\W]+\\.?[a-z0-9]+)`), (req, res) => {
            if (!req.uriCaptures[1]) {
                res.writeHead(501, http.STATUS_CODES[501], {
                    'content-type': 'text/html'
                });
                res.end(Server.generateErrorResponse(404, `<h1>No base path not implemented</h1>`));
                return;
            }

            let locatedPath = '.' + base_path + '/' + req.uriCaptures[1];

            const extName = nodePath.extname(locatedPath);
            let isHTML = false;
            if(extName.length == 0)
            {
                isHTML = true;
                locatedPath += '.html';
            }
            else if (extName == '.htm') {
                isHTML = true;
                locatedPath = locatedPath.substring(0, locatedPath.lastIndexOf('.')) + '.html';
            }

            if (!fs.existsSync(locatedPath)) {
                res.writeHead(404, http.STATUS_CODES[404], {
                    'content-type': 'text/html'
                });
                res.end(Server.generateErrorResponse(404, `<h1>No such file</h1><p>${locatedPath}</p>`));
                return;
            }

            const fstat = fs.statSync(locatedPath);
            res.writeHead(200, http.STATUS_CODES[200], {
                'content-type': isHTML ? 'text/html' : mimeType.lookup(req.uriCaptures[1]) || 'text/txt',
                'content-length': fstat.size,
            });

            fs.createReadStream(locatedPath).pipe(res);
        }, "GET");
    }
};

class Server {

    constructor(port, listeningCallback = () => { }) {
        this.server = http.createServer().listen(port, listeningCallback);
        this._routes = [];
        this._globalCors = () => {};

        this.server.on("request", (req, res) => {
            for (const route of this._routes) {
                let matches = null;
                if ((matches =  decodeURIComponent(req.url).match(route.path)) != null && (route.method == "*" || route.method == req.method)) {
                    req.uriCaptures = matches;
                    route.callback(req, res);
                    return;
                }
            }

            res.writeHead(404, http.STATUS_CODES[404], {
                'content-type': 'text/html',
            });

            res.end(Server.generateErrorResponse(404, "<h1>Error 404</h1> No such endpoint:<h3><b style='background: grey; color: white;'>" + req.url + "</b></h3>"));
        });
    }

    set routes(route) {
        this.addRoute(route);
    }

    get routes() {
        return this._routes;
    }

    addRoute(route) {
        if (!route instanceof Route) {
            throw new SubwayError("Bad route parameter, %s must be an instance of [Route]", route);
        }

        this._routes.push(route);
    }

    get(url_pattern, callback)
    {
        this.addRoute(new Route(url_pattern, callback, 'GET'));
    }

    post(url_pattern, callback)
    {
        this.addRoute(new Route(url_pattern, callback, 'POST'));
    }

    put(url_pattern, callback)
    {
        this.addRoute(new Route(url_pattern, callback, 'PUT'));
    }

    delete(url_pattern, callback)
    {
        this.addRoute(new Route(url_pattern, callback, 'DELETE'));
    }

    static generateErrorResponse(code, message) {
        return `<html><head><title>Error ${code}</title></head><body>${message}</body></html>`;
    }
}


module.exports = { Route, Server, RouteHandlers };