import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  const openEmail = () => {
    const subject = encodeURIComponent(t('support.emailSubject'));
    void openExternalLink(`${SUPPORT_MAILTO}?subject=${subject}`);
  };

  return (
    <InfoScreenLayout
      title={t('support.title')}
      subtitle={t('support.subtitle')}
      sections={[
        {
          title: t('support.email'),
          body: t('support.emailBody', { email: SUPPORT_EMAIL }),
        },
        {
          title: t('support.topics'),
          body: t('support.topicsBody'),
        },
        {
          title: t('support.responseTime'),
          body: t('support.responseBody'),
        },
      ]}
      footer={
        <>
          <TouchableOpacity style={styles.emailButton} onPress={openEmail} activeOpacity={0.85}>
            <Text style={styles.emailButtonText}>{t('support.sendEmail')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => void openExternalLink(PRIVACY_POLICY_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryLinkText}>{t('support.linkPrivacy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => void openExternalLink(DATA_DELETION_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryLinkText}>{t('support.linkDataDeletion')}</Text>
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
