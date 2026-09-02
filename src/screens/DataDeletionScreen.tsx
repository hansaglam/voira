import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { resetLocalPracticeData } = useLearning();
  const { isGuest } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  const openSupportEmail = () => {
    void openExternalLink(DATA_DELETION_MAILTO);
  };

  const handleLocalReset = () => {
    showAppConfirm({
      title: t('dataDeletion.resetTitle'),
      message: getDataDeletionLocalResetMessage(),
      destructive: true,
      confirmLabel: t('dataDeletion.resetConfirm'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
        setIsResetting(true);
        try {
          resetLocalPracticeData();
          showAppFeedback({
            title: t('dataDeletion.doneTitle'),
            message: t('dataDeletion.doneBody'),
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
        <Text style={styles.supportButtonText}>{t('dataDeletion.ctaEmail')}</Text>
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
          <Text style={styles.resetButtonText}>{t('dataDeletion.ctaLocalReset')}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.webLink}
        onPress={() => void openExternalLink(DATA_DELETION_URL)}
        activeOpacity={0.85}
      >
        <Text style={styles.webLinkText}>{t('dataDeletion.ctaOpenWeb')}</Text>
      </TouchableOpacity>
    </>
  );

  const requestSection = {
    title: t('dataDeletion.sectionRequest'),
    body: t('dataDeletion.requestBody', { email: SUPPORT_EMAIL }),
  };

  if (isGuest) {
    return (
      <InfoScreenLayout
        title={t('dataDeletion.title')}
        subtitle={t('dataDeletion.subtitleGuest')}
        sections={[
          {
            title: t('dataDeletion.sectionGuestData'),
            body: t('dataDeletion.guestBody'),
          },
          {
            title: t('dataDeletion.sectionLocalReset'),
            body: t('dataDeletion.localResetIntro'),
          },
          requestSection,
          {
            title: t('dataDeletion.sectionSubscriptionNote'),
            body: getDataDeletionSubscriptionNote(),
          },
        ]}
        footer={sharedFooter}
      />
    );
  }

  return (
    <InfoScreenLayout
      title={t('dataDeletion.title')}
      subtitle={t('dataDeletion.subtitleAccount')}
      sections={[
        requestSection,
        {
          title: t('dataDeletion.sectionAfterVerify'),
          body: t('dataDeletion.afterVerifyBody'),
        },
        {
          title: t('dataDeletion.sectionInAppDelete'),
          body: t('dataDeletion.inAppDeleteBody'),
        },
        {
          title: t('dataDeletion.sectionMayRemain'),
          body: getDataDeletionMayRemainBody(),
        },
        {
          title: t('dataDeletion.sectionSubscriptionNote'),
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
