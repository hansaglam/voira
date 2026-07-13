import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import {
  DATA_DELETION_URL,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
} from '../constants/legalLinks';
import { openExternalLink } from '../utils/openExternalLink';
import { colors, spacing, borderRadius } from '../theme';

type Props = RootScreenProps<'Support'>;

export function SupportScreen(_props: Props) {
  const openEmail = () => {
    void openExternalLink(`${SUPPORT_MAILTO}?subject=Voira%20Destek`);
  };

  return (
    <InfoScreenLayout
      title="Voira Destek"
      subtitle="Yardıma mı ihtiyacın var?"
      sections={[
        {
          title: 'E-posta',
          body: `${SUPPORT_EMAIL}\n\nSorununu kısaca anlat; cihaz modeli ve uygulama sürümünü eklemen yardımcı olur.`,
        },
        {
          title: 'Sık konular',
          body:
            '• Mikrofon izni verilmiyor veya kayıt başlamıyor\n• Analiz çalışmıyor veya “Analiz yapılamadı” mesajı\n• Ders sesi çalmıyor veya ses dosyası eksik\n• SpeakPlus / satın alma veya abonelik geri yükleme\n• Veri silme ve gizlilik',
        },
        {
          title: 'Yanıt süresi',
          body: 'Destek yanıtları birkaç iş günü içinde verilmeye çalışılır.',
        },
      ]}
      footer={
        <>
          <TouchableOpacity style={styles.emailButton} onPress={openEmail} activeOpacity={0.85}>
            <Text style={styles.emailButtonText}>E-posta gönder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => void openExternalLink(PRIVACY_POLICY_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryLinkText}>Gizlilik Politikası</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => void openExternalLink(DATA_DELETION_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryLinkText}>Veri silme bilgisi</Text>
          </TouchableOpacity>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  emailButton: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(91, 95, 239, 0.14)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.28)',
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  emailButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  secondaryLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
