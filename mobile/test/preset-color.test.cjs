const test = require('node:test');
const assert = require('node:assert/strict');
const { presetColor } = require('../src/logic.ts');

test('presetColor uses saved colors and the supplied theme fallback for missing colors or presets', () => {
  for (const fallback of ['#007f78', '#72d6c9']) {
    assert.equal(presetColor({ color: '#e5484d' }, fallback), '#e5484d');
    assert.equal(presetColor({}, fallback), fallback);
    assert.equal(presetColor(undefined, fallback), fallback);
  }
});
