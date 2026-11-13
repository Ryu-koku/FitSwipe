import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, FlatList, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Button, feedback, Sheet, useTheme } from '../ui';
import { parseWheelInput, numberWheelWindow, WHEEL_HOLD_DELAY, WHEEL_REPEAT_DELAY } from '../number-wheel';
import { roundWeight } from '../logic';
import { useReducedMotion } from '../use-reduced-motion';

const tick = feedback;

type WheelItem = { value: number; empty: boolean };
const rowKey = (_: WheelItem, index: number) => String(index);
const NumberWheelRow = memo(function NumberWheelRow({ value, empty, index, rowHeight, offset, highlightValue, unit, disabled, onTap, onHold, onRelease }: {
  value: number; empty: boolean; index: number; rowHeight: number; offset: Animated.Value; highlightValue?: number; unit: string; disabled: boolean;
  onTap: (index: number) => void; onHold: (index: number) => void; onRelease: () => void;
}) {
  const { colors, styles } = useTheme();
  const center = index * rowHeight;
  const scale = offset.interpolate({ inputRange: [center - rowHeight, center, center + rowHeight], outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' });
  const opacity = offset.interpolate({ inputRange: [center - rowHeight * 2, center - rowHeight, center, center + rowHeight, center + rowHeight * 2], outputRange: [0.15, 0.65, 1, 0.65, 0.15], extrapolate: 'clamp' });
  return <Pressable accessible={false} disabled={disabled} onPress={() => onTap(index)}
    delayLongPress={WHEEL_HOLD_DELAY} onLongPress={() => onHold(index)} onPressOut={onRelease}
    style={{ height: rowHeight, justifyContent: 'center' }}>
    <Animated.View pointerEvents="none" testID={`workout-number-row-${index}`} style={{ height: rowHeight,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, gap: 3,
      opacity, transform: [{ scale }] }}>
      <Text accessible={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}
        style={{ color: !empty && value === highlightValue ? colors.primary : colors.ink,
          fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1.5, flexShrink: 1 }}>{empty ? '—' : value}</Text>
      <Animated.Text accessible={false} style={[styles.small, { marginTop: 18,
        opacity: offset.interpolate({ inputRange: [center - rowHeight, center, center + rowHeight], outputRange: [0, 1, 0], extrapolate: 'clamp' }) }]}>{unit}</Animated.Text>
    </Animated.View>
  </Pressable>;
});

export function WorkoutNumberWheel({ label, unit, value, highlightValue, step, onChange, resetToken, min = 0, max = Infinity, disabled = false }: {
  label: string; unit: string; value?: number; highlightValue?: number; step: number;
  onChange: (value: number) => void; resetToken?: string | number; disabled?: boolean; min?: number; max?: number;
}) {
  const { colors, styles } = useTheme();
  const { fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();
  const neighborHeight = Math.max(44, Math.ceil(24 * fontScale));
  const centerHeight = Math.max(56, Math.ceil(48 * fontScale));
  const rowHeight = (neighborHeight + centerHeight) / 2;
  const height = neighborHeight * 2 + centerHeight;
  const padding = (height - rowHeight) / 2;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [shown, setShown] = useState(value);
  const [windowOrigin, setWindowOrigin] = useState({ value });
  const window = useMemo(() => numberWheelWindow(windowOrigin.value, step, min, max), [windowOrigin, step, min, max]);
  const [offset] = useState(() => new Animated.Value(window.center * rowHeight));
  const list = useRef<FlatList<WheelItem>>(null);
  const displayed = useRef(value);
  const pending = useRef<number | undefined>(undefined);
  const selected = useRef(window.center);
  const active = useRef(false);
  const changed = useRef(false);
  const held = useRef(false);
  const settling = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const repeating = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const current = useRef({ window, rowHeight, disabled, onChange, resetToken });
  useLayoutEffect(() => { current.current = { window, rowHeight, disabled, onChange, resetToken }; }, [window, rowHeight, disabled, onChange, resetToken]);
  const clearTimers = useCallback(() => { clearTimeout(settling.current); clearInterval(repeating.current); repeating.current = undefined; }, []);
  const align = useCallback(() => {
    const { window, rowHeight } = current.current;
    selected.current = window.center;
    offset.setValue(window.center * rowHeight);
    list.current?.scrollToOffset({ offset: window.center * rowHeight, animated: false });
  }, [offset]);
  useLayoutEffect(align, [align, window, rowHeight]);
  const publish = useCallback((next: number) => {
    if (current.current.resetToken !== resetToken) return;
    displayed.current = next; pending.current = next;
    setShown(next); setWindowOrigin({ value: next }); current.current.onChange(next);
  }, [resetToken]);
  const finish = useCallback(() => {
    if (current.current.resetToken !== resetToken) return;
    clearTimers();
    if (!active.current) return;
    active.current = false;
    const next = current.current.window.items[selected.current]?.value;
    if (changed.current && next !== undefined && next !== displayed.current) publish(next);
    else setWindowOrigin({ value: displayed.current });
  }, [clearTimers, publish, resetToken]);
  const cancel = useCallback(() => {
    clearTimers(); active.current = false; changed.current = false; held.current = false;
    align();
  }, [align, clearTimers]);
  const previousToken = useRef(resetToken);
  useLayoutEffect(() => {
    const reset = previousToken.current !== resetToken;
    previousToken.current = resetToken;
    if (reset) {
      clearTimers(); active.current = false; changed.current = false;
      // Ignore the old press release until a fresh touch begins.
      held.current = true; pending.current = undefined;
      setEditing(false); setDraft('');
    } else if (active.current || (pending.current !== undefined && pending.current !== value)) return;
    pending.current = undefined;
    if (!reset && displayed.current === value) return;
    displayed.current = value;
    // Layout updates flush before paint, including equal-valued sets mid-gesture.
    setShown(value); setWindowOrigin({ value });
  }, [value, resetToken, clearTimers]);
  useEffect(() => { if (disabled) cancel(); }, [disabled, cancel]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') cancel(); });
    return () => { subscription.remove(); clearTimers(); active.current = false; };
  }, [cancel, clearTimers]);
  useFocusEffect(useCallback(() => () => { cancel(); setEditing(false); }, [cancel]));
  const select = useCallback((index: number) => {
    const items = current.current.window.items;
    const next = Math.max(0, Math.min(items.length - 1, index));
    if (next === selected.current) return;
    selected.current = next; changed.current = true; tick();
  }, []);
  const openInput = useCallback(() => {
    feedback();
    setDraft(displayed.current === undefined ? '' : String(displayed.current)); setEditing(true);
  }, []);
  const finishRef = useRef(finish);
  useLayoutEffect(() => { finishRef.current = finish; }, [finish]);
  const tap = useCallback((index: number) => {
    if (current.current.disabled || held.current) return;
    if (index === selected.current) { openInput(); return; }
    active.current = true; select(index); finishRef.current();
  }, [openInput, select]);
  const hold = useCallback((index: number) => {
    if (current.current.disabled) return;
    const direction = Math.sign(index - selected.current);
    if (!direction) { held.current = true; openInput(); return; }
    clearTimers(); held.current = true; active.current = true; changed.current = false;
    const turn = () => {
      select(selected.current + direction);
      list.current?.scrollToOffset({ offset: selected.current * current.current.rowHeight, animated: false });
    };
    turn(); repeating.current = setInterval(turn, WHEEL_REPEAT_DELAY);
  }, [clearTimers, openInput, select]);
  const releaseHold = useCallback(() => { if (repeating.current !== undefined) finishRef.current(); }, []);
  const renderItem = useCallback(({ item, index }: { item: WheelItem; index: number }) =>
    <NumberWheelRow value={item.value} empty={item.empty} index={index} rowHeight={rowHeight} offset={offset}
      highlightValue={highlightValue} unit={unit} disabled={disabled} onTap={tap} onHold={hold} onRelease={releaseHold} />,
  [rowHeight, offset, highlightValue, unit, disabled, tap, hold, releaseHold]);
  const contentOffset = useMemo(() => ({ x: 0, y: window.center * rowHeight }), [window.center, rowHeight]);
  const getItemLayout = useCallback((_: unknown, index: number) =>
    ({ length: rowHeight, offset: index * rowHeight, index }), [rowHeight]);
  // Animated.event stores the listener; it does not execute it while rendering.
  // eslint-disable-next-line react-hooks/refs
  const scroll = useMemo(() => Animated.event([{ nativeEvent: { contentOffset: { y: offset } } }], {
    useNativeDriver: true,
    // Native scroll + scale/opacity never wait for JS. Only detent ticks cross here.
    listener: (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (active.current) select(Math.round(event.nativeEvent.contentOffset.y / current.current.rowHeight));
    },
  }), [offset, select]);
  const adjust = (delta: number) => {
    const next = Math.max(min, Math.min(max, Math.round(((displayed.current ?? min) + delta * step) * 100) / 100));
    if (next !== (displayed.current ?? min)) { cancel(); tick(); publish(next); }
  };
  const numeric = shown ?? 0;
  const parsedInput = parseWheelInput(draft, unit !== 'kg' && unit !== 'lb');
  const inputValue = parsedInput !== undefined && unit === 'lb' ? roundWeight(parsedInput, 'lb') : parsedInput;
  const boundedInput = inputValue !== undefined && inputValue >= min && inputValue <= max ? inputValue : undefined;
  const invalid = !!draft.trim() && boundedInput === undefined;
  const close = () => setEditing(false);
  const save = () => {
    if (boundedInput === undefined) return;
    if (boundedInput !== displayed.current) { cancel(); publish(boundedInput); }
    close();
  };
  return <>
    <View pointerEvents="box-none" style={{ flex: 1, minWidth: 0, alignItems: 'center', paddingTop: 8, paddingBottom: 6 }}>
      <Text pointerEvents="none" style={[styles.small, { fontWeight: '600', textAlign: 'center' }]}>{label}</Text>
      <View testID={`workout-wheel-${(unit === 'kg' || unit === 'lb') ? 'weight' : 'reps'}`}
        accessible accessibilityRole="adjustable" accessibilityLabel={label}
        accessibilityHint="上下に動かして変更。前後の数字を長押しで連続変更。タップで直接入力。"
        accessibilityState={{ disabled }}
        accessibilityValue={{ min, max: Number.isFinite(max) ? max : undefined, now: numeric, text: shown === undefined ? '未入力' : `${shown}${unit}` }}
        accessibilityActions={[{ name: 'increment', label: `${label}を増やす` }, { name: 'decrement', label: `${label}を減らす` }, { name: 'activate', label: '直接入力' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (disabled) return;
          if (nativeEvent.actionName === 'activate') openInput();
          else if (nativeEvent.actionName === 'increment' || nativeEvent.actionName === 'decrement') adjust(nativeEvent.actionName === 'increment' ? 1 : -1);
        }}
        style={{ width: '100%', height, overflow: 'hidden', opacity: disabled ? 0.45 : 1, borderRadius: 12 }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: neighborHeight, left: 8, right: 8, height: centerHeight,
          backgroundColor: colors.bg, borderRadius: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }} />
        <Animated.FlatList key={window.center} ref={list} data={window.items} keyExtractor={rowKey}
          // initialScrollIndex only seeds a mounted list. Remount when the center
          // changes so distant set values render their visible cells immediately.
          // Seed both neighbors too; contentOffset keeps the selected row centered
          // and prevents the initial-index scroll from overriding align().
          initialScrollIndex={Math.max(0, window.center - 10)} contentOffset={contentOffset} initialNumToRender={21} maxToRenderPerBatch={10} windowSize={5}
          removeClippedSubviews={false}
          getItemLayout={getItemLayout}
          contentContainerStyle={{ paddingVertical: padding }} onLayout={align}
          nestedScrollEnabled scrollEnabled={!disabled} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never"
          snapToInterval={rowHeight} decelerationRate="fast" disableIntervalMomentum={reduced}
          scrollEventThrottle={16} onScroll={scroll}
          onTouchStart={() => { held.current = false; }}
          onScrollBeginDrag={() => { clearTimers(); active.current = true; changed.current = false; }}
          onScrollEndDrag={event => {
            if (!active.current) return;
            select(Math.round(event.nativeEvent.contentOffset.y / rowHeight));
            if (reduced) { list.current?.scrollToOffset({ offset: selected.current * rowHeight, animated: false }); finish(); }
            else settling.current = setTimeout(finish, 120);
          }}
          onMomentumScrollBegin={() => { clearTimeout(settling.current); }}
          onMomentumScrollEnd={event => { if (!active.current) return; select(Math.round(event.nativeEvent.contentOffset.y / rowHeight)); finish(); }}
          renderItem={renderItem}
        />
      </View>
    </View>
    {editing && !disabled && <Sheet title={`${label}を入力`} popup onClose={close}>
      <Text style={styles.small}>{label}（{unit}）を入力してください。</Text>
      <TextInput accessibilityLabel={`${label}（${unit}）`} autoFocus selectTextOnFocus
        value={draft} onChangeText={setDraft} keyboardType={unit !== 'kg' && unit !== 'lb' ? 'number-pad' : 'decimal-pad'}
        maxLength={12} returnKeyType="done" onSubmitEditing={() => { feedback(); save(); }}
        style={[styles.field, { fontSize: 28, textAlign: 'center', marginTop: 12 }]} />
      {invalid && <Text accessibilityRole="alert" style={[styles.small, { color: colors.red }]}>{Number.isFinite(max) ? `${min}〜${max}の整数を入力してください。` : unit !== 'kg' && unit !== 'lb' ? '0以上の整数を入力してください。' : '0以上、小数2桁までで入力してください。'}</Text>}
      <Button label="決定" disabled={boundedInput === undefined} onPress={save} />
      <Button label="取消" secondary onPress={close} />
    </Sheet>}
  </>;
}
