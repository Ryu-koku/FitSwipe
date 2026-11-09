const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProfile, applyProfile } = require('../src/profile.ts');
const { seedState } = require('../src/logic.ts');
const { emptyCloud } = require('../src/sync.ts');

test('profile validation rejects empty names, controls, remote URLs and oversized avatars', () => {
  assert.deepEqual(validateProfile('  まめ  ', null), { name: 'まめ', avatar: null });
  for (const name of ['', ' ', 'a'.repeat(33), 'a\nb']) assert.throws(() => validateProfile(name, null));
  for (const avatar of ['https://example.com/avatar.jpg', 'file:///tmp/me.jpg', 'data:image/svg+xml,<svg/>', 'data:image/jpeg;base64,/9j/' + 'A'.repeat(24000)]) {
    assert.throws(() => validateProfile('まめ', avatar));
  }
});

test('saving a profile updates both identities and cached members, preserving other members and credentials', () => {
  const old = { id: 'me', name: 'Old', token: 'private', expiresAt: 12345 };
  const state = { ...seedState(), roomIdentity: old, cloud: emptyCloud(old), roomDetails: {
    room: { members: [{ id: 'me', name: 'Old' }, { id: 'other', name: 'Other' }], posts: [{ userId: 'me', name: 'Old' }] },
  } };
  const next = applyProfile(state, { ...old, name: 'New', avatar: null });
  assert.equal(next.cloud.identity.name, 'New');
  assert.equal(next.cloud.identity.token, 'private');
  assert.equal(next.cloud.identity.expiresAt, 12345);
  assert.equal(next.roomDetails.room.members[0].name, 'New');
  assert.equal(next.roomDetails.room.members[1].name, 'Other');
  assert.equal(next.roomDetails.room.posts[0].name, 'New');
  assert.equal(state.roomIdentity.name, 'Old');
  assert.throws(() => applyProfile(state, { id: 'other', name: 'Other', token: 'other' }));
});

test('Google default images support name-only edits while other remote URLs are rejected', () => {
  const { isGoogleAvatar } = require('../src/profile.ts');
  const avatar = 'https://lh3.googleusercontent.com/a/avatar=s96-c';
  assert.equal(isGoogleAvatar(avatar), true);
  assert.deepEqual(validateProfile('New name', avatar), { name: 'New name', avatar });
  for (const url of ['https://googleusercontent.com.attacker.test/a', 'http://lh3.googleusercontent.com/a', 'https://user@lh3.googleusercontent.com/a', 'https://lh3.googleusercontent.com:444/a']) {
    assert.equal(isGoogleAvatar(url), false);
    assert.throws(() => validateProfile('Name', url));
  }
});
