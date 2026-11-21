import Constants from 'expo-constants';

const extra = (Constants as any)?.expoConfig?.extra || (Constants as any)?.manifest?.extra || {};

export const PRIVACY_POLICY_URL: string =
  extra.privacyPolicyUrl || 'https://solvacube.app/privacy-policy.html';
