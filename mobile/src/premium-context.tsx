import React, { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState as NativeAppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomerInfo } from 'react-native-purchases';
import { useApp } from './context';
import { hasPremium, initializePurchases, premiumPackages, premiumOverride, purchasePremium, purchaseUnavailableReason, restorePurchases, subscribePurchases } from './purchases';
import { defaultPremiumPlan, packageForPlan, visiblePremiumPlans, freeTrialForProduct, type FreeTrial, type PremiumPackages, type PremiumPlan } from './premium';
import { Paywall } from './components/Paywall';

type PremiumValue = {
  premium: boolean;
  busy: boolean;
  price: string;
  monthlyPrice: string;
  lifetimePrice: string;
  plan: PremiumPlan;
  plans: PremiumPlan[];
  setPlan: (plan: PremiumPlan) => void;
  freeTrial?: FreeTrial;
  unavailableReason?: string;
  error?: string;
  openPaywall: (reason?: string) => void;
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
};
const Context = createContext<PremiumValue | null>(null);
export function PremiumProvider({ children }: PropsWithChildren) {
  const { state, ready } = useApp();
  const identityId = state.roomIdentity?.id;
  const [snapshot, setSnapshot] = useState<{ identityId?: string; premium: boolean }>({ premium: false });
  const [packages, setPackages] = useState<PremiumPackages>({});
  const [plan, setPlan] = useState<PremiumPlan>('monthly');
  const [initializedFor, setInitializedFor] = useState<{ identityId?: string }>();
  const initialized = !!initializedFor && initializedFor.identityId === identityId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [paywall, setPaywall] = useState<{ reason?: string }>();
  const serial = useRef(Promise.resolve());
  const epoch = useRef(0);
  const purchasing = useRef(false);
  const accept = useRef<(info: CustomerInfo) => void>(() => {});
  useEffect(() => {
    if (!ready) return;
    const generation = ++epoch.current;
    let disposed = false;
    let unsubscribe = () => {};
    const key = `fitswipe-premium:${identityId ?? 'anonymous'}`;
    const apply = (info: CustomerInfo) => {
      if (disposed || generation !== epoch.current) return;
      const premium = hasPremium(info);
      setSnapshot({ identityId, premium });
      void AsyncStorage.setItem(key, JSON.stringify(premium)).catch(() => {});
    };
    accept.current = apply;
    const refresh = async () => {
      try {
        const info = await initializePurchases(identityId);
        if (disposed) return;
        if (info) apply(info);
        setInitializedFor({ identityId });
        unsubscribe(); unsubscribe = subscribePurchases(apply);
        const next = await premiumPackages();
        if (!disposed) {
          setPackages(next);
          setPlan(current => packageForPlan(next, current) ? current : defaultPremiumPlan(next));
        }
      } catch {
        if (!disposed) setError('購入状態を確認できませんでした。通信状況を確認して再試行してください。');
      }
    };
    serial.current = serial.current.catch(() => {}).then(async () => {
      if (disposed) return;
      setInitializedFor(undefined); setPackages({}); setPlan('monthly'); setError(undefined);
      const cached = await AsyncStorage.getItem(key).catch(() => null);
      if (disposed) return;
      setSnapshot({ identityId, premium: cached === 'true' });
      await refresh();
    });
    const subscription = NativeAppState.addEventListener('change', value => {
      if (value === 'active') serial.current = serial.current.catch(() => {}).then(async () => { if (!disposed) await refresh(); });
    });
    return () => { disposed = true; unsubscribe(); subscription.remove(); };
  }, [identityId, ready]);
  const run = async (operation: () => Promise<CustomerInfo>) => {
    if (purchasing.current) return;
    purchasing.current = true;
    const generation = epoch.current;
    setBusy(true); setError(undefined);
    try {
      // Serialize store operations with account changes so a purchase cannot
      // complete against a different RevenueCat user midway through login.
      const work = serial.current.catch(() => {}).then(async () => {
        if (generation !== epoch.current) throw new Error('アカウントが変更されました。再試行してください。');
        return operation();
      });
      serial.current = work.then(() => {}, () => {});
      const info = await work;
      if (generation === epoch.current) accept.current(info);
    } catch (e) {
      if (generation === epoch.current && !(e && typeof e === 'object' && 'userCancelled' in e && e.userCancelled)) {
        setError(e instanceof Error ? e.message : '購入処理に失敗しました。もう一度お試しください。');
      }
    } finally { purchasing.current = false; setBusy(false); }
  };
  const item = initialized ? packageForPlan(packages, plan) : undefined;
  const monthlyPrice = (initialized ? packages.monthly?.product.priceString : undefined) ?? '月額300円';
  const lifetimePrice = (initialized ? packages.lifetime?.product.priceString : undefined) ?? '3,000円';
  const value: PremiumValue = {
    premium: premiumOverride || (snapshot.identityId === identityId && snapshot.premium),
    busy,
    freeTrial: plan === 'monthly' && initialized && !purchaseUnavailableReason && !premiumOverride ? freeTrialForProduct(item?.product, Platform.OS) : undefined,
    price: plan === 'monthly' ? monthlyPrice : lifetimePrice,
    monthlyPrice, lifetimePrice, plan, setPlan,
    plans: visiblePremiumPlans(packages, initialized && !purchaseUnavailableReason),
    unavailableReason: purchaseUnavailableReason ?? (!initialized ? '購入状態を確認中です。' : !item ? 'このプランは準備中です。' : undefined),
    error,
    openPaywall: reason => { setError(undefined); setPaywall({ reason }); },
    purchase: () => run(async () => {
      await initializePurchases(identityId);
      if (!item) throw new Error('このプランは準備中です。');
      return purchasePremium(item);
    }),
    restore: () => run(async () => { await initializePurchases(identityId); return restorePurchases(); }),
  };
  return <Context.Provider value={value}>{children}{paywall && <Paywall reason={paywall.reason} onClose={() => setPaywall(undefined)} />}</Context.Provider>;
}
export function usePremium() {
  const value = useContext(Context);
  if (!value) throw new Error('PremiumProvider is missing');
  return value;
}
