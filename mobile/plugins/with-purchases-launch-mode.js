const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

module.exports = config => withAndroidManifest(config, config => {
  // Allow store verification to return from an external payment app.
  const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
  activity.$['android:launchMode'] = 'singleTop';
  return config;
});
