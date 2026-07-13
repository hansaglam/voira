import React, { useState } from 'react';
import { Alert, Linking, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import { useLearning } from '../context/LearningContext';
import { useAuth } from '../context/AuthContext';
import {
  DATA_DELETION_MAILTO,
  DATA_DELETION_URL,
  SUPPORT_EMAIL,
} from '../constants/legalLinks';
import { colors, spacing, borderRadius } from '../theme';

type Props = RootScreenProps<'DataDeletion'>;

export function DataDeletionScreen(_props: Props) {
  const { resetLocalPracticeData } = useLearning();
  const { isGuest } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  const openSupportEmail = () => {
    void Linking.openURL(DATA_DELETION_MAILTO);
  };

  const handleLocalReset = () => {
    Alert.alert(
      'Yerel verileri sıfırla',
      'Bu işlem cihazındaki pratik geçmişini, skorları ve günlük oturum kayıtlarını siler. Profil tercihlerin korunur. Geri alınamaz. Aktif bir Google Play aboneliğini iptal etmez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            setIsResetting(true);
            try {
              resetLocalPracticeData();
              Alert.alert('Tamamlandı', 'Yerel pratik verilerin sıfırlandı.');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ],
    );
  };

  const sharedFooter = (
    <>
      <TouchableOpacity style={styles.supportButton} onPress={openSupportEmail} activeOpacity={0.85}>
        <Text style={styles.supportButtonText}>
          {isGuest ? 'Destek ile iletişime geç' : 'Veri silme talebi gönder'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleLocalReset}
        disabled={isResetting}
        activeOpacity={0.85}
      >
        {isResetting ? (
          <ActivityIndicator color={colors.error} />
        ) : (
          <Text style={styles.resetButtonText}>Yerel pratik verilerini sıfırla</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.webLink}
        onPress={() => void Linking.openURL(DATA_DELETION_URL)}
        activeOpacity={0.85}
      >
        <Text style={styles.webLinkText}>Veri silme sayfasını aç (web)</Text>
      </TouchableOpacity>
    </>
  );

  if (isGuest) {
    return (
      <InfoScreenLayout
        title="Veri silme"
        subtitle="Misafir modu — Voira"
        sections={[
          {
            title: 'Misafir verileri',
            body:
              'Misafir modunda pratik geçmişi, skorlar ve oturum kayıtları bu cihazda tutulur. Hesap oluşturmadan bulut hesabı verisi oluşmayabilir.',
          },
          {
            title: 'Yerel sıfırlama',
            body:
              'Aşağıdaki düğme ile yerel pratik verilerini sıfırlayabilirsin. Bu işlem profil tercihlerini silmez ve Google Play aboneliğini iptal etmez.',
          },
          {
            title: 'Hesap / bulut silme talebi',
            body: `Hesap oluşturduysan veya ek silme talebin varsa ${SUPPORT_EMAIL} adresine “Voira Data Deletion Request” konusuyla yaz. Hesap e-postanı ekle.`,
          },
        ]}
        footer={sharedFooter}
      />
    );
  }

  return (
    <InfoScreenLayout
      title="Veri silme"
      subtitle="Hesap ve veriler — Voira"
      sections={[
        {
          title: 'Nasıl talep edilir?',
          body: `1) ${SUPPORT_EMAIL} adresine e-posta gönder\n2) Konu: Voira Data Deletion Request\n3) Uygulamada kullandığın hesap e-postasını yaz`,
        },
        {
          title: 'Silinebilecekler',
          body:
            'Hesapla ilişkili veriler; saklanıyorsa ilerleme, kaydedilen kelimeler ve analiz geçmişi. Yerel pratik verilerini aşağıdaki düğmeyle de sıfırlayabilirsin.',
        },
        {
          title: 'Kalabilecekler',
          body:
            'Google Play / RevenueCat işlem veya entitlement kayıtları (yasal / muhasebe / güvenlik), kimliği belli olmayan günlükler ve yalnızca cihazında kalan veriler (uygulama verisi temizlenene veya uygulama kaldırılana kadar).',
        },
        {
          title: 'Abonelik notu',
          body:
            'Veri silme, Google Play aboneliğini iptal etmez. SpeakPlus’ı durdurmak için Google Play → Ödemeler ve abonelikler üzerinden iptal et.',
        },
      ]}
      footer={sharedFooter}
    />
  );
}

const styles = StyleSheet.create({
  resetButton: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.24)',
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
  supportButton: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(91, 95, 239, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.22)',
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  webLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  webLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
