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

const collection$ = db$
  .map(db => db.collection('IndexCard'));

collection$
  .map(c => c.find())
  .flatMap(Rx.Node.fromStream)
  // .map(doc => {
  //   doc.nxmlId = `PMC${doc.mitreCard.pmc_id}`;
  //   return doc;
  // })
  // .map(doc => {
  //   doc.trigger = doc._trigger;
  //   delete doc._trigger;
  //   delete doc._id;
  //   return doc;
  // })
  .flatMap(doc => {
    let filter = { _id: doc._id };
    let update = { $set: { nxmlId: `PMC${doc.mitreCard.pmc_id}` } };
    return collection$.map(c => c.updateOne(filter, update));
  })
  //   .flatMap(doc => {
  //     let filter = { _id: doc._id };
  //     let update = { $rename: { 'trigger': '_trigger' } };
  //     return collection$.map(c => c.updateOne({ _id: doc._id }, update))
  //   })
  .flatMap(p => stream.fromPromise(p))
  .do(r => debug('result')(r.modifiedCount))
  // .do(console.log)
  .subscribe()
