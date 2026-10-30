import React, { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { Card, feedback, useTheme } from '../ui';
import { moveItem } from '../reorder';
import { useReducedMotion } from '../use-reduced-motion';

const ROW = 72;
type Item = { id: number; name: string; detail: string };

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
  const [dragY] = useState(() => new Animated.Value(0));
  const [swipeX] = useState(() => new Animated.Value(0));
  const [swipedId, setSwipedId] = useState<number>();
  const swipedIdRef = useRef<number | undefined>(undefined);
  const swipeOpen = useRef(false);
  const closeSwipe = () => {
    swipeX.stopAnimation();
    swipeOpen.current = false;
    swipedIdRef.current = undefined;
    setSwipedId(undefined);
  };
  const [preview, setPreview] = useState<number>();
  const [pendingOrder, setPendingOrder] = useState<Item[]>();
  const [dragging, setDragging] = useState<number>();
  const drag = useRef<{ from: number; to: number; id: number; origin: number; scroll: number; pointer: number } | undefined>(undefined);
  const settling = useRef(false);
  const latest = useRef({ items, onMove });
  useEffect(() => { latest.current = { items, onMove }; }, [items, onMove]);
  const [from, setFrom] = useState<number>();
  const beginDrag = (index: number, id: number, y: number) => {
    if (drag.current) return;
    setPendingOrder(undefined);
    dragY.setValue(index * ROW);
    setFrom(index);
    drag.current = { from: index, to: index, id, origin: y, pointer: y, scroll: offset.current };
    setDragging(id); setPreview(index); feedback();
  };
  const finish = (cancel = false) => {
    const active = drag.current;
    if (!active || settling.current) return;
    settling.current = true;
    const target = cancel ? active.from : active.to;
    Animated.timing(dragY, {
      toValue: target * ROW,
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
    const y = Math.max(0, Math.min((latest.current.items.length - 1) * ROW,
      active.from * ROW + active.pointer - active.origin + offset.current - active.scroll));
    dragY.setValue(y);
    const to = Math.round(y / ROW);
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
      const delta = active.pointer < top + 70 ? -7 : active.pointer > top + height - 70 ? 7 : 0;
      if (delta) {
        offset.current = Math.max(0, Math.min(Math.max(0, content - height), offset.current + delta));
        scroll.current?.scrollTo({ y: offset.current, animated: false });
        actions.current.updatePosition();
      }
    }, 16);
    return () => clearInterval(timer);
  }, [dragging]);
  const order = from !== undefined && preview !== undefined ? moveItem(items, from, preview) : pendingOrder ?? items;
  useEffect(() => {
    if (!pendingOrder || !items.every((item, index) => item.id === pendingOrder[index]?.id) || items.length !== pendingOrder.length) return;
    const timer = setTimeout(() => setPendingOrder(undefined), 0);
    return () => clearTimeout(timer);
  }, [items, pendingOrder]);
   return <View style={{ flex: 1 }}>
    <ScrollView ref={scroll} scrollEnabled={dragging === undefined} scrollEventThrottle={16}
      onScrollBeginDrag={closeSwipe}
      onLayout={() => scroll.current?.measureInWindow((_x, y, _w, h) => { bounds.current.top = y; bounds.current.height = h; })}
      onContentSizeChange={(_w, h) => { bounds.current.content = h; }}
      onScroll={(e) => { offset.current = e.nativeEvent.contentOffset.y; }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      <View onTouchStart={closeSwipe}>{header}</View>
      <View style={{ height: items.length * ROW }}>
        {items.map((item, index) => <OrderRow key={item.id} index={order.findIndex((v) => v.id === item.id)} dragging={dragging === item.id} dragY={dragY} reduced={reduced}>
          {onDelete && <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}を削除`} disabled={swipedId !== item.id}
            onPress={() => { swipeX.setValue(0); setSwipedId(undefined); swipedIdRef.current = undefined; swipeOpen.current = false; setPendingOrder(undefined); onDelete(item.id); }}
            style={{ position: 'absolute', right: 0, top: 0, width: 94, height: ROW - 8, backgroundColor: colors.red, borderTopRightRadius: 18, borderBottomRightRadius: 18, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 22 }}>
            <Text style={{ color: colors.bg, fontWeight: '700' }}>削除</Text>
          </Pressable>}
          <SwipePosition active={swipedId === item.id} position={swipeX} reduced={reduced}>
          <DragGrip label={`${item.name}、${item.detail}。タップで編集、ドラッグで並べ替え`}
            onTouchBegin={() => { if (swipedIdRef.current !== undefined && swipedIdRef.current !== item.id) closeSwipe(); }}
            onStart={(y) => { closeSwipe(); beginDrag(index, item.id, y); }}
            onSwipe={onDelete ? (dx) => {
              if (swipedIdRef.current !== item.id) {
                swipeX.stopAnimation();
                swipeOpen.current = false;
                swipedIdRef.current = item.id;
                setSwipedId(item.id);
              }
              swipeX.setValue(Math.max(-76, Math.min(0, (swipeOpen.current ? -76 : 0) + dx)));
            } : undefined}
            onSwipeEnd={(dx) => {
              const open = (swipeOpen.current ? -76 : 0) + dx < -30;
              swipeOpen.current = open;
              Animated.timing(swipeX, { toValue: open ? -76 : 0, duration: reduced ? 0 : 160, useNativeDriver: false }).start();
            }}
            onMove={(dy) => { if (drag.current) { drag.current.pointer = drag.current.origin + dy; updatePosition(); } }}
            onEnd={finish}
            onTap={() => { if (swipedIdRef.current !== undefined) closeSwipe(); else onEdit(item.id); }}
            onStep={(delta) => onMove(index, Math.max(0, Math.min(items.length - 1, index + delta)))}>
            <Card style={{ height: ROW - 8, marginBottom: 0, paddingHorizontal: 14, paddingVertical: 8, borderColor: dragging === item.id ? colors.primary : colors.line }}>
              <View style={styles.row}><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.body, { fontWeight: '700' }]}>{item.name}</Text><Text style={styles.small}>{item.detail}</Text></View>
              </View>
            </Card>
          </DragGrip>
          </SwipePosition>
        </OrderRow>)}
      </View>
      <View onTouchStart={closeSwipe}>{footer}</View>
    </ScrollView>
  </View>;
}

function SwipePosition({ active, position, reduced, children }: { active: boolean; position: Animated.Value; reduced: boolean; children: ReactNode }) {
  const [x] = useState(() => new Animated.Value(0));
  useLayoutEffect(() => {
    x.stopAnimation();
    if (!active) {
      const animation = Animated.timing(x, { toValue: 0, duration: reduced ? 0 : 180, useNativeDriver: false });
      animation.start();
      return () => animation.stop();
    }
    const listener = position.addListener(({ value }) => x.setValue(value));
    return () => position.removeListener(listener);
  }, [active, position, x, reduced]);
  return <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>;
}

function OrderRow({ index, dragging, dragY, reduced, children }: { index: number; dragging: boolean; dragY: Animated.Value; reduced: boolean; children: ReactNode }) {
  const [y] = useState(() => new Animated.Value(index * ROW));
  const wasDragging = useRef(false);
  useLayoutEffect(() => {
    if (dragging) {
      y.stopAnimation();
    } else if (wasDragging.current) {
      // Switch from the finger position to the committed slot before painting.
      y.setValue(index * ROW);
    } else {
      Animated.timing(y, { toValue: index * ROW, duration: reduced ? 0 : 150, useNativeDriver: false }).start();
    }
    wasDragging.current = dragging;
  }, [y, index, reduced, dragging]);
  return <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: dragging ? 10 : 0, elevation: dragging ? 8 : 0, transform: [{ translateY: dragging ? dragY : y }, { scale: dragging ? 1.02 : 1 }] }}>{children}</Animated.View>;
}

function DragGrip({ label, onStart, onMove, onEnd, onTap, onStep, onSwipe, onSwipeEnd, onTouchBegin, style, children }: {
  label: string; onStart: (y: number) => void; onMove: (dy: number) => void; onEnd: (cancel?: boolean) => void;
  onTap: () => void; onStep: (delta: number) => void;
  onTouchBegin: () => void;
  onSwipe?: (dx: number) => void; onSwipeEnd: (dx: number) => void;
  style?: React.ComponentProps<typeof View>['style']; children: ReactNode;
}) {
  const callbacks = useRef({ onStart, onMove, onEnd, onTap, onSwipe, onSwipeEnd, onTouchBegin });
  useEffect(() => { callbacks.current = { onStart, onMove, onEnd, onTap, onSwipe, onSwipeEnd, onTouchBegin }; });
  const [responder, setResponder] = useState<ReturnType<typeof PanResponder.create> | null>(null);
  useEffect(() => {
    let axis: 'horizontal' | 'vertical' | undefined;
    let origin = 0;
    const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => { axis = undefined; origin = event.nativeEvent.pageY; callbacks.current.onTouchBegin(); },
    onPanResponderMove: (_, gesture) => {
      if (!axis && Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > 6) {
        axis = callbacks.current.onSwipe && Math.abs(gesture.dx) > Math.abs(gesture.dy) ? 'horizontal' : 'vertical';
        if (axis === 'vertical') callbacks.current.onStart(origin);
      }
      if (axis === 'horizontal') callbacks.current.onSwipe?.(gesture.dx);
      else if (axis === 'vertical') callbacks.current.onMove(gesture.dy);
    },
    onPanResponderRelease: (_, gesture) => {
      if (axis === 'vertical') callbacks.current.onEnd();
      else if (axis === 'horizontal') callbacks.current.onSwipeEnd(gesture.dx);
      else if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) callbacks.current.onTap();
    },
    onPanResponderTerminate: () => { if (axis === 'vertical') callbacks.current.onEnd(true); else if (axis === 'horizontal') callbacks.current.onSwipeEnd(0); },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    });
    const timer = setTimeout(() => setResponder(pan), 0);
    return () => clearTimeout(timer);
  }, []);
  return <View collapsable={false} accessible accessibilityRole="button" accessibilityLabel={label}
    accessibilityActions={[{ name: 'activate', label: '編集' }, { name: 'increment', label: '下へ' }, { name: 'decrement', label: '上へ' }]}
    onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'activate') onTap(); else onStep(event.nativeEvent.actionName === 'increment' ? 1 : -1); }}
    style={style} {...responder?.panHandlers}>{children}</View>;
}
