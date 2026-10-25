const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  seedState,
  achievementSummary,
  localDay,
  recordHistoryLabel,
} = require('../src/logic.ts');
const {
  startWorkout,
  finishWorkout,
  currentCard,
  advanceWorkout,
  undoWorkout,
  resizeSets,
  updateSet,
  workoutCards,
  numeric,
} = require('../src/workout.ts');
const { workoutSnapshot } = require('../src/rooms.ts');

function workout({
  bilateral = false,
  sets = 2,
  rest = 90,
  left = false,
  sideRest = false,
} = {}) {
  const state = seedState();
  state.exercises = [
    {
      id: 1,
      name: 'ベンチプレス',
      mode: bilateral ? 'BILATERAL' : 'NORMAL',
      sortOrder: 0,
      archived: false,
    },
  ];
  state.presets = [
    {
      id: 'gym',
      name: 'ジム',
      exercises: [{ exerciseId: 1, sets, weightKg: 20, reps: 10 }],
    },
  ];
  state.restDurationSeconds = rest;
  state.leftFirstExerciseIds = left ? [1] : [];
  state.sideSwitchRestExerciseIds = sideRest ? [1] : [];
  return startWorkout(state);
}

test('default menus and training values match Kotlin defaults', () => {
  const state = seedState();
  assert.deepEqual(
    state.presets.map((p) =>
      p.exercises.map(
        (c) => state.exercises.find((e) => e.id === c.exerciseId).name,
      ),
    ),
    [
      ['ベンチプレス', 'ラットプルダウン', 'レッグプレス'],
      ['スクワット', '腕立て伏せ', 'プランク'],
    ],
  );
  assert.deepEqual(
    state.presets[0].exercises.map((c) => c.weightKg),
    [55, 50, 105],
  );
});

test('starting twice resumes, and selecting another preset never adds sets', () => {
  const state = workout();
  assert.equal(startWorkout(state, 'home'), state);
  assert.equal(state.sessions.length, 1);
  assert.equal(new Set(state.sets.map((s) => s.id)).size, state.sets.length);
});

test('archived/empty presets cannot start', () => {
  const state = seedState();
  state.exercises = state.exercises.map((e) => ({ ...e, archived: true }));
  assert.throws(() => startWorkout(state), /プリセット/);
});

test('old RN sessions resume without replacing IDs or values', () => {
  const state = workout();
  delete state.workout;
  const resumed = startWorkout(state);
  assert.deepEqual(resumed.sets, state.sets);
  assert.equal(
    currentCard(resumed, resumed.sessions[0].id).setId,
    state.sets[0].id,
  );
});

test('ending a workout preserves unperformed sets as incomplete', () => {
  const state = workout();
  const ended = finishWorkout(state, state.sessions[0].id);
  assert.ok(ended.sets.every((s) => !s.isCompleted));
  assert.equal(achievementSummary(ended).completedSets, 0);
  assert.equal(achievementSummary(ended).trainingDays, 0);
});

test('normal cards complete, rest only between same-exercise sets, and auto-finish', () => {
  const state = workout();
  const next = advanceWorkout(state);
  assert.equal(next.sets[0].isCompleted, true);
  assert.equal(next.sets[1].isCompleted, false);
  assert.equal(next.workout.restEndsAt - next.workout.restStartedAt, 90000);
  const ended = advanceWorkout(next);
  assert.equal(ended.sessions[0].status, 'COMPLETED');
  assert.equal(ended.workout, undefined);
  assert.equal(achievementSummary(ended).completedSets, 2);
  assert.equal(achievementSummary(ended).liftedWeightKg, 400);
});

test('bilateral cards default to right then left; rest-on-side-switch is optional', () => {
  const state = workout({ bilateral: true });
  assert.equal(currentCard(state, state.sessions[0].id).side, 'right');
  const next = advanceWorkout(state);
  assert.equal(next.sets[0].rightCompleted, true);
  assert.equal(next.sets[0].leftCompleted, false);
  assert.equal(next.sets[0].isCompleted, false);
  assert.equal(next.workout.card.side, 'left');
  assert.equal(next.workout.restEndsAt, undefined);
  const completed = advanceWorkout(next);
  assert.equal(completed.sets[0].isCompleted, true);
  assert.equal(
    completed.workout.restEndsAt - completed.workout.restStartedAt,
    90000,
  );
  const withRest = advanceWorkout(workout({ bilateral: true, sideRest: true }));
  assert.ok(withRest.workout.restEndsAt);
});

