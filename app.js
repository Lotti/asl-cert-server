/**
 *
 * main() will be invoked when you Run This Action
 *
 * @return The output of this action, which must be a JSON object.
 *
 */
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Cloudant = require('./libraries/cloudant');
const cloudant = Cloudant.cloudant;

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const port = process.env.PORT || 3000;
app.listen(port, () => {
    // print a message when the server starts listening
    console.log('server starting on http://localhost:' + port);
});

app.get('/api/users', (req, res) => {
    if (req.query.id) {
        cloudant.get(req.query.id).then((result) => {
            res.json(result);
        }).catch((error) => { res.status(404).json(error);});
    } else {
        cloudant.allDocs({include_docs: true}).then((result) => {
            res.json(result.rows.map((x) => {
                return x.doc;
            }));
        }).catch((error) => { res.status(500).json(error);});
    }
});
