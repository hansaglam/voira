import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';
import {
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  TERMS_OF_USE_URL,
} from '../constants/legalLinks';
import { openExternalLink } from '../utils/openExternalLink';
import { colors, spacing, borderRadius } from '../theme';

type Props = RootScreenProps<'TermsOfUse'>;

export function TermsOfUseScreen(_props: Props) {
  return (
    <InfoScreenLayout
      title="Kullanım Şartları"
      subtitle="Voira dil pratiği uygulaması — Last Updated: July 2026"
      sections={[
        {
          title: 'Kabul',
          body:
            'Voira, StudioWebia tarafından geliştirilmiştir. Voira’yı indirerek veya kullanarak bu Kullanım Şartlarını kabul etmiş olursun. Kabul etmiyorsan uygulamayı kullanma.',
        },
        {
          title: 'Uygulamanın kullanımı',
          body:
            'Voira; İngilizce konuşma / shadowing pratiği, telaffuz geri bildirimi, kelime araçları ve ilerleme takibi sunar. Uygulamayı yalnızca yasal ve kişisel öğrenme amaçlı kullanmayı kabul edersin.',
        },
        {
          title: 'Hesap sorumluluğu',
          body:
            'Hesap oluşturursan giriş bilgilerinin gizliliğinden ve hesabındaki etkinliklerden sen sorumlusun. Misafir kullanım sınırlı kalıcılık sunabilir; hesap, ilerleme ve SpeakPlus erişimini korumaya yardımcı olur.',
        },
        {
          title: 'Skorlar ve geri bildirim',
          body:
            'Voira pratik ve geri bildirim sağlar; dil sertifikası, tıbbi tavsiye veya resmi akreditasyon garantisi vermez. Skorlar tahmindir; mikrofon kalitesi, aksan, arka plan gürültüsü, internet ve konuşma netliğine göre değişebilir.',
        },
        {
          title: 'SpeakPlus abonelikleri',
          body:
            'SpeakPlus abonelikleri iOS’ta Apple App Store, Android’de Google Play üzerinden faturalandırılır. Fiyat ve yenileme koşulları satın almadan önce gösterilir. İptal ve iadeler ilgili mağaza politikalarına tabidir. Uygulamayı silmek veya veri silme talebi aboneliği iptal etmez; aboneliğini App Store veya Google Play hesap ayarlarından yönetebilir ya da iptal edebilirsin.',
        },
        {
          title: 'Kabul edilebilir kullanım',
          body:
            'Uygulamayı kötüye kullanma, tersine mühendislik (yasal sınırlar dışında), backend’i otomatik isteklerle zorlama, limit/paywall aşma, yasa dışı veya taciz içerik gönderme yasaktır.',
        },
        {
          title: 'Fikri mülkiyet ve kullanıcı içeriği',
          body:
            'Uygulama içeriği, tasarım, dersler ve marka Voira ve StudioWebia’ya aittir (üçüncü taraf markalar hariç). Kaydettiğin içerikten sen sorumlusun; analiz özellikleri için ses ve metnin yalnızca uygulama özelliklerini sunmak üzere işlenmesine sınırlı izin verirsin.',
        },
        {
          title: 'Garanti yok / sorumluluk sınırı',
          body:
            'Voira “olduğu gibi” sunulur. Yasaların izin verdiği ölçüde dolaylı zararlar ve öğrenme sonuçları için sorumluluk kabul edilmez. Uyuşmazlıklarda Türkiye Cumhuriyeti hukukuna başvurulur (zorunlu tüketici koruma kuralları saklıdır).',
        },
        {
          title: 'İletişim',
          body: `StudioWebia\nSorular için: ${SUPPORT_EMAIL}`,
        },
      ]}
      footer={
        <>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => void openExternalLink(TERMS_OF_USE_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.linkButtonText}>Tam Kullanım Şartlarını aç</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => void openExternalLink(PRIVACY_POLICY_URL)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryLinkText}>Gizlilik Politikası (web)</Text>
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
