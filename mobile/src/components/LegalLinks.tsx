import React from 'react';
import { View } from 'react-native';
import { Button } from '../ui';
import { openLegalUrl } from '../community-consent';
import { legalUrls } from '../legal';

export function LegalLinks() {
  return <View>
    <Button label="プライバシーポリシー" secondary onPress={() => void openLegalUrl(legalUrls.privacy)} />
    <Button label="利用規約" secondary onPress={() => void openLegalUrl(legalUrls.terms)} />
    <Button label="お問い合わせ" secondary onPress={() => void openLegalUrl(legalUrls.support)} />
    <Button label="Webからアカウント削除を依頼" secondary onPress={() => void openLegalUrl(legalUrls.deletion)} />
  </View>;
}
