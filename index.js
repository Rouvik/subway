const http = require("node:http");
const fs = require("node:fs");
const mimeType = require('mime-types');
const dotenv = require("dotenv");
dotenv.config();

const { Server, Route, RouteHandlers } = require("./subway.js");

process.env.PORT ||= 3000;          // make sure a port exists

const server = new Server(process.env.PORT, () => console.log("Server live at port: %d", process.env.PORT));

server.addRoute(RouteHandlers.cors('*', 'GET, POST, PUT, DELETE'));

server.addRoute(RouteHandlers.redirect(/^\/$/, '/public/test.html', 'GET'));

server.addRoute(new Route(/^\/index\/([a-z\\d]*)\/address\/([a-zA-Z0-9\/, -]*)$/, (req, res) => {
    res.write(req.uriCaptures.slice(1).join('\t|\t'));
    res.end("\nHello world from Subway!");
}));

server.get(/^\/api\/([\d]*|[a-zA-Z0-9,: ]*)$/, (req, res) => {
    res.writeHead(200, http.STATUS_CODES[200], {
        'content-type': mimeType.lookup('.json')
    });

    if(isNaN(+req.uriCaptures[1]))
    {        
        const dt = new Date(req.uriCaptures[1]);
        if (isNaN(dt.getTime())) {
            res.end(JSON.stringify({
                error: "Bad date format"
            }));
            return;
        }

        res.end(JSON.stringify({
            time: dt.getTime()
        }));

        return;
    }

    res.end(JSON.stringify({
        date: new Date(+req.uriCaptures[1]).toString()
    }));
});

server.addRoute(RouteHandlers.serve("/public"));