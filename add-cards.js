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

const dbPromise = MongoClient.connect('mongodb://localhost:27017/index_cards')

const db$ = stream.fromPromise(dbPromise)

function dropDatabase(db$) {
  return db$
    .map(db => db.dropDatabase())
    .flatMap(stream.fromPromise)
    .do(result => console.log('Dropped database:', result))
    .flatMap(db$)
}

function addCardSet(db$) {
  return function (setObject) {
    return db$
      .map(db => db.collection('card_sets'))
      // .do(c => console.log('Got collection:', c.collectionName))
      .flatMap(c => {
        return stream.fromPromise(c.findOne(setObject))
          // .do(result => console.log('Found object:', result))
          .do(result => {
            if (result !== null)
            throw new Error('A set with this name already exists.')
          })
          .catch(e => { console.error(e); return stream.empty() })
          .map(r => c)
          .map(c => c.insertOne(setObject))
          .flatMap(stream.fromPromise)
          // .do(r => {
          //   console.log('Result:', r.result)
          //   console.log('insertedCount:', r.insertedCount)
          // })
      })
      .flatMap(db$)
  }
}

const readFile = stream.fromNodeCallback(fs.readFile)
const readdir = stream.fromNodeCallback(fs.readdir)
const parentDir = path.resolve(__dirname, '..', '..')

function readCards (directory) {
  let dirPath = path.resolve(parentDir, directory)
  let object$ = readdir(dirPath)
    .do(arr => console.log('Directory files count:', arr.length))
    .flatMap(arr => {
      let fullPaths = arr.map(f => path.join(dirPath, f))
      return stream.for(fullPaths, f => readFile(f, 'utf8'))
    })
    .map(JSON.parse)
    .do(obj => obj._id = ObjectID(obj._id.$oid))
  return object$
}

function insertCards(db$) {
  let cardCollection$ = db$
    .map(db => db.collection('cards'))
  return function(card$) {
    return card$
      .withLatestFrom(
        cardCollection$,
        (obj, c) => c.insertOne(obj)
      )
      .flatMap(r => stream.fromPromise(r))
      .map(res => res.insertedId)
  }
}

function addIdsToSet(setObject) {
  let setId = setObject._id
  let query = { _id: setId }
  let cardSetCollection$ = db$
    .map(db => db.collection('card_sets'))
  return function(id$) {
    return id$
      .withLatestFrom(
        db$.map(db => db.collection('card_sets')),
        (id, c) => {
          let update = { $addToSet: { members: id } };
          return c.updateOne(query, update)
        }
      )
      .flatMap(r => stream.fromPromise(r))
  }
}

const referenceCard$ = readCards('reference_cards')
const friesCard$ = readCards('fries_submission_1')

const mitreSet = { name: 'Mitre Reference', members: [] }
const friesSet = { name: 'Fries Submission 1', members: [] }

const cardSetCollection$ = db$
  .map(db => db.collection('card_sets'))

stream.just(true)
  .flatMap(dropDatabase(db$))
  .flatMap(addCardSet(db$)(mitreSet))
  .flatMap(addCardSet(db$)(friesSet))
  .flatMap(() => {
    let insertedId$ = insertCards(db$)(referenceCard$)
    return addIdsToSet(mitreSet)(insertedId$)
      .flatMapObserver(stream.empty, stream.empty, () => stream.just(true))
  })
  // .flatMap(() => {
  //
  // })
  .do(() => console.log('Done'))
  .subscribe()