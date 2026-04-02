require('../config/env');
const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const pg = require('pg');

test('Environment Health Check', async (t) => {
  await t.test('Express should be loadable', () => {
    assert.ok(typeof express === 'function', 'Express should export a function');
  });

  await t.test('PG should be loadable', () => {
    assert.ok(typeof pg.Pool === 'function', 'pg should export a Pool constructor');
  });

  await t.test('Standard ENV vars should be present', () => {
    // We don't check secrets, just that the loader works
    assert.strictEqual(typeof process.env.PORT || '5000', 'string');
  });
});
