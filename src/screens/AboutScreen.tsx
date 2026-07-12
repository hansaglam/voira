import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import { VoiraLogo } from '../components/VoiraLogo';
import { colors, spacing, typography } from '../theme';

type Props = RootScreenProps<'About'>;

const APP_VERSION = '1.0.8';

export function AboutScreen(_props: Props) {
  return (
    <InfoScreenLayout
      title="Voira hakkında"
      subtitle="Konuş, analiz al, geliş."
      header={<VoiraLogo size={112} />}
      sections={[
        {
          title: 'Voira nedir?',
          body:
            'Voira, İngilizce konuşmanı analiz eden, telaffuzunu ölçen ve zayıf kelimelerini Türkçe açıklamalarla geliştirmene yardımcı olan AI konuşma koçudur.',
        },
        {
          title: 'MVP sürümü',
          body:
            'Bu sürüm erken erişim (MVP) niteliğindedir. Konuşma analizi kelime eşleşmesi, Azure telaffuz değerlendirmesi ve akıcılık ölçümlerine dayanır.',
        },
        {
          title: 'SpeakPlus',
          body:
            'SpeakPlus, uygulama içi abonelik ile sunulan premium ders paketleri ve gelişmiş geri bildirimlerdir. Satın alımları Profil veya paywall ekranından geri yükleyebilirsin.',
        },
        {
          title: 'İletişim',
          body: 'Destek: support@echospeak.app',
        },
      ]}
      footer={<Text style={styles.footerVersion}>Voira v{APP_VERSION}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  footerVersion: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
