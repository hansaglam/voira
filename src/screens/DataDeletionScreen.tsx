import React, { useState } from 'react';
import { Alert, Linking, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import { useLearning } from '../context/LearningContext';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius } from '../theme';

type Props = RootScreenProps<'DataDeletion'>;

const SUPPORT_EMAIL = 'support@echospeak.app';

export function DataDeletionScreen(_props: Props) {
  const { resetLocalPracticeData } = useLearning();
  const { isGuest } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  const openSupportEmail = () => {
    void Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=EchoSpeak%20Veri%20Silme%20Talebi`,
    );
  };

  const handleLocalReset = () => {
    Alert.alert(
      'Yerel verileri sıfırla',
      'Bu işlem cihazındaki pratik geçmişini, skorları ve günlük oturum kayıtlarını siler. Profil tercihlerin korunur. Geri alınamaz.',
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

  if (isGuest) {
    return (
      <InfoScreenLayout
        title="Veri silme bilgisi"
        subtitle="Misafir modu"
        sections={[
          {
            title: 'Misafir verileri',
            body:
              'Misafir modunda veriler bu cihazda tutulur. Hesap oluşturmadan pratik geçmişin, skorların ve oturum kayıtların yalnızca bu cihazda saklanır.',
          },
          {
            title: 'Yerel sıfırlama',
            body:
              'Aşağıdaki düğme ile yerel pratik verilerini sıfırlayabilirsin. Bu işlem profil tercihlerini silmez.',
          },
        ]}
        footer={
          <>
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
            <TouchableOpacity style={styles.supportButton} onPress={openSupportEmail} activeOpacity={0.85}>
              <Text style={styles.supportButtonText}>Destek ile iletişime geç</Text>
            </TouchableOpacity>
          </>
        }
      />
    );
  }

  return (
    <InfoScreenLayout
      title="Veri silme bilgisi"
      subtitle="Hesap ve veriler"
      sections={[
        {
          title: 'Hesap silme',
          body:
            'Veri silme talebi için destek ekibiyle iletişime geçebilirsin. Tam self-service hesap silme yakında eklenecek.',
        },
        {
          title: 'Yerel veriler',
          body:
            'Pratik geçmişi ve skorların bir kısmı cihazında da tutulabilir. Aşağıdaki düğme yalnızca yerel pratik verilerini sıfırlar.',
        },
        {
          title: 'Destek',
          body:
            'Gizlilik veya veri silme konusunda yardım için destek ekibine yazabilirsin.',
        },
      ]}
      footer={
        <>
          <TouchableOpacity style={styles.supportButton} onPress={openSupportEmail} activeOpacity={0.85}>
            <Text style={styles.supportButtonText}>Veri silme talebi gönder</Text>
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
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  resetButton: {
    marginTop: spacing.xs,
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
    marginTop: spacing.sm,
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
});
