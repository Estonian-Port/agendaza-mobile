const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    const releaseSigningBlock = `
        release {
            if (project.hasProperty('AGENDAZA_STORE_FILE')) {
                storeFile file(AGENDAZA_STORE_FILE)
                storePassword AGENDAZA_STORE_PASSWORD
                keyAlias AGENDAZA_KEY_ALIAS
                keyPassword AGENDAZA_KEY_PASSWORD
            }
        }`;

    // 1. Agrega el bloque signingConfigs.release junto a debug
    if (!buildGradle.includes('AGENDAZA_STORE_FILE')) {
      buildGradle = buildGradle.replace(
        /signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\}/,
        (match) => `${match}\n${releaseSigningBlock}`
      );

      // 2. Cambia signingConfig signingConfigs.debug por release dentro de buildTypes.release
      buildGradle = buildGradle.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
        '$1signingConfig signingConfigs.release'
      );
    }

    config.modResults.contents = buildGradle;
    return config;
  });
};