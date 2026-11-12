import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { feedback, useTheme } from '../ui';
import { useReducedMotion } from '../use-reduced-motion';

const WIDTH = 92;

// Shared by the exercise catalogue and preset rows. Never claim vertical scrolling
// or touches at grant time: the nested reorder handle owns its own responder.
export function SwipeDeleteRow({ name, open, onOpenChange, onDelete, children }: {
  name: string; open: boolean; onOpenChange: (open: boolean) => void;
  onDelete: () => void; children: (closeOnTap: () => boolean) => ReactNode;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [offset] = useState(() => new Animated.Value(0));
  const latest = useRef({ open, onOpenChange });
  useEffect(() => { latest.current = { open, onOpenChange }; }, [open, onOpenChange]);
  const gesturing = useRef(false);
  const origin = useRef(0);
  const settle = (revealed: boolean) => {
    offset.stopAnimation();
    Animated.spring(offset, { toValue: revealed ? -WIDTH : 0, useNativeDriver: true,
      overshootClamping: true,
    }).start();
    if (reduced) offset.setValue(revealed ? -WIDTH : 0);
  };
  useEffect(() => {
    if (gesturing.current) return;
    if (reduced) { offset.stopAnimation(); offset.setValue(open ? -WIDTH : 0); }
    else Animated.spring(offset, { toValue: open ? -WIDTH : 0, useNativeDriver: true, overshootClamping: true }).start();
    return () => offset.stopAnimation();
  }, [offset, open, reduced]);
  const [pan, setPan] = useState<ReturnType<typeof PanResponder.create> | null>(null);
  useEffect(() => {
    const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && (latest.current.open || g.dx < 0),
    onPanResponderGrant: () => {
      gesturing.current = true;
      offset.stopAnimation();
      origin.current = latest.current.open ? -WIDTH : 0;
      latest.current.onOpenChange(true);
    },
    onPanResponderMove: (_, g) => offset.setValue(Math.max(-WIDTH, Math.min(0, origin.current + g.dx))),
    onPanResponderRelease: (_, g) => {
      gesturing.current = false;
      const revealed = origin.current + g.dx < -WIDTH * 0.42;
      latest.current.onOpenChange(revealed);
      settle(revealed);
    },
    onPanResponderTerminate: () => { gesturing.current = false; latest.current.onOpenChange(false); settle(false); },
    });
    const timer = setTimeout(() => setPan(responder), 0);
    return () => clearTimeout(timer);
  // settle only depends on the stable animation value and the motion preference.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, reduced]);
  const translateX = offset.interpolate({
    inputRange: [-WIDTH, 0], outputRange: [-WIDTH, 0], extrapolate: 'clamp',
  });
  const deleteOpacity = offset.interpolate({
    inputRange: [-WIDTH, 0], outputRange: [1, 0], extrapolate: 'clamp',
  });
  return <View style={{ borderRadius: 20, overflow: 'hidden' }}>
    <Animated.View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: WIDTH,
      backgroundColor: colors.red, opacity: deleteOpacity }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}を削除`}
      accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      disabled={!open} onPress={() => { feedback(); onOpenChange(false); onDelete(); }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.bg, fontWeight: '800' }}>削除</Text>
    </Pressable>
    </Animated.View>
    <Animated.View {...pan?.panHandlers} style={{ transform: [{ translateX }] }}>
      {children(() => { if (!open) return false; onOpenChange(false); return true; })}
    </Animated.View>
  </View>;
}
