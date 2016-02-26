'use strict'

var loopback = require('loopback');
var explorer = require('loopback-component-explorer');
var Rx = require('rx');
var mongodb = require('mongodb');
const debug = require('debug');
Rx.Node = require('rx-node');

const stream = Rx.Observable;
var MongoClient = mongodb.MongoClient;

var app = module.exports = loopback();

app.set('host', '0.0.0.0');
app.set('port', '3000');
app.set('restApiRoot', '/api');
app.set('legacyExplorer', false);

app.middlewareFromConfig(loopback.rest, { paths: [ '/api' ], phase: 'routes' });

app.use('/explorer', explorer.routes(app, { basePath: '/api' }));

app.listen(function() {
  app.emit('started');
  console.log('Web server listening at: %s', app.get('url'));
})

app.dataSource('db', {
  "name": "db",
  "connector": "memory"
});

const mongo = app.dataSource('mongo', {
  name: 'mongo',
  connector: 'mongodb',
  database: 'index_cards_loopback'
});

//
// DEFINE MODELS
//
//

var IndexCard = app.loopback.createModel({
  name: 'IndexCard',
  strict: 'throw',
  properties: {
    mitreCard: {
      type: Object,
      required: true
    },
    nxmlId: {
      type: String,
      required: true
    }
  },
  relations: {
    nxml: {
      type: 'belongsTo',
      model: 'NXML',
      foreignKey: 'nxmlId'
    }
  },
  idInjection: false
});

var NXML = app.loopback.createModel({
  name: 'NXML',
  strict: 'throw',
  properties: {
    articleFront: {
      type: Object,
      required: true
    },
    xmlBinary: {
      type: Object,
      required: true
    }
  },
  idInjection: false
});

app.model(NXML, { dataSource: 'mongo' });
app.model(IndexCard, { dataSource: 'mongo' });

IndexCard.find({ limit: 1 })
  .then(function(d) { console.log(d) });

NXML.find({ limit: 1 })
  .then(function(d) { console.log(d) });
