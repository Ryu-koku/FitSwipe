const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { seedState } = require('../src/logic.ts');
const { migrateLegacyData } = require('../src/legacy-data.ts');
const { exportBackup, parseBackup } = require('../src/backup.ts');
const { emptyCloud, trackChanges, receive } = require('../src/sync.ts');
function legacy() {
  return { ...seedState(), heightCm: 17000,
    bodyMeasurements: [{ id: 'health-old', measuredAt: '2026-11-08T01:00:00Z', heightCm: 17000, weightKg: 65 }],
    sessions: [{ id: 100, startedAt: '2026-11-08T01:00:00Z', status: 'COMPLETED' }],
    sets: [0, 1].map((setOrder, i) => ({ id: 101 + i, exerciseId: 1, sessionId: 100, setOrder, normalWeightKg: 50, normalReps: 10, isCompleted: true, leftCompleted: false, rightCompleted: false })),
  };
}
test('legacy zero-based sets and inflated heights can be exported and restored without changing source', () => {
  const original = legacy(), before = JSON.stringify(original);
  for (const repaired of [parseBackup(JSON.stringify(original)), parseBackup(exportBackup(original))]) {
    assert.deepEqual(repaired.sets.map(s => s.setOrder), [1, 2]);
    assert.equal(repaired.heightCm, 170); assert.equal(repaired.bodyMeasurements[0].heightCm, 170);
    assert.deepEqual(repaired.sets.map(s => s.id), [101, 102]);
  }
  assert.equal(JSON.stringify(original), before);
});
test('legacy repair is idempotent and does not renumber valid or ambiguous groups', () => {
  const repaired = migrateLegacyData(legacy());
  assert.equal(migrateLegacyData(repaired), repaired);
  const invalid = legacy(); invalid.sets[1].setOrder = 3;
  assert.throws(() => parseBackup(JSON.stringify(invalid)));
  const invalidHeight = legacy(); invalidHeight.heightCm = 30000;
  assert.throws(() => parseBackup(JSON.stringify(invalidHeight)));
});
test('repaired local values enter sync without losing pre-feature measurements', () => {
  const before = { ...legacy(), cloud: emptyCloud({ id: 'test', token: 'synthetic', name: 'test', expiresAt: 9999999999 }) };
  const repaired = migrateLegacyData(before);
  const queued = trackChanges(before, repaired, randomUUID);
  assert.ok(queued.cloud.pending.some(m => m.kind === 'set' && m.payload.setOrder === 1));
  assert.ok(queued.cloud.pending.some(m => m.payload?.field === 'bodyMeasurement' && m.payload.value.heightCm === 170));
  const pulled = receive(queued, { changes: [], cursor: 0, hasMore: false });
  assert.equal(pulled.bodyMeasurements[0].heightCm, 170);
});

test('legacy CSV appends with duplicate orders retain all set IDs and values through backup', () => {
  const state = legacy();
  state.sets = [1, 2, 3, 3].map((setOrder, i) => ({ ...state.sets[0], id: 101 + i, setOrder, normalWeightKg: 50 + i }));
  const before = JSON.stringify(state);
  for (const repaired of [migrateLegacyData(state), parseBackup(exportBackup(state)), parseBackup(JSON.stringify(state))]) {
    assert.deepEqual(repaired.sets.map(s => s.setOrder), [1, 2, 3, 4]);
    assert.deepEqual(repaired.sets.map(s => [s.id, s.normalWeightKg]), [[101, 50], [102, 51], [103, 52], [104, 53]]);
    assert.equal(migrateLegacyData(repaired), repaired);
  }
  assert.equal(JSON.stringify(state), before);
});
