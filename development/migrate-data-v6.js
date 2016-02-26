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

app.dataSource('db', {
  "name": "db",
  "connector": "memory"
});

var mongo = app.dataSource('mongo', {
  name: 'mongo',
  connector: 'mongodb',
  database: 'index_cards'
});

var IndexCard = app.loopback.createModel({
  name: 'IndexCard',
  // strict: 'validate',
  relations: {
    mitreIndexCard: {
      type: 'hasOne',
      model: 'MitreIndexCard',
      property: 'mitreIndexCard',
      options: {
        validate: true,
        persistent: true
      }
    }
  }
});

var MitreIndexCard = app.loopback.createModel({
  name: 'MitreIndexCard',
  // strict: 'validate',
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

var NXML = app.loopback.createModel({
  name: 'NXML'
});

app.model(IndexCard, { dataSource: 'mongo' });
app.model(MitreIndexCard, { dataSource: 'mongo' });
app.model(NXML, { dataSource: 'mongo' });

IndexCard.createFromMitreIndexCard = function(mitreCard, cb) {
  debug('Creating from Mitre Index Card');
  debug('Evidence', mitreCard.evidence);

  let indexCard$ = stream
    .fromPromise(IndexCard.create({ pmc_id: mitreCard.pmc_id }))
    .do(c => debug('Index Card created', c.id))
    .share();

  indexCard$
    .map(indexCard => indexCard.mitreIndexCard.create(mitreCard))
    .flatMap(stream.fromPromise)
    .do(created => debug('Attached Mitre Card', created.id))
    .subscribe();
}

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
  .map(collection => collection.find())
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
