import Application from 'expo-application';
import { Platform } from 'react-native';
import { apiGet } from '@/services/api-client';

type PlatformVersion = { current: string };

type LatestVersions = {
  android?: PlatformVersion;
  ios?: PlatformVersion;
};

function compareVersions(installed: string, required: string): number | null {
  const parse = (version: string) => {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    return match ? match.slice(1, 4).map(Number) : null;
  };

  const installedParts = parse(installed);
  const requiredParts = parse(required);
  if (!installedParts || !requiredParts) return null;

  for (let index = 0; index < 3; index += 1) {
    if (installedParts[index] !== requiredParts[index]) {
      return installedParts[index] < requiredParts[index] ? -1 : 1;
    }
  }
  return 0;
}

export async function isNativeUpdateRequired(): Promise<boolean> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;

  const installedVersion = Application.nativeApplicationVersion;
  if (!installedVersion) return false;

  const latestVersions = await apiGet<LatestVersions>('/version/latest', undefined, { skipAuth: true });
  const requiredVersion = latestVersions[Platform.OS]?.current;
  if (!requiredVersion) return false;

  return compareVersions(installedVersion, requiredVersion) === -1;
}

export function getStoreUrl(): string {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_IOS_STORE_URL || 'https://apps.apple.com/search?term=Agendaza';
  }

  const configuredUrl = process.env.EXPO_PUBLIC_ANDROID_STORE_URL;
  if (configuredUrl) return configuredUrl;

  const applicationId = Application.applicationId;
  return applicationId
    ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(applicationId)}`
    : 'https://play.google.com/store';
}