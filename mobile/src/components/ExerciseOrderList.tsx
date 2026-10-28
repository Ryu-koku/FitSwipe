import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { Card, feedback, useTheme } from '../ui';
import { moveItem } from '../reorder';
import { useReducedMotion } from '../use-reduced-motion';

const ROW = 88;
type Item = { id: number; name: string; detail: string };

export function ExerciseOrderList({ items, onMove, onEdit, header, footer }: {
  items: Item[]; onMove: (from: number, to: number) => void; onEdit: (id: number) => void;
  header?: ReactNode; footer?: ReactNode;
}) {
  const { styles, colors } = useTheme();
  const reduced = useReducedMotion();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const bounds = useRef({ top: 0, height: 0, content: 0 });
  const [dragY] = useState(() => new Animated.Value(0));
  const [preview, setPreview] = useState<number>();
  const [dragging, setDragging] = useState<number>();
  const drag = useRef<{ from: number; to: number; id: number; origin: number; scroll: number; pointer: number } | undefined>(undefined);
  const latest = useRef({ items, onMove });
  useEffect(() => { latest.current = { items, onMove }; }, [items, onMove]);
  const [from, setFrom] = useState<number>();
  const suppressPress = useRef(false);
  const finish = (cancel = false) => {
    const active = drag.current;
    if (!active) return;
    drag.current = undefined;
    if (!cancel && active.to !== active.from) latest.current.onMove(active.from, active.to);
    setDragging(undefined); setPreview(undefined); setFrom(undefined);
  };
  const updatePosition = () => {
    const active = drag.current;
    if (!active) return;
    const y = Math.max(0, Math.min((latest.current.items.length - 1) * ROW,
      active.from * ROW + active.pointer - active.origin + offset.current - active.scroll));
    dragY.setValue(y);
    const to = Math.round(y / ROW);
    if (to !== active.to) { active.to = to; setPreview(to); feedback(); }
  };
  // The responder must keep the current closures, including the motion setting.
  const actions = useRef({ finish, updatePosition });
  useEffect(() => { actions.current = { finish, updatePosition }; });
  const [handlers, setHandlers] = useState<ReturnType<typeof PanResponder.create> | null>(null);
  useEffect(() => {
    const responder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: () => !!drag.current,
    onPanResponderMove: (_, g) => { if (drag.current) { drag.current.pointer = g.moveY; actions.current.updatePosition(); } },
    onPanResponderRelease: () => actions.current.finish(),
    onPanResponderTerminate: () => actions.current.finish(true),
    onPanResponderTerminationRequest: () => !drag.current,
    });
    const timer = setTimeout(() => setHandlers(responder), 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (dragging === undefined) return;
    const timer = setInterval(() => {
      const active = drag.current;
      if (!active) return;
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
  const order = from !== undefined && preview !== undefined ? moveItem(items, from, preview) : items;
  return <View style={{ flex: 1 }} {...handlers?.panHandlers} onTouchEnd={() => finish()}>
    <ScrollView ref={scroll} scrollEnabled={dragging === undefined} scrollEventThrottle={16}
      onLayout={() => scroll.current?.measureInWindow((_x, y, _w, h) => { bounds.current.top = y; bounds.current.height = h; })}
      onContentSizeChange={(_w, h) => { bounds.current.content = h; }}
      onScroll={(e) => { offset.current = e.nativeEvent.contentOffset.y; }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      {header}
      <Text style={[styles.small, { marginVertical: 12 }]}>タップで編集 · 長押しして並べ替え</Text>
      <View style={{ height: items.length * ROW }}>
        {items.map((item, index) => <OrderRow key={item.id} index={order.findIndex((v) => v.id === item.id)} dragging={dragging === item.id} dragY={dragY} reduced={reduced}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}、${item.detail}。タップで編集、長押しで並べ替え`}
            accessibilityActions={[{ name: 'increment', label: '下へ' }, { name: 'decrement', label: '上へ' }]}
            onAccessibilityAction={(e) => onMove(index, Math.max(0, Math.min(items.length - 1, index + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
            onPressIn={() => { suppressPress.current = false; }}
            onPress={() => { if (!suppressPress.current) onEdit(item.id); }} delayLongPress={280}
            onLongPress={(e) => {
              const y = e.nativeEvent.pageY;
              suppressPress.current = true;
              dragY.setValue(index * ROW); setFrom(index);
              drag.current = { from: index, to: index, id: item.id, origin: y, pointer: y, scroll: offset.current };
              setDragging(item.id); setPreview(index); feedback();
            }}>
            <Card style={{ height: ROW - 8, marginBottom: 0, padding: 14, borderColor: dragging === item.id ? colors.primary : colors.line }}>
              <View style={styles.row}><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.body, { fontWeight: '700' }]}>{item.name}</Text><Text style={styles.small}>{item.detail}</Text></View><Text style={{ color: colors.primary }}>›</Text></View>
            </Card>
          </Pressable>
        </OrderRow>)}
      </View>
      {footer}
    </ScrollView>
  </View>;
}

function OrderRow({ index, dragging, dragY, reduced, children }: { index: number; dragging: boolean; dragY: Animated.Value; reduced: boolean; children: ReactNode }) {
  const [y] = useState(() => new Animated.Value(index * ROW));
  useEffect(() => { if (!dragging) Animated.timing(y, { toValue: index * ROW, duration: reduced ? 0 : 150, useNativeDriver: true }).start(); }, [y, index, reduced, dragging]);
  return <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: dragging ? 10 : 0, elevation: dragging ? 8 : 0, transform: [{ translateY: dragging ? dragY : y }, { scale: dragging ? 1.02 : 1 }] }}>{children}</Animated.View>;
}
