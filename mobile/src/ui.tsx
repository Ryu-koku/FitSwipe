import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
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
  overlay,
  scrollOnlyWhenOverflow = false,
  headerShown = true,
}: PropsWithChildren<{
  title?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  scroll?: boolean;
  bottomDock?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  overlay?: React.ReactNode;
  scrollOnlyWhenOverflow?: boolean;
  headerShown?: boolean;
}>) {
  const { styles } = useTheme();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
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
      {headerShown && header}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          onLayout={scrollOnlyWhenOverflow ? (event) => setViewportHeight(event.nativeEvent.layout.height) : undefined}
          onContentSizeChange={scrollOnlyWhenOverflow ? (_, height) => setContentHeight(height) : undefined}
          scrollEnabled={!scrollOnlyWhenOverflow || contentHeight > viewportHeight + 1}
          bounces={!scrollOnlyWhenOverflow || contentHeight > viewportHeight + 1}
          contentContainerStyle={[styles.content, (!bottomDock || scrollOnlyWhenOverflow) && { paddingBottom: 24 }]}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
          {children}
        </View>
      )}
      {overlay}
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

const SheetDismissContext = createContext<{ onClose: () => void; dismiss: () => void } | null>(null);

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
  const sheetDismiss = useContext(SheetDismissContext);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={() => {
        feedback();
        if (sheetDismiss && onPress === sheetDismiss.onClose) sheetDismiss.dismiss();
        else onPress();
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
  bottomSheet = false,
  popup = false,
}: PropsWithChildren<{ title: string; onClose: () => void; scroll?: boolean; bottomSheet?: boolean; popup?: boolean }>) {
  const { styles, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheetOffset] = useState(() => new Animated.Value(0));
  const { height: windowHeight } = useWindowDimensions();
  const availableSheetHeight = windowHeight - insets.top - insets.bottom - 40;
  const [settledHeight, setSettledHeight] = useState(availableSheetHeight * 0.75);
  const [sheetHeight] = useState(() => new Animated.Value(availableSheetHeight * 0.75));
  const [entrance] = useState(() => new Animated.Value(bottomSheet ? windowHeight : 0));
  const [backdropOpacity] = useState(() => new Animated.Value(bottomSheet ? 0 : 1));
  const [closing, setClosing] = useState(false);
  const dismiss = useCallback(() => {
    if (!bottomSheet) { onClose(); return; }
    if (closing) return;
    setClosing(true);
    entrance.stopAnimation();
    Animated.parallel([
      Animated.timing(entrance, { toValue: windowHeight, duration: 240, useNativeDriver: false }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 240, useNativeDriver: false }),
    ]).start(({ finished }) => { if (finished) onClose(); else setClosing(false); });
  }, [bottomSheet, onClose, entrance, backdropOpacity, windowHeight, closing]);
  useEffect(() => {
    if (!bottomSheet) return;
    const animation = Animated.parallel([
      Animated.timing(entrance, { toValue: 0, duration: 240, useNativeDriver: false }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 240, useNativeDriver: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [bottomSheet, entrance, backdropOpacity]);
  const sheetPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => bottomSheet,
    onMoveShouldSetPanResponderCapture: (_, gesture) => bottomSheet && Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onMoveShouldSetPanResponder: (_, gesture) => bottomSheet && Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => { sheetOffset.stopAnimation(); sheetHeight.stopAnimation(); },
    onPanResponderMove: (_, gesture) => {
      const next = settledHeight - gesture.dy;
      const minimum = availableSheetHeight * 0.3;
      sheetHeight.setValue(Math.max(minimum, Math.min(availableSheetHeight, next)));
      sheetOffset.setValue(Math.max(0, minimum - next));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 100 || (gesture.dy > 40 && gesture.vy > 0.8)) {
        dismiss();
      } else {
        const height = gesture.dy < -40 ? availableSheetHeight
          : gesture.dy > 40 ? availableSheetHeight * 0.75 : settledHeight;
        setSettledHeight(height);
        Animated.timing(sheetHeight, { toValue: height, duration: 180, useNativeDriver: false }).start();
        Animated.spring(sheetOffset, { toValue: 0, useNativeDriver: false, overshootClamping: true }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.timing(sheetHeight, { toValue: settledHeight, duration: 160, useNativeDriver: false }).start();
      Animated.spring(sheetOffset, { toValue: 0, useNativeDriver: false, overshootClamping: true }).start();
    },
   }), [bottomSheet, dismiss, sheetOffset, sheetHeight, settledHeight, availableSheetHeight]);
  return (
    <Modal transparent animationType={popup ? 'fade' : bottomSheet ? 'none' : 'slide'} onRequestClose={dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          justifyContent: popup ? 'center' : 'flex-end',
          paddingTop: insets.top + 20,
          ...(popup ? { paddingHorizontal: 20, paddingBottom: insets.bottom + 20 } : {}),
        }}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#0007', opacity: backdropOpacity }]} />
        <Pressable
          accessibilityLabel="閉じる"
          onPress={dismiss}
          style={popup ? StyleSheet.absoluteFill : { flex: 1, minHeight: 20 }}
        />
        <Animated.View
          style={{
            maxHeight: bottomSheet ? availableSheetHeight : '90%',
            flexShrink: 0,
            transform: [{ translateY: Animated.add(sheetOffset, entrance) }],
            backgroundColor: colors.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            ...(popup ? { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 } : {}),
            overflow: 'hidden',
            paddingBottom: insets.bottom + 16,
            ...(bottomSheet ? { height: sheetHeight } : scroll ? {} : { height: '90%' }),
          }}
        >
          <View style={{ flexShrink: 0 }}>
          {bottomSheet && <View collapsable={false} {...sheetPan.panHandlers} style={{ height: 32, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <View accessible={false} style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line }} />
          </View>}
          {bottomSheet ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8 }}>
              <View collapsable={false} {...sheetPan.panHandlers} style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}>
                <Text pointerEvents="none" accessibilityRole="header" style={[styles.body, { fontSize: 22, fontWeight: '700' }]}>{title}</Text>
              </View>
              <IconButton label="閉じる" symbol="×" onPress={dismiss} />
            </View>
          ) : <View
            style={[styles.header, { paddingHorizontal: 20, paddingTop: 8 }]}
          >
            <Text style={[styles.title, { flex: 1 }]}>{title}</Text>
            <IconButton label="閉じる" symbol="×" onPress={onClose} />
          </View>}
          </View>
          {scroll ? <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
          >
            <SheetDismissContext.Provider value={{ onClose, dismiss }}>{children}</SheetDismissContext.Provider>
          </ScrollView> : <View style={{ flex: 1, minHeight: 0 }}><SheetDismissContext.Provider value={{ onClose, dismiss }}>{children}</SheetDismissContext.Provider></View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
