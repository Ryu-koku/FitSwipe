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

test('set-only presets use previous completed values and defaults on workout start', () => {
  let state = seedState();
  const normalId = state.exercises[0].id;
  const bilateral = { id: 900, name: '新しい種目', mode: 'BILATERAL', sortOrder: 20, archived: false };
  state.exercises.push(bilateral);
  state.presets = [{ id: 'new', name: '新規', exercises: [
    { exerciseId: normalId, sets: 2 }, { exerciseId: bilateral.id, sets: 2 },
  ] }];
  state.sessions.push({ id: 800, startedAt: '2020-01-01T00:00:00.000Z', status: 'COMPLETED' });
  state.sets.push(
    { id: 801, sessionId: 800, exerciseId: normalId, setOrder: 1, normalWeightKg: 42.5, normalReps: 8, isCompleted: true },
    { id: 802, sessionId: 800, exerciseId: bilateral.id, setOrder: 1, leftWeightKg: 12, leftReps: 6,
      rightWeightKg: 14, rightReps: 7, leftCompleted: true, rightCompleted: true, isCompleted: true },
  );
  state = startWorkout(state, 'new');
  const normal = state.sets.filter((s) => s.sessionId === state.workout.sessionId && s.exerciseId === normalId);
  assert.deepEqual(normal.map((s) => [s.normalWeightKg, s.normalReps]), [[42.5, 8], [42.5, 8]]);
  const sides = state.sets.filter((s) => s.sessionId === state.workout.sessionId && s.exerciseId === bilateral.id);
  assert.deepEqual(sides.map((s) => [s.leftWeightKg, s.leftReps, s.rightWeightKg, s.rightReps]), [[12, 6, 14, 7], [12, 6, 14, 7]]);
  const fresh = startWorkout({ ...seedState(), presets: [{ id: 'fresh', name: '初回', exercises: [{ exerciseId: normalId, sets: 1 }] }] });
  assert.deepEqual([fresh.sets[0].normalWeightKg, fresh.sets[0].normalReps], [55, 10]);
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
  while (state.workout) {
    const next = advanceWorkout(state);
    state = next === state ? require('../src/workout.ts').skipToNextExercise(state) : next;
  }
  assert.equal(achievementSummary(state).personalBestUpdates, 0);
  state = startWorkout(state);
  state.sets
    .filter((s) => s.sessionId === state.workout.sessionId)
    .forEach((s, i) => {
      s.normalWeightKg = 25 + i * 5;
    });
  while (state.workout) {
    const next = advanceWorkout(state);
    state = next === state ? require('../src/workout.ts').skipToNextExercise(state) : next;
  }
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

const { reorderWorkout, reopenSkippedCard } = require('../src/workout.ts');
const { restRemaining } = require('../src/rest-progress.ts');















test('ring and seconds derive from elapsed time including background and expiry', () => {
  assert.deepEqual(restRemaining(1000, 61000, 1000), { seconds: 60, fraction: 1 });
  assert.deepEqual(restRemaining(1000, 61000, 16000), { seconds: 45, fraction: 0.75 });
  assert.deepEqual(restRemaining(1000, 61000, 61001), { seconds: 0, fraction: 0 });
  assert.equal(restRemaining(1000, 61000, 60999).seconds, 1);
  assert.equal(restRemaining(1000, 1000, 1000).fraction, 0);
});

test('another device open session does not replace the workout in progress here', () => {
  const { activeSession } = require('../src/workout.ts');
  let state = workout({ sets: 2 });
  const mine = state.workout.sessionId;
  const other = { id: 9000, startedAt: '2026-10-01T00:00:00.000Z', status: 'IN_PROGRESS' };
  state = { ...state, sessions: [other, ...state.sessions] };
  assert.equal(activeSession(state).id, mine);
  assert.equal(startWorkout(state), state);
  const finished = finishWorkout(state, mine);
  assert.equal(activeSession(finished).id, other.id);
});

test('bulk exercise edits preserve completed sides, other sessions and skipped restoration values', () => {
  const { updateExerciseSets } = require('../src/workout.ts');
  const state = workout({ bilateral: true, sets: 3 });
  const sessionId = state.sets[0].sessionId;
  state.sets[0].isCompleted = true;
  state.sets[1].leftCompleted = true;
  state.sets[1].skippedInputs = { right: { weightKg: 12, reps: 8 } };
  state.sets.push({ ...state.sets[2], id: 999, sessionId: -1 });
  state.sets.push({ ...state.sets[2], id: 1000, exerciseId: -1 });
  const before = structuredClone(state);
  const result = updateExerciseSets(state, sessionId, 1, { leftWeightKg: 40, rightWeightKg: 50, leftReps: 6, rightReps: 6 }, 'fixed');
  assert.deepEqual(state, before);
  assert.equal(result.sets[0], state.sets[0]);
  assert.equal(result.sets[1].leftWeightKg, state.sets[1].leftWeightKg);
  assert.equal(result.sets[1].leftReps, state.sets[1].leftReps);
  assert.deepEqual(result.sets[1].skippedInputs.right, { weightKg: 50, reps: 6 });
  assert.equal(result.sets[2].leftWeightKg, 40);
  assert.equal(result.sets[2].rightReps, 6);
  assert.equal(result.sets[3], state.sets[3]);
  assert.equal(result.sets[4], state.sets[4]);
});

test('global timer opt-outs suppress rest, preserving configured durations', () => {
  for (const bilateral of [false, true]) for (const sideRest of [false, true]) {
    const state = workout({ bilateral, sideRest });
    state.restTimerDisabled = true;
    state.exerciseRestDurations[1] = 42;
    const next = advanceWorkout(state, false);
    assert.equal(next.restTimerDisabled, true);
    assert.equal(next.exerciseRestDurations[1], 42);
    assert.equal(next.workout.restEndsAt, undefined);
  }
});


const { skipToNextExercise, nextExerciseCard, cardCompleted } = require('../src/workout.ts');








const { moveToCard, moveToNextExercise, moveToPreviousExercise, moveToExercise, deleteWorkoutSet } = require('../src/workout.ts');

test('cursor moves in both directions, updates records by position, and finishes after the final card', () => {
  let state = workout({ sets: 3, rest: 0 });
  const sessionId = state.workout.sessionId;
  const cards = workoutCards(state, sessionId);
  assert.deepEqual(currentCard(state, sessionId), cards[0]);
  state = advanceWorkout(state);
  assert.deepEqual(currentCard(state, sessionId), cards[1]);
  assert.equal(state.sets[0].isCompleted, true);
  state = moveToCard(state, cards[0]);
  assert.equal(state.sets[0].isCompleted, false);
  state = updateSet(state, cards[0].setId, { normalReps: 14 });
  state = moveToCard(state, cards[2]);
  assert.equal(state.sets[0].normalReps, 14);
  assert.deepEqual(state.sets.map(s => s.isCompleted), [true, true, false]);
  state = advanceWorkout(state);
  assert.equal(state.workout, undefined);
  assert.ok(state.sets.every(s => s.isCompleted));
  assert.equal(state.sessions[0].status, 'COMPLETED');
});

test('bilateral cards share one editable set row and completion follows the cursor', () => {
  let state = workout({ bilateral: true, sets: 1, rest: 0 });
  const sessionId = state.workout.sessionId;
  const cards = workoutCards(state, sessionId);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].setId, cards[1].setId);
  state = advanceWorkout(state);
  assert.equal(state.sets[0][`${cards[0].side}Completed`], true);
  assert.equal(state.sets[0].isCompleted, false);
  state = moveToCard(state, cards[0]);
  assert.equal(state.sets[0][`${cards[0].side}Completed`], false);
  state = advanceWorkout(advanceWorkout(state));
  assert.equal(state.sets[0].leftCompleted, true);
  assert.equal(state.sets[0].rightCompleted, true);
});

