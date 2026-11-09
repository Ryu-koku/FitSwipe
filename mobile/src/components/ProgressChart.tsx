import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../ui';

export function ProgressChart({
  points,
  unit = 'kg',
  compact = false,
}: {
  points: { date: string; value: number }[];
  unit?: 'kg' | '回';
  compact?: boolean;
}) {
  const { colors, styles } = useTheme();
  if (!points.length) return null;
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = Math.max((high - low) * 0.2, high * 0.02, 1);
  const desiredStep = Math.max(1, (high - low + padding * 2) / 4);
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
        ? 193
        : 52 + ((new Date(`${point.date}T12:00:00`).getTime() - first) / span) * 282,
    y: 180 - ((point.value - minimum) / (maximum - minimum)) * 156,
  }));
  return (
    <View style={{ marginVertical: compact ? 4 : 16 }}>
      <Text style={[styles.body, { color: colors.primary, fontWeight: '700' }]}>
        {points[points.length - 1].value.toFixed(unit === '回' ? 0 : 1)} {unit}
      </Text>
      <View
        accessible
        accessibilityLabel={points
          .map((point) => `${point.date}：${point.value.toFixed(unit === '回' ? 0 : 1)}${unit}`)
          .join('、')}
      >
        <Svg width="100%" height={compact ? 140 : 240} viewBox="0 0 360 220">
          <SvgText x={8} y={12} fill={colors.muted} fontSize={11}>
            {unit}
          </SvgText>
          {Array.from({ length: tickCount + 1 }, (_, tick) => {
            const y = 180 - (tick / tickCount) * 156;
            const value = minimum + step * tick;
            return (
              <React.Fragment key={tick}>
                <Line x1={52} x2={334} y1={y} y2={y} stroke={colors.line} />
                <SvgText x={44} y={y + 4} textAnchor="end" fill={colors.muted} fontSize={11}>
                  {value.toFixed(0)}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Line x1={52} x2={52} y1={24} y2={180} stroke={colors.muted} />
          <Line x1={52} x2={334} y1={180} y2={180} stroke={colors.muted} />
          {(points.length === 1 ? [0.5] : [0, 0.5, 1]).map((fraction) => {
            const date = new Date(first + span * fraction);
            const x = 52 + 282 * fraction;
            return (
              <React.Fragment key={fraction}>
                <Line x1={x} x2={x} y1={180} y2={185} stroke={colors.muted} />
                <SvgText
                  x={x}
                  y={201}
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
      {points.length === 1 && <Text style={styles.small}>次の記録で比較できます。</Text>}
      <Text style={styles.small}>変化が見やすいよう、縦軸の範囲を調整しています。</Text>
    </View>
  );
}
