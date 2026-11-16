// plugins/withFastBuild.js
const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withFastBuild(config) {
  return withGradleProperties(config, (config) => {
    const props = [
      { type: 'property', key: 'reactNativeArchitectures', value: 'armeabi-v7a,arm64-v8a' },
      { type: 'property', key: 'org.gradle.workers.max', value: '4' },
      { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx4096m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8' },
      { type: 'property', key: 'org.gradle.caching', value: 'true' },
    ];

    props.forEach((newProp) => {
      const existingIndex = config.modResults.findIndex((p) => p.key === newProp.key);
      if (existingIndex !== -1) {
        config.modResults[existingIndex] = newProp;
      } else {
        config.modResults.push(newProp);
      }
    });

    return config;
  });
};