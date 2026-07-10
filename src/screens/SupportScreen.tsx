import React from 'react';
import { Linking, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import { colors, spacing, borderRadius } from '../theme';

type Props = RootScreenProps<'Support'>;

const SUPPORT_EMAIL = 'support@echospeak.app';

export function SupportScreen(_props: Props) {
  const openEmail = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=EchoSpeak%20Destek`);
  };

  return (
    <InfoScreenLayout
      title="Destek"
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
          body: 'MVP döneminde destek yanıtları birkaç iş günü içinde verilmeye çalışılır.',
        },
      ]}
      footer={
        <TouchableOpacity style={styles.emailButton} onPress={openEmail} activeOpacity={0.85}>
          <Text style={styles.emailButtonText}>E-posta gönder</Text>
        </TouchableOpacity>
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
});
