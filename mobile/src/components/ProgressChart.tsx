import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../ui';

export function ProgressChart({
  points,
  unit = 'kg',
  compact = false,
  availableHeight,
}: {
  points: { date: string; value: number }[];
  unit?: 'kg' | '回';
  compact?: boolean;
  availableHeight?: number;
}) {
  const { colors, styles } = useTheme();
  const [width, setWidth] = useState(360);
  const [valueHeight, setValueHeight] = useState(24);
  const [hintHeight, setHintHeight] = useState(18);
  const adaptive = availableHeight !== undefined;
  const height = adaptive
    ? Math.max(100, Math.min(220, availableHeight - valueHeight - (points.length === 1 ? hintHeight : 0) - 8))
    : compact ? 140 : 240;
  // Use actual SVG dimensions for the home card, keeping labels at 11px.
  const plotWidth = adaptive ? width : 360;
  const plotHeight = adaptive ? height : 220;
  const left = 52;
  const right = plotWidth - 26;
  const top = 24;
  const bottom = plotHeight - 40;
  if (!points.length) return null;
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = Math.max((high - low) * 0.2, high * 0.02, 1);
  const intervals = adaptive ? Math.max(1, Math.min(4, Math.floor((bottom - top) / 24))) : 4;
  const desiredStep = Math.max(1, (high - low + padding * 2) / intervals);
  const magnitude = Math.pow(10, Math.floor(Math.log10(desiredStep)));
  const step = [1, 2, 5, 10]
    .map((value) => value * magnitude)
    .find((value) => value >= desiredStep)!;
  const minimum = Math.max(0, Math.floor((low - padding) / step) * step);
  const maximum = Math.max(minimum + step, Math.ceil((high + padding) / step) * step);
  const tickCount = Math.round((maximum - minimum) / step);
  const first = new Date(`${points[0].date}T12:00:00`).getTime();
  const span = Math.max(
    1,
    new Date(`${points[points.length - 1].date}T12:00:00`).getTime() - first,
  );
  const positions = points.map((point) => ({
    x:
      points.length === 1
        ? (left + right) / 2
        : left + ((new Date(`${point.date}T12:00:00`).getTime() - first) / span) * (right - left),
    y: bottom - ((point.value - minimum) / (maximum - minimum)) * (bottom - top),
  }));
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ marginVertical: compact ? 4 : 16 }}>
      <Text onLayout={(event) => setValueHeight(event.nativeEvent.layout.height)} style={[styles.body, { color: colors.primary, fontWeight: '700' }]}>
        {points[points.length - 1].value.toFixed(unit === '回' ? 0 : 1)} {unit}
      </Text>
      <View
        accessible
        accessibilityLabel={points
          .map((point) => `${point.date}：${point.value.toFixed(unit === '回' ? 0 : 1)}${unit}`)
          .join('、')}
      >
        <Svg width="100%" height={height} viewBox={`0 0 ${plotWidth} ${plotHeight}`}>
          <SvgText x={8} y={12} fill={colors.muted} fontSize={11}>
            {unit}
          </SvgText>
          {Array.from({ length: tickCount + 1 }, (_, tick) => {
            const y = bottom - (tick / tickCount) * (bottom - top);
            const value = minimum + step * tick;
            return (
              <React.Fragment key={tick}>
                <Line x1={left} x2={right} y1={y} y2={y} stroke={colors.line} />
                <SvgText x={44} y={y + 4} textAnchor="end" fill={colors.muted} fontSize={11}>
                  {value.toFixed(0)}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Line x1={left} x2={left} y1={top} y2={bottom} stroke={colors.muted} />
          <Line x1={left} x2={right} y1={bottom} y2={bottom} stroke={colors.muted} />
          {(points.length === 1 ? [0.5] : [0, 0.5, 1]).map((fraction) => {
            const date = new Date(first + span * fraction);
            const x = left + (right - left) * fraction;
            return (
              <React.Fragment key={fraction}>
                <Line x1={x} x2={x} y1={bottom} y2={bottom + 5} stroke={colors.muted} />
                <SvgText
                  x={x}
                  y={bottom + 21}
                  textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}
                  fill={colors.muted}
                  fontSize={11}
                >
                  {date.getMonth() + 1}/{date.getDate()}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Polyline
            points={positions.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
          />
          {positions.map((point, index) => (
            <Circle
              key={points[index].date}
              cx={point.x}
              cy={point.y}
              r={3}
              fill={colors.primary}
            />
          ))}
        </Svg>
      </View>
      {points.length === 1 && <Text onLayout={(event) => setHintHeight(event.nativeEvent.layout.height)} style={styles.small}>次の記録で比較できます。</Text>}
    </View>
  );
}
