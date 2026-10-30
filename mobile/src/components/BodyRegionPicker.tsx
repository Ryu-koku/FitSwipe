import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../ui';

const regions = [
  { name: '肩', front: 'M44 55Q29 55 26 76L43 80L50 62ZM76 55Q91 55 94 76L77 80L70 62Z', back: 'M44 55Q29 55 26 76L43 80L50 62ZM76 55Q91 55 94 76L77 80L70 62Z' },
  { name: '胸', front: 'M49 57L60 61L71 57L78 80L72 96L60 92L48 96L42 80Z' },
  { name: '背中', back: 'M49 57L60 61L71 57L78 80L70 119L60 127L50 119L42 80Z' },
  { name: '腹', front: 'M48 99L60 95L72 99L69 130L60 140L51 130Z' },
  { name: '腕', front: 'M25 80L41 84L34 111L28 140L16 137L20 108ZM79 84L95 80L100 108L104 137L92 140L86 111Z', back: 'M25 80L41 84L34 111L28 140L16 137L20 108ZM79 84L95 80L100 108L104 137L92 140L86 111Z' },
  { name: '脚', front: 'M50 136L60 145L70 136L79 157L73 194L70 234L57 234L58 192L60 164L62 192L63 234L50 234L47 194L41 157Z', back: 'M50 124L60 131L70 124L79 157L73 194L70 234L57 234L58 192L60 164L62 192L63 234L50 234L47 194L41 157Z' },
];

export function BodyRegionPicker({ onSelect }: { onSelect: (group: string) => void }) {
  const { colors } = useTheme();
  return <View style={{ alignItems: 'center', marginVertical: 12 }}>
    <Svg width="100%" height={300} viewBox="0 0 280 270">
      {(['front', 'back'] as const).map((side, index) => <G key={side} transform={`translate(${index * 140 + 10}, 0)`}>
        <SvgText x={60} y={15} textAnchor="middle" fill={colors.muted} fontSize={12}>{side === 'front' ? '正面' : '背面'}</SvgText>
        <Circle cx={60} cy={36} r={14} fill={colors.line} />
        <Path d="M54 49H66V58H54Z" fill={colors.line} />
        {regions.map((region) => {
          const d = side === 'front' ? region.front : 'back' in region ? region.back : undefined;
          return d ? <Path key={region.name} d={d} fill={colors.soft} stroke={colors.primary} strokeWidth={1.2}
            accessible accessibilityLabel={region.name} onPress={() => onSelect(region.name)} /> : null;
        })}
        <SvgText x={60} y={side === 'front' ? 80 : 90} textAnchor="middle" fill={colors.primary} fontSize={11} pointerEvents="none">{side === 'front' ? '胸' : '背中'}</SvgText>
        {side === 'front' && <SvgText x={60} y={117} textAnchor="middle" fill={colors.primary} fontSize={11} pointerEvents="none">腹</SvgText>}
        <SvgText x={32} y={71} textAnchor="middle" fill={colors.primary} fontSize={9} pointerEvents="none">肩</SvgText>
        <SvgText x={26} y={113} textAnchor="middle" fill={colors.primary} fontSize={10} pointerEvents="none">腕</SvgText>
        <SvgText x={52} y={184} textAnchor="middle" fill={colors.primary} fontSize={11} pointerEvents="none">脚</SvgText>
      </G>)}
    </Svg>
  </View>;
}
