var mongo = require('mongodb');
var monk = require('monk');
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path")

var db = monk("mongodb://creativecoding:creativecoding@ds035897.mongolab.com:35897/index_cards")

var parent = "data/eval-2015-fries-cards-v2";

var readdir = Promise.promisify(fs.readdir);

var includes = function(string, match) {
    return string.indexOf(match) !== -1;
}

var collection_name = "index_cards_v0"

var collection = db.get(collection_name);

function readCards(parent) {
    console.log("read cards");
    var files = readdir(parent)
        .filter(function(dir_name) {
            return dir_name.charAt(0) !== "."
        })
        .map(function(dir_name) {
            return readdir( path.resolve(parent, dir_name) )
                .map(function(inner) {
                    return path.resolve(parent, dir_name, inner);
                })
        })
        .reduce(function(a, b) { return a.concat(b); })
        .filter(function(file_name) {
            return includes(file_name, "_mskcc.json");
        })
        .each(function(path) {
            var file = require(path);
            collection.insert(file)
                .then(function() {
                    console.log("inserted")
                    collection.count().then(function(d) { console.log(d) });
                });
        })
}

// readCards(parent)
