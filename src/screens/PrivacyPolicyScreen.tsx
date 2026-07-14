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
          body:
            'Hesap bilgileri (e-posta, kimlik doğrulama/kullanıcı ID), profil ve ilerleme (ders ilerlemesi, streak, pratik istatistikleri, kaydedilen kelimeler), yalnızca sen kayıt aldığında ses kayıtları, telaffuz analizi sonuçları (skorlar, kelimeler, akıcılık/doğruluk/tamamlama vb.), SpeakPlus abonelik/entitlement durumu (Apple App Store / Google Play / RevenueCat) ve uygulama sürümü ile temel tanı/hata bilgileri.',
        },
        {
          title: 'Ses kayıtları ve telaffuz analizi',
          body:
            'Mikrofon izni yalnızca kayıt yapmak istediğinde istenir. Kayıt, analiz için Voira sunucusuna gönderilir. Telaffuz değerlendirmesi için Microsoft Azure Speech kullanılabilir. Backend etkinse OpenAI, kayıtlı sesini speech-to-text/transcription için işleyebilir ve AI koç geri bildirimi üretebilir. Ses kayıtlarını herkese açık profil oluşturmak veya ses verisi satmak için kullanmayız.',
        },
        {
          title: 'Üçüncü taraf hizmetler',
          body:
            'Supabase (kimlik doğrulama / veri), RevenueCat (abonelik entitlement), Apple App Store (iOS ödemeleri), Google Play (Android ödemeleri), Microsoft Azure Speech (konuşma tanıma ve telaffuz değerlendirmesi), OpenAI (backend etkinse kayıtlı ses üzerinde speech-to-text/transcription ve AI koç geri bildirimi / açıklamalar / öğrenme rehberliği), Render (backend barındırma). Bu hizmetler yalnızca uygulama işlevi için gerekli ölçüde veri işler.',
        },
        {
          title: 'Ödemeler ve SpeakPlus',
          body:
            'Abonelik ödemeleri, kullandığın platforma göre Apple App Store veya Google Play hesabın üzerinden yönetilir. Voira kredi/banka kartı numaralarını almaz veya saklamaz. Aboneliğini App Store veya Google Play hesap ayarlarından yönetebilir ya da iptal edebilirsin. SpeakPlus erişimi RevenueCat ve ilgili mağaza entitlement durumuna göre yönetilir.',
        },
        {
          title: 'Veri paylaşımı ve satış',
          body:
            'Kişisel verileri satmayız. Verileri yalnızca uygulamayı işletmek için hizmet sağlayıcılarla paylaşır/işleriz. Yasalar gerektirirse veya güvenlik için açıklama yapılabilir.',
        },
        {
          title: 'Saklama ve silme',
          body:
            'Yerel veriler cihazında silinene veya uygulama kaldırılana kadar kalabilir. Hesap/ilerleme/satın alma kayıtları hizmeti sunmak, yasal yükümlülükler, kötüye kullanımın önlenmesi veya abonelik erişimi için gerekli olduğu sürece tutulabilir. Hesap ve veri silme talebi için Voira Destek’e yaz; abonelik iptali ayrıdır (App Store veya Google Play). Detaylar için Veri Silme sayfasını açabilirsin.',
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
