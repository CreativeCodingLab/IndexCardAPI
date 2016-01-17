var MongoClient = require('mongodb').MongoClient

var dbPromise = MongoClient.connect('mongodb://localhost:27017/index_cards')

dbPromise.then(db => {
  db
    .dropDatabase()
    .then(() => db.createCollection('card_sets'))
    .then(() => db.createCollection('cards'))
    .then(() => db.createCollection('comparisons'))
    .then(() => db.listCollections().toArray())
    .then(arr => console.log(arr))

})
