import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  PanResponder,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { feedback, useTheme } from '../ui';
import { AppIcon } from './AppIcon';
import { useReducedMotion } from '../use-reduced-motion';

const SwipeFeedback = createContext<Animated.Value | null>(null);

export function SwipeCard({
  children,
  onAdvance,
  onSkip,
  onSwipeStart,
  disabled = false,
  rest = false,
}: PropsWithChildren<{
  onAdvance: () => void;
  onSkip: () => void;
  onSwipeStart?: (advance: boolean) => void;
  disabled?: boolean;
  rest?: boolean;
}>) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [position] = useState(() => new Animated.ValueXY());
  const [actionProgress] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  const busy = useRef(false);
  const actions = useRef({ onAdvance, onSkip, onSwipeStart, disabled });
  useEffect(() => {
    actions.current = { onAdvance, onSkip, onSwipeStart, disabled };
  }, [onAdvance, onSkip, onSwipeStart, disabled]);
  const [hint, setHint] = useState<string>();
  const pan = useMemo(
    () =>
      // PanResponder only stores event callbacks; no ref is read during render.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !actions.current.disabled &&
          !busy.current &&
          Math.hypot(g.dx, g.dy) > 12,
        onPanResponderMove: (_, g) => {
          if (busy.current || actions.current.disabled) return;
          position.setValue({ x: g.dx, y: g.dy });
          const distance = Math.abs(g.dx) >= Math.abs(g.dy) ? g.dx : -g.dy;
          actionProgress.setValue(Math.max(-1, Math.min(1, distance / (Math.min(width, height) * 0.08))));
          if (rest) setHint('休憩をスキップ');
        },
        onPanResponderRelease: (_, g) => {
          if (busy.current || actions.current.disabled) return;
          const horizontal = Math.abs(g.dx) >= Math.abs(g.dy);
          const velocity = horizontal ? g.vx : g.vy;
          const delta = horizontal ? g.dx : g.dy;
          if (
            Math.abs(delta) < Math.min(width, height) * 0.08 &&
            Math.abs(velocity) < 0.8
          ) {
            Animated.timing(actionProgress, { toValue: 0, duration: reduced ? 0 : 120, useNativeDriver: false }).start();
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
            }).start();
            setHint(undefined);
            return;
          }
          busy.current = true;
          const direction =
            Math.abs(delta) < 10 ? Math.sign(velocity) : Math.sign(delta);
          const advance = rest || (horizontal ? direction > 0 : direction < 0);
          actionProgress.setValue(advance ? 1 : -1);
          feedback();
          actions.current.onSwipeStart?.(advance);
          Animated.timing(position, {
            toValue: horizontal
              ? { x: direction * width * 1.4, y: 0 }
              : { x: 0, y: direction * height },
            duration: reduced ? 0 : 170,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) {
              if (advance) actions.current.onAdvance();
              else actions.current.onSkip();
            }
            position.setValue({ x: 0, y: 0 });
            actionProgress.setValue(0);
            busy.current = false;
            setHint(undefined);
          });
        },
        onPanResponderTerminate: () => {
          actionProgress.stopAnimation();
          actionProgress.setValue(0);
          position.setValue({ x: 0, y: 0 });
          busy.current = false;
          setHint(undefined);
        },
      }),
    [actionProgress, height, position, reduced, rest, width],
  );
  return (
    <Animated.View
      {...pan.panHandlers}
      style={{
        flex: 1,
        transform: [
          ...position.getTranslateTransform(),
          {
            rotate: position.x.interpolate({
              inputRange: [-width, 0, width],
              outputRange: ['-12deg', '0deg', '12deg'],
            }),
          },
        ],
      }}
    >
      <SwipeFeedback.Provider value={actionProgress}>{children}</SwipeFeedback.Provider>
      {hint && (
        <Text
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 90,
            alignSelf: 'center',
            color: hint.startsWith('×') ? colors.orange : colors.primary,
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 12,
            fontSize: 24,
            fontWeight: '800',
          }}
        >
          {hint}
        </Text>
      )}
    </Animated.View>
  );
}


export function SwipeActions({ reviewing = false, onAdvance, onSkip }: {
  reviewing?: boolean;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const progress = useContext(SwipeFeedback);
  const { colors, styles } = useTheme();
  const reduced = useReducedMotion();
  if (!progress) return null;
  return <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line,
    marginHorizontal: 16, paddingTop: 12, paddingBottom: 12, justifyContent: 'space-around' }}>
    {(['skip', 'complete'] as const).filter((action) => !reviewing || action === 'complete').map((action) => {
      const complete = action === 'complete';
      const color = complete ? colors.primary : colors.orange;
      const active = progress.interpolate({ inputRange: complete ? [0, 1] : [-1, 0], outputRange: complete ? [0, 1] : [1, 0], extrapolate: 'clamp' });
      const label = complete ? reviewing ? '次のカードへ' : 'セット完了' : 'スキップ';
      return <View key={action} accessible accessibilityLabel={label}
        accessibilityActions={[{ name: 'activate', label }]}
        onAccessibilityAction={({ nativeEvent }) => { if (nativeEvent.actionName === 'activate') (complete ? onAdvance : onSkip)(); }}
        style={{ minWidth: 96, alignItems: 'center', gap: 10 }}>
        <Animated.View testID={`swipe-${action}`} style={{ width: 48, height: 48, borderRadius: 24,
          borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
          borderColor: active.interpolate({ inputRange: [0, 1], outputRange: [colors.muted, color] }),
          backgroundColor: active.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, color] }),
          transform: [{ scale: reduced ? 1 : active.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}>
          <AppIcon name={complete ? 'check' : 'skip'} color={colors.muted} size={26} />
          <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: active }}>
            <AppIcon name={complete ? 'check' : 'skip'} color={colors.surface} size={26} />
          </Animated.View>
        </Animated.View>
        <Animated.Text style={[styles.small, { fontWeight: '700', color: active.interpolate({ inputRange: [0, 1], outputRange: [colors.muted, color] }) }]}>{label}</Animated.Text>
      </View>;
    })}
  </View>;
}
