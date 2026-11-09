const { withGradleProperties } = require('expo/config-plugins');

module.exports = config => withGradleProperties(config, config => {
  const key = 'AsyncStorage_db_size_in_MB';
  config.modResults = config.modResults.filter(item => item.type !== 'property' || item.key !== key);
  config.modResults.push({ type: 'property', key, value: '64' });
  return config;
});
