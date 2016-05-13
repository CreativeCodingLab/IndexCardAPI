'use strict'

const loopback = require('loopback');
const debug = require('debug');
const Rx = require('rx');

Rx.config.longStackSupport = true;

var app = loopback();

debug.enable('script:*');

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

//
// DISABLE STUFF
//
//

app.model(IndexCard, { dataSource: 'mongo' });
app.model(IndexCardParticipants, { dataSource: 'mongo' });
app.model(Participant, { dataSource: 'mongo' });

app.model(app.loopback.User, { "dataSource": "db", "public": false });
app.model(app.loopback.AccessToken, { "dataSource": "db", "public": false });
app.model(app.loopback.ACL, { "dataSource": "db", "public": false });
app.model(app.loopback.RoleMapping, { "dataSource": "db", "public": false });
app.model(app.loopback.Role, { "dataSource": "db", "public": false });

// app.enableAuth();

// IndexCard.count(function(err, count) { console.log(count); })

// IndexCard
//   .findOne()
//   .then(function(card) {
//     const ex = card.mitreCard.extracted_information;
//     const { participant_a, participant_b } = ex;
//     const [ p_a_array, p_b_array ] = [ participant_a, participant_b ]
//       .map(obj => isArray(obj) ? obj : [obj]);
      
//     console.log(p_a_array, p_b_array);
//     // console.dir(d.participant_as);
//     // d.nxml(function(e,c) { console.log(e, c) })
//     // const foo = new IndexCard(d);
//     // foo.nxml(function(e,c) { console.log(e, c) })
//     // console.dir(foo.nxml.create)
//     // d.isValid(e => console.log(`one card is valid`));
//   });

function isArray(d) {
  return d instanceof Array;
}

const stream = Rx.Observable;

function updateParticipants() {
  
  const skip$ = stream
    .fromPromise(IndexCard.count())
    .flatMap(count => stream.range(86000, count))
    .controlled();
    
  skip$.request(1);

  skip$
    .do(debug('script:skip'))
    .flatMap(skip => stream.fromPromise(IndexCard.findOne({ skip })))
    .do(({ id }) => debug('script:card')(id))
    .map(card => {
      const ex = card.mitreCard.extracted_information;
      const { participant_a, participant_b } = ex;
      
      return [
        { type: 'a', raw: participant_a },
        { type: 'b', raw: participant_b }
      ]
      .filter(({ raw }) => typeof raw !== 'undefined')
      .map(({ type, raw }) => {
        return (isArray(raw) ? raw : [raw])
          .map(({ identifier, entity_text, entity_type }) => ({
            id: identifier,
            entity_text,
            entity_type
          }))
          .map(participant => ({ type, participant, card }))
      })
      .reduce((a,b) => a.concat(b), []);
    })
    .flatMap(array => array)
    .flatMap(({ type, participant, card }) => {
      const filter = { where: { id: participant.id } };
      const promise = Participant.findOrCreate(filter, participant);
      const found$ = stream.fromPromise(promise)
        .catch(err => {
          if (err.code === 11000) {
            return stream.fromPromise(Participant.findOne(filter))
              .map(d => [d])
          }
          return stream.throw(err);
        })
        .flatMap(([ found, created ]) => {
          const promise = card.participants.add(found);
          return stream.fromPromise(promise);
        })
        .flatMap(relationship => {
          const promise = relationship.updateAttribute('type', type);
          return stream.fromPromise(promise);
        });
      return found$;
    })
    .do(debug('script:result'))
    // .subscribe();
    .subscribe(d => skip$.request(1));
}

updateParticipants();


  // .map((d,i) => {
  //   console.log(i);
  //   return d;
  // })
  // .subscribe(function(d) { console.log(d) });
