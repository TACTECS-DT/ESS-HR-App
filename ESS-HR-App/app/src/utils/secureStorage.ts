/**
 * Secure token storage using React Native Keychain.
 * Tokens are stored in the device Keychain (iOS) / Keystore (Android).
 */
import * as Keychain from 'react-native-keychain';

const SERVICE = 'ess_hr_app';

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await Keychain.setGenericPassword(accessToken, refreshToken, {
    service: SERVICE,
  });
}

export async function getTokens(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const result = await Keychain.getGenericPassword({service: SERVICE});
  if (!result) {
    return null;
  }
  return {
    accessToken: result.username,
    refreshToken: result.password,
  };
}

export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({service: SERVICE});
}
