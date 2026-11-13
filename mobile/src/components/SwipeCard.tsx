import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { feedback, useTheme } from '../ui';
import { AppIcon } from './AppIcon';
import { useReducedMotion } from '../use-reduced-motion';

const SwipeFeedback = createContext<{
  progress: Animated.Value;
  runAction: (action: () => void) => void;
} | null>(null);

export function SwipeCard({
  children,
  onAdvance,
  onSkip,
  behind = false,
  progress,
  disabled = false,
  rest = false,
  isGestureBlocked,
}: PropsWithChildren<{
  onAdvance: () => void;
  onSkip: () => void;
  behind?: boolean;
  progress?: Animated.Value;
  disabled?: boolean;
  rest?: boolean;
  isGestureBlocked?: () => boolean;
}>) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [position] = useState(() => new Animated.ValueXY());
  const [localProgress] = useState(() => new Animated.Value(0));
  const [actionProgress] = useState(() => new Animated.Value(0));
  const revealProgress = progress ?? localProgress;
  const reduced = useReducedMotion();
  const busy = useRef(false);
  const actions = useRef({ onAdvance, onSkip, disabled, isGestureBlocked });
  useEffect(() => {
    actions.current = { onAdvance, onSkip, disabled, isGestureBlocked };
  }, [onAdvance, onSkip, disabled, isGestureBlocked]);
  useEffect(() => () => {
    position.stopAnimation();
    actionProgress.stopAnimation();
    if (!progress) revealProgress.stopAnimation();
  }, [position, actionProgress, revealProgress, progress]);
  useLayoutEffect(() => {
    if (!behind) {
      actionProgress.setValue(0);
      revealProgress.setValue(0);
      position.setValue({ x: 0, y: 0 });
      busy.current = false;
    }
  }, [behind, actionProgress, revealProgress, position]);
  const runAction = (action: () => void) => {
    if (!busy.current && !actions.current.disabled) action();
  };
  const [hint, setHint] = useState<string>();
  const pan = useMemo(
    () =>
      // PanResponder only stores event callbacks; no ref is read during render.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !actions.current.disabled &&
          !actions.current.isGestureBlocked?.() &&
          !busy.current &&
          Math.hypot(g.dx, g.dy) > 12,
        onPanResponderMove: (_, g) => {
          if (busy.current || actions.current.disabled) return;
          if (!reduced) position.setValue({ x: g.dx, y: g.dy });
          const distance = Math.max(Math.abs(g.dx), Math.abs(g.dy));
          actionProgress.setValue(Math.max(-1, Math.min(1, distance / (Math.min(width, height) * 0.08))));
          revealProgress.setValue(Math.min(1, distance / width));
          setHint(rest ? '休憩をスキップ' : undefined);
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
            Animated.timing(revealProgress, { toValue: 0, duration: reduced ? 0 : 120, useNativeDriver: false }).start();
            Animated.timing(actionProgress, { toValue: 0, duration: reduced ? 0 : 120, useNativeDriver: false }).start();
            Animated.timing(position, {
              duration: reduced ? 0 : 120,
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
            }).start();
            setHint(undefined);
            return;
          }
          busy.current = true;
          const direction =
            Math.abs(delta) < 10 ? Math.sign(velocity) : Math.sign(delta);
          actionProgress.setValue(1);
          Animated.timing(revealProgress, { toValue: 1, duration: reduced ? 0 : 170, useNativeDriver: false }).start();
          feedback();

          Animated.timing(position, {
            toValue: horizontal
              ? { x: direction * width * 1.4, y: 0 }
              : { x: 0, y: direction * height },
            duration: reduced ? 0 : 170,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) {
              actions.current.onAdvance();
              // Leave the outgoing card offscreen until the mounted back card is promoted.
              return;
            }
            position.setValue({ x: 0, y: 0 });
            actionProgress.setValue(0);
            revealProgress.stopAnimation();
            revealProgress.setValue(0);
            busy.current = false;
            setHint(undefined);
          });
        },
        onPanResponderTerminate: () => {
          revealProgress.stopAnimation();
          actionProgress.stopAnimation();
          actionProgress.setValue(0);
          revealProgress.setValue(0);
          position.setValue({ x: 0, y: 0 });
          busy.current = false;
          setHint(undefined);
        },
      }),
    [actionProgress, revealProgress, height, position, reduced, rest, width],
  );
  return (
    <Animated.View
      {...(behind ? {} : pan.panHandlers)}
      pointerEvents={behind ? "none" : "auto"}
      accessibilityElementsHidden={behind}
      importantForAccessibility={behind ? "no-hide-descendants" : "auto"}
      style={{
        flex: 1,
        ...(progress ? { position: 'absolute' as const, inset: 0, zIndex: behind ? 0 : 1 } : {}),
        opacity: behind && !reduced ? revealProgress.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) : 1,
        transform: behind ? [{ scale: reduced ? 1 : revealProgress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] : reduced ? [] : [
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
      <SwipeFeedback.Provider value={{ progress: actionProgress, runAction }}>{children}</SwipeFeedback.Provider>
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


export function SwipeActions({ reviewing = false, onAdvance, onSkip, onBack, onEdit, canGoBack }: {
  onBack: () => void;
  onEdit: () => void;
  canGoBack: boolean;
  reviewing?: boolean;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const swipe = useContext(SwipeFeedback);
  const { colors, styles } = useTheme();
  const reduced = useReducedMotion();
  if (!swipe) return null;
  const { runAction } = swipe;
  const inactive = new Animated.Value(0);
  return <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingBottom: 8, justifyContent: 'space-between' }}>
    {(['back', 'skip', 'complete', 'edit'] as const).map((action) => {
      const complete = action === 'complete';
      const skip = action === 'skip';
      const disabled = action === 'back' && !canGoBack;
      const color = skip ? colors.orange : colors.primary;
      const active = inactive;
      const label = complete ? reviewing ? '次のカードへ' : 'セット完了' : skip ? 'スキップ' : action === 'back' ? '戻る' : '編集';
      const accessibilityLabel = action === 'back' ? '前のカードへ' : action === 'edit' ? '種目を編集' : label;
      const icon = complete ? 'check' : skip ? 'skip' : action === 'back' ? 'undo' : 'edit';
      const onPress = complete ? onAdvance : skip ? onSkip : action === 'back' ? onBack : onEdit;
      return <Pressable key={action} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
        disabled={disabled} accessibilityState={{ disabled }}
        onPress={() => runAction(() => { feedback(); onPress(); })}
        style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 })}>
        <Animated.View testID={`swipe-${action}`} style={{ width: 34, height: 34, borderRadius: 17,
          borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
          borderColor: active.interpolate({ inputRange: [0, 1], outputRange: [colors.muted, color] }),
          backgroundColor: active.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, color] }),
          transform: [{ scale: reduced ? 1 : active.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}>
          <AppIcon name={icon} color={colors.muted} size={20} />
          <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: active }}>
            <AppIcon name={icon} color={colors.surface} size={20} />
          </Animated.View>
        </Animated.View>
        <Animated.Text style={[styles.small, { fontWeight: '700', color: active.interpolate({ inputRange: [0, 1], outputRange: [colors.muted, color] }) }]}>{label}</Animated.Text>
      </Pressable>;
    })}
  </View>;
}
