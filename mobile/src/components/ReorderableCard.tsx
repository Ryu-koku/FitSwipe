import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Text,
  type LayoutChangeEvent,
} from 'react-native';
import { feedback, useTheme } from '../ui';

const LONG_PRESS_DELAY_MS = 260;

export function ReorderableCard({
  label,
  rowHeight,
  onMove,
  children,
}: {
  label: string;
  rowHeight: number;
  onMove: (offset: number) => void;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { colors } = useTheme();
  const [translateY] = useState(() => new Animated.Value(0));
  const [measuredHeight, setMeasuredHeight] = useState(rowHeight);
  const [isDragging, setIsDragging] = useState(false);
  const [pan, setPan] = useState<ReturnType<typeof PanResponder.create> | null>(null);
  const onMoveRef = useRef(onMove);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    let latestDy = 0;
    let dragOriginDy = 0;
    let dragActive = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    const clearHoldTimer = () => {
      if (holdTimer !== null) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    };
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        clearHoldTimer();
        translateY.stopAnimation();
        translateY.setValue(0);
        setIsDragging(false);
        latestDy = 0;
        dragActive = false;
        holdTimer = setTimeout(() => {
          dragOriginDy = latestDy;
          dragActive = true;
          setIsDragging(true);
          feedback();
        }, LONG_PRESS_DELAY_MS);
      },
      onPanResponderMove: (_, gesture) => {
        latestDy = gesture.dy;
        if (dragActive) {
          translateY.setValue(gesture.dy - dragOriginDy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        clearHoldTimer();
        if (dragActive) {
          const distance = gesture.dy - dragOriginDy;
          if (Math.abs(distance) >= 20) {
            const rows = Math.max(1, Math.round(Math.abs(distance) / measuredHeight));
            onMoveRef.current(Math.sign(distance) * rows);
            feedback();
          }
        }
        dragActive = false;
        Animated.spring(translateY, {
          toValue: 0,
          stiffness: 300,
          damping: 26,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) setIsDragging(false);
        });
      },
      onPanResponderTerminate: () => {
        clearHoldTimer();
        dragActive = false;
        Animated.spring(translateY, {
          toValue: 0,
          stiffness: 300,
          damping: 26,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) setIsDragging(false);
        });
      },
      onPanResponderTerminationRequest: () => !dragActive,
    });
    const installResponder = setTimeout(() => setPan(responder), 0);
    return () => {
      clearTimeout(installResponder);
      clearHoldTimer();
    };
  }, [measuredHeight, translateY]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0 && nextHeight !== measuredHeight) {
      setMeasuredHeight(nextHeight);
    }
  };

  const handle = (
    <Animated.View
      {...pan?.panHandlers}
      accessibilityLabel={`${label}を長押ししてドラッグし、並べ替え`}
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
        minWidth: 44,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 24, color: colors.primary }}>≡</Text>
    </Animated.View>
  );

  return (
    <Animated.View
      onLayout={handleLayout}
      style={{
        zIndex: isDragging ? 10 : 0,
        elevation: isDragging ? 8 : 0,
        transform: [{ translateY }],
      }}
    >
      {children(handle)}
    </Animated.View>
  );
}
