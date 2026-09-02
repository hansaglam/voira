import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import {
  DATA_DELETION_URL,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  TERMS_OF_USE_URL,
} from '../constants/legalLinks';
import {
  getPrivacyCollectedBody,
  getPrivacyPaymentsBody,
  getPrivacyRetentionBody,
  getPrivacyThirdPartyBody,
} from '../utils/billingCopy';
import { openExternalLink } from '../utils/openExternalLink';
import { colors, spacing, borderRadius } from '../theme';

type Props = RootScreenProps<'PrivacyPolicy'>;

export function PrivacyPolicyScreen(_props: Props) {
  const { t } = useTranslation();

  return (
    <InfoScreenLayout
      title={t('privacy.title')}
      subtitle={t('privacy.subtitle')}
      sections={[
        {
          title: t('privacy.sIntro'),
          body: t('privacy.introBody'),
        },
        {
          title: t('privacy.sCollected'),
          body: getPrivacyCollectedBody(),
        },
        {
          title: t('privacy.sAudio'),
          body: t('privacy.audioBody'),
        },
        {
          title: t('privacy.sThirdParty'),
          body: getPrivacyThirdPartyBody(),
        },
        {
          title: t('privacy.sPayments'),
          body: getPrivacyPaymentsBody(),
        },
        {
          title: t('privacy.sSharing'),
          body: t('privacy.sharingBody'),
        },
        {
          title: t('privacy.sRetention'),
          body: getPrivacyRetentionBody(),
        },
        {
          title: t('privacy.sChildren'),
          body: t('privacy.childrenBody'),
        },
        {
          title: t('privacy.sContact'),
          body: t('privacy.contactBody', { email: SUPPORT_EMAIL }),
        },
      ]}
      footer={
        <>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => void openExternalLink(PRIVACY_POLICY_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.linkButtonText}>{t('privacy.openFull')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => void openExternalLink(TERMS_OF_USE_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryLinkText}>{t('privacy.linkTerms')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => void openExternalLink(DATA_DELETION_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryLinkText}>{t('privacy.linkDelete')}</Text>
          </TouchableOpacity>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  linkButton: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(91, 95, 239, 0.14)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.28)',
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  linkButtonText: {
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
