const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
test('storage size plugin replaces duplicate properties and is idempotent', () => {
  const original = Module._load;
  Module._load = function(name, ...args) {
    if (name === 'expo/config-plugins') return { withGradleProperties: (config, action) => action(config) };
    return original.call(this, name, ...args);
  };
  let plugin;
  try { plugin = require('../plugins/with-async-storage-size.js'); } finally { Module._load = original; }
  const config = { modResults: [{ type: 'comment', value: 'keep' }, { type: 'property', key: 'AsyncStorage_db_size_in_MB', value: '6' }, { type: 'property', key: 'AsyncStorage_db_size_in_MB', value: '8' }] };
  plugin(config); const once = JSON.stringify(config); plugin(config);
  assert.equal(JSON.stringify(config), once);
  assert.deepEqual(config.modResults, [{ type: 'comment', value: 'keep' }, { type: 'property', key: 'AsyncStorage_db_size_in_MB', value: '64' }]);
});
