'use strict'

var loopback = require('loopback');
var explorer = require('loopback-component-explorer');
var Rx = require('rx');
var mongodb = require('mongodb');
const _debug = require('debug');
Rx.Node = require('rx-node');
const stream = Rx.Observable;
var MongoClient = mongodb.MongoClient;

_debug.enable('migrate-data');
const debug = _debug('migrate-data')

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

var transient = app.dataSource('transient', {
  name: 'transient',
  connector: 'transient'
});

var ExtractedInformation = app.loopback.createModel({
  name: 'ExtractedInformation',
  strict: 'validate',
  properties: {
    interaction_type: {
      type: String,
      required: true
    },
    negative_information: {
      type: String,
      required: true
    },
    hypothesis_information: {
      type: Boolean,
      required: true
    }
  }
});

var IndexCard = app.loopback.createModel({
  name: 'IndexCard',
  strict: 'validate',
  properties: {
    pmc_id: {
      type: String,
      required: true
    },
    submitter: {
      type: String,
      required: true
    },
    model_relation: {
      type: String,
      required: true
    },
    reading_started: {
      type: String,
      required: true
    },
    reading_complete: {
      type: String,
      required: true
    },
    reader_type: {
      type: String,
      required: true
    },
    evidence: {
      type: [ String ],
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    _trigger: {
      type: String,
      required: true
    }
  },
  relations: {
    extractedInformation: {
      type: 'embedsOne',
      model: 'ExtractedInformation',
      property: 'extracted_information',
      options: {
        validate: true,
        persistent: true
      }
    }
  },
});

var RawIndexCard = app.loopback.createModel({
  name: 'RawIndexCard',
  properties: IndexCard.definition.properties
});

IndexCard.createFromReachOutput = function(card, cb) {
  debug('card', card);
  cb(null, card);
}

// IndexCard.create = function()

app.model(ExtractedInformation, { dataSource: 'transient', public: true })
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

const create = function(data) {
  return stream.create(observer =>
    app.models.IndexCard.createFromReachOutput(data, function(e,d) {
      if (e) return observer.onError(e);
      observer.onNext(d);
    })
  )
}

const dbPromise = MongoClient.connect('mongodb://localhost:27017/index_cards');
const reach_card$ = stream.fromPromise(dbPromise)
  .map(db => db.collection('reach_cards'))
  .map(collection => collection.find().limit(2).stream())
  .flatMap(stream => Rx.Node.fromStream(stream))
  .map(indexCard => {
    indexCard._trigger = indexCard.trigger;
    delete indexCard._id;
    delete indexCard.trigger;
    return indexCard;
    // return { foo: 'bar' }
  })
  .flatMap(obj => create(obj))
  // .catch(stream.throw)
  // .do(console.log)
  .subscribe()

app.listen(function() {
  app.emit('started');
  console.log('Web server listening at: %s', app.get('url'));
})
