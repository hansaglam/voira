import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  return (
    <InfoScreenLayout
      title="Gizlilik Politikası"
      subtitle="Voira (“Voira”, “uygulama”, “biz”) — Last Updated: July 2026"
      sections={[
        {
          title: 'Giriş',
          body:
            'Voira; İngilizce konuşma, shadowing, telaffuz, kelime defteri, ilerleme takibi ve SpeakPlus premium erişimi sunar. Bu özet, uygulamadaki veri uygulamalarını açıklar. Tam metin web sayfasındadır.',
        },
        {
          title: 'Topladığımız / işlediğimiz bilgiler',
          body: getPrivacyCollectedBody(),
        },
        {
          title: 'Ses kayıtları ve telaffuz analizi',
          body:
            'Mikrofon izni yalnızca kayıt yapmak istediğinde istenir. Kayıt, analiz için Voira sunucusuna gönderilir. Telaffuz değerlendirmesi için Microsoft Azure Speech kullanılabilir. Backend etkinse OpenAI, kayıtlı sesini speech-to-text/transcription için işleyebilir ve AI koç geri bildirimi üretebilir. Ses kayıtlarını herkese açık profil oluşturmak veya ses verisi satmak için kullanmayız.',
        },
        {
          title: 'Üçüncü taraf hizmetler',
          body: getPrivacyThirdPartyBody(),
        },
        {
          title: 'Ödemeler ve SpeakPlus',
          body: getPrivacyPaymentsBody(),
        },
        {
          title: 'Veri paylaşımı ve satış',
          body:
            'Kişisel verileri satmayız. Verileri yalnızca uygulamayı işletmek için hizmet sağlayıcılarla paylaşır/işleriz. Yasalar gerektirirse veya güvenlik için açıklama yapılabilir.',
        },
        {
          title: 'Saklama ve silme',
          body: getPrivacyRetentionBody(),
        },
        {
          title: 'Çocukların gizliliği',
          body:
            'Voira 13 yaş altı çocuklara yönelik değildir. 13 yaş altından bilerek kişisel bilgi toplamayız. Bir ebeveyn/vasi çocuğunun veri verdiğini düşünüyorsa bizimle iletişime geçebilir.',
        },
        {
          title: 'İletişim',
          body: `Gizlilik talepleri: ${SUPPORT_EMAIL}`,
        },
      ]}
      footer={
        <>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => void openExternalLink(PRIVACY_POLICY_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.linkButtonText}>Tam Gizlilik Politikasını aç</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => void openExternalLink(TERMS_OF_USE_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryLinkText}>Kullanım Şartları (web)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => void openExternalLink(DATA_DELETION_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryLinkText}>Veri Silme sayfası (web)</Text>
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
