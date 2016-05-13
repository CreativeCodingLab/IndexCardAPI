'use strict'

const loopback = require('loopback');
const explorer = require('loopback-component-explorer');
const debug = require('debug');
const IndexCardComparator = require('../mskcc-index-card-tools/IndexCardComparator');

var app = module.exports = loopback();

app.set('legacyExplorer', false);

app.use('/api', loopback.rest());

app.get('/', (req, res) => {
  res.write(JSON.stringify(new Date()) + '\n');
  res.end('Hello from the Index Card DB Server.');
});

app.use('/explorer', explorer.routes(app, { basePath: '/index-cards/api' }));

//
// ADD DATASOURCES
//

app.dataSource('db', {
  "name": "db",
  "connector": "memory"
});

app.dataSource('mongo', {
  name: 'mongo',
  connector: 'mongodb',
  database: 'index_cards_loopback'
});

//
// DEFINE MODELS
//
//

var IndexCard = app.loopback.createModel({
  name: 'IndexCard',
  strict: 'throw',
  properties: {
    mitreCard: {
      type: Object,
      required: true
    },
    nxmlId: {
      type: String,
      required: true
    }
  },
  relations: {
    nxml: {
      type: 'belongsTo',
      model: 'NXML',
      foreignKey: 'nxmlId'
    },
    participants: {
      type: 'hasMany',
      model: 'Participant',
      through: 'IndexCardParticipants'
    }
  },
  // acls: [
  //   {
  //     // "accessType": "*",
  //     property: "findOne",
  //     "principalType": "ROLE",
  //     "principalId": "$everyone",
  //     "permission": "DENY"
  //   }
  // ],
  indexes: {
    nxml_id_index: {
      keys: { nxmlId: 1 }
    }
  },
  idInjection: false
});

var Participant = app.loopback.createModel({
  name: 'Participant',
  strict: 'throw',
  properties: {
    entity_text: {
      type: String,
      required: true
    },
    entity_type: {
      type: String,
      required: true
    }
  },
  relations: {
    indexCards: {
      type: 'hasMany',
      model: 'IndexCard',
      through: 'IndexCardParticipants'
    }
  }
});

var IndexCardParticipants = app.loopback.createModel({
  name: 'IndexCardParticipants',
  strict: 'throw',
  properties: {
    type: {
      type: String,
      required: false
    }
  },
  relations: {
    indexCard: {
      type: 'belongsTo',
      model: 'IndexCard'
    },
    participant: {
      type: 'belongsTo',
      model: 'Participant'
    }
  }
});

var NXML = app.loopback.createModel({
  name: 'NXML',
  strict: 'throw',
  plural: 'NXML',
  properties: {
    articleFront: {
      type: Object,
      required: true
    },
    xmlBinary: {
      type: Object,
      required: true
    }
  },
  relations: {
    indexCards: {
      type: 'hasMany',
      model: 'IndexCard',
      foreignKey: 'nxmlId'
    }
  },
  // acls: [
  //   {
  //     // "accessType": "*",
  //     property: "WRITE",
  //     "principalType": "ROLE",
  //     "principalId": "$everyone",
  //     "permission": "DENY"
  //   }
  // ],
  idInjection: false
});

/**
 * Custom Remote Methods
 */

const comparator = new IndexCardComparator();

IndexCard.compare = function(cards, cb) {
  let cardA = Object.assign({}, cards.cardA);
  let cardB = Object.assign({}, cards.cardB);
  let updated_card = comparator.findModelRelation(cardA, [cardB]);
  let classified_card = comparator.classify(updated_card);
  let match = classified_card.match[0];
  let comparison = {
    deltaFeature: match.deltaFeature,
    potentialConflict: match.potentialConflict,
    score: match.score,
    model_relation: classified_card.model_relation
  };
  let response = {
    cardA: cards.cardA,
    cardB: cards.cardB,
    comparsion: comparison
  };
  cb(null, response);
};
     
IndexCard.remoteMethod(
    'compare', 
    {
      accepts: {arg: 'cards', type: 'object', http: { source: 'body' } },
      returns: {arg: 'response', type: 'object'}
    }
);

//
// DISABLE STUFF
//
//

function disable_remote_write_methods(model) {
  model.disableRemoteMethod('deleteById', true);
  model.disableRemoteMethod('create', true);
  model.disableRemoteMethod("upsert", true);
  model.disableRemoteMethod("updateAll", true);
  model.disableRemoteMethod("updateAttributes", false);
  model.disableRemoteMethod("createChangeStream", true);
}

