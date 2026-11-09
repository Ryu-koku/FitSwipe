const test = require('node:test');
const assert = require('node:assert/strict');
const { seedState } = require('../src/logic.ts');
const {
  progressIndex,
  exerciseRecords,
  dailyProgress,
  personalBest,
  progressRanking,
  recordUpdateDays,
  progressPreferences,
  isBodyweight,
} = require('../src/home-progress.ts');
const today = new Date('2026-11-08T12:00:00');
function fixture() {
  const state = {
    ...seedState(),
    exercises: [
      { id: 1, name: 'スクワット', mode: 'NORMAL', archived: false },
      { id: 2, name: '腕立て伏せ', mode: 'NORMAL', archived: false },
      { id: 3, name: '左右種目', mode: 'BILATERAL', archived: false },
    ],
    sets: [],
    sessions: [],
  };
  function add(date, weight, reps, exerciseId = 1, extra = {}, status = 'COMPLETED') {
    const id = state.sets.length + 1;
    state.sessions.push({ id, startedAt: `${date}T12:00:00`, status });
    state.sets.push({
      id,
      sessionId: id,
      exerciseId,
      setOrder: 1,
      normalWeightKg: weight,
      normalReps: reps,
      isCompleted: true,
      leftCompleted: true,
      rightCompleted: true,
      ...extra,
    });
    return id;
  }
  const records = (id = 1, side = 0) => exerciseRecords(progressIndex(state, today), id, side);
  return { state, add, records };
}

test('three metrics use different daily maxima, include the 90-day boundary and retain declines', () => {
  const { add, records } = fixture();
  add('2026-08-10', 200, 1); // excluded from chart, retained for all-time records
  add('2026-08-11', 50, 10);
  add('2026-11-07', 100, 1);
  add('2026-11-07', 80, 10);
  add('2026-11-07', 40, 15);
  add('2026-11-08', 70, 1);
  const rs = records();
  assert.deepEqual(
    dailyProgress(rs, 'weight', today).map((p) => p.value),
    [50, 100, 70],
  );
  assert.deepEqual(
    dailyProgress(rs, 'reps', today).map((p) => p.value),
    [10, 15, 1],
  );
  assert.deepEqual(
    dailyProgress(rs, 'estimated', today).map((p) => p.value),
    [50 * (1 + 10 / 30), 80 * (1 + 10 / 30), 70],
  );
  assert.equal(personalBest(rs, 'weight').date, '2026-08-10');
  assert.equal(personalBest(rs, 'reps').weight, 40);
});

test('bad, incomplete, future and ongoing records do not affect charts or bests', () => {
  const { add, records } = fixture();
  add('2026-11-07', 50, 5);
  add('2026-11-09', 1000, 1);
  add('invalid', 1000, 1);
  add('2026-11-07', 1000, 1, 1, { isCompleted: false });
  add('2026-11-07', 1000, 1, 1, {}, 'IN_PROGRESS');
  for (const [weight, reps] of [
    [Infinity, 5],
    [-1, 5],
    [5, Infinity],
    [5, 0],
    [5, 1.5],
    [NaN, 5],
  ])
    add('2026-11-07', weight, reps);
  assert.equal(records().length, 1);
  assert.equal(personalBest(records(), 'weight').weight, 50);
});

test('updates compare against older all-time records, skip ties and count each day once', () => {
  const { add, records } = fixture();
  add('2026-01-01', 100, 1);
  add('2026-08-11', 90, 1);
  add('2026-09-01', 100, 1);
  add('2026-10-01', 110, 1);
  add('2026-10-01', 120, 1);
  add('2026-11-08', 130, 1);
  add('2026-11-09', 140, 1);
  assert.equal(recordUpdateDays(records(), 'estimated', today), 2);
});

test('first recorded day establishes a baseline even with several sessions', () => {
  const { add, records, state } = fixture();
  add('2026-11-07', 50, 1);
  add('2026-11-07', 60, 1);
  assert.equal(recordUpdateDays(records(), 'estimated', today), 0);
  assert.deepEqual(progressRanking(state, progressIndex(state, today), 'change', today), []);
  assert.equal(progressRanking(state, progressIndex(state, today), 'updates', today)[0].value, 0);
  add('2026-11-08', 60, 1);
  assert.equal(recordUpdateDays(records(), 'estimated', today), 0);
});

