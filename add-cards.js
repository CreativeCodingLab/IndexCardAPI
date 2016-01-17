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
const referenceDir = path.resolve(__dirname, '..', '..', 'reference_cards') //process.argv[3]

const readFile = stream.fromNodeCallback(fs.readFile)
const readdir = stream.fromNodeCallback(fs.readdir)

const mitreSet = { name: 'Mitre Reference', members: [ 232344 ] }

const dbPromise = MongoClient.connect('mongodb://localhost:27017/index_cards')

const db$ = stream.fromPromise(dbPromise)

function dropDatabase(db$) {
  return db$
    .map(db => db.dropDatabase())
    .flatMap(stream.fromPromise)
    .do(result => console.log('Dropped database:', result))
    .flatMap(db$)
}

const addCardSet = db$ => setObject =>
  db$
    .map(db => db.collection('card_sets'))
    .do(c => console.log('Got collection:', c.collectionName))
    .flatMap(c => {
      return stream.fromPromise(c.findOne(setObject))
        .do(result => console.log('Found object:', result))
        .do(result => {
          if (result !== null)
          throw new Error('A set with this name already exists.')
        })
        .catch(e => { console.error(e); return stream.empty() })
        .map(r => c)
        .map(c => c.insertOne(setObject))
        .flatMap(stream.fromPromise)
        .do(r => {
          console.log('Result:', r.result)
          console.log('insertedCount:', r.insertedCount)
        })
    })
    .flatMap(db$)

const referenceCard$ = readdir(referenceDir)
  .do(arr => console.log('Directory files count:', arr.length))
  .flatMap(arr => {
    let fullPaths = arr.map(f => path.join(referenceDir, f))
    return stream.for(fullPaths, f => readFile(f, 'utf8'))
  })
  .map(JSON.parse)
  .do(obj => obj._id = ObjectID(obj._id.$oid))

stream.just(true)
  .flatMap(dropDatabase(db$))
  .flatMap(addCardSet(db$)(mitreSet))
  .flatMap(() => {
    let cardSetCollection$ = db$
      .map(db => db.collection('card_sets'))
    // let targetSet$ = cardSetCollection$
    //   .map(c => c.findOne(mitreSet))
    let cardCollection$ = db$
      .map(db => db.collection('cards'))
    return referenceCard$
      .withLatestFrom(
        cardCollection$,
        (obj, c) => c.insertOne(obj)
      )
      .flatMap(r => stream.fromPromise(r))
      .map(res => res.insertedId)
      // .flatMap(id => {
      //   return db$
      //     .map(db => db.collection('card_sets'))
      //     // .map(c => c.findOne())
      //     .map(c => c.update({ mitreSet, { $push: { members: 333 } }))
      //     .flatMap(stream.fromPromise)
      //     .flatMap(db$)
      //     .map(db => db.collection('card_sets'))
      //     .map(c => c.findOne())
      //     .flatMap(stream.fromPromise)
      //     .do(console.log)
      // })
      // .do(console.log)
      .withLatestFrom(
        cardSetCollection$,
        // (id, c) => ({ id: id, c: c.collectionName })
        (id, c) => {
          console.log(id)
          let query = { _id: mitreSet._id }
          let update = { $addToSet: { members: id } }
          return c
            .updateOne(query, update)
            .then(() => c.findOne())
        }
      )
      .flatMap(r => stream.fromPromise(r))
      .do(console.log)
      // .flatMap(r => stream.fromPromise(r))
  })
  // .flatMap(db => stream.just(true))
  // .do(console.log)
  .subscribe()

// const cardSets = dbPromise
//   .then(db => {
//     db.dropDatabase()
//     return db
//   })
//   .then(db => db.collection('card_sets'))
//
// cardSets
//   .then(c => c.insertOne(mitreSet))
//   .then(r => console.log(r.result))
//   .then(r => cardSets)
//   .then(c => c.findOne())
//   .then(o => console.log(o))
//   .then(r => cardSets)
//   .then(c => c.updateOne({ _id: mitreSet._id }, { $push: { members: 567 } }, { writeConcern: { w: 1, j: true } }))
//   // .then(c => c.updateOne(mitreSet, { $push: { members: 567 } }, (err, r) => {
//   //   console.log(r.modifiedCount)
//   //   c.updateOne(mitreSet, { $push: { members: 345 } })
//   // }))
//   .then(r => console.log(r.result))
//   .then(r => cardSets)
//   .then(c => c.findOne())
//   .then(o => console.log(o))
//   .then(r => cardSets)
//   .then(c => c.updateOne({ _id: mitreSet._id }, { $push: { members: 6758 } }, { writeConcern: { w: 1, j: true } }))
//   .then(r => console.log(r.result))
//   .then(r => cardSets)
//   .then(c => c.findOne())
//   .then(o => console.log(o))
// //   .then(r => cardSets)
// //   .then(c => c.updateOne(mitreSet, { $push: { members: 6758 }}))
// //   .then(r => console.log(r.result))
// //   .then(r => cardSets)
// //   .then(c => c.findOne())
// //   .then(o => console.log(o))
// //   .then(r => cardSets)
// //   .then(c => c.updateOne(mitreSet, { $push: { members: 6758 }}))
// //   .then(r => console.log(r.result))
//   // .then(r => cardSets)
//   // .then(c => c.update(mitreSet, { $push: { members: 122342343 }}))
//   // .then(r => cardSets)
//   // .then(c => c.findOne())
//   // .then(o => console.log(o))


