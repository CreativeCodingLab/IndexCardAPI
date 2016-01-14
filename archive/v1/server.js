var express = require("express");
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
var assert = require("assert");
var app = express();
var fs = require('fs');

var db_name = "index_cards_v2";
var db_url = "mongodb://127.0.0.1:27017/" + db_name;

var db = MongoClient.connect(db_url);

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.json({ strict: false }));

app.get("/all-with-conflict", function(request, response) {
    db.then(function(db) {
        return db.collection("card_matches")
            .find({
                score: { $gt: 0 },
                "match.100": { $exists: false }
            }).toArray()
    })
    .then(function(array) {
        var a = array
            .filter(function(m) { return m.match.some(function(d) { return d.potentialConflict && d.score }) })
        response.json(a);
    })
})

app.get("/all-with-superset", function(request, response) {
    db.then(function(db) {
        return db.collection("card_matches")
            .find({
                score: { $gt: 0 },
                // "match.100": { $exists: true }
            }).toArray()
    })
    .then(function(array) {
        var a = array
            .filter(function(m) { return m.match.some(function(d) { return (d.deltaFeature == "superset") && parseInt(d.score) > 0 }) })
        response.json(a);
    })
})

app.get("/all-with-delta-feature/:feature", function(request, response) {
    db.then(function(db) {
        return db.collection("card_matches")
            .find({
                score: { $gt: 0 },
                // "match.100": { $exists: false }
            }).toArray()
    })
    .then(function(array) {
        var a = array
            .filter(function(m) { return m.match.some(function(d) { return (d.deltaFeature == request.params.feature) && parseInt(d.score) > 0 }) })
        response.json(a);
    })
})

app.get("/all-with-delta-feature-limit/:feature", function(request, response) {
    db.then(function(db) {
        return db.collection("card_matches")
            .find({
                score: { $gt: 5 },
                "match.100": { $exists: false }
            }).toArray()
    })
    .then(function(array) {
        var a = array
            .filter(function(m) { return m.match.some(function(d) { return (d.deltaFeature == request.params.feature) && parseInt(d.score) > 0 }) })
        response.json(a);
    })
})

app.post("/get-one", function(request, response) {

    var body = request.body;

    db.then(function(db) {
        return db.collection(body.collection)
            .findOne({ _id: ObjectID(body._id) })
            .then(function(json) {
                response.json(json)
            })
    })
    // response.json(request.body);
});

app.get("/matches/score-above-zero/participant-b/:query", function(request, response) {
    
    // In case we want to read from a static example:
    //
    // if (request.params.query == "Uniprot:P25963") {
    //     fs.readFile(__dirname + "/static/Uniprot_P25963.json", function(err, data) { response.json(JSON.stringify(JSON.parse(data))) })
    //     return
    // }
    
    response.write("[")
    db.then(function(db) {
        return db.collection("card_matches")
            .find({ score: { $gt: 0 }, _participant_b_ids: request.params.query })
            .stream({ transform: function(doc) { return JSON.stringify(doc); }});
    })
    .then(function(stream) {
        stream.once("end", function() { response.write("]"); response.end() });
        stream.on("data", function(d) { response.write(d); response.write(",") });
    })
    // response.end(request.params.query)
});

app.get("/matches/score-above-zero-stream-limit/:limit", function(request, response) {
    response.write("[")
    db.then(function(db) {
        return db.collection("card_matches")
            .find({ score: { $gt: 0 } })
            .limit(parseInt(request.params.limit))
            .stream({ transform: function(doc) { return JSON.stringify(doc); }});
    })
    .then(function(stream) {
        stream.once("end", function() { response.write("]"); response.end() });
        stream.on("data", function(d) { response.write(d); response.write(",") });
    })
});

app.get("/matches/score-above-zero-stream.json", function(request, response) {
    response.write("[")
    db.then(function(db) {
        return db.collection("card_matches").find({ score: { $gt: 0 } })
            .stream({ transform: function(doc) { return JSON.stringify(doc); }});
    })
    .then(function(stream) {
        stream.once("end", function() { response.write("]"); response.end() });
        stream.on("data", function(d) { response.write(d); response.write(",") });
    })
});

app.get("/matches/score-above-zero.json", function(request, response) {
    db.then(function(db) {
        return db.collection("card_matches").find({ score: { $gt: 0 } }).toArray()
    })
    .then(function(json) {
        response.json(json);
    })
});

app.get("/matches/all-matches-count.json", function(request, response) {
    db.then(function(db) {
        return db.collection("card_matches").count()
    })
    .then(function(json) {
        response.json(json);
    })
});

var server = app.listen(9000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});
