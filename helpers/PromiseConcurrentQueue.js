"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log4js = require("log4js");
const log = log4js.getLogger('pcq');
const moment = require("moment");
class PromiseConcurrentQueue {
    constructor(maxConcurrentItems, timingMillisec) {
        this.queue = [];
        this.semaphore = 0;
        this.timing = false;
        this.dates = [];
        this.interval = null;
        this.consumeQueue = this.consumeQueueConcurrent;
        this.setMaxConcurrentItems(maxConcurrentItems);
        this.setTimingMillisec(timingMillisec);
        log.trace('new PromiseConcurrentQueue instantiated, max_concurrent_items: %d, timing_millisec: %d', this.getMaxConcurrentItems(), this.getTimingMillisec());
    }
    static getItemName(method, object) {
        const itemName = (object) ? `${object.constructor.name}.${method.name}` : method.name;
        return `item: ${itemName}`;
    }
    getLength() {
        return this.queue.length;
    }
    getRunningCount() {
        if (this.timing === false) {
            return this.semaphore;
        }
        else {
            return this.dates.length;
        }
    }
    getMaxConcurrentItems() {
        return this.maxConcurrentItems;
    }
    setMaxConcurrentItems(maxConcurrentItems) {
        if (isNaN(maxConcurrentItems) || maxConcurrentItems <= 0) {
            throw new Error('maxConcurrentItems must be an integer > 0');
        }
        this.maxConcurrentItems = maxConcurrentItems;
    }
    getTimingMillisec() {
        return this.timing;
    }
    setTimingMillisec(timingMillisec) {
        if (timingMillisec === false) {
            this.timing = false;
            if (this.interval) {
                clearInterval(this.interval);
            }
            this.consumeQueue = this.consumeQueueConcurrent;
        }
        else {
            if (isNaN(timingMillisec) || timingMillisec <= 0) {
                throw new Error('timingMillisec must be an integer > 0 and represent milliseconds');
            }
            if (timingMillisec > 0) {
                this.timing = timingMillisec;
                this.dates = [];
                this.setTimedInterval(timingMillisec);
                this.consumeQueue = this.consumeQueueTimed;
            }
        }
    }
    enqueue(method, object, ...args) {
        return new Promise((resolve, reject) => {
            this.queue.push({ method, object, args, resolve, reject });
            const identifier = PromiseConcurrentQueue.getItemName(method, object);
            log.trace('adding to queue - %s', identifier);
            log.trace('items in queue: %d, max_concurrent_items: %d, timing_millisec: %d - %s', this.queue.length, this.getMaxConcurrentItems(), this.getTimingMillisec(), identifier);
            this.consumeQueue();
        });
    }
    consumeQueueConcurrent() {
        if (this.semaphore < this.maxConcurrentItems && this.queue.length > 0) {
            this.semaphore += 1;
            const p = this.queue.shift();
            const identifier = PromiseConcurrentQueue.getItemName(p.method, p.object);
            log.trace('consuming queue - %s', identifier);
            log.trace('items in queue: %d, max_concurrent_items: %d, timing_millisec: %d - %s', this.queue.length, this.getMaxConcurrentItems(), this.getTimingMillisec(), identifier);
            return p.method.apply(p.object, p.args).then(p.resolve).catch(p.reject).then(() => {
                this.semaphore -= 1;
                return this.consumeQueue();
            });
        }
    }
    consumeQueueTimed() {
        if (this.dates.length > 0) {
            const firstCall = this.dates[0];
            if (moment().diff(firstCall, 'ms') > this.timing) {
                this.dates.shift();
            }
        }
        if (this.dates.length < this.maxConcurrentItems && this.queue.length > 0) {
            this.dates.push(moment());
            const p = this.queue.shift();
            const identifier = PromiseConcurrentQueue.getItemName(p.method, p.object);
            log.trace('consuming queue - %s', identifier);
            log.trace('items in queue: %d, max_concurrent_items: %d, timing_millisec: %d - %s', this.queue.length, this.getMaxConcurrentItems(), this.getTimingMillisec(), identifier);
            return p.method.apply(p.object, p.args).then(p.resolve).catch(p.reject).then(() => {
                return this.consumeQueue();
            });
        }
        if (this.queue.length > 0) {
            this.interval.ref();
        }
        else {
            this.interval.unref();
        }
    }
    setTimedInterval(timing) {
        timing = timing / 100;
        if (timing < 1) {
            timing = 1;
        }
        this.interval = setInterval(() => {
            this.consumeQueueTimed();
        }, timing);
    }
}
exports.PromiseConcurrentQueue = PromiseConcurrentQueue;
//# sourceMappingURL=PromiseConcurrentQueue.js.map
