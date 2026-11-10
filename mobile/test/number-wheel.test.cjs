const test = require('node:test');
const assert = require('node:assert/strict');
const { createNumberWheel, parseWheelInput } = require('../src/number-wheel.ts');

function wheel(step = 2.5) {
  const preview = [], saved = [], ticks = [], edits = [], active = [], positions = [];
  const control = createNumberWheel({ step, onPreview: v => preview.push(v), onChange: v => saved.push(v),
    onTick: () => ticks.push(true), onEdit: v => edits.push(v), onActive: v => active.push(v), onPosition: v => positions.push(v) });
  return { control, preview, saved, ticks, edits, active, positions };
}

test('each neighbor changes one step, while a tap on the number only opens input', () => {
  const w = wheel();
  w.control.begin(60, 1); w.control.end();
  w.control.begin(62.5, -1); w.control.end();
  w.control.begin(60, 0); w.control.end();
  assert.deepEqual(w.saved, [62.5, 60]);
  assert.deepEqual(w.edits, [60]);
  assert.equal(w.ticks.length, 2);
  assert.equal(w.control.active, false);
});

test('drag previews and ticks at each boundary and saves only the final value', () => {
  const w = wheel();
  w.control.begin(60, 0);
  w.control.move(-24); assert.deepEqual(w.preview, []);
  w.control.move(-26); w.control.move(-74); w.control.move(-76); w.control.move(-126);
  assert.deepEqual(w.preview, [62.5, 65, 67.5]);
  assert.equal(w.ticks.length, 3);
  assert.deepEqual(w.saved, []);
  w.control.end();
  assert.deepEqual(w.saved, [67.5]);
  assert.deepEqual(w.edits, []);
  assert.equal(w.positions.at(-1).offset, -150);
  assert.equal(w.positions.at(-1).settling, true);
});

test('zero stops decrementing and reversing a drag at zero responds immediately', () => {
  const w = wheel(1);
  w.control.begin(0, -1); w.control.end();
  assert.deepEqual(w.ticks, []); assert.deepEqual(w.saved, []);
  w.control.begin(1, 0); w.control.move(128); w.control.move(102); w.control.end();
  assert.deepEqual(w.preview, [0, 1]);
  assert.deepEqual(w.saved, []); // Returned to the original value.
  assert.equal(w.ticks.length, 2);
});

test('a hold repeats at a fixed pace and release prevents later changes', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const w = wheel();
  w.control.begin(60, 1);
  t.mock.timers.tick(399); assert.deepEqual(w.preview, []);
  t.mock.timers.tick(1); assert.deepEqual(w.preview, [62.5]);
  t.mock.timers.tick(140); t.mock.timers.tick(140);
  assert.deepEqual(w.preview, [62.5, 65, 67.5]);
  w.control.end(); t.mock.timers.tick(2000);
  assert.deepEqual(w.saved, [67.5]);
  assert.equal(w.ticks.length, 3);
});

test('moving instead of holding cancels repetition and does not count a neighbor tap', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const w = wheel();
  w.control.begin(60, 1); w.control.move(-8);
  t.mock.timers.tick(1000); w.control.move(-50); w.control.end();
  assert.deepEqual(w.saved, [62.5]); assert.equal(w.ticks.length, 1);
});

test('stopping on background, cancellation or unmount saves once and clears every timer', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const w = wheel();
  w.control.begin(60, 1); t.mock.timers.tick(400);
  w.control.stop(); w.control.stop(); w.control.end(); t.mock.timers.tick(5000);
  assert.deepEqual(w.saved, [62.5]); assert.equal(w.ticks.length, 1);
  assert.deepEqual(w.edits, []); assert.equal(w.control.active, false);
});

test('an initially empty number remains empty on tap, but can be adjusted to zero', () => {
  const w = wheel(1);
  w.control.begin(undefined, 0); w.control.end();
  assert.deepEqual(w.edits, [undefined]); assert.deepEqual(w.saved, []);
  w.control.begin(undefined, 0); w.control.move(-50); w.control.move(0); w.control.end();
  assert.deepEqual(w.saved, [0]);
});

test('fractional steps stay precise, and accessibility adjustments use the same ticks', () => {
  const w = wheel(0.1);
  w.control.adjust(0.2, 1); w.control.adjust(0.3, 1); w.control.adjust(0, -1);
  assert.deepEqual(w.saved, [0.3, 0.4]); assert.equal(w.ticks.length, 2);
});

test('rows follow every pixel across numeric boundaries without recentering or sticky reversals', () => {
  const w = wheel(1);
  w.control.begin(10, 0);
  w.control.move(-8); w.control.move(-16); w.control.move(-24);
  assert.deepEqual(w.preview, []); assert.deepEqual(w.ticks, []);
  w.control.move(-26); w.control.move(-27); w.control.move(-26);
  assert.deepEqual(w.preview, [11]); assert.equal(w.ticks.length, 1);
  w.control.move(-24);
  assert.deepEqual(w.positions.map(p => p.offset), [0, -8, -16, -24, -26, -27, -26, -24]);
  assert.ok(w.positions.every(p => !p.settling));
  w.control.end();
  assert.deepEqual(w.preview, [11, 10]); assert.deepEqual(w.saved, []);
});

test('release aligns only to the nearest row, at most half a row away, without another value change', () => {
  for (let dy = -198; dy <= 198; dy += 3) {
    const w = wheel(1);
    w.control.begin(60, 0); w.control.move(dy);
    const before = w.positions.at(-1), ticks = w.ticks.length;
    w.control.end();
    const resting = w.positions.at(-1);
    assert.ok(Math.abs(resting.offset - before.offset) <= 25, `dy ${dy}`);
    assert.equal(w.ticks.length, ticks);
    assert.equal(resting.offset, -resting.index * 50);
  }
});

test('a new touch can continue from a partially completed alignment', () => {
  const w = wheel(1);
  w.control.begin(11, 0, 18); w.control.move(-7);
  assert.equal(w.positions.at(-1).offset, 11);
  assert.deepEqual(w.preview, []);
  w.control.move(-38);
  assert.equal(w.positions.at(-1).offset, -20);
  w.control.end();
  assert.deepEqual(w.saved, []);
});

test('direct input accepts decimal and integer records while rejecting incomplete or invalid values', () => {
  for (const [raw, expected] of [['72.5', 72.5], ['７２．５０', 72.5], ['2,5', 2.5], ['.5', 0.5], ['0', 0]])
    assert.equal(parseWheelInput(raw, false), expected);
  for (const raw of ['', ' ', '-1', 'NaN', 'Infinity', '1e4', '2.501', '1234567890']) assert.equal(parseWheelInput(raw, false), undefined);
  assert.equal(parseWheelInput('１２', true), 12);
  assert.equal(parseWheelInput('12.5', true), undefined);
  assert.equal(parseWheelInput('0', true), 0);
});
