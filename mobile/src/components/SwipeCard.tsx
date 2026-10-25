import React, {
  PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  PanResponder,
  Text,
  useWindowDimensions,
} from 'react-native';
import { feedback, useTheme } from '../ui';

export function SwipeCard({
  children,
  onAdvance,
  onSkip,
  disabled = false,
  rest = false,
}: PropsWithChildren<{
  onAdvance: () => void;
  onSkip: () => void;
  disabled?: boolean;
  rest?: boolean;
}>) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [position] = useState(() => new Animated.ValueXY());
  const busy = useRef(false);
  const actions = useRef({ onAdvance, onSkip, disabled });
  useEffect(() => {
    actions.current = { onAdvance, onSkip, disabled };
  }, [onAdvance, onSkip, disabled]);
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
          position.setValue({ x: g.dx, y: g.dy });
          setHint(
            rest
              ? '休憩をスキップ'
              : (Math.abs(g.dx) >= Math.abs(g.dy) ? g.dx > 0 : g.dy < 0)
                ? '○ 完了'
                : '× スキップ',
          );
        },
        onPanResponderRelease: (_, g) => {
          const horizontal = Math.abs(g.dx) >= Math.abs(g.dy);
          const velocity = horizontal ? g.vx : g.vy;
          const delta = horizontal ? g.dx : g.dy;
          if (
            Math.abs(delta) < Math.min(width, height) * 0.08 &&
            Math.abs(velocity) < 0.8
          ) {
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
          feedback();
          Animated.timing(position, {
            toValue: horizontal
              ? { x: direction * width * 1.4, y: 0 }
              : { x: 0, y: direction * height },
            duration: 170,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) {
              if (advance) actions.current.onAdvance();
              else actions.current.onSkip();
            }
            position.setValue({ x: 0, y: 0 });
            busy.current = false;
            setHint(undefined);
          });
        },
        onPanResponderTerminate: () => {
          position.setValue({ x: 0, y: 0 });
          busy.current = false;
          setHint(undefined);
        },
      }),
    [height, position, rest, width],
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
      {children}
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
