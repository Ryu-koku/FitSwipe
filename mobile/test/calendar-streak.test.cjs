const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { seedState, achievementSummary } = require('../src/logic.ts');

function fixture(monday = false) {
  const state = { ...seedState(), weekStartsMonday: monday, sessions: [], sets: [] };
  const week = offset => {
    const d = new Date(); d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - (monday ? (d.getDay() + 6) % 7 : d.getDay()) + offset * 7);
    return d;
  };
  const add = (date, status = 'COMPLETED', completed = true) => {
    const id = state.sessions.length + 1;
    state.sessions.push({ id, startedAt: date.toISOString(), status });
    state.sets.push({ id, sessionId: id, exerciseId: 1, setOrder: 1, normalWeightKg: 20, normalReps: 10, isCompleted: completed });
  };
  const olderBest = () => { for (let i = -20; i < -12; i++) add(week(i)); };
  return { state, week, add, olderBest };
}
for (const monday of [false, true]) {
  test(`current streak wins over all-time longest; week starts ${monday ? 'Monday' : 'Sunday'}`, () => {
    const { state, week, add, olderBest } = fixture(monday); olderBest();
    [-2, -1, 0].forEach(i => add(week(i)));
    const s = achievementSummary(state); assert.equal(s.streakWeeks, 3); assert.equal(s.longestStreakWeeks, 8);
  });
  test(`pending current week keeps previous streak; a fully missed week breaks it; start ${monday}`, () => {
    const { state, week, add, olderBest } = fixture(monday); olderBest();
    [-3, -2, -1].forEach(i => add(week(i)));
    assert.equal(achievementSummary(state).streakWeeks, 3);
    state.sessions = state.sessions.filter(s => s.startedAt !== week(-1).toISOString());
    assert.equal(achievementSummary(state).streakWeeks, 0);
    assert.equal(achievementSummary(state).longestStreakWeeks, 8);
    add(week(0));
    assert.equal(achievementSummary(state).streakWeeks, 1);
    assert.equal(achievementSummary(state).longestStreakWeeks, 8);
  });
}
test('longest includes month/year boundaries, deduplicates weeks and excludes unrecorded/future workouts', () => {
  const { state, add } = fixture(true);
  ['2020-12-21', '2020-12-28', '2021-01-04', '2021-01-05'].forEach(d => add(new Date(`${d}T12:00:00`)));
  add(new Date('2021-01-11T12:00:00'), 'IN_PROGRESS');
  add(new Date('2021-01-18T12:00:00'), 'COMPLETED', false);
  for (let i = 1; i <= 28; i++) add(new Date(`2099-01-${String(i).padStart(2, '0')}T12:00:00`));
  assert.equal(achievementSummary(state).longestStreakWeeks, 3);
});
test('empty history has neither a current nor a longest streak', () => {
  const { state } = fixture(); const s = achievementSummary(state);
  assert.equal(s.streakWeeks, 0); assert.equal(s.longestStreakWeeks, 0);
});

// Render the actual calendar to verify month visibility and the preferred badge.
function calendar(state) {
  let cursor = 0, setMonth;
  const slots = [];
  const filename = path.resolve(__dirname, '../src/components/WorkoutCalendar.tsx');
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  class Value { setValue() {} stopAnimation() {} }
  mod.require = name => {
    if (name === 'react') return {
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; const set = value => { slots[i] = value; }; if (slots[i] instanceof Date) setMonth = set; return [slots[i], set]; },
      useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; }, useCallback: f => f, useEffect() {}, useLayoutEffect() {},
    };
    if (name === 'react-native') return { Animated: { Value, View: 'AnimatedView' }, View: 'View', Text: 'Text', Pressable: 'Pressable' };
    if (name === '../context') return { useApp: () => ({ state }) };
    if (name === '../ui') return { Card: 'Card', Sheet: 'Sheet', useTheme: () => ({ colors: { primary: '#007f78' }, styles: {} }) };
    if (name === '../use-reduced-motion') return { useReducedMotion: () => true };
    if (name === './StreakFlame') return { StreakFlame: 'StreakFlame' };
    if (name === './AppIcon') return { AppIcon: 'AppIcon' };
    if (name === './SessionDetails') return { SessionDetails: 'SessionDetails' };
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return { month: date => setMonth(date), render() { cursor = 0; const nodes = []; function visit(n) { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(visit); nodes.push(n); visit(n.props?.children); } visit(mod.exports.WorkoutCalendar()); return nodes; } };
}
const badge = nodes => nodes.find(n => /^現在の連続記録|^過去最高の連続記録/.test(n.props?.accessibilityLabel ?? ''));
test('current month shows current first, past/future months have no badge and returning restores it', () => {
  const { state, week, add, olderBest } = fixture(); olderBest(); [-2, -1, 0].forEach(i => add(week(i)));
  const app = calendar(state), now = new Date();
  assert.equal(badge(app.render()).props.accessibilityLabel, '現在の連続記録 3週');
  app.month(new Date(now.getFullYear(), now.getMonth() - 1, 1)); assert.equal(badge(app.render()), undefined);
  app.month(new Date(now.getFullYear(), now.getMonth() + 1, 1)); assert.equal(badge(app.render()), undefined);
  app.month(new Date(now.getFullYear(), now.getMonth(), 1)); assert.equal(badge(app.render()).props.accessibilityLabel, '現在の連続記録 3週');
});
test('broken streak shows all-time best in current month with the requested weekly label; empty history hides it', () => {
  const { state, olderBest } = fixture(); olderBest();
  const nodes = calendar(state).render();
  assert.equal(badge(nodes).props.accessibilityLabel, '過去最高の連続記録 8週');
  assert(nodes.some(n => n.type === 'Text' && n.props.children.join?.('') === '8週連続!'));
  assert(nodes.some(n => n.type === 'StreakFlame' && n.props.animate));
  assert.equal(badge(calendar(fixture().state).render()), undefined);
});
