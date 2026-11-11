import React, { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { AppIcon } from './AppIcon';
import { useReducedMotion } from '../use-reduced-motion';
import { useExerciseMotion } from '../exercise-motion';

export function StreakFlame({ color, animate }: { color: string; animate: boolean }) {
  const reduced = useReducedMotion();
  const motion = useExerciseMotion();
  const [flicker] = useState(() => new Animated.Value(0));
  const running = animate && !reduced && (!motion || (motion.focused && motion.appState === 'active' && !motion.covered));
  useEffect(() => {
    flicker.setValue(0);
    if (!running) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(flicker, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(flicker, { toValue: 0.3, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(flicker, { toValue: 0.8, duration: 450, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(flicker, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => { loop.stop(); flicker.stopAnimation(); };
  }, [flicker, running]);
  return <Animated.View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: 20, height: 20, opacity: flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }),
      transform: [
        { scaleX: flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
        { scaleY: flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }) },
        { rotate: flicker.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] }) },
      ] }}>
    <AppIcon name="flame" size={20} color={color} />
  </Animated.View>;
}
