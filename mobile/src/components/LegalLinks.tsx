import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { feedback, Button, useTheme } from '../ui';
import { openLegalUrl } from '../community-consent';
import { legalUrls } from '../legal';

export function LegalLinks({ compact = false, children }: React.PropsWithChildren<{ compact?: boolean }>) {
  const { colors, styles } = useTheme();
  if (compact) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 6 }}>
    {children}
    {children && <Text style={styles.small}>·</Text>}
    <Pressable accessibilityRole="link" onPress={() => { feedback(); return void openLegalUrl(legalUrls.terms); }} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={[styles.small, { color: colors.primary }]}>利用規約</Text>
    </Pressable>
    <Text style={styles.small}>·</Text>
    <Pressable accessibilityRole="link" onPress={() => { feedback(); return void openLegalUrl(legalUrls.privacy); }} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={[styles.small, { color: colors.primary }]}>プライバシー</Text>
    </Pressable>
  </View>;
  return <View>
    <Button label="プライバシーポリシー" secondary onPress={() => void openLegalUrl(legalUrls.privacy)} />
    <Button label="利用規約" secondary onPress={() => void openLegalUrl(legalUrls.terms)} />
    <Button label="お問い合わせ" secondary onPress={() => void openLegalUrl(legalUrls.support)} />
    <Button label="Webからアカウント削除を依頼" secondary onPress={() => void openLegalUrl(legalUrls.deletion)} />
  </View>;
}
