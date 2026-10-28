const { withAppBuildGradle, createRunOncePlugin } = require('expo/config-plugins');

function blockEnd(source, openingBrace) {
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error('Could not find the end of an Android Gradle block');
}

function configureSigning(contents, useUpload) {
    if (!useUpload) {
      // Prebuild reuses native files. Remove only the upload block owned by
      // this plugin, rather than leaving a null keystore reference behind.
      const uploadStart = contents.indexOf('upload {', contents.indexOf('signingConfigs {'));
      if (uploadStart >= 0) {
        const end = blockEnd(contents, contents.indexOf('{', uploadStart));
        if (contents.slice(uploadStart, end + 1).includes('FITLOG_UPLOAD_KEYSTORE')) {
          const start = contents.lastIndexOf('\n', uploadStart) + 1;
          contents = contents.slice(0, start) + contents.slice(end + 1).replace(/^\r?\n/, '');
          contents = contents.replace('signingConfig signingConfigs.upload', 'signingConfig signingConfigs.debug');
        }
      }
      return contents;
    }
    const signingStart = contents.indexOf('signingConfigs {');
    if (signingStart < 0) throw new Error('Expo Android Gradle project has no signingConfigs block');

    if (!contents.includes('FITLOG_UPLOAD_KEYSTORE')) {
      const signingEnd = blockEnd(contents, contents.indexOf('{', signingStart));
      const lineStart = contents.lastIndexOf('\n', signingEnd) + 1;
      const parentIndent = contents.slice(lineStart, signingEnd);
      const uploadSigning = `${parentIndent}    upload {\n            storeFile file(System.getenv("FITLOG_UPLOAD_KEYSTORE"))\n            storePassword System.getenv("FITLOG_UPLOAD_PASSWORD")\n            keyAlias System.getenv("FITLOG_UPLOAD_KEY_ALIAS") ?: "upload"\n            keyPassword System.getenv("FITLOG_UPLOAD_PASSWORD")\n${parentIndent}    }\n${parentIndent}`;
      contents = `${contents.slice(0, lineStart)}${uploadSigning}${contents.slice(signingEnd)}`;
    }

    const buildTypesStart = contents.indexOf('buildTypes {');
    const releaseStart = contents.indexOf('release {', buildTypesStart);
    if (buildTypesStart < 0 || releaseStart < 0) {
      throw new Error('Expo Android Gradle project has no release build type');
    }
    const releaseEnd = blockEnd(contents, contents.indexOf('{', releaseStart));
    const releaseBlock = contents.slice(releaseStart, releaseEnd + 1);
    const signedRelease = releaseBlock.replace(
      'signingConfig signingConfigs.debug',
      'signingConfig signingConfigs.upload',
    );
    if (signedRelease === releaseBlock && !releaseBlock.includes('signingConfigs.upload')) {
      throw new Error('Could not set the existing Play upload key on the Expo release build');
    }

    return `${contents.slice(0, releaseStart)}${signedRelease}${contents.slice(releaseEnd + 1)}`;
}

function withPlayUploadSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const useUpload = !!process.env.FITLOG_UPLOAD_KEYSTORE && process.env.FITSWIPE_APP_VARIANT !== 'development';
    config.modResults.contents = configureSigning(config.modResults.contents, useUpload);
    return config;
  });
}

module.exports = createRunOncePlugin(withPlayUploadSigning, 'with-play-upload-signing', '1.0.0');
module.exports.configureSigning = configureSigning;
