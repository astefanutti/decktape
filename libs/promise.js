'use strict';

module.exports.delay = delay => value =>
  new Promise(resolve => setTimeout(resolve, delay, value));

module.exports.value = value => () => value;

module.exports.wait = ms => () => module.exports.delay(ms);

module.exports.call = f => val => {
  f(); return val;
};
