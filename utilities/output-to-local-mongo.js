var mongo = require('mongodb');
var monk = require('monk');
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path");

var db_name = "index_cards";
var collection_name = "cards";

var db = monk("127.0.0.1:27017/" + db_name);

var collection = db.get(collection_name);

// collection.drop();

var parent = "output";

var readdir = Promise.promisify(fs.readdir);

var is_not_match_file = function(file_name) {
    return file_name.toLowerCase().indexOf("_match") == -1;
}

var is_match_file = function(file_name) {
    return file_name.toLowerCase().indexOf("_match") > -1;
}

var get_path = function(parent) {
    return function(file_name) {
        if (! file_name) return undefined;
        return path.resolve(parent, file_name);
    }
}

var getMatchFile = function(json) {
    var file_name = json._file_name;

    return all_cards
        .filter(function(file) {
            return file.indexOf(file_name + "_match") > -1;
        })
        .then(function(arr) { return arr[0]; })
}

var max_num_files = 1e7;

var all_cards = readdir(parent)

var getMatchesArray = function(matchFilePath) {
    if (! matchFilePath) return [];
    try {
        return require(matchFilePath);
    }
    catch (e) {
        console.log(e);
        return []
    }
}

var concur = { concurrency: 10 }

all_cards
    .filter(is_not_match_file)
    .then(function(array) {
        return array.slice(0, max_num_files);
    })
    .map(get_path(parent))
    .map(function(_path) {
        var json = require(_path);
        json._file_name = path.basename(_path, ".json");
        return json;
    }, concur)
    .tap(function() { console.info("Loaded initial files."); })
    .map(function(json) {
        return collection
            .findOne({ _file_name: json._file_name })
            .then(function(d) {
                var found = d !== null;
                return { found: found, json: json }
            });
    }, concur)
    .filter(function(obj) {
        return obj.found === false;
    }, concur)
    .map(function(obj) {
        return obj.json;
    }, concur)
    .tap(function() { console.info("Filtered existing database files."); })
    .map(function(json) {
        return getMatchFile(json)
            .then(get_path(parent))
            .then(getMatchesArray)
            .then(function(array) {
                json.matches = array;
                return json;
            })
            .then(function(json) {
                return collection.insert(json)
            })
            .tap(function() {
                collection.count().then(function(c) { console.log(Date() + " " + c); })
                // console.log(Date() + " Inserted one.");
            })
    }, concur)
    .then(function() {
        process.exit(0);
    })
