'use strict'

const mongodb = require('mongodb'),
  assert = require('assert'),
  Rx = require('rx'),
  fs = require('fs'),
  path = require('path');

Rx.Node = require('rx-node');

const MongoClient = mongodb.MongoClient,
  ObjectID = mongodb.ObjectID;

const stream = Rx.Observable;

const setName = 'test-set' //process.argv[2]
const directory = path.resolve(__dirname, '..', '..', 'reference_cards') //process.argv[3]

const dbPromise = MongoClient.connect('mongodb://localhost:27017/index_cards')
const db$ = stream.fromPromise(dbPromise)

const readFile = stream.fromNodeCallback(fs.readFile)
const readdir = stream.fromNodeCallback(fs.readdir)

const cardSets$ = db$.map(db => db.collection('card_sets'))

cardSets$
  .map(collection => collection.count())
  .flatMap(stream.fromPromise)
  .do(console.log.bind(null, 'Card sets:'))
  .flatMap(cardSets$.map(c => c.find()))
  .flatMap(Rx.Node.fromStream) // .flatMap(cursor => stream.fromEvent(cursor, 'data'))
  .do(console.log)
  .flatMapObserver(stream.empty, stream.empty, () => cardSets$)
  .do(() => console.log(`Attempting to insert set named ${setName}`))
  .map(c => c.findOne({ name: setName }))
  .flatMap(stream.fromPromise)
  .do(result => {
    if (result !== null)
    throw new Error('A set with this name already exists.')
  })
  .catch(e => { console.error(e); return stream.empty() })
  .flatMap(cardSets$)
  .map(c => c.insertOne({ name: setName }))
  .flatMap(stream.fromPromise)
  .do(console.log)
  .subscribe()

const collection$ = db$
  .map(db => db.collection('cards'))

  // .do(console.log)
  // .subscribe()

// readdir(directory)
//   .flatMap(arr => {
//     let fullPaths = arr.map(f => path.join(directory, f))
//     return stream.for(fullPaths, f => readFile(f, 'utf8'))
//   })
//   .map(JSON.parse)
//   .do(obj => obj._id = ObjectID(obj._id.$oid))
//   .withLatestFrom(
//     collection$,
//     // (json, coll) => coll.insertOne(json)
//     // (j, coll) => coll.findOne({ _id: 123 })
//     (obj, coll) => coll.findOne(obj)
//   )
//   .flatMap(stream.fromPromise)
//   // .catch(e => console.error(e))
//   .do(console.log)
//   .subscribeOnCompleted(() => process.exit())
