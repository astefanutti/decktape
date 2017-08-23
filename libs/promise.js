'use strict';

module.exports.call = f => async val => { await f(val); return val };

module.exports.delay = delay => value => new Promise(resolve => setTimeout(resolve, delay, value));

module.exports.pause = delay => new Promise(resolve => setTimeout(resolve, delay));  

module.exports.wait = ms => () => module.exports.delay(ms);
