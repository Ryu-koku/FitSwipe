import React, { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export const colors = { ink: '#17212b', muted: '#70808f', line: '#e2e8ef', surface: '#ffffff', bg: '#f4f7fa', blue: '#2867d9', green: '#138a5b', orange: '#d97706', red: '#c53b3b' };

export function Screen({ children, title, right }: PropsWithChildren<{ title?: string; right?: React.ReactNode }>) {
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Text style={styles.title}>{title ?? 'FitLog Solo'}</Text>{right}</View>{children}
  </ScrollView>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) { return <View style={[styles.card, style]}>{children}</View>; }
export function Button({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{label}</Text></Pressable>;
}
export function Chip({ label, onPress, active = false }: { label: string; onPress: () => void; active?: boolean }) { return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>; }
export function Field({ value, onChangeText, placeholder, keyboardType = 'default' }: { value: string; onChangeText: (text: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' }) { return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} style={styles.field} />; }
export function SectionTitle({ children }: PropsWithChildren) { return <Text style={styles.sectionTitle}>{children}</Text>; }
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, content: { padding: 18, paddingBottom: 40 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, title: { color: colors.ink, fontWeight: '800', fontSize: 28 }, sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 10, marginTop: 16 }, card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line }, button: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderRadius: 13, backgroundColor: colors.blue, marginTop: 8 }, buttonSecondary: { backgroundColor: '#e8eef8' }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 }, buttonSecondaryText: { color: colors.blue }, pressed: { opacity: 0.7 }, disabled: { opacity: 0.45 }, chip: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: '#e8eef8', marginRight: 8, marginBottom: 8 }, chipActive: { backgroundColor: colors.blue }, chipText: { color: colors.blue, fontWeight: '700' }, chipTextActive: { color: '#fff' }, field: { borderColor: colors.line, borderWidth: 1, borderRadius: 10, padding: 11, color: colors.ink, backgroundColor: '#fff', marginVertical: 4 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, muted: { color: colors.muted }, body: { color: colors.ink, fontSize: 15, lineHeight: 22 }, metric: { color: colors.ink, fontSize: 21, fontWeight: '800' }, metricLabel: { color: colors.muted, fontSize: 12, marginTop: 3 }, small: { color: colors.muted, fontSize: 12 }, tab: { color: colors.blue, fontWeight: '700', paddingVertical: 10 }, divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 }, square: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.blue, marginRight: 6 },
});
