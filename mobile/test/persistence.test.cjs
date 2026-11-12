const assert = require('node:assert/strict');
const test = require('node:test');
const { createCoalescingWriter } = require('../src/persistence.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));

test('flush drains latest snapshot in order; coalesced promises wait for their own batch', async () => {
  const writes = [];
  const writer = createCoalescingWriter(value => new Promise((resolve, reject) => writes.push({ value, resolve, reject })));
  const first = writer.write(1);
  await tick();
  let done = false;
  const second = writer.write(2);
  const third = writer.write(3).then(() => { done = true; });
  const flushed = writer.flush();
  assert.deepEqual(writes.map(w => w.value), [1]);
  writes[0].resolve(); await first; await tick();
  assert.equal(done, false);
  assert.deepEqual(writes.map(w => w.value), [1, 3]);
  writes[1].resolve();
  await Promise.all([second, third, flushed]);
  assert.equal(done, true);
});

test('failed batches reject every waiter, continue latest write and flush retries failures', async () => {
  const writes = [];
  const writer = createCoalescingWriter(value => new Promise((resolve, reject) => writes.push({ value, resolve, reject })));
  const first = writer.write(1);
  const second = writer.write(2);
  const rejected = Promise.all([assert.rejects(first, /disk/), assert.rejects(second, /disk/)]);
  await tick();
  const third = writer.write(3);
  writes[0].reject(Error('disk'));
  await rejected; await tick();
  assert.deepEqual(writes.map(w => w.value), [2, 3]);
  const thirdRejected = assert.rejects(third, /disk/);
  writes[1].reject(Error('disk')); await thirdRejected; await tick();
  const flush = writer.flush(); await tick();
  assert.deepEqual(writes.map(w => w.value), [2, 3, 3]);
  writes[2].resolve(); await flush;
});

test('synchronous save failures do not poison subsequent writes', async () => {
  let fail = true;
  const writer = createCoalescingWriter(() => { if (fail) throw Error('disk'); return Promise.resolve(); });
  await assert.rejects(writer.write(1), /disk/);
  await tick(); fail = false;
  await writer.write(2); await writer.flush();
});
