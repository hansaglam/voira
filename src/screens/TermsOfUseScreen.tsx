import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import {
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  TERMS_OF_USE_URL,
} from '../constants/legalLinks';
import { getTermsSpeakPlusBody } from '../utils/billingCopy';
import { openExternalLink } from '../utils/openExternalLink';
import { colors, spacing, borderRadius } from '../theme';

type Props = RootScreenProps<'TermsOfUse'>;

export function TermsOfUseScreen(_props: Props) {
  const { t } = useTranslation();

  return (
    <InfoScreenLayout
      title={t('terms.title')}
      subtitle={t('terms.subtitle')}
      sections={[
        {
          title: t('terms.sAccept'),
          body: t('terms.acceptBody'),
        },
        {
          title: t('terms.sUse'),
          body: t('terms.useBody'),
        },
        {
          title: t('terms.sAccount'),
          body: t('terms.accountBody'),
        },
        {
          title: t('terms.sScores'),
          body: t('terms.scoresBody'),
        },
        {
          title: t('terms.sSpeakPlus'),
          body: getTermsSpeakPlusBody(),
        },
        {
          title: t('terms.sAcceptable'),
          body: t('terms.acceptableBody'),
        },
        {
          title: t('terms.sIp'),
          body: t('terms.ipBody'),
        },
        {
          title: t('terms.sDisclaimer'),
          body: t('terms.disclaimerBody'),
        },
        {
          title: t('terms.sContact'),
          body: t('terms.contactBody', { email: SUPPORT_EMAIL }),
        },
      ]}
      footer={
        <>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => void openExternalLink(TERMS_OF_USE_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.linkButtonText}>{t('terms.openFull')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => void openExternalLink(PRIVACY_POLICY_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryLinkText}>{t('terms.linkPrivacy')}</Text>
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
