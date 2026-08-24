import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const VOIRA_CLIENT_VERSION_HEADER = 'x-voira-client-version';

/** Informational app version label for backend observability — not used for auth. */
export function getVoiraClientVersion(): string | undefined {
  const version = Constants.expoConfig?.version?.trim()
    ?? Constants.nativeAppVersion?.trim();
  if (!version) {
    return undefined;
  }

  const iosBuild = Constants.expoConfig?.ios?.buildNumber?.trim();
  const androidBuild = Constants.expoConfig?.android?.versionCode;
  const build = Platform.OS === 'ios'
    ? iosBuild
    : androidBuild != null
      ? String(androidBuild)
      : undefined;

  return build ? `${version}+${build}` : version;
}
