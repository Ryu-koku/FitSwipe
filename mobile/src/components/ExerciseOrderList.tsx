import React, { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { Card, feedback, useTheme } from '../ui';
import { moveItem } from '../reorder';
import { useReducedMotion } from '../use-reduced-motion';
import { SwipeDeleteRow } from './SwipeDeleteRow';
import { ExercisePictogram } from './ExercisePictogram';

const ROW = 72;
const EDGE = 56;
const EDGE_START_DISTANCE = 12;
const MAX_SCROLL_STEP = 7;
type SetStepper = { sets: number; min: number; max: number; onChange: (sets: number) => void };
type SetRow = { key: number; label: string; accessibilityLabel: string; completed: boolean; current: boolean; onPress: () => void };
type Item = { id: number; name: string; detail: string; stepper?: SetStepper; setRows?: SetRow[] };
const SET_ROW = 44;

function rowHeight(item: Item) { return ROW + (item.setRows?.length ?? 0) * SET_ROW; }
function rowPositions(items: Item[]) {
  const positions = new Map<number, number>();
  let top = 0;
  for (const item of items) { positions.set(item.id, top); top += rowHeight(item); }
  return { positions, height: top };
}

function dragTarget(items: Item[], from: number, y: number) {
  const other = items.filter((_, index) => index !== from);
  const slots = [0];
  for (const item of other) slots.push(slots.at(-1)! + rowHeight(item));
  let target = 0;
  while (target < other.length && y >= (slots[target] + slots[target + 1]) / 2) target++;
  return target;
}

function autoScrollDelta(pointer: number, origin: number, top: number, height: number) {
  if (height <= 0) return 0;
  const upperEdge = top + EDGE;
  const lowerEdge = top + height - EDGE;
  if (pointer < upperEdge && pointer < origin &&
      (origin >= upperEdge || origin - pointer >= EDGE_START_DISTANCE)) {
    return -MAX_SCROLL_STEP * Math.min(1, (upperEdge - pointer) / EDGE);
  }
  if (pointer > lowerEdge && pointer > origin &&
      (origin <= lowerEdge || pointer - origin >= EDGE_START_DISTANCE)) {
    return MAX_SCROLL_STEP * Math.min(1, (pointer - lowerEdge) / EDGE);
  }
  return 0;
}

export function ExerciseOrderList({ items, onMove, onEdit, onDelete, header, footer }: {
  items: Item[]; onMove: (from: number, to: number) => void; onEdit: (id: number) => void;
  header?: ReactNode; footer?: ReactNode;
  onDelete?: (id: number) => void;
}) {
  const { styles, colors } = useTheme();
  const reduced = useReducedMotion();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const bounds = useRef({ top: 0, height: 0, content: 0 });
  const boundsMeasure = useRef(0);
  const [dragY] = useState(() => new Animated.Value(0));
  const [swipedId, setSwipedId] = useState<number>();
  const closeSwipe = () => setSwipedId(undefined);
  const [preview, setPreview] = useState<number>();
  const [pendingOrder, setPendingOrder] = useState<Item[]>();
  const [dragging, setDragging] = useState<number>();
  const drag = useRef<{ from: number; to: number; id: number; origin: number; scroll: number; pointer: number } | undefined>(undefined);
  const settling = useRef(false);
  const latest = useRef({ items, onMove });
  useEffect(() => { latest.current = { items, onMove }; }, [items, onMove]);
  const [from, setFrom] = useState<number>();
  const measureBounds = () => {
    const request = ++boundsMeasure.current;
    scroll.current?.measureInWindow((_x, y, _w, h) => {
      if (request !== boundsMeasure.current) return;
      bounds.current.top = y;
      bounds.current.height = h;
    });
  };
  const beginDrag = (index: number, id: number, y: number) => {
    if (drag.current) return;
    bounds.current.height = 0;
    measureBounds();
    setPendingOrder(undefined);
    dragY.setValue(rowPositions(latest.current.items).positions.get(id) ?? 0);
    setFrom(index);
    drag.current = { from: index, to: index, id, origin: y, pointer: y, scroll: offset.current };
    setDragging(id); setPreview(index); feedback();
  };
  const finish = (cancel = false) => {
    const active = drag.current;
    if (!active || settling.current) return;
    settling.current = true;
    const target = cancel ? active.from : active.to;
    const destination = rowPositions(moveItem(latest.current.items, active.from, target)).positions.get(active.id) ?? 0;
    Animated.timing(dragY, {
      toValue: destination,
      duration: reduced ? 0 : 170,
      useNativeDriver: false,
    }).start(() => {
      drag.current = undefined;
      settling.current = false;
      if (!cancel && active.to !== active.from) {
        setPendingOrder(moveItem(latest.current.items, active.from, active.to));
        latest.current.onMove(active.from, active.to);
      }
      setDragging(undefined); setPreview(undefined); setFrom(undefined);
    });
  };
  const updatePosition = () => {
    const active = drag.current;
    if (!active || settling.current) return;
    const layout = rowPositions(latest.current.items);
    const item = latest.current.items[active.from];
    if (!item) return;
    const y = Math.max(0, Math.min(layout.height - rowHeight(item),
      (layout.positions.get(active.id) ?? 0) + active.pointer - active.origin + offset.current - active.scroll));
    dragY.setValue(y);
    const to = dragTarget(latest.current.items, active.from, y);
    if (to !== active.to) { active.to = to; setPreview(to); feedback(); }
  };
  // The responder must keep the current closures, including the motion setting.
  const actions = useRef({ finish, updatePosition, beginDrag });
  useEffect(() => { actions.current = { finish, updatePosition, beginDrag }; });
  useEffect(() => {
    if (dragging === undefined) return;
    const timer = setInterval(() => {
      const active = drag.current;
      if (!active || settling.current) return;
      const { top, height, content } = bounds.current;
      const delta = autoScrollDelta(active.pointer, active.origin, top, height);
      if (delta) {
        offset.current = Math.max(0, Math.min(Math.max(0, content - height), offset.current + delta));
        scroll.current?.scrollTo({ y: offset.current, animated: false });
        actions.current.updatePosition();
      }
    }, 16);
    return () => clearInterval(timer);
  }, [dragging]);
  const order = from !== undefined && preview !== undefined ? moveItem(items, from, preview) : pendingOrder ?? items;
  const layout = rowPositions(order);
  useEffect(() => {
    if (!pendingOrder || !items.every((item, index) => item.id === pendingOrder[index]?.id) || items.length !== pendingOrder.length) return;
    const timer = setTimeout(() => setPendingOrder(undefined), 0);
    return () => clearTimeout(timer);
  }, [items, pendingOrder]);
   return <View style={{ flex: 1 }}>
    <ScrollView ref={scroll} scrollEnabled={dragging === undefined} scrollEventThrottle={16} keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={closeSwipe}
      onLayout={measureBounds}
      onContentSizeChange={(_w, h) => { bounds.current.content = h; }}
      onScroll={(e) => { offset.current = e.nativeEvent.contentOffset.y; }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      <View onTouchStart={closeSwipe}>{header}</View>
      <View style={{ height: layout.height }}>
        {items.map((item, index) => <OrderRow key={item.id} top={layout.positions.get(item.id) ?? 0} dragging={dragging === item.id} dragY={dragY} reduced={reduced}>
          <OptionalSwipe name={item.name} open={swipedId === item.id}
            onOpenChange={(open) => setSwipedId(open ? item.id : undefined)}
            onDelete={onDelete ? () => { closeSwipe(); setPendingOrder(undefined); onDelete(item.id); } : undefined}>
          {(closeOnTap) => <><Card style={{ height: ROW - 8, marginBottom: 0, ...(onDelete ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 } : {}), paddingHorizontal: 14, paddingVertical: 8, borderColor: dragging === item.id ? colors.primary : colors.line }}>
            <View style={styles.row}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}、${item.detail}。タップで編集`}
            accessibilityActions={[{ name: 'activate', label: '編集' }, ...(onDelete ? [{ name: 'delete', label: '削除' }] : [])]}
            onAccessibilityAction={(event) => { feedback();
              if (event.nativeEvent.actionName === 'delete' && onDelete) { closeSwipe(); setPendingOrder(undefined); onDelete(item.id); }
              else if (event.nativeEvent.actionName === 'activate') onEdit(item.id);
            }}
            onPress={() => { feedback(); if (!closeOnTap()) { if (swipedId !== undefined) closeSwipe(); else onEdit(item.id); } }}
            style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.row}>
                <ExercisePictogram name={item.name} size={48} animate={false} />
                <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[styles.body, { fontWeight: '700' }]}>{item.name}</Text><Text numberOfLines={1} style={styles.small}>{item.detail}</Text></View>
              </View>
              </Pressable>
                {item.stepper && <SetsStepper name={item.name} {...item.stepper} onChange={(sets) => { closeOnTap(); item.stepper?.onChange(sets); }} />}
                <DragGrip label={`${item.name}を並べ替え`}
                  onTouchBegin={() => { closeSwipe(); }}
                  onStart={(y) => beginDrag(index, item.id, y)}
                  onSwipeEnd={() => {}}
                  onMove={(dy) => { if (drag.current) { drag.current.pointer = drag.current.origin + dy; updatePosition(); } }}
                  onEnd={finish}
                  onTap={() => {}}
                  onStep={(delta) => onMove(index, Math.max(0, Math.min(items.length - 1, index + delta)))}
                  style={{ width: 44, height: 44, marginRight: -8, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24, color: colors.muted }}>≡</Text>
                </DragGrip>
              </View>
            </Card>
            {item.setRows?.map((setRow) => <Pressable key={setRow.key} accessibilityRole="button" accessibilityLabel={setRow.accessibilityLabel}
              onPress={() => { feedback(); if (!closeOnTap()) setRow.onPress(); }}
              style={{ minHeight: SET_ROW, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
                borderBottomWidth: 1, borderBottomColor: colors.line,
                backgroundColor: setRow.current ? colors.soft : 'transparent' }}>
              <Text numberOfLines={1} style={[styles.small, { flexShrink: 1, color: setRow.current ? colors.primary : colors.ink,
                opacity: setRow.completed ? 0.5 : 1, fontWeight: setRow.current ? '700' : '400' }]}>{setRow.label}</Text>
            </Pressable>)}</>
          }
          </OptionalSwipe>
        </OrderRow>)}
      </View>
      <View onTouchStart={closeSwipe}>{footer}</View>
    </ScrollView>
  </View>;
}

function SetsStepper({ name, sets, min, max, onChange }: SetStepper & { name: string }) {
  const { colors, styles } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {([-1, 1] as const).map((delta, index) => {
      const disabled = delta < 0 ? sets <= min : sets >= max;
      return <React.Fragment key={delta}>
        {index === 1 && <Text accessibilityLabel={`${sets}セット`} style={[styles.body, { minWidth: 24, textAlign: 'center', fontWeight: '700' }]}>{sets}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={`${name}のセットを1${delta < 0 ? '減らす' : '増やす'}`}
          accessibilityState={{ disabled }} disabled={disabled}
          onPress={() => { feedback(); onChange(sets + delta); }}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24, color: disabled ? colors.muted : colors.primary }}>{delta < 0 ? '−' : '＋'}</Text>
        </Pressable>
      </React.Fragment>;
    })}
  </View>;
}

function OptionalSwipe({ onDelete, children, ...props }: {
  name: string; open: boolean; onOpenChange: (open: boolean) => void;
  onDelete?: () => void; children: (closeOnTap: () => boolean) => ReactNode;
}) {
  return onDelete ? <SwipeDeleteRow {...props} onDelete={onDelete}>{children}</SwipeDeleteRow> : children(() => false);
}

function OrderRow({ top, dragging, dragY, reduced, children }: { top: number; dragging: boolean; dragY: Animated.Value; reduced: boolean; children: ReactNode }) {
  const [y] = useState(() => new Animated.Value(top));
  const wasDragging = useRef(false);
  useLayoutEffect(() => {
    if (dragging) {
      y.stopAnimation();
    } else if (wasDragging.current) {
      // Switch from the finger position to the committed slot before painting.
      y.setValue(top);
    } else {
      Animated.timing(y, { toValue: top, duration: reduced ? 0 : 150, useNativeDriver: false }).start();
    }
    wasDragging.current = dragging;
  }, [y, top, reduced, dragging]);
  return <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: dragging ? 10 : 0, elevation: dragging ? 8 : 0, transform: [{ translateY: dragging ? dragY : y }, { scale: dragging ? 1.02 : 1 }] }}>{children}</Animated.View>;
}

function DragGrip({ draggable = true, label, onStart, onMove, onEnd, onTap, onStep, onSwipe, onSwipeEnd, onTouchBegin, style, children }: {
  draggable?: boolean; label: string; onStart: (y: number) => void; onMove: (dy: number) => void; onEnd: (cancel?: boolean) => void;
  onTap: () => void; onStep: (delta: number) => void;
  onTouchBegin: () => void;
  onSwipe?: (dx: number) => void; onSwipeEnd: (dx: number) => void;
  style?: React.ComponentProps<typeof View>['style']; children: ReactNode;
}) {
  const callbacks = useRef({ onStart, onMove, onEnd, onTap, onSwipe, onSwipeEnd, onTouchBegin });
  useEffect(() => { callbacks.current = { onStart, onMove, onEnd, onTap, onSwipe, onSwipeEnd, onTouchBegin }; });
  const [responder, setResponder] = useState<ReturnType<typeof PanResponder.create> | null>(null);
  useEffect(() => {
    let axis: 'horizontal' | 'vertical' | 'none' | undefined;
    let origin = 0;
    const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => draggable || Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: (event) => { axis = undefined; origin = event.nativeEvent.pageY; callbacks.current.onTouchBegin(); },
    onPanResponderMove: (_, gesture) => {
      if (!axis && Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > 6) {
        axis = callbacks.current.onSwipe && Math.abs(gesture.dx) > Math.abs(gesture.dy) ? 'horizontal' : draggable ? 'vertical' : 'none';
        if (axis === 'vertical') callbacks.current.onStart(origin);
      }
      if (axis === 'horizontal') callbacks.current.onSwipe?.(gesture.dx);
      else if (axis === 'vertical') callbacks.current.onMove(gesture.dy);
    },
    onPanResponderRelease: (_, gesture) => {
      if (axis === 'vertical') callbacks.current.onEnd();
      else if (axis === 'horizontal') callbacks.current.onSwipeEnd(gesture.dx);
      else if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) { feedback(); callbacks.current.onTap(); }
    },
    onPanResponderTerminate: () => { if (axis === 'vertical') callbacks.current.onEnd(true); else if (axis === 'horizontal') callbacks.current.onSwipeEnd(0); },
    onPanResponderTerminationRequest: () => axis === 'none',
    onShouldBlockNativeResponder: () => draggable,
    });
    const timer = setTimeout(() => setResponder(pan), 0);
    return () => clearTimeout(timer);
  }, [draggable]);
  return <View collapsable={false} accessible accessibilityRole={draggable ? 'adjustable' : 'button'} accessibilityLabel={label}
    accessibilityActions={draggable ? [{ name: 'increment', label: '下へ' }, { name: 'decrement', label: '上へ' }] : [{ name: 'activate', label: '編集' }]}
    onAccessibilityAction={(event) => { feedback(); if (event.nativeEvent.actionName === 'activate') onTap(); else onStep(event.nativeEvent.actionName === 'increment' ? 1 : -1); }}
    style={style} {...responder?.panHandlers}>{children}</View>;
}
