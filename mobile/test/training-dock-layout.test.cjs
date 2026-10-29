const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('training dock occupies its own layout row outside the native stack', () => {
  const layout = fs.readFileSync(
    path.join(__dirname, '../src/app/_layout.tsx'),
    'utf8',
  );
  const stack = layout.indexOf('<Stack');
  const dock = layout.indexOf('<TrainingDock />');

  assert.match(layout, /<View style=\{\{ flex: 1 \}\}>[\s\S]*<Stack/);
  assert.ok(stack >= 0 && dock > stack);
  assert.match(layout.slice(stack, dock), /\/>/);
});
