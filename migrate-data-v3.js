'use strict'

var loopback = require('loopback');
var explorer = require('loopback-component-explorer');
var Rx = require('rx');
var mongodb = require('mongodb');
const _debug = require('debug');
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
  database: 'index_cards_loopback'
});

var IndexCard = app.loopback.createModel({
  name: 'IndexCard',
  relations: {
    // extractedInformation: {
    //   type: 'embedsOne',
    //   model: 'ExtractedInformation',
    //   property: 'extracted_information',
    //   options: {
    //     validate: true,
    //     persistent: true
    //   }
    // }
  },
});

var RawIndexCard = app.loopback.createModel({
  name: 'RawIndexCard',
  // properties: IndexCard.definition.properties
});

IndexCard.createFromReachOutput = function(card, cb) {
  debug('card', card);
  cb(null, card);
}

// IndexCard.create = function()

// app.model(ExtractedInformation, { dataSource: 'transient', public: true })
app.model(IndexCard, { dataSource: 'mongo' });
app.model(RawIndexCard, { dataSource: 'mongo' });



// RawIndexCard.observe('after save', function(ctx, next) {
//   debug(`Raw card created: ${ctx.instance.id}`);
//
//   let inst = ctx.instance;
//
//   inst.unsetAttribute('extracted_information');
//   inst.unsetAttribute('id');
//
//   // let card = Object.assign({}, inst);
//
//   console.log(inst)
//
//   // console.log(inst)
//
//   // let card = [
//   //     'pmc_id',
//   //     'submitter',
//   //     'model_relation',
//   //     'reading_started',
//   //     'reading_complete',
//   //     'reader_type',
//   //     'evidence',
//   //     'score',
//   //     '_trigger'
//   //   ]
//   //   .reduce((o, key) => { o[key] = inst[key]; return o; }, {});
//
//   let extracted = inst.extracted_information;
//
//   stream.fromPromise(IndexCard.create(card))
//     // .catch(stream.throw) // TODO: Rollback if error
//     .do(c => debug('Card created', c.id))
//     .map(card => card.extractedInformation.create(extracted))
//     .do(console.log)
//     .subscribe()
//
//   next();
// })

// const create = function(data) {
//   return stream.create(observer =>
//     app.models.IndexCard.createFromReachOutput(data, function(e,d) {
//       if (e) return observer.onError(e);
//       observer.onNext(d);
//     })
//   )
// }
//
// const dbPromise = MongoClient.connect('mongodb://localhost:27017/index_cards');
// const reach_card$ = stream.fromPromise(dbPromise)
//   .map(db => db.collection('reach_cards'))
//   .map(collection => collection.find().limit(2).stream())
//   .flatMap(stream => Rx.Node.fromStream(stream))
//   .map(indexCard => {
//     indexCard._trigger = indexCard.trigger;
//     delete indexCard._id;
//     delete indexCard.trigger;
//     return indexCard;
//     // return { foo: 'bar' }
//   })
//   .flatMap(obj => create(obj))
//   // .catch(stream.throw)
//   // .do(console.log)
//   .subscribe()
//
// app.listen(function() {
//   app.emit('started');
//   console.log('Web server listening at: %s', app.get('url'));
// })
