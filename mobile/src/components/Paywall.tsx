import React from 'react';
import { Text } from 'react-native';
import { Button, Sheet, useTheme } from '../ui';
import { usePremium } from '../premium-context';
import { LegalLinks } from './LegalLinks';

export function Paywall({ reason, onClose }: { reason?: string; onClose: () => void }) {
  const { styles } = useTheme();
  const plan = usePremium();
  return <Sheet title="FitSwipe プレミアム" onClose={onClose}>
    {reason && <Text style={styles.body}>{reason}</Text>}
    <Text style={styles.body}>プリセット無制限・自作種目無制限・ルーム作成無制限</Text>
    <Text style={styles.sectionTitle}>{plan.price}{plan.price !== '月額300円' ? ' / 月' : ''}</Text>
    <Text style={styles.small}>サブスクリプションは毎月自動更新されます。解約はストアのサブスクリプション管理から行えます。解約後も保存済みデータは消えず、編集・利用・削除できます。</Text>
    {plan.premium && <Text style={styles.body}>プレミアムをご利用中です。</Text>}
    {plan.unavailableReason && <Text style={styles.small}>{plan.unavailableReason}</Text>}
    {plan.error && <Text accessibilityRole="alert" style={styles.body}>{plan.error}</Text>}
    <Button label={plan.busy ? '処理中…' : 'プレミアムに登録'} disabled={plan.busy || plan.premium || !!plan.unavailableReason} onPress={() => { void plan.purchase(); }} />
    <Button label="購入を復元" secondary disabled={plan.busy} onPress={() => { void plan.restore(); }} />
    <LegalLinks />
  </Sheet>;
}
