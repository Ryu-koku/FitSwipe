const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { seedState } = require('../src/logic.ts');
const { exerciseVisual, exerciseVisuals, visibleIllustration, playExerciseIllustration } = require('../src/exercise-visuals.ts');

test('every bundled exercise has its own illustration, including the expanded catalog', () => {
  const exercises = seedState().exercises;
  assert.equal(exercises.length, 57);
  assert.equal(exerciseVisuals.length, exercises.length);
  const keys = exercises.map(exercise => {
    const visual = exerciseVisual(exercise.name);
    assert.ok(visual, `missing ${exercise.name}`);
    assert.equal(visual.name, exercise.name);
    return visual.key;
  });
  assert.equal(new Set(keys).size, exercises.length);
});

test('legacy labels resolve while equipment, angles and grips stay distinct', () => {
  assert.equal(exerciseVisual('ペクトラルフライ').key, 'pec-fly');
  assert.equal(exerciseVisual('ダンベルサイドレイズ').key, 'lateral-raise');
  assert.equal(exerciseVisual(' ダンベルカール(左右) ').key, 'dumbbell-curl');
  assert.equal(exerciseVisual('スミスマシン ベンチプレス').key, 'smith-bench-press');
  assert.equal(exerciseVisual('ｔバーロー').key, 't-bar-row');
  for (const names of [
    ['ダンベルカール', 'インクラインダンベルカール', 'ハンマーカール', 'アームカール'],
    ['ベンチプレス', 'インクラインベンチプレス', 'スミスマシン・ベンチプレス', 'ダンベルプレス'],
    ['チンニング（懸垂）', 'アンダーグリップチンニング'],
    ['ヒップアブダクション', 'ヒップアダクション'],
  ]) {
    assert.equal(new Set(names.map(name => exerciseVisual(name).key)).size, names.length);
  }
  for (const visual of exerciseVisuals) {
    for (const alias of visual.aliases) assert.equal(exerciseVisual(alias).key, visual.key);
  }
});

test('custom names never borrow a partial name match', () => {
  for (const name of ['', '新しい種目', 'ベンチプレス練習', '独自インクラインダンベルカール改']) {
    assert.equal(exerciseVisual(name), undefined);
  }
});

test('illustrations play only when visible, focused, active and motion is allowed', () => {
  const active = { enabled: true, animated: true, visible: true, focused: true, appState: 'active', reducedMotion: false, covered: false };
  assert.equal(playExerciseIllustration(active), true);
  for (const change of [
    { enabled: false }, { animated: false }, { visible: false }, { focused: false },
    { appState: 'background' }, { appState: 'inactive' }, { appState: null },
    { reducedMotion: true }, { reducedMotion: undefined }, { covered: true },
  ]) assert.equal(playExerciseIllustration({ ...active, ...change }), false, JSON.stringify(change));
  assert.equal(exerciseVisual('プランク').animated, false);
});

test('visibility includes partly visible pictures and excludes offscreen or unmeasured views', () => {
  const screen = { width: 390, height: 844 };
  assert.equal(visibleIllustration({ x: 20, y: 100, width: 64, height: 60 }, screen), true);
  assert.equal(visibleIllustration({ x: -20, y: 820, width: 64, height: 60 }, screen), true);
  for (const rect of [
    { x: 20, y: 844, width: 64, height: 60 },
    { x: 390, y: 100, width: 64, height: 60 },
    { x: 0, y: -60, width: 64, height: 60 },
    { x: -64, y: 100, width: 64, height: 60 },
    { x: 20, y: 100, width: 0, height: 60 },
    { x: NaN, y: 100, width: 64, height: 60 },
    { x: 20, y: Infinity, width: 64, height: 60 },
  ]) assert.equal(visibleIllustration(rect, screen), false, JSON.stringify(rect));
});

function bundledAssets() {
  // Load the production Metro require table and resolve every real asset.
  const filename = path.resolve(__dirname, '../src/exercise-visual-assets.ts');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.require = relative => {
    const resolved = path.resolve(path.dirname(filename), relative);
    assert.ok(fs.statSync(resolved).isFile(), resolved);
    return resolved;
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
  return mod.exports.exerciseVisualAssets;
}

function chunks(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  const found = [];
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4);
    found.push({ type: bytes.toString('ascii', offset, offset + 4), data: bytes.subarray(offset + 8, offset + 8 + size) });
    offset += 8 + size + (size % 2);
  }
  return found;
}

test('all 57 assets are bundled and every motion loops for 3.2 seconds with a static fallback', () => {
  const assets = bundledAssets();
  assert.deepEqual(Object.keys(assets).sort(), exerciseVisuals.map(v => v.key).sort());
  for (const visual of exerciseVisuals) {
    const asset = assets[visual.key];
    const poster = chunks(fs.readFileSync(asset.poster));
    const still = poster.find(p => p.type === 'VP8X').data;
    assert.ok(!(still[0] & 0x02), `${visual.key}: static poster`);
    assert.ok(still[0] & 0x10, `${visual.key}: poster transparency`);
    assert.ok(still.readUIntLE(4, 3) + 1 <= 240 && still.readUIntLE(7, 3) + 1 <= 240, visual.key);
    if (!visual.animated) {
      assert.equal(asset.animation, asset.poster, visual.key);
      continue;
    }
    const parts = chunks(fs.readFileSync(asset.animation));
    const extended = parts.find(p => p.type === 'VP8X').data;
    assert.ok(extended[0] & 0x02, `${visual.key}: animation`);
    assert.ok(extended[0] & 0x10, `${visual.key}: transparency`);
    assert.ok(extended.readUIntLE(4, 3) + 1 <= 240 && extended.readUIntLE(7, 3) + 1 <= 240, visual.key);
    assert.equal(parts.find(p => p.type === 'ANIM').data.readUInt16LE(4), 0, `${visual.key}: repeats indefinitely`);
    const frames = parts.filter(p => p.type === 'ANMF');
    assert.equal(frames.length, 16, visual.key);
    assert.equal(frames.reduce((sum, frame) => sum + frame.data.readUIntLE(12, 3), 0), 3200, visual.key);
  }
});
