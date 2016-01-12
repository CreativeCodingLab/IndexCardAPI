var mongo = require('mongodb');
var monk = require('monk');
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path");
var oboe = require("oboe");

var db_name = "index_cards_v2";
var collection_name = "fries_cards";

var db = monk("127.0.0.1:27017/" + db_name);
var collection = db.get(collection_name);

var parent_fries_dir = path.resolve(__dirname, "..", "data", "eval-2015-fries-cards-v2");

var go = function(parent_fries_dir) {
    var readdir = Promise.promisify(fs.readdir);

    readdir(parent_fries_dir)
        .filter(function(dir_name) {
            // Filter system files
            return dir_name.charAt(0) !== "."
        })
        .map(function(dir_name) {
            var outer = path.resolve(parent_fries_dir, dir_name);
            return readdir(outer)
                .map(function(inner) {
                    return path.resolve(outer, inner);
                })
        })
        .reduce(function(a, b) { return a.concat(b); })
        .filter(filenameIncludes(".json"))
        .filter(filenameDoesntInclude("_mskcc"))
        .each(function(_path) {
            var json = require(_path);
            json._filename = path.basename(_path, ".json");
            return collection.insert(json)
                .then(function() {
                    console.log(json._filename);
                    delete require.cache[_path];
                });
        })
        .then(function() {
            console.log("Done.");
            process.exit(0);
        })

}

var filenameIncludes = function(string) {
    return function(file_name) {
        return file_name.toLowerCase().indexOf(string.toLowerCase()) > -1;
    }
}

var filenameDoesntInclude = function(string) {
    return function(file_name) {
        return file_name.toLowerCase().indexOf(string.toLowerCase()) == -1;
    }
}

var is_match_file = function(file_name) {
    return file_name.toLowerCase().indexOf("_match") > -1;
}

go(parent_fries_dir);











// var i = 0;
//
// oboe(stream)
//     .node("!.*", function(node, path) {
//         console.log(++i);
//
//         node._id = mongo.ObjectId();
//
//         collection.insert(node);
//
//         out.write(JSON.stringify(node));
//         out.write(",\n");
//
//         return oboe.drop;
//     })
//     .done(function() {
//         out.write("]");
//         console.log("done.")
//         out.end();
//         process.exit(0);
//     })