//
// // Drop database
// // const db2$ = db$
// //   .map(db => db.dropDatabase())
// //   .flatMap(stream.fromPromise)
// //   .do(result => console.log('Dropped database:', result))
// //   .flatMap(db$)
// //   // Get card_sets collection
// //   .map(db => db.collection('card_sets'))
// //   .do(c => console.log('Got collection:', c.collectionName))
// //   // Add 'Mitre Reference' set if not exists
// //   .flatMap(c => {
// //     return stream.fromPromise(c.findOne(mitreSet))
// //       .do(result => console.log('Found object:', result))
// //       .do(result => {
// //         if (result !== null)
// //         throw new Error('A set with this name already exists.')
// //       })
// //       .catch(e => { console.error(e); return stream.empty() })
// //       .map(r => c)
// //       .map(c => c.insertOne(mitreSet))
// //       .flatMap(stream.fromPromise)
// //       .do(r => {
// //         console.log('Result:', r.result)
// //         console.log('insertedCount:', r.insertedCount)
// //       })
// //   })
// //   .flatMap(db$)
// //   .subscribe()
//
// // const actions = [
// //   {
// //     name: 'drop database',
// //     func: dropDatabase
// //   },
// //   {
// //     name: 'add mitre reference card set'
// //   }
// // ]
//
// // function dropDatabase(db$) {
// //   return db$
// //     .map(db => db.dropDatabase())
// //     .do(result => console.log("Dropped database", result))
// // }
// //
//
//
// // const cardSets$ = db$.map(db => db.collection('card_sets'))
//
// // cardSets$
// //   .map(collection => collection.count())
// //   .flatMap(stream.fromPromise)
// //   .do(console.log.bind(null, 'Card sets:'))
// //   .flatMap(cardSets$.map(c => c.find()))
// //   .flatMap(Rx.Node.fromStream) // .flatMap(cursor => stream.fromEvent(cursor, 'data'))
// //   .do(console.log)
// //   .flatMapObserver(stream.empty, stream.empty, () => cardSets$)
// //   .do(() => console.log(`Attempting to insert set named ${setName}`))
// //   .map(c => c.findOne({ name: setName }))
// //   .flatMap(stream.fromPromise)
// //   .do(result => {
// //     if (result !== null)
// //     throw new Error('A set with this name already exists.')
// //   })
// //   .catch(e => { console.error(e); return stream.empty() })
// //   .flatMap(cardSets$)
// //   .map(c => c.insertOne({ name: setName }))
// //   .flatMap(stream.fromPromise)
// //   .do(console.log)
// //   .subscribe()
// //
// // const collection$ = db$
// //   .map(db => db.collection('cards'))
//
//   // .do(console.log)
//   // .subscribe()
//
// // readdir(directory)
// //   .flatMap(arr => {
// //     let fullPaths = arr.map(f => path.join(directory, f))
// //     return stream.for(fullPaths, f => readFile(f, 'utf8'))
// //   })
// //   .map(JSON.parse)
// //   .do(obj => obj._id = ObjectID(obj._id.$oid))
// //   .withLatestFrom(
// //     collection$,
// //     // (json, coll) => coll.insertOne(json)
// //     // (j, coll) => coll.findOne({ _id: 123 })
// //     (obj, coll) => coll.findOne(obj)
// //   )
// //   .flatMap(stream.fromPromise)
// //   // .catch(e => console.error(e))
// //   .do(console.log)
// //   .subscribeOnCompleted(() => process.exit())
//
//
// // .do(obj => console.log(`Read card file: ${obj._id}`))
// //   .withLatestFrom(
// //     collection$,
// //     // (json, coll) => coll.insertOne(json)
// //     // (j, coll) => coll.findOne({ _id: 123 })
// //     (obj, coll) => coll.findOne(obj)
// //   )
// //   .flatMap(stream.fromPromise)
// //   // .catch(e => console.error(e))
// //   .do(console.log)
