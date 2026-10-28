import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useMotionPreference() {
  // Do not animate until the accessibility preference has been read.
  const [reduced, setReduced] = useState<boolean>();
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduced(value); }).catch(() => { if (mounted) setReduced(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduced;
}

export function useReducedMotion() {
  return useMotionPreference() ?? true;
}
