import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { feedback, Sheet, useTheme } from '../ui';
import { usePremium } from '../premium-context';
import { AppIcon } from './AppIcon';
import { LegalLinks } from './LegalLinks';

export function Paywall({ reason, onClose }: { reason?: string; onClose: () => void }) {
  const { styles, colors } = useTheme();
  const plan = usePremium();
  const disabled = plan.busy || plan.premium || !!plan.unavailableReason;
  const trial = plan.freeTrial;
  const subscribeLabel = plan.plan === 'lifetime' ? '買い切りで購入' : trial ? `${trial.label}無料で始める` : 'プレミアムに登録';
  const accent = colors.primary;
  const onAccent = styles.buttonText.color;
  return <Sheet title="Premium にアップグレード" onClose={onClose} fullScreen closeOnly>
    <View style={layout.content}>
      <View style={layout.hero}>
        <View style={layout.premiumTitle}>
          <AppIcon name="crown" color={accent} size={20} />
          <Text style={[layout.premiumLabel, { color: accent }]}>Premium にアップグレード</Text>
        </View>
        <Text accessibilityRole="header" style={[layout.headline, { color: colors.ink }]}>制限なしでトレーニングを続けよう</Text>
        {reason && <Text style={[styles.small, layout.reason, { color: colors.red }]}>{reason}</Text>}
        <View style={layout.benefits}>
          {['プリセット無制限', '自作種目無制限', 'ルーム作成無制限'].map(benefit => <View key={benefit} style={layout.benefit}>
            <AppIcon name="check" color={accent} size={20} />
            <Text style={styles.body}>{benefit}</Text>
          </View>)}
        </View>
      </View>
      <View style={layout.plans}>
        {plan.plans.map(option => {
          const selected = plan.plan === option;
          const monthly = option === 'monthly';
          const title = monthly ? 'プレミアムプラン' : '買い切りプラン';
          return <Pressable key={option}
            accessibilityRole="radio"
            accessibilityLabel={`${title}、${selected ? '選択済み' : '未選択'}`}
            accessibilityState={{ checked: selected, disabled: plan.busy }}
            disabled={plan.busy}
            onPress={() => { feedback(); plan.setPlan(option); }}
            style={[layout.plan, { borderColor: selected ? accent : colors.line, backgroundColor: colors.surface }]}
          >
            <View style={layout.planDetails}>
              <View style={layout.description}>
                <View style={layout.titleRow}>
                  <Text style={[layout.planTitle, { color: colors.ink }]}>{title}</Text>
                  {monthly && <View style={[layout.badge, { backgroundColor: accent }]}>
                    <Text style={[layout.badgeText, { color: onAccent }]}>{trial ? 'はじめての方' : '一番人気'}</Text>
                  </View>}
                </View>
                {monthly && trial && <Text style={[layout.trial, { color: accent }]}>{trial.headline}</Text>}
                <Text style={[layout.price, { color: selected ? accent : colors.ink }]}>
                  {monthly ? plan.monthlyPrice : plan.lifetimePrice}
                  <Text style={[layout.period, { color: colors.muted }]}>{monthly ? (plan.monthlyPrice !== '月額300円' ? ' / 月' : '') : '（買い切り）'}</Text>
                </Text>
                {!monthly && <Text style={styles.small}>一度の購入でずっと無制限</Text>}
              </View>
              <View style={[layout.check, { borderColor: selected ? accent : colors.line, backgroundColor: selected ? accent : colors.surface }]}>
                {selected && <AppIcon name="check" color={onAccent} size={20} />}
              </View>
            </View>
          </Pressable>;
        })}
      </View>
      <View style={layout.footer}>
        {plan.premium && <Text style={styles.body}>プレミアムをご利用中です。</Text>}
        {plan.unavailableReason && <Text style={styles.small}>{plan.unavailableReason}</Text>}
        {plan.error && <Text accessibilityRole="alert" style={styles.body}>{plan.error}</Text>}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={plan.busy ? '処理中…' : subscribeLabel}
          accessibilityState={{ disabled, busy: plan.busy }}
          disabled={disabled}
          onPress={() => { feedback(); void plan.purchase(); }}
          style={({ pressed }) => [layout.subscribe, { backgroundColor: accent }, disabled && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={[layout.subscribeText, { color: onAccent }]}>{plan.busy ? '処理中…' : subscribeLabel}</Text>
          <AppIcon name="next" color={onAccent} size={24} />
        </Pressable>
        <Text style={[styles.small, layout.notice]}>{plan.plan === 'lifetime' ? '一度のお支払いで、以降の更新料はかかりません。' : `${trial ? `初回限定。無料期間後は${plan.monthlyPrice}/月で自動更新。` : '毎月自動更新。'}解約はストアから。保存データは解約後も利用可。`}</Text>
        <LegalLinks compact>
          <Pressable accessibilityRole="button" accessibilityLabel="購入を復元" accessibilityState={{ disabled: plan.busy }} disabled={plan.busy} onPress={() => { feedback(); void plan.restore(); }} style={({ pressed }) => [layout.restore, plan.busy && styles.disabled, pressed && styles.pressed]}>
            <Text style={[styles.small, { color: colors.primary }]}>購入を復元</Text>
          </Pressable>
        </LegalLinks>
      </View>
    </View>
  </Sheet>;
}

const layout = StyleSheet.create({
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingTop: 56, gap: 10 },
  premiumTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  premiumLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  hero: { alignItems: 'center', gap: 8 },
  headline: { fontSize: 21, lineHeight: 29, fontWeight: '800', textAlign: 'center' },
  benefits: { gap: 4 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reason: { textAlign: 'center', fontWeight: '700' },
  plans: { gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  trial: { fontSize: 17, fontWeight: '800' },
  plan: { borderWidth: 2, borderRadius: 20, padding: 12 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  planTitle: { fontSize: 17, fontWeight: '800' },
  planDetails: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  description: { flex: 1, gap: 4 },
  price: { fontSize: 23, fontWeight: '800' },
  period: { fontSize: 17, fontWeight: '400' },
  check: { borderWidth: 2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  footer: { gap: 8 },
  subscribe: { minHeight: 52, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  subscribeText: { fontSize: 17, fontWeight: '800', flexShrink: 1 },
  notice: { textAlign: 'center' },
  restore: { minHeight: 44, justifyContent: 'center' },
});
