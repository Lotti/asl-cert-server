"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const log4js = require("log4js");
const PouchDB = require("pouchdb");
const PromiseConcurrentQueue_1 = require("../helpers/PromiseConcurrentQueue");
const log = log4js.getLogger('cloudant');
const pcq = new PromiseConcurrentQueue_1.PromiseConcurrentQueue(3, 1000);
const config = require('config');
const dbName = config.get('Cloudant.dbName');
const url = config.get('Cloudant.url') + '/' + dbName;
exports.cloudant = new PouchDB(url, {});
const functionsToWrap = [
    'put', 'get', 'remove', 'bulkDocs', 'allDocs', 'query',
    'putAttachment', 'getAttachment', 'removeAttachment', 'find',
];
for (const f of functionsToWrap) {
    if (exports.cloudant[f]) {
        const func = exports.cloudant[f];
        exports.cloudant[f] = (...args) => pcq.enqueue(func, exports.cloudant, ...args);
    }
}
exports.autoRemove = (docId, options) => tslib_1.__awaiter(this, void 0, void 0, function* () {
    let doc;
    try {
        doc = yield exports.cloudant.get(docId, { latest: true });
    }
    catch (error) {
        if (error.name !== 'not_found' && error.message !== 'missing') {
            log.error('error retrieving latest rev of document %s', docId, error);
            throw error;
        }
    }
    if (doc) {
        const rev = doc._rev;
        try {
            return yield exports.cloudant.remove(docId, rev, options);
        }
        catch (error) {
            log.error('error deleting latest rev of document %s', docId, error);
            throw error;
        }
    }
    return false;
});
exports.autoPut = (body, options) => tslib_1.__awaiter(this, void 0, void 0, function* () {
    let doc;
    try {
        doc = yield exports.cloudant.get(body._id, { latest: true });
    }
    catch (error) {
        if (error.name !== 'not_found' && error.message !== 'missing') {
            log.error('error retrieving latest rev of document %s', body._id, error);
            throw error;
        }
    }
    if (doc) {
        body._rev = doc._rev;
    }
    try {
        doc = yield exports.cloudant.put(body, options);
    }
    catch (error) {
        log.error('%s', body._id, error);
        throw error;
    }
    return doc;
});
