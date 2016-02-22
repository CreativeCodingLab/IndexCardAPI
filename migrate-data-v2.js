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

var Participant = app.loopback.createModel({
  name: 'Participant',
  strict: 'validate',
  properties: {
    in_model: {
      type: Boolean,
      required: true
    },
    entity_text: {
      type: String,
      required: true
    },
    entity_type: {
      type: String,
      required: true
    },
    identifier: {
      type: String,
      generated: false,
      id: true
    }
  }
});

// var IndexCardParticipant = app.loopback.createModel({
//   name: 'IndexCardParticipant'
// });

// var ExtractedInformation = app.loopback.createModel({
//   name: 'ExtractedInformation',
//   strict: 'validate',
//   properties: {
//     interaction_type: {
//       type: String,
//       required: true
//     },
//     negative_information: {
//       type: String,
//       required: true
//     },
//     hypothesis_information: {
//       type: Boolean,
//       required: true
//     }
//   },
// });

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
    // extractedInformation: {
    //   // type: 'embedsOne',
    //   type: 'hasOne',
    //   model: 'ExtractedInformation',
    //   property: 'extracted_information',
    //   options: {
    //     validate: true,
    //     persistent: true
    //   }
    // },
    mitreIndexCard: {
      type: 'hasOne',
      model: 'MitreIndexCard',
      property: 'mitreIndexCard',
      options: {
        validate: true,
        persistent: true
      }
    },
    // participant_as: {
    //     type: 'hasAndBelongsToMany',
    //     model: 'Participant',
    //     property: 'participant_a_array',
    //     options: {
    //       validate: true,
    //       persistent: true
    //     }
    // }
  }
});

// var ExtractedInformationParticipant = app.loopback.createModel({
//   name: 'ExtractedInformationParticipant'
// });



const mitre_properties = Object.assign({}, IndexCard.definition.properties);
mitre_properties.extracted_information = {
  type: Object,
  required: true
}

var MitreIndexCard = app.loopback.createModel({
  name: 'MitreIndexCard',
  strict: 'validate',
  properties: mitre_properties,
  relations: {
    indexCard: {
      type: 'belongsTo',
      model: 'IndexCard',
      property: 'indexCard',
      options: {
        validate: true,
        persistent: true
      }
    }
  }
});


IndexCard.createFromMitreIndexCard = function(mitreCard, cb) {
  debug('Creating from Mitre Index Card');
  debug('Evidence', mitreCard.evidence);

  let without_extracted = Object.assign({}, mitreCard);
  delete without_extracted.extracted_information;

  let indexCard$ = stream
    .fromPromise(IndexCard.create(without_extracted))
    .do(c => debug('Index Card created', c.id))
    .share();

  indexCard$
    .map(indexCard => indexCard.mitreIndexCard.create(mitreCard))
    .flatMap(stream.fromPromise)
    .do(created => debug('Attached Mitre Card', created.id))
    .subscribe();

  let extracted = mitreCard.extracted_information;

  let extracted_without_participants = Object.assign({}, extracted);
  delete extracted_without_participants.participant_a;
  delete extracted_without_participants.participant_b;

  let extracted$ = indexCard$
    .map(indexCard =>
      indexCard.extractedInformation.create(extracted_without_participants)
    )
    .flatMap(stream.fromPromise)
    .do(created => debug('Attached Extracted Information', created.id))
    .share();

IndexCard.createFromReachOutput = function(card, cb) {
  debug('card', card);
  cb(null, card);
}

// IndexCard.create = function()


  // ['a', 'b']
  //   .map(side => {
  //     let part = extracted[`participant_${side}`];
  //     let arr = (typeof part === 'Array' ? part : [part]);
  //     stream.from(arr)
  //       .map(p => {
  //         return Participant
  //           .findOrCreate({ where: { identifier: p.identifier } }, p)
  //       })
  //       .flatMap(stream.fromPromise)
  //       .map(arr => arr[0])
  //       .withLatestFrom(
  //         indexCard$,
  //         (part, card) => card.participant_as.add(part)
  //       )
  //       .flatMap(stream.fromPromise)
  //       .do(console.log)
  //       // .subscribe()
  //   })
}

app.model(Participant, { dataSource: 'mongo' });
app.model(ExtractedInformation, { dataSource: 'transient' });
app.model(IndexCard, { dataSource: 'mongo' });
// app.model(IndexCardParticipant, { dataSource: 'mongo' });
app.model(MitreIndexCard, { dataSource: 'mongo' });

const create = function(data) {
  return stream.create(observer =>
    app.models.IndexCard.createFromMitreIndexCard(data, function(e,d) {
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
  })
  .flatMap(create)
  .subscribe();

app.middlewareFromConfig(loopback.rest, { paths: [ '/api' ], phase: 'routes' });

explorer(app, { basePath: '/api', mountPath: '/explorer' });

app.listen(function() {
  app.emit('started');
  console.log('Web server listening at: %s', app.get('url'));
})







//
// stream
//   .combineLatest(
//     extracted$,
//     participantA$,
//     (e, p) => e.participantAs.add(p)
//   )
//   .flatMap(stream.fromPromise)
//   .do(console.log)
//   .subscribe()

    // .subscribe()

  // participant_a_array
  //   .map(participant => Participant.findOrCreate({ identifier: '12414' }, participant))
  //   .map(p => )
  //   .forEach(r => console.log(r))

  // let participantAs = stream
  //   .from(participant_a_array)
  //   .do(console.log)
  //   .map(participant => Participant.findOrCreate({ identifier: participant.identifier }, participant))
  //   .flatMap(stream.fromPromise)
  //   .do(d => console.log(d))
  //   .subscribe();

  // let participant_a$ = extracted$
  //   .map(extracted => {
  //     participant_a_array.map(obj => {
  //       let partA = extracted.participantA.build(obj);
  //
  //       console.log(partA);
  //     })
  //   })
  //   // .map(extracted => extracted.participantAs.build(participant_a_array))
  //   // .map(extracted => {
  //   //   let partA = extracted.participantAs.create(participant_a_array);
  //   //   console.log(participant_a_array, partA);
  //   //   return partA;
  //   // })
  //   // .flatMap(stream.fromPromise)
  //   .do(console.log)
  //   // .do(e => console.dir(e.participantA))
  //   .subscribe()

// stream.fromPromise(MitreIndexCard.create(card))
//   .do(c => debug('Mitre Card created', c.id))
//   .map(mitreCard => {
//     return stream.fromPromise(IndexCard.create(without_extracted))
//       .map(indexCard => {
//         indexCard.mitreIndexCard()
//       })
//   })
//   .flatMap(stream.fromPromise)
//
//   .subscribe(c => cb(null, card));
// cb(null, card);

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