function disable_related_remote_write_methods(model, related) {
  // model.disableRemoteMethod(`__count__${related}`, false);
  // model.disableRemoteMethod(`__findById__${related}`, false);
  // model.disableRemoteMethod(`__get__${related}`, false);
  
  model.disableRemoteMethod(`__create__${related}`, false);
  model.disableRemoteMethod(`__updateById__${related}`, false);
  model.disableRemoteMethod(`__destroyById__${related}`, false);
  model.disableRemoteMethod(`__delete__${related}`, false);
  model.disableRemoteMethod(`__link__${related}`, false);
  model.disableRemoteMethod(`__unlink__${related}`, false);
}

disable_remote_write_methods(IndexCard);
disable_remote_write_methods(IndexCardParticipants);
disable_remote_write_methods(Participant);
disable_remote_write_methods(NXML);

disable_related_remote_write_methods(NXML, 'indexCards');
disable_related_remote_write_methods(IndexCard, 'participants');
disable_related_remote_write_methods(Participant, 'indexCards');

app.model(NXML, { dataSource: 'mongo' });
app.model(IndexCard, { dataSource: 'mongo' });
app.model(IndexCardParticipants, { dataSource: 'mongo' });
app.model(Participant, { dataSource: 'mongo' });

app.model(app.loopback.User, { "dataSource": "db", "public": false });
app.model(app.loopback.AccessToken, { "dataSource": "db", "public": false });
app.model(app.loopback.ACL, { "dataSource": "db", "public": false });
app.model(app.loopback.RoleMapping, { "dataSource": "db", "public": false });
app.model(app.loopback.Role, { "dataSource": "db", "public": false });

app.enableAuth();

IndexCard
  .findOne()
  .then(function(d) {
    d.isValid(e => debug('validate')(`one card is valid`));
  });

NXML
  .findOne()
  .then(function(d) {
    d.isValid(e => debug('validate')(`one nxml is valid`));
  });
  
// const cardA = {
//   "submitter" : "Reach",
//   "model_relation" : "extension",
//   "extracted_information" : {
//           "interaction_type" : "binds",
//           "negative_information" : false,
//           "participant_b" : {
//                   "in_model" : true,
//                   "identifier" : "interpro:IPR030474",
//                   "entity_text" : "IL-6",
//                   "entity_type" : "family"
//           },
//           "participant_a" : {
//                   "in_model" : true,
//                   "identifier" : "interpro:IPR009318",
//                   "entity_text" : "GRP",
//                   "entity_type" : "family"
//           },
//           "hypothesis_information" : false
//   },
//   "reading_complete" : "2016-01-12T11:54:47Z",
//   "reader_type" : "machine",
//   "reading_started" : "2016-01-12T11:54:28Z",
//   "evidence" : [
//           "GRP, with SP, is closely associated with IL-6"
//   ],
//   "pmc_id" : "1174968",
//   "score" : 0,
//   "trigger" : "associated"
// };

// IndexCard.compare({ cardA: cardA, cardB: cardA }, (e,d) => console.log(d));

// const updated_card = comparator.findModelRelation(cardA, [cardA]);
// const classified_card = comparator.classify(updated_card);
// const match = classified_card.match[0];
// const comparison = {
//   deltaFeature: match.deltaFeature,
//   potentialConflict: match.potentialConflict,
//   score: match.score,
//   model_relation: classified_card.model_relation
// };
// // console.log(classified_card);
// console.log(comparison);

// IndexCard
//   .findOne()
//   .then(function(d) {
//     // console.log(d.extracted_information.participant_b);
//     console.log(d.mitreCard.extracted_information.participant_b.identifier);
//   })
  
// IndexCard
//   .findOne({ where: { 'd.mitreCard.extracted_information.participant_b.identifier': 'interpro:IPR030474' }})
//   .then(function(d) {
//     console.log(d);
//     // console.log(d.mitreCard.extracted_information.participant_b.identifier);
//   })

// Custom remote methods

// IndexCard.greet = function(msg, cb) {
//   cb(null, 'Greetings... ' + msg.foo);
// };
     
// IndexCard.remoteMethod(
//     'greet', 
//     {
//       // accepts: {arg: 'msg', type: 'string'},
//       accepts: {arg: 'msg', type: 'object', http: { source: 'body' } },
//       returns: {arg: 'greeting', type: 'string'}
//     }
// );