import type { PurchasesPackage, PurchasesStoreProduct } from 'react-native-purchases';
import type { AppState, Room } from './types';

export const FREE_PRESET_LIMIT = 3;
export const FREE_CUSTOM_EXERCISE_LIMIT = 3;
export const FREE_OWNED_ROOM_LIMIT = 2;

export function canAddPreset(state: Pick<AppState, 'presets'>, premium: boolean) {
  return premium || state.presets.length < FREE_PRESET_LIMIT;
}
export function canAddCustomExercise(state: Pick<AppState, 'exercises'>, premium: boolean) {
  return premium || state.exercises.filter(e => e.custom === true && !e.archived).length < FREE_CUSTOM_EXERCISE_LIMIT;
}
export function canCreateRoom(rooms: Pick<Room, 'ownerId'>[], identityId: string, premium: boolean) {
  return premium || rooms.filter(room => room.ownerId === identityId).length < FREE_OWNED_ROOM_LIMIT;
}

export type FreeTrial = { label: string; headline: string };

/** Only advertise the offer used by purchasePackage; never replace a selected paid option. */
export function freeTrialForProduct(product: PurchasesStoreProduct | undefined, platform: string): FreeTrial | undefined {
  if (!product) return;
  let period: string | undefined;
  let cycles = 1;
  if (platform === 'android') {
    const option = product.defaultOption ?? product.subscriptionOptions?.find(option => option.freePhase);
    const phase = option?.freePhase;
    period = phase?.billingPeriod.iso8601;
    cycles = phase?.billingCycleCount ?? 1;
  } else if (platform === 'ios' && product.introPrice?.price === 0) {
    period = product.introPrice.period;
    cycles = product.introPrice.cycles;
  }
  const match = period?.match(/^P([1-9]\d*)([DWMY])$/);
  if (!match || !Number.isSafeInteger(cycles) || cycles < 1) return;
  const count = Number(match[1]) * cycles;
  if (!Number.isSafeInteger(count)) return;
  const unit = { D: '日間', W: '週間', M: 'か月', Y: '年間' }[match[2]];
  if (!unit) return;
  const label = `${count}${unit}`;
  return { label, headline: match[2] === 'M' && count === 1 ? '初月無料' : `${label}無料` };
}

export type PremiumPlan = 'monthly' | 'lifetime';
export type PremiumPackages = { monthly?: PurchasesPackage; lifetime?: PurchasesPackage };

/** Read only the current offering's standard packages. */
export function packagesForOffering(offering?: { monthly?: PurchasesPackage | null; lifetime?: PurchasesPackage | null } | null): PremiumPackages {
  return { monthly: offering?.monthly ?? undefined, lifetime: offering?.lifetime ?? undefined };
}
export function defaultPremiumPlan(packages: PremiumPackages): PremiumPlan {
  return !packages.monthly && packages.lifetime ? 'lifetime' : 'monthly';
}
export function packageForPlan(packages: PremiumPackages, plan: PremiumPlan) {
  return packages[plan];
}
export function visiblePremiumPlans(packages: PremiumPackages, available: boolean): PremiumPlan[] {
  return available && packages.lifetime ? ['monthly', 'lifetime'] : ['monthly'];
}
