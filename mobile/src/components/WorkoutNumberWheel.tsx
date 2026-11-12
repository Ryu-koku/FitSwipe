import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, PanResponder, Platform, Text, TextInput, Vibration, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, Sheet, useTheme } from '../ui';
import { createNumberWheel, parseWheelInput, wheelValue } from '../number-wheel';
import type { WheelPosition } from '../number-wheel';
import { useReducedMotion } from '../use-reduced-motion';

function tick() {
  if (Platform.OS === 'android') {
    // Use the device's full default amplitude rather than Expo's quieter
    // heavy-impact waveform, while keeping each detent a short pulse.
    Vibration.vibrate(80);
    return;
  }
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function WorkoutNumberWheel({ label, unit, value, highlightValue, step, onChange, disabled = false }: {
  label: string;
  unit: string;
  value?: number;
  highlightValue?: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const { colors, styles } = useTheme();
  const { fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();
  const neighborHeight = Math.max(44, Math.ceil(24 * fontScale));
  const centerHeight = Math.max(56, Math.ceil(48 * fontScale));
  const rowHeight = (neighborHeight + centerHeight) / 2;
  const [preview, setPreview] = useState<number>();
  const [active, setActive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [offset] = useState(() => new Animated.Value(0));
  const [frame, setFrame] = useState<WheelPosition>({ origin: value, index: 0, offset: 0, settling: false });
  const visual = useRef({ offset: 0, index: 0 });
  const displayed = useRef(value);
  const pending = useRef<number | undefined>(undefined);
  const current = useRef({ onChange, value, disabled, neighborHeight, centerHeight, rowHeight, reduced });
  useEffect(() => {
    current.current = { onChange, value, disabled, neighborHeight, centerHeight, rowHeight, reduced };
  }, [onChange, value, disabled, neighborHeight, centerHeight, rowHeight, reduced]);
  useEffect(() => {
    const listener = offset.addListener(({ value: next }) => { visual.current.offset = next; });
    return () => offset.removeListener(listener);
  }, [offset]);
  const interaction = useMemo(() =>
    // The factory retains event callbacks; it does not read their refs here.
    // eslint-disable-next-line react-hooks/refs
    createNumberWheel({
    step, rowHeight,
    onPreview: (next) => { displayed.current = next; setPreview(next); },
    onChange: (next) => { pending.current = next; current.current.onChange(next); },
    onTick: tick,
    onActive: setActive,
    onPosition: (next) => {
      offset.stopAnimation();
      visual.current.index = next.index;
      setFrame(previous => previous.origin === next.origin && previous.index === next.index ? previous : next);
      // Keep the rows attached to the finger. Only the small remainder after
      // release is aligned; crossing a number never resets the translation.
      if (!next.settling || current.current.reduced) offset.setValue(next.offset);
      else Animated.timing(offset, { toValue: next.offset, duration: 120, useNativeDriver: false }).start();
    },
    onEdit: (initial) => { setDraft(initial === undefined ? '' : String(initial)); setEditing(true); },
  }), [step, rowHeight, offset]);
  useEffect(() => {
    if (!active && (pending.current === undefined || pending.current === value)) {
      pending.current = undefined;
      if (displayed.current !== value) interaction.reset(value);
      displayed.current = value;
      setPreview(undefined);
    }
  }, [value, active, interaction]);
  useEffect(() => {
    if (disabled) interaction.stop();
  }, [disabled, interaction]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') interaction.stop();
    });
    return () => { subscription.remove(); interaction.stop(); offset.stopAnimation(); };
  }, [interaction, offset]);
  useFocusEffect(useCallback(() => () => { interaction.stop(); setEditing(false); }, [interaction]));
  useEffect(() => { interaction.reset(displayed.current); }, [interaction]);
  const pan = useMemo(() =>
    // PanResponder stores these event callbacks; refs are read when touched.
    // eslint-disable-next-line react-hooks/refs
    PanResponder.create({
      onStartShouldSetPanResponder: () => !current.current.disabled,
      onMoveShouldSetPanResponder: () => !current.current.disabled,
      onPanResponderGrant: (event) => {
        event.stopPropagation();
        const { neighborHeight: edge, centerHeight: center, rowHeight: pitch } = current.current;
        const y = event.nativeEvent.locationY;
        offset.stopAnimation();
        const residual = visual.current.offset + visual.current.index * pitch;
        interaction.begin(displayed.current, y < edge ? -1 : y >= edge + center ? 1 : 0, residual);
      },
      onPanResponderMove: (event, gesture) => {
        event.stopPropagation();
        if (gesture.numberActiveTouches > 1) interaction.stop();
        else interaction.move(gesture.dy);
      },
      onPanResponderRelease: (event) => { event.stopPropagation(); interaction.end(); },
      onPanResponderTerminate: () => interaction.stop(),
      // A number gesture belongs to this control, including horizontal drift.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }), [interaction, offset]);
  const shown = preview ?? value;
  const numeric = shown ?? 0;
  const inputValue = parseWheelInput(draft, unit === '回');
  const invalid = !!draft.trim() && inputValue === undefined;
  const close = () => setEditing(false);
  const save = () => {
    if (inputValue === undefined) return;
    if (inputValue !== (shown ?? 0) || shown === undefined) { displayed.current = inputValue; pending.current = inputValue; setPreview(inputValue); interaction.reset(inputValue); onChange(inputValue); tick(); }
    close();
  };
  return <>
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', paddingTop: 8, paddingBottom: 6 }}>
      <Text style={[styles.small, { fontWeight: '600', textAlign: 'center' }]}>{label}</Text>
      <View
        {...pan.panHandlers}
        testID={`workout-wheel-${unit === 'kg' ? 'weight' : 'reps'}`}
        accessible accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityHint="上下に動かして変更。前後の数字を長押しで連続変更。タップで直接入力。"
        accessibilityState={{ disabled }}
        accessibilityValue={{ min: 0, now: numeric, text: shown === undefined ? '未入力' : `${shown}${unit}` }}
        accessibilityActions={[{ name: 'increment', label: `${label}を増やす` }, { name: 'decrement', label: `${label}を減らす` }, { name: 'activate', label: '直接入力' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (disabled) return;
          if (nativeEvent.actionName === 'activate') { setDraft(shown === undefined ? '' : String(shown)); setEditing(true); }
          else if (nativeEvent.actionName === 'increment' || nativeEvent.actionName === 'decrement') interaction.adjust(displayed.current, nativeEvent.actionName === 'increment' ? 1 : -1);
        }}
        style={{ width: '100%', height: neighborHeight * 2 + centerHeight, overflow: 'hidden', opacity: disabled ? 0.45 : 1, borderRadius: 12 }}
      >
        <View pointerEvents="none" style={{ position: 'absolute', top: neighborHeight, left: 8, right: 8, height: centerHeight,
          backgroundColor: active ? colors.soft : colors.bg, borderRadius: 8, borderTopWidth: 1, borderBottomWidth: 1,
          borderColor: active ? colors.primary : colors.line }} />
        {[-2, -1, 0, 1, 2].map(relative => {
          const index = frame.index + relative;
          const minimumIndex = -Math.ceil((frame.origin ?? 0) / step);
          if (index < minimumIndex - 1) return null;
          const center = -index * rowHeight;
          const rowValue = index < minimumIndex || (index === 0 && frame.origin === undefined && shown === undefined) ? '—' : wheelValue(frame.origin, index, step);
          const scale = offset.interpolate({ inputRange: [center - rowHeight, center, center + rowHeight], outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' });
          const opacity = offset.interpolate({ inputRange: [center - rowHeight * 2, center - rowHeight, center, center + rowHeight, center + rowHeight * 2], outputRange: [0.15, 0.65, 1, 0.65, 0.15], extrapolate: 'clamp' });
          return <Animated.View key={index} pointerEvents="none" testID={`workout-number-row-${index}`}
            style={{ position: 'absolute', top: neighborHeight + index * rowHeight, left: 0, right: 0, height: centerHeight,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, gap: 3,
              opacity, transform: [{ translateY: offset }, { scale }] }}>
            <Text accessible={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ color: rowValue === highlightValue || (highlightValue === undefined && active) ? colors.primary : colors.ink, fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1.5, flexShrink: 1 }}>{rowValue}</Text>
            <Animated.Text accessible={false} style={[styles.small, { marginTop: 18, opacity: offset.interpolate({ inputRange: [center - rowHeight, center, center + rowHeight], outputRange: [0, 1, 0], extrapolate: 'clamp' }) }]}>{unit}</Animated.Text>
          </Animated.View>;
        })}
      </View>
    </View>
    {editing && !disabled && <Sheet title={`${label}を入力`} popup onClose={close}>
      <Text style={styles.small}>{label}（{unit}）を入力してください。</Text>
      <TextInput accessibilityLabel={`${label}（${unit}）`} autoFocus selectTextOnFocus
        value={draft} onChangeText={setDraft} keyboardType={unit === '回' ? 'number-pad' : 'decimal-pad'}
        maxLength={12} returnKeyType="done" onSubmitEditing={save}
        style={[styles.field, { fontSize: 28, textAlign: 'center', marginTop: 12 }]} />
      {invalid && <Text accessibilityRole="alert" style={[styles.small, { color: colors.red }]}>{unit === '回' ? '0以上の整数を入力してください。' : '0以上、小数2桁までで入力してください。'}</Text>}
      <Button label="決定" disabled={inputValue === undefined} onPress={save} />
      <Button label="取消" secondary onPress={close} />
    </Sheet>}
  </>;
}
