'use strict'

var loopback = require('loopback');
var explorer = require('loopback-component-explorer');
var Rx = require('rx');
var mongodb = require('mongodb');

Rx.Node = require('rx-node');

const stream = Rx.Observable;

var MongoClient = mongodb.MongoClient;

var app = module.exports = loopback();

app.set('host', '0.0.0.0');
app.set('port', '3000');
app.set('restApiRoot', '/api');
app.set('legacyExplorer', false);

app.dataSource('db', {
  "name": "db",
  "connector": "memory"
});

var mongo = app.dataSource('mongo', {
  name: 'mongo',
  connector: 'mongodb',
  database: 'index_cards'
});

var Test = app.loopback.createModel({
  name: 'Test',
  base: 'PersistedModel',
  strict: 'validate',
  properties: {
    trigger: String
  },
  idInjection: true
});

app.model(Test, { dataSource: 'mongo' });

app.models.Test.create([
  { trigger: 'foo' }
], function(e, d) {
  console.log(e,d)
  app.models.Test.find(function(err, data) {
    console.log(err, data);
  })
})

// app.models.Test.create([
//   { trigger: 'foo' }
// ])

app.model(app.loopback.ACL, {
  "dataSource": "db",
  "public": false
});


// app.models.IndexCard.find(function(err, data) {
//   console.log(err, data);
// })



// const dbPromise = MongoClient.connect('mongodb://localhost:27017/index_cards');
//
// const reach_card$ = stream.fromPromise(dbPromise)
//   .map(db => db.collection('reach_cards'))
//   .map(collection => collection.find().limit(10).stream())
//   .flatMap(stream => Rx.Node.fromStream(stream))
//   .map(obj => {
//     delete obj.score
//     delete obj.pmc_id
//     delete obj.evidence
//     // delete obj.trigger
//     return obj
//   })
//   .do(console.log)
//   .subscribe(card => app.models.IndexCard.create([{ trigger: 'foo' }]))

app.middlewareFromConfig(loopback.rest, { paths: [ '/api' ], phase: 'routes' });

explorer(app, { basePath: '/api', mountPath: '/explorer' });

var router = app.loopback.Router();
router.get('/', app.loopback.status());
app.use(router);

app.enableAuth();

app.listen(function() {
  app.emit('started');
  console.log('Web server listening at: %s', app.get('url'));
});
