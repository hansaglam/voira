import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import { showAppConfirm, showAppFeedback } from '../components/dialog';
import { useLearning } from '../context/LearningContext';
import { useAuth } from '../context/AuthContext';
import {
  DATA_DELETION_MAILTO,
  DATA_DELETION_URL,
  SUPPORT_EMAIL,
} from '../constants/legalLinks';
import {
  getDataDeletionLocalResetMessage,
  getDataDeletionMayRemainBody,
  getDataDeletionSpeakPlusNote,
  getDataDeletionSubscriptionNote,
} from '../utils/billingCopy';
import { openExternalLink } from '../utils/openExternalLink';
import { colors, spacing, borderRadius } from '../theme';

type Props = RootScreenProps<'DataDeletion'>;

export function DataDeletionScreen(_props: Props) {
  const { resetLocalPracticeData } = useLearning();
  const { isGuest } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  const openSupportEmail = () => {
    void openExternalLink(DATA_DELETION_MAILTO);
  };

  const handleLocalReset = () => {
    showAppConfirm({
      title: 'Yerel verileri sıfırla',
      message: getDataDeletionLocalResetMessage(),
      destructive: true,
      confirmLabel: 'Sıfırla',
      cancelLabel: 'Vazgeç',
      onConfirm: () => {
        setIsResetting(true);
        try {
          resetLocalPracticeData();
          showAppFeedback({
            title: 'Tamamlandı',
            message: 'Yerel pratik verilerin sıfırlandı.',
            variant: 'success',
          });
        } finally {
          setIsResetting(false);
        }
      },
    });
  };

  const sharedFooter = (
    <>
      <TouchableOpacity style={styles.supportButton} onPress={openSupportEmail} activeOpacity={0.85}>
        <Text style={styles.supportButtonText}>Veri silme talebi e-postası gönder</Text>
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
          <Text style={styles.resetButtonText}>Yalnızca yerel pratik verilerini sıfırla</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.webLink}
        onPress={() => void openExternalLink(DATA_DELETION_URL)}
        activeOpacity={0.85}
      >
        <Text style={styles.webLinkText}>Veri silme sayfasını aç (web)</Text>
      </TouchableOpacity>
    </>
  );

  const requestSection = {
    title: 'Hesap ve veri silme talebi',
    body: `Hesap ve veri silme talebi için Voira Destek’e (${SUPPORT_EMAIL}) yazabilirsin. Uygulamada kullandığın e-posta adresini ekle. Konu: Voira Data Deletion Request. Bu otomatik tek dokunuşla silme değildir; talebin doğrulanarak işlenir.`,
  };

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
              'Aşağıdaki düğme yalnızca bu cihazdaki yerel pratik verilerini sıfırlar. Hesap silme değildir ve mağaza aboneliğini iptal etmez.',
          },
          requestSection,
          {
            title: 'Abonelik notu',
            body: getDataDeletionSubscriptionNote(),
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
        requestSection,
        {
          title: 'Doğrulama sonrası',
          body:
            'Doğrulanmış bir silme talebinden sonra, yasal / güvenlik / dolandırıcılık önleme / işlem kaydı zorunlulukları saklı kalmak üzere hesabınla ilişkili veriler silinir veya kimlikten arındırılır. Buna hesap verileri; saklanıyorsa ilerleme, kelime defteri ve analiz geçmişi dahil olabilir.',
        },
        {
          title: 'Uygulama içi hesap silme',
          body:
            'Kayıtlı hesabını silmek için Profil → Hesabı Sil yolunu kullan. Onayladıktan sonra hesap silme işlemi uygulama içinde tamamlanır.',
        },
        {
          title: 'Kalabilecekler',
          body: getDataDeletionMayRemainBody(),
        },
        {
          title: 'Abonelik notu',
          body: getDataDeletionSpeakPlusNote(),
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
