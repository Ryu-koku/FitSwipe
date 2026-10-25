import React, { useMemo, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { feedback, useTheme } from '../ui';

export function ExerciseManagementItem({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors, styles } = useTheme();
  const [offset] = useState(() => new Animated.Value(0));
  const [revealed, setRevealed] = useState(false);
  const settle = (open: boolean) => {
    setRevealed(open);
    Animated.spring(offset, {
      toValue: open ? 92 : 0,
      useNativeDriver: true,
    }).start();
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) =>
          offset.setValue(
            Math.max(0, Math.min(92, (revealed ? 92 : 0) + g.dx)),
          ),
        onPanResponderRelease: (_, g) => {
          const open = (revealed ? 92 : 0) + g.dx >= 92 * 0.42;
          setRevealed(open);
          Animated.spring(offset, {
            toValue: open ? 92 : 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(offset, {
            toValue: revealed ? 92 : 0,
            useNativeDriver: true,
          }).start(),
      }),
    [offset, revealed],
  );
  return (
    <View
      style={{
        height: 62,
        borderRadius: 20,
        backgroundColor: colors.red,
        overflow: 'hidden',
        marginTop: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}を削除`}
        accessibilityElementsHidden={!revealed}
        importantForAccessibility={revealed ? 'auto' : 'no-hide-descendants'}
        onPress={() => {
          feedback();
          onDelete();
        }}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 92,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.bg, fontWeight: '800' }}>削除</Text>
      </Pressable>
      <Animated.View
        {...pan.panHandlers}
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.line,
          transform: [{ translateX: offset }],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}を編集`}
          onPress={() => {
            feedback();
            if (revealed) settle(false);
            else onEdit();
          }}
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 18 }}
        >
          <Text style={[styles.body, { fontWeight: '600' }]}>{name}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
