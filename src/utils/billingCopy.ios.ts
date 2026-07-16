/**
 * iOS-only billing / legal copy.
 * Metro resolves this file for iOS builds — must never mention competing Android store names.
 */

export function getBillingStoreName(): string {
  return 'App Store';
}

export function getManageSubscriptionsUrl(): string {
  return 'https://apps.apple.com/account/subscriptions';
}

export function getManageSubscriptionText(): string {
  return 'Aboneliğini App Store hesabından yönetebilirsin.';
}

export function getManageSubscriptionCancelText(): string {
  return 'Aboneliğini App Store hesap ayarlarından yönetebilir ya da iptal edebilirsin.';
}

export function getPremiumCancelNote(): string {
  return 'Aboneliğini App Store hesap ayarlarından yönetebilir ya da iptal edebilirsin. Abonelik otomatik yenilenir.';
}

export function getAboutSpeakPlusBody(): string {
  return 'SpeakPlus, uygulama içi abonelik ile sunulan premium ders paketleri ve gelişmiş geri bildirimlerdir. Abonelik ödemeleri App Store hesabın üzerinden yönetilir. Satın alımları Profil veya paywall ekranından geri yükleyebilirsin.';
}

export function getTermsSpeakPlusBody(): string {
  return 'SpeakPlus abonelikleri App Store üzerinden faturalandırılır. Fiyat ve yenileme koşulları satın almadan önce gösterilir. İptal ve iadeler App Store politikalarına tabidir. Uygulamayı silmek veya veri silme talebi aboneliği iptal etmez; aboneliğini App Store hesap ayarlarından yönetebilir ya da iptal edebilirsin.';
}

export function getPrivacyCollectedBody(): string {
  return 'Hesap bilgileri (e-posta, kimlik doğrulama/kullanıcı ID), profil ve ilerleme (ders ilerlemesi, streak, pratik istatistikleri, kaydedilen kelimeler), yalnızca sen kayıt aldığında ses kayıtları, telaffuz analizi sonuçları (skorlar, kelimeler, akıcılık/doğruluk/tamamlama vb.), SpeakPlus abonelik/entitlement durumu (App Store / RevenueCat) ve uygulama sürümü ile temel tanı/hata bilgileri.';
}

export function getPrivacyThirdPartyBody(): string {
  return 'Supabase (kimlik doğrulama / veri), RevenueCat (abonelik entitlement), Apple App Store (ödemeler), Microsoft Azure Speech (konuşma tanıma ve telaffuz değerlendirmesi), OpenAI (backend etkinse kayıtlı ses üzerinde speech-to-text/transcription ve AI koç geri bildirimi / açıklamalar / öğrenme rehberliği), Render (backend barındırma). Bu hizmetler yalnızca uygulama işlevi için gerekli ölçüde veri işler.';
}

export function getPrivacyPaymentsBody(): string {
  return 'Abonelik ödemeleri App Store hesabın üzerinden yönetilir. Voira kredi/banka kartı numaralarını almaz veya saklamaz. Aboneliğini App Store hesap ayarlarından yönetebilir ya da iptal edebilirsin. SpeakPlus erişimi RevenueCat ve App Store entitlement durumuna göre yönetilir.';
}

export function getPrivacyRetentionBody(): string {
  return 'Yerel veriler cihazında silinene veya uygulama kaldırılana kadar kalabilir. Hesap/ilerleme/satın alma kayıtları hizmeti sunmak, yasal yükümlülükler, kötüye kullanımın önlenmesi veya abonelik erişimi için gerekli olduğu sürece tutulabilir. Hesap ve veri silme talebi için Voira Destek’e yaz; abonelik iptali ayrıdır (App Store). Detaylar için Veri Silme sayfasını açabilirsin.';
}

export function getDataDeletionLocalResetMessage(): string {
  return 'Bu işlem yalnızca bu cihazdaki pratik geçmişini, skorları ve günlük oturum kayıtlarını siler. Hesap silme talebi değildir. Profil tercihlerin korunur. Aktif bir App Store aboneliğini iptal etmez.';
}

export function getDataDeletionSubscriptionNote(): string {
  return 'Uygulama hesabını veya uygulama verilerini silmek, aktif SpeakPlus aboneliğini iptal etmez. Faturalandırmayı durdurmak için aboneliğini App Store hesap ayarlarından iptal et.';
}

export function getDataDeletionSpeakPlusNote(): string {
  return 'Uygulama hesabını veya uygulama verilerini silmek, aktif SpeakPlus aboneliğini iptal etmez. SpeakPlus’ı durdurmak için aboneliğini App Store hesap ayarlarından iptal et.';
}

export function getDataDeletionMayRemainBody(): string {
  return 'App Store / RevenueCat işlem veya entitlement kayıtları, kimliği belli olmayan günlükler ve yalnızca cihazında kalan veriler (uygulama verisi temizlenene veya uygulama kaldırılana kadar).';
}

/** Shown in the in-app account deletion confirmation (Guideline 5.1.1(v)). */
export function getAccountDeletionSubscriptionWarning(): string {
  return 'Hesabını silmek App Store aboneliğini otomatik iptal etmez. Aktif aboneliğini App Store hesap ayarlarından yönetebilirsin.';
}

export function getAccountDeletionConfirmBody(): string {
  return `Bu işlem hesabını ve Voira’daki kişisel verilerini kalıcı olarak siler. ${getAccountDeletionSubscriptionWarning()}`;
}