test('exercise swipes move to exercise starts without generating skipped inputs', () => {
  let state = startWorkout(seedState());
  const sessionId = state.workout.sessionId;
  const initialCount = state.sets.length;
  state = moveToNextExercise(state);
  const second = currentCard(state, sessionId);
  assert.equal(state.sets.find(s => s.id === second.setId).exerciseId, state.workout.exerciseOrder[1]);
  assert.equal(state.sets.length, initialCount);
  assert.ok(state.sets.every(s => !s.skippedInputs));
  state = moveToPreviousExercise(state);
  assert.equal(currentCard(state, sessionId).setId, workoutCards(state, sessionId)[0].setId);
});

test('moveToExercise selects the first card of a prior exercise and ignores missing targets', () => {
  const initial = seedState();
  initial.exercises.find(exercise => exercise.id === initial.presets[0].exercises[0].exerciseId).mode = 'BILATERAL';
  let state = startWorkout(initial);
  const sessionId = state.workout.sessionId;
  const firstExercise = state.workout.exerciseOrder[0];
  const firstCard = workoutCards(state, sessionId)[0];
  state = moveToNextExercise(state);
  state = moveToNextExercise(state);
  const before = structuredClone(state);
  const moved = moveToExercise(state, firstExercise);
  assert.deepEqual(currentCard(moved, sessionId), firstCard);
  assert.equal(moved.workout.restEndsAt, undefined);
  assert.deepEqual(state, before);
  assert.equal(moveToExercise(state, -999), state);
  assert.equal(moveToExercise({ ...state, workout: undefined }, firstExercise).workout, undefined);
});

test('deleting a set removes the whole bilateral row, selects the next card, and finishes when empty', () => {
  let state = workout({ bilateral: true, sets: 2, rest: 0 });
  const sessionId = state.workout.sessionId;
  const first = currentCard(state, sessionId);
  state = deleteWorkoutSet(state, first.setId);
  assert.equal(state.sets.length, 1);
  assert.equal(currentCard(state, sessionId).setId, state.sets[0].id);
  state = deleteWorkoutSet(state, state.sets[0].id);
  assert.equal(state.sets.length, 0);
  assert.equal(state.workout, undefined);
  assert.equal(state.sessions[0].status, 'COMPLETED');
});

test('legacy skipped input fields remain loadable while cursor movement does not create skips', () => {
  let state = workout({ sets: 2, rest: 0 });
  state.sets[0].skippedInputs = { normal: { weightKg: 20, reps: 10 } };
  state = JSON.parse(JSON.stringify(state));
  state = advanceWorkout(state);
  assert.equal(state.sets[0].isCompleted, true);
  assert.equal(state.sets[1].skippedInputs, undefined);
});
