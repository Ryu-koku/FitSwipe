import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from './context';
import { AppIcon, symbolIcons } from './components/AppIcon';

const light = {
  ink: '#193039',
  muted: '#64777b',
  line: '#d5e2de',
  surface: '#ffffff',
  bg: '#f3f6f6',
  primary: '#087f79',
  soft: '#dcefeb',
  green: '#147c73',
  orange: '#b47731',
  red: '#ba1a1a',
};
const dark: typeof light = {
  ink: '#e2ecea',
  muted: '#a8bcb8',
  line: '#3a4d4b',
  surface: '#172326',
  bg: '#101a1c',
  primary: '#72d6c9',
  soft: '#0b554d',
  green: '#72d6c9',
  orange: '#f2bb71',
  red: '#ffb4ab',
};
type Palette = typeof light;

function makeStyles(c: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 104 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 56,
      paddingHorizontal: 16,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
      gap: 12,
    },
    title: { color: c.ink, fontWeight: '700', fontSize: 20, flexShrink: 1 },
    sectionTitle: {
      color: c.ink,
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 12,
      marginTop: 16,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.line,
    },
    button: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      borderRadius: 24,
      backgroundColor: c.primary,
      marginTop: 8,
    },
    buttonSecondary: { backgroundColor: c.soft },
    buttonText: {
      color: c === dark ? '#003731' : '#fff',
      fontWeight: '800',
      fontSize: 15,
    },
    buttonSecondaryText: { color: c.primary },
    pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
    disabled: { opacity: 0.4 },
    chip: {
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: c.soft,
      marginRight: 8,
      marginBottom: 8,
    },
    chipActive: { backgroundColor: c.primary },
    chipText: { color: c.primary, fontWeight: '700' },
    chipTextActive: { color: c === dark ? '#003731' : '#fff' },
    field: {
      borderColor: c.line,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      color: c.ink,
      backgroundColor: c.surface,
      marginVertical: 4,
      minWidth: 0,
      fontSize: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    wrap: { flexDirection: 'row', flexWrap: 'wrap' },
    muted: { color: c.muted },
    body: { color: c.ink, fontSize: 15, lineHeight: 23 },
    metric: { color: c.ink, fontSize: 25, fontWeight: '800' },
    metricLabel: { color: c.muted, fontSize: 12, marginTop: 4 },
    small: { color: c.muted, fontSize: 12, lineHeight: 18 },
    tab: { color: c.primary, fontWeight: '700', paddingVertical: 10 },
    divider: { height: 1, backgroundColor: c.line, marginVertical: 12 },
  });
}

const Theme = createContext({
  colors: light,
  styles: makeStyles(light),
  isDark: false,
});

export function ThemeProvider({ children }: PropsWithChildren) {
  const { state } = useApp();
  const system = useColorScheme();
  const isDark =
    state.themeMode === 'dark' ||
    (state.themeMode === 'system' && system === 'dark');
  const value = useMemo(
    () => ({
      colors: isDark ? dark : light,
      styles: makeStyles(isDark ? dark : light),
      isDark,
    }),
    [isDark],
  );
  return <Theme.Provider value={value}>{children}</Theme.Provider>;
}

export const useTheme = () => useContext(Theme);
export const feedback = () => {
  void Haptics.selectionAsync().catch(() => {});
};

export function Screen({
  children,
  title,
  right,
  onBack,
  scroll = true,
  bottomDock = true,
  onRefresh,
  refreshing = false,
}: PropsWithChildren<{
  title?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  scroll?: boolean;
  bottomDock?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}>) {
  const { styles } = useTheme();
  const header = (
    <View style={styles.header}>
      {onBack && <IconButton label="戻る" symbol="‹" onPress={onBack} />}
      <Text style={[styles.title, { flex: 1 }]}>{title ?? 'FitSwipe'}</Text>
      {right}
    </View>
  );
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {header}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, !bottomDock && { paddingBottom: 24 }]}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { styles } = useTheme();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { styles } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={() => {
        feedback();
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.buttonText, secondary && styles.buttonSecondaryText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  label,
  symbol,
  onPress,
  disabled = false,
}: {
  label: string;
  symbol: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        feedback();
        onPress();
      }}
      style={{
        minWidth: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {symbolIcons[symbol] ? <AppIcon name={symbolIcons[symbol]} color={colors.primary} /> : <Text style={{ color: colors.primary, fontSize: 24 }}>{symbol}</Text>}
    </Pressable>
  );
}

export function Chip({
  label,
  onPress,
  active = false,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const { styles } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        feedback();
        onPress();
      }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  label,
  keyboardType = 'default',
  maxLength,
  onFocus,
  onBlur,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'number-pad';
  maxLength?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const { styles, colors } = useTheme();
  return (
    <View style={{ flexGrow: 1, flexShrink: 1 }}>
      {label && <Text style={styles.small}>{label}</Text>}
      <TextInput
        accessibilityLabel={label ?? placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onFocus={onFocus}
        onBlur={onBlur}
        style={styles.field}
      />
    </View>
  );
}

// Keep an in-progress decimal such as "2." while persisting numeric values.
export function NumberField({
  label,
  value,
  onChange,
  integer = false,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  integer?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  return (
    <Field
      label={label}
      value={focused ? draft : String(value ?? '')}
      keyboardType={integer ? 'number-pad' : 'decimal-pad'}
      onFocus={() => {
        setDraft(String(value ?? ''));
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChangeText={(raw) => {
        const text = raw.replace(',', '.');
        if (
          !(integer ? /^\d*$/ : /^\d*(\.\d{0,2})?$/).test(text) ||
          text.length > 9
        )
          return;
        setDraft(text);
        onChange(
          text.trim() && Number.isFinite(Number(text))
            ? Number(text)
            : undefined,
        );
      }}
    />
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  const { styles } = useTheme();
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Sheet({
  title,
  children,
  onClose,
  scroll = true,
}: PropsWithChildren<{ title: string; onClose: () => void; scroll?: boolean }>) {
  const { styles, colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: '#0007',
          justifyContent: 'flex-end',
          paddingTop: insets.top + 20,
        }}
      >
        <Pressable
          accessibilityLabel="閉じる"
          onPress={onClose}
          style={{ flex: 1, minHeight: 20 }}
        />
        <View
          style={{
            maxHeight: '90%',
            backgroundColor: colors.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: insets.bottom + 16,
            ...(scroll ? {} : { height: '90%' }),
          }}
        >
          <View
            style={[styles.header, { paddingHorizontal: 20, paddingTop: 8 }]}
          >
            <Text style={[styles.title, { flex: 1 }]}>{title}</Text>
            <IconButton label="閉じる" symbol="×" onPress={onClose} />
          </View>
          {scroll ? <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
          >
            {children}
          </ScrollView> : children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
