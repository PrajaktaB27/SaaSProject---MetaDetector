import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as crypto from 'crypto';
import { TileModel } from './model/TileModel';
import { TweetModel } from './model/TweetModel';

// Creates and configures an ExpressJS web server.
class App {

  // ref to Express instance
  public expressApp: express.Application;
  public Tiles:TileModel;
  public Tweets:TweetModel;
  private static API_KEY: number = 123;

  //Run configuration methods on the Express instance.
  constructor() {
    this.expressApp = express();
    this.middleware();
    this.routes();
    this.Tiles = new TileModel();
    this.Tweets = new TweetModel();

  }

  // Configure Express middleware.
  private middleware(): void {
    this.expressApp.use(bodyParser.json());
    this.expressApp.use(bodyParser.urlencoded({ extended: false }));

    //CORS set up to allow access from Angular
    this.expressApp.use( (req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers",
                    "Origin, X-Requested-With, Content-Type, Accept");
      res.setHeader("Access-Control-Allow-Methods",
                    "GET, POST, PATCH, DELETE, OPTIONS");
      next();
    })
  }

  

  // Configure API endpoints.
  private routes(): void {
    let router = express.Router();

    router.get('/app/tile', (req, res) => {
      if (req.url.includes('?')) {
        var xCor = parseInt(req.query.x);
        var yCor = parseInt(req.query.y);
        console.log(`Query single tile with coordinates: (${xCor}, ${yCor})`);
        this.Tiles.retrieveTileById(res, {$and:[{x: xCor}, {y: yCor}]});
      } else {
        res.status(400);
        res.send('Please provide tile coordinates (x, y)');
      }
    });

    router.get('/app/tile/estate/:id', (req, res) => {
      var id = parseInt(req.params.id);
      console.log('Query for all tiles in estate ' + id);
      this.Tiles.retrieveAllTilesInEstate(res, {estateId: id});
    });
    
    router.get('/app/tweets', (req, res) => {
      console.log('Query for all tweets');
      this.Tweets.retrieveAllTweets(res);
    });

    router.post('/app/tiles', (req, res, next) => {
      // Verify API key in header before processing the request
      if (req.headers['api-key'] == null) {
        const message = 'Missing required authorization header: api-key';
        console.log(message)
        res.status(400);
        res.send(message);
        return;
      }

      // Verify API key is correct
      if (parseInt(req.headers['api-key'].toString()) != App.API_KEY) {
        const message = `Unauthorized request to ${req.url}, please check the api-key header.`;
        console.log(message)
        res.status(401);
        res.send(message);
        return;
      }
      
      //Do a get call to metaverse
      const request = require('request');
      
      let model = this.Tiles.model;       //alias to be used in the callback, scope issue
      request('https://api.decentraland.org/v2/tiles',  (err, response, body) => {
        if (!err && response.statusCode == 200) {
          let result = JSON.parse(body).data;
          for(var item in result){
            //console.log(JSON.stringify(result[item]));

            //Put each item in the DB
            model.create( [result[item]], (err) => {
              if (err){
                console.log('Tile creation failed!');
              }
            });
            //Only storing 1 item for now, but eventually we would want to do a real update on every single item
            break;
          }
        }
        else{
          console.log('Failed to fetch data from external server.');
        }
      })
  
      res.send('Update completed');
  });

    this.expressApp.use('/', router);

    this.expressApp.use('/app/json/', express.static(__dirname+'/app/json'));
    this.expressApp.use('/images', express.static(__dirname+'/img'));
    this.expressApp.use('/', express.static(__dirname+'/pages'));
  }

}

export {App};