test('left-first and per-exercise rest settings survive serialization', () => {
  let state = workout({ bilateral: true, left: true });
  state.exerciseRestDurations[1] = 30;
  assert.equal(currentCard(state, state.sessions[0].id).side, 'left');
  state = advanceWorkout(advanceWorkout(state));
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(
    restored.workout.restEndsAt - restored.workout.restStartedAt,
    30000,
  );
  assert.deepEqual(
    currentCard(restored, restored.sessions[0].id),
    currentCard(state, state.sessions[0].id),
  );
});

test('skip clears only current values; undo restores exact card and cancels rest', () => {
  const state = workout({ bilateral: true });
  const skipped = advanceWorkout(state, true);
  assert.equal(skipped.sets[0].rightWeightKg, undefined);
  assert.equal(skipped.sets[0].leftWeightKg, 20);
  const restored = undoWorkout(skipped);
  assert.deepEqual(restored.sets, state.sets);
  assert.deepEqual(
    currentCard(restored, restored.sessions[0].id),
    currentCard(state, state.sessions[0].id),
  );
  assert.equal(restored.workout.restEndsAt, undefined);
});

test('weight changes carry to later incomplete sets, repetitions do not', () => {
  const state = workout({ sets: 3 });
  const changed = updateSet(state, state.sets[0].id, {
    normalWeightKg: 25,
    normalReps: 8,
  });
  assert.deepEqual(
    changed.sets.map((s) => s.normalWeightKg),
    [25, 25, 25],
  );
  assert.deepEqual(
    changed.sets.map((s) => s.normalReps),
    [8, 10, 10],
  );
});

test('resizing protects partial bilateral sets and duplicates with unique IDs', () => {
  let state = advanceWorkout(workout({ bilateral: true, sets: 3 }));
  state = resizeSets(state, state.sessions[0].id, 1, 1);
  assert.equal(state.sets.length, 1);
  assert.equal(state.sets[0].rightCompleted, true);
  state = resizeSets(state, state.sessions[0].id, 1, 4);
  assert.equal(state.sets.length, 4);
  assert.equal(new Set(state.sets.map((s) => s.id)).size, 4);
  assert.ok(
    state.sets.slice(1).every((s) => !s.rightCompleted && !s.isCompleted),
  );
});

test('adding an exercise during a workout uses its previous completed values', () => {
  let state = workout({ sets: 1 });
  state = advanceWorkout(state);
  const previousSessionId = state.sessions[0].id;
  state.sessions.push({
    id: 900,
    startedAt: new Date().toISOString(),
    status: 'IN_PROGRESS',
  });
  state = resizeSets(state, 900, 1, 1);
  const added = state.sets.find((s) => s.sessionId === 900);
  assert.equal(added.normalWeightKg, 20);
  assert.equal(added.normalReps, 10);
  assert.equal(added.setOrder, 1);
  assert.equal(added.isCompleted, false);
  assert.notEqual(
    added.id,
    state.sets.find((s) => s.sessionId === previousSessionId).id,
  );
});

test('set IDs stay unique across many sessions, including legacy arithmetic IDs', () => {
  let state = workout();
  state.sets[0].id = 90000;
  for (let i = 0; i < 100; i++) {
    state = finishWorkout(state, state.sessions.at(-1).id);
    state = startWorkout(state);
  }
  assert.equal(new Set(state.sets.map((s) => s.id)).size, state.sets.length);
  assert.ok(state.nextId > 90000);
});

test('exercise order and archived exercises remain valid during an active workout', () => {
  let state = startWorkout(seedState());
  state.workout.exerciseOrder.reverse();
  const firstId = state.workout.exerciseOrder[0];
  assert.equal(
    state.sets.find(
      (s) => s.id === workoutCards(state, state.sessions[0].id)[0].setId,
    ).exerciseId,
    firstId,
  );
  state.exercises = state.exercises.map((e) => ({ ...e, archived: true }));
  assert.ok(currentCard(state, state.sessions[0].id));
});

