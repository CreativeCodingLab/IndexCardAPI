# Loopback Index Card API

This is a [LoopBack](http://loopback.io/) API providing access to a database of Mitre Index Cards that are output by the [REACH system](https://github.com/clulab/reach) and their associated publications, as NXML documents.

Available API methods can be seen here:
[http://ccrg-data.evl.uic.edu/index-cards/explorer](http://ccrg-data.evl.uic.edu/index-cards/explorer)

## Notes

Original Mitre Index Cards are stored as the `mitreCard` property of an `IndexCard` object. This is to avoid mutating the original index card, with one exception – if the original index card had an `_id` field, it is removed when it is added to the database. This is done to avoid confusing `_id` fields used by other databases with the fields used by this database.

NMXL publication documents are stored (in their entirety) as a [MongoDB Binary object](http://mongodb.github.io/node-mongodb-native/2.0/api/Binary.html) in the `nxmlBinary` field. The `<front>` field of the NXML document is transformed into `JSON` using [xmltojson](https://www.npmjs.com/package/xmltojson) and stored in the `article-front` property. 

## Object Schemas

### IndexCard

```js
{
    mitreCard: {
      description: "The original Index Card data which is output by REACH",
      type: Object,
      required: true
    },
    nxmlId: {
      description: "The foreign key for the NXML publication that generated this index card.",
      type: String,
      required: true
    }
  }
```

### NXML

```js
{
  articleFront: {
    description: "The <front> field of the NXML document as output by xmltojson.",
    type: Object,
    required: true
  },
  xmlBinary: {
    description: "The entire NXML document, stored as a BSON Binary object.",
    type: Object,
    required: true
  }
}
```

