const test = require('node:test');
const assert = require('node:assert/strict');
const { tourReducer, initialTourStep, tourSteps } = require('../src/tour-steps.ts');

test('tour follows only the real action for each step, then finishes', () => {
  let step = initialTourStep(false);
  const events = Object.values(tourSteps).map(s => s.event);
  for (const [index, event] of events.entries()) {
    assert.equal(step, index + 1);
    for (const wrong of [...events.filter(e => e !== event), 'finish']) {
      assert.equal(tourReducer(step, wrong), step);
    }
    step = tourReducer(step, event);
    assert.equal(tourReducer(step, event), step, 'duplicate action cannot skip a step');
  }
  assert.equal(step, 8);
  assert.equal(tourReducer(step, 'finish'), null);
});

test('existing workouts start at the weight wheel and exit works at every step', () => {
  assert.equal(initialTourStep(true), 4);
  for (const step of [null, 1, 2, 3, 4, 5, 6, 7, 8]) {
    assert.equal(tourReducer(step, 'exit'), null);
  }
  for (const definition of Object.values(tourSteps)) {
    assert.equal(tourReducer(null, definition.event), null);
  }
});

test('tour describes movement without skip or set completion', () => {
  assert.match(tourSteps[6].text, /移動/);
  assert.equal(tourSteps[7].event, 'exercise-moved');
  assert.doesNotMatch(tourSteps[7].text, /スキップ/);
});
