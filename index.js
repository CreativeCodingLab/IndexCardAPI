var router = require('express').Router();

router.get('/', function(req, res) {
    res.send('Hello from the database');
});

module.exports = router;
