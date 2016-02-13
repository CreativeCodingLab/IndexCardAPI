// jshint -W033
// jshint esversion: 6

var router = require('express').Router();
var mongodb = require('mongodb');

var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;

var dbName = 'index_cards';
var dbUrl = "mongodb://127.0.0.1:27017/" + dbName;

var db = MongoClient.connect(dbUrl);

db.then((db) => {
  console.log('all is well')
})

router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

router.get('/', function(req, res) {
    res.send('Hello from the dataaaabased');
});

router.get('/stats', (req, res) => {
  db.then((db) => db.stats())
    .then((stats) => {
      res.json(stats)
    })
})

module.exports = router;
