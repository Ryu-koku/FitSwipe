import React, { useMemo, useState } from 'react';
import { Animated, PanResponder, Text } from 'react-native';
import { feedback, useTheme } from '../ui';

export function ReorderHandle({
  label,
  onMove,
  rowHeight,
}: {
  label: string;
  onMove: (offset: number) => void;
  rowHeight: number;
}) {
  const { colors } = useTheme();
  const [y] = useState(() => new Animated.Value(0));
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: feedback,
        onPanResponderMove: (_, g) => y.setValue(g.dy),
        onPanResponderRelease: (_, g) => {
          y.setValue(0);
          if (Math.abs(g.dy) >= 20) {
            onMove(
              Math.sign(g.dy) *
                Math.max(1, Math.round(Math.abs(g.dy) / rowHeight)),
            );
            feedback();
          }
        },
        onPanResponderTerminate: () => y.setValue(0),
      }),
    [onMove, rowHeight, y],
  );
  return (
    <Animated.View
      {...pan.panHandlers}
      accessibilityLabel={`${label}をドラッグして並べ替え`}
      accessibilityRole="adjustable"
      accessibilityActions={[
        { name: 'increment', label: '下へ' },
        { name: 'decrement', label: '上へ' },
      ]}
      onAccessibilityAction={(event) =>
        onMove(event.nativeEvent.actionName === 'increment' ? 1 : -1)
      }
      style={{
        minHeight: 44,
        minWidth: 36,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateY: y }],
      }}
    >
      <Text style={{ fontSize: 24, color: colors.primary }}>≡</Text>
    </Animated.View>
  );
}