test('bodyweight exercises use reps for updates and never enter strength-change ranking', () => {
  const { add, records, state } = fixture();
  add('2026-10-01', undefined, 10, 2);
  add('2026-11-08', 0, 12, 2);
  assert.equal(isBodyweight(records(2)), true);
  assert.equal(personalBest(records(2), 'weight'), undefined);
  assert.equal(dailyProgress(records(2), 'estimated', today).length, 0);
  const ranking = progressRanking(state, progressIndex(state, today), 'updates', today);
  assert.deepEqual(
    ranking.map((r) => [r.exerciseId, r.metric, r.value]),
    [[2, 'reps', 1]],
  );
  assert.equal(progressRanking(state, progressIndex(state, today), 'change', today).length, 0);
});

test('high-rep weighted sets still contribute to actual bests, not estimated strength', () => {
  const { add, records, state } = fixture();
  add('2026-10-01', 50, 15);
  add('2026-11-08', 60, 20);
  assert.equal(isBodyweight(records()), false);
  assert.equal(dailyProgress(records(), 'estimated', today).length, 0);
  assert.equal(personalBest(records(), 'weight').weight, 60);
  assert.equal(progressRanking(state, progressIndex(state, today), 'updates', today).length, 0);
});

test('left and right are separate in chart, personal best and both rankings', () => {
  const { add, records, state } = fixture();
  add('2026-10-01', undefined, undefined, 3, {
    leftWeightKg: 10,
    leftReps: 1,
    rightWeightKg: 20,
    rightReps: 1,
  });
  add('2026-11-08', undefined, undefined, 3, {
    leftWeightKg: 15,
    leftReps: 1,
    rightWeightKg: 15,
    rightReps: 1,
  });
  assert.equal(records(3, 0).length, 0);
  assert.equal(personalBest(records(3, 1), 'weight').weight, 15);
  assert.equal(personalBest(records(3, 2), 'weight').weight, 20);
  assert.deepEqual(
    progressRanking(state, progressIndex(state, today), 'change', today).map((r) => [
      r.side,
      r.value,
    ]),
    [
      [1, 50],
      [2, -25],
    ],
  );
  assert.deepEqual(
    progressRanking(state, progressIndex(state, today), 'updates', today).map((r) => [
      r.side,
      r.value,
    ]),
    [
      [1, 1],
      [2, 0],
    ],
  );
});

test('unfinished side is excluded even when a malformed set is marked completed', () => {
  const { add, records } = fixture();
  add('2026-11-08', undefined, undefined, 3, {
    leftWeightKg: 10,
    leftReps: 1,
    rightWeightKg: 20,
    rightReps: 1,
    rightCompleted: false,
  });
  assert.equal(records(3, 1).length, 1);
  assert.equal(records(3, 2).length, 0);
});

test('ranking keeps same-named exercises distinct, excludes archived exercises and limits to five', () => {
  const { state, add } = fixture();
  state.exercises = Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    name: '同名',
    mode: 'NORMAL',
    archived: i === 6,
  }));
  for (const exercise of state.exercises) {
    add('2026-10-01', 10, 1, exercise.id);
    add('2026-11-08', 10 + exercise.id, 1, exercise.id);
  }
  assert.deepEqual(
    progressRanking(state, progressIndex(state, today), 'change', today).map((r) => r.exerciseId),
    [6, 5, 4, 3, 2],
  );
});

test('missing or obsolete preferences default safely without losing valid choices', () => {
  assert.deepEqual(progressPreferences(), {
    view: 'trend',
    metric: 'estimated',
    ranking: 'change',
    side: 1,
  });
  assert.deepEqual(
    progressPreferences({ view: 'obsolete', metric: 'reps', ranking: 'updates', side: 9 }),
    { view: 'trend', metric: 'reps', ranking: 'updates', side: 1 },
  );
});
