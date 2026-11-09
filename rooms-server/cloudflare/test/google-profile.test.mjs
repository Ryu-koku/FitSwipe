import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { applyGooglePicture, googlePictureUpdateSql } from '../google-profile.mjs';

test('migration and login SQL preserve custom photos and explicit removal, and refresh defaults', () => {
  const migration = readFileSync(new URL('../migrations/0007_google_profile_picture.sql', import.meta.url), 'utf8');
  const output = execFileSync('python3', ['-c', `
import sqlite3,json,sys
migration,update=json.load(sys.stdin)
db=sqlite3.connect(':memory:')
db.execute('CREATE TABLE users(id TEXT PRIMARY KEY, avatar TEXT)')
db.executemany('INSERT INTO users VALUES(?,?)', [('old-photo','data:image/jpeg;base64,/9j/2Q=='),('new',None),('removed',None)])
db.executescript(migration)
db.execute('UPDATE users SET avatar_custom=1 WHERE id="removed"')
for identity in ['old-photo','new','removed']:
    db.execute(update,('https://lh3.googleusercontent.com/first',identity))
first=dict(db.execute('SELECT id,avatar FROM users'))
db.execute(update,('https://lh3.googleusercontent.com/second','new'))
second=db.execute('SELECT avatar FROM users WHERE id="new"').fetchone()[0]
print(json.dumps([first,second]))
`], { input: JSON.stringify([migration, googlePictureUpdateSql]), encoding: 'utf8' });
  const [first, second] = JSON.parse(output);
  assert.equal(first['old-photo'], 'data:image/jpeg;base64,/9j/2Q==');
  assert.equal(first.removed, null);
  assert.equal(first.new, 'https://lh3.googleusercontent.com/first');
  assert.equal(second, 'https://lh3.googleusercontent.com/second');
});

test('missing picture leaves the saved profile intact and reads the current row', async () => {
  const stored = { id: 'me', name: 'New name', avatar: 'saved' };
  const env = { DB: { prepare(sql) {
    assert.equal(sql, 'SELECT id, name, avatar FROM users WHERE id = ?');
    return { bind(id) { assert.equal(id, 'me'); return { first: async () => stored }; } };
  } } };
  assert.equal(await applyGooglePicture(env, { id: 'me' }, undefined), stored);
});

test('initial room name prefers Google claims, falls back to the SDK and handles long Unicode names', async () => {
  const { initialGoogleName } = await import('../google-profile.mjs');
  assert.equal(initialGoogleName('Google の名前', '別の名前'), 'Google の名前');
  assert.equal(initialGoogleName(undefined, ' SDK の名前 '), 'SDK の名前');
  assert.equal(initialGoogleName(undefined, ' '), 'トレーニー');
  assert.equal(initialGoogleName('あ'.repeat(40)), 'あ'.repeat(32));
  assert.equal(initialGoogleName('あ'.repeat(31) + '😀'), 'あ'.repeat(31));
});
