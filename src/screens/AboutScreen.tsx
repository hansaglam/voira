import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import { VoiraLogo } from '../components/VoiraLogo';
import {
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  TERMS_OF_USE_URL,
} from '../constants/legalLinks';
import { getAboutSpeakPlusBody } from '../utils/billingCopy';
import { openExternalLink } from '../utils/openExternalLink';
import { colors, spacing, typography, borderRadius } from '../theme';

type Props = RootScreenProps<'About'>;

const APP_VERSION = '1.0.12';

export function AboutScreen(_props: Props) {
  const { t } = useTranslation();

  return (
    <InfoScreenLayout
      title={t('about.title')}
      subtitle={t('about.subtitle')}
      header={<VoiraLogo size={112} />}
      sections={[
        {
          title: t('about.what'),
          body: t('about.whatBody'),
        },
        {
          title: t('about.thisVersion'),
          body: t('about.versionBody'),
        },
        {
          title: t('about.speakPlus'),
          body: getAboutSpeakPlusBody(),
        },
        {
          title: t('about.contactLegal'),
          body: t('about.contactLegalBody', { email: SUPPORT_EMAIL }),
        },
      ]}
      footer={
        <>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => void openExternalLink(PRIVACY_POLICY_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.linkButtonText}>{t('about.linkPrivacy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => void openExternalLink(TERMS_OF_USE_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.linkButtonText}>{t('about.linkTerms')}</Text>
          </TouchableOpacity>
          <Text style={styles.footerVersion}>
            {t('about.versionLabel', { version: APP_VERSION })}
          </Text>
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
