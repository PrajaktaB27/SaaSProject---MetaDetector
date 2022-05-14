"use strict";
exports.__esModule = true;
exports.App = void 0;
var express = require("express");
var bodyParser = require("body-parser");
var TileModel_1 = require("./model/TileModel");
var TweetModel_1 = require("./model/TweetModel");
// Creates and configures an ExpressJS web server.
var App = /** @class */ (function () {
    //Run configuration methods on the Express instance.
    function App() {
        this.expressApp = express();
        this.middleware();
        this.routes();
        this.Tiles = new TileModel_1.TileModel();
        this.Tweets = new TweetModel_1.TweetModel();
    }
    // Configure Express middleware.
    App.prototype.middleware = function () {
        this.expressApp.use(bodyParser.json());
        this.expressApp.use(bodyParser.urlencoded({ extended: false }));
        //CORS set up to allow access from Angular
        this.expressApp.use(function (req, res, next) {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
            next();
        });
    };
    // Configure API endpoints.
    App.prototype.routes = function () {
        var _this = this;
        var router = express.Router();
        router.get('/app/tile', function (req, res) {
            if (req.url.includes('?')) {
                var xCor = parseInt(req.query.x);
                var yCor = parseInt(req.query.y);
                console.log("Query single tile with coordinates: (".concat(xCor, ", ").concat(yCor, ")"));
                _this.Tiles.retrieveTileById(res, { $and: [{ x: xCor }, { y: yCor }] });
            }
            else {
                res.status(400);
                res.send('Please provide tile coordinates (x, y)');
            }
        });
        router.get('/app/tile/estate/:id', function (req, res) {
            var id = parseInt(req.params.id);
            console.log('Query for all tiles in estate ' + id);
            _this.Tiles.retrieveAllTilesInEstate(res, { estateId: id });
        });
        router.get('/app/tweets', function (req, res) {
            console.log('Query for all tweets');
            _this.Tweets.retrieveAllTweets(res);
        });
        router.post('/app/tiles', function (req, res, next) {
            // Verify API key in header before processing the request
            if (req.headers['api-key'] == null) {
                var message = 'Missing required authorization header: api-key';
                console.log(message);
                res.status(400);
                res.send(message);
                return;
            }
            // Verify API key is correct
            if (parseInt(req.headers['api-key'].toString()) != App.API_KEY) {
                var message = "Unauthorized request to ".concat(req.url, ", please check the api-key header.");
                console.log(message);
                res.status(401);
                res.send(message);
                return;
            }
            //Do a get call to metaverse
            var request = require('request');
            var model = _this.Tiles.model; //alias to be used in the callback, scope issue
            request('https://api.decentraland.org/v2/tiles', function (err, response, body) {
                if (!err && response.statusCode == 200) {
                    var result = JSON.parse(body).data;
                    for (var item in result) {
                        //console.log(JSON.stringify(result[item]));
                        //Put each item in the DB
                        model.create([result[item]], function (err) {
                            if (err) {
                                console.log('Tile creation failed!');
                            }
                        });
                        //Only storing 1 item for now, but eventually we would want to do a real update on every single item
                        break;
                    }
                }
                else {
                    console.log('Failed to fetch data from external server.');
                }
            });
            res.send('Update completed');
        });
        this.expressApp.use('/', router);
        this.expressApp.use('/app/json/', express.static(__dirname + '/app/json'));
        this.expressApp.use('/images', express.static(__dirname + '/img'));
        this.expressApp.use('/', express.static(__dirname + '/pages'));
    };
    App.API_KEY = 123;
    return App;
}());
exports.App = App;
