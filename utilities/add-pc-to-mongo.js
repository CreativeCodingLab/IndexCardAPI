var mongo = require('mongodb');
var monk = require('monk');
var Promise = require("bluebird");
var fs = require("fs");
var path = require("path");
var oboe = require("oboe");

var db_name = "index_cards_v2";
var collection_name = "pc_cards";

var db = monk("127.0.0.1:27017/" + db_name);

var collection = db.get(collection_name);

var pc_json_path = path.resolve(__dirname, "..", "data", "FRIES Data", "PC.json");

var stream = fs.createReadStream(pc_json_path);

var i = 0;

oboe(stream)
    .node("!.*", function(node, path) {

        collection.insert(node, { w: 0 });

        return oboe.drop;
    })
    .done(function() {
        console.log("done.")
        process.exit(0);
    })
