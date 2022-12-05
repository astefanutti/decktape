'use strict';

export const delay = delay => value => new Promise(resolve => setTimeout(resolve, delay, value));

export const pause = ms => delay(ms)();

export const wait = ms => () => delay(ms);