test('personal bests count once per exercise and session, excluding baseline', () => {
  let state = workout({ sets: 3, rest: 0 });
  while (state.workout) state = advanceWorkout(state);
  assert.equal(achievementSummary(state).personalBestUpdates, 0);
  state = startWorkout(state);
  state.sets
    .filter((s) => s.sessionId === state.workout.sessionId)
    .forEach((s, i) => {
      s.normalWeightKg = 25 + i * 5;
    });
  while (state.workout) state = advanceWorkout(state);
  assert.equal(achievementSummary(state).personalBestUpdates, 1);
});

test('BIG3 supports normalized English names and requires all three lifts', () => {
  const state = seedState();
  state.exercises = ['Ｂｅｎｃｈ Press', 'バックスクワット', 'deadlift'].map(
    (name, id) => ({
      id,
      name,
      mode: 'NORMAL',
      sortOrder: id,
      archived: false,
    }),
  );
  state.sessions = [
    { id: 1, status: 'COMPLETED', startedAt: '2026-01-01T10:00:00Z' },
  ];
  state.sets = [0, 1, 2].map((id) => ({
    id,
    exerciseId: id,
    sessionId: 1,
    setOrder: 1,
    normalWeightKg: 100,
    normalReps: 1,
    isCompleted: true,
    leftCompleted: false,
    rightCompleted: false,
  }));
  assert.equal(achievementSummary(state).big3, 300);
  state.sets.pop();
  assert.equal(achievementSummary(state).big3, undefined);
});

test('sharing includes only completed sides and uses a stable installation-scoped ID', () => {
  let state = advanceWorkout(workout({ bilateral: true }));
  state = finishWorkout(state, state.sessions[0].id);
  const snapshot = workoutSnapshot(state, state.sessions[0].id);
  assert.equal(snapshot.exercises[0].sets.length, 1);
  assert.equal(snapshot.exercises[0].sets[0].side, '右');
  assert.equal(
    snapshot.clientId,
    workoutSnapshot(state, state.sessions[0].id).clientId,
  );
  assert.ok(snapshot.clientId.startsWith(state.installationId));
  assert.throws(() => workoutSnapshot(workout(), 100), /完了/);
});

test('numeric controls accept decimal comma but reject negatives, infinity, and fractional reps', () => {
  assert.equal(numeric('2,5'), 2.5);
  for (const value of ['', '-1', 'NaN', 'Infinity'])
    assert.equal(numeric(value), undefined);
  assert.equal(numeric('1.5', true), undefined);
  assert.equal(localDay(new Date(2026, 0, 2, 0, 1)), '2026-01-02');
});

test('record history matches Kotlin inclusive days and calendar periods', () => {
  assert.equal(recordHistoryLabel(), '—');
  assert.equal(
    recordHistoryLabel('2026-01-01T12:00:00', '2026-01-01T12:00:00'),
    '1日',
  );
  assert.equal(
    recordHistoryLabel('2026-01-01T12:00:00', '2026-01-05T12:00:00'),
    '5日',
  );
  assert.equal(
    recordHistoryLabel('2026-01-01T12:00:00', '2026-03-01T12:00:00'),
    '2か月',
  );
  assert.equal(
    recordHistoryLabel('2025-01-01T12:00:00', '2026-02-01T12:00:00'),
    '1年1か月',
  );
});

test('weekly streak keeps last week when this week has no record, for either week start', () => {
  const today = new Date();
  for (const monday of [false, true]) {
    const state = seedState();
    state.weekStartsMonday = monday;
    const beginning = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12,
    );
    beginning.setDate(
      beginning.getDate() -
        (monday ? (beginning.getDay() + 6) % 7 : beginning.getDay()),
    );
    for (let i = 1; i <= 3; i++) {
      const date = new Date(beginning);
      date.setDate(date.getDate() - i * 7);
      state.sessions.push({
        id: i,
        status: 'COMPLETED',
        startedAt: date.toISOString(),
      });
      state.sets.push({
        id: i,
        sessionId: i,
        exerciseId: 1,
        setOrder: 1,
        normalWeightKg: 20,
        normalReps: 10,
        isCompleted: true,
      });
    }
    assert.equal(achievementSummary(state).streakWeeks, 3);
    state.sets = state.sets.filter((s) => s.sessionId !== 1);
    assert.equal(achievementSummary(state).streakWeeks, 0);
  }
});
