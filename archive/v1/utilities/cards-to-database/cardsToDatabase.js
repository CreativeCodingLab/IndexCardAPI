var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/fries');
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path")

var parent = "eval-2015-fries-cards-v2";

var readdir = Promise.promisify(fs.readdir);

var includes = function(string, match) {
    return string.indexOf(match) !== -1;
}

var collection = db.get('index_cards');

// collection.count().then(function(d) { console.log(d) })

// collection.find().then(console.log)

function readCards(parent) {
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
            var result = collection.insert(file);
            // console.log(result)
        })
}

// readCards(parent)
