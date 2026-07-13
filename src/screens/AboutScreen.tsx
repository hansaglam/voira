import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import { VoiraLogo } from '../components/VoiraLogo';
import {
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  TERMS_OF_USE_URL,
} from '../constants/legalLinks';
import { openExternalLink } from '../utils/openExternalLink';
import { colors, spacing, typography, borderRadius } from '../theme';

type Props = RootScreenProps<'About'>;

const APP_VERSION = '1.0.11';

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
          title: 'Bu sürüm',
          body:
            'Konuşma analizi kelime eşleşmesi, Azure telaffuz değerlendirmesi ve akıcılık ölçümlerine dayanır. Skorlar rehber niteliğindedir; resmi dil sertifikası yerine geçmez.',
        },
        {
          title: 'SpeakPlus',
          body:
            'SpeakPlus, uygulama içi abonelik ile sunulan premium ders paketleri ve gelişmiş geri bildirimlerdir. Ödemeler Google Play üzerinden yapılır; satın alımları Profil veya paywall ekranından geri yükleyebilirsin.',
        },
        {
          title: 'İletişim ve yasal',
          body: `StudioWebia\nVoira Destek: ${SUPPORT_EMAIL}\nGizlilik Politikası ve Kullanım Şartları web sayfalarından okunabilir.`,
        },
      ]}
      footer={
        <>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => void openExternalLink(PRIVACY_POLICY_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.linkButtonText}>Gizlilik Politikası</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => void openExternalLink(TERMS_OF_USE_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.linkButtonText}>Kullanım Şartları</Text>
          </TouchableOpacity>
          <Text style={styles.footerVersion}>Voira v{APP_VERSION}</Text>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  linkButton: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(91, 95, 239, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.22)',
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  footerVersion: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
