// var mongo = require('mongodb');
// var monk = require('monk');
var mongoskin = require("mongoskin")
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path");
var _ = require('underscore');

var IndexCardUtils = require('./index-card-vis/pathway-cards/comparator/src/main/scripts/IndexCardUtils.js');

var db_name = "index_cards_v2";
var db = mongoskin.db("mongodb://127.0.0.1:27017/" + db_name);

var participant_ids;

var i = 0;

var collection = db.collection("fries_cards");

collection.find()
    .each(function(error, card) {

        if (! card) return;

        participant_ids = ["participantA", "participantB"]
        	.map(function(func_name) {
        		return IndexCardUtils[func_name](card);
        	})
        	.map(function(participant) {
        		return IndexCardUtils.extractAllIds(participant, null, false);
        	});


        card._participant_a_ids = participant_ids[0];
        card._participant_b_ids = participant_ids[1];

        collection.save(card, function(err) { if (err) console.log(err); });

        console.log(++i)
    })
