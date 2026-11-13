const test = require('node:test');
const assert = require('node:assert/strict');
const { homeDisplay, moveHomeCard } = require('../src/home-display.ts');
const { seedState } = require('../src/logic.ts');
const { exportBackup, parseBackup } = require('../src/backup.ts');

test('home display defaults, order, visibility and size survive backup', () => {
  const state = seedState();
  assert.deepEqual(homeDisplay(undefined), { cards: [{ id: 'progress', visible: true }, { id: 'muscleSets', visible: true }], progressSize: 'medium' });
  state.homeDisplay = { ...moveHomeCard(homeDisplay(state.homeDisplay), 'muscleSets', -1), progressSize: 'large' };
  state.homeDisplay.cards[1].visible = false;
  assert.deepEqual(parseBackup(exportBackup(state)).homeDisplay, state.homeDisplay);
  const old = JSON.parse(exportBackup(state));
  delete old.data.homeDisplay;
  assert.deepEqual(parseBackup(JSON.stringify(old)).homeDisplay, homeDisplay());
  old.data.homeDisplay = { cards: [{ id: 'progress', visible: true }, { id: 'progress', visible: false }], progressSize: 'medium' };
  assert.throws(() => parseBackup(JSON.stringify(old)));
});
