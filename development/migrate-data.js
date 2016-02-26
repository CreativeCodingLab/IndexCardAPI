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

// Define models

var ExtractedInformation = app.loopback.createModel({
  name: 'ExtractedInformation',
  base: 'PersistedModel',
  strict: 'throw',
  properties: {
    interaction_type: {
      type: String,
      required: true
    },
    negative_information: {
      type: String,
      required: true
    },
    participant_a: {
      type: Object,
      required: true
    },
    participant_b: {
      type: Object,
      required: true
    },
    hypothesis_information: {
      type: Boolean,
      required: true
    }
  }
});
app.model(ExtractedInformation, { dataSource: 'mongo' });

ExtractedInformation.validatesInclusionOf(
  'interaction_type',
  { in: [ 'decreases_activity' ] }
);

// ExtractedInformation.observe('before save', function(ctx, next) {
//   console.log('barbar');
//   next()
// })

var IndexCard = app.loopback.createModel({
  name: 'IndexCard',
  base: 'PersistedModel',
  strict: 'validate',
  properties: {
    rawIndexCard: {
      type: Object,
      required: true
    },
    submitter: String,
    model_relation: String,
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
    pmc_id: {
      type: String,
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
        persistent: true,
        forceId: true
      }
    }
  },
  idInjection: true
});

IndexCard.validatesInclusionOf(
  'model_relation',
  {
    in: [
      'extension'
    ]
  }
);

app.model(IndexCard, { dataSource: 'mongo' });

IndexCard.observe('before save', function(ctx, next) {
  if (ctx.instance) {
    ctx.instance.rawIndexCard = ctx.instance;
    ctx.instance.unsetAttribute('pmc_id');
    ctx.instance.unsetAttribute('extracted_information');
    console.log(ctx.instance)
  }
  next()
})

app.model(app.loopback.ACL, {
  "dataSource": "db",
  "public": false
});

const dbPromise = MongoClient.connect('mongodb://localhost:27017/index_cards');

const create = function(data) {
  return stream.create(observer =>
    app.models.IndexCard.create(data, function(e,d) {
      if (e) return observer.onError(e);
      observer.onNext(d);
    })
  )
}

app.middlewareFromConfig(loopback.rest, { paths: [ '/api' ], phase: 'routes' });

explorer(app, { basePath: '/api', mountPath: '/explorer' });

const reach_card$ = stream.fromPromise(dbPromise)
  .map(db => db.collection('reach_cards'))
  .map(collection => collection.find().limit(2).stream())
  .flatMap(stream => Rx.Node.fromStream(stream))
  .map(indexCard => {
    indexCard._trigger = indexCard.trigger;
    delete indexCard._id;
    delete indexCard.trigger;
    return indexCard;
  })
  .flatMap(obj => create(obj))
  .catch(stream.throw)
  .do(console.log)
  .subscribe(d => {

  })

  app.listen(function() {
    app.emit('started');
    console.log('Web server listening at: %s', app.get('url'));
  })


  // IndexCard.observe('after save', function(ctx, next) {
  //
  // });

  // var CardContainer = app.loopback.createModel({
  //   name: 'CardContainer',
  //   strict: 'validate',
  //   relations: {
  //     indexCard: {
  //       type: 'embedsOne',
  //       model: 'IndexCard',
  //       property: 'indexCard',
  //       options: {
  //         validate: true
  //       }
  //     }
  //   }
  // });
  //
  // app.model(CardContainer, { dataSource: 'mongo' });

  // CardContainer.observe('before save', function(ctx, next) {
  //   console.log(ctx.instance);
  //   next()
  // })
