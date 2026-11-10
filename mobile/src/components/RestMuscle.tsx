import React, { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { useTheme } from '../ui';
import { useReducedMotion } from '../use-reduced-motion';
import { useExerciseMotion } from '../exercise-motion';

/** A decorative loop, independent of the rest timer or any measured progress. */
export function RestMuscle({ animate }: { animate: boolean }) {
  const { isDark } = useTheme();
  const reduced = useReducedMotion();
  const motion = useExerciseMotion();
  const [growth] = useState(() => new Animated.Value(0));
  const running = animate && !reduced && (!motion || (motion.focused && motion.appState === 'active' && !motion.covered));
  useEffect(() => {
    growth.setValue(0);
    if (!running) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(growth, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(growth, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => { loop.stop(); growth.stopAnimation(); };
  }, [growth, running]);
  const outline = isDark ? '#e5aa8d' : '#a35e46';
  const fill = isDark ? '#bc8065' : '#dfa183';
  const light = isDark ? '#ffddbf' : '#fff0dc';
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ flex: 1, width: 180, maxWidth: '100%', maxHeight: 132, minHeight: 0 }}>
    <Animated.View style={{ flex: 1, transform: [
      { scaleX: growth.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) },
      { scaleY: growth.interpolate({ inputRange: [0, 1], outputRange: [1, 1.085] }) },
    ] }}>
      <Svg width="100%" height="100%" viewBox="0 0 180 132">
        <Ellipse cx={91} cy={117} rx={63} ry={5} fill={outline} opacity={0.08} />
        <Path d="M48 100 C37 99 28 90 27 79 L23 49 C22 42 25 37 32 35 L35 20 C36 15 42 15 47 18 L61 24 C65 26 67 30 65 35 L61 46 L52 48 L55 65 C67 54 80 52 92 58 C101 42 117 40 130 47 C143 54 146 68 143 82 L155 99 C132 110 106 116 82 111 Z"
          fill={fill} stroke={outline} strokeWidth={3.2} strokeLinejoin="round" />
        <Path d="M54 65Q53 84 68 91M92 58Q99 74 91 92M130 52Q142 69 131 86M32 35L50 40L61 35"
          fill="none" stroke={outline} strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        opacity: growth.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.9] }) }}>
        <Svg width="100%" height="100%" viewBox="0 0 180 132">
          <Path d="M69 72Q80 65 89 75M68 81Q80 74 88 83M105 61Q118 55 126 67"
            fill="none" stroke={light} strokeWidth={4} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </Animated.View>
  </View>;
}
