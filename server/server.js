var _           = require("lodash");
var connect     = require("connect");
var through     = require("through");
var http        = require("http");
var fs          = require("fs");
var serveStatic = require("serve-static");

var config      = require("./config");

/**
 * CWD directory helper for static dir
 * @param {String|undefined} [path]
 * @returns {string}
 */
var cwd = function (path) {
    return __dirname + "/../lib" + path || "";
};

/**
 * @param {ControlPanel} controlPanel
 * @param {Function} socketMw
 * @param {Function} connectorMw
 * @returns {*}
 */
function startServer(controlPanel, socketMw, connectorMw) {

    /**
     * Create a connect server
     */
    var app = connect();

    /**
     * Serve Template files for directives
     */
    serveTemplates(app, controlPanel.templates);

    /**
     * Serve JS files
     */
    serveJsFiles(app, socketMw, connectorMw);

    /**
     * Serve the main (browserified) js file
     */
    serveMainAppFile(app, controlPanel.clientJs);

    /**
     * Add any markup from plugins/hooks
     */
    insertPageMarkupFromHooks(app, controlPanel.pageMarkup);

    /**
     * Serve static directory
     */
    app.use(serveStatic(cwd("")));

    /**
     * Return the server.
     */
    return http.createServer(app);
}

/**
 * @param {Connect} app
 * @param {Function} socketMw
 * @param {Function} connectorMw
 * @param {ControlPanel} controlPanel
 */
function serveJsFiles(app, socketMw, connectorMw) {
    app.use(config.socketJs, socketMw);
    app.use(config.connector, connectorMw);
}

/**
 * @param res
 * @param pageMarkup
 * @returns {*}
 */
function combineMarkup(res, pageMarkup) {
    res.setHeader("Content-Type", "text/html");
    return fs.createReadStream(cwd(config.indexPage))
        .pipe(through(function (buffer) {
            var file = buffer.toString();
            this.queue(file.replace(/%hooks%/g, pageMarkup));
        }))
        .pipe(res);
}

/**
 * @param app
 * @param pageMarkup
 */
function insertPageMarkupFromHooks(app, pageMarkup) {
    app.use(function (req, res, next) {
        if (req.url === "/") {
            return combineMarkup(res, pageMarkup);
        } else {
            next();
        }
    });
}

/**
 * @param app
 * @param clientJs
 */
function serveMainAppFile(app, clientJs) {
    app.use(config.appJs, function (req, res) {
        res.setHeader("Content-Type", "application/javascript");
        res.end(clientJs);
    });
}

/**
 * 
 * @param controlPanel
 * @param app
 */
function serveTemplates(app, templates) {
    _.each(templates, function (template, path) {
        app.use("/" + path, function (req, res, next) {
            res.setHeader("Content-Type", "text/html");
            res.end(template);
        });
    });
}

module.exports = startServer;