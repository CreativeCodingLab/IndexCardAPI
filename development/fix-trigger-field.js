'use strict'

var Rx = require('rx');
var mongodb = require('mongodb');
const debug = require('debug');
Rx.Node = require('rx-node');

debug.enable('*');

const stream = Rx.Observable;
var MongoClient = mongodb.MongoClient;

const dbName = 'index_cards_loopback';
const connection = `mongodb://localhost:27017/${dbName}`;

const dbPromise = MongoClient.connect(connection);

const db$ = stream.fromPromise(dbPromise);

const mitre_old$ = db$
  .map(db => db.collection('mitre_old'));

const mitre_new$ = db$
  .map(db => db.collection('MitreIndexCard'));

mitre_old$
  .map(c => c.find())
  .flatMap(Rx.Node.fromStream)
  .map(doc => {
    doc.trigger = doc._trigger;
    delete doc._trigger;
    delete doc._id;
    return doc;
  })
  .flatMap(doc => {
    return mitre_new$.map(c => c.insertOne({ card: doc }));
  })
  .flatMap(p => stream.fromPromise(p))
  .do(r => debug('result')(r.insertedId))
  .subscribe()

  // .share();

// collection$
//   .map(c => c.find({ trigger: { $exists: true } }).count())
//   .flatMap(r => stream.fromPromise(r))
//   .do(console.log)
//   .subscribe()

// collection$
//   .map(collection => {
//     let query = { trigger: { $exists: true } };
//     return collection.find(query);
//   })
//   .flatMap(Rx.Node.fromStream)
//   .flatMap(doc => {
//     let filter = { _id: doc._id };
//     let update = { $rename: { 'trigger': '_trigger' } };
//     return collection$.map(c => c.updateOne({ _id: doc._id }, update))
//   })
//   .flatMap(p => stream.fromPromise(p))
//   .do(r => console.log(r.result))
//   .subscribe()
