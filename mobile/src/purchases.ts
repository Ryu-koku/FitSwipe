import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

export const premiumOverride = __DEV__ && process.env.EXPO_PUBLIC_PREMIUM_OVERRIDE === '1';
const apiKey = Platform.OS === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
export const purchaseUnavailableReason = Platform.OS === 'web' ? 'Webでの購入は準備中です。'
  : Constants.appOwnership === 'expo' ? '購入にはストア版アプリが必要です。'
  : Constants.expoConfig?.android?.package?.endsWith('.expodev') || Constants.expoConfig?.ios?.bundleIdentifier?.endsWith('.expodev')
    ? '開発版では購入できません。' : !apiKey ? 'ストアでの購入は準備中です。' : undefined;
let sdk: typeof import('react-native-purchases').default | undefined;
let currentUser: string | undefined;
export const hasPremium = (info: CustomerInfo) => !!info.entitlements.active.premium;

export async function initializePurchases(identityId?: string) {
  if (purchaseUnavailableReason) return;
  if (!sdk) {
    sdk = (await import('react-native-purchases')).default;
    sdk.configure({ apiKey: apiKey!, appUserID: identityId });
    currentUser = identityId;
  } else if (currentUser !== identityId) {
    if (identityId) await sdk.logIn(identityId);
    else await sdk.logOut();
    currentUser = identityId;
  }
  return sdk.getCustomerInfo();
}
export function subscribePurchases(listener: (info: CustomerInfo) => void) {
  sdk?.addCustomerInfoUpdateListener(listener);
  return () => { sdk?.removeCustomerInfoUpdateListener(listener); };
}
export async function monthlyPackage(): Promise<PurchasesPackage | undefined> {
  return (await sdk?.getOfferings())?.current?.monthly ?? undefined;
}
export async function purchasePremium(item: PurchasesPackage) {
  if (!sdk || purchaseUnavailableReason) throw new Error(purchaseUnavailableReason ?? '購入は準備中です。');
  return (await sdk.purchasePackage(item)).customerInfo;
}
export async function restorePurchases() {
  if (!sdk || purchaseUnavailableReason) throw new Error(purchaseUnavailableReason ?? '購入は準備中です。');
  return sdk.restorePurchases();
}
