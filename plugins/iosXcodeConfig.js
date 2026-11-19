const { withXcodeProject } = require('@expo/config-plugins');

const APPLE_TEAM_ID = 'DSVF4QY4AV';

module.exports = function withIosXcodeConfig(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();

    const version = config.version || '1.0.0';
    const buildNumber = config.ios?.buildNumber || '1';
    const bundleId = config.ios?.bundleIdentifier;
    const appName = config.name || 'Agendaza';

    for (const key in configurations) {
      const buildSettings = configurations[key].buildSettings;
      if (!buildSettings) continue;

      const isMainTarget =
        buildSettings.PRODUCT_BUNDLE_IDENTIFIER === `"${bundleId}"` ||
        buildSettings.PRODUCT_BUNDLE_IDENTIFIER === bundleId;

      if (!isMainTarget) continue;

      buildSettings.DEVELOPMENT_TEAM = `"${APPLE_TEAM_ID}"`;
      buildSettings.CODE_SIGN_STYLE = 'Automatic';

      buildSettings.SUPPORTS_MACCATALYST = 'NO';
      buildSettings.SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = 'NO';
      buildSettings.SUPPORTS_XR_DESIGNED_FOR_IPHONE_IPAD = 'NO';
      buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';

      buildSettings.MARKETING_VERSION = version;
      buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
      buildSettings.INFOPLIST_KEY_CFBundleDisplayName = `"${appName}"`;
      buildSettings.INFOPLIST_KEY_LSApplicationCategoryType = '"public.app-category.business"';
    }

    return config;
  });
};