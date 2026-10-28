const { test } = require('node:test');
const assert = require('node:assert/strict');
const { configureSigning } = require('../plugins/with-play-upload-signing');

const source = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug { signingConfig signingConfigs.debug }
        release {
            signingConfig signingConfigs.debug
        }
    }
}`;

test('Play signing survives repeated prebuilds and returns to debug signing without upload credentials', () => {
  const play = configureSigning(source, true);
  assert.match(play, /FITLOG_UPLOAD_KEYSTORE/);
  assert.match(play, /release \{\s+signingConfig signingConfigs.upload/);
  assert.equal(configureSigning(play, true), play);
  const development = configureSigning(play, false);
  assert.doesNotMatch(development, /FITLOG_UPLOAD|signingConfigs.upload/);
  assert.equal(development, source);
  assert.equal(configureSigning(development, false), development);
  assert.equal(configureSigning(development, true), play);
});

test('a custom upload block not owned by the plugin is left unchanged', () => {
  const custom = source.replace('signingConfigs {', "signingConfigs {\n        upload { storeFile file('custom.keystore') }");
  assert.equal(configureSigning(custom, false), custom);
});
