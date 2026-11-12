const test = require('node:test');
const assert = require('node:assert/strict');
const { canAddPreset, canAddCustomExercise, canCreateRoom } = require('../src/premium.ts');
const { seedState } = require('../src/logic.ts');
const { exportBackup, parseBackup, restoreBackup } = require('../src/backup.ts');
const { randomUUID } = require('node:crypto');
const { emptyCloud, trackChanges, receive } = require('../src/sync.ts');

test('presets stop at three and premium accepts over-limit data', () => {
  for (const n of [0, 2, 3, 4]) {
    const state = { presets: Array(n).fill({}) };
    assert.equal(canAddPreset(state, false), n < 3);
    assert.equal(canAddPreset(state, true), true);
  }
});
test('only active explicitly custom exercises count toward three', () => {
  for (const n of [0, 2, 3, 4]) {
    const state = { exercises: [...Array(n).fill({ custom: true, archived: false }), {}, { custom: false }, { custom: true, archived: true }] };
    assert.equal(canAddCustomExercise(state, false), n < 3);
    assert.equal(canAddCustomExercise(state, true), true);
  }
});
test('only owned rooms count toward two', () => {
  for (const n of [0, 1, 2, 3]) {
    const rooms = [...Array(n).fill({ ownerId: 'me' }), ...Array(20).fill({ ownerId: 'other' })];
    assert.equal(canCreateRoom(rooms, 'me', false), n < 2);
    assert.equal(canCreateRoom(rooms, 'me', true), true);
  }
});
test('custom flag survives backup export, parse and restore even with a matching catalog name', () => {
  const state = seedState();
  state.exercises = state.exercises.map((e, i) => i === 0 ? { ...e, custom: true } : e);
  const json = exportBackup(state);
  assert.equal(parseBackup(json).exercises[0].custom, true);
  const restored = restoreBackup(seedState(), json, randomUUID);
  assert.ok(restored.exercises.some(e => e.custom === true));
});
test('custom flag survives personal cloud synchronization', () => {
  const state = seedState();
  state.cloud = emptyCloud({ id: 'me' });
  const next = { ...state, exercises: state.exercises.map((e, i) => i === 0 ? { ...e, custom: true } : e) };
  const tracked = trackChanges(state, next, randomUUID);
  const changes = tracked.cloud.pending.filter(m => m.kind === 'exercise').map((m, i) => ({ ...m, revision: i + 1 }));
  const received = receive(state, { changes, cursor: changes.length, hasMore: false });
  assert.ok(received.exercises.some(e => e.custom === true));
});

const { freeTrialForProduct } = require('../src/premium.ts');
const phase = (iso8601, billingCycleCount = 1) => ({ billingPeriod: { iso8601 }, billingCycleCount });
test('Android uses selected free phase, falling back only without a default option', () => {
  assert.deepEqual(freeTrialForProduct({ defaultOption: { freePhase: phase('P1M') } }, 'android'), { label: '1か月', headline: '初月無料' });
  assert.deepEqual(freeTrialForProduct({ subscriptionOptions: [{ freePhase: null }, { freePhase: phase('P1W', 2) }] }, 'android'), { label: '2週間', headline: '2週間無料' });
  assert.equal(freeTrialForProduct({ defaultOption: { freePhase: null }, subscriptionOptions: [{ freePhase: phase('P1M') }] }, 'android'), undefined);
});
test('iOS zero-price intro periods are localized with all cycles', () => {
  for (const [period, cycles, label, headline] of [['P1M', 1, '1か月', '初月無料'], ['P1W', 1, '1週間', '1週間無料'], ['P3D', 2, '6日間', '6日間無料'], ['P1Y', 1, '1年間', '1年間無料']]) {
    assert.deepEqual(freeTrialForProduct({ introPrice: { price: 0, period, cycles } }, 'ios'), { label, headline });
  }
  assert.equal(freeTrialForProduct({ introPrice: { price: 100, period: 'P1M', cycles: 1 } }, 'ios'), undefined);
});
test('missing or invalid trial metadata never advertises a trial', () => {
  for (const platform of ['android', 'ios', 'web']) {
    assert.equal(freeTrialForProduct(undefined, platform), undefined);
    assert.equal(freeTrialForProduct({}, platform), undefined);
  }
  for (const period of ['', 'P0M', 'P1Q', 'P1M2D']) {
    assert.equal(freeTrialForProduct({ defaultOption: { freePhase: phase(period) } }, 'android'), undefined);
  }
  assert.equal(freeTrialForProduct({ introPrice: { price: 0, period: 'P1M', cycles: 0 } }, 'ios'), undefined);
});

const { packagesForOffering, defaultPremiumPlan, packageForPlan } = require('../src/premium.ts');
test('current offering packages, default plan and explicit purchase selection', () => {
  const monthly = { identifier: 'monthly' };
  const lifetime = { identifier: 'lifetime' };
  for (const [offering, expected] of [[undefined, 'monthly'], [null, 'monthly'], [{ monthly }, 'monthly'], [{ lifetime }, 'lifetime'], [{ monthly, lifetime }, 'monthly']]) {
    const packages = packagesForOffering(offering);
    assert.equal(defaultPremiumPlan(packages), expected);
    assert.equal(packageForPlan(packages, 'monthly'), offering?.monthly);
    assert.equal(packageForPlan(packages, 'lifetime'), offering?.lifetime);
  }
  assert.deepEqual(packagesForOffering({ monthly: null, lifetime: null }), { monthly: undefined, lifetime: undefined });
});
