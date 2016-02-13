var loopback = require('loopback');
var explorer = require('loopback-component-explorer');

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

// mongo;
//
// debugger

// var mongo = app.dataSources.mongo;

// console.log(mongo.buildModelFromInstance);

// var test = mongo.buildModelFromInstance()

// app.dataSource('mysqlDs', {
//   "name": "mysqlDs",
//   "connector": "mysql",
//   "host": "demo.strongloop.com",
//   "port": 3306,
//   "database": "getting_started",
//   "username": "demo",
//   "password": "L00pBack"
// });

var IndexCard = app.loopback.createModel({
  name: 'IndexCard',
  base: 'PersistedModel',
  idInjection: true
});

var mitre_reference = app.loopback.createModel({
  name: 'mitre_reference',
  base: 'PersistedModel',
  idInjection: true
});

// var CoffeeShop = app.loopback.createModel({
//   "name": "CoffeeShop",
//   "base": "PersistedModel",
//   "idInjection": true,
//   "options": {
//     "validateUpsert": true
//   },
//   "properties": {
//     "name": {
//       "type": "string",
//       "required": true
//     },
//     "city": {
//       "type": "string",
//       "required": true
//     }
//   }
// });

// app.model(CoffeeShop, { dataSource: 'db' });
app.model(IndexCard, { dataSource: 'mongo' });

app.model(mitre_reference, { dataSource: 'mongo' });

app.model(app.loopback.ACL, {
  "dataSource": "db",
  "public": false
});

app.dataSources.mongo.autoupdate('mitre_reference', function(err) {
  console.log('err', err);
})

// app.dataSources.mongo.autoupdate('IndexCard', function(err) {
//   console.log('err', err);
//   console.log('happy new year');
// })

// app.dataSources.mongo.autoupdate('IndexCard', function(err) {
//   debugger
  app.models.IndexCard.create([
    { name: 'test' }
  ], function (err, cards) {
    console.log(err, cards);
  })

  app.models.IndexCard.create([
    { name: 'bob' }
  ])
// })





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
